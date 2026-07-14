# CineWeave Studio 开发者指南

> CineWeave Studio 架构和开发文档

---

## 📖 目录

1. [架构概述](#架构概述)
2. [技术栈](#技术栈)
3. [项目结构](#项目结构)
4. [开发环境](#开发环境)
5. [构建和测试](#构建和测试)
6. [IPC 接口](#ipc-接口)
7. [数据库 Schema](#数据库-schema)
8. [贡献指南](#贡献指南)

---

## 🏗️ 架构概述

### 进程模型

CineWeave Studio 使用 Electron 的多进程架构：

- **Main Process**: 主进程，负责系统交互、数据库、文件操作
- **Renderer Process**: 渲染进程，负责 UI 渲染
- **Preload Script**: 预加载脚本，安全桥接主进程和渲染进程

### 安全模型

- `nodeIntegration: false`: 禁用 Node.js 集成
- `contextIsolation: true`: 启用上下文隔离
- `sandbox: true`: 启用沙箱
- IPC 白名单: 只允许预定义的 IPC 通道

---

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 桌面壳 | Electron 33 + electron-vite |
| UI | React 19 + TypeScript 5.8 |
| 数据库 | better-sqlite3 |
| 媒体 | FFmpeg/ffprobe |
| 测试 | Vitest + Playwright |
| 校验 | Zod |

---

## 📁 项目结构

```
cineweave-studio/
├── src/
│   ├── main/              # Electron 主进程
│   │   ├── db/            # SQLite 数据库
│   │   ├── projects/      # 项目管理
│   │   ├── media/         # 媒体处理
│   │   ├── jobs/          # 任务队列
│   │   ├── ai/            # AI 分析
│   │   │   ├── providers/ # AI 提供商
│   │   │   └── ...
│   │   ├── export/        # 导出和备份
│   │   ├── security/      # 安全审计
│   │   ├── performance/   # 性能基准
│   │   ├── packaging/     # 打包配置
│   │   └── ipc/           # IPC 处理器
│   ├── preload/           # 预加载脚本
│   ├── renderer/          # React UI
│   │   ├── app/           # 应用壳
│   │   ├── features/      # 功能模块
│   │   ├── components/    # 组件
│   │   └── styles/        # 样式
│   ├── shared/            # 共享模块
│   │   ├── contracts/     # IPC 合约
│   │   ├── media/         # 媒体类型
│   │   └── time/          # 时间工具
│   └── tests/             # 测试文件
│       ├── unit/          # 单元测试
│       └── e2e/           # E2E 测试
├── docs/                  # 文档
├── build/                 # 构建资源
├── out/                   # 构建输出
└── package.json           # 项目配置
```

---

## 💻 开发环境

### 前置要求

- Node.js >= 20.19.0
- npm 或 yarn
- Git

### 安装

```bash
# 克隆仓库
git clone https://github.com/zhangshujuan1314/cineweave-studio.git
cd cineweave-studio

# 安装依赖
npm ci

# 启动开发服务器
npm run dev
```

### 环境变量

创建 `.env` 文件：

```env
# OpenAI API Key (可选)
OPENAI_API_KEY=sk-...

# Anthropic API Key (可选)
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🔨 构建和测试

### 开发

```bash
# 启动开发服务器
npm run dev

# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 格式化代码
npm run format
```

### 测试

```bash
# 运行所有单元测试
npm run test

# 运行 AI 测试
npm run test:ai

# 运行 Provider 测试
npm run test:providers

# 运行 E2E 测试
npm run test:e2e

# 监听模式
npm run test:watch
```

### 构建

```bash
# 构建应用
npm run build

# 打包应用
npm run package

# 打包 Windows
npm run package:win

# 打包 macOS
npm run package:mac

# 打包 Linux
npm run package:linux
```

---

## 📡 IPC 接口

### 项目管理

| 通道 | 描述 |
|------|------|
| `project:create` | 创建项目 |
| `project:open` | 打开项目 |
| `project:list` | 列出项目 |
| `project:delete` | 删除项目 |

### 媒体处理

| 通道 | 描述 |
|------|------|
| `media:probe` | 探测媒体信息 |
| `media:transcode` | 转码媒体 |
| `media:thumbnail` | 生成缩略图 |

### AI 分析

| 通道 | 描述 |
|------|------|
| `ai:generatePackage` | 生成分析包 |
| `ai:extractJSON` | 提取 JSON |
| `ai:validateSchema` | 校验 Schema |
| `ai:merge` | 合并分析结果 |
| `ai:import` | 导入分析 |

### Provider 管理

| 通道 | 描述 |
|------|------|
| `provider:configure` | 配置提供商 |
| `provider:saveApiKey` | 保存 API Key |
| `provider:analyze` | 运行分析 |
| `provider:analyzeStream` | 流式分析 |

### 导出和备份

| 通道 | 描述 |
|------|------|
| `checkpoint:create` | 创建检查点 |
| `checkpoint:restore` | 恢复检查点 |
| `backup:create` | 创建备份 |
| `backup:restore` | 恢复备份 |
| `export:export` | 导出分析 |
| `package:export` | 导出项目包 |
| `package:import` | 导入项目包 |

---

## 🗄️ 数据库 Schema

### 项目表

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 媒体资产表

```sql
CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  path TEXT NOT NULL,
  fingerprint TEXT,
  duration_ms INTEGER,
  metadata_json TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 镜头表

```sql
CREATE TABLE shots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  cover_frame_id TEXT,
  locked INTEGER DEFAULT 0,
  source TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 段落表

```sql
CREATE TABLE segments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  parent_id TEXT,
  level TEXT NOT NULL,
  start_ms INTEGER NOT NULL,
  end_ms INTEGER NOT NULL,
  title TEXT,
  fields_json TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (parent_id) REFERENCES segments(id)
);
```

---

## 🤝 贡献指南

### 开发流程

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 Prettier 格式化
- 编写测试用例
- 更新文档

### 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

### 测试要求

- 新功能必须有测试
- 修复 bug 必须有测试
- 测试覆盖率不低于 80%

---

## 📚 相关文档

- [用户指南](../user-guide/README.md)
- [API 文档](../api/README.md)
- [更新日志](../../CHANGELOG.md)

---

## 📞 联系方式

- **GitHub Issues**: https://github.com/zhangshujuan1314/cineweave-studio/issues
- **Email**: dev@cineweave.studio
