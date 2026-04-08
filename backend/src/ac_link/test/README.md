# 集成测试说明

## 概述

本目录包含针对 Academy Linker 后端所有 API 接口的系统集成测试，基于 Python `pytest` + FastAPI `TestClient` 实现，无需启动外部服务（测试客户端直接调用 ASGI 应用）。

测试需要一个运行中的 **PostgreSQL** 数据库（与开发环境共享同一库）。

---

## 文件结构

```
test/
├── conftest.py          # 共享 Fixtures（测试数据、登录 Client）
├── test_auth.py         # §7  认证接口
├── test_me.py           # §7.5–7.9 个人信息 + §8 设置接口
├── test_admin.py        # §11 Admin 管理接口
├── test_teacher.py      # §10 老师端接口
├── test_parent.py       # §9  家长端接口
├── test_discussion.py   # §9.13–9.20 / §10.3–10.7 讨论区接口
└── test_ai.py           # §12 AI 会话接口（发送消息/生成报告/翻译默认跳过）
```

---

## 依赖安装

测试依赖已注册为可选开发依赖，使用 `uv` 安装：

```bash
cd /path/to/backend
uv add --dev pytest pytest-anyio httpx
# 或使用 pip 直接安装
pip install pytest
```

`starlette.testclient.TestClient` 已随 `fastapi` 依赖附带，无需额外安装。

---

## 配置要求

测试使用项目根目录的 `.env` 文件连接数据库，确保以下环境变量已配置：

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=kscii
POSTGRES_PASSWORD=...
POSTGRES_DB=ac_link
JWT_SECRET_KEY=...
TTS_API_KEY=...
TTS_MODEL=gemini-2.5-flash-preview-tts
```

> **注意**：`conftest.py` 在所有 `ac_link` 模块导入前设置 `DEBUG=true`，使 Cookie 不附加 `Secure` 标志，让测试客户端在 HTTP 下正常携带认证 Cookie。

---

## 运行测试

### 运行全部测试

```bash
cd /path/to/backend
pytest src/ac_link/test/ -v
```

### 运行单个模块

```bash
pytest src/ac_link/test/test_auth.py -v
pytest src/ac_link/test/test_teacher.py -v
```

### 运行单个测试类

```bash
pytest src/ac_link/test/test_admin.py::TestAdminUsers -v
```

### 跳过 AI 测试（默认已跳过，但可以确认）

```bash
pytest src/ac_link/test/ -v --ignore=src/ac_link/test/test_ai.py
```

### 启用 AI / TTS 测试

```bash
LLM_API_KEY=sk-... pytest src/ac_link/test/test_ai.py -v -k "not skip"
```

TTS 相关测试默认会 monkeypatch Gemini TTS 请求，不会真的访问外部网络；但如果你要联调真实 TTS 接口，请确保：

```bash
export TTS_API_KEY=your-gemini-api-key
export TTS_MODEL=gemini-2.5-flash-preview-tts
```

---

## 测试数据管理

### 初始化策略

`conftest.py` 使用 `session` 级 fixture 在测试开始时创建一套完整的测试数据：

| 数据类型 | 创建方式 | 标识 |
|---|---|---|
| Admin 用户 | 直接写库 | `testadmin.aclink@example.com` |
| Teacher 用户 | Admin API | `testteacher.aclink@example.com` |
| Parent 用户 | Admin API | `testparent.aclink@example.com` |
| 学科（Subject） | 直接写库 | code=`TMATH` |
| 班级（Class） | Admin API | `Test Class 1A` |
| 学生（Student） | Admin API | sid=`TST001` |
| Parent-Student 绑定 | Admin API | — |
| Teaching Assignment | Admin API | — |
| 系统 Tag | Admin API | `test-urgent` |

### 清理策略

所有测试结束后，fixture teardown 按照反向依赖顺序删除数据：

1. 删除 Student（CASCADE: 报告、公告、成绩、讨论串、帖子）
2. 删除 Class
3. 删除 Subject
4. 删除 Teacher/Parent/Admin 用户

---

## 注意事项

- **幂等性保护**：`conftest.py` 在初始化前会先尝试删除残留测试数据，确保重复运行不会因唯一约束失败。
- **测试隔离**：各测试模块内的临时数据由每个测试方法自行创建和清理，不依赖其他模块的状态。
- **顺序无关**：测试不依赖固定执行顺序，但部分 `scope="class"` fixture 的创建/删除操作有隐式顺序（例如 `test_teacher.py` 先创建报告再测试删除）。
- **跳过接口**：需要 OpenAI/LLM API 的接口（AI 报告生成、消息发送、翻译解析）默认通过 `@pytest.mark.skip` 跳过，配置好 `LLM_API_KEY` 后可手动取消 `skip` 标记运行。
