# dsh-todo-dock ✅

DSH 右侧栏的**轻量待办**：一行一件、回车就加、勾掉即完成。

> 这是给 [DSH（DeepSeek Harness）](https://github.com/deepseek-ai/deepseek-harness) 右侧栏做的一排日常插件之一。
> 右侧栏本来就是 DSH 的「apps 入口」—— 官方的文件/终端/浏览器和第三方插件走的是**完全同一套机制**。

## 效果

![面板](https://cdn.jsdelivr.net/gh/lemonhall/dsh-todo-dock@main/docs/screenshot-panel.png)

（截图只裁了右侧栏面板。想换订阅源/分类/时长这些，改配置就行，不用碰代码。）

## 它能干什么

- 刻意做轻：**只有文字 + 完成状态 + 创建时间**
- 未完成在前（新的在上）、已完成在后；可折叠、可一键清掉
- 三个筛选：未完成 / 全部 / 已完成
- `keepDone` 默认只留最近 200 条已完成，防止清单无限长
- `todo_panel` 工具：`add` / `list` / `done` / `remove` / `clear_done`

## 装

```
plugin_manager  install_bundle  target=link:E:\development\dsh-todo-dock
```

或从 npm：

```
dsh plugin --profile <你的 profile> add dsh-todo-dock
```

装好之后：右侧栏点「**+**」→ 选「**待办**」。

⚠️ **客户端半边改动要重启一次应用**；宿主半边热生效 —— 但**新增宿主路由要重启**（实测，别指望热重载）。

## 它是怎么work的

```
lib/index.js    宿主半：路由 + todo_panel 工具（Agent 侧读写同一份状态）
lib/state.js    本地状态（原子写：临时文件 + rename，读的人不会撞上写了一半的文件）
lib/client.js   右侧栏 tab（整个模块包在 IIFE 里 —— DSH 把所有客户端插件拼成一个脚本，
                顶层 const 会跨插件撞名，实测撞过一次直接把应用挡在启动之外）
```

**双向通道**：状态存在宿主，客户端 2 秒轮询。所以**你在面板里点一下，Agent 调工具就能读到**；
**Agent 写一次，面板自己会跟着变**。这不是"一个只读的看板"。

## 已知限制

- **不做优先级、截止日期、子任务、标签、提醒** —— 那属于任务管理器，不属于"随手记一下"
- 没有多清单/多项目
- 不跟任何外部待办同步

## License

MIT
