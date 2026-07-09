# Routes

## 用法

### Path 工厂

```ts
import { FACTORIES } from '@affine/routes';

const path = FACTORIES.workspace.doc({ workspaceId: '123', docId: '456' });
//                                     ^^^^ 带类型检查
```

### 注册路由

```tsx
import { ROUTES } from '@affine/routes';

function Routes() {
  return <Router path={ROUTES.admin.index} element={} />;
}
```

### 路径参数

```ts
import { RouteParamsTypes } from '@affine/routes';

function Doc() {
  const { workspaceId, docId } = useParams<RouteParamsTypes['workspace']['doc']>();
}

function Attachment() {
  const { workspaceId, docId, attachmentId } = useParams<RouteParamsTypes['workspace']['doc']['attachment']>();
}
```
