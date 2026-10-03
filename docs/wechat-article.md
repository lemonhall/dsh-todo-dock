# 一个轻量待办，到底该有多轻

✅ **待办** —— DSH 右侧栏的一个新 tab。

## 为什么做这个

待办应用的通病是：功能越多，我越不想打开它。我需要的只是想到了记一条、做完勾掉。

## 长什么样

![待办](https://cdn.jsdelivr.net/gh/lemonhall/dsh-todo-dock@main/docs/screenshot-panel.png)

（图只截了右侧栏面板。我这台机器桌面左下角有真名，所以截图从来不整屏。）

## 它能干什么

- 刻意做轻：**只有文字 + 完成状态 + 创建时间**
- 未完成在前（新的在上）、已完成在后；可折叠、可一键清掉
- 三个筛选：未完成 / 全部 / 已完成
- `keepDone` 默认只留最近 200 条已完成，防止清单无限长
- `todo_panel` 工具：`add` / `list` / `done` / `remove` / `clear_done`

## 一个值得说的设计决定

**刻意不做优先级、截止日期、子任务、标签。** 这不是还没做，是设计边界 —— 那些属于任务管理器，不属于随手记。唯一多给的一点点是 `keepDone`（默认只留最近 200 条已完成），因为它挡的是清单无限增长这种必然发生的退化。

## 双向的，不只看

这是这批插件的共同点：**状态在宿主、界面 2 秒轮询**。所以我在面板里点一下，Agent 调工具就能读到；Agent 写一次（比如「帮我记一笔午饭 12.5」），面板自己就变了。

装：

```
# 先装 DSH（桌面版从 https://harness.deepseek.com 下载安装包；只要 CLI 的话）：
npm i -g @deepseek-ai/dsh

# 再装这个插件（桌面版也可以走 GUI：右侧栏「插件 → 添加插件」）
dsh plugin --profile desktop add dsh-todo-dock

# 如果你是开发者、想用本地目录直接挂：
plugin_manager install_bundle target=link:E:\development\dsh-todo-dock
```

代码在 <https://github.com/lemonhall/dsh-todo-dock>，npm 上是 `dsh-todo-dock`。右侧栏点「**+**」→ 选「待办」就能看到它。

## 已知限制

- **不做优先级、截止日期、子任务、标签、提醒** —— 那属于任务管理器，不属于"随手记一下"
- 没有多清单/多项目
- 不跟任何外部待办同步
