# Affine Blocksuite 格式 YDoc 读取器

## 用法

### 读取 rootYDoc

```ts
import { readAllDocsFromRootDoc } from '@affine/reader';

const docs = readAllDocsFromRootDoc(rootDoc);
console.log(Array.from(docsWithTrash.entries()));

// [
//   'doc-id-1', { title: 'test doc title' },
//   // ...
// ]
```

### 读取 YDoc

```ts
import { readAllBlocksFromDoc } from '@affine/reader';

const blocks = readAllBlocksFromDoc(doc);
```
