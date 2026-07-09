## AFFiNE 发布流程

> 要做 stable/beta 发布，需获得 AFFiNE 测试团队授权。

## 谁可以发布？

AFFiNE 核心团队授予发布授权，并要求：

- 对本 AFFiNE 仓库有 commit 权限。
- 能访问 GitHub Actions。

## 如何发布

发布前确保已是最新 `canary` 分支，并阅读 [SemVer](https://semver.org) 以理解版本规则。

### 1. 更新 `package.json` 中的版本

```shell
./scripts/set-version.sh 0.5.4-canary.5
```

### 2. 提交变更并推送到 `canary`

```shell
git add .
# vX.Y.Z-canary.N
git commit -m "v0.5.4-canary.5"
git push origin canary
```

### 3. 创建 Release Action

在 [Release Desktop App](https://github.com/toeverything/AFFiNE/actions/workflows/release-desktop-app.yml) 触发发布 action。

![img.png](assets/release-action.png)

选择合适分支，填表，点击 `Run workflow`。

### 4. 发布 Release

action 完成后，[Releases 页面](https://github.com/toeverything/AFFiNE/releases) 会出现 draft release。

必要时编辑 release notes，然后发布。

确保：

- release 标签与标题与 `package.json` 版本一致。
- release 指向你刚推送的 commit。
