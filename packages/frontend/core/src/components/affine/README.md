# Affine 官方 Workspace 组件

此组件需要特定配置才能正常工作。

## 配置

### SWR

每个组件使用 SWR 从 API 拉取数据。你需要向 SWR 提供配置。

```tsx
const Wrapper = () => {
  return (
    <AffineSWRConfigProvider>
      <Component />
    </AffineSWRConfigProvider>
  );
};
```
