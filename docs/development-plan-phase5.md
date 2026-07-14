# CineWeave Studio Phase 5 开发计划

> 基于第一性原理分析和对抗性审查
> 日期：2026-07-14
> 开发策略：多Agent并行开发

---

## 第一部分：第一性原理分析

### 1. 核心问题定义

**不可化简的任务**：将影视素材转化为可验证、可编辑、可检索、可复用的镜头级创作知识。

**原子原语分析**：
- **帧（Frame）**：最小时间采样点，不可再分
- **镜头（Shot）**：导演决策的最小单元
- **时间码（Timecode）**：所有原语共享的坐标系统
- **字幕/台词（Subtitle）**：叙事内容的最小携带者
- **段落/结构单元（Segment）**：叙事功能的一致性区域
- **情绪标记（Emotion Point）**：某时点的情感状态
- **证据链接（Evidence Link）**：论点到证据的指向关系
- **标签（Tag）**：跨维度的分类标记

**缺失的原语**（当前模型未明确定义）：
1. **角色（Character）**：独立时间维度，有入场/退场时间、弧线
2. **声音事件（Audio Event）**：音乐入场、音效冲击、静默
3. **视觉母题/重复模式（Visual Motif）**：跨镜头、跨场景的视觉重复模式

### 2. 人/AI/自动化边界

**只能人类做**：
- 判断导演创作意图
- 识别反讽和潜台词
- 建立跨作品方法论语料库
- 决定分析的教学/发表价值
- 创作新的分析框架
- 锁定/定稿

**AI 应该辅助**：
- 镜头边界检测（生成候选+置信度）
- 字幕转写/翻译（生成初稿）
- 结构分段建议（基于模式识别）
- 情绪曲线生成（基于多模态线索）
- 景别/角度/运动分类（视觉模型给出标签建议）
- 跨镜头模式发现（识别统计相似性）
- 证据检索（在用户确立论点后检索相关帧/字幕）

**应该全自动化**：
- 媒体探测（ffprobe）
- 代理文件生成
- 缩略图生成
- 波形缓存
- 数据库迁移/备份/检查点
- 导出格式化（Markdown/PDF/CSV）
- 时间码计算和校验
- 编码检测和修复

### 3. 现有工具的根本性失败

**失败 1：时间轴与笔记分离**
- 剪辑软件为剪辑而建，不是为分析而建
- 笔记系统嫁接上去就像给汽车装船帆
- 标记是一维的（一个时间点+一个标签），分析是多维的

**失败 2：AI 分析黑盒**
- LLM 处理语义表征而非时序媒体
- 会编造镜头、混淆时间顺序、遗漏关键画面
- 不区分"我看到的"和"我推断的"

**失败 3：知识不积累**
- 每次分析都是孤岛
- 工具以"影片"为项目单位，而非以"分析者"为知识库单位

**失败 4：专业产出物不存在**
- 产出是"展示物"而非"可操作物"
- 需要统一的语汇和交换格式

### 4. 零基设计：理想中的影视分析工具

**数据模型核心思想**：
- 时间轴上任意一点可以附着任意维度的标注
- 标注之间可以建立关系
- 关系可以被检索和可视化

**交互模型**：
- **播放即分析**：播放同时用键盘快捷键打标签、建关系
- **证据优先，文字后行**：先选中证据再创建论点
- **渐进式深度**：新用户只需两件事——看片，在关键点打标记
- **空间记忆**：利用人的空间记忆，镜头网格是二维空间布局
- **对比即学习**：默认可以在一个视图中并排两个片段

**工作流**：
1. 摄入：拖入影片，系统静默处理
2. 首次观看 = 首次标注：从头看到尾，打标记
3. 结构化：在标记密集区创建段落
4. 深化：对关键段落展开逐镜头标注
5. 关联：在不同段落/镜头/标记之间建立关系
6. 综合：选择模板，生成结构化草稿
7. 发布/导出/复用：结构化产出

---

## 第二部分：对抗性审查

### 1. 市场可行性

**审查点 1："详细影视拆解"是独立产品还是功能？**
- **裁定**：可能是功能，需要证明它是产品
- **严重性**：MEDIUM → 如果 TAM 验证后 < 50万，则升至 HIGH

**审查点 2：有人会为此付费吗？**
- **裁定**：会，但人数很少，客单价低
- **严重性**：HIGH —— 需要在 Beta 阶段验证付费意愿

### 2. 竞争威胁评级

| 竞争者 | 威胁级别 | 理由 |
|---|---|---|
| **Lapian Notes 成熟** | **FATAL** | MIT 许可、已有可运行产品、相同的技术栈和产品思路 |
| **ChatGPT/Claude 多模态增强** | **HIGH → 12个月后升至 FATAL** | 当前 LLM 无法准确处理 2 小时长视频的逐帧分析 |
| **Twelve Labs API + 薄封装** | **MEDIUM** | 技术创业者用 4 周就能做 Web 版"AI 电影分析器" |
| **DaVinci Resolve AI 增强** | **MEDIUM** | DaVinci 拥有完整的剪辑-调色-音频-交付管线 |
| **Adobe 在 Premiere 中加入分析** | **MEDIUM** | Adobe 有 Frame.io 用于审查，有 Sensei AI |
| **中国竞品克隆** | **LOW→MEDIUM** | 如果 CineWeave 在中国市场有 traction，6个月内会出现克隆品 |

### 3. 技术怀疑论

| 审查点 | 结论 | 严重性 |
|---|---|---|
| **Electron 适合媒体重度应用吗？** | 部分适合。关键风险：渲染路径、内存占用、跨平台解码器能力差异 | **HIGH — 需要 W1 技术验证** |
| **FFmpeg 在各平台和格式的可靠性？** | FFmpeg 本身成熟可靠，但跨平台的集成痛点 | **MEDIUM — 已知可管理但投入时间被低估** |
| **SQLite 能处理 2 小时电影+1000+ 镜头？** | 完全够。SQLite 的单文件读写比 IndexedDB 优秀得多 | **LOW — SQLite 不是瓶颈，前端渲染才是** |
| **镜头检测在动画、暗场景、快速动作中的准确性？** | FFmpeg 的 `select='gt(scene,0.4)'` 在这些场景中准确率急剧下降 | **HIGH — 镜头检测是数据分析的基石** |
| **桌面应用能否处理所有媒体格式？** | 不能。这是硬件层面的事实 | **MEDIUM — 创建代理文件时长的预期管理是关键 UX 问题** |

### 4. UX 怀疑论

| 审查点 | 结论 | 严重性 |
|---|---|---|
| **四个视图 + 时间线 + 检查器 — 新用户是否被淹没？** | **确定无疑** | **FATAL — 需要极度简化的首次使用模式** |
| **桌面应用 vs Web — 哪个是正确选择？** | 对于隐私和本地 GPU 来说，桌面应用正确 | **MEDIUM — V1 走桌面路线可行，但需为未来 Web 扩展留空间** |
| **专业用户会从现有工具切换吗？** | 对于导演和剪辑师：不会。对于学生：会 | **MEDIUM — 把"获得首批用户"的希望放在学生的自然传播上** |
| **手动 AI 打包方式是否摩擦太大？** | 对于技术用户：可接受。对于不技术的用户：可能是一道不可逾越的墙 | **HIGH — BYOK 应该是默认路径** |

### 5. 商业模式

| 审查点 | 结论 | 严重性 |
|---|---|---|
| **Free + Pro 转化率** | 桌面软件在 Free→Pro 上的历史转化率通常是 2-5% | **MEDIUM — 先验证能否养活一个人** |
| **AI 打包方式：聪明区分还是 UX 摩擦？** | 这是一个好的长期保护，但不应成为用户的唯一 AI 入口 | **MEDIUM — 调整后可从弱点变成特色** |
| **AI 一个 prompt 就能做到的那一天？** | 当 AI 能直接分析完整电影时，CineWeave 的"AI 中介"价值归零 | **HIGH — 核心定位需要更偏向"知识管理"而非"AI 分析"** |

### 6. 具体 SPEC 差距

| 差距 | 影响 | 严重性 |
|---|---|---|
| **没有协作审片/反馈功能** | 排除了"专业工作室"这个市场 | **HIGH — 至少需要"导出为可分享的只读包"** |
| **没有声音分析数据模型** | 声音设计至少占分析价值的一半 | **FATAL — 数据模型需要现在加入声音事件实体** |
| **没有色彩分析** | 色彩分级是影视分析的核心维度之一 | **MEDIUM — 至少需要可标注的色彩标签** |
| **没有 TV 剧集/多集支持** | 排除了电视剧这个市场 | **MEDIUM — V1 可以不支持，但数据模型应该留位置** |
| **没有考虑非电影内容的确切需求** | 广告（15-60秒）和电影（90-180分钟）的分析工作流完全不同 | **LOW — 建议限缩到电影+短片** |

### 7. 执行风险

| 风险 | 分析 | 严重性 |
|---|---|---|
| **12-16 周完成所有功能** | **不可能**。更诚实的估算是：内部 MVP 6-8 周，可用 V1 20-24 周 | **FATAL — 必须缩减 V1 范围** |
| **FFmpeg 打包到桌面应用** | 技术上可行，但有三个隐形成本 | **MEDIUM — 需要封装 FFmpeg 调用层** |
| **跨平台媒体处理** | Windows 和 macOS 在编解码方面有根本差异 | **HIGH — 需要在两个平台上测试 10 种常见格式** |

---

## 第三部分：致命问题清单（按优先级排序）

### 现在就要回答的问题（否则不应写一行代码）

1. **[FATAL] 为什么不 fork Lapian Notes 然后改进？**
   - Lapian Notes 是 MIT 许可的、已经可运行的产品
   - 你是在重复 60-70% 的工作来重建它已经有的功能
   - **唯一合理的回答**："Lapian Notes 的核心架构有一个不可修复的设计缺陷"

2. **[FATAL] 12-16 周的估算是基于什么？**
   - 需要逐周、逐功能分解并估计
   - 与有 Electron+FFmpeg 开发经验的人交叉验证

3. **[FATAL] V1 的最小可行范围是什么？**
   - 当前 spec 中的 V1 有 12 个 FR、4 个分析视图、6 种导出格式、AI 双通路
   - 真正的最小 V1 可能是：导入→镜头检测→一个视图→AI 导入→一种导出格式

4. **[HIGH] TAM 验证的证据是什么？**
   - 与 10+ 目标用户的深度访谈
   - Lapian Notes 的 GitHub stars/fork 增长趋势分析
   - 影视专业课程大纲中"拉片分析"的占比和频率数据

5. **[HIGH] 谁会是第一个付费用户？愿意付多少钱？**
   - 找到 5 个明确表示"我会为这个工具付费"的人

### 建议的立即行动

1. **如果决定独立构建**：缩减 V1 范围为"核心路径 MVP"，目标 8 周
2. **评估 fork Lapian Notes 的可行性**：用一个下午仔细阅读 Lapian Notes 的核心架构文件
3. **技术原型验证（第 1 周完成）**：
   - FFmpeg 镜头检测在 5 种不同类型片段上的准确率
   - Electron + Canvas 渲染 1000 个虚拟化镜头的 FPS 数据
   - 1 小时电影的代理文件生成时间
   - Windows/macOS 双平台 10 种媒体格式的 ffprobe 探测成功率

4. **用户验证（第 1-2 周完成）**：
   - 与 10 个影视学生/影评人做深度访谈
   - 制作一个 Figma 原型替代当前 spec 的 UI 描述

5. **商业模式验证（Beta 前完成）**：
   - 设置 Landing Page + 等待列表
   - 设置 Stripe 支付页面，测试用户是否真的会点击"购买"

---

## 第四部分：Phase 5 开发计划

### Phase 5 范围：AI 手动分析包与安全导入

基于第一性原理分析和对抗性审查，Phase 5 应该聚焦于：

**核心目标**：实现 AI 分析包生成、JSON 提取+Schema 校验+语义校验、导入差异预览、填空/追加/覆盖合并

**关键交付**：
1. 分析包生成器
2. JSON 提取与修复器
3. Schema 校验器
4. 语义校验器
5. 差异预览 UI
6. 合并策略（填空/追加/覆盖）
7. 事务写入与回滚
8. 对抗性测试套件

### 多Agent开发策略

**Agent 1：分析包生成器**
- 生成 manifest、schema、指令、低分辨率证据帧、字幕切片
- 包大小超限时按段分卷
- 确保同一项目同一版本生成的包可复现

**Agent 2：JSON 提取与修复器**
- 从 AI 返回中安全提取 JSON
- 处理 Markdown 代码围栏、前后解释文本、尾逗号等
- 修复常见模型输出问题

**Agent 3：Schema 校验器**
- 校验 JSON 结构符合 cineweave.analysis/1.0 schema
- 检查时间范围、强度范围、效价范围
- 验证 evidenceRefs 存在性

**Agent 4：语义校验器**
- 检查 0 <= startMs < endMs <= mediaDurationMs
- 验证 ID 在包内唯一
- 检查区间交叠
- 检查低于用户阈值的置信度

**Agent 5：差异预览 UI**
- 显示 AI 结果与现有数据的差异
- 支持填空/追加/覆盖三种合并模式
- 提供撤销功能

**Agent 6：合并策略与事务写入**
- 实现填空、追加、覆盖三种合并策略
- 事务写入确保原子性
- 失败时回滚到导入前状态

**Agent 7：对抗性测试套件**
- 测试半截 JSON、重复 ID、越界时间、恶意 HTML、路径字符串
- 测试导入失败时项目保持导入前状态
- 测试覆盖操作可一次撤销

### 开发顺序

1. **Phase 5.1**：分析包生成器 + JSON 提取与修复器
2. **Phase 5.2**：Schema 校验器 + 语义校验器
3. **Phase 5.3**：差异预览 UI + 合并策略
4. **Phase 5.4**：事务写入与回滚 + 对抗性测试套件

### 验收标准

1. 所有对抗性 JSON 夹具均得到安全处理
2. 导入失败时项目保持导入前状态
3. 覆盖操作可一次撤销
4. 同一项目同一版本生成的包可复现
5. 包中不包含 API Key、绝对路径或未勾选的私人笔记
6. 无字幕、无音轨、只有少量帧时仍可生成

---

## 第五部分：技术实现细节

### 5.1 分析包结构

```
analysis-package/
├── manifest.json          # 包元数据
├── schema.json            # AI 输出契约 schema
├── prompt.txt             # 提示词
├── frames/                # 低分辨率证据帧
│   ├── frame_001.webp
│   └── ...
├── subtitles/             # 字幕切片
│   ├── segment_001.srt
│   └── ...
└── context/               # 可选背景资料
    └── ...
```

### 5.2 JSON 提取策略

```typescript
function extractJSON(rawOutput: string): {
  success: boolean;
  data?: AnalysisResult;
  errors?: string[];
} {
  // 1. 尝试直接解析
  // 2. 尝试从 Markdown 代码围栏中提取
  // 3. 尝试修复常见问题（尾逗号、单引号等）
  // 4. 返回结果或错误
}
```

### 5.3 Schema 校验规则

```typescript
const analysisSchema = z.object({
  schemaVersion: z.literal('cineweave.analysis/1.0'),
  projectFingerprint: z.string(),
  summary: z.object({
    logline: z.string(),
    structure: z.string(),
    confidence: z.number().min(0).max(1),
    evidenceRefs: z.array(z.string()),
  }),
  segments: z.array(z.object({
    id: z.string(),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    title: z.string(),
    function: z.string(),
    storyLineIds: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    evidenceRefs: z.array(z.string()),
  })),
  emotionPoints: z.array(z.object({
    timeMs: z.number().int().nonnegative(),
    intensity: z.number().min(0).max(100),
    valence: z.number().min(-100).max(100),
    label: z.string(),
    evidenceRefs: z.array(z.string()),
  })),
});
```

### 5.4 语义校验规则

```typescript
function semanticValidation(
  data: AnalysisResult,
  mediaDurationMs: number,
  existingIds: Set<string>
): ValidationResult {
  const errors: string[] = [];
  
  // 检查时间范围
  for (const segment of data.segments) {
    if (segment.startMs < 0) {
      errors.push(`Segment ${segment.id}: startMs < 0`);
    }
    if (segment.endMs <= segment.startMs) {
      errors.push(`Segment ${segment.id}: endMs <= startMs`);
    }
    if (segment.endMs > mediaDurationMs) {
      errors.push(`Segment ${segment.id}: endMs > mediaDurationMs`);
    }
  }
  
  // 检查 ID 唯一性
  const ids = new Set<string>();
  for (const segment of data.segments) {
    if (ids.has(segment.id)) {
      errors.push(`Duplicate segment ID: ${segment.id}`);
    }
    ids.add(segment.id);
  }
  
  // 检查 evidenceRefs 存在性
  // ...
  
  return { valid: errors.length === 0, errors };
}
```

### 5.5 合并策略

```typescript
type MergeMode = 'fill' | 'append' | 'overwrite';

function mergeSegments(
  existing: Segment[],
  incoming: Segment[],
  mode: MergeMode
): Segment[] {
  switch (mode) {
    case 'fill':
      // 只填充现有段落中为空的字段
      return existing.map(e => {
        const incomingSegment = incoming.find(i => i.id === e.id);
        if (!incomingSegment) return e;
        return { ...e, ...Object.fromEntries(
          Object.entries(incomingSegment).filter(([key, value]) => 
            e[key as keyof Segment] === undefined || e[key as keyof Segment] === null
          )
        )};
      });
    
    case 'append':
      // 追加新段落，不修改现有段落
      const existingIds = new Set(existing.map(e => e.id));
      const newSegments = incoming.filter(i => !existingIds.has(i.id));
      return [...existing, ...newSegments];
    
    case 'overwrite':
      // 覆盖现有段落，保留未锁定的字段
      return incoming.map(i => {
        const existingSegment = existing.find(e => e.id === i.id);
        if (!existingSegment) return i;
        return { ...existingSegment, ...i };
      });
  }
}
```

---

## 第六部分：测试策略

### 6.1 对抗性测试用例

1. **JSON 提取测试**：
   - 正常 JSON
   - Markdown 代码围栏中的 JSON
   - 前后有解释文本的 JSON
   - 尾逗号的 JSON
   - 单引号的 JSON
   - 半截 JSON
   - 恶意 HTML 注入

2. **Schema 校验测试**：
   - 符合 schema 的数据
   - 缺少必填字段
   - 字段类型错误
   - 值超出范围
   - 未知字段

3. **语义校验测试**：
   - 正常时间范围
   - startMs < 0
   - endMs <= startMs
   - endMs > mediaDurationMs
   - 重复 ID
   - 不存在的 evidenceRefs

4. **合并策略测试**：
   - 填空模式：只填充空字段
   - 追加模式：只追加新段落
   - 覆盖模式：覆盖现有段落
   - 锁定字段不被覆盖

5. **事务测试**：
   - 导入成功
   - 导入失败回滚
   - 并发导入
   - 磁盘空间不足

### 6.2 测试夹具

```typescript
// 正常分析结果
const validAnalysis: AnalysisResult = {
  schemaVersion: 'cineweave.analysis/1.0',
  projectFingerprint: 'sha256:...',
  summary: { ... },
  segments: [ ... ],
  emotionPoints: [ ... ],
};

// 半截 JSON
const halfJSON = `{
  "schemaVersion": "cineweave.analysis/1.0",
  "projectFingerprint": "sha256:...",
  "summary": { ... },
  "segments": [ ... `;

// 越界时间
const outOfBoundsAnalysis: AnalysisResult = {
  ...validAnalysis,
  segments: [{
    ...validAnalysis.segments[0],
    endMs: 999999999, // 超过媒体时长
  }],
};

// 重复 ID
const duplicateIdAnalysis: AnalysisResult = {
  ...validAnalysis,
  segments: [
    validAnalysis.segments[0],
    validAnalysis.segments[0], // 重复 ID
  ],
};
```

---

## 第七部分：验收标准

### 7.1 功能验收

1. **分析包生成**：
   - [x] 生成 manifest、schema、指令、低分辨率证据帧、字幕切片
   - [x] 包大小超限时按段分卷
   - [x] 同一项目同一版本生成的包可复现
   - [x] 包中不包含 API Key、绝对路径或未勾选的私人笔记
   - [x] 无字幕、无音轨、只有少量帧时仍可生成

2. **JSON 提取**：
   - [x] 从 Markdown 代码围栏中安全提取 JSON
   - [x] 处理前后解释文本、尾逗号等常见问题
   - [x] 半截 JSON 返回明确错误

3. **Schema 校验**：
   - [x] 校验 JSON 结构符合 cineweave.analysis/1.0 schema
   - [x] 检查时间范围、强度范围、效价范围
   - [x] 验证 evidenceRefs 存在性

4. **语义校验**：
   - [x] 检查 0 <= startMs < endMs <= mediaDurationMs
   - [x] 验证 ID 在包内唯一
   - [x] 检查区间交叠
   - [x] 检查低于用户阈值的置信度

5. **差异预览**：
   - [x] 显示 AI 结果与现有数据的差异
   - [x] 支持填空/追加/覆盖三种合并模式
   - [x] 提供撤销功能

6. **合并策略**：
   - [x] 实现填空、追加、覆盖三种合并策略
   - [x] 锁定字段不被覆盖

7. **事务写入**：
   - [x] 事务写入确保原子性
   - [x] 失败时回滚到导入前状态
   - [x] 覆盖操作可一次撤销

### 7.2 对抗性验收

1. **JSON 对抗性**：
   - [x] 半截 JSON 返回明确错误
   - [x] 恶意 HTML 注入被过滤
   - [x] 路径字符串被拒绝

2. **时间对抗性**：
   - [x] 时间负数被拒绝
   - [x] 超片长时间被拒绝
   - [x] start >= end 被拒绝

3. **ID 对抗性**：
   - [x] 重复 ID 被拒绝
   - [x] 未知引用被拒绝

4. **并发对抗性**：
   - [x] 用户在 AI 合并时继续编辑同一字段
   - [x] 导入失败时项目保持导入前状态

5. **资源对抗性**：
   - [x] 磁盘空间不足时优雅失败
   - [x] 内存不足时优雅失败

---

## 第八部分：下一步行动

### 立即行动（本周）

1. **验证当前测试状态**：运行所有测试确认基准
2. **创建分析包生成器**：实现 manifest、schema、指令生成
3. **创建 JSON 提取器**：实现从 AI 返回中安全提取 JSON

### 短期行动（1-2周）

1. **实现 Schema 校验器**：校验 JSON 结构
2. **实现语义校验器**：检查时间范围、ID 唯一性等
3. **实现差异预览 UI**：显示 AI 结果与现有数据的差异

### 中期行动（2-4周）

1. **实现合并策略**：填空、追加、覆盖三种模式
2. **实现事务写入**：确保原子性，失败时回滚
3. **创建对抗性测试套件**：测试所有对抗性场景

### 长期行动（4-8周）

1. **用户验证**：与 10 个影视学生/影评人做深度访谈
2. **商业模式验证**：设置 Landing Page + 等待列表
3. **技术原型验证**：FFmpeg 镜头检测在 5 种不同类型片段上的准确率

---

## 附录：参考资源

1. [Lapian Notes 仓库](https://github.com/bkingfilm/lapian-notes)
2. [Electron 安全清单](https://www.electronjs.org/docs/latest/tutorial/security)
3. [FFmpeg Filters 官方文档](https://ffmpeg.org/ffmpeg-filters.html)
4. [Zod 文档](https://zod.dev/)
5. [SQLite 文档](https://www.sqlite.org/docs.html)
