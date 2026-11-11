/**
 * Worker entry: aggregate usage off the Harness Host's main thread.
 *
 * A cold scan of a large opencode database can take seconds; keeping it here
 * means the Web GUI and agent loop stay responsive while the page loads.
 */
import { parentPort, workerData } from 'node:worker_threads'
import { readUsage } from './usage.js'

try {
  const usage = await readUsage(workerData.dbPath)
  parentPort.postMessage({ ok: true, usage })
} catch (error) {
  parentPort.postMessage({
    ok: false,
    message: error instanceof Error ? error.message : String(error),
  })
}
