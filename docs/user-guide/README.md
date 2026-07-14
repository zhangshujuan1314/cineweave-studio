# CineWeave Studio 用户指南

> 把任意影视素材转化为可验证、可编辑、可检索、可复用的镜头级创作知识。

---

## 📖 目录

1. [快速开始](#快速开始)
2. [功能介绍](#功能介绍)
3. [项目管理](#项目管理)
4. [媒体导入](#媒体导入)
5. [AI 分析](#ai-分析)
6. [导出功能](#导出功能)
7. [快捷键](#快捷键)
8. [常见问题](#常见问题)

---

## 🚀 快速开始

### 安装

1. 从 [GitHub Releases](https://github.com/zhangshujuan1314/cineweave-studio/releases) 下载最新版本
2. 运行安装程序
3. 启动 CineWeave Studio

### 首次使用

1. 启动应用程序
2. 点击 "New Project" 创建新项目
3. 输入项目名称
4. 点击 "Create" 完成创建

---

## 🎯 功能介绍

### 核心功能

- **项目管理**: 创建、打开、删除项目
- **媒体导入**: 支持 MP4、MOV、MKV 等格式
- **AI 分析**: 使用 AI 分析影片结构
- **导出功能**: 导出为 Markdown、CSV、SRT 等格式
- **备份恢复**: 自动备份和手动备份

### AI 提供商

- **OpenAI**: GPT-4o、GPT-4-turbo、GPT-3.5-turbo
- **Anthropic**: Claude 3.5 Sonnet、Claude 3 Opus、Claude 3 Haiku

---

## 📁 项目管理

### 创建项目

1. 点击 "New Project" 按钮
2. 输入项目名称
3. 选择项目位置（可选）
4. 点击 "Create"

### 打开项目

1. 在项目列表中点击项目卡片
2. 项目将在新窗口中打开

### 删除项目

1. 右键点击项目卡片
2. 选择 "Delete"
3. 确认删除

---

## 🎬 媒体导入

### 支持的格式

- **视频**: MP4、MOV、MKV、AVI、WEBM
- **音频**: MP3、WAV、AAC、FLAC
- **字幕**: SRT、VTT、ASS

### 导入步骤

1. 在项目中点击 "Import Media"
2. 选择媒体文件
3. 等待导入完成

### 媒体探测

导入后，系统会自动：
- 探测媒体信息（时长、分辨率、编码）
- 生成代理文件（如需要）
- 提取字幕（如有）

---

## 🤖 AI 分析

### 配置 AI 提供商

1. 点击 "AI Analysis" 按钮
2. 选择 "Provider Settings"
3. 输入 API Key
4. 选择提供商（OpenAI 或 Anthropic）
5. 选择模型

### 运行分析

1. 点击 "AI Analysis" 按钮
2. 选择分析类型
3. 点击 "Start Analysis"
4. 等待分析完成

### 查看结果

分析完成后，可以：
- 查看分析报告
- 编辑分析结果
- 导出分析数据

---

## 📤 导出功能

### 支持的格式

- **Markdown**: 生成 Markdown 文档
- **CSV**: 生成 CSV 数据表
- **SRT**: 生成 SRT 字幕文件
- **VTT**: 生成 VTT 字幕文件
- **项目包**: 导出完整项目

### 导出步骤

1. 点击 "Export" 按钮
2. 选择导出格式
3. 选择导出位置
4. 点击 "Export"

### 项目包导出

项目包包含：
- 项目配置
- 分析数据
- 媒体引用
- 帧数据
- 字幕数据

---

## ⌨️ 快捷键

### 通用

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建项目 |
| `Ctrl+O` | 打开项目 |
| `Ctrl+S` | 保存 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Ctrl+K` | 命令面板 |

### 播放器

| 快捷键 | 功能 |
|--------|------|
| `Space` | 播放/暂停 |
| `J` | 后退 500ms |
| `L` | 前进 500ms |
| `←` | 后退 500ms |
| `→` | 前进 500ms |
| `Shift+←` | 后退 5s |
| `Shift+→` | 前进 5s |
| `Home` | 跳到开头 |
| `End` | 跳到结尾 |

### 编辑

| 快捷键 | 功能 |
|--------|------|
| `I` | 标记入点 |
| `O` | 标记出点 |
| `S` | 拆分镜头 |
| `M` | 添加标记 |
| `[` | 上一个镜头 |
| `]` | 下一个镜头 |

---

## ❓ 常见问题

### Q: 如何获取 AI API Key？

**OpenAI:**
1. 访问 https://platform.openai.com/
2. 登录或注册
3. 进入 API Keys 页面
4. 创建新的 API Key

**Anthropic:**
1. 访� https://console.anthropic.com/
2. 登录或注册
3. 进入 API Keys 页面
4. 创建新的 API Key

### Q: 支持哪些视频格式？

支持 MP4、MOV、MKV、AVI、WEBM 等常见格式。如遇到不支持的格式，系统会自动生成代理文件。

### Q: 如何备份项目？

项目会自动备份。也可以手动备份：
1. 点击 "Backup" 按钮
2. 选择 "Create Backup"
3. 输入备份名称
4. 点击 "Create"

### Q: 如何恢复项目？

1. 点击 "Backup" 按钮
2. 选择 "Restore Backup"
3. 选择要恢复的备份
4. 点击 "Restore"

### Q: 分析结果不准确怎么办？

1. 检查媒体质量
2. 调整 AI 模型
3. 手动编辑分析结果
4. 重新运行分析

---

## 📞 支持

- **GitHub Issues**: https://github.com/zhangshujuan1314/cineweave-studio/issues
- **Email**: support@cineweave.studio

---

## 📄 许可证

MIT License
