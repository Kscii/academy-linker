# Academy Linker 数据库关系模式与表结构设计 v1

## 1. 设计目标

本文档用于将既有接口设计文档落到 PostgreSQL 关系模式，作为 FastAPI + SQLModel + PostgreSQL 后端实现阶段的数据库设计依据。

本设计遵循以下既有约束：

- 对外资源统一使用 `uuid`，数据库内部主键使用 `id`。
- 所有时间统一使用 UTC 保存。
- `report` / `announcement` 的已读与归档属于“用户个人状态”，必须拆到独立状态表，不写回资源主表。
- 讨论区中每个 `parent + teacher + student` 组合仅有一个固定 `thread` 容器，且 thread 采用懒创建。
- `tag` 只作用于 `post`，`important` 作为系统 tag；老师可维护自己的私有 tag。
- `parent / student` 虽然当前业务按 1:1 使用，但结构上必须保留绑定表以兼容未来扩展。

---

## 2. 总体建模原则

### 2.1 统一用户表，不拆 parent/teacher/admin 为三张独立主体表

- `users` 作为认证主体与用户主体表
- 通过 `role` 区分 `parent / teacher / admin`

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

---

## 3. 枚举列表

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

### 3.7 `session_status`

- `active`
- `revoked`
- `expired`

### 3.8 `translation_resource_type`

- `report`
- `announcement`
- `post`

### 3.9 `ai_conversation_context_type`

- `global`
- `student`
- `subject`

### 3.10 `ai_message_role`

- `user`
- `assistant`

PostgreSQL 中可用 `ENUM`，也可用 `TEXT + CHECK`。若重视迁移灵活性，建议 v1 用 `TEXT + CHECK`。

---

## 4. 关系模式(已经被实现的表需要标明已完成)

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

索引：

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
  ai_chat_style,
  ai_auto_translate_enabled,
  created_at,
  updated_at
)
```

说明：

- 每个 user 一条设置记录。
- `user_id` 唯一，形成 1:1。
- `ai_chat_style` 存 AI 对话风格偏好，如 `default / summary / parent_friendly`。
- `ai_auto_translate_enabled` 控制是否允许在读取资源时自动创建缺失译文缓存。

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

索引：

- unique(`uuid`)
- unique(`refresh_token_hash`)
- index(`user_id`, `expires_at`)
- partial index on active sessions where `revoked_at is null`

---

### 4.2 学生与教学关系

#### `classes`

```text
classes(
  id PK,
  uuid UNIQUE,
  name,
  grade_level NULL,
  academic_year NULL,
  homeroom_teacher_user_id NULL FK -> users.id,
  is_active,
  created_at,
  updated_at
)
```

说明：

- `name` 存班级名称，如"三年甲班"。
- `grade_level` 存年级标识，如"Grade 3"，与具体班级解耦便于跨年级查询。
- `academic_year` 存学年标识，如"2025-2026"，可选，用于历史班级归档。
- `homeroom_teacher_user_id` 代表本班班主任，由 admin 维护，替代原 `teaching_assignments.is_homeroom` 字段（见 §6.7）。
- 班级由 admin 专属 CRUD 管理。

索引：

- unique(`uuid`)
- index(`homeroom_teacher_user_id`)
- index(`is_active`)
- index(`grade_level`, `academic_year`)

#### `students`

```text
students(
  id PK,
  uuid UNIQUE,
  sid UNIQUE NULL,
  full_name,
  preferred_name NULL,
  class_id NULL FK -> classes.id,
  avatar_url NULL,
  date_of_birth NULL,
  is_active,
  created_at,
  updated_at
)
```

说明：

- `sid` 只用于展示与搜索，但通常仍建议唯一；若学校允许为空则 `NULL`。fileciteturn2file2

索引：

- unique(`uuid`)
- unique(`sid`) where sid is not null
- index(`class_id`)
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

索引：

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
- 老师写入 `student_exam_scores` / `student_period_metrics` 的权限边界由本表决定：只能写自己 `teaching_assignments` 中存在的 `(student_id, subject_id)` 组合。
- 文档中的 teaching assignment 由 admin 维护。

索引：

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
  period_start NULL,
  period_end NULL,
  content_markdown,
  original_content_markdown,
  original_language,
  created_at,
  updated_at,
  published_at NULL,
  archived_at NULL
)
```
现在基于新的api文档, 列出一份前端需要修改的接口列表, 分为前端需要修改的接口, 和后端暂时还没有实现的接口(在接口文档中还不存在)的列表
写在docs文件夹里面

设计决定：

- `author_user_id` 保留作者，可以是 teacher，也可以是 system/admin 代表 AI 任务写入。
- `source_type` 表示来源是 `ai` 还是 `teacher`；不要仅根据 `author_user_id` 推断。
- `period_start` / `period_end` 用于标识报告所覆盖的统计周期，AI report 的唯一性规则依赖这两个字段。
- `published_at` 用于支撑接口中的立即发布语义。
- `archived_at` 不代表用户归档。它只预留给全局资源级归档/软删除；v1 可以不使用。

说明：

- 报告主表只保存原文与原始语言；译文缓存统一转移到独立的 `resource_translations` 表。
- 对于 `source_type='ai'` 的报告，推荐使用部分唯一索引（可结合 `coalesce(subject_id, 0)`）约束同一 `student + subject(含 null) + report_type + period_start + period_end` 只存在一条 AI report。

索引：

- unique(`uuid`)
- index(`student_id`, `created_at desc`)
- index(`subject_id`, `created_at desc`)
- index(`author_user_id`, `created_at desc`)
- index(`report_type`)
- index(`source_type`)
- partial unique index on AI reports by `(student_id, coalesce(subject_id, 0), report_type, period_start, period_end)` where `source_type = 'ai'`

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

索引：

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
- 公告正文主表只保存原文与原始语言；译文缓存统一落到 `resource_translations`。

索引：

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

索引：

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

索引：

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

索引：

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
  original_language,
  created_at,
  updated_at NULL,
  deleted_at NULL
)
```

设计决定：

- v1 用软删除 `deleted_at`，这样不会破坏 reply 链，也便于后续 moderation。
- 删除后接口层可返回“该帖子已删除”或直接不展示正文。
- `reply_to_post_id` 自关联即可，无需单独 replies 表。
- `content_markdown` 视为原文正文；对应译文缓存统一落到 `resource_translations`。

索引：

- unique(`uuid`)
- index(`thread_id`, `created_at desc`)
- index(`author_user_id`, `created_at desc`)
- index(`reply_to_post_id`)
- partial index on `deleted_at is null`

#### `post_tags`

```text
post_tags(
  id PK,
  uuid UNIQUE,
  post_id FK -> posts.id,
  tag_id FK -> tags.id,
  created_at,
  updated_at,
  UNIQUE(post_id, tag_id)
)
```

说明：

- tag 只作用于 post，不作用于 thread。fileciteturn2file2turn2file0

#### `thread_user_states`

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

- 文档中讨论区列表与详情都需要 unread_post_count。
- 若不用这张表，未读数每次动态算会更复杂。
- `unread_count_cache` 可先允许不完全精准，后续再优化，这也与文档“更完善的 unread 计数”为后置项一致。

### 4.6 `student_exam_scores`

每条记录对应学生一次真实考试的得分，用于趋势图与历史成绩查询。

```text
student_exam_scores(
  id PK,
  uuid UNIQUE,
  student_id FK -> students.id,
  subject_id FK -> subjects.id,
  author_user_id FK -> users.id,
  exam_name NULL,
  exam_date,
  score,
  full_score,
  note NULL,
  created_at,
  updated_at
)
```

说明：

- 一条记录对应一次考试，`score` 为该次实际得分，`full_score` 默认 100。
- 不加唯一约束，允许同一天同一科目有多次考试（如"正考"+"补考"）。
- 老师只能为自己 `teaching_assignments` 中存在的 `(student_id, subject_id)` 组合创建记录；admin 无此限制。
- 家长可读（仅限绑定学生）；家长不可写入。

索引：

- unique(`uuid`)
- index(`student_id`, `subject_id`, `exam_date desc`)
- index(`author_user_id`)

### 4.7 `student_period_metrics`

用于支撑 dashboard / subject detail 的学期周期快照指标：完成率、出勤率、学习进度。

```text
student_period_metrics(
  id PK,
  uuid UNIQUE,
  student_id FK -> students.id,
  subject_id FK -> subjects.id,
  author_user_id FK -> users.id,
  term NULL,
  progress NULL,
  assignment_completion_rate NULL,
  attendance_rate NULL,
  snapshot_date,
  created_at,
  updated_at,
  UNIQUE(student_id, subject_id, snapshot_date)
)
```

说明：

- 一条记录对应一个时间点的指标快照，`snapshot_date` + `(student_id, subject_id)` 唯一。
- `term` 存学期标识，如"2025-T1"，可选。
- 老师只能为自己 `teaching_assignments` 中的学生/科目创建；admin 无此限制。
- 家长可读（仅限绑定学生）；家长不可写入。

索引：

- unique(`uuid`)
- unique(`student_id`, `subject_id`, `snapshot_date`)
- index(`author_user_id`)

### 4.8 `student_overall_metrics`

用于家长 dashboard 的总览卡片。

---

### 4.9 `resource_translations`

用于统一缓存 `report / announcement / post` 在不同目标语言下的译文。

```text
resource_translations(
  id PK,
  uuid UNIQUE,
  resource_type,
  resource_id,
  language,
  translated_content_markdown,
  translation_status,
  translated_at NULL,
  created_at,
  updated_at,
  UNIQUE(resource_type, resource_id, language)
)
```

说明：

- 该表使用 `resource_type + resource_id` 的多态关联形式，统一支撑 `report`、`announcement`、`post` 三类资源的译文缓存。
- 由于是统一资源表，不直接对单一资源表做数据库级 FK；资源存在性与访问权限由业务层保证。
- 详情接口仅读缓存；缺失译文时，由 `POST /api/translations/resolve` 负责创建并回写缓存。
- 当原文资源内容发生变化时，后端应将对应资源的全部译文缓存标记为 `stale`。

索引：

- unique(`uuid`)
- unique(`resource_type`, `resource_id`, `language`)
- index(`resource_type`, `resource_id`)
- index(`language`, `translation_status`)

### 4.10 AI 会话

#### `ai_conversations`

```text
ai_conversations(
  id PK,
  uuid UNIQUE,
  user_id FK -> users.id,
  context_type,
  student_id NULL FK -> students.id,
  subject_id NULL FK -> subjects.id,
  title NULL,
  is_archived,
  archived_at NULL,
  last_message_at NULL,
  created_at,
  updated_at,
  deleted_at NULL
)
```

说明：

- AI 会话独立于 `discussion_threads`，不复用家长/老师讨论区的 thread/post 结构。
- `context_type = 'global'` 时，`student_id` 与 `subject_id` 必须均为 NULL。
- `context_type = 'student'` 时，`student_id` 必须非 NULL，`subject_id` 必须为 NULL。
- `context_type = 'subject'` 时，`student_id` 与 `subject_id` 必须均非 NULL。
- v1 允许同一用户在相同 context 下创建多条 conversation。
- 删除采用软删除 `deleted_at`。

索引：

- unique(`uuid`)
- index(`user_id`, `updated_at desc`)
- index(`user_id`, `is_archived`, `updated_at desc`)
- index(`student_id`, `updated_at desc`)
- index(`subject_id`, `updated_at desc`)
- partial index on `deleted_at is null`

#### `ai_messages`

```text
ai_messages(
  id PK,
  uuid UNIQUE,
  conversation_id FK -> ai_conversations.id,
  role,
  preset NULL,
  content_markdown,
  created_at,
  deleted_at NULL
)
```

说明：

- `role` 取值 `user / assistant`。
- `preset` 仅对 user message 有意义，assistant message 固定为 NULL。
- v1 先不记录 token usage / provider / model；若后续需要审计，再单独扩字段或引入日志表。

索引：

- unique(`uuid`)
- index(`conversation_id`, `created_at`)
- index(`role`, `created_at`)
- partial index on `deleted_at is null`

---

## 6. 历史关键设计决策记录

- 不把家长、老师拆成独立主体表
- `discussion_threads` 用三元唯一键
- report / announcement 状态不能直接写资源表
- announcement 先不做多目标发送表
- `tags` 要单表加 scope，而不是 system_tags / teacher_tags 两张表
- `posts` 需要使用软删除
- 统一使用 `resource_translations` 作为译文缓存表，而不是把所有译文直接写回资源主表
- AI 会话独立建模，不复用 discussion thread/post
- 学生换班时的业务操作规范

## 7. 表清单

1. `users`
2. `user_settings`
3. `user_sessions`
4. `classes`
5. `students`
6. `parent_student_bindings`
7. `subjects`
8. `teaching_assignments`
9. `reports`
10. `report_user_states`
11. `announcements`
12. `announcement_user_states`
13. `discussion_threads`
14. `tags`
15. `posts`
16. `post_tags`
17. `thread_user_states`
18. `student_exam_scores`
19. `student_period_metrics`
20. `student_overall_metrics`
21. `resource_translations`
22. `ai_conversations`
23. `ai_messages`
24. `audit_logs`

---

## 9. SQLModel 层设计原则

### 9.1 主键风格

每张表：

- `id: int | None = Field(default=None, primary_key=True)`
- `uuid: UUID = Field(default_factory=uuid4, index=True, unique=True)`

### 9.2 时间字段

统一：

- `created_at`
- `updated_at`
- 必要时 `deleted_at`

由数据库默认值或 SQLAlchemy `func.now()` 管理。

### 9.3 不要在 SQLModel relation 上过度双向展开

v1 只保留必要 `Relationship`，避免过深嵌套

### 9.4 DTO 不要直接复用 table model

- SQLModel table model 只负责 ORM
- Pydantic schema 负责 API 输入输出

## 10. 最终定稿版 v1 关系模式清单

```text
users(id PK, uuid UNIQUE, role, email UNIQUE, password_hash, display_name, phone_number NULL,
      avatar_url NULL, is_active, last_login_at NULL, created_at, updated_at)

user_settings(id PK, user_id UNIQUE FK -> users.id, language NULL, timezone NULL, theme,
              high_contrast_mode, tts_enabled, email_digest_enabled,
              email_post_notification_enabled, default_report_time_range,
              default_announcement_time_range, ai_chat_style,
              ai_auto_translate_enabled, created_at, updated_at)

user_sessions(id PK, uuid UNIQUE, user_id FK -> users.id, refresh_token_hash UNIQUE,
              device_label NULL, ip_address NULL, user_agent NULL,
              created_at, last_used_at, expires_at, revoked_at NULL)

classes(id PK, uuid UNIQUE, name, grade_level NULL, academic_year NULL,
        homeroom_teacher_user_id NULL FK -> users.id, is_active, created_at, updated_at)

students(id PK, uuid UNIQUE, sid UNIQUE NULL, full_name, preferred_name NULL,
         class_id NULL FK -> classes.id, avatar_url NULL, date_of_birth NULL,
         is_active, created_at, updated_at)

parent_student_bindings(id PK, uuid UNIQUE, parent_user_id FK -> users.id,
                        student_id FK -> students.id, relationship_label NULL,
                        is_primary, is_active, created_at, updated_at,
                        UNIQUE(parent_user_id, student_id))

subjects(id PK, uuid UNIQUE, name, code UNIQUE NULL, is_active, created_at, updated_at)

teaching_assignments(id PK, uuid UNIQUE, teacher_user_id FK -> users.id,
                     student_id FK -> students.id, subject_id FK -> subjects.id,
                     is_active, created_at, updated_at,
                     UNIQUE(teacher_user_id, student_id, subject_id))

reports(id PK, uuid UNIQUE, student_id FK -> students.id, subject_id NULL FK -> subjects.id,
        author_user_id FK -> users.id, report_type, source_type, title,
        period_start NULL, period_end NULL, content_markdown,
        original_content_markdown, original_language,
        created_at, updated_at, published_at NULL, archived_at NULL)

report_user_states(id PK, report_id FK -> reports.id, user_id FK -> users.id,
                   is_read, read_at NULL, is_archived, archived_at NULL,
                   created_at, updated_at, UNIQUE(report_id, user_id))

announcements(id PK, uuid UNIQUE, category, student_id FK -> students.id,
              subject_id NULL FK -> subjects.id, author_user_id FK -> users.id,
              title, content_markdown, original_content_markdown, original_language,
              published_at, due_at NULL, is_important, created_at, updated_at)

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
      title NULL, content_markdown, original_language,
      created_at, updated_at NULL, deleted_at NULL)

post_tags(id PK, uuid UNIQUE, post_id FK -> posts.id, tag_id FK -> tags.id,
          created_at, updated_at, UNIQUE(post_id, tag_id))

thread_user_states(id PK, thread_id FK -> discussion_threads.id,
                   user_id FK -> users.id, last_read_post_id NULL FK -> posts.id,
                   last_read_at NULL, unread_count_cache, created_at, updated_at,
                   UNIQUE(thread_id, user_id))

student_exam_scores(id PK, uuid UNIQUE, student_id FK -> students.id,
                    subject_id FK -> subjects.id, author_user_id FK -> users.id,
                    exam_name NULL, exam_date, score, full_score, note NULL,
                    created_at, updated_at)

student_period_metrics(id PK, uuid UNIQUE, student_id FK -> students.id,
                       subject_id FK -> subjects.id, author_user_id FK -> users.id,
                       term NULL, progress NULL, assignment_completion_rate NULL,
                       attendance_rate NULL, snapshot_date, created_at, updated_at,
                       UNIQUE(student_id, subject_id, snapshot_date))

resource_translations(id PK, uuid UNIQUE, resource_type, resource_id, language,
                      translated_content_markdown, translation_status,
                      translated_at NULL, created_at, updated_at,
                      UNIQUE(resource_type, resource_id, language))

ai_conversations(id PK, uuid UNIQUE, user_id FK -> users.id, context_type,
                 student_id NULL FK -> students.id, subject_id NULL FK -> subjects.id,
                 title NULL, is_archived, archived_at NULL, last_message_at NULL,
                 created_at, updated_at, deleted_at NULL)

ai_messages(id PK, uuid UNIQUE, conversation_id FK -> ai_conversations.id,
            role, preset NULL, content_markdown, created_at, deleted_at NULL)
```