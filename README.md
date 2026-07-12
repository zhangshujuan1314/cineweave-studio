# CineWeave Studio / 影织

> 把任意影视素材转化为可验证、可编辑、可检索、可复用的镜头级创作知识。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/electron-33.x-47848F?logo=electron)](https://www.electronjs.org/)

**CineWeave Studio** 是一款本地优先的影视拆解与创作学习桌面工作台。它帮助你导入影片、自动检测镜头边界、管理字幕、在层级化时间线上进行结构化分析，并通过手动 AI 包或 BYOK（自带密钥）获得 AI 辅助分析——所有数据留存在本地。

## 🎯 目标用户

- 电影、动画、短片、广告和游戏过场的导演、编剧、剪辑师
- 影视专业学生、教师、影评与内容创作者
- 需要建立案例库的创意团队与培训机构

## ✨ 核心能力

| 能力 | 说明 |
|---|---|
| 📹 **媒体导入与探测** | 导入 MP4/MOV/MKV/AVI/WEBM；ffprobe 深度探测；不兼容编码自动生成代理 |
| ✂️ **智能镜头检测** | FFmpeg 场景变化检测 + 可调敏感度；支持手工合并/拆分/移动边界 |
| 📝 **字幕管理** | 提取内嵌字幕，导入 SRT/VTT/ASS；整体偏移与逐条编辑；可选本地 Whisper 转写 |
| 🎬 **多轨时间线** | 虚拟化时间线：视频、镜头、字幕、段落、标记、情绪六轨；播放器双向同步 |
| 🏗️ **结构化分析** | 层级：作品→幕→段落→镜头；四种主视图（镜头网格、剧情泳道、结构树、情绪曲线）|
| 🤖 **AI 辅助分析** | 双通路：手动 AI 分析包（ZIP/JSON）+ BYOK 直连模型；所有结果可预览/选择性合并/撤销 |
| 📤 **专业导出** | Markdown / PDF / CSV / SRT / VTT / 项目包；中文 PDF 字体嵌入 |
| 🔒 **本地优先** | SQLite 存储；原始媒体不离开设备；API Key 仅存系统钥匙串 |

## 🏗️ 技术架构

```
src/
├── main/         # Electron 主进程 — 数据库、文件、FFmpeg、AI 适配器
├── preload/      # 最小化类型安全桥接
├── renderer/     # React UI — 关闭 Node integration
├── shared/       # Schema、IPC 合约、纯函数
└── tests/        # Vitest / Playwright E2E
```

**技术栈：** Electron + React 19 + TypeScript + SQLite (Kysely/Drizzle) + FFmpeg + Zustand + Zod + Vitest + Playwright

## 🚀 快速开始

> 需要 Node.js 20.19+ 和 npm/pnpm

```bash
git clone https://github.com/zhangshujuan1314/cineweave-studio.git
cd cineweave-studio
npm ci
npm run dev
```

## 📖 文档

- [产品规格说明书](docs/product-spec.md)
- [竞品格局分析报告](docs/competitive-landscape.md) *(生成中)*
- [第一性原理与对抗性审查](docs/first-principles-adversarial-review.md) *(生成中)*
- [Claude Code 实施提示词手册](docs/claude-code-prompts.md)
- [Lapian Notes 分析报告](docs/lapian-analysis-report.md)

## 🗺️ 路线图

| Phase | 范围 | 状态 |
|---|---|---|
| Phase 0 | 工程基线与安全壳 | 🔲 |
| Phase 1 | 项目、SQLite 与恢复 | 🔲 |
| Phase 2 | 媒体探测、代理与任务队列 | 🔲 |
| Phase 3 | 镜头、字幕、波形与时间线 | 🔲 |
| Phase 4 | 分析领域、编辑器与四种视图 | 🔲 |
| Phase 5 | AI 手动分析包与安全导入 | 🔲 |
| Phase 6 | BYOK AI 与证据面板 | 🔲 |
| Phase 7 | 版本、导出、备份与交换格式 | 🔲 |
| Phase 8 | 发布硬化与最终验收 | 🔲 |

## 📄 许可证

MIT License

**CineWeave Studio** — 让每一次拉片都积累为可复用的创作资产。
