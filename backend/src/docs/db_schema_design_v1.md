# Academy Linker 数据库关系模式与表结构设计 v1

## 1. 设计目标

本文档用于将既有接口设计文档落到 PostgreSQL 关系模式，作为 FastAPI + SQLModel + PostgreSQL 后端实现阶段的数据库设计依据。

本设计遵循以下既有约束：

- 对外资源统一使用 `uuid`，数据库内部主键使用 `id`。fileciteturn2file2
- 所有时间统一使用 UTC 保存。fileciteturn2file2
- `report` / `announcement` 的已读与归档属于“用户个人状态”，必须拆到独立状态表，不写回资源主表。fileciteturn2file1
- 讨论区中每个 `parent + teacher + student` 组合仅有一个固定 `thread` 容器，且 thread 采用懒创建。fileciteturn2file2turn2file3
- `tag` 只作用于 `post`，`important` 作为系统 tag；老师可维护自己的私有 tag。fileciteturn2file2turn2file0
- `parent / student` 虽然当前业务按 1:1 使用，但结构上必须保留绑定表以兼容未来扩展。fileciteturn2file2

---

## 2. 总体建模原则

### 2.1 统一用户表，不拆 parent/teacher/admin 为三张独立主体表

采用：

- `users` 作为认证主体与用户主体表
- 通过 `role` 区分 `parent / teacher / admin`

原因：

1. 登录、JWT、session、settings、头像、邮箱、密码等信息天然属于统一用户主体。
2. 讨论区、报告作者、公告作者、tag 创建者都引用“用户”。
3. FastAPI + SQLModel 下统一用户表更容易做权限判断和通用依赖注入。

因此：

- **不单独建立 `parents` / `teachers` / `admins` 主体表**
- 若将来老师有额外资料，可增加 `teacher_profiles`
- 若将来家长有额外资料，可增加 `parent_profiles`

v1 中先不拆 profile 表，避免过度设计。

### 2.2 统一使用“资源主表 + 用户状态表”模式

对于会被多个用户看到但每个人状态不同的内容：

- `reports`
- `announcements`

统一采用：

- 一张资源主表
- 一张用户状态表

这样可以正确支持：

- 家长 A 已读，家长 B 未读
- 某用户归档，不影响别人

### 2.3 聚合数据尽量不先落表

接口中的 dashboard、summary_cards、charts 大多属于聚合结果，不建议 v1 先为其单独建大量物化表。

v1 建议：

- 先依赖基础业务表计算
- 若后续性能不足，再补 `student_metrics_daily` / `dashboard_snapshots` 一类衍生表

### 2.4 尽量把“当前逻辑限制”和“未来结构扩展”分开

例如 parent/student：

- **数据库层面**：允许绑定表存在多个关系
- **业务层面**：v1 暂时限制一个 student 仅绑定一个 active parent

这样既满足当前需求，也不锁死未来扩展。

---

## 3. 推荐枚举

### 3.1 `user_role`

- `parent`
- `teacher`
- `admin`

### 3.2 `translation_status`

- `not_required`
- `pending`
- `completed`
- `failed`
- `stale` fileciteturn2file2

### 3.3 `report_type`

- `weekly`
- `monthly`
- `custom`

### 3.4 `report_source_type`

- `ai`
- `teacher`

### 3.5 `announcement_category`

- `announcement`
- `task`

### 3.6 `tag_scope`

- `system`
- `teacher_private`

### 3.7 `session_status`（可选）

- `active`
- `revoked`
- `expired`

PostgreSQL 中可用 `ENUM`，也可用 `TEXT + CHECK`。若重视迁移灵活性，建议 v1 用 `TEXT + CHECK`。

---

## 4. v1 核心关系模式

下面采用接近关系模式的写法：

- 主键标注 `PK`
- 外键标注 `FK ->`
- 唯一约束标注 `UNIQUE`

### 4.1 用户与认证

#### `users`

```text
users(
  id PK,
  uuid UNIQUE,
  role,
  email UNIQUE,
  password_hash,
  display_name,
  phone_number NULL,
  avatar_url NULL,
  is_active,
  last_login_at NULL,
  created_at,
  updated_at
)
```

说明：

- 所有登录主体统一放这里。
- `email` 全局唯一。
- `is_active` 用于停用账户。

建议索引：

- unique(`uuid`)
- unique(`email`)
- index(`role`)
- index(`is_active`)

#### `user_settings`

```text
user_settings(
  id PK,
  user_id UNIQUE FK -> users.id,
  language NULL,
  timezone NULL,
  theme,
  high_contrast_mode,
  tts_enabled,
  email_digest_enabled,
  email_post_notification_enabled,
  default_report_time_range,
  default_announcement_time_range,
  created_at,
  updated_at
)
```

说明：

- 每个 user 一条设置记录。
- `user_id` 唯一，形成 1:1。

#### `user_sessions`

```text
user_sessions(
  id PK,
  uuid UNIQUE,
  user_id FK -> users.id,
  refresh_token_hash UNIQUE,
  device_label NULL,
  ip_address NULL,
  user_agent NULL,
  created_at,
  last_used_at,
  expires_at,
  revoked_at NULL
)
```

说明：

- 文档明确要求 refresh token 持久化与会话表设计。fileciteturn2file1turn2file3
- 数据库中只存 `refresh_token_hash`，不存明文 token。
- “登出当前设备”就是删/撤销当前会话；“登出所有设备”就是撤销该用户全部 active session。fileciteturn0file0

建议索引：

- unique(`uuid`)
- unique(`refresh_token_hash`)
- index(`user_id`, `expires_at`)
- partial index on active sessions where `revoked_at is null`

---

### 4.2 学生与教学关系

#### `students`

```text
students(
  id PK,
  uuid UNIQUE,
  sid UNIQUE NULL,
  full_name,
  preferred_name NULL,
  class_name NULL,
  grade_level NULL,
  avatar_url NULL,
  is_active,
  created_at,
  updated_at
)
```

说明：

- `sid` 只用于展示与搜索，但通常仍建议唯一；若学校允许为空则 `NULL`。fileciteturn2file2

建议索引：

- unique(`uuid`)
- unique(`sid`) where sid is not null
- index(`class_name`)
- index(`grade_level`)
- trigram / full text 可后续再加到姓名搜索

#### `parent_student_bindings`

```text
parent_student_bindings(
  id PK,
  uuid UNIQUE,
  parent_user_id FK -> users.id,
  student_id FK -> students.id,
  relationship_label NULL,
  is_primary,
  is_active,
  created_at,
  updated_at,
  UNIQUE(parent_user_id, student_id)
)
```

约束建议：

- `parent_user_id` 必须指向 role=`parent` 的用户（数据库无法直接靠 FK 保证，放业务层或触发器校验）
- v1 业务层额外限制：同一 `student_id` 最多一个 active binding

说明：

- 这是文档要求保留的未来扩展结构。fileciteturn2file2
- `relationship_label` 可存 `mother / father / guardian` 等，v1 可选。

建议索引：

- unique(`uuid`)
- unique(`parent_user_id`, `student_id`)
- index(`student_id`, `is_active`)
- index(`parent_user_id`, `is_active`)

#### `subjects`

```text
subjects(
  id PK,
  uuid UNIQUE,
  name,
  code NULL,
  is_active,
  created_at,
  updated_at,
  UNIQUE(code)
)
```

说明：

- 统一学科维表。
- 若 code 不是所有学校都有，可允许 NULL。

#### `teaching_assignments`

```text
teaching_assignments(
  id PK,
  uuid UNIQUE,
  teacher_user_id FK -> users.id,
  student_id FK -> students.id,
  subject_id FK -> subjects.id,
  is_homeroom,
  is_active,
  created_at,
  updated_at,
  UNIQUE(teacher_user_id, student_id, subject_id)
)
```

说明：

- 这张表非常关键，它决定：
  - 老师可见哪些学生
  - 学科详情里 student 与 subject 的关联
  - 讨论区中 parent 可联系哪些老师
  - 报告 / 公告是否可按 subject 归属
- 文档中的 teaching assignment 由 admin 维护。fileciteturn2file4

建议索引：

- unique(`teacher_user_id`, `student_id`, `subject_id`)
- index(`teacher_user_id`, `is_active`)
- index(`student_id`, `is_active`)
- index(`subject_id`, `is_active`)

---

### 4.3 报告

#### `reports`

```text
reports(
  id PK,
  uuid UNIQUE,
  student_id FK -> students.id,
  subject_id NULL FK -> subjects.id,
  author_user_id FK -> users.id,
  report_type,
  source_type,
  title,
  content_markdown,
  original_content_markdown,
  original_language,
  translated_content_markdown NULL,
  translated_language NULL,
  translation_status,
  translated_at NULL,
  created_at,
  updated_at,
  archived_at NULL
)
```

设计决定：

- `author_user_id` 保留作者，可以是 teacher，也可以是 system/admin 代表 AI 任务写入。
- `source_type` 表示来源是 `ai` 还是 `teacher`；不要仅根据 `author_user_id` 推断。
- `archived_at` 不代表用户归档。它只预留给全局资源级归档/软删除；v1 可以不使用。

说明：

- 接口返回既有 `content_markdown`，又有 original / translated 内容，因此主表直接存多语言正文最直观。fileciteturn0file0

建议索引：

- unique(`uuid`)
- index(`student_id`, `created_at desc`)
- index(`subject_id`, `created_at desc`)
- index(`author_user_id`, `created_at desc`)
- index(`report_type`)
- index(`source_type`)

#### `report_user_states`

```text
report_user_states(
  id PK,
  report_id FK -> reports.id,
  user_id FK -> users.id,
  is_read,
  read_at NULL,
  is_archived,
  archived_at NULL,
  created_at,
  updated_at,
  UNIQUE(report_id, user_id)
)
```

说明：

- 文档明确要求已读与归档属于用户个人状态。fileciteturn2file1
- v1 面向家长端时，通常这张表主要是 parent user 在用；但结构上不限制角色。

建议索引：

- unique(`report_id`, `user_id`)
- index(`user_id`, `is_read`)
- index(`user_id`, `is_archived`)
- index(`report_id`)

---

### 4.4 公告 / 任务

#### `announcements`

```text
announcements(
  id PK,
  uuid UNIQUE,
  category,
  student_id FK -> students.id,
  subject_id NULL FK -> subjects.id,
  author_user_id FK -> users.id,
  title,
  content_markdown,
  original_content_markdown,
  original_language,
  translated_content_markdown NULL,
  translated_language NULL,
  translation_status,
  translated_at NULL,
  published_at,
  due_at NULL,
  is_important,
  created_at,
  updated_at
)
```

设计决定：

- `student_id` 先做“面向单个学生”的模型，因为当前接口都是按 `/students/{student_uuid}/announcements` 读取。fileciteturn0file0
- 若未来要支持面向班级/多学生群发，再新增发布目标表，例如 `announcement_targets`。

建议索引：

- unique(`uuid`)
- index(`student_id`, `published_at desc`)
- index(`subject_id`, `published_at desc`)
- index(`category`, `published_at desc`)
- index(`due_at`)
- index(`is_important`, `published_at desc`)

#### `announcement_user_states`

```text
announcement_user_states(
  id PK,
  announcement_id FK -> announcements.id,
  user_id FK -> users.id,
  is_read,
  read_at NULL,
  created_at,
  updated_at,
  UNIQUE(announcement_id, user_id)
)
```

说明：

- 文档里公告只有“已读”，没有“归档”，所以先不加 `is_archived`。fileciteturn0file0
- 若未来要支持公告归档，可再加字段。

建议索引：

- unique(`announcement_id`, `user_id`)
- index(`user_id`, `is_read`)
- index(`announcement_id`)

---

### 4.5 讨论区

#### `discussion_threads`

```text
discussion_threads(
  id PK,
  uuid UNIQUE,
  student_id FK -> students.id,
  parent_user_id FK -> users.id,
  teacher_user_id FK -> users.id,
  last_post_at NULL,
  created_at,
  updated_at,
  UNIQUE(student_id, parent_user_id, teacher_user_id)
)
```

设计决定：

- 这是 thread 的核心唯一键，完全对应文档中的“每个 `parent + teacher + student` 组合只有一个固定 thread”。fileciteturn2file2
- thread 不需要 title，不需要 creator_user_id，不需要 status，v1 保持极简。
- thread 采用懒创建。fileciteturn2file1turn2file3

建议索引：

- unique(`uuid`)
- unique(`student_id`, `parent_user_id`, `teacher_user_id`)
- index(`parent_user_id`, `last_post_at desc`)
- index(`teacher_user_id`, `last_post_at desc`)
- index(`student_id`, `last_post_at desc`)

#### `tags`

```text
tags(
  id PK,
  uuid UNIQUE,
  scope,
  name,
  color NULL,
  description NULL,
  owner_teacher_user_id NULL FK -> users.id,
  is_selectable_by_parent,
  is_selectable_by_teacher,
  affects_business_logic,
  is_active,
  created_at,
  updated_at
)
```

约束建议：

- 当 `scope = 'system'` 时，`owner_teacher_user_id` 必须为 NULL
- 当 `scope = 'teacher_private'` 时，`owner_teacher_user_id` 必须非 NULL
- system tag：`UNIQUE(scope, name)`
- teacher private tag：`UNIQUE(owner_teacher_user_id, name)`

说明：

- 文档明确系统 tag 与老师私有 tag 并存。fileciteturn2file2turn2file4
- `important` 应作为 system tag 初始化，而不是普通老师私有 tag。fileciteturn2file0

建议索引：

- unique(`uuid`)
- unique(`scope`, `name`) where `scope = 'system'`
- unique(`owner_teacher_user_id`, `name`) where `scope = 'teacher_private'`
- index(`scope`, `is_active`)
- index(`owner_teacher_user_id`, `is_active`)

#### `posts`

```text
posts(
  id PK,
  uuid UNIQUE,
  thread_id FK -> discussion_threads.id,
  author_user_id FK -> users.id,
  reply_to_post_id NULL FK -> posts.id,
  title NULL,
  content_markdown,
  created_at,
  updated_at NULL,
  deleted_at NULL
)
```

设计决定：

- v1 用软删除 `deleted_at`，这样不会破坏 reply 链，也便于后续 moderation。
- 删除后接口层可返回“该帖子已删除”或直接不展示正文。
- `reply_to_post_id` 自关联即可，无需单独 replies 表。

建议索引：

- unique(`uuid`)
- index(`thread_id`, `created_at desc`)
- index(`author_user_id`, `created_at desc`)
- index(`reply_to_post_id`)
- partial index on `deleted_at is null`

#### `post_tags`

```text
post_tags(
  post_id FK -> posts.id,
  tag_id FK -> tags.id,
  created_at,
  PRIMARY KEY(post_id, tag_id)
)
```

说明：

- tag 只作用于 post，不作用于 thread。fileciteturn2file2turn2file0

#### `thread_user_states`（推荐加）

```text
thread_user_states(
  id PK,
  thread_id FK -> discussion_threads.id,
  user_id FK -> users.id,
  last_read_post_id NULL FK -> posts.id,
  last_read_at NULL,
  unread_count_cache,
  created_at,
  updated_at,
  UNIQUE(thread_id, user_id)
)
```

说明：

- 文档中讨论区列表与详情都需要 unread_post_count。fileciteturn0file0
- 若不用这张表，未读数每次动态算会更复杂。
- `unread_count_cache` 可先允许不完全精准，后续再优化，这也与文档“更完善的 unread 计数”为后置项一致。fileciteturn2file4

---

## 5. 可后置的扩展表

这些表不是第一阶段必须，但后续很可能需要。

### 5.1 `student_subject_metrics`

用于支撑 dashboard / subject detail 的聚合分数、完成率、出勤率。

```text
student_subject_metrics(
  id PK,
  student_id FK -> students.id,
  subject_id FK -> subjects.id,
  score NULL,
  progress NULL,
  assignment_completion_rate NULL,
  attendance_rate NULL,
  snapshot_date,
  created_at,
  UNIQUE(student_id, subject_id, snapshot_date)
)
```

### 5.2 `student_overall_metrics`

用于家长 dashboard 的总览卡片。

### 5.3 `translation_jobs`（如需异步翻译）

如果后续翻译状态不想只存在业务表中，可抽离任务表。

### 5.4 `audit_logs`

若 admin 审计要求增强，再补。

---

## 6. 关键设计决策与原因

### 6.1 为什么不把家长、老师拆成独立主体表

因为你的接口里大量字段都依赖统一 user：

- `/api/me`
- `/api/me/sessions`
- 登录 / 登出 / refresh
- 讨论区 author
- 报告 author
- 公告 author
- tag owner

统一 `users` 表最自然，复杂度最低。

### 6.2 为什么 `discussion_threads` 必须用三元唯一键

因为文档已经把 thread 的业务身份定义成固定三元组：

- `student`
- `parent`
- `teacher` fileciteturn2file2

如果不用 `UNIQUE(student_id, parent_user_id, teacher_user_id)`，后面很容易出现同一对话被重复创建的问题。

### 6.3 为什么 report / announcement 状态不能直接写资源表

文档明确要求：已读/归档是个人状态。fileciteturn2file1

如果写在资源表，会出现逻辑错误：

- 一个家长读了，另一个家长也被显示成已读
- 一个用户归档后别人也看不到

### 6.4 为什么 announcement 先不做多目标发送表

当前接口全部是围绕单个 student 拉取公告。fileciteturn0file0

所以 v1 更合适的做法是：

- 先把 `announcements.student_id` 做单学生目标
- 未来需要群发时再抽象目标表

这样能明显降低复杂度。

### 6.5 为什么 `tags` 要单表加 scope，而不是 system_tags / teacher_tags 两张表

因为前端读取 available_tags、post.tags 时需要统一结构。单表 + scope：

- 查询简单
- DTO 简单
- post_tags 关联简单
- 后续扩展 tag 属性更统一

### 6.6 为什么 `posts` 建议软删除

文档当前仅要求“只能作者删除自己帖子”，未要求物理删除。fileciteturn2file1

软删除更稳妥：

- 不破坏 reply_to 链路
- 便于后续 moderation
- 更适合审计与问题排查

---

## 7. 必须先建 vs 可以后建

## 7.1 第一批必须先建

这些表足够支撑阶段 1~3：认证、家长主流程、讨论区。fileciteturn2file3turn2file4

1. `users`
2. `user_settings`
3. `user_sessions`
4. `students`
5. `parent_student_bindings`
6. `subjects`
7. `teaching_assignments`
8. `reports`
9. `report_user_states`
10. `announcements`
11. `announcement_user_states`
12. `discussion_threads`
13. `tags`
14. `posts`
15. `post_tags`
16. `thread_user_states`

## 7.2 第二批可以后建

1. `student_subject_metrics`
2. `student_overall_metrics`
3. `translation_jobs`
4. `audit_logs`

---

## 8. 推荐索引策略

除了各表主键与唯一索引外，v1 额外建议：

### 8.1 列表查询高频索引

- `reports(student_id, created_at desc)`
- `announcements(student_id, published_at desc)`
- `posts(thread_id, created_at desc)`
- `discussion_threads(parent_user_id, last_post_at desc)`
- `discussion_threads(teacher_user_id, last_post_at desc)`

### 8.2 状态表高频索引

- `report_user_states(user_id, is_archived, is_read)`
- `announcement_user_states(user_id, is_read)`
- `thread_user_states(user_id)`

### 8.3 搜索相关

若后续需要 keyword 模糊搜索：

- `posts.title`
- `posts.content_markdown`
- `students.full_name`
- `students.sid`

可考虑 PostgreSQL `pg_trgm` 或全文索引，但不必一开始就上。

---

## 9. SQLModel 层建议

### 9.1 主键风格

每张表：

- `id: int | None = Field(default=None, primary_key=True)`
- `uuid: UUID = Field(default_factory=uuid4, index=True, unique=True)`

### 9.2 时间字段

统一：

- `created_at`
- `updated_at`
- 必要时 `deleted_at`

建议由数据库默认值或 SQLAlchemy `func.now()` 管理。

### 9.3 不要在 SQLModel relation 上过度双向展开

v1 只保留必要 `Relationship`，避免过深嵌套导致：

- N+1 查询
- 序列化混乱
- schema 循环依赖

### 9.4 DTO 不要直接复用 table model

文档已建议先定 Schema / DTO，再做 service / repository。fileciteturn2file0turn2file4

因此建议：

- SQLModel table model 只负责 ORM
- Pydantic schema 负责 API 输入输出

---

## 10. 最终定稿版 v1 关系模式清单

```text
users(id PK, uuid UNIQUE, role, email UNIQUE, password_hash, display_name, phone_number NULL,
      avatar_url NULL, is_active, last_login_at NULL, created_at, updated_at)

user_settings(id PK, user_id UNIQUE FK -> users.id, language NULL, timezone NULL, theme,
              high_contrast_mode, tts_enabled, email_digest_enabled,
              email_post_notification_enabled, default_report_time_range,
              default_announcement_time_range, created_at, updated_at)

user_sessions(id PK, uuid UNIQUE, user_id FK -> users.id, refresh_token_hash UNIQUE,
              device_label NULL, ip_address NULL, user_agent NULL,
              created_at, last_used_at, expires_at, revoked_at NULL)

students(id PK, uuid UNIQUE, sid UNIQUE NULL, full_name, preferred_name NULL,
         class_name NULL, grade_level NULL, avatar_url NULL, is_active,
         created_at, updated_at)

parent_student_bindings(id PK, uuid UNIQUE, parent_user_id FK -> users.id,
                        student_id FK -> students.id, relationship_label NULL,
                        is_primary, is_active, created_at, updated_at,
                        UNIQUE(parent_user_id, student_id))

subjects(id PK, uuid UNIQUE, name, code UNIQUE NULL, is_active, created_at, updated_at)

teaching_assignments(id PK, uuid UNIQUE, teacher_user_id FK -> users.id,
                     student_id FK -> students.id, subject_id FK -> subjects.id,
                     is_homeroom, is_active, created_at, updated_at,
                     UNIQUE(teacher_user_id, student_id, subject_id))

reports(id PK, uuid UNIQUE, student_id FK -> students.id, subject_id NULL FK -> subjects.id,
        author_user_id FK -> users.id, report_type, source_type, title,
        content_markdown, original_content_markdown, original_language,
        translated_content_markdown NULL, translated_language NULL,
        translation_status, translated_at NULL, created_at, updated_at, archived_at NULL)

report_user_states(id PK, report_id FK -> reports.id, user_id FK -> users.id,
                   is_read, read_at NULL, is_archived, archived_at NULL,
                   created_at, updated_at, UNIQUE(report_id, user_id))

announcements(id PK, uuid UNIQUE, category, student_id FK -> students.id,
              subject_id NULL FK -> subjects.id, author_user_id FK -> users.id,
              title, content_markdown, original_content_markdown, original_language,
              translated_content_markdown NULL, translated_language NULL,
              translation_status, translated_at NULL, published_at, due_at NULL,
              is_important, created_at, updated_at)

announcement_user_states(id PK, announcement_id FK -> announcements.id,
                         user_id FK -> users.id, is_read, read_at NULL,
                         created_at, updated_at, UNIQUE(announcement_id, user_id))

discussion_threads(id PK, uuid UNIQUE, student_id FK -> students.id,
                   parent_user_id FK -> users.id, teacher_user_id FK -> users.id,
                   last_post_at NULL, created_at, updated_at,
                   UNIQUE(student_id, parent_user_id, teacher_user_id))

tags(id PK, uuid UNIQUE, scope, name, color NULL, description NULL,
     owner_teacher_user_id NULL FK -> users.id, is_selectable_by_parent,
     is_selectable_by_teacher, affects_business_logic, is_active, created_at, updated_at)

posts(id PK, uuid UNIQUE, thread_id FK -> discussion_threads.id,
      author_user_id FK -> users.id, reply_to_post_id NULL FK -> posts.id,
      title NULL, content_markdown, created_at, updated_at NULL, deleted_at NULL)

post_tags(post_id FK -> posts.id, tag_id FK -> tags.id, created_at,
          PRIMARY KEY(post_id, tag_id))

thread_user_states(id PK, thread_id FK -> discussion_threads.id,
                   user_id FK -> users.id, last_read_post_id NULL FK -> posts.id,
                   last_read_at NULL, unread_count_cache, created_at, updated_at,
                   UNIQUE(thread_id, user_id))
```

---

## 11. 推荐的实现顺序（数据库视角）

1. 先建：`users` / `user_settings` / `user_sessions`
2. 再建：`students` / `subjects` / `parent_student_bindings` / `teaching_assignments`
3. 再建：`reports` / `report_user_states`
4. 再建：`announcements` / `announcement_user_states`
5. 再建：`discussion_threads` / `tags` / `posts` / `post_tags` / `thread_user_states`
6. 最后再考虑 dashboard 聚合表

这与原接口文档中“先认证底座，再家长主流程，再讨论区，再老师内容生产”的开发顺序是一致的。fileciteturn2file3turn2file4

---

## 12. 本文档的结论

对 v1 来说，推荐采用：

- **统一用户表**
- **绑定关系表保留未来扩展能力**
- **thread 三元唯一键**
- **report / announcement 使用独立用户状态表**
- **tag 单表 + scope**
- **discussion unread 单独状态表**
- **dashboard 聚合先不重度落表**

这套方案比较适合：

- 你的现有接口文档
- FastAPI + SQLModel 的实现习惯
- PostgreSQL 的关系建模方式
- MVP 阶段尽快打通家长主闭环与讨论区闭环
