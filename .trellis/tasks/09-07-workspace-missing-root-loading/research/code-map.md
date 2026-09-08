# 根数据缺失加载问题：代码证据

基线：`078521a61975e6dc985009850ed9dbe35dc864ec`，2026-09-07 fetch 后的 origin/dev-main。仅保存技术事实，不复制用户文档、现场数据库或 AI 会话。

当前工具列表未提供 codebase-memory 图工具，本次按回退规则使用定向 rg 和源码读取。

## 页面和本地读取

| 锚点                                                                 | 事实                                                     |
| -------------------------------------------------------------------- | -------------------------------------------------------- |
| `packages/common/nbstore/src/frontend/doc.ts:53`                     | ready、loaded、updating 和同步字段含义不同               |
| `packages/common/nbstore/src/frontend/doc.ts:140`                    | 本地与同步流 combineLatest，远程不发值可阻止聚合状态输出 |
| `packages/common/nbstore/src/frontend/doc.ts:224`                    | 主循环异常只 console.error                               |
| `packages/common/nbstore/src/frontend/doc.ts:234`                    | 先等待存储连接                                           |
| `packages/common/nbstore/src/frontend/doc.ts:318`                    | 有效数据才加入 readyDocs；空结果也加入 connectedDocs     |
| `packages/common/nbstore/src/frontend/doc.ts:357`                    | 后续非空更新可使文档 ready                               |
| `packages/common/nbstore/src/utils/is-empty-update.ts:8`             | 复用空 Yjs update 判断                                   |
| `packages/frontend/core/src/desktop/pages/workspace/index.tsx:256`   | 桌面仅订阅根 ready，334 行分支返回 fallback              |
| `packages/frontend/core/src/mobile/pages/workspace/layout.tsx:112`   | 移动同样按 ready gate                                    |
| `packages/frontend/core/src/modules/workspace/entities/engine.ts:78` | 根优先级不代表来源检查完成                               |

## 来源与同步

| 锚点                                                                     | 事实及影响                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `packages/frontend/core/src/modules/workspace-engine/impls/local.ts:237` | 正常创建先写初始数据再登记 ID                                      |
| `packages/frontend/core/src/modules/workspace-engine/impls/local.ts:321` | 登记存在不保证数据仍在                                             |
| `packages/frontend/core/src/modules/workspace-engine/impls/local.ts:490` | 本地配置 v1 来源                                                   |
| `packages/common/nbstore/src/impls/idb/v1/db.ts:23`                      | 旧库不存在返回 null                                                |
| `packages/common/nbstore/src/storage/doc.ts:131`                         | getDoc 合并快照与增量；非 readonly 还可能持久化，UI 不另造探测读取 |
| `packages/common/nbstore/src/sync/doc/peer.ts:232`                       | synced 不是来源枚举完成信号                                        |
| `packages/common/nbstore/src/sync/doc/peer.ts:291`                       | connect 完成才加入 connectedDocs，未发现的根没有该任务             |
| `packages/common/nbstore/src/sync/doc/peer.ts:625`                       | readonly skip 不能证明来源不存在                                   |
| `packages/common/nbstore/src/sync/doc/peer.ts:719`                       | 顺序读取本地、缓存和最新来源时钟                                   |
| `packages/common/nbstore/src/sync/doc/peer.ts:752`                       | 来源登记任务后才可发布枚举完成事实                                 |
| `packages/common/nbstore/src/sync/doc/peer.ts:759`                       | 等相关任务实际完成后再宣告文档来源检查完成                         |
| `packages/common/nbstore/src/sync/doc/index.ts:109`                      | 无来源的单文档状态有立即完成分支                                   |
| `packages/common/nbstore/src/worker/client.ts:327`                       | waitForConnected Promise 被缓存，重新订阅不是重新连接              |
| `packages/common/infra/src/op/client.ts:39`                              | RPC 默认无限等待，需要 UI 自己的有界等待                           |

## 可复用入口

- `packages/frontend/core/src/modules/workspace/index.ts`：scope 注册。
- `packages/frontend/core/src/components/workspace-selector/index.tsx`：显式工作区选择。
- `packages/frontend/core/src/modules/app-sidebar/views/index.tsx:216`：fallback 的 WorkspaceNavigator 带 showSyncStatus。
- `packages/frontend/core/src/components/affine/affine-error-boundary/error-fallbacks/any-error-fallback.tsx:15`：用户点击后 document.location.reload。
- `packages/common/nbstore/src/__tests__/frontend.spec.ts`：fake-indexeddb + 真实 DocFrontend。
- `packages/common/nbstore/src/__tests__/sync.spec.ts`：同步回归。
- `tests/affine-local/playwright.config.ts`：localhost:8080、自动启动 web。
- `packages/frontend/i18n/build.ts`：文案生成。

## 关键约束

用 flavour 而不是工作区名字区分本地与云端。不能仅凭 ready=false、文档数=0、synced=true 或耗时宣告丢失。两个页面共享分类。退出加载不需要写空根文档，更不能通过 resetSync 清除元数据。
