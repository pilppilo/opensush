/**
 * Read-only aggregation of opencode's local usage records.
 *
 * The database is opened read-only and only aggregate numbers leave this
 * module; message content is never selected or returned.
 */
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Number of days in the daily series. */
export const DAYS = 90

/**
 * Resolve opencode's data directory the same way opencode does.
 * @returns {string[]} Candidate database paths, most likely first.
 */
function candidateDbPaths() {
  const candidates = []
  if (process.env.OPENCODE_DATA_DIR) {
    candidates.push(join(process.env.OPENCODE_DATA_DIR, 'opencode.db'))
  }
  const xdg = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share')
  candidates.push(join(xdg, 'opencode', 'opencode.db'))
  if (process.platform === 'win32' && process.env.APPDATA) {
    candidates.push(join(process.env.APPDATA, 'opencode', 'opencode.db'))
  }
  candidates.push(join(homedir(), '.opencode', 'opencode.db'))
  return candidates
}

/**
 * Pick the opencode database to read.
 * @returns {{ path: string, exists: boolean }} Chosen path and whether it exists.
 */
export function resolveDbPath() {
  const candidates = candidateDbPaths()
  for (const candidate of candidates) {
    if (existsSync(candidate)) return { path: candidate, exists: true }
  }
  return { path: candidates[0], exists: false }
}

const USAGE_CTE = `
  WITH usage AS (
    SELECT
      session_id,
      time_created,
      COALESCE(json_extract(data, '$.cost'), 0) AS cost,
      COALESCE(json_extract(data, '$.tokens.input'), 0) AS input,
      COALESCE(json_extract(data, '$.tokens.output'), 0) AS output,
      COALESCE(json_extract(data, '$.tokens.reasoning'), 0) AS reasoning,
      COALESCE(json_extract(data, '$.tokens.cache.read'), 0) AS cache_read,
      COALESCE(json_extract(data, '$.tokens.cache.write'), 0) AS cache_write,
      COALESCE(json_extract(data, '$.model.providerID'), json_extract(data, '$.providerID'), 'unknown') AS provider,
      COALESCE(json_extract(data, '$.model.id'), json_extract(data, '$.modelID'), 'unknown') AS model
    FROM session_message
    WHERE type = 'assistant' AND json_valid(data)
  )
`

/**
 * @param {number} value - Candidate number.
 * @returns {number} A finite number.
 */
function num(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * Local calendar-day key for a date.
 * @param {Date} date - Date to format.
 * @returns {string} `YYYY-MM-DD` in local time.
 */
function dayKey(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * Aggregate opencode usage from the database.
 * @param {string} dbPath - Absolute path to opencode's SQLite database.
 * @returns {Promise<object>} Totals, per-model rows, and a filled 90-day series.
 */
export async function readUsage(dbPath) {
  let DatabaseSync
  try {
    ;({ DatabaseSync } = await import('node:sqlite'))
  } catch (error) {
    throw new Error(`This runtime has no node:sqlite module (${error instanceof Error ? error.message : String(error)})`)
  }

  const db = new DatabaseSync(dbPath, { readOnly: true })
  try {
    const totalsRow = db.prepare(`${USAGE_CTE}
      SELECT
        COUNT(*) AS messages,
        COUNT(DISTINCT session_id) AS sessions,
        COALESCE(SUM(cost), 0) AS cost,
        COALESCE(SUM(input), 0) AS input,
        COALESCE(SUM(output), 0) AS output,
        COALESCE(SUM(reasoning), 0) AS reasoning,
        COALESCE(SUM(cache_read), 0) AS cache_read,
        COALESCE(SUM(cache_write), 0) AS cache_write
      FROM usage
    `).get()

    const totals = {
      cost: num(totalsRow.cost),
      input: num(totalsRow.input),
      output: num(totalsRow.output),
      reasoning: num(totalsRow.reasoning),
      cacheRead: num(totalsRow.cache_read),
      cacheWrite: num(totalsRow.cache_write),
      messages: num(totalsRow.messages),
      sessions: num(totalsRow.sessions),
    }
    totals.tokens = totals.input + totals.output + totals.reasoning + totals.cacheRead + totals.cacheWrite

    const models = db.prepare(`${USAGE_CTE}
      SELECT provider, model,
             COUNT(*) AS messages,
             COALESCE(SUM(cost), 0) AS cost,
             COALESCE(SUM(input + output + reasoning + cache_read + cache_write), 0) AS tokens
      FROM usage
      GROUP BY provider, model
      ORDER BY cost DESC, tokens DESC
      LIMIT 10
    `).all().map((row) => ({
      provider: String(row.provider ?? 'unknown'),
      model: String(row.model ?? 'unknown'),
      messages: num(row.messages),
      cost: num(row.cost),
      tokens: num(row.tokens),
    }))

    const startOfWindow = new Date()
    startOfWindow.setHours(0, 0, 0, 0)
    startOfWindow.setDate(startOfWindow.getDate() - (DAYS - 1))

    const dailyRows = db.prepare(`${USAGE_CTE}
      SELECT date(time_created / 1000, 'unixepoch', 'localtime') AS day,
             COALESCE(SUM(cost), 0) AS cost,
             COALESCE(SUM(input + output + reasoning + cache_read + cache_write), 0) AS tokens,
             COUNT(*) AS messages
      FROM usage
      WHERE time_created >= ?
      GROUP BY day
      ORDER BY day
    `).all(startOfWindow.getTime())

    const byDay = new Map(dailyRows.map((row) => [String(row.day), row]))
    const daily = []
    for (let offset = 0; offset < DAYS; offset += 1) {
      const date = new Date(startOfWindow)
      date.setDate(startOfWindow.getDate() + offset)
      const key = dayKey(date)
      const row = byDay.get(key)
      daily.push({
        day: key,
        cost: row ? num(row.cost) : 0,
        tokens: row ? num(row.tokens) : 0,
        messages: row ? num(row.messages) : 0,
      })
    }

    return { totals, models, daily, days: DAYS }
  } finally {
    db.close()
  }
}
