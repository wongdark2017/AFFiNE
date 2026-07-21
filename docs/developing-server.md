本文说明如何用 Docker 在本地启动服务端（@affine/server）

> **警告**：
>
> 本文不保证始终最新。
> 若发现过时信息，请提 issue 或 PR。

## 用 docker compose 运行所需开发服务

运行 yarn 的 server 包（@affine/server）需要一些开发服务，例如：

- postgres
- redis
- mailhog

可通过 docker compose 启动：

```sh
cp ./.docker/dev/compose.yml.example ./.docker/dev/compose.yml
cp ./.docker/dev/.env.example ./.docker/dev/.env

docker compose -f ./.docker/dev/compose.yml up
```

### 注意

> 自 AFFiNE 0.20 起，compose.yml 有破坏性变更：默认数据库镜像从 `postgres:16` 改为 `pgvector/pgvector:pg16`。若你之前使用其他主版本 Postgres，请把 `pgvector/pgvector:pg` 后的数字改成你使用的主版本。

## 构建 native 包（需先配置 rust 工具链）

Server 也需要构建 native 包：

```sh
# 构建 native
yarn affine @affine/server-native build
```

## 准备开发环境

```sh
# 取消注释此处所有环境变量
cp packages/backend/server/.env.example packages/backend/server/.env

# 每次有新 migration，应重新执行 init
yarn affine server init
```

## 启动服务端

```sh
# 在项目根目录
yarn affine server dev
```

服务启动后会创建用于测试的默认用户与 pro 用户：

### default 用户

工作区成员上限 3

- email: dev@affine.pro
- name: Dev User
- password: dev

### pro 用户

工作区成员上限 10

- email: pro@affine.pro
- name: Pro User
- password: pro

### team 用户

包含默认 `Team Workspace`，成员上限 10

- email: team@affine.pro
- name: Team User
- password: team
