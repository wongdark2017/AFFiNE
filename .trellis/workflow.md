# 开发工作流

---

## 核心原则

1. **先计划再写代码** — 动手前先想清楚做什么
2. **规范靠注入，不靠记忆** — 指南通过 hook/skill 注入，而不是靠回忆
3. **一切落盘** — 研究、决策、经验都写入文件；对话会被压缩，文件不会
4. **增量开发** — 一次一个任务
5. **沉淀学习** — 每任务结束后复盘，把新知识写回 spec

---

## Trellis 系统

### 开发者身份

首次使用时初始化身份：

```bash
python3 ./.trellis/scripts/init_developer.py <your-name>
```

会创建 `.trellis/.developer`（gitignore）+ `.trellis/workspace/<your-name>/`。

### Spec 系统

`.trellis/spec/` 按包与层存放编码规范。

- `.trellis/spec/<package>/<layer>/index.md` — 入口，含 **开发前清单** + **质量检查**。具体规范在其指向的 `.md` 中。
- `.trellis/spec/guides/index.md` — 跨包思考指南。

```bash
python3 ./.trellis/scripts/get_context.py --mode packages   # 列出包 / 层
```

**何时更新 spec**：发现新模式/约定 · 修 bug 后需固化防复发 · 新的技术决策。

### 任务系统

每个任务在 `.trellis/tasks/{MM-DD-name}/` 下有独立目录，包含 `task.json`、`prd.md`、可选 `design.md`、可选 `implement.md`、可选 `research/`，以及面向 sub-agent 平台的上下文清单（`implement.jsonl`、`check.jsonl`）。

```bash
# 任务生命周期
python3 ./.trellis/scripts/task.py create "<title>" [--slug <name>] [--parent <dir>]
python3 ./.trellis/scripts/task.py start <name>          # 设为活动任务（有会话身份时按会话作用域）
python3 ./.trellis/scripts/task.py current --source      # 显示活动任务与来源
python3 ./.trellis/scripts/task.py finish                # 清除活动任务（触发 after_finish hooks）
python3 ./.trellis/scripts/task.py archive <name>        # 移到 archive/{year-month}/
python3 ./.trellis/scripts/task.py list [--mine] [--status <s>]
python3 ./.trellis/scripts/task.py list-archive

# 代码-规范上下文（通过 JSONL 注入 implement/check agents）
# `implement.jsonl` / `check.jsonl` 在 `task create` 时为 sub-agent 平台种子化；
# AI 在规划阶段按需整理真实的 spec + research 条目。
python3 ./.trellis/scripts/task.py add-context <name> <action> <file> <reason>
python3 ./.trellis/scripts/task.py list-context <name> [action]
python3 ./.trellis/scripts/task.py validate <name>

# 任务元数据
python3 ./.trellis/scripts/task.py set-branch <name> <branch>
python3 ./.trellis/scripts/task.py set-base-branch <name> <branch>    # PR 目标
python3 ./.trellis/scripts/task.py set-scope <name> <scope>

# 层级（父子）
python3 ./.trellis/scripts/task.py add-subtask <parent> <child>
python3 ./.trellis/scripts/task.py remove-subtask <parent> <child>

# 创建 PR
python3 ./.trellis/scripts/task.py create-pr [name] [--dry-run]
```

> 运行 `python3 ./.trellis/scripts/task.py --help` 查看权威、最新命令列表。

**当前任务机制**：`task.py create` 创建任务目录，并在有会话身份时自动设置每会话活动任务指针，使规划面包屑立即生效。`task.py start` 写入同一指针（已设置时幂等），并将 `task.json.status` 从 `planning` 翻为 `in_progress`。状态存在 `.trellis/.runtime/sessions/`。若 hook 输入、`TRELLIS_CONTEXT_ID` 或平台原生会话环境变量均无上下文键，则无活动任务，`task.py start` 会带会话身份提示失败。`task.py finish` 删除当前会话文件（不改 status）。`task.py archive <task>` 写 `status=completed`，目录移到 `archive/`，并删除仍指向该归档任务的运行时会话文件。

### 工作区系统

在 `.trellis/workspace/<developer>/` 下记录每次 AI 会话，便于跨会话跟踪。

- `journal-N.md` — 会话日志。**每文件最多 2000 行**；超出自动创建新的 `journal-(N+1).md`。
- `index.md` — 个人索引（总会话数、最近活跃）。

```bash
python3 ./.trellis/scripts/add_session.py --title "Title" --commit "hash" --summary "Summary"
```

### 上下文脚本

```bash
python3 ./.trellis/scripts/get_context.py                            # 完整会话运行时
python3 ./.trellis/scripts/get_context.py --mode packages            # 可用包 + spec 层
python3 ./.trellis/scripts/get_context.py --mode phase --step <X.Y>  # 某工作流步骤的详细指南
```

---

<!--
  WORKFLOW-STATE BREADCRUMB CONTRACT (read this before editing the tag blocks below)

  The [workflow-state:STATUS] blocks embedded in the ## Phase Index section
  below are the SINGLE source of truth for the per-turn `<workflow-state>`
  breadcrumb that every supported AI platform's UserPromptSubmit hook
  reads. inject-workflow-state.py (Python platforms) and
  inject-workflow-state.js (OpenCode plugin) only parse them — there is no
  fallback dict baked into the scripts after v0.5.0-rc.0.

  STATUS charset: [A-Za-z0-9_-]+. When the hook can't find a tag, it
  degrades to a generic "Refer to workflow.md for current step." line —
  intentionally visible so users notice and fix a broken workflow.md.

  INVARIANT (test/regression.test.ts):
    Every workflow-walkthrough step marked `[required · once]` must have a
    matching enforcement line in its phase's [workflow-state:*] block. The
    breadcrumb is the only per-turn channel; if a mandatory step isn't
    mentioned there, the AI silently skips it (Phase 1 planning gate
    skip and Phase 3.4 commit skip both manifested via this gap).

  TAG ↔ PHASE scoping:
    [workflow-state:no_task]      → no active task; before Phase 1
    [workflow-state:planning]     → all of Phase 1 (status='planning')
    [workflow-state:planning-inline] → Codex inline variant of Phase 1
    [workflow-state:in_progress]  → Phase 2 + Phase 3.1-3.4
                                    (status stays 'in_progress' from
                                    task.py start until task.py archive)
    [workflow-state:in_progress-inline] → Codex inline variant of Phase 2/3
    [workflow-state:completed]    → currently DEAD: cmd_archive flips
                                    status and moves the dir in the same
                                    call, so the resolver loses the
                                    pointer (block kept for a future
                                    explicit in_progress→completed
                                    transition)

  Editing checklist:
    - When you change a [workflow-state:STATUS] block, also check the
      matching phase's `[required · once]` walkthrough steps for sync
    - Run `trellis update` after editing to push the new bodies to
      downstream user projects (block-level managed replacement)
    - Full runtime contract:
      .trellis/spec/cli/backend/workflow-state-contract.md
-->

## 阶段索引

```
Phase 1: Plan    → 分类请求、取得建任务同意，再写规划产物
Phase 2: Execute → 仅在任务状态为 in_progress 后实现
Phase 3: Finish  → 验证、更新 spec、提交并收尾
```

### 请求分流

- 简单对话或小任务：只问本轮是否创建 Trellis 任务。用户说否，则本会话跳过 Trellis。
- 复杂任务：询问是否可创建 Trellis 任务并进入规划。用户说否，不要做大范围内联实现；解释、澄清范围或建议更小拆分。
- 用户同意建任务 ≠ 同意开始实现。仍须先完成规划。

### 规划产物

- `prd.md` — 需求、约束与验收标准。不要写技术设计或执行清单。
- `design.md` — 复杂任务的技术设计：边界、契约、数据流、取舍、兼容性、发布/回滚形态。
- `implement.md` — 复杂任务的执行计划：有序清单、验证命令、评审门、回滚点。
- `implement.jsonl` / `check.jsonl` — sub-agent 上下文的 spec 与 research 清单。它们**不**替代 `implement.md`。
- 轻量任务可仅有 PRD。复杂任务在 `task.py start` 前必须有 `prd.md`、`design.md`、`implement.md`。

### 父子任务树

当一次用户请求包含多个可独立验收的交付物时，使用父任务。父任务拥有源需求集、任务地图、跨子任务验收与最终集成评审；除非父任务本身有直接工作，否则通常不是实现目标。

对可独立规划、实现、检查与归档的交付物使用子任务。父子结构**不是**依赖系统：若一子任务须等另一子任务，在子任务 `prd.md` / `implement.md` 写明顺序，并保持每个子任务验收可测。

用 `task.py create "<title>" --slug <name> --parent <parent-dir>` 创建子任务。用 `task.py add-subtask <parent> <child>` 链接已有任务，用 `task.py remove-subtask <parent> <child>` 解除错误链接。

<!-- Per-turn breadcrumb: shown when there is no active task (before Phase 1) -->

[workflow-state:no_task]
无活动任务。先对本轮分类，并在创建任何 Trellis 任务前取得建任务同意。
简单对话 / 小任务：只问本轮是否创建 Trellis 任务。用户说否，则本会话跳过 Trellis。
复杂任务：询问用户是否可创建 Trellis 任务并进入规划阶段。用户说否，则解释、澄清范围或建议更小拆分。
[/workflow-state:no_task]

### Phase 1: Plan

- 1.0 创建任务 `[required · once]`（仅在取得建任务同意后）
- 1.1 需求探索 `[required · repeatable]`（`prd.md`；复杂任务还需要 `design.md` + `implement.md`）
- 1.2 研究 `[optional · repeatable]`
- 1.3 配置上下文 `[conditional · once]` — Claude Code, Cursor, OpenCode, Codex, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi
- 1.4 激活任务 `[required · once]`（评审门后 `task.py start`；status → in_progress）
- 1.5 完成标准

<!-- Per-turn breadcrumb: shown throughout Phase 1 (status='planning') -->

[workflow-state:planning]
加载 `trellis-brainstorm`；保持在规划阶段。
轻量：`prd.md` 可能足够。复杂：完成 `prd.md`、`design.md`、`implement.md`；在 `task.py start` 前请用户评审。
多交付物范围：考虑父任务 + 可独立验收的子任务；依赖必须写在子任务产物中，不能靠树位置暗示。
Sub-agent 模式：start 前整理 `implement.jsonl` 与 `check.jsonl` 作为 spec/research 清单。
[/workflow-state:planning]

<!-- Per-turn breadcrumb: shown throughout Phase 1 when codex.dispatch_mode=inline.
     Codex-only opt-in alternate to [workflow-state:planning]. The main agent
     edits code directly in Phase 2, so jsonl curation is skipped —
     the inline workflow loads `trellis-before-dev` instead of injecting JSONL
     into a sub-agent. -->

[workflow-state:planning-inline]
加载 `trellis-brainstorm`；保持在规划阶段。
轻量：`prd.md` 可能足够。复杂：完成 `prd.md`、`design.md`、`implement.md`；在 `task.py start` 前请用户评审。
多交付物范围：考虑父任务 + 可独立验收的子任务；依赖必须写在子任务产物中，不能靠树位置暗示。
Inline 模式：跳过 jsonl 整理；Phase 2 通过 `trellis-before-dev` 读取产物/规范。
[/workflow-state:planning-inline]

### Phase 2: Execute

- 2.1 实现 `[required · repeatable]`
- 2.2 质量检查 `[required · repeatable]`
- 2.3 回滚 `[on demand]`

<!-- Per-turn breadcrumb: shown while status='in_progress'.
     Scope: all of Phase 2 + Phase 3.1-3.4 (status stays 'in_progress' from
     task.py start until task.py archive; only archive flips it). The body
     therefore must cover every required step from implementation through
     commit, including Phase 3.3 spec update and Phase 3.4 commit. -->

Sub-agent 分发协议适用于所有平台与所有 sub-agent，包括 class-2 的 Codex/Copilot/Gemini/Qoder 与 `trellis-research`：每个分发 prompt 以 `Active task: <task path from task.py current>` 开头，再写角色说明。

[workflow-state:in_progress]
工具：`trellis-implement` / `trellis-research` 仅是 sub-agent 类型（Task/Agent 工具，不是 Skill；没有同名 skill）。`trellis-update-spec` 是 skill。`trellis-check` 两者都有；代码变更后的验证优先用 Agent 形态。
流程：`trellis-implement` -> `trellis-check` -> `trellis-update-spec` -> commit（Phase 3.4）-> `/trellis:finish-work`。
主会话默认：分发 implement/check sub-agent。Sub-agent 自免：若已是 `trellis-implement`，不要再 spawn 另一个 `trellis-implement` 或 `trellis-check`；若已是 `trellis-check`，不要再 spawn 另一个 `trellis-check` 或 `trellis-implement`。分发仅主会话。
分发 prompt 以 `Active task: <task path from task.py current>` 开头。读上下文：jsonl 条目 -> `prd.md` -> `design.md if present` -> `implement.md if present`。
[/workflow-state:in_progress]

<!-- Per-turn breadcrumb: shown while status='in_progress' when
     codex.dispatch_mode=inline. Codex-only opt-in alternate to
     [workflow-state:in_progress]. The main session edits code directly
     instead of dispatching sub-agents. -->

[workflow-state:in_progress-inline]
流程：`trellis-before-dev` -> 编辑 -> `trellis-check` -> 验证 -> `trellis-update-spec` -> commit（Phase 3.4）-> `/trellis:finish-work`。
Inline 模式不要分发 implement/check sub-agent。
读上下文：`prd.md` -> `design.md if present` -> `implement.md if present`，外加 skill 加载的相关 spec/research。
[/workflow-state:in_progress-inline]

### Phase 3: Finish

- 3.1 质量验证 `[required · repeatable]`
- 3.2 调试复盘 `[on demand]`
- 3.3 Spec 更新 `[required · once]`
- 3.4 提交变更 `[required · once]`
- 3.5 收尾提醒

<!-- Per-turn breadcrumb: shown while status='completed'.
     Currently DEAD in normal flow: cmd_archive writes status='completed' in
     the same call that moves the task dir to archive/, so the active-task
     resolver loses the pointer and the hook never fires on archived tasks.
     Block preserved for a future status-transition redesign (e.g. an
     explicit in_progress→completed command). Edit through the same spec
     channel as the live blocks. -->

[workflow-state:completed]
代码已提交。运行 `/trellis:finish-work`；若工作区仍脏，先回到 Phase 3.4。
[/workflow-state:completed]

### 规则

1. 先判断自己在哪个 Phase，再从该处下一步继续
2. 每 Phase 内按序执行；`[required]` 步骤不可跳过
3. Phase 可回退（例如 Execute 发现 prd 缺陷 → 回 Plan 修复，再进 Execute）
4. 标了 `[once]` 的步骤若输出已存在则跳过；不要重跑
5. 产物是否存在影响下一步；轻量任务缺少 `design.md` / `implement.md` 合法，复杂任务则表示规划未完成。

### 活动任务路由

在活动任务内，当用户请求匹配下列意图时，先路由，再按需加载详细 phase 步骤。

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

- 规划或需求不清 -> `trellis-brainstorm`。
- `in_progress` 实现/检查 -> 分发 `trellis-implement` / `trellis-check`。
- 反复调试 -> `trellis-break-loop`；规范更新 -> `trellis-update-spec`。

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

[codex-inline, Kilo, Antigravity, Windsurf]

- 规划或需求不清 -> `trellis-brainstorm`。
- 编辑前 -> `trellis-before-dev`；编辑后 -> `trellis-check`。
- 反复调试 -> `trellis-break-loop`；规范更新 -> `trellis-update-spec`。

[/codex-inline, Kilo, Antigravity, Windsurf]

### 护栏

- 建任务批准 ≠ 实现批准；实现须在产物评审后的 `task.py start` 之后。
- 轻量任务可仅有 PRD；复杂任务需要 `design.md` + `implement.md`。
- 规划必须落到任务产物；报告完成前必须跑检查。

### 加载步骤详情

每步运行以下命令获取详细指南：

```bash
python3 ./.trellis/scripts/get_context.py --mode phase --step <step>
# 例：python3 ./.trellis/scripts/get_context.py --mode phase --step 1.1
```

---

## Phase 1: Plan

目标：分类请求，需要任务时取得建任务同意，并在实现前产出所需规划产物。

#### 1.0 创建任务 `[required · once]`

仅在取得建任务同意后创建任务目录。命令将 status 设为 `planning`，写 `task.json`，创建默认 `prd.md`，并在有会话身份时自动指向新任务：

```bash
python3 ./.trellis/scripts/task.py create "<task title>" --slug <name>
```

`--slug` 只是人类可读名。**不要**包含 `MM-DD-` 日期前缀；`task.py create` 会自动加。

对任务树：先建父任务，再用 `--parent <parent-dir>` 建每个子任务。不要因为有子任务就 start 父任务；start 拥有下一个可独立验收交付物的子任务。

命令成功后，每轮面包屑自动切到 `[workflow-state:planning]`，提示 AI 留在规划。

此处只跑 `create` — 不要同时 `start`。`start` 会把 status 翻到 `in_progress`，在规划产物评审前把面包屑切到实现阶段。把 `start` 留给步骤 1.4。

若 `python3 ./.trellis/scripts/task.py current --source` 已指向任务则跳过。

#### 1.1 需求探索 `[required · repeatable]`

加载 `trellis-brainstorm` skill，按 skill 指引与用户交互探索需求。

brainstorm skill 会引导你：

- 一次只问一个问题
- 优先研究而非问用户
- 优先给选项而非开放题
- 用户每答一次立即更新 `prd.md`
- 大范围拆成父任务 + 可独立验收的子任务
- 让 `prd.md` 聚焦需求与验收
- 复杂任务在实现前产出 `design.md` 与 `implement.md`

考虑父子拆分时：

- 一次请求含多个可独立验收交付物 → 用父任务。
- 父任务拥有源需求、子任务映射、跨子验收与最终集成评审。
- 子任务拥有可独立规划/实现/检查/归档的实际交付物。
- 父子结构不是依赖系统。若 B 依赖 A，写在 B 的 `prd.md` / `implement.md`。
- start 拥有下一交付物的子任务。父任务无直接实现工作则不要 start 父任务。

需求变化时回到本步并修订相关产物。

#### 1.2 研究 `[optional · repeatable]`

研究可在需求探索任意时刻发生。不限于本地代码——可用任何工具（MCP、skills、网页搜索等）查外部信息，包括第三方库文档、业界实践、API 参考等。

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

Spawn research sub-agent：

- **Agent type**：`trellis-research`
- **Task description**：Research <specific question>
- **Key requirement**：研究输出**必须**落盘到 `{TASK_DIR}/research/`

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

[codex-inline, Kilo, Antigravity, Windsurf]

在主会话直接研究，并把发现写入 `{TASK_DIR}/research/`。（对 `codex-inline`，这可避免 `fork_turns="none"` 隔离导致 `trellis-research` sub-agent 无法解析活动任务路径。）

[/codex-inline, Kilo, Antigravity, Windsurf]

**研究产物约定**：

- 每主题一个文件（如 `research/auth-library-comparison.md`）
- 在文件中记录第三方库用法示例、API 参考、版本约束
- 记下之后要用的相关 spec 路径

Brainstorm 与 research 可自由穿插——暂停研究技术问题，再回到与用户对话。

**关键原则**：研究输出必须写文件，不能只留在聊天。对话会被压缩；文件不会。

#### 1.3 配置上下文 `[required · once]`

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

整理 `implement.jsonl` 与 `check.jsonl`，使 Phase 2 sub-agent 获得正确的 spec/research 上下文。这些文件在 `task create` 时用单行自描述 `_example` 种子化；你的工作是填入真实条目。

**位置**：`{TASK_DIR}/implement.jsonl` 与 `{TASK_DIR}/check.jsonl`（已存在）。

**格式**：每行一个 JSON 对象 — `{"file": "<path>", "reason": "<why>"}`。路径相对仓库根。

**应放入**：

- **Spec 文件** — 与本任务相关的 `.trellis/spec/<package>/<layer>/index.md` 与具体指南（`error-handling.md` 等）
- **Research 文件** — sub-agent 需查阅的 `{TASK_DIR}/research/*.md`

**不要放入**：

- 代码文件（`src/**`、`packages/**/*.ts` 等）— 由 sub-agent 实现时读取，不在此预注册
- 即将修改的文件 — 同理

**两个文件如何分工**：

- `implement.jsonl` → implement sub-agent 正确写代码所需的 specs + research
- `check.jsonl` → check sub-agent 的 specs（质量指南、检查约定，必要时同一 research）

这些清单不替代 `implement.md`。`implement.md` 是复杂任务的人类可读执行计划；jsonl 只列要注入/加载的上下文文件。

**如何发现相关 specs**：

```bash
python3 ./.trellis/scripts/get_context.py --mode packages
```

列出每个包及其 spec 层路径。挑选匹配本任务领域的条目。

**如何追加条目**：

直接在编辑器改 jsonl，或：

```bash
python3 ./.trellis/scripts/task.py add-context "$TASK_DIR" implement "<path>" "<reason>"
python3 ./.trellis/scripts/task.py add-context "$TASK_DIR" check "<path>" "<reason>"
```

有真实条目后可删种子 `_example` 行（可选——消费者会自动跳过）。

跳过条件：`implement.jsonl` 与 `check.jsonl` 已有 agent 整理的条目（仅种子行不算）。

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

[codex-inline, Kilo, Antigravity, Windsurf]

跳过本步。上下文由 Phase 2 的 `trellis-before-dev` skill 直接加载。

[/codex-inline, Kilo, Antigravity, Windsurf]

#### 1.4 激活任务 `[required · once]`

产物评审后，将任务状态翻为 `in_progress`：

```bash
python3 ./.trellis/scripts/task.py start <task-dir>
```

轻量任务可能仅需 `prd.md`。复杂任务 start 前必须存在并评审 `prd.md`、`design.md`、`implement.md`。在 sub-agent 平台上，需要额外 spec/research 时整理 jsonl；仅种子清单可被消费者容忍。

命令成功后，面包屑自动切到 `[workflow-state:in_progress]`，随后进入 Phase 2 / 3。

若 `task.py start` 因会话身份报错（hook 输入、`TRELLIS_CONTEXT_ID` 或平台原生会话环境无上下文键），按错误提示配置会话身份后重试。

#### 1.5 完成标准

| 条件                                           | 必需 |
| ---------------------------------------------- | :--: |
| 存在 `prd.md`                                  |  ✅  |
| 用户确认任务可进入实现                         |  ✅  |
| 已运行 `task.py start`（status = in_progress） |  ✅  |
| `research/` 有产物（复杂任务）                 | 推荐 |
| 存在 `design.md`（复杂任务）                   |  ✅  |
| 存在 `implement.md`（复杂任务）                |  ✅  |

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

| 需要额外 spec/research 时已整理 `implement.jsonl` / `check.jsonl` | 推荐 |

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

---

## Phase 2: Execute

目标：把已评审规划产物变成通过质量检查的代码。

#### 2.1 实现 `[required · repeatable]`

[Claude Code, Cursor, OpenCode, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

Spawn implement sub-agent：

- **Agent type**：`trellis-implement`
- **Task description**：按已评审任务产物实现，查阅 `{TASK_DIR}/research/`；最后跑项目 lint 与 type-check
- **Dispatch prompt guard**：告知被 spawn 的 agent 自己已是 `trellis-implement`，必须直接实现，不要再 spawn 另一个 `trellis-implement` / `trellis-check`。

平台 hook/plugin 自动处理：

- 读 `implement.jsonl` 并把引用的 spec/research 注入 agent prompt
- 注入 `prd.md`，若有则 `design.md`，若有则 `implement.md`

[/Claude Code, Cursor, OpenCode, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

[codex-sub-agent]

Spawn implement sub-agent：

- **Agent type**：`trellis-implement`
- **Task description**：按已评审任务产物实现，查阅 `{TASK_DIR}/research/`；最后跑项目 lint 与 type-check
- **Dispatch prompt guard**：prompt **必须**以 `Active task: <task path>` 开头，再明确说明自己已是 `trellis-implement`，直接实现，不要再 spawn 另一个 `trellis-implement` / `trellis-check`。

Codex sub-agent 定义自动处理上下文加载：

- 用 `task.py current --source` 解析活动任务，再读 `prd.md`，若有则 `design.md`，若有则 `implement.md`
- 读 `implement.jsonl`，要求 agent 编码前加载每个引用的 spec/research 文件

[/codex-sub-agent]

[Kiro]

Spawn implement sub-agent：

- **Agent type**：`trellis-implement`
- **Task description**：按已评审任务产物实现，查阅 `{TASK_DIR}/research/`；最后跑项目 lint 与 type-check
- **Dispatch prompt guard**：告知被 spawn 的 agent 自己已是 `trellis-implement`，必须直接实现，不要再 spawn 另一个 `trellis-implement` / `trellis-check`。

平台 prelude 自动处理上下文加载：

- 读 `implement.jsonl` 并注入引用的 spec/research
- 注入 `prd.md`，若有则 `design.md`，若有则 `implement.md`

[/Kiro]

[codex-inline, Kilo, Antigravity, Windsurf]

1. 加载 `trellis-before-dev` skill 读取项目指南
2. 读 `{TASK_DIR}/prd.md`，若有则 `design.md`，若有则 `implement.md`
3. 查阅 `{TASK_DIR}/research/`
4. 按已评审产物实现代码
5. 跑项目 lint 与 type-check

[/codex-inline, Kilo, Antigravity, Windsurf]

#### 2.2 质量检查 `[required · repeatable]`

[Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

Spawn check sub-agent：

- **Agent type**：`trellis-check`
- **Task description**：对照 specs 与任务产物评审全部代码变更；直接修复发现项；确保 lint 与 type-check 通过
- **Dispatch prompt guard**：告知自己已是 `trellis-check`，必须直接评审/修复，不要再 spawn 另一个 `trellis-check` / `trellis-implement`。

check agent 职责：

- 对照 specs 评审代码变更
- 对照 `prd.md`，若有则 `design.md`，若有则 `implement.md` 评审
- 自动修复发现的问题
- 跑 lint 与 typecheck 验证

[/Claude Code, Cursor, OpenCode, codex-sub-agent, Kiro, Gemini, Qoder, CodeBuddy, Copilot, Droid, Pi]

[codex-inline, Kilo, Antigravity, Windsurf]

加载 `trellis-check` skill 并按其指引验证：

- Spec 合规
- lint / type-check / tests
- 跨层一致性（变更跨层时）

有问题 → 修复 → 再检查，直到绿灯。

[/codex-inline, Kilo, Antigravity, Windsurf]

#### 2.3 回滚 `[on demand]`

- `check` 暴露 prd 缺陷 → 回 Phase 1，修 `prd.md`，再做 2.1
- 实现走偏 → 回退代码，重做 2.1
- 需要更多研究 → research（同 Phase 1.2），发现写入 `research/`

---

## Phase 3: Finish

目标：确保代码质量，沉淀经验，记录工作。

#### 3.1 质量验证 `[required · repeatable]`

加载 `trellis-check` skill 做最终验证：

- Spec 合规
- lint / type-check / tests
- 跨层一致性（变更跨层时）

有问题 → 修复 → 再检查，直到绿灯。

#### 3.2 调试复盘 `[on demand]`

若本任务反复调试（同一问题修多次），加载 `trellis-break-loop` skill 以：

- 分类根因
- 解释为何此前修复失败
- 提出预防

目标是沉淀调试经验，避免同类问题复发。

#### 3.3 Spec 更新 `[required · once]`

加载 `trellis-update-spec` skill，评估本任务是否产生值得记录的新知识：

- 新发现的模式或约定
- 踩过的坑
- 新的技术决策

相应更新 `.trellis/spec/` 下文档。即便结论是「无需更新」，也要走完判断。

#### 3.4 提交变更 `[required · once]`

AI 驱动对本任务代码变更的分批提交，以便之后 `/finish-work` 干净运行。目标：先产出工作 commits，再做簿记（archive + journal）commits — 绝不交错。

**逐步**：

1. **检查脏状态**：

   ```bash
   git status --porcelain
   ```

   快照每个脏路径。若工作区干净，跳到 3.5。

2. **从近期历史学习提交风格**（使拟文案融入）：

   ```bash
   git log --oneline -5
   ```

   注意前缀约定（`feat:` / `fix:` / `chore:` / `docs:` ...）、语言（中文/English）、长度风格。

3. **将脏文件分为两组**：
   - **本会话 AI 编辑** — 你通过 Edit/Write/Bash 在本会话写/改过的文件。你知道改了什么、为何。
   - **未识别** — 本会话未触碰的脏文件（可能是用户手改、上会话 WIP 或无关工作）。不要静默纳入。

4. **起草提交计划**。把 AI 编辑文件按逻辑分组（每个连贯变更单元 1 个 commit，不是每文件 1 个）。每项：`<commit message>` + 文件列表。未识别文件单独列在底部。

5. **一次性展示计划并请求确认**。格式：

   ```
   Proposed commits (in order):
     1. <message>
        - <file>
        - <file>
     2. <message>
        - <file>

   Unrecognized dirty files (NOT in any commit — confirm include/exclude):
     - <file>
     - <file>

   Reply 'ok' / '行' to execute. Reply with edits, or '我自己来' / 'manual' to abort.
   ```

6. **确认后**：按序对每批 `git add <files>` + `git commit -m "<msg>"`。不要 amend。不要 push。

7. **拒绝时**（用户回「不行」/「我自己来」/「manual」或对计划有异议）：停止。不要再出第二套计划。用户手提交；确认后你跳到 3.5。

**规则**：

- 任何地方都不要 `git commit --amend` — 三阶段三提交流（工作 commits → archive commit → journal commit）。
- 本步永不 push 远程。
- 若用户只改文案但接受文件分组，改文案再确认一次；若拒绝分组，退出到手动模式。
- 分批计划是一次提示；不要每个 commit 单独问。

#### 3.5 收尾提醒

完成后提醒用户可运行 `/finish-work` 收尾（归档任务、记录会话）。

---

## 定制 Trellis（面向 fork）

本节面向想修改 Trellis 工作流本身的开发者。所有定制通过编辑本文件完成；脚本只是解析器。

### 改变某步骤含义

编辑上方 Phase 1 / 2 / 3 中对应步骤的 walkthrough 正文。关键不变量：

- 无活动任务时必须先分流并取得建任务同意，再创建 Trellis 任务。
- 规划必须区分仅 PRD 的轻量任务与 start 前需要 `prd.md`、`design.md`、`implement.md` 的复杂任务。
- 每条必需执行路径都必须在 `/trellis:finish-work` 前可到达 Phase 3.4 提交提醒。

所有 tag 块位于上方 `## 阶段索引` 节，紧跟各 phase 摘要：

| 作用域                            | 对应 tag                                                      |
| --------------------------------- | ------------------------------------------------------------- |
| 无活动任务（Phase 1 前）          | `[workflow-state:no_task]`（ASCII 图后）                      |
| 整个 Phase 1（已建任务 → 可实现） | `[workflow-state:planning]`（Phase 1 摘要后）                 |
| Codex inline Phase 1              | `[workflow-state:planning-inline]`                            |
| Phase 2 + Phase 3.1–3.4           | `[workflow-state:in_progress]`（Phase 2 摘要后）              |
| Codex inline Phase 2 + 3.1–3.4    | `[workflow-state:in_progress-inline]`                         |
| Phase 3.5 后（已归档）            | `[workflow-state:completed]`（Phase 3 摘要后；**当前 DEAD**） |

### 改变每轮提示文案

直接编辑对应 `[workflow-state:STATUS]` 块正文。编辑后运行 `trellis update`（若你是模板维护者）或重启 AI 会话（若只定制自己的项目）— 无需改脚本。

### 添加自定义 status

添加新块：

```
[workflow-state:my-status]
your per-turn prompt text
[/workflow-state:my-status]
```

约束：

- STATUS 字符集：`[A-Za-z0-9_-]+`（允许下划线与连字符，如 `in-review`、`blocked-by-team`）
- 生命周期 hook 必须把 `task.json.status` 写成你的自定义值，否则 tag 永不被读
- 生命周期 hooks 在 `task.json.hooks.after_*`，绑定 `after_create / after_start / after_finish / after_archive` 之一

### 添加生命周期 hook

在 `task.json` 加 `hooks` 字段：

```json
{
  "hooks": {
    "after_finish": ["your-script-or-command-here"]
  }
}
```

支持事件：`after_create / after_start / after_finish / after_archive`。注意 `after_finish` ≠ 状态变更（只清活动任务指针）；「任务完成」通知用 `after_archive`。

### 完整契约

工作流状态机运行时契约、所有 status writer 位置、伪状态（`no_task` / `stale_<source_type>`）、hook 可达性矩阵等深层细节见：

- `.trellis/spec/cli/backend/workflow-state-contract.md` — 运行时契约 + writer 表 + 测试不变量
- `.trellis/scripts/inject-workflow-state.py` — 实际解析器（只读 workflow.md，无内嵌文本）
