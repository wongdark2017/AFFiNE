# Space Storage

## 用法

### 独立 Storage 用法

```ts
import type { ConnectionStatus } from '@affine/nbstore';
import { IndexedDBDocStorage } from '@affine/nbstore/idb';

const storage = new IndexedDBDocStorage({
  peer: 'local',
  spaceId: 'my-new-workspace',
});

await storage.connect();
storage.connection.onStatusChange((status: ConnectionStatus, error?: Error) => {
  ui.show(status, error);
});

// { docId: string, bin: Uint8Array, timestamp: Date, editor?: string } | null
const doc = await storage.getDoc('my-first-doc');
```

### 组合使用全部 storages

见包内示例：通过 `SpaceStorage` 组合 `IndexedDBDocStorage`、`SqliteBlobStorage` 等。

更多 API 见 `@affine/nbstore` 源码导出。
