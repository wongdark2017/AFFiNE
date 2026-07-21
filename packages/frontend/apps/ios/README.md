# iOS

AFFiNE iOS 应用。

## 构建

- `yarn install`
- `BUILD_TYPE=canary PUBLIC_PATH="/" yarn affine @affine/ios build`
- `yarn affine @affine/ios cap sync`
- `yarn affine @affine/ios cap open ios`

## Live Reload

> Capacitor 文档：https://capacitorjs.com/docs/guides/live-reload#using-with-framework-clis

- `yarn install`
- `yarn dev`
  - 「Distribution」选项选择 `ios`
- `yarn affine @affine/ios sync:dev`
- `yarn affine @affine/ios cap open ios`
