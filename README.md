# CineWeave Studio / 影织

> 把任意影视素材转化为可验证、可编辑、可检索、可复用的镜头级创作知识。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/electron-33.x-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/react-19.x-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**CineWeave Studio** 是一款本地优先的影视拆解与创作学习桌面工作台。

## 开发状态

| Phase | 范围 | 状态 | 测试 |
|---|---|---|---|
| **Phase 0** | 工程基线与安全壳 | ✅ | 19/19 |
| **Phase 1** | 项目、SQLite 与恢复 | ✅ | 12/12 |
| **Phase 2** | 媒体探测、代理与任务队列 | ✅ | 5/5 |
| Phase 3 | 镜头、字幕、波形与时间线 | 🔲 | — |
| Phase 4 | 分析领域、编辑器与四种视图 | 🔲 | — |
| Phase 5 | AI 手动分析包与安全导入 | 🔲 | — |
| Phase 6 | BYOK AI 与证据面板 | 🔲 | — |
| Phase 7 | 版本、导出、备份与交换格式 | 🔲 | — |
| Phase 8 | 发布硬化与最终验收 | 🔲 | — |

**36/36 测试通过 · 三层 TypeScript typecheck 通过 · 安全壳 12/12**

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Electron 33 + electron-vite |
| UI | React 19 + TypeScript 5.8 + CSS Custom Properties |
| 数据库 | better-sqlite3 + 版本化 migration runner (备份/回滚) |
| 媒体 | FFmpeg/ffprobe (spawn/execFile，参数数组，零 shell 拼接) |
| 任务 | 持久化 SQLite 任务队列 (最大2并发，取消/重试/中断恢复) |
| 校验 | Zod IPC schemas (12 通道) + 路径穿越防护 |
| 测试 | Vitest + React Testing Library + Playwright |
| 打包 | electron-builder (Windows/macOS/Linux) |

## 架构

```
src/
├── main/              # Electron 主进程
│   ├── db/            # SQLite schema + migration runner
│   ├── projects/      # 项目仓储 (CRUD, 原子创建, 回收站删除)
│   ├── media/         # FFmpeg 服务, 媒体仓库, 指纹计算
│   ├── jobs/          # 持久化任务队列
│   └── ipc/           # 类型安全 IPC handlers
├── preload/           # 最小化类型安全桥接 (13 API 方法)
├── renderer/          # React UI (关闭 Node integration)
│   ├── app/           # App shell
│   ├── features/      # 项目库 (网格/列表/搜索/新建)
│   ├── components/    # TopBar, EmptyState
│   └── styles/        # 设计 Token + 暗色主题
├── shared/            # Schema, IPC 合约, 时间工具
│   ├── contracts/     # 12 通道 Zod schemas + 类型
│   └── time/          # 毫秒/时间码工具
└── tests/             # 5 测试套件, 36 测试用例
```

## 安全

- `nodeIntegration: false` · `contextIsolation: true` · `sandbox: true`
- CSP `default-src 'self'` — 阻止远程脚本、`javascript:` URI、远程导航
- IPC 通道白名单 + Zod schema 校验
- 路径穿越防护 (拒绝 `..` 和 null bytes)
- FFmpeg 参数数组传递，零 shell 拼接
- 原始媒体只读，用户错误信息脱敏路径

## 快速开始

```bash
git clone https://github.com/zhangshujuan1314/cineweave-studio.git
cd cineweave-studio
npm ci
npm run dev        # 启动开发
npm run test       # 36 tests
npm run typecheck  # 三层类型检查
```

## 文档

| 文档 | 说明 |
|---|---|
| [产品规格说明书](docs/product-spec.md) | 完整 V1 产品与技术规格 |
| [竞品格局分析](docs/competitive-landscape.md) | 42 竞品，5 赛道对比矩阵 |
| [第一性原理与对抗性审查](docs/first-principles-adversarial-review.md) | JTBD 分解 + FATAL/HIGH/MEDIUM/LOW |
| [Claude Code 实施提示词](docs/claude-code-prompts.md) | Phase 0-8 提示词手册 |
| [Lapian Notes 分析](docs/lapian-analysis-report.md) | 参考项目深度分析 |
| [Phase 0 Handoff](docs/handoffs/phase-0.md) | 工程基线交接 |

## 许可证

MIT License
