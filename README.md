# CineWeave Studio / 影织

> 把任意影视素材转化为可验证、可编辑、可检索、可复用的镜头级创作知识。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/electron-33.x-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/react-19.x-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**CineWeave Studio** 是一款本地优先的影视拆解与创作学习桌面工作台。导入影片、自动检测镜头边界、管理字幕、在层级化时间线上进行结构化分析，并通过手动 AI 包或 BYOK 获得 AI 辅助——所有数据留存在本地。

## 开发状态

| Phase | 范围 | 状态 |
|---|---|---|
| **Phase 0** | 工程基线与安全壳 | ✅ 完成 |
| **Phase 1** | 项目、SQLite 与恢复 | 🚧 进行中 |
| Phase 2 | 媒体探测、代理与任务队列 | 🔲 |
| Phase 3 | 镜头、字幕、波形与时间线 | 🔲 |
| Phase 4 | 分析领域、编辑器与四种视图 | 🔲 |
| Phase 5 | AI 手动分析包与安全导入 | 🔲 |
| Phase 6 | BYOK AI 与证据面板 | 🔲 |
| Phase 7 | 版本、导出、备份与交换格式 | 🔲 |
| Phase 8 | 发布硬化与最终验收 | 🔲 |

## 验证状态

| 检查项 | 状态 |
|---|---|
| 单元测试 | 19/19 ✅ |
| TypeScript typecheck (3 layers) | ✅ |
| electron-vite build | ✅ |
| 安全壳 12 项检查 | 12/12 ✅ |
| E2E | 配置就绪 |

## 技术栈

- **桌面壳:** Electron 33 + electron-vite
- **UI:** React 19 + TypeScript 5.8 + CSS Custom Properties
- **数据:** better-sqlite3 + 版本化 migration runner
- **校验:** Zod + JSON Schema
- **测试:** Vitest + React Testing Library + Playwright
- **打包:** electron-builder (Windows/macOS/Linux)

## 架构

```
src/
├── main/           # Electron 主进程 — 数据库、文件、IPC handlers
│   ├── db/         # SQLite schema + migration runner
│   ├── projects/   # 项目仓储 (CRUD)
│   └── ipc/        # 类型安全 IPC handlers
├── preload/        # 最小化类型安全桥接
├── renderer/       # React UI (关闭 Node integration)
│   ├── app/        # App shell
│   ├── features/   # 功能模块 (project-library, ...)
│   ├── components/ # 共享组件 (TopBar, EmptyState)
│   └── styles/     # 设计 Token + 全局样式
├── shared/         # Schema、IPC 合约、纯函数
│   ├── contracts/  # Zod IPC schemas + TypeScript types
│   └── time/       # 时间码/毫秒工具
└── tests/          # Vitest (unit/integration) + Playwright (E2E)
```

## 安全

- `nodeIntegration: false` · `contextIsolation: true` · `sandbox: true`
- CSP: `default-src 'self'` — 禁止远程脚本、`javascript:` URI、远程导航
- IPC: 通道白名单 + Zod schema 参数校验
- 路径穿越防护: 拒绝 `..` 和 null bytes
- Preload: 只暴露命名 API，无 `ipcRenderer` 原始访问

## 快速开始

```bash
git clone https://github.com/zhangshujuan1314/cineweave-studio.git
cd cineweave-studio
npm ci
npm run dev
npm run test
```

## 文档

| 文档 | 说明 |
|---|---|
| [产品规格说明书](docs/product-spec.md) | 完整 V1 产品与技术规格 |
| [竞品格局分析](docs/competitive-landscape.md) | 42 竞品，5 赛道对比矩阵 |
| [第一性原理与对抗性审查](docs/first-principles-adversarial-review.md) | JTBD 分解 + FATAL/HIGH/MEDIUM/LOW |
| [Claude Code 实施提示词](docs/claude-code-prompts.md) | Phase 0-8 提示词手册 |
| [Lapian Notes 分析报告](docs/lapian-analysis-report.md) | 参考项目深度分析 |
| [Phase 0 Handoff](docs/handoffs/phase-0.md) | 工程基线交接 |

## 许可证

MIT License — **CineWeave Studio** 让每一次拉片都积累为可复用的创作资产。
