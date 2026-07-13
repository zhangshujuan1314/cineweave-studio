# CineWeave Studio / 影织

> 把任意影视素材转化为可验证、可编辑、可检索、可复用的镜头级创作知识。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/electron-33.x-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/react-19.x-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org/)

**CineWeave Studio** 是一款本地优先的影视拆解与创作学习桌面工作台。

## 开发状态

### ✅ 已完成

| Phase | 范围 | 关键交付 |
|---|---|---|
| **Phase 0** | 工程基线与安全壳 | Electron + React + TS 工程，安全 BrowserWindow (12/12 安全审计通过)，IPC 白名单 + Zod 校验，设计 Token，Vitest + Playwright |
| **Phase 1** | 项目、SQLite 与恢复 | better-sqlite3 5表schema，版本化 migration runner (备份/回滚)，项目 CRUD (原子创建/回收站删除)，项目库 UI (网格/列表/搜索/新建对话框) |
| **Phase 2** | 媒体探测、代理与任务队列 | FFmpeg/ffprobe 检测+探测+转码 (参数数组)，SHA-256 指纹 (size+mtime+chunks)，持久化任务队列 (并发限制/取消/重试/中断恢复)，媒体仓库 |
| **Phase 2.5** | Bug 修复与基础设施加固 | 修复 media_assets schema 列名不匹配，实现项目列表持久化，注册所有缺失的 IPC handlers，App 状态管理重构 |
| **Phase 3** | 镜头、字幕、标记与时间线 | **Schema V3** (shots/subtitles/markers/waveform_peaks 4表+12索引)，**字幕解析器** (SRT/VTT/ASS 三格式自动检测)，**镜头 CRUD** (创建/删除/拆分/合并)，**字幕管理** (批量导入/编辑/偏移/时间重叠查询)，**标记系统** (note/emotion/beat/custom 四类型)，**时间线 UI** (多轨渲染/缩放/滚动/播放头)，**视频播放器** (双向同步/字幕叠加)，**键盘快捷键** (J/K/L/Space/箭头/I/O/S/M) |

### 🔲 待完成

| Phase | 范围 | 关键交付 |
|---|---|---|
| **Phase 4** | 分析领域、编辑器与四种视图 | 层级数据模型 (幕→段落→镜头)，检查器字段，故事线创建+多对多关联，四视图 (镜头网格/剧情泳道/结构树/情绪曲线)，Command 模式撤销/重做，命令面板 Cmd+K |
| **Phase 5** | AI 手动分析包与安全导入 | 分析包生成，JSON 提取+Schema 校验+语义校验，导入差异预览，填空/追加/覆盖合并 |
| **Phase 6** | BYOK AI 与证据面板 | Provider 接口，OpenAI/Anthropic 适配器，API Key OS 保护存储，流式状态+取消+退避重试 |
| **Phase 7** | 版本、导出、备份与交换格式 | 检查点，自动备份，项目包导出/导入，Markdown/PDF/CSV/SRT/VTT 导出 |
| **Phase 8** | 发布硬化与最终验收 | 安全审计，E2E 稳定性，性能基准，跨平台打包，文档完善 |

## 验证状态

**56/56 单元测试通过 · main/preload/renderer 三层 typecheck 通过 · 7 测试套件**

## 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Electron 33 + electron-vite |
| UI | React 19 + TypeScript 5.8 + CSS Custom Properties |
| 数据库 | better-sqlite3 + 版本化 migration runner (V1→V2→V3) |
| 媒体 | FFmpeg/ffprobe (参数数组，零 shell 拼接) |
| 字幕 | SRT/VTT/ASS 解析器 (自动格式检测) |
| 任务 | 持久化 SQLite 任务队列 (最大2并发) |
| 校验 | Zod IPC schemas (27 通道) + 路径穿越防护 |
| 测试 | Vitest + React Testing Library + Playwright |

## 架构

```
src/
├── main/              # Electron 主进程
│   ├── db/            # SQLite schema (V3) + migration runner
│   ├── projects/      # 项目/镜头/字幕/标记仓储
│   ├── media/         # FFmpeg 服务, 媒体仓库, 指纹计算
│   ├── jobs/          # 持久化任务队列
│   └── ipc/           # IPC handlers (project/media/task/timeline)
├── preload/           # 最小化类型安全桥接 (30+ API 方法)
├── renderer/          # React UI
│   ├── app/           # App shell (状态管理)
│   ├── features/      # 项目库, 时间线, 播放器
│   ├── components/    # TopBar, EmptyState
│   ├── hooks/         # useKeyboardShortcuts
│   └── styles/        # 设计 Token + 暗色主题
├── shared/            # Schema, IPC 合约, 时间工具, 媒体类型
│   ├── contracts/     # 27 通道 Zod schemas
│   ├── media/         # 字幕解析器, 共享媒体类型
│   └── time/          # 毫秒/时间码工具
└── tests/             # 7 测试套件, 56 测试用例
```

## 快捷键

| 按键 | 功能 |
|---|---|
| `Space` / `K` | 播放/暂停 |
| `J` / `←` | 后退 500ms |
| `L` / `→` | 前进 500ms |
| `Shift+←` / `Shift+→` | 后退/前进 5s |
| `Home` / `End` | 跳到开头/结尾 |
| `I` | 标记入点 |
| `O` | 标记出点 |
| `S` | 拆分镜头 |
| `M` | 添加标记 |

## 快速开始

```bash
git clone https://github.com/zhangshujuan1314/cineweave-studio.git
cd cineweave-studio
npm ci
npm run dev        # 启动开发
npm run test       # 56 tests
npm run typecheck  # 三层类型检查
```

## 许可证

MIT License
