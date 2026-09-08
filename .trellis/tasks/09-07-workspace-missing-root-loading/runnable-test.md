# 可直接运行的根数据缺失回归测试

## 执行

在修复工作树根目录，使用 Node 22.12+（22.x）：

```bash
yarn test:workspace-loading
```

显示浏览器执行过程：

```bash
yarn test:workspace-loading --headed
```

逐步调试并观察页面：

```bash
yarn test:workspace-loading --debug
```

本机如果终端没有配置 Node/Yarn，可以使用本次验证准备的 Node 22：

```bash
cd /Users/wuchengqi/code/AFFiNE/.worktrees/workspace-missing-root-loading
export PATH="/private/tmp/affine-node-runtime/node-v22.16.0-darwin-arm64/bin:$PATH"
node .yarn/releases/yarn-4.13.0.cjs test:workspace-loading --headed
```

该临时运行时已在本机准备并验证。若临时目录被系统清理，改用自行安装的 Node 22，再运行上面的标准命令。该工作树的依赖已独立安装；新机器需先 `yarn install --immutable`，并安装 Playwright Chromium。

## 测试过程与预期

1. 自动启动当前工作树的 Web 开发服务。
2. 创建独立测试浏览器上下文，预置 `test-missing-local-root` 登记，不写入根文档。
3. 打开该测试工作区，15 秒内必须出现 `missing-local-root` 异常页。
4. 检查明确的缺失提示、保留的登记、没有误导性的 Syncing；保存一张页面截图。
5. 点击重新加载，等待真实页面 load 事件，再验证异常页仍可操作。
6. 点击切换工作区，确认创建/选择工作区菜单可以打开。

成功结果：命令末尾输出 `1 passed`。若页面仍无限加载，第 3 步会超时失败；若重载或菜单不可用，后续断言会失败。

测试不会启动或连接线上实例，也不使用日常 Chrome 配置。它只操作 localhost 的合成测试数据。

## 环境说明

- 测试需要空闲的 8080 端口；配置明确禁止复用已有服务，因此端口占用时会报错，避免误测其他分支。测试不会替你终止其他服务。
- 不要求本地后端。未启动 localhost:3010 时，开发代理可能打印连接拒绝日志；这不影响本地工作区的本用例。
- 运行完成会清理测试浏览器和由测试启动的 Web 服务。
- 截图位于当前工作树 `test-results/` 下对应测试目录的 `attachments/` 中。

## 文件

- 命令定义：`package.json` 的 `test:workspace-loading`。
- 专用配置：`tests/affine-local/playwright.workspace-loading.config.ts`。
- 测试实现：`tests/affine-local/e2e/workspace-load-failure.spec.ts` 中第一个测试。

## 本机实测

2026-09-08 执行 `yarn test:workspace-loading`：`1 passed (35.9s)`，其中用例本身 11.9 秒，其余为服务启动与构建。截图已生成。
