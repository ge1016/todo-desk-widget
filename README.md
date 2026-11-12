# 我的待办台 · Todo Desk Widget

一个「记录 + 决策」二合一的个人待办工作台：云端数据表存数据，资料库页面做看板，Windows 桌面浮窗做常驻入口。数据在浏览器、手机、桌面浮窗之间实时同步。

> 本仓库是**脱敏后的可复用模板**。所有资源 ID 已替换为占位符，配置方法见「快速开始」。

> 当前版本 **v5.1.0**（2026-11-12）· 本次变更与验证结果见 [更新日志](CHANGELOG.md) · 打包文件在仓库 Release 页面下载。

---

## 一、项目概述

| 项目 | 内容 |
|---|---|
| 目标 | 把散落的待办收敛成一处：随手记、看得清今天该做什么、完成后能承接衍生出来的新事 |
| 数据层 | WorkBuddy 资料库数据表「待办与完成记录」，10 个字段 |
| 页面层 | Smart Page 单文件 HTML，通过 `window.__SMART_PAGE__.database` SDK 读写 |
| 桌面层 | Electron 无边框置顶浮窗 + Windows 计划任务（登录自启） |
| 同步方式 | 单一数据源，所有端读写同一张表，无本地副本、无需手动同步 |
| 部署形态 | 纯前端 + 平台 SDK，无自建后端、无第三方 CDN、无密钥 |

设计取舍：

- **首页是标签 + 模块，不是表格**：顶部四个可点核心标签回答「现在什么状况」，下面五个纵向模块按「今日必做 → 进行中 → 待办池 → 最近完成 → 搁置」组织，窄屏也好读。
- **添加区收进悬浮按钮**：日常打开先看内容，不被一行输入框占据首屏；点右下角 ＋（或按 `N`）才展开完整表单。
- **完成不是终点，是分支点**：一件事做完常会带出新的事，用「来源」字段记录父子关系，完成后可直接一键衍生。
- **日期与倒计时按任务解耦**：点某张卡片的日期徽章只切这一条，不会带动全屏；工具条的「全部切到…」作为同步按钮，负责一次性统一所有任务并清除各条的单独设置。
- **独立「搁置」状态**：不做了但不删，保留痕迹；完成率分母排除搁置项。
- **分类用自由文本**：项目线会持续变化，固定选项反而成为负担。
- **今日必做由截止日倒推决定**：只看「离截止还有几天」，计划日期不再决定任务该不该进今日必做；提前量可点模块头的「提前 N 天」在 1 / 3 / 7 天间切换。
- **计划日期 ≠ 截止日期**：前者是「我打算哪天做」，后者是「最晚哪天交」；只有没填截止日期时，才退回用计划日期判断。

---

## 二、功能演进

| 版本 | 能力 |
|---|---|
| v1 | 四列看板（待办/进行中/已完成/搁置）、KPI、快速添加、搜索、分类筛选、隐藏已完成；全量分页读取；桌面浮窗 + 开机自启 |
| v2 | 富文本任务描述：添加时可写、卡片可展开、随时可编辑；白名单清洗防 XSS；描述正文纳入搜索 |
| v3 | 今日聚焦（计划日期、四项 KPI、今天/全部视图、改期弹窗、紧急度排序）；删除改为 8 秒延迟提交可撤销；窄窗紧凑化；快捷键 |
| v4 | 衍生任务链（来源字段 + 完成后一键衍生 + 关系徽章）；日期/倒计时可点切换组件；添加区收进悬浮按钮；首页重构为可点核心标签 + 五大纵向模块；模块折叠、登录后自动置顶 |
| v5 | 日期/倒计时改为**按任务独立切换**（点单卡不再全局联动）；工具条按钮保留为「全部切到…」同步按钮，统一所有任务并清除单独设置；单独设置的任务加虚线边框标识；单卡局部刷新不重绘整页、不跳滚动位置 |
| v5.1 | 今日必做改为**按截止日往前推**：有截止日期时完全不看计划日期，只按「逾期 / 今天 / 截止前 N 天」判定；模块头「提前 N 天」按钮可切 1 / 3 / 7 天并记住；排序档位与说明文案同步；无截止日期才退回计划日期 / 未排期规则 |

### 当前功能清单

**首页**
- 四个核心标签：今天要做 / 已逾期 / 今日完成 / 完成率。点前三个可筛出对应模块，再点取消；完成率标签用于一键回到全量视图
- 五个纵向模块，标题带条数与说明，可折叠/展开；已完成与搁置默认收起
- 「今日必做」模块头有「提前 N 天」小按钮，点一下在 1 / 3 / 7 天间切换临期窗口（默认 3 天，本地记住），分组与 KPI 即时重算
- 工具栏：今天 / 全部、关键词搜索、分类快捷筛选、**全部切到日期 / 倒计时（同步按钮）**、隐藏已完成

**记录**
- 悬浮 ＋ 打开新建面板（快捷键 `N`）：任务名 + 优先级 + 分类 + 计划日期 + 截止日期 + 富文本描述
- 富文本：加粗/斜体/下划线/删除线、项目符号与编号列表、清格式，`Ctrl+Enter` 提交
- 草稿自动保存（localStorage），刷新不丢；`/` 聚焦搜索、`Esc` 关弹窗
- 卡片操作：开始 / 完成 / 搁置 / 重新打开 / + 衍生 / 写描述 / 改期 / 删除

**衍生**
- 点「完成」后底部出现「已完成「XX」· + 衍生新事」，9 秒内可直接建下一条
- 任意卡片都有「+ 衍生」按钮；新建面板显示「承接自 XX」，可一键取消关联
- 新记录自动写入「来源」= 父记录 ID；卡片显示「↳ 由「XX」衍生」，父卡片显示「衍生 N 条」

**日期**
- 每张卡片的计划/截止徽章各自可点，在「计划 11-15」「截止 11-20」与「计划 · 3 天后」「截止 · 8 天后」之间切换；**只影响这一条任务**，同一任务的计划与截止一起切
- 被单独设置过的任务，日期徽章显示虚线边框；再点一次切回全局模式即取消单独设置
- 工具条「全部切到倒计时 / 全部切到日期」= 同步按钮：把所有任务统一到目标模式、清空所有单独设置，之后新建的任务也跟随全局模式
- 逾期显示「逾期 N 天」并标红；已完成任务的日期固定显示绝对日期，不参与倒计时，日期徽章也不可点（避免点了没反应的假交互）
- 全局模式存 `todo_due_mode_v1`，单任务覆盖存 `todo_due_mode_per_v1`（记录 ID → 模式），任务删除时自动清理失效键；两者都是浏览器本地偏好，不同设备各自独立

**决策**
- 今日必做 / 「今天 N」视图：**有截止日期就只按截止日倒推** —— 逾期、今天到期、或截止前 N 天（默认 3 天，可切 1 / 7 天）进入今日必做；「计划日期已到但截止还远」不再混进来
- 没填截止日期的任务才退回旧规则：计划日期已到、或完全没排期 → 今日必做；计划在未来 → 待办池
- 排序按剩余天数分档：逾期 → 今天到期 → 截止前 N 天 → 没截止日且计划日已到/未排期 → 其他未来任务，同档内再看优先级与日期
- 提前天数存 `todo_focus_lead_v1`（浏览器本地偏好）
- 改期弹窗：今天 / 明天 / 3 天后 / 下周一，或任意日期
- 删除为 8 秒延迟提交可撤销，误触不会真的写库

**桌面**
- 无边框置顶小窗，可拖拽，位置/尺寸/置顶状态持久化
- 图钉（切换置顶）、最小化、关闭；未登录时自动放大便于扫码，登录后收回小窗
- 开机登录自动浮现，由 Windows 计划任务托管
- 窗口标题锁定，不被网页标题覆盖
- 可选排障开关：工作区放 `diag.flag` 后，把渲染层日志与 iframe DOM 快照写到 `diag.log`

---

## 三、系统架构

```
┌─────────────────────────────────────────────┐
│ 桌面层  Electron 浮窗（Windows）              │
│ · 无边框 / 置顶 / 拖拽 / 位置记忆             │
│ · 注入拖拽条与窗口按钮                        │
│ · 计划任务 TodoDeskWidget（AtLogOn）           │
└──────────────────┬──────────────────────────┘
                   │ loadURL（平台登录态）
┌──────────────────▼──────────────────────────┐
│ 页面层  单文件 HTML（Smart Page）             │
│ · ES5 / 无外部依赖 / 玻璃拟态淡蓝白           │
│ · db.query 全量分页 → 分组到 5 个模块渲染      │
│ · 标签筛选、模块折叠、截止日倒推分组       │
│ · 按任务独立的日期/倒计时显示             │
│ · db.addRecord / updateRecord / deleteRecord   │
│ · 富文本白名单清洗、延迟提交删除、衍生来源链   │
└──────────────────┬──────────────────────────┘
                   │ window.__SMART_PAGE__.database
┌──────────────────▼──────────────────────────┐
│ 数据层  资料库数据表「待办与完成记录」          │
│ 10 字段，唯一数据源，多端共享                   │
└─────────────────────────────────────────────┘
```

数据流要点：`getSchema` 拉取 select 选项的 id↔text 映射 → `query` 分页拉全量 → 本地分组、过滤、排序、渲染 → 写操作成功后重新 `refresh()` 保证与服务端一致。删除是例外：先从本地数组移除并显示撤销条，8 秒后才提交 `deleteRecord`。

---

## 四、数据表结构

| 字段 | 类型 | 用途 |
|---|---|---|
| 任务 | text | 任务标题 |
| 状态 | select | 待办 / 进行中 / 已完成 / 搁置 |
| 优先级 | select | 高 / 中 / 低 |
| 分类 | text | 自由文本，如「企微」「AI」 |
| 计划日期 | date | 打算哪天做，驱动今日聚焦 |
| 截止日期 | date | 最晚哪天交，驱动逾期判定与倒计时 |
| 完成日期 | date | 标记完成时自动写入 |
| 备注 | text | 早期版本字段，保留兼容 |
| 详情 | text | 富文本描述（清洗后的 HTML） |
| 来源 | text | 父记录 ID，承接衍生出来的新任务 |

建表参数见 `src/schema.json`，线上表结构快照见 `src/schema_real.json`，页面字段映射规范见 `src/canonical_schema.json`。

---

## 五、快速开始

### 前置条件

- WorkBuddy 资料库（Smart Page 运行环境）
- Windows 10/11 + WebView2 Runtime（Edge 自带即可）
- Node.js 22、Python 3.13、Electron 45

### 1. 替换占位符

全仓库搜索并替换：

| 占位符 | 换成 | 出现位置 |
|---|---|---|
| `YOUR_DATABASE_ID` | 你自己的数据表 ID | `src/todo.html`、`src/schema_real.json` |
| `YOUR_PAGE_NODE_ID` | 你自己的页面节点 ID | `desktop/main.js` 的 `PAGE_URL` |

`src/canonical_schema.json` 中的 select option id 为示例值，按 `db.getSchema` 的实际返回替换即可。

### 2. 建表与导入页面

```bash
L="<WorkBuddy 安装目录>/resources/plugins/workbuddy-builtin/skills/library"

python3 "$L/database/create_database.py" --schema "$(cat src/schema.json)"
python3 "$L/page/import_html.py" src/todo.html \
  --file-name "我的待办台.html" \
  --node-block-id "<你的页面节点 ID>" \
  --databases '[{"id":"<你的数据表 ID>"}]'
```

若已有旧表，追加字段即可（不影响已有记录）：

```bash
python3 "$L/database/add_database_field.py" --database-id "<ID>" --property '{"name":"详情","config":{"text":""}}'
python3 "$L/database/add_database_field.py" --database-id "<ID>" --property '{"name":"计划日期","config":{"date":""}}'
python3 "$L/database/add_database_field.py" --database-id "<ID>" --property '{"name":"来源","config":{"text":""}}'
```

上传偶发返回「文件上传到 COS 失败」时，原命令重试一次即可成功（节点 ID 保持不变）。

### 3. 安装桌面浮窗

```bash
cd desktop
npm install --registry=https://registry.npmmirror.com
python3 make_icon.py
```

> 若 npm 的 optional 原生解压包未安装成功，可从镜像手动下载 `electron-v45.3.0-win32-x64.zip` 解压到 `node_modules/electron/dist/`，并写入 `node_modules/electron/path.txt`（内容 `electron.exe`）。

### 4. 桌面图标与开机自启

```bash
# 生成桌面快捷方式（Electron 内置 API，绕开 COM/脚本策略限制）
electron.exe . --make-shortcut
```

开机自启使用 Windows 计划任务（触发器「用户登录时」），比注册表 Run 项稳定，且不会被重复拉起：

```powershell
$exe = "<你的路径>\\node_modules\\electron\\dist\\electron.exe"
$dir = "<desktop 目录>"
$action = New-ScheduledTaskAction -Execute $exe -Argument ('"' + $dir + '"') -WorkingDirectory $dir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
Register-ScheduledTask -TaskName "TodoDeskWidget" -Action $action -Trigger $trigger -Settings $settings -Force
```

首次启动需在浮窗内登录一次，登录后窗口自动收回小窗模式。登录态过期时会跳到登录页并在登录后回到工作台，页面会自动滚回顶部。

---

## 六、关键实现与已知环境坑

**页面**
- `rtSanitize()` 白名单清洗富文本：仅保留 `B/STRONG/I/EM/U/S/STRIKE/BR/P/DIV/UL/OL/LI/SPAN` 与安全 `A`（仅 http(s)、带 `rel=noopener noreferrer`），`script/iframe/img/svg` 等直接剔除。
- **衍生链**：`addRecord` 时写入 `来源 = 父记录 ID`；渲染时用 `findRow()` 反查父任务名、`childCount()` 统计子任务数。完成后用通用 Toast 承载「+ 衍生新事」入口，与删除撤销共用同一套 `showToast / toastHandler`。
- **日期双模式**：`dateLabel()` 根据 `view.dueMode` 在绝对日期与 `daysDiff()` 倒计时之间切换；徽章与工具条按钮都调用 `toggleDueMode()`，偏好存 localStorage。
- **延迟提交删除**：点删除只移除本地数组并显示「撤销」提示，8 秒内 `db.deleteRecord` 从未调用；撤销即恢复，超时或下一次 `refresh()` 才真正提交。零误删风险。
- 全量分页读取带 `guard > 100` 保护，避免 cursor 异常导致死循环。
- 今日视图判定放在 `isFocus()`：未排期任务也纳入今天，避免老数据升级后视图空白。
- `history.scrollRestoration = 'manual'` + boot 时 `scrollTo(0,0)`，避免登录跳转回来后浏览器恢复旧滚动位置、把核心标签顶出视口。

**质量检查（三道，均需通过）**
```bash
python3 "$L/page/lint_schema.py" --schema "$(cat src/canonical_schema.json)"
python3 "$L/page/lint_database_sdk_usage.py" --schema "$(cat src/schema_real.json)" --html src/todo.html
python3 "$L/page/lint_page_quality.py" --html src/todo.html --has-database
```
已知约束：常量必须命名 `DATABASE_ID`；`db.query` 的 then 链需显式 `.catch`；`display_selector` 只接受简单 CSS selector；正则字面量中的转义斜杠可能触发括号配平误判，改用 `indexOf` 写法。

**Electron / Windows**
- 某些会话注入 `ELECTRON_RUN_AS_NODE` 会把 Electron 当纯 Node 运行导致 `app` undefined。`main.js` 顶部有自愈守卫：检测后清理环境变量并 detached 重启自身，带防循环标记。
- `@electron-internal/extract-zip-win32-x64-msvc` 官方源未发布，npm 装不出二进制，需手动解压（见上）。
- PowerShell COM 与 VBS 启动器可能被脚本策略拦截，改用 Electron `shell.writeShortcutLink` 生成 `.lnk`。
- **工具会话结束会回收其子进程树**，因此测试时不能用后台命令保活浮窗；真实使用由计划任务托管，进程挂在 Task Scheduler 下，与任何会话解耦。
- 窄窗（≤720px）下四个核心标签改四宫格、模块内边距收紧、表单换行，430px 浮窗下仍可读。
- 平台把自定义 HTML 放在跨域 iframe 中，顶层脚本无法读取其 DOM；排障只能通过浮窗自身进程里的诊断开关（见「桌面」）。

---

## 七、质量保障

| 检查项 | 结果 |
|---|---|
| 脚本语法 `node --check`（页面 + 主进程） | 通过 |
| lint_schema | 通过 |
| lint_database_sdk_usage | 通过 |
| lint_page_quality（`--has-database`） | 通过，无告警 |
| DOM id 与 `getElementById` 引用比对 | 48 个 id / 47 处引用，无缺失 |
| 离线交互回归 | 83 项断言全部通过 |
| 浮窗实机渲染（核心标签 + 模块 + FAB + 衍生按钮 + 倒计时） | 通过 |

另附**离线交互回归测试**（`tests/`）：用 mock 数据服务加载真实页面脚本，不触碰线上数据。测试数据按运行当天动态生成日期，保证断言长期可复现。

```bash
cd tests && python3 make_test_page.py
unset NODE_OPTIONS BASH_ENV ELECTRON_RUN_AS_NODE
<electron.exe> test_main.js      # 输出 TEST_RESULT，fails=0 即通过
```

覆盖范围：核心标签与模块分组、标签筛选、模块折叠、**截止日倒推分组 + 提前 1/3/7 天切换与持久化**、单卡日期切换不联动其他任务 + 同步按钮统一全部 + 单独设置持久化与清除、悬浮按钮新建、完成后衍生并写入「来源」、卡片「+ 衍生」与取消关联、来源/子任务徽章、改期、今天/全部视图、删除撤销不写库。

---

## 八、脱敏说明

本发布包已剔除以下内容，请勿从原始工作目录直接打包外发：

- `node_modules/` 与 Electron 二进制 zip（约 680MB）
- 所有截图（含真实任务内容与登录页）、运行日志、诊断日志
- 历史版本备份、含绝对路径的本地调试脚本
- `.workbuddy/` 工作区记忆（含内部系统信息）
- 所有凭据、令牌、个人目录路径
- 真实数据表 ID、页面节点 ID（已占位化）

---

## 九、后续可选项

- 子任务勾选清单（在描述里直接勾步骤）
- 重复任务（每周/每月自动生成）
- 每日定时把今日清单推送到企业微信
- 已完成归档 + CSV / 周报导出
- 衍生关系的树状/时间线视图
