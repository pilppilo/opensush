/**
 * Browser half of the OpenCode usage plugin.
 *
 * Registers a Settings page under `settings.section` and reads the aggregated
 * summary from the Host half's loopback route. All visible copy lives in this
 * package's locale dictionary; styling uses Harness theme tokens only.
 */
window.__ModuleLoader__.load({
  id: '@local/opencode-usage',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace owned by this plugin. */
    const NS = 'settings.openCodeUsage'
    /** Route the Host half registers. */
    const ROUTE = '/opencode-usage'

    const en = {
      nav: 'OpenCode usage',
      title: 'OpenCode usage',
      description: 'Token and cost totals from your local opencode database.',
      refresh: 'Refresh',
      refreshing: 'Refreshing…',
      loading: 'Reading opencode data…',
      spend: 'Total spend',
      tokens: 'Total tokens',
      cacheRead: 'Cache read',
      sessions: 'Sessions',
      dailyTitle: 'Usage by day',
      dailyHint: 'Daily usage · local time',
      modelsTitle: 'Usage by model',
      metricTokens: 'Tokens',
      metricCost: 'Cost',
      metricMessages: 'Messages',
      rangeDays: '{days} days',
      totalInRange: 'In this period',
      colModel: 'Model',
      colMessages: 'Messages',
      colTokens: 'Tokens',
      colCost: 'Cost',
      source: 'Source',
      readOnly: 'read-only',
      updated: 'Updated',
      errorTitle: 'Could not read opencode usage',
      retry: 'Try again',
      missingTitle: 'No opencode database found',
      missingBody: 'Looked for {path}. Run opencode once, or set OPENCODE_DATA_DIR before starting the Harness.',
      unavailableTitle: 'OpenCode usage is unavailable',
      noUsage: 'No assistant usage recorded yet.',
    }

    const zh = {
      nav: 'OpenCode 用量',
      title: 'OpenCode 用量',
      description: '本地 opencode 数据库中的 Token 与费用统计。',
      refresh: '刷新',
      refreshing: '刷新中…',
      loading: '正在读取 opencode 数据…',
      spend: '总费用',
      tokens: '总 Token',
      cacheRead: '缓存读取',
      sessions: '会话数',
      dailyTitle: '每日用量',
      dailyHint: '每日用量 · 本地时间',
      modelsTitle: '按模型统计',
      metricTokens: 'Token',
      metricCost: '费用',
      metricMessages: '消息',
      rangeDays: '{days} 天',
      totalInRange: '此期间总计',
      colModel: '模型',
      colMessages: '消息数',
      colTokens: 'Token',
      colCost: '费用',
      source: '来源',
      readOnly: '只读',
      updated: '更新于',
      errorTitle: '无法读取 opencode 用量',
      retry: '重试',
      missingTitle: '未找到 opencode 数据库',
      missingBody: '已查找 {path}。请先运行一次 opencode，或在启动 Harness 前设置 OPENCODE_DATA_DIR。',
      unavailableTitle: 'OpenCode 用量不可用',
      noUsage: '尚无助手用量记录。',
    }

    const css = `
.ocu-root {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 760px;
  padding: 8px 0 24px;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  line-height: 20px;
}
.ocu-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.ocu-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; }
.ocu-desc { margin: 4px 0 0; color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.ocu-button {
  flex: none;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  padding: 4px 10px;
  font: inherit;
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}
.ocu-button:hover { background: var(--dsw-alias-bg-layer-2); }
.ocu-button:disabled { opacity: 0.5; cursor: default; }
.ocu-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}
.ocu-stat {
  padding: 12px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
  min-width: 0;
}
.ocu-stat-label { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
.ocu-stat-value {
  margin-top: 2px;
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ocu-section { display: flex; flex-direction: column; gap: 8px; }
.ocu-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.ocu-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.ocu-segment { display: inline-flex; padding: 2px; gap: 2px; border: 0.5px solid var(--dsw-alias-border-l1); border-radius: 7px; background: var(--dsw-alias-bg-layer-1); }
.ocu-segment button { border: 0; border-radius: 5px; background: transparent; color: var(--dsw-alias-label-secondary); padding: 3px 8px; font: inherit; font-size: 11px; cursor: pointer; }
.ocu-segment button[aria-pressed="true"] { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-weight: 600; }
.ocu-section-title { font-size: 13px; line-height: 18px; font-weight: 600; }
.ocu-section-hint { color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; }
.ocu-chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  padding: 12px;
  border: 0.5px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-1);
}
.ocu-bar-col { display: flex; flex-direction: column; gap: 6px; flex: 1 1 0; min-width: 0; }
.ocu-bar-wrap { display: flex; align-items: flex-end; height: 72px; }
.ocu-bar {
  width: 100%;
  min-height: 2px;
  border-radius: 2px;
  background: var(--dsw-alias-brand-primary);
  opacity: 0.85;
}
.ocu-bar-day {
  color: var(--dsw-alias-label-secondary);
  font-size: 9px;
  line-height: 12px;
  text-align: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ocu-table { width: 100%; border-collapse: collapse; }
.ocu-table th {
  padding: 6px 8px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
  text-align: left;
}
.ocu-table td {
  padding: 8px;
  border-bottom: 0.5px solid var(--dsw-alias-border-l1);
  font-size: 13px;
  line-height: 18px;
  vertical-align: top;
}
.ocu-table tr:last-child td { border-bottom: 0; }
.ocu-table .ocu-num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ocu-model { display: flex; flex-direction: column; min-width: 0; }
.ocu-model-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ocu-model-provider { color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 16px; }
.ocu-foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 16px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 16px;
}
.ocu-foot code {
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--dsw-alias-bg-layer-2);
  font-size: 10.5px;
  overflow-wrap: anywhere;
}
.ocu-alert {
  padding: 12px;
  border: 0.5px solid var(--dsw-alias-state-error-primary);
  border-radius: 8px;
  color: var(--dsw-alias-state-error-primary);
  font-size: 13px;
  line-height: 18px;
}
.ocu-alert-title { font-weight: 600; }
.ocu-alert-body { margin-top: 4px; overflow-wrap: anywhere; }
.ocu-empty {
  padding: 24px;
  border: 0.5px dashed var(--dsw-alias-border-l2);
  border-radius: 8px;
  text-align: center;
  color: var(--dsw-alias-label-secondary);
}
.ocu-empty-title { color: var(--dsw-alias-label-primary); font-weight: 600; }
.ocu-empty-body { margin-top: 4px; font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }
.ocu-muted { color: var(--dsw-alias-label-secondary); font-size: 12px; line-height: 18px; }
`

    /**
     * Format a spent amount in US dollars.
     * @param {number} value - Amount.
     * @returns {string} Display text.
     */
    function formatCost(value) {
      if (!Number.isFinite(value) || value <= 0) return '$0.00'
      if (value < 0.01) return `$${value.toFixed(4)}`
      if (value < 1) return `$${value.toFixed(3)}`
      return `$${value.toFixed(2)}`
    }

    /**
     * Format a token count compactly.
     * @param {number} value - Token count.
     * @returns {string} Display text with a B/M/K suffix.
     */
    function formatTokens(value) {
      if (!Number.isFinite(value) || value <= 0) return '0'
      if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
      if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
      if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
      return String(Math.round(value))
    }

    /**
     * Format a full count with grouping.
     * @param {number} value - Count.
     * @returns {string} Display text.
     */
    function formatCount(value) {
      return new Intl.NumberFormat().format(Math.round(value || 0))
    }

    /**
     * One headline number.
     * @param {{ label: string, value: string, title?: string }} props - Card content.
     * @returns {object} React element.
     */
    function StatCard({ label, value, title }) {
      return h('div', { className: 'ocu-stat', title }, [
        h('div', { className: 'ocu-stat-label', key: 'label' }, label),
        h('div', { className: 'ocu-stat-value', key: 'value' }, value),
      ])
    }

    /**
     * Render the daily token bars.
     * @param {{ daily: Array<object>, t: Function }} props - Series and translator.
     * @returns {object} React element.
     */
    function DailyChart({ daily, t, metric }) {
      const valueFor = (entry) => entry[metric]
      const max = Math.max(1, ...daily.map(valueFor))
      const formatValue = metric === 'tokens' ? formatTokens : metric === 'cost' ? formatCost : formatCount
      return h('div', {
        className: 'ocu-chart',
        role: 'img',
        'aria-label': `${t(`metric${metric[0].toUpperCase()}${metric.slice(1)}`)} · ${t('dailyHint')}`,
      }, daily.map((entry) => h('div', {
        className: 'ocu-bar-col',
        key: entry.day,
        title: `${entry.day} · ${formatValue(valueFor(entry))} ${t(`metric${metric[0].toUpperCase()}${metric.slice(1)}`)}`,
      }, [
        h('div', { className: 'ocu-bar-wrap', key: 'bar' }, h('div', {
          className: 'ocu-bar',
          style: { height: `${valueFor(entry) > 0 ? Math.max(3, Math.round((valueFor(entry) / max) * 100)) : 2}%` },
        })),
        h('div', { className: 'ocu-bar-day', key: 'day' }, entry.day.slice(5)),
      ])))
    }

    /**
     * Render the per-model table.
     * @param {{ models: Array<object>, t: Function }} props - Model rows and translator.
     * @returns {object} React element.
     */
    function ModelTable({ models, t }) {
      return h('table', { className: 'ocu-table' }, [
        h('thead', { key: 'head' }, h('tr', null, [
          h('th', { key: 'model' }, t('colModel')),
          h('th', { className: 'ocu-num', key: 'messages' }, t('colMessages')),
          h('th', { className: 'ocu-num', key: 'tokens' }, t('colTokens')),
          h('th', { className: 'ocu-num', key: 'cost' }, t('colCost')),
        ])),
        h('tbody', { key: 'body' }, models.map((row) => h('tr', { key: `${row.provider}/${row.model}` }, [
          h('td', { key: 'model' }, h('div', { className: 'ocu-model' }, [
            h('span', { className: 'ocu-model-name', key: 'name', title: row.model }, row.model),
            h('span', { className: 'ocu-model-provider', key: 'provider' }, row.provider),
          ])),
          h('td', { className: 'ocu-num', key: 'messages' }, formatCount(row.messages)),
          h('td', { className: 'ocu-num', key: 'tokens' }, formatTokens(row.tokens)),
          h('td', { className: 'ocu-num', key: 'cost' }, formatCost(row.cost)),
        ]))),
      ])
    }

    /**
     * Render the Settings page.
     * @param {{ t: Function }} props - Translator bound to this plugin's namespace.
     * @returns {object} React element.
     */
    function UsageSection({ t }) {
      const [payload, setPayload] = React.useState(null)
      const [error, setError] = React.useState('')
      const [busy, setBusy] = React.useState(true)
      const [request, setRequest] = React.useState({ id: 0, force: false })
      const [metric, setMetric] = React.useState('tokens')
      const [range, setRange] = React.useState(14)

      React.useEffect(() => {
        let alive = true
        setBusy(true)
        setError('')
        const url = request.force ? `${ROUTE}?refresh=1` : ROUTE
        fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return response.json()
          })
          .then((next) => {
            if (!alive) return
            setPayload(next)
            setBusy(false)
          })
          .catch((failure) => {
            if (!alive) return
            setError(failure instanceof Error ? failure.message : String(failure))
            setBusy(false)
          })
        return () => { alive = false }
      }, [request])

      const refresh = () => setRequest((current) => ({ id: current.id + 1, force: true }))

      const header = h('div', { className: 'ocu-head', key: 'head' }, [
        h('div', { key: 'copy' }, [
          h('h2', { className: 'ocu-title', key: 'title' }, t('title')),
          h('p', { className: 'ocu-desc', key: 'desc' }, t('description')),
        ]),
        h('button', {
          className: 'ocu-button',
          key: 'refresh',
          type: 'button',
          onClick: refresh,
          disabled: busy,
        }, busy ? t('refreshing') : t('refresh')),
      ])

      if (busy && payload === null) {
        return h('div', { className: 'ocu-root' }, [header, h('div', { className: 'ocu-muted', key: 'loading' }, t('loading'))])
      }

      if (payload === null) {
        return h('div', { className: 'ocu-root' }, [
          header,
          h('div', { className: 'ocu-alert', role: 'alert', key: 'error' }, [
            h('div', { className: 'ocu-alert-title', key: 'title' }, t('errorTitle')),
            h('div', { className: 'ocu-alert-body', key: 'body' }, error),
            h('button', {
              className: 'ocu-button',
              key: 'retry',
              type: 'button',
              style: { marginTop: 8 },
              onClick: refresh,
            }, t('retry')),
          ]),
        ])
      }

      if (payload.ok !== true) {
        const missing = payload.reason === 'missing'
        return h('div', { className: 'ocu-root' }, [
          header,
          h('div', { className: 'ocu-empty', key: 'empty' }, [
            h('div', { className: 'ocu-empty-title', key: 'title' }, missing ? t('missingTitle') : t('unavailableTitle')),
            h('div', { className: 'ocu-empty-body', key: 'body' }, missing
              ? t('missingBody', { path: payload.dbPath })
              : (payload.message || t('unavailableTitle'))),
          ]),
        ])
      }

      const { totals, daily: allDaily, models, dbPath, generatedAt } = payload
      const daily = allDaily.slice(-range)
      const rangeTotal = daily.reduce((sum, entry) => sum + (entry[metric] || 0), 0)
      const rows = models.length > 0
        ? h(ModelTable, { models, t, key: 'models' })
        : h('div', { className: 'ocu-muted', key: 'no-usage' }, t('noUsage'))

      return h('div', { className: 'ocu-root' }, [
        header,
        error !== '' ? h('div', { className: 'ocu-alert', role: 'alert', key: 'stale' }, [
          h('div', { className: 'ocu-alert-body', key: 'body' }, error),
        ]) : null,
        h('div', { className: 'ocu-stats', key: 'stats' }, [
          h(StatCard, { key: 'cost', label: t('spend'), value: formatCost(totals.cost), title: `$${totals.cost.toFixed(6)}` }),
          h(StatCard, { key: 'tokens', label: t('tokens'), value: formatTokens(totals.tokens), title: formatCount(totals.tokens) }),
          h(StatCard, { key: 'cache', label: t('cacheRead'), value: formatTokens(totals.cacheRead), title: formatCount(totals.cacheRead) }),
          h(StatCard, { key: 'sessions', label: t('sessions'), value: formatCount(totals.sessions), title: `${formatCount(totals.messages)} ${t('colMessages')}` }),
        ]),
        h('div', { className: 'ocu-section', key: 'daily' }, [
          h('div', { className: 'ocu-section-head', key: 'head' }, [
            h('div', { key: 'labels' }, [
              h('div', { className: 'ocu-section-title', key: 'title' }, t('dailyTitle')),
              h('div', { className: 'ocu-section-hint', key: 'hint' }, `${t('totalInRange')}: ${metric === 'tokens' ? formatTokens(rangeTotal) : metric === 'cost' ? formatCost(rangeTotal) : formatCount(rangeTotal)}`),
            ]),
            h('div', { className: 'ocu-controls', key: 'controls' }, [
              h('div', { className: 'ocu-segment', role: 'group', 'aria-label': t('dailyTitle'), key: 'metrics' }, ['tokens', 'cost', 'messages'].map((item) => h('button', {
                key: item, type: 'button', 'aria-pressed': metric === item,
                onClick: () => setMetric(item),
              }, t(`metric${item[0].toUpperCase()}${item.slice(1)}`)))),
              h('div', { className: 'ocu-segment', role: 'group', 'aria-label': t('dailyHint'), key: 'ranges' }, [7, 14, 30].map((days) => h('button', {
                key: days, type: 'button', 'aria-pressed': range === days,
                onClick: () => setRange(days),
              }, t('rangeDays', { days })))),
            ]),
          ]),
          h(DailyChart, { daily, t, metric, key: 'chart' }),
        ]),
        h('div', { className: 'ocu-section', key: 'models' }, [
          h('div', { className: 'ocu-section-head', key: 'head' }, [
            h('div', { className: 'ocu-section-title', key: 'title' }, t('modelsTitle')),
          ]),
          rows,
        ]),
        h('div', { className: 'ocu-foot', key: 'foot' }, [
          h('div', { key: 'source' }, [
            `${t('source')}: `,
            h('code', { key: 'path' }, dbPath),
            ` · ${t('readOnly')}`,
          ]),
          h('div', { key: 'updated' }, `${t('updated')}: ${new Date(generatedAt).toLocaleTimeString()}`),
        ]),
      ])
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        const t = ctx.locale.bind(NS)
        ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'opencode-usage: dictionaries')
        ctx.effect(() => {
          const style = document.createElement('style')
          style.dataset.plugin = '@local/opencode-usage'
          style.textContent = css
          document.head.appendChild(style)
          return () => style.remove()
        }, 'opencode-usage: styles')
        ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: 'opencode-usage',
          order: 40,
          label: () => t('nav'),
          locale: NS,
          inject: () => ({ t }),
        }, UsageSection)), 'opencode-usage: settings page')
      },
    }
  },
})
