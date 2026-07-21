# 构建 AFFiNE Web

> **警告**：
>
> 本文不保证始终最新。
> 若发现过时信息，请提 issue 或 PR。

> **说明**
> 开发与构建桌面客户端，请参阅 [building-desktop-client-app.md](./building-desktop-client-app.md)

## 目录

- [前置条件](#前置条件)
- [环境准备](#环境准备)
- [启动开发服务器](#启动开发服务器)
- [测试](#测试)

## 前置条件

AFFiNE 客户端需要 **Node.js** 与 **Rust** 工具链。

### 安装 Node.js

建议在 Node.js LTS（长期支持）版本下开发。

#### 选项 1：手动安装 node.js

安装 [Node LTS 版本](https://nodejs.org/en/download)

> 目前主版本为 20.x

#### 选项 2：使用 node 版本管理器

安装 [fnm](https://github.com/Schniz/fnm)

```sh
fnm use
```

### 安装 Rust 工具

请按官方指南：https://www.rust-lang.org/tools/install

### 配置 Node.js 环境

需要现代 yarn（当前 `4.x`）。若 yarn 为 `1.x`，请执行：

参考：[Yarn 安装文档](https://yarnpkg.com/getting-started/install)

```sh
corepack enable
corepack prepare yarn@stable --activate
```

```sh
# 安装依赖
yarn install
```

### 克隆仓库

#### Linux & MacOS

```sh
git clone https://github.com/toeverything/AFFiNE
```

#### Windows

代码库使用符号链接。由于 Windows 安全设计，创建符号链接需要管理员权限。详见 [创建符号链接的安全策略](https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/create-symbolic-links)。

启用开发者模式： [Enable Developer Mode on Windows](https://learn.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development)。

启用后以管理员权限执行：

```sh
# 启用符号链接
git config --global core.symlinks true
# 克隆仓库
git clone https://github.com/toeverything/AFFiNE
```

### 构建 Native 依赖

运行下列脚本，将在 [`/packages/frontend/native`](/packages/frontend/native) 构建原生模块，并用 [NAPI.rs](https://napi.rs/) 构建 Node.js 绑定。
首次构建可能较久。
注意：在 MacOS 上请用系统 `strip` 而不是 `binutils`。[相关讨论](https://github.com/toeverything/AFFiNE/discussions/2840)

```sh
yarn affine @affine/native build
```

### 构建 Server 依赖

```sh
yarn affine @affine/server-native build
```

## 测试

贡献新功能与修 bug 时强烈建议补充测试用例。

E2E 使用 [Playwright](https://playwright.dev/)，单元测试使用 [vitest](https://vitest.dev/)。
本地测试前请先通过 `npx playwright install` 安装浏览器二进制。

测试前请按 [`docs/developing-server.md`](./developing-server.md) 先启动服务端。

### 单元测试

```sh
yarn test
```

### E2E 测试

```shell
# 存在 `affine-local`、`affine-migration`、`affine-prototype` 等 e2e，
#   在不同场景下运行。
yarn workspace @affine-test/affine-local e2e
```
