# 教程

## 简介

本教程带你了解 AFFiNE 代码库，面向新贡献者。

## 构建项目

请先掌握如何构建项目。详见 [BUILDING](../BUILDING.md)。

调试时可能需要在 3000 端口使用本地 OctoBase。

## 代码库概览

代码库组织如下：

- `packages/` 包含生产环境运行的全部代码。
  - `backend/` 后端代码，更多信息见 <https://github.com/toeverything/OctoBase>。
  - `frontend/` 前端代码，包括 Web 应用、Electron 应用与业务库。
  - `common` 同构代码或无业务的基础库。
- `tools/` 开发或 CI 工具，不用于生产。
- `tests/` 跨库测试，包括 e2e 与集成测试。

### `@affine/env`

AFFiNE 客户端环境配置。

包含全局常量、浏览器与系统检查。

本包应在入口点最开始导入。

#### 设计原则

- 每个 workspace plugin 有自己的状态，与其他 plugin 隔离。
- workspace plugin 负责自身状态管理、数据持久化、同步、备份与恢复。

Workspace API 见 [types.ts](../../packages/frontend/workspace/src/type.ts)。

### `@affine/component`

AFFiNE 的 UI 组件库。

每个组件应可独立在任意上下文使用，例如 Storybook。

## 调试环境

### `@affine/env`

```shell
yarn dev
```

### `@affine/electron`

见 [构建桌面客户端](../building-desktop-client-app.md)。
