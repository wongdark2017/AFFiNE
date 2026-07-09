# 代码复用思考指南

> **目的**：写新代码前停下来想——是否已经存在？

---

## 问题

**重复代码是不一致 bug 的头号来源。**

复制粘贴或重写已有逻辑时：

- 修 bug 不会传播
- 行为会随时间分叉
- 代码库更难理解

---

## 写新代码之前

### 步骤 1：先搜索

```bash
# 搜索相似函数名
grep -r "functionName" .

# 搜索相似逻辑
grep -r "keyword" .
```

### 步骤 2：问这些问题

| 问题                   | 若是…               |
| ---------------------- | ------------------- |
| 是否已有相似函数？     | 使用或扩展它        |
| 别处是否用过该模式？   | 跟随现有模式        |
| 能否做成共享工具？     | 在正确位置创建      |
| 是否在从另一文件复制？ | **停下** — 抽到共享 |

---

## 常见重复模式

### 模式 1：复制粘贴函数

**坏**：把校验函数复制到另一文件

**好**：抽到共享工具，需要处 import

### 模式 2：相似组件

**坏**：新建与现有 80% 相似的组件

**好**：用 props/variants 扩展现有组件

### 模式 3：重复常量

**坏**：在多个文件定义同一常量

**好**：单一事实来源，处处 import

### 模式 4：重复的载荷字段提取

**坏**：多个消费者本地 cast 同一 JSON/事件字段：

```typescript
const description = (ev as { description?: string }).description;
const context = (ev as { context?: ContextEntry[] }).context;
```

即便只有两行，这也是重复的契约逻辑。每个消费者都有自己的「合法载荷」定义。

**好**：把 decoder、类型守卫或 projection 放在数据所有者旁：

```typescript
if (isThreadEvent(ev)) {
  renderThreadEvent(ev);
}
```

**规则**：同一未类型化载荷字段在 2+ 处被读时，在加第三个 reader 前先做共享类型守卫 / 规范化 / projection。

---

## 何时抽象

**抽象当**：

- 相同代码出现 3+ 次
- 逻辑复杂到可能有 bug
- 多人可能需要

**不要抽象当**：

- 只用一次
- 平凡一行
- 抽象比重复更复杂

---

## 批量修改之后

对多文件做了相似改动时：

1. **复查**：是否覆盖全部实例？
2. **搜索**：用 grep 找遗漏
3. **考虑**：是否应抽象？

### Reducer 应使用穷尽结构

当状态由类似 action 的值（`action`、`kind`、`status`、`phase`）派生时，优先单一 `switch` 的 reducer，而不是散落的 `if/else`。

```typescript
// 坏 — 按 action 的状态转移难以审计
if (action === "opened") { ... }
else if (action === "comment") { ... }
else if (action === "status") { ... }

// 好 — 一个 reducer 拥有转移表
switch (event.action) {
  case "opened":
    ...
    return;
  case "comment":
    ...
    return;
}
```

当事件日志是事实来源时这很重要。Reducer 是文档化的回放模型；展示代码与命令不应复制该回放模型的碎片。

---

## 提交前清单

- [ ] 搜索过已有相似代码
- [ ] 无应共享却复制粘贴的逻辑
- [ ] 无在共享 decoder 外重复的未类型化载荷字段提取
- [ ] 常量定义在一处
- [ ] 相似模式结构一致
- [ ] reducer/action 转移集中在一个 reducer 或命令分发器

---

## 坑：Python if/elif/else 无穷尽检查

**问题**：Python 的 if/elif/else 链没有编译期穷尽检查。给 `Literal` 类型（如 `Platform`）加新值时，现有链会静默落入 `else` 并带错误默认值。

**症状**：新平台部分可用——部分方法返回 Claude 默认而不是平台特定值。不报错。

**示例**（`cli_adapter.py`）：

```python
# 坏："gemini" 落入 else，返回 "claude"
@property
def cli_name(self) -> str:
    if self.platform == "opencode":
        return "opencode"
    else:
        return "claude"  # gemini 静默变成 "claude"！

# 好：每个平台显式分支
@property
def cli_name(self) -> str:
    if self.platform == "opencode":
        return "opencode"
    elif self.platform == "gemini":
        return "gemini"
    else:
        return "claude"
```

**预防**：给 Python `Literal` 加新值时，搜索所有按该类型分支的 if/elif/else，并加显式分支。不要依赖 `else` 对新值仍正确。

---

## 坑：不对称机制产出相同文件集

**问题**：两种机制须产出同一文件集时（如 init 递归目录复制 vs update 手动 `files.set()`），结构变化（重命名、移动、加子目录）只会通过自动机制传播。手动路径静默漂移。

**症状**：init 完美，但 update 路径错误或漏文件。

**预防**：

- **最佳**：消除不对称——让手动路径调用自动路径（如 `collectTemplateFiles()` 调 `getAllScripts()` 而不是维护自有列表）
- **若不可避免**：加回归测试比较两种机制输出
- 迁移目录结构时，搜索所有引用旧结构的代码路径

**真实例子**：`trellis update` 曾对手工 `files.set()` 列表维护 11 个脚本，而 `getAllScripts()` 已跟踪它们。修复：用 `for..of getAllScripts()` 替换手动列表。见 v0.4.0-beta.3 的 `update.ts` 重构。

---

## 模板文件注册（Trellis 专用）

向 `src/templates/trellis/scripts/` 加新文件时：

**单一注册点**：`src/templates/trellis/index.ts`

1. 添加 `export const xxxScript = readTemplate("scripts/path/file.py");`
2. 加入 `getAllScripts()` Map

即可。`commands/update.ts` 直接用 `getAllScripts()` — 无需手动同步。

**为何重要**：未在 `getAllScripts()` 注册时，`trellis update` 不会把文件同步到用户项目。修 bug 与功能无法传播。

**历史**：v0.4.0-beta.3 前，`update.ts` 有自己手维列表，常与 `getAllScripts()` 不同步，导致 `trellis update` 静默跳过 11 个 Python 文件。修复是删除重复列表，以 `getAllScripts()` 为单一事实来源。

### 新脚本速查

```bash
# 添加新 .py 后，确认已在 getAllScripts()：
grep -l "newFileName" src/templates/trellis/index.ts  # 应匹配
```

### 模板同步约定

`.trellis/scripts/`（本仓库自用）与 `packages/cli/src/templates/trellis/scripts/`（模板）必须保持一致。改完 `.trellis/scripts/` 后始终同步：

```bash
rsync -av --delete --exclude='__pycache__' .trellis/scripts/ packages/cli/src/templates/trellis/scripts/
```

**坑**：rsync 源/目标写反会产生嵌套垃圾目录（如 `.trellis/scripts/packages/cli/...`）。运行前务必核对路径。
