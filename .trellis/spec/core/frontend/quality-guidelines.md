# 质量与测试 — `@affine/core`（最小）

## 运行器

前端单元测试使用 **Vitest**（仓库根 `vitest.config.ts`），不是 Ava。

示例：`packages/frontend/core/src/desktop/dialogs/setting/account-setting/integrations-panel.spec.tsx`

```typescript
/**
 * @vitest-environment happy-dom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
```

## 观察到的模式

- DOM 组件用 `@vitest-environment happy-dom`。
- GraphQL / infra 服务用 `vi.hoisted` + `vi.mock`。
- 交互用 Testing Library。

## 与服务端对比

不要把 Ava 的 `test.before` 模式抄进 core；也不要在 `@affine/server` 内用 Vitest。
