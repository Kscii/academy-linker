# Academy Linker API 设计文档 v1

## 1. 文档目的

本文档用于统一前后端的接口设计约定，作为 v1 开发阶段的唯一接口参考。

目标：

- 前后端基于同一份接口文档并行开发
- 尽量减少实现阶段的歧义
- 明确请求/响应结构、错误码、权限边界与安全约定
- 给出推荐实现顺序，便于按阶段推进

---

## 接口索引

> 开发状态：**（已完成）** = 已完成开发；**（未完成）** = 尚未开发；**（变更）** = 接口定义相对初始版本发生了变更。

### 认证与账户 (§7)

| 方法 | 路径 | 说明 | 状态 |
|---|---|---|:---:|
| POST | `/api/auth/login` | 登录 | 已完成 |
| POST | `/api/auth/refresh` | 刷新 Access Token | 已完成 |
| POST | `/api/auth/logout` | 登出当前设备 | 已完成 |
| POST | `/api/auth/logout_all` | 登出所有设备 | 已完成 |
| GET | `/api/me` | 获取当前用户信息 | 已完成 |
| PATCH | `/api/me` | 更新当前用户资料 | 已完成 |
| POST | `/api/me/change_password` | 修改密码 | 已完成 |
| GET | `/api/me/sessions` | 获取当前登录会话列表 | 已完成 |
| DELETE | `/api/me/sessions/{session_uuid}` | 删除指定会话 | 已完成 |

### 设置 (§8)

| 方法 | 路径 | 说明 | 状态 |
|---|---|---|:---:|
| GET | `/api/settings` | 获取当前用户设置 | 已完成 |
| PATCH | `/api/settings` | 更新当前用户设置 | 已完成 |

### 家长端 (§9)

| 方法 | 路径 | 说明 | 状态 |
|---|---|---|:---:|
| GET | `/api/parents/me/students` | 获取绑定的学生列表 | 已完成 |
| GET | `/api/parents/me/students/{student_uuid}/dashboard` | 学生 Dashboard 聚合数据 | 已完成 |
| GET | `/api/parents/me/students/{student_uuid}/subjects` | 学生学科列表 | 已完成 |
| GET | `/api/parents/me/students/{student_uuid}/subjects/{subject_uuid}` | 某学科详情聚合数据 | 已完成 |
| GET | `/api/parents/me/students/{student_uuid}/reports` | 报告列表 | 已完成 |
| GET | `/api/parents/me/students/{student_uuid}/reports/{report_uuid}` | 报告详情 | 已完成 |
| POST | `/api/reports/{report_uuid}/read` | 标记报告为已读 | 已完成 |
| POST | `/api/reports/{report_uuid}/archive` | 归档报告 | 已完成 |
| POST | `/api/reports/{report_uuid}/unarchive` | 取消归档报告 | 已完成 |
| GET | `/api/parents/me/students/{student_uuid}/announcements` | 公告/任务列表 | 已完成 |
| GET | `/api/announcements/{announcement_uuid}` | 公告/任务详情 | 已完成 |
| POST | `/api/announcements/{announcement_uuid}/read` | 标记公告为已读 | 已完成 |
| GET | `/api/parents/me/students/{student_uuid}/discussions/teachers` | 学生讨论教师列表 | 已完成 |
| GET | `/api/parents/me/students/{student_uuid}/discussions/teachers/{teacher_uuid}` | 与某老师的讨论页 | 已完成 |
| POST | `/api/threads/{thread_uuid}/posts` | 创建帖子（家长/老师共用） | 已完成 |
| PATCH | `/api/posts/{post_uuid}` | 编辑帖子（家长/老师共用） | 已完成 |
| DELETE | `/api/posts/{post_uuid}` | 删除帖子（家长/老师共用） | 已完成 |
| GET | `/api/parents/me/students/{student_uuid}/exam-scores` | 学生考试成绩列表（家长视角） | 未完成 |
| GET | `/api/parents/me/students/{student_uuid}/period-metrics` | 学生周期指标列表（家长视角） | 未完成 |

### 老师端 (§10)

| 方法 | 路径 | 说明 | 状态 |
|---|---|---|:---:|
| GET | `/api/teachers/me/students` | 老师负责的学生列表 | 已完成 |
| GET | `/api/teachers/me/students/{student_uuid}/dashboard` | 老师视角学生 Dashboard | 已完成 |
| GET | `/api/teachers/me/students/{student_uuid}/discussions/parents` | 学生讨论家长列表 | 已完成 |
| GET | `/api/teachers/me/students/{student_uuid}/discussions/parents/{parent_uuid}` | 与某家长讨论页 | 已完成 |
| GET | `/api/teachers/me/tags` | 获取可用 Tag 列表 | 未完成 |
| POST | `/api/teachers/me/tags` | 创建私有 Tag | 未完成 |
| PATCH | `/api/teachers/me/tags/{tag_uuid}` | 更新私有 Tag | 未完成 |
| DELETE | `/api/teachers/me/tags/{tag_uuid}` | 删除私有 Tag | 未完成 |
| POST | `/api/teachers/me/students/{student_uuid}/reports` | 创建报告 | 已完成 |
| PATCH | `/api/reports/{report_uuid}` | 更新报告（老师/admin 共用） | 已完成 |
| POST | `/api/teachers/me/students/{student_uuid}/announcements` | 创建公告/任务 | 已完成 |
| PATCH | `/api/announcements/{announcement_uuid}` | 更新公告/任务（老师/admin 共用） | 已完成 |
| GET | `/api/teachers/me/classes` | 老师负责的班级列表 | 未完成 |
| GET | `/api/teachers/me/classes/{class_uuid}/students` | 班级学生列表 | 未完成 |
| GET | `/api/teachers/me/classes/{class_uuid}/grade-stats` | 班级成绩统计 | 未完成 |
| GET | `/api/teachers/me/students/{student_uuid}/exam-scores` | 学生考试成绩列表（老师视角） | 未完成 |
| POST | `/api/teachers/me/students/{student_uuid}/exam-scores` | 创建考试成绩 | 未完成 |
| PATCH | `/api/teachers/me/students/{student_uuid}/exam-scores/{score_uuid}` | 更新考试成绩 | 未完成 |
| DELETE | `/api/teachers/me/students/{student_uuid}/exam-scores/{score_uuid}` | 删除考试成绩 | 未完成 |
| GET | `/api/teachers/me/students/{student_uuid}/period-metrics` | 学生周期指标列表（老师视角） | 未完成 |
| POST | `/api/teachers/me/students/{student_uuid}/period-metrics` | 创建/更新周期指标 | 未完成 |

### Admin 端 (§11)

| 方法 | 路径 | 说明 | 状态 |
|---|---|---|:---:|
| GET | `/api/admin/users` | 获取用户列表 | 已完成 |
| POST | `/api/admin/users` | 创建用户 | 已完成 |
| PATCH | `/api/admin/users/{user_uuid}` | 更新用户 | 已完成 |
| GET | `/api/admin/students` | 获取学生列表 | 已完成 |
| POST | `/api/admin/students` | 创建学生 | 已完成 |
| PATCH | `/api/admin/students/{student_uuid}` | 更新学生 | 已完成 |
| GET | `/api/admin/bindings/parent_student` | Parent-Student 绑定列表 | 已完成 |
| POST | `/api/admin/bindings/parent_student` | 创建 Parent-Student 绑定 | 已完成 |
| PATCH | `/api/admin/bindings/parent_student/{binding_uuid}` | 更新 Parent-Student 绑定 | 已完成 |
| GET | `/api/admin/assignments/teaching` | Teaching Assignment 列表 | 已完成 |
| POST | `/api/admin/assignments/teaching` | 创建 Teaching Assignment | 已完成 |
| PATCH | `/api/admin/assignments/teaching/{assignment_uuid}` | 更新 Teaching Assignment | 已完成 |
| GET | `/api/admin/tags/system` | 获取系统 Tag 列表 | 已完成 |
| POST | `/api/admin/tags/system` | 创建系统 Tag | 已完成 |
| PATCH | `/api/admin/tags/system/{tag_uuid}` | 更新系统 Tag | 已完成 |
| GET | `/api/admin/classes` | 获取班级列表 | 未完成 |
| POST | `/api/admin/classes` | 创建班级 | 未完成 |
| PATCH | `/api/admin/classes/{class_uuid}` | 更新班级 | 未完成 |
| POST | `/api/admin/students/{student_uuid}/transfer-class` | 学生换班（原子操作） | 未完成 |

---

## 2. 系统固定前提

### 2.1 鉴权方案

- 使用 **JWT + Access Token + Refresh Token**
- `access_token` 与 `refresh_token` 均存放于 **HttpOnly Cookie**
- `access_token` 过期时间：**15 分钟**
- `refresh_token` 过期时间：**3 天**
- 使用“方案 2”登出策略：
  - 删除对应 `refresh_token` 记录
  - 不做 access token 即时撤销检查
  - 因此旧 `access_token` 最多仍可能保留 **15 分钟**
- `SameSite=Lax`
- 浏览器写请求校验 `Origin`
- 不使用 `Authorization: Bearer ...`

### 2.2 ID 规则

所有资源统一采用双 ID 设计：

- 数据库内部主键：`id`（自增整数）
- 对外接口资源标识：`uuid`
- 学生展示字段：`sid`

约定：

- 前端路由与接口 path 参数一律使用 `uuid`
- `sid` 只用于展示与搜索，不用于唯一标识

### 2.3 字段命名规则

- 全项目 JSON 字段统一使用 `snake_case`

### 2.4 时间规则

- 数据库与后端内部时间统一保存为 **UTC**
- 接口返回时间统一为 **ISO 8601** 字符串
- 前端根据用户时区进行展示转换

### 2.5 语言与翻译规则

所有可展示且可能存在双语版本的文本，统一支持以下字段：

- `original_language`
- `original_*`
- `translated_language`
- `translated_*`
- `translation_status`
- `translated_at`

`translation_status` 枚举：

- `not_required`
- `pending`
- `completed`
- `failed`
- `stale`

### 2.6 讨论区规则

当前 v1 设计：

- 每个 `parent + teacher + student` 组合只存在 **一个固定 thread 容器**
- 不开放创建 thread 的接口
- 页面上的帖子在该 thread 下按筛选、排序、分页平铺展示
- `tag` 只作用于 `post`
- tag 分两种：
  - **系统 tag**：按初始化数据预置，只有 admin 可修改，**所有用户（parent / teacher）均可使用**
  - **老师私有 tag**：每个老师自行创建，可被**该老师本人**及**与该老师有关的家长**（即处于同一 thread 的家长）使用
- `important` 为系统 tag，所有用户均可打，参与 dashboard 展示逻辑
- 家长不能创建 tag
- 老师可创建自己的私有 tag

> 注：当前的 `thread` 更接近“固定会话容器”，不是用户可自由创建的主题讨论串。

### 2.7 parent / student 关系

当前业务逻辑临时按 1:1 使用，但数据库结构保留未来扩展为 1:N / N:M 的可能。

即：

- 逻辑上当前可只允许一个 parent 对一个 student
- 结构上仍保留 `parent_student_bindings` 这种绑定表设计

---

## 3. 通用请求与响应约定

## 3.1 通用请求 Header

| Header | 是否必需 | 示例 | 说明 |
|---|---:|---|---|
| `Content-Type` | 写请求必需 | `application/json` | JSON body |
| `Accept-Language` | 可选 | `zh-CN`, `en-AU` | 用于服务端确定默认展示语言 |
| `X-Timezone` | 可选 | `Australia/Sydney` | 用于服务端处理时间展示上下文 |
| `Origin` | 浏览器写请求必需 | `http://localhost:5173` | 后端白名单校验 |
| `Cookie` | 认证接口外通常必需 | 自动 | 浏览器自动携带 `access_token`，refresh 接口同时携带 `refresh_token` |

## 3.2 前端实现注意事项

- 所有跨域请求必须带 `credentials: 'include'`
- 前端不能尝试读取 `HttpOnly Cookie`
- 收到 `401 access_token_expired` 时，前端应先调用 refresh 接口，再重试一次原请求
- refresh 失败时，应清空前端登录状态并跳转登录页

## 3.3 成功响应格式

### 单对象

```json
{
  "data": {}
}
```

### 列表

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

### 无数据成功

```json
{
  "data": {
    "success": true
  }
}
```

## 3.4 错误响应格式

```json
{
  "error": {
    "code": "forbidden",
    "message": "You do not have access to this student.",
    "details": {}
  }
}
```

---

## 4. 错误设计原则

### 4.1 原则

- **`code` 优先，HTTP 状态码为辅**：HTTP 状态码表达错误类别（4xx/5xx），`code` 字段表达具体原因；前端应以 `code` 作为程序逻辑判断的依据。
- **接口文档不维护 Error 条目**：通用的权限、参数校验、资源不存在等错误遵循本节全局约定，无需在各接口中逐一列出。接口文档仅在存在不明显的业务规则（如特殊状态冲突、条件权限）时，在 `规则` 节中描述，不重复列出 error code。
- **401 与 403 明确分层**：`401` = 未认证（无身份）；`403` = 已认证但无权（有身份、缺权限）。任何需要登录的接口均可能返回 `401` 系列，任何有角色或资源权限限制的接口均可能返回 `403`。
- **403 不伪装成 404**：v1 不做防枚举策略。资源不存在始终返回 `404`，权限不足始终返回 `403`。
- **409 用于状态冲突，422 用于参数校验**：`409` 表示请求在逻辑上引发了资源状态冲突（如重复绑定、已归档）；`422` 表示请求体字段不符合格式或约束。
- **500 不暴露内部细节**：服务端内部错误统一使用 `internal_error`，不向客户端泄露 stack trace 或数据库错误信息。

### 4.2 错误码一览表

| HTTP | code | 说明 |
|---:|---|---|
| 400 | `bad_request` | 请求格式错误 |
| 400 | `invalid_sort` | 排序参数非法 |
| 400 | `invalid_filter` | 筛选参数非法 |
| 400 | `invalid_pagination` | 分页参数非法 |
| 400 | `invalid_state_transition` | 状态变更非法 |
| 401 | `unauthenticated` | 未登录或 cookie 缺失 |
| 401 | `access_token_expired` | access token 过期 |
| 401 | `refresh_token_expired` | refresh token 过期 |
| 401 | `invalid_token` | token 无效 |
| 403 | `forbidden` | 无权限 |
| 403 | `origin_not_allowed` | Origin 校验失败 |
| 403 | `role_not_allowed` | 角色不允许 |
| 404 | `not_found` | 资源不存在 |
| 409 | `conflict` | 资源冲突 |
| 409 | `duplicate_tag_name` | tag 名称冲突 |
| 409 | `already_archived` | 已归档 |
| 409 | `already_read` | 已读状态重复提交 |
| 422 | `validation_error` | body/参数校验失败 |
| 429 | `rate_limited` | 请求过频 |
| 500 | `internal_error` | 服务端内部错误 |

---

## 5. 通用 Schema

### 5.1 `user_summary`

```json
{
  "uuid": "string",
  "role": "parent | teacher | admin",
  "display_name": "string",
  "email": "string",
  "avatar_url": "string | null"
}
```

### 5.2 `student_summary`

```json
{
  "uuid": "string",
  "sid": "string | null",
  "full_name": "string",
  "preferred_name": "string | null",
  "class_uuid": "string | null",
  "class_name": "string | null",
  "grade_level": "string | null",
  "avatar_url": "string | null"
}
```

> 注：`class_name` 与 `grade_level` 从 `classes` 表 JOIN 后平铺返回，前端无需额外请求。

### 5.3 `teacher_summary`

```json
{
  "uuid": "string",
  "display_name": "string",
  "email": "string",
  "avatar_url": "string | null",
  "subjects": [
    {
      "uuid": "string",
      "name": "string"
    }
  ]
}
```

### 5.4 `subject_summary`

```json
{
  "uuid": "string",
  "name": "string",
  "code": "string | null",
  "teacher": {
    "uuid": "string",
    "display_name": "string"
  }
}
```

### 5.5 `translation_block`

```json
{
  "display_language": "string",
  "original_language": "string",
  "translated_language": "string | null",
  "translation_status": "not_required | pending | completed | failed | stale",
  "translated_at": "string | null"
}
```

### 5.6 `pagination_meta`

```json
{
  "page": 1,
  "page_size": 20,
  "total": 100,
  "total_pages": 5
}
```

---

## 6. Cookie 与安全传输约定

- Token 通过 **HttpOnly Cookie** 传递，前端不直接读取
- `access_token`：`Path=/`，随所有业务请求自动携带
- `refresh_token`：`Path=/api/auth/refresh`，仅在刷新接口携带，减少暴露面
- `SameSite=Lax`：降低 CSRF 风险，同时兼顾正常导航
- 所有写操作（`POST` / `PATCH` / `PUT` / `DELETE`）后端校验 `Origin` 白名单，防止 CSRF

---

## 7. 认证与账户接口

### 7.1 登录（已完成）

**POST** `/api/auth/login`

#### Body

```json
{
  "email": "string",
  "password": "string",
  "remember_me": false
}
```

#### Success 200

- Set-Cookie: `access_token`
- Set-Cookie: `refresh_token`

```json
{
  "data": {
    "user": {
      "uuid": "string",
      "role": "parent | teacher | admin",
      "display_name": "string",
      "email": "string",
      "avatar_url": "string | null"
    }
  }
}
```

---

### 7.2 刷新 Access Token（已完成）

**POST** `/api/auth/refresh`

#### Header

- 浏览器请求要求 `Origin`
- Cookie 中必须带 `refresh_token`

#### Body

无

#### Success 200

- Set-Cookie: 新 `access_token`

```json
{
  "data": {
    "success": true
  }
}
```

#### 注释

- 前端仅在收到 `401 access_token_expired` 后调用
- 本项目 refresh 只刷新 AT，不做 RT rotation

---

### 7.3 登出当前设备（已完成）

**POST** `/api/auth/logout`

#### Body

无

#### Success 200

- 清空当前设备 `access_token` cookie
- 清空当前设备 `refresh_token` cookie
- 删除当前设备 refresh token 记录

```json
{
  "data": {
    "success": true
  }
}
```

#### 注释

- 旧 AT 若已被其他地方拿到，理论上最多仍可在剩余 15 分钟内使用

---

### 7.4 登出所有设备（已完成）

**POST** `/api/auth/logout_all`

#### Body

无

#### Success 200

- 清空当前设备 cookie
- 删除该用户所有 refresh token 记录

```json
{
  "data": {
    "success": true
  }
}
```

#### 注释

- 旧 access token 最多仍可能保留到各自过期时间
- 由于当前不做 access token 撤销检查，登出所有设备不是“绝对即时强制失效”

---

### 7.5 获取当前用户信息（已完成）

**GET** `/api/me`

#### Success 200

```json
{
  "data": {
    "user": {
      "uuid": "string",
      "role": "parent | teacher | admin",
      "display_name": "string",
      "email": "string",
      "phone_number": "string | null",
      "avatar_url": "string | null"
    }
  }
}
```

---

### 7.6 更新当前用户资料（已完成）

**PATCH** `/api/me`

#### Body

```json
{
  "display_name": "string | null",
  "phone_number": "string | null",
  "avatar_url": "string | null"
}
```

#### Success 200

```json
{
  "data": {
    "user": {
      "uuid": "string",
      "role": "parent | teacher | admin",
      "display_name": "string",
      "email": "string",
      "phone_number": "string | null",
      "avatar_url": "string | null"
    }
  }
}
```

---

### 7.7 修改密码（已完成）

**POST** `/api/me/change_password`

#### Body

```json
{
  "current_password": "string",
  "new_password": "string"
}
```

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

### 7.8 获取当前登录会话列表（已完成）

**GET** `/api/me/sessions`

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "device_label": "string | null",
      "ip_address": "string | null",
      "user_agent": "string | null",
      "created_at": "string",
      "last_used_at": "string",
      "is_current": true
    }
  ]
}
```

---

### 7.9 删除指定会话（已完成）

**DELETE** `/api/me/sessions/{session_uuid}`

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

## 8. 设置接口

### 8.1 获取当前用户设置（已完成）

**GET** `/api/settings`

#### Success 200

```json
{
  "data": {
    "language": "string | null",
    "timezone": "string | null",
    "theme": "system | light | dark",
    "high_contrast_mode": false,
    "tts_enabled": false,
    "email_digest_enabled": false,
    "email_post_notification_enabled": false,
    "default_report_time_range": "all_time | 7d | 30d | 90d",
    "default_announcement_time_range": "all_time | 7d | 30d | 90d"
  }
}
```

---

### 8.2 更新当前用户设置（已完成）

**PATCH** `/api/settings`

#### Body

```json
{
  "language": "string | null",
  "timezone": "string | null",
  "theme": "system | light | dark | null",
  "high_contrast_mode": "boolean | null",
  "tts_enabled": "boolean | null",
  "email_digest_enabled": "boolean | null",
  "email_post_notification_enabled": "boolean | null",
  "default_report_time_range": "all_time | 7d | 30d | 90d | null",
  "default_announcement_time_range": "all_time | 7d | 30d | 90d | null"
}
```

#### Success 200

返回更新后的完整 settings。

---

## 9. 家长端接口

### 9.1 获取当前家长绑定的学生列表（已完成）

**GET** `/api/parents/me/students`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | int | 否 | 默认 1 |
| `page_size` | int | 否 | 默认 20，最大 100 |

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string",
      "preferred_name": "string | null",
      "class_uuid": "string | null",
      "class_name": "string | null",
      "grade_level": "string | null",
      "avatar_url": "string | null"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

---

### 9.2 获取学生 Dashboard 聚合数据（已完成）

**GET** `/api/parents/me/students/{student_uuid}/dashboard`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `range` | enum | 否 | `7d`, `30d`, `90d`, `all_time` |

#### Success 200

```json
{
  "data": {
    "student": {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string",
      "preferred_name": "string | null",
      "class_uuid": "string | null",
      "class_name": "string | null",
      "grade_level": "string | null",
      "avatar_url": "string | null"
    },
    "dashboard_context": {
      "selected_range": "30d",
      "unread_post_count": 2,
      "unread_announcement_count": 3
    },
    "summary_cards": {
      "overall_performance_index": 85.5,
      "assignment_completion_rate": 0.92,
      "attendance_rate": 0.97,
      "summary": {
        "report_uuid": "string",
        "report_title": "string",
        "display_text": "string",
        "original_text": "string",
        "translated_text": "string | null",
        "display_language": "string",
        "original_language": "string",
        "translated_language": "string | null",
        "translation_status": "completed",
        "translated_at": "string | null"
      }
    },
    "subject_statistics": [
      {
        "subject_uuid": "string",
        "subject_name": "Mathematics",
        "score": 88.0,
        "progress": 0.75,
        "assignment_completion_rate": 0.95
      }
    ],
    "charts": {
      "subject_score_bar_chart": [
        {
          "subject_uuid": "string",
          "subject_name": "Mathematics",
          "value": 88.0
        }
      ],
      "subject_completion_bar_chart": [
        {
          "subject_uuid": "string",
          "subject_name": "Mathematics",
          "value": 0.95
        }
      ],
      "learning_progress_chart": [
        {
          "label": "2026-04-01",
          "value": 0.72
        }
      ]
    },
    "important_post_banners": [
      {
        "post_uuid": "string",
        "teacher_uuid": "string",
        "teacher_display_name": "string",
        "title": "string | null",
        "preview_text": "string",
        "created_at": "string"
      }
    ]
  }
}
```

---

### 9.3 获取学生学科列表（已完成）

**GET** `/api/parents/me/students/{student_uuid}/subjects`

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "name": "Mathematics",
      "code": "MATH",
      "teachers": [
        {
          "uuid": "string",
          "display_name": "string"
        }
      ]
    }
  ]
}
```

---

### 9.4 获取某学科详情聚合数据（已完成）

**GET** `/api/parents/me/students/{student_uuid}/subjects/{subject_uuid}`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `range` | enum | 否 | `7d`, `30d`, `90d`, `all_time` |

#### Success 200

```json
{
  "data": {
    "student": {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string"
    },
    "subject": {
      "uuid": "string",
      "name": "Mathematics",
      "code": "MATH",
      "teachers": [
        {
          "uuid": "string",
          "display_name": "string",
          "email": "string"
        }
      ]
    },
    "overview": {
      "score": 88.0,
      "progress": 0.75,
      "assignment_completion_rate": 0.95,
      "attendance_rate": 0.98
    },
    "timeline": [
      {
        "label": "2026-04-01",
        "score": 87.5,
        "progress": 0.72
      }
    ],
    "summary": {
      "report_uuid": "string",
      "report_title": "string",
      "display_text": "string",
      "original_text": "string",
      "translated_text": "string | null",
      "display_language": "string",
      "original_language": "string",
      "translated_language": "string | null",
      "translation_status": "completed",
      "translated_at": "string | null"
    }
  }
}
```

> 注：`summary` 取该学生该学科最近一条 report（不限 source_type）的正文内容，若无 report 则为 `null`。

---

### 9.5 获取报告列表（已完成）

**GET** `/api/parents/me/students/{student_uuid}/reports`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | int | 否 | 默认 1 |
| `page_size` | int | 否 | 默认 20 |
| `status` | enum | 否 | `active`, `archived`, `all`，默认 `active` |
| `read_state` | enum | 否 | `unread`, `read`, `all`，默认 `all` |
| `sort` | enum | 否 | `created_at_desc`, `created_at_asc` |

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "title": "string",
      "report_type": "weekly | monthly | custom",
      "source_type": "ai | teacher",
      "subject": {
        "uuid": "string",
        "name": "string",
        "code": "string | null"
      },
      "is_read": false,
      "read_at": "string | null",
      "is_archived": false,
      "archived_at": "string | null",
      "created_at": "string",
      "published_at": "string | null",
      "translation": {
        "display_language": "string",
        "original_language": "string",
        "translated_language": "string | null",
        "translation_status": "not_required | pending | completed | failed | stale",
        "translated_at": "string | null"
      }
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 12,
    "total_pages": 1
  }
}
```

---

### 9.6 获取报告详情（已完成）

**GET** `/api/parents/me/students/{student_uuid}/reports/{report_uuid}`

#### Success 200

```json
{
  "data": {
    "uuid": "string",
    "title": "string",
    "report_type": "weekly | monthly | custom",
    "source_type": "ai | teacher",
    "subject": {
      "uuid": "string",
      "name": "string",
      "code": "string | null"
    },
    "is_read": false,
    "read_at": "string | null",
    "is_archived": false,
    "archived_at": "string | null",
    "created_at": "string",
    "published_at": "string | null",
    "display_content_markdown": "string",
    "original_content_markdown": "string",
    "translated_content_markdown": "string | null",
    "display_language": "string",
    "original_language": "string",
    "translated_language": "string | null",
    "translation_status": "completed",
    "translated_at": "string | null"
  }
}
```

> 注：`display_content_markdown` 由后端根据 `translation_status` 自动选择 original / translated 版本，前端直接渲染即可。`display_language` 表示当前展示文本所用的语言。

---

### 9.7 标记报告为已读（已完成）

**POST** `/api/reports/{report_uuid}/read`

#### Body

无

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

### 9.8 归档报告（已完成）

**POST** `/api/reports/{report_uuid}/archive`

#### Body

无

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

### 9.9 取消归档报告（已完成）

**POST** `/api/reports/{report_uuid}/unarchive`

#### Body

无

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

### 9.10 获取公告/任务列表（已完成）

**GET** `/api/parents/me/students/{student_uuid}/announcements`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | int | 否 | 默认 1 |
| `page_size` | int | 否 | 默认 20 |
| `category` | enum | 否 | `announcement`, `task`, `all` |
| `active_only` | boolean | 否 | 默认 true |
| `sort` | enum | 否 | `published_at_desc`, `published_at_asc`, `due_at_asc` |

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "category": "announcement | task",
      "title": "string",
      "subject": {
        "uuid": "string",
        "name": "string",
        "code": "string | null"
      },
      "is_important": true,
      "is_read": false,
      "read_at": "string | null",
      "published_at": "string",
      "due_at": "string | null",
      "translation": {
        "display_language": "string",
        "original_language": "string",
        "translated_language": "string | null",
        "translation_status": "not_required | pending | completed | failed | stale",
        "translated_at": "string | null"
      }
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 10,
    "total_pages": 1
  }
}
```

---

### 9.11 获取公告/任务详情（已完成）

**GET** `/api/announcements/{announcement_uuid}`

#### Success 200

```json
{
  "data": {
    "uuid": "string",
    "category": "announcement | task",
    "title": "string",
    "subject": {
      "uuid": "string",
      "name": "string",
      "code": "string | null"
    },
    "is_important": true,
    "is_read": false,
    "read_at": "string | null",
    "published_at": "string",
    "due_at": "string | null",
    "author": {
      "uuid": "string",
      "display_name": "string",
      "role": "teacher | admin"
    },
    "display_content_markdown": "string",
    "original_content_markdown": "string",
    "translated_content_markdown": "string | null",
    "display_language": "string",
    "original_language": "string",
    "translated_language": "string | null",
    "translation_status": "completed",
    "translated_at": "string | null"
  }
}
```

> 注：`display_content_markdown` 由后端根据 `translation_status` 自动选择 original / translated 版本。`display_language` 表示当前展示文本所用的语言。

---

### 9.12 标记公告为已读（已完成）

**POST** `/api/announcements/{announcement_uuid}/read`

#### Body

无

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

### 9.13 获取学生讨论教师列表（已完成）

**GET** `/api/parents/me/students/{student_uuid}/discussions/teachers`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `sort` | enum | 否 | `last_post_at_desc`, `display_name_asc` |

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "display_name": "string",
      "avatar_url": "string | null",
      "subjects": [
        {
          "uuid": "string",
          "name": "string",
          "code": "string | null"
        }
      ],
      "thread_uuid": "string | null",
      "last_post_at": "string | null",
      "unread_post_count": 2
    }
  ]
}
```

> 注：`thread_uuid` 在家长还没有打开过讨论页时为 `null`（懒创建）。`subjects` 为该教师教这个学生的学科列表。

---

### 9.14 获取与某老师的讨论页聚合数据（已完成）

**GET** `/api/parents/me/students/{student_uuid}/discussions/teachers/{teacher_uuid}`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | int | 否 | 默认 1 |
| `page_size` | int | 否 | 默认 20 |
| `sort` | enum | 否 | `created_at_desc`, `created_at_asc` |
| `tag` | string | 否 | tag 名称过滤 |
| `keyword` | string | 否 | 标题/正文模糊搜索 |

#### Success 200

```json
{
  "data": {
    "thread_uuid": "string",
    "student": {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string"
    },
    "teacher": {
      "uuid": "string",
      "display_name": "string",
      "avatar_url": "string | null",
      "subjects": [
        {
          "uuid": "string",
          "name": "string",
          "code": "string | null"
        }
      ]
    },
    "posts": [
      {
        "uuid": "string",
        "author": {
          "uuid": "string",
          "display_name": "string",
          "role": "parent | teacher"
        },
        "title": "string | null",
        "content_markdown": "string",
        "is_deleted": false,
        "reply_to_post_uuid": "string | null",
        "tags": [
          {
            "uuid": "string",
            "name": "important",
            "scope": "system | teacher_private"
          }
        ],
        "created_at": "string",
        "updated_at": "string | null"
      }
    ],
    "meta": {
      "page": 1,
      "page_size": 20,
      "total": 10,
      "total_pages": 1
    }
  }
}
```

> 注：`thread_uuid` 为本次访问自动懒创建或已存在的 thread uuid；访问该接口会自动将当前家长的 `unread_post_count` 重置为 0。`is_deleted=true` 的帖子 `content_markdown` 固定返回 `"[该帖子已删除]"`。
>
> **TODO**：`available_tags`（当前用户可用的 tag 列表）计划在后续迭代中作为本接口的补充字段加入，当前前端可通过 `GET /api/teachers/me/tags` 独立获取。

---

### 9.15 家长创建帖子（已完成）

**POST** `/api/threads/{thread_uuid}/posts`

#### Body

```json
{
  "title": "string | null",
  "content_markdown": "string",
  "tag_uuids": ["string"],
  "reply_to_post_uuid": "string | null"
}
```

#### 规则

- 家长可使用所有系统 tag
- 家长可使用当前讨论教师的私有 tag
- 不属于当前讨论教师的私有 tag 返回 403

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "author": {
      "uuid": "string",
      "display_name": "string",
      "role": "parent"
    },
    "title": "string | null",
    "content_markdown": "string",
    "is_deleted": false,
    "reply_to_post_uuid": "string | null",
    "tags": [
      {
        "uuid": "string",
        "name": "question",
        "scope": "system"
      }
    ],
    "created_at": "string",
    "updated_at": null
  }
}
```

---

### 9.16 家长编辑自己发的帖子（已完成）

**PATCH** `/api/posts/{post_uuid}`

#### Body

```json
{
  "title": "string | null",
  "content_markdown": "string | null",
  "tag_uuids": ["string"] 
}
```

> 注：`tag_uuids` 若提供则整体替换现有标签；若不提供（字段缺失）则保持不变。

#### 规则

- 仅作者可编辑
- 家长只能使用系统 tag 或当前讨论教师的私有 tag
- 不支持编辑作者角色和 thread 归属

#### Success 200

返回更新后的完整帖子，结构与创建帖子的响应一致（见 §9.15 Success 201）。

---

### 9.17 家长删除自己发的帖子（已完成）

**DELETE** `/api/posts/{post_uuid}`

#### 规则

- 仅作者可删除
- 家长不能删除老师发的帖子

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

### 9.18 获取学生考试成绩列表（家长视角）

**GET** `/api/parents/me/students/{student_uuid}/exam-scores`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `subject_uuid` | string | 否 | 科目过滤 |
| `exam_date_from` | string | 否 | 考试日期起 |
| `exam_date_to` | string | 否 | 考试日期止 |
| `page` | int | 否 | 默认 1 |
| `page_size` | int | 否 | 默认 20 |

#### 规则

- 仅允许查看自己绑定的学生（`parent_student_bindings` 存在且 `is_active=true`），否则返回 `403 forbidden`。
- 返回该学生所有科目的考试成绩，老师端与 admin 端写入的都会出现。

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "subject": {
        "uuid": "string",
        "name": "string"
      },
      "exam_name": "string | null",
      "exam_date": "string",
      "score": 88.5,
      "full_score": 100.0,
      "note": "string | null",
      "author": {
        "uuid": "string",
        "display_name": "string"
      },
      "created_at": "string"
    }
  ],
  "meta": {}
}
```

---

### 9.19 获取学生周期指标列表（家长视角）

**GET** `/api/parents/me/students/{student_uuid}/period-metrics`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `subject_uuid` | string | 否 | 科目过滤 |
| `term` | string | 否 | 学期过滤，如 `2025-T1` |

#### 规则

- 仅允许查看自己绑定的学生（`parent_student_bindings` 存在且 `is_active=true`），否则返回 `403 forbidden`。

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "subject": {
        "uuid": "string",
        "name": "string"
      },
      "term": "string | null",
      "snapshot_date": "string",
      "progress": 0.75,
      "assignment_completion_rate": 0.90,
      "attendance_rate": 0.95,
      "author": {
        "uuid": "string",
        "display_name": "string"
      },
      "created_at": "string"
    }
  ]
}
```

---

## 10. 老师端接口

### 10.1 获取老师负责的学生列表（已完成）

**GET** `/api/teachers/me/students`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | int | 否 | 默认 1 |
| `page_size` | int | 否 | 默认 20，最大 100 |
| `class_uuid` | string | 否 | 班级过滤（UUID） |
| `subject_uuid` | string | 否 | 学科过滤 |
| `keyword` | string | 否 | `sid` / 姓名模糊匹配 |
| `sort` | enum | 否 | `full_name_asc`, `full_name_desc`, `sid_asc`, `sid_desc`, `score_desc`, `score_asc`, `last_activity_at_desc` |

> **注：** `score_desc` / `score_asc` 因 `student_metrics` 表尚未建立，`score` 字段始终返回 `null`，排序回退到 `full_name_asc`。`last_activity_at_desc` 按该教师与该学生最近一条未删除 post 的时间排序，无帖子时排最后。

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string",
      "preferred_name": "string | null",
      "class_uuid": "string | null",
      "class_name": "string | null",
      "grade_level": "string | null",
      "avatar_url": "string | null",
      "score": null,
      "last_activity_at": "string | null"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 200,
    "total_pages": 10
  }
}
```

---

### 10.2 获取老师视角学生 Dashboard（已完成）

**GET** `/api/teachers/me/students/{student_uuid}/dashboard`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `range` | enum | 否 | `7d`, `30d`, `90d`, `all_time` |

#### Success 200

```json
{
  "data": {
    "student": {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string",
      "preferred_name": "string | null",
      "class_uuid": "string | null",
      "class_name": "string | null",
      "grade_level": "string | null",
      "avatar_url": "string | null"
    },
    "unread_post_count": 2,
    "summary_cards": {
      "overall_performance_index": null,
      "assignment_completion_rate": null,
      "attendance_rate": null,
      "summary": {
        "report_uuid": "string",
        "report_title": "string",
        "display_text": "string",
        "original_text": "string",
        "translated_text": "string | null",
        "display_language": "string",
        "original_language": "string",
        "translated_language": "string | null",
        "translation_status": "completed",
        "translated_at": "string | null"
      }
    }
  }
}
```

> **注：**
> - `unread_post_count` = 当前教师在该学生所有 thread 中的未读帖子缓存总数。
> - `summary` 取该学生**所有来源**的最近一条 `is_published=true` 报告，若无报告则为 `null`。
> - 聚合指标（`overall_performance_index` 等）待 `student_metrics` 表建好后填充，当前始终为 `null`。

---

### 10.3 获取老师视角学生讨论家长列表（已完成）

**GET** `/api/teachers/me/students/{student_uuid}/discussions/parents`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `sort` | enum | 否 | `last_post_at_desc`, `display_name_asc` |

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "display_name": "string",
      "avatar_url": "string | null",
      "thread_uuid": "string | null",
      "last_post_at": "string | null",
      "unread_post_count": 2
    }
  ]
}
```

> 注：`thread_uuid` 在教师还没有打开过讨论页时为 `null`（懒创建）。

---

### 10.4 获取老师与某家长讨论页（已完成）

**GET** `/api/teachers/me/students/{student_uuid}/discussions/parents/{parent_uuid}`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | int | 否 | 默认 1 |
| `page_size` | int | 否 | 默认 20 |
| `sort` | enum | 否 | `created_at_desc`, `created_at_asc` |
| `tag` | string | 否 | tag 名称过滤 |
| `keyword` | string | 否 | 标题/正文模糊搜索 |

#### Success 200

```json
{
  "data": {
    "thread_uuid": "string",
    "student": {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string"
    },
    "parent": {
      "uuid": "string",
      "display_name": "string",
      "avatar_url": "string | null"
    },
    "posts": [
      {
        "uuid": "string",
        "author": {
          "uuid": "string",
          "display_name": "string",
          "role": "parent | teacher"
        },
        "title": "string | null",
        "content_markdown": "string",
        "is_deleted": false,
        "reply_to_post_uuid": "string | null",
        "tags": [
          {
            "uuid": "string",
            "name": "important",
            "scope": "system | teacher_private"
          }
        ],
        "created_at": "string",
        "updated_at": "string | null"
      }
    ],
    "meta": {
      "page": 1,
      "page_size": 20,
      "total": 10,
      "total_pages": 1
    }
  }
}
```

> 注：访问该接口会自动将当前教师的 `unread_post_count` 重置为 0。`is_deleted=true` 的帖子 `content_markdown` 固定返回 `"[该帖子已删除]"`。

---

### 10.5 老师创建帖子（已完成）

**POST** `/api/threads/{thread_uuid}/posts`

#### Body

```json
{
  "title": "string | null",
  "content_markdown": "string",
  "tag_uuids": ["string"],
  "reply_to_post_uuid": "string | null"
}
```

#### 规则

- 老师可使用所有系统 tag
- 老师可使用自己的私有 tag（非自己的 private tag 返回 403）
- `important` 为系统 tag，老师和家长均可使用

#### Success 201

返回创建的帖子，结构与 §9.15 Success 201 一致。

---

### 10.6 老师编辑自己发的帖子（已完成）

**PATCH** `/api/posts/{post_uuid}`

#### Body

同 §9.16，`tag_uuids` 若提供则整体替换现有标签。

#### 规则

- 仅作者可编辑
- private tag 必须是自己创建的

#### Success 200

返回更新后的完整帖子，结构与 §9.15 Success 201 一致。

---

### 10.7 老师删除自己发的帖子（已完成）

**DELETE** `/api/posts/{post_uuid}`

#### 规则

- 仅作者可删除

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

### 10.8 获取可用 Tag 列表

**GET** `/api/teachers/me/tags`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `scope` | enum | 否 | `system`, `teacher_private`, `all`；默认 `all` |

#### 规则

- `all`：返回 `is_selectable_by_teacher=true` 的系统 tag + 当前教师所有私有 tag
- `system`：仅返回 `is_selectable_by_teacher=true` 的系统 tag
- `teacher_private`：仅返回当前教师的私有 tag
- `is_active=false` 的 tag 不出现在列表中
- `is_selectable_by_teacher=false` 的系统 tag 不出现在列表中

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "name": "important",
      "scope": "system | teacher_private",
      "owner_teacher_uuid": "string | null",
      "is_selectable_by_parent": true,
      "is_selectable_by_teacher": true,
      "affects_business_logic": true
    }
  ]
}
```

---

### 10.9 老师创建私有 Tag

**POST** `/api/teachers/me/tags`

#### Body

```json
{
  "name": "string"
}
```

#### 规则

- 仅创建 `teacher_private` tag
- `name` 不能为空或纯空格，最大长度 64 字符，前后空格自动 trim
- 同名私有 tag 已存在（`is_active=true`）时返回 409 `duplicate_tag_name`
- 创建后的私有 tag 对关联家长（同 thread 下的家长）自动可见，无需额外配置

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "name": "string",
    "scope": "teacher_private",
    "owner_teacher_uuid": "string",
    "is_selectable_by_parent": true,
    "is_selectable_by_teacher": true,
    "affects_business_logic": false
  }
}
```

---

### 10.10 老师更新私有 Tag

**PATCH** `/api/teachers/me/tags/{tag_uuid}`

#### Body

```json
{
  "name": "string"
}
```

#### 规则

- 只能修改自己的私有 tag
- 更新系统 tag 或他人私有 tag 返回 403 `forbidden`
- `name` 不能为空或纯空格，最大长度 64 字符，前后空格自动 trim
- 改名后与当前教师已有 active 同名私有 tag 冲突返回 409 `duplicate_tag_name`

#### Success 200

返回更新后的完整 tag 对象，结构与 §10.9 Success 201 一致。

---

### 10.11 老师删除私有 Tag

**DELETE** `/api/teachers/me/tags/{tag_uuid}`

#### 规则

- 只能删除自己的私有 tag（软删除：`is_active=false`）
- 删除系统 tag 或他人私有 tag 返回 403 `forbidden`
- 软删除后，已有帖子上的该 tag 历史记录保留（不受影响），但该 tag 不再出现在可用列表中

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

### 10.12 老师创建报告（已完成）

**POST** `/api/teachers/me/students/{student_uuid}/reports`

#### Body

```json
{
  "title": "string",
  "report_type": "weekly | monthly | custom",
  "subject_uuid": "string | null",
  "content_markdown": "string",
  "original_language": "string",
  "translation_status": "not_required | pending | completed | failed | stale",
  "translated_content_markdown": "string | null",
  "translated_language": "string | null",
  "translated_at": "string | null"
}
```

#### 规则

- `source_type` 固定为 `teacher`，不可由客户端传入
- 若提供 `subject_uuid`，后端验证 `teaching_assignment(teacher, student, subject)` 三元分配存在且 active
- 创建后立即发布（`is_published=true`，`published_at=now()`）

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "title": "string",
    "report_type": "weekly | monthly | custom",
    "source_type": "teacher",
    "subject": {
      "uuid": "string",
      "name": "string",
      "code": "string | null"
    },
    "author": {
      "uuid": "string",
      "display_name": "string",
      "role": "teacher"
    },
    "created_at": "string",
    "published_at": "string",
    "display_content_markdown": "string",
    "original_content_markdown": "string",
    "translated_content_markdown": "string | null",
    "display_language": "string",
    "original_language": "string",
    "translated_language": "string | null",
    "translation_status": "not_required",
    "translated_at": "string | null"
  }
}
```

---

### 10.13 老师更新报告（已完成）

**PATCH** `/api/reports/{report_uuid}`

#### Body

所有字段均为可选。缺失字段不更新；支持 null 的字段若显式传 `null` 则置为 null。

```json
{
  "title": "string | null",
  "report_type": "weekly | monthly | custom | null",
  "subject_uuid": "string | null",
  "content_markdown": "string | null",
  "original_language": "string | null",
  "translation_status": "not_required | pending | completed | failed | stale | null",
  "translated_content_markdown": "string | null",
  "translated_language": "string | null",
  "translated_at": "string | null"
}
```

#### 规则

- 仅报告创建者（teacher）或 admin 可更新
- **禁止修改** `student`（由创建时的路径决定）和 `source_type`
- 若更新了 `content_markdown` 且当前 `translation_status == completed`，后端自动将 `translation_status` 置为 `stale`
- 若提供 `subject_uuid`，验证 `teaching_assignment` 三元关联；admin 跳过此验证
- 不影响家长个人 `is_read` / `is_archived` 状态

#### Success 200

返回更新后的完整报告，结构与 §10.12 Success 201 一致。

---

### 10.14 老师创建公告/任务（已完成）

**POST** `/api/teachers/me/students/{student_uuid}/announcements`

#### Body

```json
{
  "category": "announcement | task",
  "title": "string",
  "subject_uuid": "string | null",
  "content_markdown": "string",
  "original_language": "string",
  "translation_status": "not_required | pending | completed | failed | stale",
  "translated_content_markdown": "string | null",
  "translated_language": "string | null",
  "translated_at": "string | null",
  "published_at": "string | null",
  "due_at": "string | null",
  "is_important": false
}
```

#### 规则

- `published_at` 为空时默认服务端当前时间（UTC）
- 若提供 `subject_uuid`，验证 `teaching_assignment` 三元关联
- `is_important` 允许老师设置
- 创建后立即发布（`is_published=true`）

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "category": "announcement | task",
    "title": "string",
    "subject": {
      "uuid": "string",
      "name": "string",
      "code": "string | null"
    },
    "is_important": false,
    "author": {
      "uuid": "string",
      "display_name": "string",
      "role": "teacher"
    },
    "published_at": "string",
    "due_at": "string | null",
    "created_at": "string",
    "display_content_markdown": "string",
    "original_content_markdown": "string",
    "translated_content_markdown": "string | null",
    "display_language": "string",
    "original_language": "string",
    "translated_language": "string | null",
    "translation_status": "not_required",
    "translated_at": "string | null"
  }
}
```

---

### 10.15 老师更新公告/任务（已完成）

**PATCH** `/api/announcements/{announcement_uuid}`

#### Body

所有字段均为可选。缺失字段不更新；支持 null 的字段若显式传 `null` 则置为 null。

```json
{
  "category": "announcement | task | null",
  "title": "string | null",
  "subject_uuid": "string | null",
  "content_markdown": "string | null",
  "original_language": "string | null",
  "translation_status": "not_required | pending | completed | failed | stale | null",
  "translated_content_markdown": "string | null",
  "translated_language": "string | null",
  "translated_at": "string | null",
  "published_at": "string | null",
  "due_at": "string | null",
  "is_important": "boolean | null"
}
```

#### 规则

- 仅公告创建者（teacher）或 admin 可更新
- **禁止修改** `student` 和 `author`
- 若更新了 `content_markdown` 且当前 `translation_status == completed`，后端自动将 `translation_status` 置为 `stale`
- 若提供 `subject_uuid`，验证 `teaching_assignment` 三元关联；admin 跳过此验证

#### Success 200

返回更新后的完整公告，结构与 §10.14 Success 201 一致。

---


### 10.16 获取老师负责的班级列表

**GET** `/api/teachers/me/classes`

#### 规则

- 返回当前老师在 `teaching_assignments` 中有 active 记录的所有不重复班级。
- 若老师同时是某班班主任（`classes.homeroom_teacher_user_id`），响应中 `is_homeroom` 为 `true`。

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "name": "string",
      "grade_level": "string | null",
      "academic_year": "string | null",
      "is_homeroom": false,
      "student_count": 12
    }
  ]
}
```

---

### 10.17 获取班级学生列表（老师视角）

**GET** `/api/teachers/me/classes/{class_uuid}/students`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | int | 否 | 默认 1 |
| `page_size` | int | 否 | 默认 50 |
| `subject_uuid` | string | 否 | 进一步过滤：只返回该老师同时教该科目的学生 |
| `keyword` | string | 否 | `sid` / 姓名模糊匹配 |

#### 规则

- 只返回该老师在此班有 active `teaching_assignment` 的学生。

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string",
      "preferred_name": "string | null",
      "avatar_url": "string | null",
      "subjects": [
        {
          "uuid": "string",
          "name": "string"
        }
      ]
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 50,
    "total": 30,
    "total_pages": 1
  }
}
```

---

### 10.18 获取班级成绩统计（老师视角）

**GET** `/api/teachers/me/classes/{class_uuid}/grade-stats`

按班级汇总该老师负责科目的考试成绩统计，可用于成绩排行和班级横向对比。

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `subject_uuid` | string | 否 | 限定科目；不传则汇总该老师在此班所有科目 |
| `exam_date_from` | string | 否 | 考试日期起（ISO 8601 date） |
| `exam_date_to` | string | 否 | 考试日期止 |

#### Success 200

```json
{
  "data": {
    "class": {
      "uuid": "string",
      "name": "string",
      "grade_level": "string | null"
    },
    "summary": {
      "student_count": 12,
      "avg_score": 82.5,
      "max_score": 98.0,
      "min_score": 61.0,
      "exam_count": 3
    },
    "students": [
      {
        "student_uuid": "string",
        "full_name": "string",
        "sid": "string | null",
        "subject_scores": [
          {
            "subject_uuid": "string",
            "subject_name": "string",
            "avg_score": 88.5,
            "latest_score": 90.0,
            "exam_count": 3
          }
        ]
      }
    ]
  }
}
```

---

### 10.19 获取学生考试成绩列表（老师视角）

**GET** `/api/teachers/me/students/{student_uuid}/exam-scores`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `subject_uuid` | string | 否 | 科目过滤 |
| `exam_date_from` | string | 否 | 考试日期起 |
| `exam_date_to` | string | 否 | 考试日期止 |
| `page` | int | 否 | 默认 1 |
| `page_size` | int | 否 | 默认 20 |

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "subject": {
        "uuid": "string",
        "name": "string"
      },
      "exam_name": "string | null",
      "exam_date": "string",
      "score": 88.5,
      "full_score": 100.0,
      "note": "string | null",
      "author": {
        "uuid": "string",
        "display_name": "string"
      },
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "meta": {}
}
```

---

### 10.20 创建学生考试成绩（老师视角）

**POST** `/api/teachers/me/students/{student_uuid}/exam-scores`

#### Body

```json
{
  "subject_uuid": "string",
  "exam_name": "string | null",
  "exam_date": "string",
  "score": 88.5,
  "full_score": 100.0,
  "note": "string | null"
}
```

#### 规则

- 后端验证 `teaching_assignment(teacher, student, subject)` 三元组存在且 active，否则返回 `403 forbidden`。
- `exam_date` 为必填，格式 ISO 8601 date（`YYYY-MM-DD`）。
- `score` 必须 <= `full_score`；`full_score` 默认 100，必须 > 0。

#### Success 201

返回创建的成绩条目，结构与 §10.19 Success 200 中的单条记录一致。

---

### 10.21 更新考试成绩（老师视角）

**PATCH** `/api/teachers/me/students/{student_uuid}/exam-scores/{score_uuid}`

#### Body

所有字段均为可选。

```json
{
  "exam_name": "string | null",
  "exam_date": "string | null",
  "score": "number | null",
  "full_score": "number | null",
  "note": "string | null"
}
```

#### 规则

- 只有创建者（teacher）或 admin 可修改。
- 不允许修改 `subject_uuid`（科目不可变）。

#### Success 200

返回更新后的完整成绩条目。

---

### 10.22 删除考试成绩（老师视角）

**DELETE** `/api/teachers/me/students/{student_uuid}/exam-scores/{score_uuid}`

#### 规则

- 只有创建者（teacher）或 admin 可删除（物理删除）。

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

### 10.23 获取学生周期指标列表（老师视角）

**GET** `/api/teachers/me/students/{student_uuid}/period-metrics`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `subject_uuid` | string | 否 | 科目过滤 |
| `term` | string | 否 | 学期过滤，如 `2025-T1` |

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "subject": {
        "uuid": "string",
        "name": "string"
      },
      "term": "string | null",
      "snapshot_date": "string",
      "progress": 0.75,
      "assignment_completion_rate": 0.90,
      "attendance_rate": 0.95,
      "author": {
        "uuid": "string",
        "display_name": "string"
      },
      "created_at": "string"
    }
  ]
}
```

---

### 10.24 创建/更新学生周期指标（老师视角）

**POST** `/api/teachers/me/students/{student_uuid}/period-metrics`

#### Body

```json
{
  "subject_uuid": "string",
  "term": "string | null",
  "snapshot_date": "string",
  "progress": "number | null",
  "assignment_completion_rate": "number | null",
  "attendance_rate": "number | null"
}
```

#### 规则

- UPSERT 语义：`(student_id, subject_id, snapshot_date)` 已存在则更新，否则新建。
- 后端验证 `teaching_assignment(teacher, student, subject)` 三元组存在且 active。
- 所有比率字段须在 `[0.0, 1.0]` 范围内；`progress` 同上。

#### Success 200/201

返回创建或更新后的指标条目，结构与 §10.23 Success 200 中的单条一致。

---

## 11. Admin 接口

> **权限要求：本节所有接口仅允许 `admin` 角色访问。非 admin 角色一律返回 `403 role_not_allowed`。**

---

### 11.1 获取用户列表（已完成）

**GET** `/api/admin/users`

#### Query

- `page`
- `page_size`
- `role`
- `keyword`
- `sort=created_at_desc|created_at_asc|display_name_asc`

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "role": "parent | teacher | admin",
      "display_name": "string",
      "email": "string",
      "is_active": true,
      "created_at": "string"
    }
  ],
  "meta": {}
}
```

---

### 11.2 创建用户（已完成）

**POST** `/api/admin/users`

#### Body

```json
{
  "role": "parent | teacher | admin",
  "display_name": "string",
  "email": "string",
  "phone_number": "string | null",
  "password": "string"
}
```

#### 密码强度规则

- 最少 **8** 个字符
- 至少包含 **1** 个大写字母
- 至少包含 **1** 个小写字母
- 至少包含 **1** 个数字

不满足时返回 `422 validation_error`，`details` 中说明具体失败项。

---

### 11.3 更新用户（已完成）

**PATCH** `/api/admin/users/{user_uuid}`

#### Body

```json
{
  "display_name": "string | null",
  "phone_number": "string | null",
  "avatar_url": "string | null",
  "is_active": "boolean | null"
}
```

---

### 11.4 获取学生列表（已完成）

**GET** `/api/admin/students`

#### Query

- `page`
- `page_size`
- `keyword`（模糊匹配 `full_name`、`preferred_name`、`sid`）
- `class_uuid`
- `is_active`
- `sort=created_at_desc|created_at_asc|full_name_asc`

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string",
      "preferred_name": "string | null",
      "class_uuid": "string | null",
      "class_name": "string | null",
      "grade_level": "string | null",
      "avatar_url": "string | null",
      "is_active": true,
      "created_at": "string"
    }
  ],
  "meta": {}
}
```

---

### 11.5 创建学生（已完成）

**POST** `/api/admin/students`

#### Body

```json
{
  "sid": "string | null",
  "full_name": "string",
  "preferred_name": "string | null",
  "class_uuid": "string | null",
  "avatar_url": "string | null",
  "date_of_birth": "string | null"
}
```

---

### 11.6 更新学生（已完成）

**PATCH** `/api/admin/students/{student_uuid}`

#### Body

```json
{
  "sid": "string | null",
  "full_name": "string | null",
  "preferred_name": "string | null",
  "class_uuid": "string | null",
  "avatar_url": "string | null",
  "date_of_birth": "string | null",
  "is_active": "boolean | null"
}
```

> **注：** 若需要"换班"操作（修改 `class_uuid`），请使用专用的 `POST /api/admin/students/{student_uuid}/transfer-class` 接口，该接口会原子性地更新学生班级并重建 `teaching_assignments`（见 §11.19）。直接 PATCH `class_uuid` 仅适用于初始分班或纠错，不会自动处理 `teaching_assignments`。

---

### 11.7 获取 Parent-Student 绑定列表（已完成）

**GET** `/api/admin/bindings/parent_student`

#### Query

- `page`
- `page_size`
- `parent_uuid`
- `student_uuid`
- `is_active`

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "parent_uuid": "string",
      "student_uuid": "string",
      "relationship_label": "string | null",
      "is_primary": true,
      "is_active": true,
      "created_at": "string"
    }
  ],
  "meta": {}
}
```

---

### 11.8 创建 Parent-Student 绑定（已完成）

**POST** `/api/admin/bindings/parent_student`

#### Body

```json
{
  "parent_uuid": "string",
  "student_uuid": "string",
  "relationship_label": "string | null",
  "is_primary": true
}
```

#### 规则

- `parent_uuid` 指向的用户 role 必须是 `parent`，否则返回 `400 bad_request`
- 同一 `student_uuid` 最多有一条 `is_active=true` 的绑定，否则返回 `409 conflict`

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "parent_uuid": "string",
    "student_uuid": "string",
    "relationship_label": "string | null",
    "is_primary": true,
    "is_active": true,
    "created_at": "string"
  }
}
```

---

### 11.9 更新 Parent-Student 绑定（已完成）

**PATCH** `/api/admin/bindings/parent_student/{binding_uuid}`

#### Body

```json
{
  "relationship_label": "string | null",
  "is_primary": "boolean | null",
  "is_active": "boolean | null"
}
```

#### 规则

- 停用绑定（`is_active=false`）不自动级联处理 discussion thread

---

### 11.10 获取 Teaching Assignment 列表（已完成）

**GET** `/api/admin/assignments/teaching`

#### Query

- `page`
- `page_size`
- `teacher_uuid`
- `student_uuid`
- `subject_uuid`
- `is_active`

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "teacher_uuid": "string",
      "student_uuid": "string",
      "subject_uuid": "string",
      "is_active": true,
      "created_at": "string"
    }
  ],
  "meta": {}
}
```

---

### 11.11 创建 Teaching Assignment（已完成）

**POST** `/api/admin/assignments/teaching`

#### Body

```json
{
  "teacher_uuid": "string",
  "student_uuid": "string",
  "subject_uuid": "string"
}
```

#### 规则

- `teacher_uuid` 指向的用户 role 必须是 `teacher`，否则返回 `400 bad_request`
- `(teacher_uuid, student_uuid, subject_uuid)` 三元组唯一，重复创建返回 `409 conflict`

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "teacher_uuid": "string",
    "student_uuid": "string",
    "subject_uuid": "string",
    "is_active": true,
    "created_at": "string"
  }
}
```

---

### 11.12 更新 Teaching Assignment（已完成）

**PATCH** `/api/admin/assignments/teaching/{assignment_uuid}`

#### Body

```json
{
  "is_active": "boolean | null"
}
```

---

### 11.13 获取系统 Tag 列表（已完成）

**GET** `/api/admin/tags/system`

---

### 11.14 创建系统 Tag（已完成）

**POST** `/api/admin/tags/system`

#### Body

```json
{
  "name": "string",
  "is_selectable_by_parent": false,
  "is_selectable_by_teacher": true,
  "affects_business_logic": false
}
```

#### 规则

- `important` 建议作为初始化数据，不通过普通接口创建

---

### 11.15 更新系统 Tag（已完成）

**PATCH** `/api/admin/tags/system/{tag_uuid}`

#### Body

```json
{
  "name": "string | null",
  "is_selectable_by_parent": "boolean | null",
  "is_selectable_by_teacher": "boolean | null",
  "affects_business_logic": "boolean | null"
}
```

---


### 11.16 获取班级列表

**GET** `/api/admin/classes`

#### Query

- `page`
- `page_size`
- `grade_level`
- `academic_year`
- `homeroom_teacher_uuid`
- `is_active`

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "name": "string",
      "grade_level": "string | null",
      "academic_year": "string | null",
      "homeroom_teacher": {
        "uuid": "string",
        "display_name": "string"
      },
      "student_count": 12,
      "is_active": true,
      "created_at": "string"
    }
  ],
  "meta": {}
}
```

---

### 11.17 创建班级

**POST** `/api/admin/classes`

#### Body

```json
{
  "name": "string",
  "grade_level": "string | null",
  "academic_year": "string | null",
  "homeroom_teacher_uuid": "string | null"
}
```

#### 规则

- `homeroom_teacher_uuid` 若提供，必须指向 role=`teacher` 的 active 用户。
- `name` 不可为空字符串，最长 100 字符。

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "name": "string",
    "grade_level": "string | null",
    "academic_year": "string | null",
    "homeroom_teacher": {
      "uuid": "string",
      "display_name": "string"
    },
    "is_active": true,
    "created_at": "string"
  }
}
```

---

### 11.18 更新班级

**PATCH** `/api/admin/classes/{class_uuid}`

#### Body

```json
{
  "name": "string | null",
  "grade_level": "string | null",
  "academic_year": "string | null",
  "homeroom_teacher_uuid": "string | null",
  "is_active": "boolean | null"
}
```

#### 规则

- `homeroom_teacher_uuid` 若提供，必须指向 role=`teacher` 的 active 用户；传 `null` 则清除班主任。
- 停用班级（`is_active=false`）不自动级联处理 `teaching_assignments` 或 `students`。

#### Success 200

返回更新后的完整班级对象，结构与 §11.17 Success 201 一致。

---

### 11.19 学生换班（原子操作）

**POST** `/api/admin/students/{student_uuid}/transfer-class`

将学生迁移至新班级，并原子性地完成以下三个操作：
1. 更新 `students.class_id` 到新班级
2. 将该学生的所有旧 `teaching_assignments` 设置 `is_active = false`
3. 为新班级对应的 active 老师（通过 `teaching_assignments` 推断）重新创建 `teaching_assignments`

#### Body

```json
{
  "new_class_uuid": "string"
}
```

#### 规则

- 新班级必须存在且 `is_active=true`。
- 若新班级的老师 `teaching_assignments` 无法推断（新班级还没有老师），则只执行步骤 1/2，步骤 3 跳过；调用者须手动补充 `teaching_assignments`。

#### Success 200

```json
{
  "data": {
    "student_uuid": "string",
    "new_class_uuid": "string",
    "deactivated_assignment_count": 5,
    "created_assignment_count": 4
  }
}
```

---

## 12. 关键实现规则

### 12.1 403 与 404 的边界

v1 统一约定：

- 已认证但无权限：`403`
- 资源不存在：`404`

当前不做“为了防枚举而把 403 伪装成 404”的额外策略。

### 12.2 筛选、排序、搜索全部由后端完成

前端只负责传 query 参数：

- 过滤条件
- 模糊搜索关键字
- 排序方式
- 分页参数

后端统一负责：

- 搜索
- 过滤
- 排序
- 分页

### 12.3 已读与归档必须是用户个人状态

对于：

- report
n- announcement

其 `is_read`、`is_archived` 等状态必须由用户个人状态表维护，不能直接写回资源主表作为全局状态。

### 12.4 Post 删除规则

- 只允许作者删除自己发的帖子
- 当前不支持“老师删除家长帖子”的额外管理特权
- 若将来需要 moderation，再单独设计接口与权限规则

### 12.5 Discussion Thread 创建策略

v1 推荐：**懒创建**

即：

- 当 parent / teacher 第一次访问讨论页时，如果 thread 不存在，则服务端自动创建
- 不由前端显式调用创建 thread 接口

---
