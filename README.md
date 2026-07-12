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

### 🔲 待完成

| Phase | 范围 | 关键交付 |
|---|---|---|
| **Phase 3** | 镜头、字幕、波形与时间线 | FFmpeg 场景变化检测 (可调阈值/最短镜头时长)，镜头封面帧+补采样，波形峰值缓存，内嵌字幕提取+SRT/VTT/ASS导入+编辑+偏移，虚拟化多轨时间线 (镜头/字幕/标记/情绪轨)，播放器双向同步，J/K/L/Space 快捷键，手工拆分/合并/移动镜头边界+吸附+撤销 |
| **Phase 4** | 分析领域、编辑器与四种视图 | 层级数据模型 (幕→段落→镜头)，检查器字段 (段落功能/节拍/冲突/节奏/视听手法等)，故事线创建+多对多关联，四视图 (镜头网格/剧情泳道/结构树/情绪曲线)，统一 selection/playhead/filter，Command 模式撤销/重做，项目内搜索 (标题/字幕/笔记/标签)，命令面板 Cmd+K |
| **Phase 5** | AI 手动分析包与安全导入 | cineweave.analysis/1.0 Zod Schema→JSON Schema，分析包生成 (manifest+prompt+证据帧+字幕切片)，分卷支持 (大项目)，JSON 提取+语法修复+Schema 校验+语义校验+ID/时间映射，导入差异预览 (新增/修改/冲突/无效/低置信度)，填空/追加/覆盖合并+默认保护锁定字段，合并前自动检查点+事务写入+一次撤销 |
| **Phase 6** | BYOK AI 与证据面板 | Provider 接口 (capabilities/validateConfig/estimateRequest/runAnalysis/cancel)，OpenAI-compatible + Anthropic-compatible 适配器，API Key OS 保护存储 (数据库只存配置引用)，请求前发送清单 (模型/文字量/图片数/估算)，流式状态+取消+超时+退避重试+速率限制分类，AI 证据面板 (帧图/字幕/置信度/模型运行记录) |
| **Phase 7** | 版本、导出、备份与交换格式 | 检查点 (列表/命名/差异预览/恢复)，自动备份保留策略，项目包导出/导入 (防 Zip Slip/符号链接/超大解压)，Markdown/PDF (中文嵌入)/CSV/SRT/VTT/联系表导出，导出中心 (模板/章节/字段/图片密度/主题)，实验性 FCPXML/EDL 导出 |
| **Phase 8** | 发布硬化与最终验收 | 依赖/许可证/CSP/Electron 安全/密钥泄漏审计，E2E 连续20次无随机失败，性能基准 (2h/1000镜头/10000字幕)，Windows x64 + macOS arm64/x64 打包，README+安装+隐私+AI数据发送+故障排查+升级说明，P0/P1 阻断发布缺陷清零，发布建议 Go/No-Go |

## 验证状态

**36/36 单元测试通过 · main/preload/renderer 三层 typecheck 通过 · electron-vite build 通过**

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
