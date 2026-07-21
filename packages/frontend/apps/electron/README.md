# AFFiNE Electron 应用

## 开发

本地运行 AFFiNE 桌面客户端：

```sh
# 在仓库根目录
yarn install
yarn affine @affine/native build
yarn dev

# 在 packages/frontend/apps/electron
yarn generate-assets
yarn dev # 或 yarn prod 做生产构建
```

## 排障

若 `yarn install` 时构建 electron 困难，可尝试设置镜像环境变量：

```sh
export ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/"
```

## 致谢

大部分样板代码慷慨借自：

- [vite-electron-builder](https://github.com/cawa-93/vite-electron-builder)
- [Turborepo basic example](https://github.com/vercel/turborepo/tree/main/examples/basic)
- [yerba](https://github.com/t3dotgg/yerba)
