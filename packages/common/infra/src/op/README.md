# 简介

Operation Pattern 是一套极简 `RPC` 框架，前后端皆可用。

它提供非常简单的 call / listen 签名，让 Worker、跨标签 SharedWorker 或 BroadcastChannel 更易用，并减少样板代码。

# 用法

## 注册 Op Handlers

### 函数调用 handler

```ts
interface Ops extends OpSchema {
  add: [{ a: number; b: number }, number]
}

// register
const consumer: OpConsumer<Ops>;
consumer.register('add', ({ a, b }) => a + b);

// call
const client: OpClient<Ops>;
const ret = client.call('add', { a: 1, b: 2 })); // Promise<3>
```

### Stream 调用 handler

```ts
interface Ops extends OpSchema {
  subscribeStatus: [number, string];
}

// register
const consumer: OpConsumer<Ops>;
consumer.register('subscribeStatus', (id: number) => {
  // 返回可观察/流式数据
});
```

更多模式（跨 tab、SharedWorker、BroadcastChannel）见本文件原示例与 `packages/common/infra/src/op` 源码。
