
## 初始化db命令
uv sync
uv pip install -e .
bash podman-dev.sh
python3 src/ac_link/db/db.py


## 各表含义

- `users`：系统中的统一用户主体表，包含家长、老师、管理员等账号基础信息。
- `user_settings`：用户个性化设置表，例如语言、时区、主题等偏好。
- `user_sessions`：用户登录会话表，用于保存 refresh token、设备信息、最后使用时间等。
- `students`：学生主体表，保存学生基础资料。
- `subjects`：学科表，保存学科名称、代码等基础信息。
- `teaching_assignments`：教学分配表，用来表示老师、学生、学科之间的教学关系。
- `parent_student_bindings`：家长和学生绑定关系表，当前可按 1:1 使用，但结构上支持以后扩展到 1:N 或 N:M。
- `discussion_threads`：固定讨论容器表，每个 `parent + teacher + student` 组合对应一个 thread。
- `discussion_participant_states`：讨论参与者状态表，保存每个参与者在某个 thread 下的未读数、最后已读位置等状态。
- `posts`：讨论区帖子表，保存帖子正文、标题、作者、回复关系等内容。
- `tags`：帖子标签表，保存系统标签和老师私有标签。
- `post_tag_bindings`：帖子与标签的关联表，用于实现一个帖子对应多个标签。
- `reports`：报告主表，保存面向家长展示的学习报告内容。
- `report_user_states`：报告用户状态表，保存某个用户对某个报告的已读、归档等个人状态。
- `announcements`：公告或任务主表，保存老师或管理员发布的公告内容。
- `announcement_user_states`：公告用户状态表，保存某个用户对某个公告的已读等个人状态。

## 8. 表名缩写对照表

约束名（`UniqueConstraint`、`CheckConstraint` 等）使用表名缩写，以尽量保持在 PostgreSQL 63 字符限制内。
缩写定义在 `orm/base.py` 的 `TABLE_ALIASES` 字典。

- `users` -> `usr`
- `user_settings` -> `uset`
- `user_sessions` -> `uses`
- `students` -> `stu`
- `subjects` -> `sbj`
- `teaching_assignments` -> `ta`
- `parent_student_bindings` -> `psb`
- `discussion_threads` -> `dt`
- `discussion_participant_states` -> `dps`
- `posts` -> `pst`
- `tags` -> `tag`
- `post_tag_bindings` -> `ptb`
- `reports` -> `rpt`
- `report_user_states` -> `rus`
- `announcements` -> `ann`
- `announcement_user_states` -> `aus`

> 新增表时，在 `TABLE_ALIASES` 添加条目，并同步更新此列表。
