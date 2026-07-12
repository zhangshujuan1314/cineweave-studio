# CineWeave Studio — Claude Code 实施提示词手册

> 配套文档：`lapian_product_spec.md`
> 使用方式：先执行“启动提示词”，再按 Phase 0–8 顺序执行。每个 Phase 完成、测试通过、审计清楚后再进入下一阶段。

## 0. 使用纪律

1. 把 `lapian_product_spec.md` 放到仓库 `docs/product-spec.md`。
2. 把本文件放到仓库 `docs/claude-code-prompts.md`。
3. 一次只给 Claude Code 一个 Phase。不要把全部 Phase 同时塞入上下文。
4. 每次开始前要求它读取当前代码、`CLAUDE.md`、产品规格和上一阶段交接记录。
5. 每次结束必须运行真实测试、检查 git diff，并把证据写入 `docs/handoffs/phase-N.md`。
6. 发现规格与代码冲突时，先停止扩展范围，记录冲突并给出一个推荐方案。
7. 缺陷修复先创建最小复现测试。
8. 不允许用关闭类型检查、跳过测试、扩大 ignore、删除断言等方式让 CI 变绿。

---

## 1. 首次启动提示词

将下面整段复制给 Claude Code：

```text
你是 CineWeave Studio 的首席工程师。请在当前仓库中构建一款本地优先的影视拆解桌面应用。

先执行只读审查：
1. 阅读 docs/product-spec.md 全文。
2. 阅读仓库内 CLAUDE.md、README、package.json、锁文件、配置、已有源代码和测试。
3. 输出当前实现与规格的差距表，按 P0/P1/P2 排序。
4. 识别未提交改动，保留所有与本任务无关的用户修改。
5. 检查 Node、包管理器、FFmpeg、平台和可用测试环境，不要静默安装全局依赖。

随后建立执行计划。当前只实施我指定的 Phase，不要提前实现后续功能。

全程遵守：
- 做满足当前 Phase 的最小完整实现。
- Renderer 无 Node 权限；IPC 白名单化、类型化并校验输入。
- 所有媒体命令使用参数数组，不拼接 shell 字符串。
- 项目数据变更经过事务；失败不留下半写入状态。
- 用户内容、绝对路径、字幕正文、API Key 不进入普通日志。
- 对长任务提供进度、取消、重试和可诊断错误。
- 新增逻辑同时补充单元/集成测试；关键流程补 E2E。
- 每次报告前运行与改动相称的测试，并核对 git diff。
- 未运行或失败的测试必须明确列出。

每个 Phase 的结束输出固定为：
A. 已完成结果
B. 关键设计选择
C. 变更文件
D. 测试命令与结果
E. 对抗性检查结果
F. 已知限制
G. 下一 Phase 的输入条件

现在只做审查与计划，等我提供 Phase 提示词后再修改代码。
```

---

## 2. 建议的 `CLAUDE.md`

让 Claude Code 在 Phase 0 创建或合并以下内容。已有 `CLAUDE.md` 时先保留有效规则，解决冲突后再编辑。

```markdown
# CineWeave Studio Engineering Rules

## Product

Offline-first desktop application for evidence-linked film analysis. Media remains local by default. AI suggestions are previewed and explicitly merged by the user.

## Commands

- Install: `npm ci`
- Dev: `npm run dev`
- Typecheck: `npm run typecheck`
- Lint: `npm run lint`
- Unit: `npm run test`
- E2E: `npm run test:e2e`
- Build: `npm run build`
- Package smoke: `npm run package:smoke`

Update this section only when commands truly change.

## Architecture boundaries

- `src/main`: privileged Electron code, filesystem, database, jobs, media, AI providers.
- `src/preload`: minimal typed bridge.
- `src/renderer`: unprivileged React UI.
- `src/shared`: schemas, IPC contracts, pure time/domain logic.
- Renderer must never import Node built-ins or main-process modules.
- Main process must validate all IPC input with shared schemas.
- Long-running work belongs in workers/jobs and returns a job ID.

## Data safety

- Store timestamps as integer milliseconds.
- Store asset paths relative to the project directory where possible.
- Wrap multi-entity writes in transactions.
- Create a backup before schema migrations.
- Never overwrite locked human fields during AI merges.
- Cache files are disposable; notes, attachments and database are durable.

## Security

- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- No arbitrary IPC channel invocation.
- No shell command construction; use executable plus argument array.
- Prevent path traversal and Zip Slip.
- API keys use OS-protected storage and never appear in logs or exports.
- External URLs open in the system browser after scheme validation.

## Quality

- A bug fix starts with a failing reproduction test.
- Do not weaken tests, lint, types, security flags or validation to pass CI.
- Use generated legal test media; do not commit copyrighted film clips.
- Report exact commands and outcomes. Mark skipped checks.
- Keep components and modules focused. Split only when a current change needs it.

## UI

- Follow design tokens in `src/renderer/styles/tokens.css`.
- Core actions are keyboard reachable.
- Color is never the sole state indicator.
- Every async flow has idle, running, success, empty, canceled and error states.
```

---

## 3. Phase 0 — 工程基线与安全壳

```text
实施 Phase 0：工程基线与安全壳。先读 docs/product-spec.md 的第 8、9、10、12、13 节。

目标：
- 建立 Electron + React + TypeScript 桌面工程。
- 固定 Node 20.19+ 的 engines 与版本文件，固定一种包管理器。
- 建立 main/preload/renderer/shared 分层。
- 配置安全 BrowserWindow：nodeIntegration=false、contextIsolation=true、sandbox=true。
- 建立最小类型安全 IPC：app:getInfo、dialog:selectProjectDirectory。
- 建立 Vitest、React Testing Library、Playwright Electron E2E。
- 建立 ESLint、Prettier、typecheck、build、test、test:e2e 脚本。
- 建立设计 Token 和应用壳：项目库空状态、顶栏、设置入口、任务入口。
- 创建或合并 CLAUDE.md，内容遵循提示词手册。

范围限制：
- 暂不实现 SQLite、FFmpeg、项目创建和 AI。
- 暂不引入路由、状态库或 UI 库，除非当前壳确实需要。
- 不复制 Lapian Notes 源代码；只实现规格描述的行为。

实现要求：
1. preload 只暴露命名 API，renderer 看不到 ipcRenderer。
2. IPC 参数通过共享 schema 校验。
3. 阻止窗口导航到远程页面；外链只允许 http/https 并交给系统浏览器。
4. 给安全配置写自动测试。
5. E2E 启动真实 Electron，断言项目库标题、空状态和设置按钮可见。
6. tokens.css 包含规格中的色彩、间距、圆角、字体和阴影变量。

对抗性检查：
- Renderer 尝试访问 require/process/fs 应失败。
- 发送未知 IPC 通道无可用入口。
- `javascript:` 外链被拒绝。
- 在 1280×720 检查布局无横向溢出。

完成后运行 typecheck、lint、unit、E2E、build。写 docs/handoffs/phase-0.md。不要进入 Phase 1。
```

---

## 4. Phase 1 — 项目、SQLite 与恢复

```text
实施 Phase 1：项目内核。先读 docs/product-spec.md 的第 5 节 FR-001/FR-010、第 7 节和第 10 节。

目标：
- 创建 `.cineweave` 项目目录、manifest.json、project.sqlite、cache/attachments/exports/backups。
- SQLite schema 至少包含 projects、media_assets、jobs、checkpoints。
- 引入版本化 migration runner。
- 实现项目创建、打开、重命名、复制、归档、删除到系统回收站。
- 实现最近项目列表、缺失项目定位、自动保存状态和重开恢复。
- 建立仓储接口和事务边界。

要求：
1. manifest 与数据库都包含 projectId 和 schemaVersion，打开时交叉核对。
2. 数据库只存相对资产路径；外部原片记录规范化路径与 fingerprint 状态。
3. migration 前创建备份，失败后恢复原版本。
4. 新建项目使用临时目录完成后原子重命名，避免半成品。
5. 项目删除列出影响范围并要求确认；测试不得真的删除用户目录。
6. 所有 IPC 入参验证路径、名称和 projectId。

测试：
- 中文、空格、emoji、保留字符名称。
- 无权限目录、已存在目录、磁盘写入中断模拟。
- migration 成功、失败回滚、重复执行幂等。
- 应用异常关闭后重开最近项目。
- renderer 传入 `../../` 路径被拒绝。

UI：完成美观的项目库卡片/列表切换、搜索、最近编辑时间、空状态、新建对话框、缺失媒体提示。使用真实仓储数据。

运行全部既有检查，新增项目生命周期 E2E。写 docs/handoffs/phase-1.md。不要实现媒体处理。
```

---

## 5. Phase 2 — 媒体探测、代理与任务队列

```text
实施 Phase 2：媒体内核与持久化任务。阅读 FR-002、非功能指标、安全要求和对抗性场景。

目标：
- 检测或配置 FFmpeg/ffprobe 可执行文件。
- 导入媒体引用，计算稳健 fingerprint：大小、mtime、首尾分块哈希；生成资产 UUID。
- ffprobe 解析容器、流、时长、分辨率、帧率、旋转、色彩和字幕流。
- 对无法直接播放的媒体创建 H.264/AAC 代理。
- 实现持久化任务队列：queued/running/succeeded/failed/canceled/interrupted。
- 提供进度、取消、重试、日志导出和应用重启后的 interrupted 恢复。
- 建立播放器和媒体信息面板。

约束：
- 使用 spawn/execFile 与参数数组。
- 任务进程必须可终止；取消后清理本任务临时文件。
- 原片永远只读。
- 任务日志脱敏绝对路径；面向用户的错误保留可执行建议。
- 同名同大小文件仍能区分。

测试夹具：程序生成 10 秒 MP4、无音频、竖屏旋转、多流 MKV；若 CI 无 FFmpeg，媒体集成测试应以明确的环境条件跳过，纯逻辑测试仍运行。

对抗性测试：
- 文件名含引号、&、中文、emoji。
- 代理进行到一半取消。
- 杀死 worker 后重启应用。
- 原片被移动或移动硬盘断开。
- 同名同大小不同内容导入。
- ffprobe 输出缺字段或损坏 JSON。

UI：任务中心、行内进度、取消/重试、媒体离线状态、重新定位。确保任务状态在所有入口一致。

完成后运行全部检查和真实媒体冒烟，记录 FFmpeg 版本与平台。写 phase-2.md。不要实现镜头检测。
```

---

## 6. Phase 3 — 镜头、字幕、波形与虚拟时间线

```text
实施 Phase 3：时间对齐基础。阅读 FR-003、FR-004、FR-007、性能目标。

目标：
- 数据表：shots、frames、subtitles。
- FFmpeg 场景变化分数生成镜头边界候选，支持阈值和最短镜头时长。
- 为每个镜头生成封面帧；支持固定间隔补采样。
- 生成可缓存波形峰值。
- 提取内嵌文本字幕，导入 SRT/VTT/ASS，支持 UTF-8/UTF-16/GB18030。
- 字幕列表编辑、整体偏移和问题报告。
- 建立虚拟化多轨时间线：镜头、字幕、标记占位轨；播放器双向同步。
- 手工拆分、合并、移动镜头边界，支持吸附与撤销。

数据不变量：
- 时间使用整数毫秒。
- 每个 shot 满足 startMs < endMs。
- 同一镜头层相邻区间不重叠。
- 用户锁定边界在重新检测时保留。
- 重检测先生成 diff，确认后事务应用。

性能：
- 用生成数据创建 1000 镜头、10000 字幕。
- 采用虚拟化；密集刻度和波形优先 Canvas。
- 添加可重复的性能基准，记录机器与结果，不伪造 FPS。

对抗性测试：
- 闪光、快速运动和淡入淡出候选。
- 字幕倒序、重叠、空文本、负时间、超片长。
- 用户拖动边界跨过相邻边界。
- 播放时快速缩放与滚动。
- 缩略图缓存缺失后重建。

UI：底部时间线可调高度；播放器、镜头网格、字幕轨、检查器形成专业暗色工作区。实现 J/K/L、Space、[、] 快捷键。

运行全部测试，追加核心时间线 E2E。写 phase-3.md。不要实现 AI。
```

---

## 7. Phase 4 — 分析领域、编辑器与四种视图

```text
实施 Phase 4：纯人工分析闭环。阅读 FR-008、FR-009、数据模型和 UI 规格。

目标：
- 数据表：segments、story_lines、segment_story_lines、emotion_points、tags、entity_tags、evidence_links。
- 层级：幕/章节、段落/场景、镜头。
- 检查器字段覆盖规格列出的段落字段与镜头字段。
- 故事线创建、颜色、排序、多对多关联、主故事线。
- 四个主视图：镜头网格、剧情泳道、结构树、情绪曲线。
- 统一 selection/playhead/filter 状态。
- Command 模式的撤销/重做；批量标签和字段锁定。
- 当前项目搜索：标题、字幕、笔记、标签。

关键要求：
1. 四个视图共享同一领域数据，不复制派生状态到数据库。
2. 修改边界时检查父子区间关系并提示修复方案。
3. 情绪点 intensity 0–100、valence -100–100。
4. 所有实体点击可跳转播放器时间并打开检查器。
5. AI 完全关闭时，用户能从空项目完成拉片与导出前数据准备。

UI 质量：
- 贯彻 tokens；控制信息密度，使用渐进展开。
- 选中、锁定、错误、人工来源均有图标/文字辅助。
- 可折叠左右栏、专注模式、Cmd/Ctrl+K 命令面板。
- 1440×900 做主视觉验收，1280×720 做边界验收。

测试：
- 领域不变量、跨视图同步、撤销/重做、批量编辑。
- 1000 镜头下四视图切换。
- 键盘导航和基本可访问性。
- 删除父节点时的子节点策略。

完成后截取关键界面作为 E2E 视觉基线，避免依赖脆弱的整页像素匹配。写 phase-4.md。
```

---

## 8. Phase 5 — AI 手动分析包与安全导入

```text
实施 Phase 5：模型无关的手动 AI 往返。阅读第 6 节 AI 输出契约、FR-005、FR-006。

目标：
- 定义 `cineweave.analysis/1.0` Zod Schema，并生成 JSON Schema。
- 生成 AI 分析包：manifest、schema、prompt、证据帧、字幕切片、可选背景资料。
- 大项目按段分卷并有总 manifest。
- 实现 JSON 提取、语法修复边界、Schema 校验、语义校验、ID/时间映射。
- 导入差异预览：新增、修改、冲突、无效、低置信度。
- 合并模式：填空、追加、覆盖；默认保护锁定字段。
- 合并前自动检查点，事务写入，一次撤销。
- 原始 AI 输出作为审计附件保存，不直接渲染 HTML。

提示词要求：
- 明确只能引用包内 ID。
- 要求每项结论给 confidence 与 evidenceRefs。
- 证据不足时返回 unknown/空数组，不编造对白或镜头。
- 严格输出单个 JSON 对象。

隐私：
- 打包前展示帧数、字幕条数、背景资料、预计大小。
- 默认不含绝对路径、密钥、未选择的私人笔记和图片元数据。

对抗性夹具：
- Markdown 围栏、前后解释、半截 JSON、尾逗号。
- 重复 ID、未知 evidenceRef、负时间、超片长、start>=end。
- 影片 fingerprint 不匹配。
- HTML/script 字符串、路径穿越字符串、超深 JSON、超大字符串。
- 用户在预览期间修改同一字段，提交时检测版本冲突。

安全准则：任何无法确定修复意图的结果都进入错误报告，不做猜测式写入。

完成后让所有恶意夹具通过预期断言，执行导入失败不改库的事务测试。写 phase-5.md。
```

---

## 9. Phase 6 — BYOK AI 与证据面板

```text
实施 Phase 6：可选 BYOK。阅读 AI 通路、安全与隐私要求。

目标：
- Provider 接口：capabilities、validateConfig、estimateRequest、runAnalysis、cancel。
- 实现 OpenAI-compatible 与 Anthropic-compatible 适配器；不要把供应商逻辑散入 UI。
- API Key 使用 OS 保护存储；数据库只存 provider 配置引用。
- 请求前展示模型、文字量、图片数、可能发送的数据和估算信息。
- 流式状态、取消、超时、退避重试、速率限制错误分类。
- 响应走 Phase 5 同一校验与合并管线。
- AI 证据面板显示帧图、字幕、置信度、模型运行记录。

要求：
- Provider 测试使用本地 mock server，不在 CI 调真实付费 API。
- 日志和错误对象扫描 Key；测试故意注入假 Key 并断言不会泄漏。
- 网络离线、401、429、500、超时、流中断都有明确恢复动作。
- 用户可完全关闭联网能力，手动分析包仍完整可用。
- 模型返回内容不可影响系统提示、文件路径或本地命令。

对抗性测试：
- 返回提示注入文本、HTML、伪造 evidenceRef。
- 流到一半断开后重试，确保不会重复写入。
- 用户取消后迟到响应被丢弃。
- Key 出现在 provider 错误消息时仍被脱敏。

完成后运行 mock provider 的契约测试与 UI E2E。写 phase-6.md。
```

---

## 10. Phase 7 — 版本、导出、备份与交换格式

```text
实施 Phase 7：可交付产物与数据恢复。阅读 FR-010、FR-011 和 Definition of Done。

目标：
- 检查点列表、命名、差异预览、恢复。
- 自动备份保留策略，避免无界增长。
- 项目包导出/导入：数据库、manifest、用户附件、必要缓存清单。
- Markdown、PDF、CSV、SRT/VTT、联系表图片导出。
- 导出中心：模板、章节、字段、图片密度、主题、页眉页脚。
- 中文 PDF 字体嵌入和离线可读。
- V1 可先实现 FCPXML/EDL 的数据模型与实验性导出；若无法可靠验证，明确标记实验性。

安全：
- 项目包导入防 Zip Slip、绝对路径、符号链接、超大解压和十万小文件。
- 先解压到隔离临时目录，验证 manifest、大小预算、hash、schema 后再原子导入。
- 导出文件名跨平台净化，同时保留可读性。
- 磁盘不足或导出取消时清理临时文件，不删除既有成功导出。

测试：
- 项目包在新的临时用户目录导入并重开。
- 恶意 ZIP 套件全部被拒绝。
- 中文、emoji、缺图、超长标题 PDF。
- CSV 防公式注入：以 =、+、-、@ 开头的用户文本安全处理。
- schema 旧版本项目迁移。

完成后生成一套合法测试项目的全部导出物并自动检查文件存在、大小、关键内容。写 phase-7.md。
```

---

## 11. Phase 8 — 发布硬化与最终验收

```text
实施 Phase 8：发布硬化。逐条核对 docs/product-spec.md 的 V1 Definition of Done。

任务：
1. 运行依赖、许可证、CSP、Electron 安全配置和密钥泄漏审计。
2. 运行 typecheck、lint、unit、integration、E2E、build、package smoke。
3. 对核心 E2E 连续运行 20 次，记录随机失败。
4. 在 2 小时/1000 镜头/10000 字幕模拟项目上测量时间线与搜索性能。
5. 执行规格中的 12 类对抗性场景，保留证据。
6. 建立 Windows x64、macOS arm64/x64 打包配置；检查 FFmpeg 分发与第三方许可。
7. 完成 README、安装、隐私、AI 数据发送、故障排查、备份恢复、升级说明。
8. 检查所有空状态、失败状态、取消状态、离线状态和无 AI 人工流程。
9. 检查未使用依赖、调试开关、示例 Key、绝对开发路径和临时资产。
10. 生成 `docs/release-readiness-v1.md`。

缺陷分级：
- P0：数据丢失、安全绕过、项目无法打开、安装无法运行。必须阻断发布。
- P1：主闭环无法完成、常见媒体失败、AI 导入破坏数据。必须阻断发布。
- P2：有可接受绕行路径的局部问题。记录负责人和目标版本。

禁止行为：
- 为通过测试而删除断言或跳过失败平台。
- 用模拟结果替代未运行的真实打包测试。
- 把未知状态写成“已验证”。
- 在没有证据时宣称达到性能目标。

最终输出：发布建议（Go/No-Go）、阻断项、测试矩阵、性能数据、安装包状态、已知限制和回滚方案。若有 P0/P1，结论必须为 No-Go。
```

---

## 12. UI 专项提示词

当 Phase 4 的功能已可用，再单独执行：

```text
对 CineWeave Studio 做一次 UI/UX 专项改进，范围只覆盖现有功能，不新增领域能力。

先审查：
- 1440×900、1280×720 两种窗口。
- 项目库、首次导入、处理中、完整分析、空字幕、媒体离线、任务失败。
- 键盘操作、焦点顺序、对比度、缩放 125%/150%。

视觉目标：专业电影剪辑工作台，深石墨底、低干扰、证据帧优先、紫色作为主操作与 AI 标记。严格使用 tokens.css，移除散落的硬编码色值和不一致间距。

交互目标：
1. 顶栏只保留项目、保存状态、搜索、任务、导出、AI。
2. 左栏管理视图和层级；右栏只显示当前选择的检查器。
3. 时间线高度可调，双击复位。
4. 新用户有四步向导，完成后可折叠。
5. 高级字段渐进展开；核心字段无需滚动即可看到。
6. 所有 AI 结果同时显示来源、置信度和证据数。
7. 所有危险操作写清对象数量和影响范围。

执行前截取基线，执行后用相同状态与尺寸截图比较。避免大规模重写领域逻辑。运行视觉相关 E2E、可访问性检查、typecheck 和完整单测。输出改动前后问题清单与证据。
```

---

## 13. 单个缺陷修复提示词

```text
修复以下缺陷：<粘贴缺陷与复现步骤>。

流程：
1. 先复现并定位根因，区分症状与根因。
2. 添加能稳定失败的最小测试。
3. 实施最小修复，不重构无关模块。
4. 运行新增测试、受影响测试和必要的完整检查。
5. 做对抗性检查：相邻边界、异常输入、取消/重试、旧项目兼容、平台路径。
6. 检查 git diff，只报告有证据的结果。

不要降低校验、吞掉错误、扩大 catch、删除断言或跳过失败测试。输出根因、修复、测试证据、风险和未验证项。
```

---

## 14. 代码审查提示词

```text
对当前分支相对主分支做发布前代码审查。先读 docs/product-spec.md 和 CLAUDE.md。

按严重度输出问题，优先寻找：
- 数据丢失、事务不完整、迁移不可回滚。
- IPC 越权、路径穿越、shell 注入、Zip Slip、Key 泄漏。
- 任务取消竞态、迟到响应、重复写入、应用重启恢复。
- 时间区间越界、毫秒/秒混用、可变帧率假设。
- AI 输出未经 Schema/语义校验直接写入或渲染。
- Renderer 引入 Node 能力。
- 大项目线性 DOM、主线程阻塞、内存泄漏。
- 测试仅覆盖成功路径、断言过弱、平台差异遗漏。
- UI 缺少空/错/取消/离线状态。

每条问题给出：严重度、文件与位置、可复现路径、实际影响、最小修复建议。没有证据的问题不列。审查阶段不要修改代码。
```

---

## 15. 最终验收提示词

```text
对 CineWeave Studio V1 做最终验收。把 docs/product-spec.md 的每个 P0 功能和 Definition of Done 转为核对表。

对每项给出：
- PASS：有命令、测试、截图、构建物或代码位置作为证据。
- FAIL：实测失败，给复现步骤和严重度。
- UNVERIFIED：环境或输入缺失，写明需要什么。

必须真实执行：typecheck、lint、unit、integration、E2E、build、package smoke；若某命令不存在或失败，直接记录。抽查项目包跨目录导入、恶意 ZIP、AI 恶意 JSON、转码取消恢复、媒体丢失重定位、1000 镜头性能和无 AI 人工闭环。

最后只给一个发布结论：Go 或 No-Go。存在 P0/P1 FAIL 或关键 UNVERIFIED 时给 No-Go。不要修改代码，把所有结果写入 docs/release-acceptance-v1.md。
```

---

## 16. 推荐执行顺序

| 顺序 | 提示词 | 预期产物 |
|---|---|---|
| 1 | 首次启动 | 差距表与计划 |
| 2 | Phase 0 | 安全工程壳 |
| 3 | Phase 1 | 项目与数据库 |
| 4 | Phase 2 | 媒体与任务 |
| 5 | Phase 3 | 镜头、字幕、时间线 |
| 6 | Phase 4 | 人工分析工作台 |
| 7 | UI 专项 | 稳定的视觉系统 |
| 8 | Phase 5 | 手动 AI 往返 |
| 9 | Phase 6 | BYOK |
| 10 | Phase 7 | 导出与恢复 |
| 11 | 代码审查 | 问题清单 |
| 12 | Phase 8 | 发布硬化 |
| 13 | 最终验收 | Go/No-Go 报告 |

这个顺序确保媒体、数据和人工工作流先稳定，AI 层随后接入。即使暂停 AI 开发，产品仍有独立使用价值。
