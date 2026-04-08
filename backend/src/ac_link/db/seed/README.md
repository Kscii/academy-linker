# Seed 工具说明

这个目录提供一套面向本地联调和前端全流程演示的数据库初始化工具。

目标：

- 一键生成足够覆盖 `admin / teacher / parent` 前端页面的演示数据
- 支持按场景单独初始化
- 可重复执行
- 支持只清理 seed 生成的 demo 数据，不误删真实业务数据

## 目录结构

- `cli.py`
  统一命令行入口
- `models.py`
  seed 使用的固定账号、班级、学生、科目等常量
- `helpers.py`
  通用幂等写入、重置、演示数据构造函数
- `base.py`
  基础角色、班级、学生、绑定、分配、标签
- `admin.py`
  admin 场景
- `teacher.py`
  teacher 场景
- `parent.py`
  parent 场景
- `resources.py`
  资源中心场景
- `full_demo.py`
  全量场景组合入口

## 使用方式

先确保：

1. `.env` 中数据库连接配置可用
2. 数据库已经创建
3. 依赖已经安装

常用命令：

```bash
cd backend
uv sync
uv run python -m ac_link.db.seed --scenario full-demo --reset --with-auth-tokens
```

只初始化某一类数据：

```bash
uv run python -m ac_link.db.seed --scenario parent --reset
uv run python -m ac_link.db.seed --scenario teacher --reset
uv run python -m ac_link.db.seed --scenario admin --reset
uv run python -m ac_link.db.seed --scenario resources --reset
```

查看可用参数：

```bash
uv run python -m ac_link.db.seed --help
```

## 场景说明

### `base`

创建最基础的数据：

- admin / teacher / parent 账号
- subjects
- classes
- students
- parent-student bindings
- teaching assignments
- system tags / teacher private tags

### `admin`

在 `base` 基础上准备 admin 页面可查看的数据骨架。

### `teacher`

在 `base` 基础上额外创建：

- reports
- announcements
- discussion threads / posts
- exam scores
- period metrics
- learning pathway items
- ai conversations
- TTS 演示缓存（报告 / 公告 / discussion 帖子）

### `parent`

在 `teacher` 基础上额外创建：

- leave requests
- incident reports

### `resources`

创建资源中心文章。

同时会为 demo 资源写入对应的 TTS 缓存文件，方便前端直接联调 Gemini 朗读按钮。

### `full-demo`

组合执行：

- `parent`
- `resources`

也就是最完整的联调数据集，同时会生成一批可直接回放的 demo Gemini TTS 缓存文件。

## 重置规则

`--reset` 只清理 seed 工具自己创建的 demo 数据，识别方式如下：

- 用户邮箱使用 `@academy-link.dev`
- TTS 缓存文件写入 `TTS_STORAGE_DIR`（默认 `.tts-cache/`）
- 学生 SID 使用 `DEMO-STU-*`
- 资源标题使用 `[DEMO]` 前缀
- 班级名、科目 code、系统标签名使用固定 seed 常量

因此：

- 不会主动删除真实业务账号
- 不需要为 seed 额外增加数据库字段

## 默认测试账号

默认所有 demo 账号共用密码：

```text
DemoPass123!
```

账号包括：

- `admin.demo@academy-link.dev`
- `teacher.ada@academy-link.dev`
- `teacher.lin@academy-link.dev`
- `parent.chen@academy-link.dev`
- `parent.wang@academy-link.dev`

如需替换 demo 邮箱域名，可以在执行前设置环境变量：

```bash
export SEED_DEMO_EMAIL_DOMAIN=demo.your-domain.com
```

注意：

- 不要使用 `.test`、`.example`、`.invalid`、`.localhost` 这类保留域名
- 登录接口使用 `EmailStr` 校验，请选择一个普通、非保留的域名字符串

建议在本地开发环境使用，不要在生产环境导入这组数据。

## 开发建议

- 需要补新的前端页面联调数据时，优先在对应场景文件中补充
- 需要复用的写库逻辑，放进 `helpers.py`
- 不要把测试专用 fixture 和这里的 demo seed 强耦合
- 如果后续前端页面继续扩展，优先更新 `full_demo.py`，确保一条命令仍能覆盖全站联调
