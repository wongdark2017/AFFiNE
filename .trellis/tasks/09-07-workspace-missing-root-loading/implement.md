# 实施与验证计划

状态：2026-09-08 用户确认方案，开始实施。

## 基线

- 工作目录：`/Users/wuchengqi/code/AFFiNE/.worktrees/workspace-missing-root-loading`。
- 分支：`codex/fix-workspace-missing-root-loading`，PR 目标：`dev-main`。
- 已 fetch 基线：`078521a61975e6dc985009850ed9dbe35dc864ec`。
- 原工作区其他未提交改动未带入本工作树。
- 实施阶段独立安装依赖并验证；没有软链接或改动主工作树的 node_modules。

## 执行顺序

### P0 固定失败用例

- [x] 用 fake-indexeddb 和真实 DocFrontend 复现：空根读取完成但 ready=false。
- [x] 复现来源枚举前 synced=true，以及根不在来源中、没有 connect 任务的状态。
- [x] 独立 Playwright context 预置保留登记但根数据缺失的状态；单测另保留并核对其他文档和附件。
- [x] 准备合法空工作区对照组。

### P1 发布完整事实

- [x] 提取独立本地状态，新增读取结果、稳定错误码，主动取消不报错。
- [x] 增加来源枚举和指定文档任务完成信号；区分成功、未结束、错误、readonly skipped。
- [x] 聚合 initialSyncComplete，零来源立即完成、重连重置；旧 Worker 缺少字段视为 unknown。
- [x] 验证旧 ready/synced、数据库/Yjs 协议没有行为改变。

### P2 状态服务

- [x] 新增纯分类器与 WorkspaceRootLoadService，并注册 scope。
- [x] 使用 30,000 ms 默认 deadline、可测试时钟；timer 不依赖流首值、不因 render 重置。
- [x] 实现 ready 优先、迟到数据恢复、attempt 隔离、订阅销毁。
- [x] 覆盖源完成与待应用增量交错的回归。

### P3 页面接入

- [x] 桌面与移动 gate 接入同一服务，共享异常内容。
- [x] 选择器在根未 ready 时仍可用；异常不继续显示 Syncing。
- [x] 点击重新加载才执行既有 reload；显式选择工作区，避免首页回跳。
- [x] 诊断白名单、恢复说明、中英文与 i18n 生成。
- [x] 不增加清库、新建根、同步重置、自动上传或现场恢复动作。

### P4 验证与收尾

- [x] 完成下表的关键单测、时序与页面回归。
- [x] 定向 lint/typecheck，web 构建；共享状态变动检查原生/Electron 类型兼容。
- [x] 审查无隐含修复写入，评估补充 Trellis 错误状态规范。
- 部署：未请求，未执行；后续单独安排。

## 验证矩阵

| 用例 | 条件                                     | 期望                                       |
| ---- | ---------------------------------------- | ------------------------------------------ |
| T01  | 登记存在，根快照/增量/v1 数据均无        | missing-local-root，操作可用               |
| T02  | 仅根快照缺失，增量有效                   | ready                                      |
| T03  | 根合法、目录为空                         | 正常空列表                                 |
| T04  | 现代库空，v1 有根且延迟返回              | 最终 ready，不误判缺失                     |
| T05  | v1 失败、阻塞或仍在枚举                  | error/stalled，不能 missing                |
| T06  | Worker 不回应、流不发值                  | 30 秒后 stalled                            |
| T07  | 云端无缓存、超过 30 秒才返回             | stalled 后自动 ready，不判本地缺失         |
| T08  | 离线云端有可读缓存                       | ready，后台错误不挡内容                    |
| T09  | 读取/解码异常                            | load-error，无敏感异常全文                 |
| T10  | synced=true 但枚举尚未完成               | 不判 missing                               |
| T11  | 根不在任何来源中，没有 connect 任务      | 新完成信号能结束等待                       |
| T12  | 来源完成而根增量仍在应用队列             | 不提前 missing，应用后 ready               |
| T13  | missing/error/stalled 后合法数据到达     | 自动恢复 ready                             |
| T14  | 切换 id/flavour、卸载、StrictMode 重挂载 | 无旧 timer/结果污染和监听泄漏              |
| T15  | 点击 reload、选择另一工作区              | 仅显式动作发生，无 resetSync/delete/初始化 |
| T16  | 根缺失，其他文档/附件仍在                | 其他内容、数量和哈希不受诊断影响           |
| T17  | 复制诊断、中英、移动、键盘               | 白名单与操作可用                           |
| T18  | readonly skipped、旧 Worker 缺字段       | 保守 unknown，必要时 stalled               |

## 实现阶段验证命令

下列命令尚未执行。按仓库 Node 22、Yarn 4.13.0 配置依赖，不软链接其他工作树 node_modules 冒充独立安装。

```bash
yarn install --immutable
yarn test packages/common/nbstore/src/__tests__/frontend.spec.ts packages/common/nbstore/src/__tests__/sync.spec.ts
yarn test packages/frontend/core/src/modules/workspace/utils/root-load-state.spec.ts packages/frontend/core/src/modules/workspace/services/root-load.spec.ts
yarn test packages/frontend/core/src/components/workspace-load-failure/index.spec.tsx
yarn workspace @affine/i18n build
yarn workspace @affine-test/affine-local e2e e2e/workspace-load-failure.spec.ts
yarn affine @affine/web build
```

新增测试路径以最终实现为准。Lint 使用已有 ESLint/oxlint/Prettier 对最终修改文件执行；typecheck 按受影响包 tsconfig 及项目引用执行，不能只检查 UI。

affine-local Playwright 会启动 localhost:8080。移动布局另用现有 mobile 测试入口验证，不能只缩小桌面 viewport。所有故障数据限于独立测试 context，禁止清理真实用户浏览器配置。

## 本次规划验证

交付前核对 HEAD 与 fetched origin/dev-main、任务 JSON/JSONL、引用路径、Markdown 格式和 Git diff。规划阶段验证已完成；用户确认后已进入 in_progress。当前代码与验证完成，2026-09-08 用户已授权提交并推送。未部署。

## 实施记录

- 2026-09-08：用户授权开始修复，保留独立工作树和原基线。

## 最终验证（2026-09-08）

- Node 22.16.0、Yarn 4.13.0；独立 `yarn install --immutable` 成功。
- 红灯：新增底层测试在修复前 8 项失败，既有 9 项通过；受控移动菜单重开测试也先失败后修复。
- 单元/组件：19 个测试文件、91 项测试全部通过（nbstore 全量 + 工作区状态/UI + 移动菜单）。
- 桌面 E2E：3/3；移动 Chrome E2E：2/2。均为独立测试 context 的合成数据。
- `tsc -b packages/frontend/core/tsconfig.json` 及所有引用项目通过。
- 最终变更文件 ESLint、oxlint --deny-warnings 通过。
- i18n 构建通过，Web 正式构建通过，仅 2 项资源/入口体积警告。
- 移动错误页已查看截图，按钮及文本无溢出；初次发现的菜单接线和受控状态问题已修复并复验。
- 本地 E2E 没有启动后端，日志出现 localhost:3010 代理连接拒绝；本地工作区用例仍通过。没有连接或修改现场数据。

实现细节补充：已终止的读取主循环通过用户主动重新加载重启；可恢复的解码/同步错误及迟到数据继续观察。保存逻辑、schema 和本地工作区云同步策略未被修改。
