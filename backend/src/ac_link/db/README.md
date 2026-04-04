
## 初始化db命令
uv sync
uv pip install -e .
bash podman-dev.sh
python3 src/ac_link/db/db.py

## 表名缩写对照表
约束名（`UniqueConstraint`、`CheckConstraint` 等）使用表名缩写以保持在 PostgreSQL 63 字符限制内。
缩写定义在 `orm/base.py` 的 `TABLE_ALIASES` 字典。

| 表名 | 缩写 |
|---|---|
| `users` | `usr` |
| `user_settings` | `uset` |
| `user_sessions` | `uses` |
| `students` | `stu` |
| `subjects` | `sbj` |
| `teaching_assignments` | `ta` |
| `parent_student_bindings` | `psb` |
| `discussion_threads` | `dt` |
| `discussion_participant_states` | `dps` |
| `posts` | `pst` |
| `tags` | `tag` |
| `post_tag_bindings` | `ptb` |
| `reports` | `rpt` |
| `report_user_states` | `rus` |
| `announcements` | `ann` |
| `announcement_user_states` | `aus` |

> 新增表时，在 `TABLE_ALIASES` 添加条目并同步更新此表。