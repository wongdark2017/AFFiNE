# 目录结构 — `@affine/core`（最小）

```
packages/frontend/core/src/
├── bootstrap/           # 应用启动
├── components/          # 共享功能 UI（如 sign-in/）
├── desktop/             # 桌面壳页面与对话框
├── mobile/              # 移动壳
├── modules/             # infra Services / entities / stores（cloud、comment 等）
└── blocksuite/          # 编辑器集成
```

功能数据访问通常在 `modules/<domain>/` 以 `Service` / store 类存在；视图通过 `useService` / `useLiveData` 调用。

表单与对话框按表面放在 `components/` 或 `desktop/dialogs/…`。
