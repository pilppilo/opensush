# OpenCode usage

A small DeepSeek Harness bundle that shows token and cost usage recorded by
[opencode](https://opencode.ai) in its local SQLite database.

- Host half (`index.js`): opens `~/.local/share/opencode/opencode.db` read-only,
  aggregates `cost` and `tokens` from assistant messages, and serves the summary
  at `GET /opencode-usage` (cached for 60 seconds).
- Client half (`client.js`): adds a **Settings → OpenCode usage** page with
  selected-period totals, selectable daily charts (tokens, cost, or messages),
  a configurable 1–90 day range, period-scoped model usage, and separate
  all-time totals and model usage.

Nothing is uploaded; the plugin reads the local database and renders the result
in the Harness Web UI. Set `OPENCODE_DATA_DIR` to point at a different opencode
data directory when the default location is not used.
