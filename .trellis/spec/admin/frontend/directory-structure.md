# 目录结构 — `@affine/admin`（最小）

```
packages/frontend/admin/src/
├── components/ui/     # shadcn 风格原语（button、input、form 等）
├── modules/           # 路由级功能（auth、dashboard、settings、workspaces 等）
├── fetch-utils.ts     # affineFetch
└── ...
```

功能屏在 `modules/<area>/`。共享壳在 `modules/header.tsx` 等。
