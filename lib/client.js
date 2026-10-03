/**
 * Client half of dsh-todo-dock —— 右侧栏的「待办」tab。
 *
 * 纯 DOM，刻意做得轻：一行一件、回车就加、点方框勾掉。
 * 真相在宿主，2 秒轮询 —— Agent 用 todo_panel 加的条目，界面自己出现。
 * ⚠️ 整个模块包在 IIFE 里（DSH 把客户端插件拼成一个脚本，顶层 const 会撞名）。
 */

;(() => {
const TAB_KIND = 'todo'
const TAB_ID = 'dsh-todo-dock:todo'
const ROUTE_STATE = '/dsh-todo/state'

window.__ModuleLoader__.load({
  id: 'dsh-todo-dock',
  factory: (require) => {
    const React = require('react')
    const h = React.createElement
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const C = {
      bg: 'var(--dsw-alias-bg-base)',
      border: 'var(--dsw-alias-border-l1)',
      text: 'var(--dsw-alias-label-primary)',
      dim: 'var(--dsw-alias-label-secondary)',
      accent: 'var(--dsw-alias-brand-primary, #5a7cff)',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    }

    function sortTodos(todos) {
      return [...(todos || [])].sort((a, b) => {
        if (Boolean(a.done) !== Boolean(b.done)) return a.done ? 1 : -1
        const key = a.done ? 'doneAt' : 'createdAt'
        return (Number(b[key]) || 0) - (Number(a[key]) || 0)
      })
    }

    function TodoPanel() {
      const [todos, setTodos] = React.useState([])
      const [filter, setFilter] = React.useState('open')
      const [draft, setDraft] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [showDone, setShowDone] = React.useState(true)
      const revisionRef = React.useRef(-1)

      const pushState = React.useCallback((patch) => {
        fetch(ROUTE_STATE, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        }).catch(() => {})
      }, [])

      const pull = React.useCallback(() => {
        setBusy(true)
        return fetch(ROUTE_STATE)
          .then((response) => response.json())
          .then((payload) => {
            if (!payload || !payload.ok) return
            const state = payload.state || {}
            revisionRef.current = state.revision || 0
            setTodos(state.todos || [])
            if (state.filter) setFilter(state.filter)
          })
          .catch(() => {})
          .finally(() => setBusy(false))
      }, [])

      React.useEffect(() => {
        pull()
        const timer = setInterval(() => {
          fetch(ROUTE_STATE)
            .then((response) => response.json())
            .then((payload) => {
              if (!payload || !payload.ok) return
              const state = payload.state || {}
              if ((state.revision || 0) !== revisionRef.current) {
                revisionRef.current = state.revision || 0
                setTodos(state.todos || [])
              }
            })
            .catch(() => {})
        }, 2000)
        return () => clearInterval(timer)
      }, [pull])

      const sorted = React.useMemo(() => sortTodos(todos), [todos])
      const open = sorted.filter((todo) => !todo.done)
      const done = sorted.filter((todo) => todo.done)
      const rows = filter === 'all' ? sorted : filter === 'done' ? done : open

      const add = () => {
        const text = draft.trim()
        if (!text) return
        const todo = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, text, done: false, createdAt: Date.now(), doneAt: null }
        const next = sortTodos([todo, ...todos])
        setTodos(next)
        setDraft('')
        pushState({ todos: next })
      }

      const toggle = (todo) => {
        const next = sortTodos(todos.map((item) => (item.id === todo.id ? { ...item, done: !item.done, doneAt: !item.done ? Date.now() : null } : item)))
        setTodos(next)
        pushState({ todos: next })
      }

      const remove = (todo) => {
        const next = todos.filter((item) => item.id !== todo.id)
        setTodos(next)
        pushState({ todos: next })
      }

      const clearDone = () => {
        const next = todos.filter((item) => !item.done)
        setTodos(next)
        pushState({ todos: next })
      }

      const setFilterAndSave = (value) => {
        setFilter(value)
        pushState({ filter: value })
      }

      const row = (todo) =>
        h(
          'div',
          { key: todo.id, style: { display: 'flex', alignItems: 'flex-start', gap: 7, padding: '5px 8px', borderRadius: 6, fontSize: 12.5 } },
          h(
            'span',
            { onClick: () => toggle(todo), style: { cursor: 'pointer', flex: 'none', fontSize: 13, color: todo.done ? C.dim : C.accent, lineHeight: '18px' } },
            todo.done ? '☑' : '☐',
          ),
          h(
            'span',
            {
              style: {
                flex: '1 1 auto',
                minWidth: 0,
                lineHeight: 1.45,
                wordBreak: 'break-word',
                textDecoration: todo.done ? 'line-through' : 'none',
                opacity: todo.done ? 0.5 : 1,
              },
            },
            todo.text,
          ),
          h('span', { onClick: () => remove(todo), title: '删除', style: { cursor: 'pointer', color: C.dim, flex: 'none', lineHeight: '18px' } }, '✕'),
        )

      return h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, color: C.text } },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderBottom: `1px solid ${C.border}`, fontSize: 12 } },
          h('span', { style: { fontWeight: 600 } }, '✅ 待办'),
          h('span', { style: { fontFamily: C.mono, fontSize: 10.5, color: C.dim } }, `未完成 ${open.length}`),
          h(
            'span',
            { style: { marginLeft: 'auto', display: 'inline-flex', gap: 3 } },
            [
              { key: 'open', text: '未完成' },
              { key: 'all', text: '全部' },
              { key: 'done', text: '已完成' },
            ].map((item) =>
              h(
                'span',
                {
                  key: item.key,
                  onClick: () => setFilterAndSave(item.key),
                  style: {
                    fontSize: 10.5,
                    padding: '1px 6px',
                    borderRadius: 5,
                    cursor: 'pointer',
                    border: `1px solid ${C.border}`,
                    color: filter === item.key ? C.text : C.dim,
                    background: filter === item.key ? `color-mix(in srgb, ${C.accent} 22%, transparent)` : 'transparent',
                  },
                },
                item.text,
              ),
            ),
          ),
          h('button', { type: 'button', onClick: pull, title: '刷新', style: { border: `1px solid ${C.border}`, background: 'transparent', color: C.text, borderRadius: 6, fontSize: 12, padding: '1px 6px', cursor: 'pointer' } }, busy ? '…' : '⟳'),
        ),
        h(
          'div',
          { style: { padding: '8px 10px', borderBottom: `1px solid ${C.border}` } },
          h('input', {
            value: draft,
            onChange: (event) => setDraft(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Enter') add()
            },
            placeholder: '加一条，回车',
            style: {
              width: '100%',
              boxSizing: 'border-box',
              background: 'transparent',
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              color: C.text,
              fontSize: 12.5,
              padding: '5px 8px',
              outline: 'none',
            },
          }),
        ),
        h(
          'div',
          { style: { flex: '1 1 auto', minHeight: 0, overflow: 'auto', padding: '4px 4px 12px' } },
          rows.length
            ? rows.map(row)
            : h('div', { style: { padding: 14, fontSize: 12, color: C.dim } }, filter === 'open' ? '没有未完成的 🎉' : filter === 'done' ? '还没有完成的' : '清单是空的'),
          done.length && filter === 'open'
            ? h(
                'div',
                { style: { marginTop: 8 } },
                h(
                  'div',
                  {
                    onClick: () => setShowDone((value) => !value),
                    style: { padding: '3px 8px', fontSize: 10.5, color: C.dim, cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 5 },
                  },
                  h('span', { style: { fontSize: 9 } }, showDone ? '▼' : '▶'),
                  h('span', null, `已完成 ${done.length}`),
                  h(
                    'span',
                    { onClick: (event) => { event.stopPropagation(); clearDone() }, style: { marginLeft: 'auto', cursor: 'pointer' } },
                    '清掉',
                  ),
                ),
                showDone ? done.map(row) : null,
              )
            : null,
        ),
      )
    }

    function TodoBody() {
      return h(TodoPanel)
    }

    function TodoTitle() {
      return h(
        'span',
        { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
        h('span', { 'aria-hidden': 'true' }, '✅'),
        h('span', null, '待办'),
      )
    }

    const inject = ['slots', 'sidebarRightTabs']

    function apply(ctx) {
      ctx.inject(['sidebarRightTabs'], (scoped) => {
        scoped.sidebarRightTabs.register({
          id: TAB_ID,
          kind: TAB_KIND,
          priority: 'extension',
          title: () => '待办',
          guide: [
            {
              id: TAB_KIND,
              kind: TAB_KIND,
              order: 110,
              title: () => '待办',
              description: () => '一行一件 · 勾掉即完成',
              icon: () => h('span', { style: { fontSize: 16 } }, '✅'),
            },
          ],
        })
      })
      ctx.inject(['slots'], (scoped) => {
        scoped.slots.inject('sidebar.right.pane.tab', () =>
          scoped.slots.register({ name: 'sidebar.right.pane.tab', key: TAB_ID }, TodoBody),
        )
        scoped.slots.inject('sidebar.right.pane.tab.title', () =>
          scoped.slots.register({ name: 'sidebar.right.pane.tab.title', key: TAB_ID }, TodoTitle),
        )
      })
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  },
})
})()
