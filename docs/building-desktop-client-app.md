# 构建 AFFiNE 桌面客户端

> **警告**：
>
> 本文不保证始终最新。
> 若发现过时信息，请提 issue 或 PR。

## 目录

- [前置条件](#前置条件)
- [开发](#开发)
- [构建](#构建)
- [CI](#ci)

## 开始前需要了解

当前构建桌面客户端比 Web 更复杂。客户端是 Electron 应用，包装预构建的 Web 应用，部分原生模块用 Rust 编写。构建桌面客户端涉及这些源码模块：

1. `packages/frontend/core`：Web 应用
2. `packages/frontend/native`：Rust 原生模块（多为 sqlite 绑定）
3. `packages/frontend/apps/electron`：Electron 应用（含 main & helper 进程，以及 `packages/frontend/apps/electron-renderer` 中的 electron 入口）

#3 依赖 #1 与 #2，并依赖 electron-forge 生成最终应用与安装包。深入理解构建流程可阅读 [release-desktop.yml](/.github/workflows/release-desktop.yml)。

由于 [Electron builder 的一些限制](https://github.com/yarnpkg/berry/issues/4804)，构建 core 与桌面客户端可能需要两套 yarn 配置：

1. 构建 frontend（默认 yarn 设置）
2. 构建 electron（关闭 hoisting 后重装）

下文分步说明。

## 前置条件

开始构建 AFFiNE 桌面客户端前，请按 [BUILDING#前置条件](./BUILDING.md#前置条件) 安装 Node.js 与 Rust。

在 Windows 上必须为本仓库启用符号链接。见 [#### Windows](./BUILDING.md#Windows)。

## 构建、打包并制作桌面客户端安装包

> repos/AFFiNE/.github/workflows/release-desktop.yml 包含真实构建顺序；此处用更详细方式说明，并尽量保持最新。

### 0. 构建 native 模块

请参阅 [BUILDING.md](./BUILDING.md#构建-native-依赖) 中的「构建 Native 依赖」。

### 1. 构建 core

Mac & Linux：

```shell
BUILD_TYPE=canary yarn affine @affine/electron build

BUILD_TYPE=canary yarn affine @affine/electron generate-assets
```

Windows（powershell）：

```powershell
$env:BUILD_TYPE="canary"
$env:DISTRIBUTION=desktop
$env:SKIP_WEB_BUILD=1
yarn build
```

### 2. 重新配置 yarn，清理 node_modules 并重装依赖

如前所述，需要关闭 hoisting 后重装依赖：

```shell
yarn config set nmMode classic
yarn config set nmHoistingLimits workspaces
```

然后清理所有 node_modules 并重装：

Mac & Linux：

```shell
find . -name 'node_modules' -type d -prune -exec rm -rf '{}' +
yarn install
```

Windows（powershell）：

```powershell
dir -Path . -Filter node_modules -recurse | foreach {echo $_.fullname; rm -r -Force $_.fullname}
yarn install
```

### 3. 构建桌面客户端安装包

#### Mac & Linux

注意：需在 `forge.config.mjs` 中注释掉 `osxSign` 与 `osxNotarize`，以跳过签名与公证。

```shell
BUILD_TYPE=canary SKIP_WEB_BUILD=1 HOIST_NODE_MODULES=1 yarn affine @affine/electron make
```

#### Windows

制作 Windows 安装包略有不同。目前提供两种安装器：squirrel 与 nsis。

```powershell
$env:BUILD_TYPE="canary"
$env:SKIP_WEB_BUILD=1
$env:HOIST_NODE_MODULES=1
yarn affine @affine/electron package
yarn affine @affine/electron make-squirrel
yarn affine @affine/electron make-nsis
```

构建完成后，可在终端输出中找到二进制路径。

```
Finished 2 bundles at:
  › Artifacts available at: <affine-repo>/packages/frontend/apps/electron/out/canary/make
```

## CI

请参阅 `.github/workflows/release-desktop-app.yml` 中的 CI 工作流。它将：

- 为所有支持平台构建应用
- 将产物上传到 GitHub Actions
