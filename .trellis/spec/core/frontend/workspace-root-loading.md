# 工作区根文档加载合约

## 1. 适用范围与触发条件

桌面/移动工作区入口在根文档可用前使用此合约。工作区 ID 在列表中不代表本地数据仍然存在；合法空工作区也不能按文档数量判为损坏。

来源：`packages/common/nbstore/src/frontend/doc.ts`、`sync/doc/{peer,index}.ts`，以及 core 的 `modules/workspace/{services/root-load,utils/root-load-state}.ts`。

## 2. 签名

- `DocFrontend.localDocState$(docId): Observable<LocalDocLoadState>`：独立的本地事实流，不等待远程先发值。
- `DocFrontend.docState$(docId): Observable<DocFrontendDocState>`：保留已有同步字段，新增可选 `initialSyncComplete`。
- `WorkspaceRootLoadService.state$`：`loading | ready | missing-local-root | load-error | stalled`。
- `WorkspaceRootLoadService.getDiagnostics()`：返回经过白名单选择的诊断字段。

## 3. 数据与生命周期合约

- `loaded` 表示本地读取阶段完成；`ready` 表示有效 Yjs 数据已经应用。空读取可以 loaded=true/ready=false。
- `initialRead` 为 pending/empty/nonempty/failed。读取与解码失败只向产品状态发布固定 code/phase，不能把原始异常或正文用于界面诊断。
- 初始来源枚举结束、文档相关任务结束、没有重试/错误后，peer 才发布 `initialSyncComplete=true`。根不在任何来源里时也必须能结束检查，不能等待永远不会产生的 connect 任务。
- 零来源可立即完成。Readonly skipped 和旧 Worker 缺少字段不证明已检查，必须保守视为未完成。
- `synced` 仍是旧同步状态，不是缺失数据的判据。
- 工作区服务属于当前 workspace scope，销毁时清理订阅与 timer。30 秒 deadline 不因普通 render/状态更新重置，也不取消后台数据读取。
- 已 ready 的可读内容优先于后台同步错误。Missing/stalled、同步错误及可恢复的解码错误后，迟到数据可使页面自动恢复；本地读取主循环已终止的错误使用用户点击重新加载来重新启动。
- 不新增根初始化、清库、删除登记、同步元数据 reset 或自动上传动作。

## 4. 验证与错误矩阵

| 条件                                                      | 状态                                                     |
| --------------------------------------------------------- | -------------------------------------------------------- |
| 根有效，包括空目录                                        | ready                                                    |
| 明确连接/读取/解码错误且根不可用                          | load-error：connection_failed/read_failed/invalid_update |
| 来源有错误且根不可用                                      | load-error：sync_failed                                  |
| local 非分享、empty、loaded、无待应用更新、所有来源已完成 | missing-local-root                                       |
| 来源未知、旧库正在迁移、Worker 不回应且等待不足 30 秒     | loading                                                  |
| 等待 30 秒后仍不能判断                                    | stalled，不宣称文档丢失                                  |
| 云端缓存为空                                              | 不得进入 missing-local-root                              |

## 5. Good / Base / Bad

- **Good**：现代库空但 v1 有根，等待真实迁移应用后 ready。
- **Base**：已登记本地工作区的根在全部已检查来源中缺失，显示可操作的错误页。
- **Bad**：直接用 synced=true 或 30 秒超时断言丢失；把空读取标记 ready；错误页跳首页又按 last_workspace_id 回到坏工作区。

## 6. 必须保留的测试

- `nbstore/src/__tests__/root-load.spec.ts`：真实 IndexedDB 读取、真实 v1 迁移、完成前不能判缺失、解码失败不变 ready、迟到数据、readonly skipped。
- `core/src/modules/workspace/utils/root-load-state.spec.ts`：计时不依赖流首值、不误判云端、晚到数据、销毁、诊断白名单。
- `core/src/components/workspace-load-failure/index.spec.tsx`：重载只在点击后触发，复制失败不泄露原始错误，恢复建议可见。
- `tests/affine-local/e2e/workspace-load-failure.spec.ts`：实际错误入口、显式切换健康工作区、Worker 无响应超时。
- `tests/affine-mobile/e2e/workspace-load-failure.spec.ts`：移动入口及正常/异常工作区选择器。

## 7. 错误与正确写法

```ts
// 错误：把“读取完毕”当作“有数据”，或者把无限等待当作错误处理。
if (loaded) ready = true;
if (!ready) return loadingForever;

// 正确：ready 含义不变，工作区层结合读取事实、来源覆盖与独立 deadline。
const state = classifyWorkspaceRootLoad(facts);
```

错误页诊断仅包含 schemaVersion、workspaceId、flavour、appVersion、state、code、initialRead、initialSyncComplete、elapsedMs。不能序列化 workspace、raw error、cookie、token、URL 参数或 AI 会话。

## 移动菜单配套约定

受控 MobileMenu 必须提供 `onOpenChange`，触发按钮应根据 `finalOpen`（外部 open 优先）切换。内容直接关闭父级状态后，下一次点击仍应能打开；不能以内部旧 open 状态判断。回归见 `component/src/ui/menu/mobile/root.spec.tsx`。
