# 服务器部署指南（Podman）

## 前置条件

- 已安装 `podman` 和 `podman-compose`（或 Podman v4.7+ 内置的 `podman compose`）
- 已在 `backend/` 目录下创建 `.env` 文件（参考 `.env.example`）

---

## 一、配置 `.env`

```bash
cp .env.example .env
# 编辑 .env，填写所有必填项
```

关键字段说明：

| 变量 | 说明 |
|---|---|
| `POSTGRES_*` | 数据库连接信息 |
| `JWT_SECRET_KEY` | 用 `python -c "import secrets; print(secrets.token_hex(32))"` 生成 |
| `ADMIN_EMAIL` | 初始管理员邮箱（首次启动时自动创建） |
| `ADMIN_PASSWORD` | 初始管理员密码 |
| `ADMIN_DISPLAY_NAME` | 初始管理员显示名称 |
| `ALLOWED_ORIGINS` | 允许的前端地址，如 `["https://your-domain.com"]` |

---

## 二、常用命令

所有命令均在 `backend/` 目录下执行。

### 首次启动（构建镜像 + 启动容器）

```bash
podman compose up -d --build
```

容器启动后会自动完成：
1. 创建数据库表
2. 创建管理员账户（若 `.env` 中设置了 `ADMIN_EMAIL`）

### 后续启动（不重新构建）

```bash
podman compose up -d
```

### 停止容器（保留数据）

```bash
podman compose down
```

### 重新创建管理员账户

修改 `.env` 中的 `ADMIN_*` 变量后，在运行中的容器内执行：

```bash
podman exec academy-linker-api python -m ac_link.db.init_admin
```

### 查看日志

```bash
# 所有服务
podman compose logs -f

# 仅 API
podman compose logs -f api

# 仅数据库
podman compose logs -f postgres
```

---

## 三、重建镜像

代码或依赖有更新时：

```bash
podman compose down
podman compose up -d --build
```

---

## 四、完全清理（删除容器 + 数据卷）

> ⚠️ 此操作会删除所有数据库数据，不可恢复。

```bash
podman compose down -v
```

仅删除镜像（保留数据卷）：

```bash
podman rmi localhost/backend_api
```

---

## 五、查看容器状态

```bash
podman compose ps

# 或直接用 podman
podman ps -a
```
