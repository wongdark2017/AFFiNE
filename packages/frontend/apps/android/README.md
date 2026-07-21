# Android

AFFiNE Android 应用。

## 配置

- 将 CARGO_HOME 设为系统环境变量
- 在 App/local.properties 中添加：

  `rust.cargoCommand={replace_with_your_own_cargo_home_absolute_path}/bin/cargo`

  `rust.rustcCommand={replace_with_your_own_cargo_home_absolute_path}/bin/rustc`

## 构建

- yarn install
- BUILD_TYPE=canary PUBLIC_PATH="/" yarn affine @affine/android build
- yarn affine @affine/android cap sync
- yarn affine @affine/android cap open android
