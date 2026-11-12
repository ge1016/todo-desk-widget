# 我的待办台 · Todo Desk Widget

一个「记录 + 决策」二合一的个人待办工作台：云端数据表存数据，资料库页面做看板，Windows 桌面浮窗做常驻入口。数据在浏览器、手机、桌面浮窗之间实时同步。

> 本仓库是**脱敏后的可复用模板**。所有资源 ID 已替换为占位符，配置方法见「快速开始」。

---

## 一、项目概述

| 项目 | 内容 |
|---|---|
| 目标 | 把散落的待办收敛成一处：随手记、看得清今天该做什么、完成情况可追溯 |
| 数据层 | WorkBuddy 资料库数据表「待办与完成记录」，9 个字段 |
| 页面层 | Smart Page 单文件 HTML，通过 `window.__SMART_PAGE__.database` SDK 读写 |
| 桌面层 | Electron 无边框置顶浮窗 + Windows 计划任务（登录自启） |
| 同步方式 | 单一数据源，所有端读写同一张表，无本地副本、无需手动同步 |
| 部署形态 | 纯前端 + 平台 SDK，无自建后端、无第三方 CDN、无密钥 |

设计取舍：

- **看板而非列表**：待办的价值在状态流动，不在字段罗列；「已完成」列天然沉淀完成情况。
- **独立「搁置」状态**：不做了但不删，保留痕迹；完成率分母排除搁置项，避免被长期挂起的事项拉低。
- **分类用自由文本**：项目线会持续变化，固定选项反而成为负担。
- **计划日期 ≠ 截止日期**：前者是「我打算哪天做」，后者是「最晚哪天交」，两者分开才能做今日聚焦。

---

## 二、功能演进

| 版本 | 能力 |
|---|---|
| v1 | 四列看板（待办/进行中/已完成/搁置）、KPI、快速添加、搜索、分类筛选、隐藏已完成；全量分页读取；桌面浮窗 + 开机自启 |
| v2 | 富文本任务描述：添加时可写、卡片可展开、随时可编辑；白名单清洗防 XSS；描述正文纳入搜索 |
| v3 | 今日聚焦（计划日期、四项 KPI、今天/全部视图、改期弹窗、紧急度排序）；删除改为 8 秒延迟提交可撤销；窄窗紧凑化；快捷键 |

### 当前功能清单

**记录**
- 一行快速添加：任务名 + 优先级 + 分类 + 计划日期 + 截止日期，回车入库
- 富文本描述：加粗/斜体/下划线/删除线、项目符号与编号列表、清格式，`Ctrl+Enter` 提交
- 草稿自动保存（localStorage），刷新不丢
- 卡片操作：开始 / 完成 / 搁置 / 重新打开 / 写描述 / 改期 / 删除

**决策**
- 四项 KPI：今天要做 / 已逾期 / 今日完成 / 完成率
- 「今天 N」视图：只显示逾期、今天到期、今天或更早计划、以及尚未排期的任务；排到未来的自动收起
- 排序按紧急度：逾期 → 今天到期 → 今天计划 → 待安排 → 未来，同档内再看优先级与日期
- 改期弹窗：今天 / 明天 / 3 天后 / 下周一，或任意日期

**桌面**
- 无边框置顶小窗，可拖拽，位置/尺寸/置顶状态持久化
- 图钉（切换置顶）、最小化、关闭；未登录时自动放大便于扫码，登录后收回小窗
- 开机登录自动浮现，由 Windows 计划任务托管
- 窗口标题锁定，不被网页标题覆盖

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
│ · db.query 全量分页 → 本地渲染看板             │
│ · db.addRecord / updateRecord / deleteRecord   │
│ · 富文本白名单清洗、延迟提交删除                │
└──────────────────┬──────────────────────────┘
                   │ window.__SMART_PAGE__.database
┌──────────────────▼──────────────────────────┐
│ 数据层  资料库数据表「待办与完成记录」          │
│ 9 字段，唯一数据源，多端共享                    │
└─────────────────────────────────────────────┘
```

数据流要点：`getSchema` 拉取 select 选项的 id↔text 映射 → `query` 分页拉全量 → 本地分组、过滤、排序、渲染 → 写操作成功后重新 `refresh()` 保证与服务端一致。

---

## 四、数据表结构

| 字段 | 类型 | 用途 |
|---|---|---|
| 任务 | text | 任务标题 |
| 状态 | select | 待办 / 进行中 / 已完成 / 搁置 |
| 优先级 | select | 高 / 中 / 低 |
| 分类 | text | 自由文本，如「企微」「AI」 |
| 计划日期 | date | 打算哪天做，驱动今日聚焦 |
| 截止日期 | date | 最晚哪天交，驱动逾期判定 |
| 完成日期 | date | 标记完成时自动写入 |
| 备注 | text | 早期版本字段，保留兼容 |
| 详情 | text | 富文本描述（清洗后的 HTML） |

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

首次启动需在浮窗内登录一次，登录后窗口自动收回小窗模式。

---

## 六、关键实现与已知环境坑

**页面**
- `rtSanitize()` 白名单清洗富文本：仅保留 `B/STRONG/I/EM/U/S/STRIKE/BR/P/DIV/UL/OL/LI/SPAN` 与安全 `A`（仅 http(s)、带 `rel=noopener noreferrer`），`script/iframe/img/svg` 等直接剔除。
- **延迟提交删除**：点删除只移除本地数组并显示「撤销」提示，8 秒内 `db.deleteRecord` 从未调用；撤销即恢复，超时或下一次 `refresh()` 才真正提交。零误删风险。
- 全量分页读取带 `guard > 100` 保护，避免 cursor 异常导致死循环。
- 今日视图判定放在 `isFocus()`：未排期任务也纳入今天，避免老数据升级后视图空白。

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
- 窄窗（≤720px）下 KPI 改四宫格、看板改单列并调整列顺序为 进行中 → 待办 → 已完成 → 搁置。

---

## 七、质量保障

| 检查项 | 结果 |
|---|---|
| 脚本语法 `node --check` | 通过 |
| lint_schema | 通过 |
| lint_database_sdk_usage | 通过 |
| lint_page_quality（`--has-database`） | 通过，无告警 |
| DOM id 与 `getElementById` 引用比对 | 36 / 36 对齐 |
| 浮窗实机渲染（登录页 → 看板） | 通过 |

另附**离线交互回归测试**（`tests/`）：用 mock 数据服务加载真实页面脚本，不触碰线上数据，断言删除撤销、视图切换与改期流程。

```bash
cd tests && python3 make_test_page.py
unset NODE_OPTIONS BASH_ENV ELECTRON_RUN_AS_NODE
<electron.exe> test_main.js      # 输出 TEST_RESULT
```

已验证断言：初始 2 条 → 删除后 1 条且撤销条出现、`deleteRecord` 未调用 → 撤销后恢复 2 条且仍未调用 → 今天视图 1 条 → 全部视图 2 条 → 改期弹窗打开且计划日期写入成功。

---

## 八、脱敏说明

本发布包已剔除以下内容，请勿从原始工作目录直接打包外发：

- `node_modules/` 与 Electron 二进制 zip（约 680MB）
- 所有截图（含真实任务内容与登录页）、运行日志
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
- 手机端独立精简视图
