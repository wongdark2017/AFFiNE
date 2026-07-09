# 跨层思考指南

> **目的**：实现前想清楚跨层数据流。

---

## 问题

**多数 bug 发生在层边界**，而不是层内部。

常见跨层 bug：

- API 返回格式 A，前端期望格式 B
- 数据库存 X，service 变成 Y，却丢数据
- 多层用不同方式实现同一逻辑

---

## 实现跨层功能之前

### 步骤 1：画数据流

```
Source → Transform → Store → Retrieve → Transform → Display
```

对每个箭头问：

- 数据是什么格式？
- 可能哪里出错？
- 谁负责校验？

### 步骤 2：识别边界

| 边界                  | 常见问题            |
| --------------------- | ------------------- |
| API ↔ Service         | 类型不匹配、缺字段  |
| Service ↔ Database    | 格式转换、null 处理 |
| Backend ↔ Frontend    | 序列化、日期格式    |
| Component ↔ Component | Props 形状变化      |

### 步骤 3：定义契约

对每个边界：

- 精确输入格式是什么？
- 精确输出格式是什么？
- 可能出现哪些错误？

---

## 常见跨层错误

### 错误 1：隐式格式假设

**坏**：不检查就假设日期格式

**好**：在边界显式转换格式

### 错误 2：校验散落

**坏**：多层重复校验同一件事

**好**：在入口点校验一次

### 错误 3：抽象泄漏

**坏**：组件知道数据库 schema

**好**：每层只认识邻居

### 错误 4：每个消费者各自解析同一载荷

**坏**：命令读 JSONL 事件并内联 cast 字段：

```typescript
const thread = (ev as { thread?: string }).thread;
const labels = (ev as { labels?: string[] }).labels;
```

看起来是局部问题，实际等于每个消费者私有一份事件契约。下次字段变更会只改一个命令、漏掉另一个。

**好**：在事件边界解码一次，再导出类型化 projection：

```typescript
if (!isThreadEvent(ev)) return false;
return ev.thread === filter.thread;
```

**规则**：对 append-only 日志、JSON 流、RPC 载荷或配置文件，创建**唯一所有者**负责：

- event / payload 类型定义
- 从 `unknown` 来的类型守卫与规范化
- UI 命令使用的 metadata projection
- 从事实来源回放状态的 reducer

渲染代码可以格式化字段，但不得重新定义载荷契约。

---

## 跨层功能清单

实现前：

- [ ] 画完完整数据流
- [ ] 识别所有层边界
- [ ] 定义每边界格式
- [ ] 决定校验发生位置

实现后：

- [ ] 用边界情况测过（null、empty、invalid）
- [ ] 验证每边界错误处理
- [ ] 检查数据往返仍完整
- [ ] 检查消费者 import 共享 decoder / projection，而不是本地 cast 载荷字段
- [ ] 检查派生状态指向源事件标识（`seq`、`id`、`version`），而不是发明第二套游标

---

## 跨平台模板一致性

在 Trellis 中，命令模板（如 `record-session.md`）存在于**多个平台**且内容相同或近似。这是跨层边界。

### 清单：修改任何命令模板后

- [ ] 找到所有同名命令平台：`find src/templates/*/commands/trellis/ -name "<command>.*"`
- [ ] 更新所有平台副本（Markdown `.md` 与 TOML `.toml`）
- [ ] 对 Gemini TOML：适配行续写（`\\` vs `\`）与三引号字符串
- [ ] 运行 `/trellis:check-cross-layer` 确认无遗漏

**真实例子**：在 Claude 把 `record-session.md` 改为 `--mode record`，却忘了 iFlow、Kilo、OpenCode、Gemini——被跨层检查抓住。

---

## 生成运行时模板升级一致性

部分生成文件既是文档也是运行时输入。在 Trellis 中，`.trellis/workflow.md` 由 `get_context.py`、`workflow_phase.py`、SessionStart 过滤器与每轮 hook 解析。模板变更必须同时对 fresh init 与 upgrade 路径校验。

### 清单：修改被运行时解析的模板后

- [ ] 识别读该模板的每个运行时解析器，而不只是安装它的写入器
- [ ] 检查相关语法是否落在明显受管区域（如 tag 块）之外
- [ ] 验证 fresh `init` 输出，以及写入旧 `.trellis/.version` 的版本化 `update` 场景
- [ ] 用更旧的原始模板夹具加升级回归，断言安装文件达到当前打包形态
- [ ] 更新拥有运行时契约的后端规范

---

## 版本化文档边界

版本化文档是跨层边界：源路径、`docs.json` 版本路由与渲染的版本选择器必须描述同一发布线。

### 清单：编辑版本化文档前

- [ ] 确认目标发布线：stable、beta 或 RC
- [ ] 确认编辑的 MDX 路径匹配该线：
  - stable：`docs-site/{start,advanced,...}` 与 `docs-site/zh/{start,advanced,...}`
  - beta：`docs-site/beta/**` 与 `docs-site/zh/beta/**`
  - RC：`docs-site/rc/**` 与 `docs-site/zh/rc/**`
- [ ] 确认 `docs.json` 导航把版本标签指到相同路径
- [ ] 提交前对另一棵树 grep 发布线专用术语
- [ ] 把 beta 内容出现在根发布路径视为源路径 bug，而不是渲染 bug

---

## 模式探测清单

当 CLI 通过探测远程资源自动决定模式时（例如检查 `index.json` 是否存在以决定 marketplace vs 直接下载）：

### 实现前：

- [ ] 探测在**所有**使用结果的代码路径运行（交互、`-y`、`--flag` 组合）
- [ ] 区分 404 与瞬时错误——不要都当「未找到」
- [ ] 瞬时错误**中止或重试**，绝不静默切换模式
- [ ] 上下文变化时（如用户切换源）**重置**共享状态（缓存、预取数据）
- [ ] **捷径路径**（如 `--template` 跳过选择器）必须与探测路径同等的错误处理质量

### 实现后：

- [ ] 从探测结果到模式决策分支追踪每条路径——无 fallthrough
- [ ] 外部格式契约（giget URI、原始 URL）有测试或至少注释文档
- [ ] 元数据读取消费完整响应或用流式解析——从不把固定大小前缀当完整 JSON
- [ ] 从解析部分重构复合标识时，验证**所有**字段齐全且位置正确
- [ ] 验证捷径后调用的 action 函数内部没有旧的 catch-all fetch

---

## 何时创建流程文档

在以下情况创建详细流程文档：

- 功能跨 3+ 层
- 多团队参与
- 数据格式复杂
- 功能以前出过 bug

---

## 事件日志 / Projection 边界

Append-only 日志是跨层契约。单个事件路径：

```
CLI input → event writer → events.jsonl → reader → filter → reducer → display
```

### 清单：新增 event kind 或字段后

- [ ] 把 event kind 加入中央事件 taxonomy
- [ ] 在事件层加类型化事件变体或类型守卫
- [ ] 为来自用户输入或 JSON 的数组/对象字段加规范化辅助
- [ ] 仅在 event writer 中分配 `seq` / `id`
- [ ] filter 与 reducer 消费类型化事件守卫，而不是本地 cast
- [ ] 展示代码消费 reducer 输出或类型化事件，而不是原始 JSON
- [ ] 至少加一条回归，证明历史回放与实时过滤使用同一 filter 模型
