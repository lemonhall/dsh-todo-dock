/**
 * Host half of dsh-todo-dock —— 轻量待办的宿主半。
 *
 * 纯本地。**刻意不做**优先级/截止日期/子任务/标签 —— 那属于任务管理器；
 * 这里只解决"想到了随手记一条、做完勾掉"。
 */

import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createStateStore } from './state.js'

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULTS = {
  collapseDone: true,
  keepDone: 200,
}

const ROUTE_STATE = '/dsh-todo/state'

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const stateStore = createStateStore(join(DSH_HOME, 'dsh-todo-dock', 'state.json'), {
  todos: [], // [{ id, text, done, createdAt, doneAt }]
  filter: 'open', // 面板上的筛选：all | open | done
  pendingQuestion: null,
})

function sendJson(res, status, payload) {
  try {
    const body = JSON.stringify(payload)
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'content-length': Buffer.byteLength(body),
    })
    res.end(body)
  } catch {
    /* 连接已经断了 */
  }
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** 未完成在前（新的在上），已完成在后（最近完成的在上）。 */
export function sortTodos(todos) {
  return [...(todos || [])].sort((a, b) => {
    if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1
    const key = a.done ? 'doneAt' : 'createdAt'
    return (Number(b[key]) || 0) - (Number(a[key]) || 0)
  })
}

export function todoStats(todos) {
  const list = todos || []
  const open = list.filter((todo) => !todo.done).length
  return { total: list.length, open, done: list.length - open }
}

/** Host plugin body. */
function apply(ctx, config) {
  const cfg = config && typeof config === 'object' ? config : {}
  const opts = { ...DEFAULTS, ...cfg }

  ctx.inject(['tools'], (toolScoped) => {
    toolScoped.tools.register({
      name: 'todo_panel',
      description:
        '读写 DSH 右侧栏「待办」面板（本地存储，轻量清单）。' +
        'action=add 加一条（需要 text）；action=list 看清单（可给 filter=open|done|all，默认 open）；' +
        'action=done/undone 勾选（需要 id）；action=remove 删一条（需要 id）；action=clear_done 清掉所有已完成的；action=state 看统计。' +
        'id 从 list 的返回里拿。',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['add', 'list', 'done', 'undone', 'remove', 'clear_done', 'state'], description: '要做的动作。' },
          text: { type: 'string', description: 'add：待办内容。' },
          id: { type: 'string', description: 'done/undone/remove：待办 id。' },
          filter: { type: 'string', enum: ['open', 'done', 'all'], description: 'list：看哪部分，默认 open。' },
        },
        required: ['action'],
        additionalProperties: false,
      },
      output: {
        schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'], additionalProperties: false },
        render(_args, value) {
          return [{ type: 'text', text: String((value && value.text) || '') }]
        },
      },
      presentCall(args) {
        return { card: 'terminal', title: `todo_panel ${String((args && args.action) || 'list')}`.trim() }
      },
      async execute(args) {
        const action = String((args && args.action) || 'list').toLowerCase()
        const s = () => stateStore.get()

        if (action === 'state') {
          const stats = todoStats(s().todos)
          return { text: JSON.stringify({ ...stats, revision: s().revision }, null, 2) }
        }

        if (action === 'add') {
          const text = String(args.text || '').trim()
          if (!text) return { text: 'add 需要 text' }
          const todo = { id: newId(), text, done: false, createdAt: Date.now(), doneAt: null }
          const next = stateStore.patch({ todos: sortTodos([...(s().todos || []), todo]) })
          return { text: `已加：${text}（id=${todo.id}，未完成 ${todoStats(next.todos).open} 条）` }
        }

        if (action === 'list') {
          const filter = String(args.filter || 'open').toLowerCase()
          const all = sortTodos(s().todos)
          const rows = all.filter((todo) => (filter === 'all' ? true : filter === 'done' ? todo.done : !todo.done))
          if (!rows.length) return { text: filter === 'open' ? '没有未完成的' : filter === 'done' ? '还没有完成的' : '清单是空的' }
          return { text: rows.map((todo) => `${todo.done ? '☑' : '☐'} ${todo.text}\n  id=${todo.id}`).join('\n') }
        }

        if (action === 'clear_done') {
          const todos = s().todos || []
          const kept = todos.filter((todo) => !todo.done)
          const removed = todos.length - kept.length
          if (!removed) return { text: '没有已完成的' }
          stateStore.patch({ todos: kept })
          return { text: `清掉了 ${removed} 条已完成的，剩 ${kept.length} 条` }
        }

        const id = String(args.id || '').trim()
        if (!id) return { text: `${action} 需要 id` }
        const todos = s().todos || []
        const target = todos.find((todo) => todo.id === id)
        if (!target) return { text: `找不到 id=${id}` }

        if (action === 'remove') {
          const next = stateStore.patch({ todos: todos.filter((todo) => todo.id !== id) })
          return { text: `已删：${target.text}（剩 ${todoStats(next.todos).open} 条未完成）` }
        }
        if (action === 'done' || action === 'undone') {
          const want = action === 'done'
          let next = todos.map((todo) => (todo.id === id ? { ...todo, done: want, doneAt: want ? Date.now() : null } : todo))
          // keepDone：只保留最近 N 条已完成的，防止无限长
          const keep = Number(opts.keepDone) || 0
          if (keep > 0) {
            const doneList = next.filter((todo) => todo.done).sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0))
            if (doneList.length > keep) {
              const drop = new Set(doneList.slice(keep).map((todo) => todo.id))
              next = next.filter((todo) => !drop.has(todo.id))
            }
          }
          const saved = stateStore.patch({ todos: sortTodos(next) })
          return { text: `${want ? '已勾完成' : '已取消完成'}：${target.text}（未完成 ${todoStats(saved.todos).open} 条）` }
        }
        return { text: `不认识的动作：${action}` }
      },
    })
  })

  ctx.inject(['webServer'], (scoped) => {
    const disposers = []
    disposers.push(
      scoped.webServer.register({
        kind: 'exact',
        path: ROUTE_STATE,
        handler: (req, res) => {
          const method = String((req && req.method) || 'GET').toUpperCase()
          const headers = (req && req.headers) || {}
          if (String(headers['sec-fetch-site'] || '').toLowerCase() === 'cross-site') {
            res.statusCode = 403
            res.end()
            return
          }
          if (method === 'GET' || method === 'HEAD') {
            const s = stateStore.get()
            sendJson(res, 200, { ok: true, collapseDone: opts.collapseDone, stats: todoStats(s.todos), state: s })
            return
          }
          if (method === 'POST') {
            let raw = ''
            req.on('data', (chunk) => {
              raw += chunk
              if (raw.length > 2 * 1024 * 1024) req.destroy()
            })
            req.on('end', () => {
              let body = {}
              try {
                body = raw.trim() ? JSON.parse(raw) : {}
              } catch {
                sendJson(res, 400, { ok: false, error: '请求体不是 JSON' })
                return
              }
              if (Array.isArray(body.todos)) body.todos = sortTodos(body.todos)
              sendJson(res, 200, { ok: true, state: stateStore.patch(body) })
            })
            return
          }
          res.statusCode = 405
          res.end()
        },
      }),
    )

    ctx.on('dispose', () => {
      for (const off of disposers) {
        try {
          off()
        } catch {
          /* already gone */
        }
      }
    })
  })
}

export { apply, ROUTE_STATE, DEFAULTS }
