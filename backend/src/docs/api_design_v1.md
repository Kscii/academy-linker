# Academy Linker API 设计文档 v1

## 1. 文档目的

本文档用于统一前后端的接口设计约定，作为 v1 开发阶段的唯一接口参考。

目标：

- 前后端基于同一份接口文档并行开发
- 尽量减少实现阶段的歧义
- 明确请求/响应结构、错误码、权限边界与安全约定
- 给出推荐实现顺序，便于按阶段推进

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
- `important` 等系统 tag 可参与业务逻辑
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

## 4. 统一错误码

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
  "class_name": "string | null",
  "grade_level": "string | null",
  "avatar_url": "string | null"
}
```

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

## 6. Cookie、Path、SameSite、Origin 说明

### 6.1 Cookie 是什么

Cookie 是浏览器保存的一小段状态数据。服务器通过 `Set-Cookie` 响应头让浏览器保存它，之后浏览器会在满足条件的请求中自动带上它。

本项目中：

- `access_token` 使用 Cookie 传递
- `refresh_token` 使用 Cookie 传递
- 前端不直接读取 token，而是让浏览器自动携带

### 6.2 Cookie 的 `Path` 是什么

`Path` 表示该 Cookie 会在访问哪些路径时自动携带。

推荐配置：

- `access_token` 的 `Path=/`
- `refresh_token` 的 `Path=/api/auth/refresh`

含义：

- `access_token` 可以被所有业务接口使用
- `refresh_token` 只会在刷新接口中自动携带，减少暴露面

### 6.3 `SameSite` 是什么

`SameSite` 是 Cookie 的安全属性，用于限制浏览器在跨站请求中是否自动带上 Cookie。

本项目使用：

- `SameSite=Lax`

意义：

- 在大多数跨站子请求中不会自动带 Cookie
- 能降低 CSRF 风险
- 同时兼顾正常导航场景的可用性

### 6.4 校验 `Origin` 是什么

`Origin` 是浏览器请求头，用于表示请求发起的源（协议 + 域名 + 端口）。

由于本项目使用 Cookie 鉴权，而 Cookie 会自动携带，因此对写操作需要额外检查：

- 请求是否确实来自受信任的前端页面
- 防止第三方恶意网站借浏览器自动携带 Cookie 发起伪造请求

推荐对所有写操作校验 `Origin`：

- `POST`
- `PATCH`
- `PUT`
- `DELETE`

---

## 7. 认证与账户接口

### 7.1 登录

**POST** `/api/auth/login`

#### Body

```json
{
  "email": "string",
  "password": "string",
  // 增加rt的有效时长, 从3天增加到7天
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

#### Error

- `401 unauthenticated`
- `422 validation_error`
- `429 rate_limited`

#### 注释

- Postman 测试时需要保留 cookie jar
- 浏览器端登录后前端不需要自行保存 token

---

### 7.2 刷新 Access Token

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

#### Error

- `401 refresh_token_expired`
- `401 invalid_token`
- `403 origin_not_allowed`

#### 注释

- 前端仅在收到 `401 access_token_expired` 后调用
- 本项目 refresh 只刷新 AT，不做 RT rotation

---

### 7.3 登出当前设备

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

#### Error

- `401 unauthenticated`
- `403 origin_not_allowed`

#### 注释

- 旧 AT 若已被其他地方拿到，理论上最多仍可在剩余 15 分钟内使用

---

### 7.4 登出所有设备

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

#### Error

- `401 unauthenticated`
- `403 origin_not_allowed`

#### 注释

- 旧 access token 最多仍可能保留到各自过期时间
- 由于当前不做 access token 撤销检查，登出所有设备不是“绝对即时强制失效”

---

### 7.5 获取当前用户信息

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

#### Error

- `401 unauthenticated`
- `401 access_token_expired`

---

### 7.6 更新当前用户资料

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

#### Error

- `401 unauthenticated`
- `403 origin_not_allowed`
- `422 validation_error`

---

### 7.7 修改密码

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

#### Error

- `401 unauthenticated`
- `403 origin_not_allowed`
- `422 validation_error`

---

### 7.8 获取当前登录会话列表

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

#### Error

- `401 unauthenticated`

---

### 7.9 删除指定会话

**DELETE** `/api/me/sessions/{session_uuid}`

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

#### Error

- `401 unauthenticated`
- `404 not_found`
- `403 forbidden`

---

## 8. 设置接口

### 8.1 获取当前用户设置

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

### 8.2 更新当前用户设置

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

### 9.1 获取当前家长绑定的学生列表

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

### 9.2 获取学生 Dashboard 聚合数据

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
      "class_name": "string | null",
      "grade_level": "string | null",
      "avatar_url": "string | null"
    },
    "dashboard_context": {
      "last_updated_at": "string",
      "selected_range": "30d",
      "unread_post_count": 2,
      "unread_announcement_count": 3
    },
    "summary_cards": {
      "overall_performance_index": 85.5,
      "assignment_completion_rate": 0.92,
      "attendance_rate": 0.97,
      "ai_summary": {
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

### 9.3 获取学生学科列表

**GET** `/api/parents/me/students/{student_uuid}/subjects`

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "name": "Mathematics",
      "code": "MATH",
      "teacher": {
        "uuid": "string",
        "display_name": "string"
      }
    }
  ]
}
```

---

### 9.4 获取某学科详情聚合数据

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
      "teacher": {
        "uuid": "string",
        "display_name": "string",
        "email": "string"
      }
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
    "ai_summary": {
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

---

### 9.5 获取报告列表

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
      "created_at": "string",
      "is_read": false,
      "is_archived": false,
      "subject": {
        "uuid": "string | null",
        "name": "string | null"
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

### 9.6 获取报告详情

**GET** `/api/parents/me/students/{student_uuid}/reports/{report_uuid}`

#### Success 200

```json
{
  "data": {
    "uuid": "string",
    "title": "string",
    "report_type": "weekly | monthly | custom",
    "source_type": "ai | teacher",
    "created_at": "string",
    "updated_at": "string",
    "is_read": false,
    "is_archived": false,
    "subject": {
      "uuid": "string | null",
      "name": "string | null"
    },
    "content_markdown": "string",
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

---

### 9.7 标记报告为已读

**POST** `/api/reports/{report_uuid}/read`

#### Body

无

#### Success 200

```json
{
  "data": {
    "report_uuid": "string",
    "is_read": true,
    "read_at": "string"
  }
}
```

---

### 9.8 归档报告

**POST** `/api/reports/{report_uuid}/archive`

#### Body

无

#### Success 200

```json
{
  "data": {
    "report_uuid": "string",
    "is_archived": true,
    "archived_at": "string"
  }
}
```

---

### 9.9 取消归档报告

**POST** `/api/reports/{report_uuid}/unarchive`

#### Body

无

#### Success 200

```json
{
  "data": {
    "report_uuid": "string",
    "is_archived": false
  }
}
```

---

### 9.10 获取公告/任务列表

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
      "published_at": "string",
      "due_at": "string | null",
      "is_read": false,
      "is_important": true,
      "author": {
        "uuid": "string",
        "display_name": "string",
        "role": "teacher | admin"
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

### 9.11 获取公告/任务详情

**GET** `/api/announcements/{announcement_uuid}`

#### Success 200

```json
{
  "data": {
    "uuid": "string",
    "category": "announcement | task",
    "title": "string",
    "content_markdown": "string",
    "original_content_markdown": "string",
    "translated_content_markdown": "string | null",
    "display_language": "string",
    "original_language": "string",
    "translated_language": "string | null",
    "translation_status": "completed",
    "translated_at": "string | null",
    "published_at": "string",
    "due_at": "string | null",
    "is_read": false,
    "is_important": true,
    "author": {
      "uuid": "string",
      "display_name": "string",
      "role": "teacher | admin"
    }
  }
}
```

---

### 9.12 标记公告为已读

**POST** `/api/announcements/{announcement_uuid}/read`

#### Body

无

#### Success 200

```json
{
  "data": {
    "announcement_uuid": "string",
    "is_read": true,
    "read_at": "string"
  }
}
```

---

### 9.13 获取学生讨论教师列表

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
      "teacher": {
        "uuid": "string",
        "display_name": "string",
        "email": "string",
        "avatar_url": "string | null"
      },
      "thread": {
        "uuid": "string",
        "last_post_at": "string | null",
        "unread_post_count": 2
      }
    }
  ]
}
```

---

### 9.14 获取与某老师的讨论页聚合数据

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
    "student": {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string"
    },
    "teacher": {
      "uuid": "string",
      "display_name": "string",
      "email": "string",
      "avatar_url": "string | null"
    },
    "thread": {
      "uuid": "string",
      "last_post_at": "string | null"
    },
    "available_tags": [
      {
        "uuid": "string",
        "name": "important",
        "scope": "system | teacher_private",
        "is_selectable_by_parent": false,
        "is_selectable_by_teacher": true
      }
    ],
    "posts": [
      {
        "uuid": "string",
        "title": "string | null",
        "content_markdown": "string",
        "created_at": "string",
        "updated_at": "string | null",
        "author": {
          "uuid": "string",
          "display_name": "string",
          "role": "parent | teacher"
        },
        "tags": [
          {
            "uuid": "string",
            "name": "important",
            "scope": "system | teacher_private"
          }
        ],
        "reply_to_post_uuid": "string | null"
      }
    ]
  },
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 10,
    "total_pages": 1
  }
}
```

---

### 9.15 家长创建帖子

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

- 家长只能选择 `is_selectable_by_parent = true` 的 tag
- 家长不能打 `important`

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "title": "string | null",
    "content_markdown": "string",
    "created_at": "string",
    "updated_at": null,
    "author": {
      "uuid": "string",
      "display_name": "string",
      "role": "parent"
    },
    "tags": [
      {
        "uuid": "string",
        "name": "question",
        "scope": "system"
      }
    ],
    "reply_to_post_uuid": "string | null"
  }
}
```

---

### 9.16 家长编辑自己发的帖子

**PATCH** `/api/posts/{post_uuid}`

#### Body

```json
{
  "title": "string | null",
  "content_markdown": "string | null",
  "tag_uuids": ["string"]
}
```

#### 规则

- 仅作者可编辑
- 家长不能修改老师专属 tag
- 不支持编辑作者角色和 thread 归属

---

### 9.17 家长删除自己发的帖子

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

## 10. 老师端接口

### 10.1 获取老师负责的学生列表

**GET** `/api/teachers/me/students`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | int | 否 | 默认 1 |
| `page_size` | int | 否 | 默认 20 |
| `class_name` | string | 否 | 班级精确匹配 |
| `grade_level` | string | 否 | 年级精确匹配 |
| `subject_uuid` | string | 否 | 学科过滤 |
| `keyword` | string | 否 | `sid` / 姓名模糊匹配 |
| `sort` | enum | 否 | `full_name_asc`, `full_name_desc`, `sid_asc`, `sid_desc`, `score_desc`, `score_asc`, `last_activity_at_desc` |

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "sid": "string | null",
      "full_name": "string",
      "class_name": "string | null",
      "grade_level": "string | null",
      "overall_performance_index": 85.5,
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

### 10.2 获取老师视角学生 Dashboard

**GET** `/api/teachers/me/students/{student_uuid}/dashboard`

#### Query

同家长 dashboard。

#### Success 200

```json
{
  "data": {
    "student": {},
    "dashboard_context": {},
    "summary_cards": {},
    "charts": {},
    "important_post_banners": [],
    "teacher_actions": {
      "can_create_report": true,
      "can_publish_announcement": true,
      "can_manage_tags": true
    }
  }
}
```

---

### 10.3 获取老师视角学生讨论家长列表

**GET** `/api/teachers/me/students/{student_uuid}/discussions/parents`

#### Success 200

```json
{
  "data": [
    {
      "parent": {
        "uuid": "string",
        "display_name": "string",
        "email": "string",
        "avatar_url": "string | null"
      },
      "thread": {
        "uuid": "string",
        "last_post_at": "string | null",
        "unread_post_count": 2
      }
    }
  ]
}
```

---

### 10.4 获取老师与某家长讨论页

**GET** `/api/teachers/me/students/{student_uuid}/discussions/parents/{parent_uuid}`

#### Query

与家长讨论页一致：

- `page`
- `page_size`
- `sort`
- `tag`
- `keyword`

#### Success 200

结构与家长讨论页一致。

---

### 10.5 老师创建帖子

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

- 老师可使用系统 tag
- 老师可使用自己私有 tag
- `important` 仅老师可打

---

### 10.6 老师编辑自己发的帖子

**PATCH** `/api/posts/{post_uuid}`

规则同作者本人可编辑。

---

### 10.7 老师删除自己发的帖子

**DELETE** `/api/posts/{post_uuid}`

规则同作者本人可删除。

---

### 10.8 获取可用 Tag 列表

**GET** `/api/teachers/me/tags`

#### Query

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `scope` | enum | 否 | `system`, `teacher_private`, `all` |

#### Success 200

```json
{
  "data": [
    {
      "uuid": "string",
      "name": "important",
      "scope": "system | teacher_private",
      "owner_teacher_uuid": "string | null",
      "is_selectable_by_parent": false,
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
  "name": "string",
  "is_selectable_by_parent": false
}
```

#### 规则

- 仅创建 `teacher_private` tag
- `is_selectable_by_parent` 默认且建议固定为 false

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "name": "string",
    "scope": "teacher_private",
    "owner_teacher_uuid": "string",
    "is_selectable_by_parent": false,
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
- 系统 tag 不可修改

---

### 10.11 老师删除私有 Tag

**DELETE** `/api/teachers/me/tags/{tag_uuid}`

#### 规则

- 只能删除自己的私有 tag
- 系统 tag 不可删除

#### Success 200

```json
{
  "data": {
    "success": true
  }
}
```

---

### 10.12 老师创建报告

**POST** `/api/teachers/me/students/{student_uuid}/reports`

#### Body

```json
{
  "title": "string",
  "report_type": "weekly | monthly | custom",
  "subject_uuid": "string | null",
  "content_markdown": "string",
  "original_language": "string",
  "translated_content_markdown": "string | null",
  "translated_language": "string | null",
  "translation_status": "not_required | pending | completed | failed | stale",
  "translated_at": "string | null"
}
```

---

### 10.13 老师更新报告

**PATCH** `/api/reports/{report_uuid}`

#### Body

```json
{
  "title": "string | null",
  "report_type": "weekly | monthly | custom | null",
  "subject_uuid": "string | null",
  "content_markdown": "string | null",
  "original_language": "string | null",
  "translated_content_markdown": "string | null",
  "translated_language": "string | null",
  "translation_status": "not_required | pending | completed | failed | stale | null",
  "translated_at": "string | null"
}
```

#### 规则

- 仅创建者老师或 admin 可更新
- 不更新家长个人 read/archive 状态

---

### 10.14 老师创建公告/任务

**POST** `/api/teachers/me/students/{student_uuid}/announcements`

#### Body

```json
{
  "category": "announcement | task",
  "title": "string",
  "content_markdown": "string",
  "original_language": "string",
  "translated_content_markdown": "string | null",
  "translated_language": "string | null",
  "translation_status": "not_required | pending | completed | failed | stale",
  "translated_at": "string | null",
  "published_at": "string | null",
  "due_at": "string | null",
  "is_important": false
}
```

#### 规则

- `published_at` 为空时默认服务端当前时间
- `is_important` 允许老师设置

---

### 10.15 老师更新公告/任务

**PATCH** `/api/announcements/{announcement_uuid}`

#### Body

同创建字段，全部 nullable patch。

---

## 11. Admin 接口

### 11.1 获取用户列表

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

### 11.2 创建用户

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

---

### 11.3 更新用户

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

### 11.4 创建学生

**POST** `/api/admin/students`

#### Body

```json
{
  "sid": "string | null",
  "full_name": "string",
  "preferred_name": "string | null",
  "class_name": "string | null",
  "grade_level": "string | null",
  "avatar_url": "string | null"
}
```

---

### 11.5 更新学生

**PATCH** `/api/admin/students/{student_uuid}`

#### Body

```json
{
  "sid": "string | null",
  "full_name": "string | null",
  "preferred_name": "string | null",
  "class_name": "string | null",
  "grade_level": "string | null",
  "avatar_url": "string | null"
}
```

---

### 11.6 创建 Parent-Student 绑定

**POST** `/api/admin/bindings/parent_student`

#### Body

```json
{
  "parent_uuid": "string",
  "student_uuid": "string",
  "relationship_type": "father | mother | guardian | other",
  "is_primary_contact": true
}
```

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "parent_uuid": "string",
    "student_uuid": "string",
    "relationship_type": "father | mother | guardian | other",
    "is_primary_contact": true,
    "created_at": "string"
  }
}
```

---

### 11.7 创建 Teacher-Student-Subject 分配

**POST** `/api/admin/assignments/teaching`

#### Body

```json
{
  "teacher_uuid": "string",
  "student_uuid": "string",
  "subject_uuid": "string",
  "role": "subject_teacher | homeroom_teacher"
}
```

#### Success 201

```json
{
  "data": {
    "uuid": "string",
    "teacher_uuid": "string",
    "student_uuid": "string",
    "subject_uuid": "string",
    "role": "subject_teacher | homeroom_teacher",
    "created_at": "string"
  }
}
```

---

### 11.8 获取系统 Tag 列表

**GET** `/api/admin/tags/system`

---

### 11.9 创建系统 Tag

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

### 11.10 更新系统 Tag

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

## 13. 推荐实现顺序

这一部分是前后端都应参考的推荐开发顺序。

目标：

- 先打通最小闭环
- 再逐步叠加页面与管理能力
- 尽量避免一开始就实现全部接口导致开发失控

### 阶段 1：认证与全局基础设施

推荐优先实现：

1. `POST /api/auth/login`
2. `POST /api/auth/refresh`
3. `POST /api/auth/logout`
4. `POST /api/auth/logout_all`
5. `GET /api/me`
6. `GET /api/settings`
7. `PATCH /api/settings`

同时完成：

- Cookie 配置
- CORS + `credentials: include`
- `Origin` 校验中间件
- JWT 生成与验证
- refresh token 持久化
- 会话表设计
- 统一错误码与错误响应中间件

这是整个项目的底座，必须最先稳定。

---

### 阶段 2：家长主流程闭环

推荐实现：

1. `GET /api/parents/me/students`
2. `GET /api/parents/me/students/{student_uuid}/dashboard`
3. `GET /api/parents/me/students/{student_uuid}/subjects`
4. `GET /api/parents/me/students/{student_uuid}/subjects/{subject_uuid}`
5. `GET /api/parents/me/students/{student_uuid}/reports`
6. `GET /api/parents/me/students/{student_uuid}/reports/{report_uuid}`
7. `POST /api/reports/{report_uuid}/read`
8. `POST /api/reports/{report_uuid}/archive`
9. `POST /api/reports/{report_uuid}/unarchive`
10. `GET /api/parents/me/students/{student_uuid}/announcements`
11. `GET /api/announcements/{announcement_uuid}`
12. `POST /api/announcements/{announcement_uuid}/read`

完成这一阶段后，家长端至少可以：

- 登录
- 看到自己的学生
- 打开 dashboard
- 看学科详情
- 看报告
- 看公告/任务
- 标记已读与归档

这是第一个可展示的 MVP 主闭环。

---

### 阶段 3：讨论区闭环

推荐实现：

1. `GET /api/parents/me/students/{student_uuid}/discussions/teachers`
2. `GET /api/parents/me/students/{student_uuid}/discussions/teachers/{teacher_uuid}`
3. `POST /api/threads/{thread_uuid}/posts`
4. `PATCH /api/posts/{post_uuid}`
5. `DELETE /api/posts/{post_uuid}`
6. `GET /api/teachers/me/students/{student_uuid}/discussions/parents`
7. `GET /api/teachers/me/students/{student_uuid}/discussions/parents/{parent_uuid}`

这一阶段重点是：

- thread 懒创建逻辑
- post 权限控制
- tag 过滤、排序、搜索
- 家长与老师都能在同一 thread 容器下交流

完成这一阶段后，家校沟通主功能基本成立。

---

### 阶段 4：老师内容生产能力

推荐实现：

1. `GET /api/teachers/me/students`
2. `GET /api/teachers/me/students/{student_uuid}/dashboard`
3. `GET /api/teachers/me/tags`
4. `POST /api/teachers/me/tags`
5. `PATCH /api/teachers/me/tags/{tag_uuid}`
6. `DELETE /api/teachers/me/tags/{tag_uuid}`
7. `POST /api/teachers/me/students/{student_uuid}/reports`
8. `PATCH /api/reports/{report_uuid}`
9. `POST /api/teachers/me/students/{student_uuid}/announcements`
10. `PATCH /api/announcements/{announcement_uuid}`

完成这一阶段后，老师端可以：

- 查看负责的学生
- 维护自己的私有 tag
- 发布报告
- 发布公告/任务
- 参与讨论区交流

---

### 阶段 5：Admin 管理能力

推荐实现：

1. `GET /api/admin/users`
2. `POST /api/admin/users`
3. `PATCH /api/admin/users/{user_uuid}`
4. `POST /api/admin/students`
5. `PATCH /api/admin/students/{student_uuid}`
6. `POST /api/admin/bindings/parent_student`
7. `POST /api/admin/assignments/teaching`
8. `GET /api/admin/tags/system`
9. `POST /api/admin/tags/system`
10. `PATCH /api/admin/tags/system/{tag_uuid}`

这一阶段主要用于支撑：

- 初始化系统数据
- 管理用户和学生
- 管理绑定关系与教学关系
- 管理系统 tag

如果时间紧，这一阶段可以后置。

---

### 阶段 6：补充优化项

推荐最后再做：

- `GET /api/me/sessions`
- `DELETE /api/me/sessions/{session_uuid}`
- 更完善的 unread 计数
- 更细粒度的 moderation
- 更细的语言 fallback 逻辑
- 更完善的 translation 状态机
- 更丰富的 dashboard 图表与聚合

---

## 14. 建议的开发策略

### 后端建议

- 先把 Schema / DTO 定死
- 再实现权限中间件
- 再补 service 层和 repository 层
- 聚合接口尽量在 service 层封装

### 前端建议

- 先按本文档写 TypeScript 类型
- 优先开发登录与家长主流程页面
- 先用 mock 数据对齐字段
- 再接真实接口

### 联调建议

优先联调顺序：

1. 登录 / `/api/me`
2. 家长学生列表
3. dashboard
4. 报告列表 / 详情
5. 公告列表 / 详情
6. 讨论区页面
7. 老师端
8. admin 端

---

## 15. 本文档的使用方式

本文档应作为：

- 前端实现接口请求的依据
- 后端实现 DTO 与响应结构的依据
- 联调阶段验收字段是否对齐的依据

建议后续若有变动：

- 直接维护本文档版本号
- 明确变更点
- 不要让口头约定替代文档

---

## 16. 当前版本备注

- 当前 thread 为固定会话容器，不支持用户创建新 thread
- 当前 logout_all 只保证 refresh token 全部失效，不保证旧 access token 立刻失效
- 当前 parent / student 虽然业务上按 1:1 使用，但结构上保留绑定表
- 当前 tag 只作用于 post，不作用于 thread
- `important` 建议作为系统初始化 tag，不通过普通老师私有 tag 流程创建

