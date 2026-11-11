/**
 * Host half of the OpenCode usage plugin.
 *
 * Serves aggregate token and cost totals read from opencode's local SQLite
 * database to this package's browser half. The database is opened read-only in
 * a worker thread, so a cold scan never blocks the Harness event loop.
 */
import { Worker } from 'node:worker_threads'
import { resolveDbPath } from './usage.js'

/** Services this plugin needs before it can serve its route. */
export const inject = ['webServer']

/** Route the browser half reads. Loopback-only; aggregate data, no session content. */
const ROUTE_PATH = '/opencode-usage'
/** Milliseconds a computed summary stays fresh. */
const CACHE_MS = 60_000

/**
 * Run the database aggregation in a short-lived worker thread.
 * @param {string} dbPath - Absolute path to opencode's SQLite database.
 * @returns {Promise<object>} Aggregated usage.
 */
function readUsageOffThread(dbPath) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./usage-worker.js', import.meta.url), {
      workerData: { dbPath },
    })
    let settled = false
    const finish = (error, usage) => {
      if (settled) return
      settled = true
      if (error === undefined) resolve(usage)
      else reject(error)
    }
    worker.once('message', (message) => {
      if (message?.ok === true) finish(undefined, message.usage)
      else finish(new Error(message?.message ?? 'opencode usage worker failed'))
    })
    worker.once('error', (error) => finish(error))
    worker.once('exit', (code) => {
      if (!settled) finish(new Error(`opencode usage worker exited with code ${code} before returning data`))
    })
  })
}

/**
 * Register the usage route for this profile's Web GUI.
 * @param {import('@deepseek-ai/cordis').Context} ctx - Host plugin context.
 */
export function apply(ctx) {
  const db = resolveDbPath()
  let cache = { at: 0, payload: undefined }
  let inflight

  /**
   * Build (or reuse) the payload the browser half reads.
   * @param {boolean} force - Bypass the freshness cache.
   * @returns {Promise<object>} JSON-serializable payload.
   */
  async function summary(force) {
    if (!force && cache.payload !== undefined && Date.now() - cache.at < CACHE_MS) {
      return cache.payload
    }
    if (inflight !== undefined) return inflight
    inflight = (async () => {
      const generatedAt = Date.now()
      try {
        if (!db.exists) {
          return { ok: false, reason: 'missing', dbPath: db.path, generatedAt }
        }
        const usage = await readUsageOffThread(db.path)
        return { ok: true, dbPath: db.path, generatedAt, ...usage }
      } catch (error) {
        ctx.logger?.warn?.(`[opencode-usage] ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
        return {
          ok: false,
          reason: 'read-failed',
          dbPath: db.path,
          generatedAt,
          message: error instanceof Error ? error.message : String(error),
        }
      } finally {
        inflight = undefined
      }
    })()
    const payload = await inflight
    cache = { at: Date.now(), payload }
    return payload
  }

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE_PATH,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { allow: 'GET, HEAD', 'cache-control': 'no-store' }).end()
        return
      }
      if (req.method === 'HEAD') {
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        }).end()
        return
      }
      let force = false
      try {
        const url = new URL(req.url ?? ROUTE_PATH, 'http://127.0.0.1')
        force = url.searchParams.get('refresh') === '1'
      } catch {
        // A malformed request target is answered with the cached summary.
      }
      const payload = await summary(force)
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      })
      res.end(JSON.stringify(payload))
    },
  }), 'opencode-usage: usage route')
}
