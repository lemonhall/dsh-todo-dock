/**
 * 待办排序与统计的单元测试（纯函数）：
 *   node test/todo.test.mjs
 */
import { sortTodos, todoStats } from '../lib/index.js'

let failed = 0
function check(name, actual, expected) {
  const show = (v) => (typeof v === 'string' ? v : JSON.stringify(v))
  const ok = show(actual) === show(expected)
  if (!ok) failed += 1
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : `\n    期望 ${show(expected)}\n    实际 ${show(actual)}`}`)
}

const todos = [
  { id: 'a', text: '旧的未完成', done: false, createdAt: 1000, doneAt: null },
  { id: 'b', text: '新的未完成', done: false, createdAt: 3000, doneAt: null },
  { id: 'c', text: '早完成', done: true, createdAt: 500, doneAt: 2000 },
  { id: 'd', text: '刚完成', done: true, createdAt: 800, doneAt: 4000 },
]

check('未完成在前，新的在上', sortTodos(todos).map((t) => t.id), ['b', 'a', 'd', 'c'])
check('排序不改原数组', todos.map((t) => t.id), ['a', 'b', 'c', 'd'])
check('统计', todoStats(todos), { total: 4, open: 2, done: 2 })
check('空清单统计', todoStats([]), { total: 0, open: 0, done: 0 })
check('undefined 不炸', todoStats(undefined), { total: 0, open: 0, done: 0 })

console.log(failed ? `\n${failed} 项失败` : '\n全部通过')
process.exit(failed ? 1 : 0)
