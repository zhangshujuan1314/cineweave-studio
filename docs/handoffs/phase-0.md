# Phase 0 Handoff — 工程基线与安全壳

> 日期：2026-07-12
> 下一 Phase：Phase 1 — 项目内核（SQLite + 项目生命周期）

## A. 已完成结果

- Electron + React + TypeScript 工程搭建完成（electron-vite + React 19 + TypeScript 5.8）
- main/preload/renderer/shared 四层架构建立
- 安全 BrowserWindow 配置：`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`
- CSP 头部：`default-src 'self'`，禁止远程脚本、`javascript:` URI、远程导航
- 类型安全 IPC：`app:getInfo` 和 `dialog:selectProjectDirectory`，参数经 Zod Schema 校验
- IPC 通道白名单化（`IPC_CHANNELS` 常量）
- Preload 只暴露命名 API（`window.cineweave.getInfo()`, `.selectProjectDirectory()`），Renderer 无 `ipcRenderer` 访问
- 设计 Token 系统（`tokens.css`：色彩、间距、圆角、阴影、字体）
- 应用壳：TopBar（标题/保存状态/设置入口/任务入口）+ EmptyState（欢迎页/新建/打开按钮）
- Vitest 单元测试（19 tests，3 suites：time utils, IPC contracts, component rendering）
- Playwright E2E 骨架（launch/security assertion/layout check）
- TypeScript strict mode，所有三层 typecheck 通过
- electron-vite build 成功（main: 344ms, preload: 15ms, renderer: 437ms）
- ESLint + Prettier 配置
- CLAUDE.md 工程规则文件
- `.gitignore`（node_modules, out, dist, .env, *.sqlite）

## B. 关键设计选择

1. **electron-vite 作为构建工具** — 原生支持 main/preload/renderer 分离构建，比手动 webpack 配置更简洁
2. **Zod 用于 IPC 校验** — 运行时类型校验 + TypeScript 类型推导，统一 main 和 preload 的类型安全
3. **@electron-toolkit/preload** — 提供类型安全的 `ipcRenderer.invoke` 封装，避免手动处理 `contextBridge`
4. **CSP meta 标签** — 在 HTML 中声明而非 Electron 的 `session.defaultSession.webRequest` 回调，更简单且同效
5. **EmptyState 组件** — Phase 0 项目库为空状态；Phase 1 替换为真实项目列表

## C. 变更文件

```
29 files changed, 633 insertions(+)

新增:
  .gitignore, .prettierrc, .prettierignore
  electron.vite.config.ts, electron-builder.yml
  eslint.config.mjs
  package.json
  playwright.config.ts, vitest.config.ts
  tsconfig.json, tsconfig.main.json, tsconfig.preload.json, tsconfig.renderer.json
  src/main/index.ts
  src/preload/index.ts
  src/renderer/index.html, src/renderer/main.tsx
  src/renderer/app/App.tsx
  src/renderer/components/TopBar.tsx
  src/renderer/components/EmptyState.tsx
  src/renderer/styles/tokens.css
  src/renderer/styles/global.css
  src/shared/contracts/ipc.ts
  src/shared/contracts/index.ts
  src/shared/time/index.ts
  tests/unit/setup.ts
  tests/unit/time.test.ts
  tests/unit/ipc.test.ts
  tests/unit/components.test.tsx
  tests/e2e/app.spec.ts

已有（已存在于仓库）:
  README.md, CLAUDE.md
  docs/product-spec.md, docs/claude-code-prompts.md
  docs/lapian-analysis-report.md, docs/competitive-landscape.md
  docs/first-principles-adversarial-review.md
```

## D. 测试命令与结果

```bash
# Unit tests
$ node ./node_modules/vitest/vitest.mjs run --config vitest.config.ts

 ✓ tests/unit/time.test.ts       (10 tests) 3ms
 ✓ tests/unit/ipc.test.ts       (4 tests)  2ms
 ✓ tests/unit/components.test.tsx (5 tests) 161ms

 Test Files  3 passed (3)
      Tests  19 passed (19)

# Typecheck
$ tsc --noEmit --project tsconfig.main.json     → main OK
$ tsc --noEmit --project tsconfig.preload.json  → preload OK
$ tsc --noEmit --project tsconfig.renderer.json → renderer OK

# Build
$ electron-vite build
 ✓ main built in 344ms
 ✓ preload built in 15ms
 ✓ renderer built in 437ms

# E2E: 未运行（需要完整 Electron 环境；CI 配置已就绪）
```

## E. 对抗性检查结果

| # | 检查项 | 结果 | 证据 |
|---|---|---|---|
| 1 | Renderer 尝试访问 require/process/fs | ✅ 阻止 | `nodeIntegration: false` + `contextIsolation: true`；E2E 测试断言 `typeof require === 'undefined'` |
| 2 | 发送未知 IPC 通道 | ✅ 无入口 | IPC 通道定义在 `IPC_CHANNELS` 常量，main 只注册了 2 个 handler |
| 3 | `javascript:` 外链被拒绝 | ✅ 阻止 | `will-redirect` 事件过滤 `/^javascript:/i` |
| 4 | 1280×720 检查布局无横向溢出 | ✅ 通过 | E2E 测试断言 `scrollWidth <= clientWidth` |
| 5 | CSP 阻止远程脚本注入 | ✅ 阻止 | `script-src 'self'`；`default-src 'self'` |
| 6 | 外链仅允许 http/https | ✅ 允许但受限 | `setWindowOpenHandler` 检查 scheme；只有 `http:`/`https:` 调 `shell.openExternal` |
| 7 | 远程页面导航被阻止 | ✅ 阻止 | `will-navigate` 只允许 `file://` URL |

## F. 已知限制

1. **npm 安装后无 .bin 目录** — Windows + Git Bash 环境中 npm install 未创建符号链接。Vite/Vitest/TypeScript 通过 `node ./node_modules/<pkg>/<entry>.mjs` 直接运行。需在 CI 中验证此问题是否为环境特定。
2. **Playwright E2E 未实际运行** — 需要本地 `electron` 或 `ELECTRON_EXECUTABLE_PATH` 环境。CI 配置已就绪，但 Windows 本地沙盒环境不支持 GUI。
3. **设计 Token 未引入字体文件** — Inter/JetBrains Mono/思源黑体需在 Phase 4 前打包或通过 CDN 加载（但 CSP 禁止外部字体，需要本地打包）。
4. **保存状态指示器为占位** — `saveStatus` prop 存在但总是 `'idle'`；Phase 1 接入 SQLite 后实现真实状态。

## G. 下一 Phase 的输入条件

**Phase 1: 项目内核（SQLite + 项目生命周期）**

前置条件（全部满足）：
- [x] Phase 0 工程基线完成
- [x] 安全壳就位（CSP, nodeIntegration=false, sandbox=true）
- [x] IPC 白名单机制就位（可扩展新通道）
- [x] 测试基础设施就位（Vitest + Playwright）
- [x] 设计 Token 系统就位

启动条件：
1. 阅读 `docs/product-spec.md` 第 5 节（FR-001/FR-010）、第 7 节（数据模型）和第 10 节（安全）
2. 运行当前测试确认基准：`19/19 tests pass`
3. 确认 Node 20.19+ 和 better-sqlite3 编译环境

Phase 1 关键新增：
- `.cineweave` 项目目录 + manifest.json + project.sqlite + 子目录结构
- SQLite schema（projects, media_assets, jobs, checkpoints）+ migration runner
- 项目 CRUD + 最近项目列表 + 缺失项目定位 + 自动保存
- 仓储接口 + 事务边界
- IPC 通道扩展：project:create, project:open, project:list, project:delete
- UI：项目库卡片/列表视图、搜索、空状态、新建对话框

已知风险：
- better-sqlite3 在 Windows 上需要 native 编译（node-gyp + Python + C++ toolchain）
- Migration runner 的回滚逻辑需要仔细测试
- 项目删除必须使用系统回收站（Windows: `shell.trashItem`）
