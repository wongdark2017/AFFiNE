# 工作区初始化异常修复方案

## 1. 推荐方案

采用 **底层发布读取与完成事实、工作区层分类、界面提供安全退出入口** 的方案。

保持 ready“已经有可用 Yjs 数据”的含义，不把空读取伪装成成功。增加本地首次读取结果、初始来源检查完成信号，区分“根数据未找到”“读取失败”“仍不确定”。30 秒是 UI 等待兜底，不是缺失判定依据，也不取消正常同步。

基线：`origin/dev-main` 的 `078521a61975e6dc985009850ed9dbe35dc864ec`。分支：`codex/fix-workspace-missing-root-loading`。下文为 2026-09-08 已获用户确认的实现设计。

## 2. 根因

```mermaid
flowchart LR
  A[找到工作区登记] --> B[打开引擎并读取根文档]
  B --> C{读到有效数据?}
  C -->|是| D[ready 为 true，进入工作区]
  C -->|否| E[ready 保持 false]
  E --> F[当前页面永久停在 fallback]
```

### 2.1 证据边界

以下代码可以确认：**根数据缺失时，没有有效的退出加载分支**。它不能证明 IndexedDB 为什么变空，也不能证明存储重建由哪次操作触发。实现第一步将把下面的路径固化为失败用例，验证结果记录在 implement.md。

### 2.2 空读取不会让文档 ready

`packages/common/nbstore/src/frontend/doc.ts:315` 的实际代码：

```ts
const docRecord = await this.storage.getDoc(job.docId);
throwIfAborted(signal);

if (docRecord && !isEmptyUpdate(docRecord.bin)) {
  this.applyUpdate(job.docId, docRecord.bin);

  this.status.readyDocs.add(job.docId);
}

this.status.connectedDocs.add(job.docId);
this.statusUpdatedSubject$.next(job.docId);
```

若根读取结果为 null 或空 update，readyDocs 不会加入根 ID，但 connectedDocs 会加入它。对应状态在 `packages/common/nbstore/src/frontend/doc.ts:147` 映射为：

```ts
ready: this.status.readyDocs.has(docId),
loaded: this.status.connectedDocs.has(docId),
```

对初次加载的空根文档，这条路径产生 `loaded=true、ready=false`。区分读取完成和内容就绪是合理的底层契约；缺陷是页面未处理这一组合。

### 2.3 页面只看 ready，没有处理缺失

`packages/frontend/core/src/desktop/pages/workspace/index.tsx:260` 将完整状态缩成一个布尔值：

```ts
workspace.engine.doc.docState$(workspace.id).pipe(map(v => v.ready));
```

同文件 `:334` 的实际分支：

```tsx
if (!isRootDocReady) {
  return (
    <FrameworkScope scope={workspace.scope}>
      <DNDContextProvider>
        <OpenInAppGuard>
          <AppContainer fallback />
        </OpenInAppGuard>
      </DNDContextProvider>
    </FrameworkScope>
  );
}
```

在根仍为空且后续没有有效增量到达时，ready 一直为 false。这里没有“读取完成但没有数据”的分支，也没有 deadline，所以持续返回 fallback。移动布局在 `packages/frontend/core/src/mobile/pages/workspace/layout.tsx:112`、`:130` 有相同 gate。

### 2.4 为什么登记还在、界面仍能尝试打开

`packages/frontend/core/src/modules/workspace-engine/impls/local.ts:325` 仅从本地登记生成列表：

```ts
const value = getLocalWorkspaceIds().map(id => ({
  id,
  flavour: 'local',
}));
```

生成列表时不检查根数据。完整证据链为：**登记保留 → 打开工作区 → 根读取为空 → loaded=true/ready=false → 页面一直 fallback**。

### 2.5 修复时必须保留的边界

需要同时处理以下边界：

- `loaded` 与 `ready` 不同。没有根数据时可以已完成读取，却一直未就绪。
- 根文档存在而目录为空，是合法空工作区，不能用文档数量判损坏。
- `DocSyncPeer.docState$` 中 synced 只看队列和错误，初始可能与 syncing=true 同时出现。
- 根不在任何来源中时，不会产生 connect 任务，因此也不能等待旧 syncing 变为 false 才处理缺失。
- 本地工作区的 v1 迁移位于同步层；现代库为空不意味着旧库也为空。
- RPC 默认无限等待，本地异步失败可能只打印到控制台；React ErrorBoundary 捕获不到所有此类错误。

## 3. 分层边界

| 层                        | 责任                                                           |
| ------------------------- | -------------------------------------------------------------- |
| `nbstore/frontend/doc.ts` | 本地首次读取结果、可用性、失败事实；不决定产品文案             |
| `nbstore/sync/doc`        | 初始来源枚举和指定文档相关任务的完成事实；不改变旧 synced 含义 |
| workspace scoped service  | 聚合根状态、来源覆盖和 30 秒 deadline；不直接查 IndexedDB      |
| desktop/mobile view       | 复用同一分类结果，渲染操作入口；不各写一套判断                 |

不新增后端接口、数据库 schema 或修复写入。现有读取、迁移和增量合并继续运行；诊断只观察它们，不另造探测存储连接。

## 4. 拟新增合约

### 4.1 本地读取状态

在 DocFrontend 提取可独立订阅的 `localDocState$(docId)`，初始立即发值，不依赖远程 observable：

```ts
type LocalDocLoadState = {
  ready: boolean;
  loaded: boolean;
  updating: boolean;
  initialRead: 'pending' | 'empty' | 'nonempty' | 'failed';
  failure?: {
    phase: 'connect' | 'read' | 'decode';
    code: 'connection_failed' | 'read_failed' | 'invalid_update';
  };
};
```

- 初次读取记录 empty/nonempty；复用 `isEmptyUpdate`，覆盖 null、零字节、空 Yjs update。
- 连接、读取、解码失败发布稳定错误事实；主动取消和作用域销毁不报错。
- 后续有效增量仍可令 ready=true。现有 `docState$` 复用这份本地来源并保持旧字段语义。
- 独立本地流使“远程从不发值”不再遮住本地失败；停止的主循环不能靠重新订阅冒充重启。

### 4.2 来源检查完成

拟为 DocSyncDocState 及 Worker 类型投影增加 `initialSyncComplete`，向 DocFrontend 聚合状态透传。

每个 peer 增加当前连接轮次的 `initialScanComplete`。仅在本地时钟、缓存时钟、来源最新时钟均成功读取，且相关 connect 任务已登记后设为 true。重连或失败时重置。

对指定 docId，来源检查完成需满足：

1. 初始来源枚举成功结束。
2. 文档不在已发现集合中，或其 connect/pull/save 任务均已成功处理。
3. 该文档无执行中或排队任务，无相关错误、连接失败或重试。
4. 聚合时所有所需来源均完成。

零来源时 complete=true。Readonly 导致 skipped 不是“检查过且不存在”，不能直接推导 complete。无法证明覆盖完成时保持 unknown，由超时页兜底。

该信号专门覆盖“根不在任何来源里，故没有 connect 任务”的情况。不能把已有 synced 改个名字当作它。

### 4.3 工作区状态服务

拟新增 `WorkspaceRootLoadService`，注册到 workspace scope；纯分类器负责规则，服务负责订阅、计时、销毁。

```ts
type WorkspaceRootLoadState = { kind: 'loading' } | { kind: 'ready' } | { kind: 'missing-local-root' } | { kind: 'load-error'; code: string } | { kind: 'stalled' };
```

| 优先级 | 事实                                                                         | 状态                              |
| ------ | ---------------------------------------------------------------------------- | --------------------------------- |
| 1      | 根已有可用数据                                                               | ready，后台同步错误不遮挡可读内容 |
| 2      | 未 ready，已有明确本地/来源读取错误                                          | load-error                        |
| 3      | local flavour、本地首次读取成功且为空、来源覆盖完成、没有待应用/保存的根更新 | missing-local-root                |
| 4      | 未命中以上分支且本次等待达到 30 秒                                           | stalled                           |
| 5      | 其余情况                                                                     | loading                           |

云端与分享工作区的本地缓存为空不能进入 missing-local-root。服务使用独立本地流，并给来源状态提供 unknown 初值，确保 Worker 不回应时 timer 仍工作。

## 5. 生命周期与兼容

- 尝试身份为 workspace scope + flavour + id。路由 meta 与 workspace 尚未匹配时不使用旧结果。
- Deadline 从本次打开开始计时，不随 render 或普通状态更新重置；达到阈值不取消后台读取。
- ready 优先；missing/error/stalled 后仍观察迟到的有效数据，可自动恢复 ready。
- 来源重连不能沿用上轮完成事实；scope 销毁时清理 timer 和 subscriptions，过期 attempt 结果丢弃。
- 来源完成与根增量消息可能交错。分类需观察待应用队列，根更新尚在排队/应用时不能宣告缺失；用时序测试验证，不用固定 sleep 掩盖竞态。
- 旧 SharedWorker 可能缺少新字段，按 unknown 处理，必要时显示 stalled；不能默认 complete=true。发布验证实际 Worker 构建。
- 保留 ready、synced、waitForDocReady、Yjs 格式和 schema 的原有契约；验证 Electron/原生消费者类型兼容。

## 6. 界面与动作

新增共享 `WorkspaceLoadFailure` 内容组件。Loading 使用现有占位；其他失败状态显示内容面板，停止无依据地显示 Syncing。

| 状态               | 建议标题             | 说明                                                                     |
| ------------------ | -------------------- | ------------------------------------------------------------------------ |
| missing-local-root | 无法读取此本地工作区 | 未找到用于打开此工作区的本地数据。是否能恢复仍需检查，请勿清除站点数据。 |
| load-error         | 工作区加载失败       | 读取工作区时发生错误。可以重新加载或切换其他工作区。                     |
| stalled            | 工作区加载时间过长   | 尚未完成读取，可检查连接或重新加载。此提示不表示文档已丢失。             |

- **重新加载**：仅点击触发，复用既有错误页的 `document.location.reload()`；不绕过 beforeunload，不调用 resetSync、清库或修改登记。
- **切换工作区**：复用 WorkspaceNavigator/平台选择器，显式选择目标后导航。不能只跳 `/`，以免 last_workspace_id 又指向坏工作区；选择器不能依赖根初始化成功。
- **复制诊断信息**：白名单为应用版本、workspaceId、flavour、状态、读取/来源阶段、稳定错误码和 elapsedMs。排除原始异常、堆栈、正文、标题、凭据、会话和 URL 参数。
- **恢复建议**：说明保留当前存储、检查原设备/备份/导出文件；不承诺自动恢复，不把现场 AI 会话导出接入产品。

通过显式 prop/context 传递初始化状态，或在异常分支隐藏 WorkspaceNavigator 同步标签；不改正常工作区的同步展示。移动异常分支须建立选择器需要的 scope。

新增 `en.json`、`zh-Hans.json` 文案，使用 useI18n、现有组件和 theme tokens；支持键盘、焦点、深浅色与移动布局。

## 7. 拟修改区域

| 路径                                                                                                           | 变化                                           |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `packages/common/nbstore/src/frontend/doc.ts`                                                                  | 独立本地读取状态与失败事实                     |
| `packages/common/nbstore/src/sync/doc/peer.ts`                                                                 | 初始来源枚举和文档任务完成信号                 |
| `packages/common/nbstore/src/sync/doc/index.ts`                                                                | 新状态聚合及零来源分支                         |
| `packages/common/nbstore/src/worker/ops.ts`、`worker/client.ts`                                                | 检查类型投影、旧 Worker 保守兼容，仅必要时调整 |
| `packages/frontend/core/src/modules/workspace/services/root-load.ts`（新增）                                   | scoped 状态服务和 deadline                     |
| `packages/frontend/core/src/modules/workspace/utils/root-load-state.ts`（新增）                                | 纯分类器                                       |
| `packages/frontend/core/src/modules/workspace/index.ts`                                                        | 注册及导出                                     |
| `packages/frontend/core/src/components/workspace-load-failure/`（新增）                                        | 异常视图、操作和诊断白名单                     |
| `packages/frontend/core/src/desktop/pages/workspace/index.tsx`                                                 | 桌面 gate 接入                                 |
| `packages/frontend/core/src/mobile/pages/workspace/layout.tsx`                                                 | 移动 gate 和 scope 接入                        |
| `packages/frontend/core/src/modules/app-sidebar/views/index.tsx`、`desktop/components/app-container/index.tsx` | 必要的 fallback 状态透传                       |
| `packages/frontend/i18n/src/resources/en.json`、`zh-Hans.json`                                                 | 文案及生成物                                   |
| nbstore/core 单测、`tests/affine-local/e2e/workspace-load-failure.spec.ts`（新增）                             | 状态、时序和页面回归                           |

## 8. 方案比较

| 方案                                  | 判断                                                 |
| ------------------------------------- | ---------------------------------------------------- |
| 仅加超时页                            | 能避免没有出口的等待，但无法准确解释缺失；保留为兜底 |
| 空读取直接设 ready / 自动补空根       | 污染 ready 合约、同步和恢复线索，不采用              |
| UI 直接查 IndexedDB 或新建探测连接    | 重复存储知识，可能创建/升级库，不采用                |
| 增补底层事实，工作区分类，UI 有限等待 | 推荐；保持旧契约并覆盖迁移和缺失根边界               |

## 9. 发布与回滚

先在合成测试工作区验证，再构建并对测试环境冒烟；禁止使用事故现场浏览器配置制作故障数据。无 schema 迁移、无后台修复任务，可通过回滚应用代码/镜像撤销变更，无需改用户存储。

观察仅使用状态码、耗时和计数，沿用既有遥测策略，不新增内容上报。本次实施已获确认的代码修复；部署、存储丢失根因与数据恢复独立处理。

## 实施补充（2026-09-08）

- 现有 applyUpdate 会吞掉解码异常，但调用方随后仍设 ready。实现改为返回是否成功应用，失败发布 invalid_update；有效数据不再被无效更新冒充。
- 已有读取主循环终止时，错误页提供用户触发的重新加载；可恢复的解码/同步错误、missing 和 stalled 则继续观察迟到数据。没有新增自动重启写入流程。
- 移动受控菜单接入自定义按钮时需提供 onOpenChange，并按 finalOpen 切换，避免内容关闭后首次点击无法重开。已增加单测与移动端回归。
