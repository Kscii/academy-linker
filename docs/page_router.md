## 页面路由设计

---

### 公共页面

`/login`
- 登录页面，全屏居中卡片风格
- 邮箱 + 密码输入，提交后调用 POST /api/auth/login
- 登录成功后根据角色跳转：
  - 家长 → /parent/students/{firstSid}/dashboard
  - 教师 → /teacher/dashboard
  - 管理员 → /admin/dashboard

`/settings`
- 设置面板（全角色通用）
- 无障碍设置：深色/浅色主题切换（跟随系统偏好，手动选择后持久化）
- 多语言选择（17 种语言，i18next + AI 翻译兜底）
- 其余设置项为预留占位

`/` （根路径）
- 未登录 → 重定向 /login
- 已登录家长 → 重定向 /parent/students/{firstSid}/dashboard
- 已登录教师 → 重定向 /teacher/dashboard
- 已登录管理员 → 重定向 /admin/dashboard

---

### 家长端

`/parent/students/{sid}/dashboard`
- 学生仪表盘首页
- 庆祝横幅：生日 ≤7 天时显示倒计时，否则显示 ≤14 天内的节假日提醒
- 整体学习趋势折线图（调用 /api/parents/me/students/{sid}/dashboard）
- 双列卡片区：
  - 近期活动（来自公告 API）+ 本周日程安排（来自学科数据）
- 成长与幸福卡片（按星期轮换教育小贴士）
- 请假申请卡片：查看近期记录、内联新建表单（类型/日期/原因）
- 生日卡片：今天生日→庆祝动效，≤7 天→倒计时，其余→日期展示
- 教学建议卡片：基于学生成绩自动生成前 3 个科目的专项建议
- 不良行为上报卡片：霸凌 / 毒品 / 不当行为，支持匿名提交

`/parent/students/{sid}/grades`
- 成绩详情页（调用 /api/parents/me/students/{sid}/dashboard）
- 摘要卡片行：综合评分、出勤率、作业完成率、需关注科目数
- 学科柱状图（与班级平均对比）
- 整体趋势折线图（含班级平均线）
- 学科列表：每行含色标、名称、分数 badge、进度条

`/parent/students/{sid}/subjects/{subjectId}`
- 学科详情页（调用 /api/parents/me/students/{sid}/subjects/{subjectId}）
- 顶部：学科名称、分数 badge、最高/最低/班级均分概览
- 学习路径时间轴（done / current / future 状态节点）
- 成绩趋势折线图（含班级平均）
- AI 洞察与建议（调用 POST /api/reports/{subjectId}/summarize）
- 老师针对该学科发布的班级帖子，进入自动标记已读

`/parent/students/{sid}/discussions`
- 家长消息列表（调用 /api/parents/me/students/{sid}/discussions/teachers）
- 展示所有任课教师列表，每行：头像缩写、姓名、学科、最后消息预览、未读数
- 未读数从服务端同步，点击进入会话后本地清零
- 侧边栏消息红点：全部已读后消失（localStorage 持久化）

`/parent/students/{sid}/conversations/{threadUuid}`
- 具体会话聊天页
- 气泡样式，家长消息靠右（主色），教师消息靠左
- 每条消息含「翻译」按钮，点击后展示 AI 翻译，再次点击收起
- 底部输入框，Enter 发送，Shift+Enter 换行

`/parent/students/{sid}/reports`
- AI 进度简报页
- 左侧：简报列表（按时间排序），未读显示 "New" badge
- 右侧：
  - 简报元信息（标题、日期、各科评分胶囊）
  - AI 富文本报告（POST /api/reports/{reportId}/generate）
  - 下载 PDF 按钮（window.print）、发送邮件按钮
- 报告语言随界面语言实时切换（服务端按 uuid×lang 缓存）

`/parent/students/{sid}/tasks`
- 通知公告页
- 未读通知数 banner（直接位于标题下方）
- 老师班级帖子区块：按学科色标展示，可展开回复，展开即标记已读
- 学校公告列表：点击展开全文，展开即标记已读

`/parent/students/{sid}/resources`
- 学习资源页（预留，内容待接入）

---

### 教师端

`/teacher/dashboard`
- 教师仪表盘（调用 /api/teachers/me/students）
- 顶部搜索框，支持按姓名筛选学生
- 学生卡片列表：头像缩写、姓名、班级、综合评分、at-risk 标记
- 点击跳转 /teacher/students/{studentUuid}

`/teacher/students/{studentUuid}`
- 学生详情页（调用 /api/teachers/me/students/{studentUuid}/dashboard）
- 学科成绩、进度条、AI 洞察
- 可进入家长消息会话

`/teacher/messages`
- 教师消息列表
- 展示所有学生列表，有未读消息的优先显示
- 点击学生展开内嵌聊天视图

`/teacher/posts`
- 班级帖子管理页
- 展示已发布帖子列表
- 新建帖子：标题、正文、目标学生（全班或多选）、关联学科

`/teacher/find-student`
- 查找学生页
- 搜索框实时筛选，结果点击跳转学生详情页

`/teacher/classes/{classUuid}`
- 班级详情页，展示该班级所有学生的成绩概览

---

### 管理员端

`/admin/dashboard`
- 学校概览（调用 /api/admin/overview）
- 统计卡片：教师总数、学生总数、家长总数、班级总数
- 快捷导航：教师管理 / 班级管理 / 学生管理 / 家长管理

`/admin/teachers`
- 教师列表 + 新建/编辑教师表单
- 展示头像缩写、姓名、邮箱、所教学科

`/admin/classes`
- 双栏：班级列表 + 班级详情
- 班级详情：班主任下拉选择器、学生名单、添加/移除学生

`/admin/students`
- 学生列表（含搜索）+ 新建学生表单
- 展示是否已绑定家长

`/admin/parents`
- 双栏：家长列表 + 家长详情
- 家长详情：已绑定学生列表、绑定/解除绑定操作

---

### 全局组件

**AIPanel（浮动 AI 助手）**
- 右下角固定浮动按钮，可拖拽至屏幕任意位置
- 点击展开对话窗口，支持多轮对话（持久化至 localStorage）
- 快捷 chip 按钮随界面语言自动翻译
- 当前处于报告页时，自动将报告 UUID 注入上下文
- 支持学科、成绩、出勤等上下文感知问答

**AppShell（侧边栏布局）**
- 左侧固定侧边栏：Logo、导航项、语言切换、主题切换、用户信息
- 导航项因角色动态切换：
  - 家长：首页 🏠 · 成绩 📊 · 消息 💬 · 报告 📋 · 通知 📢 · 资源 📚 · 设置 ⚙
  - 教师：首页 🏠 · 消息 💬 · 班级帖子 📝 · 查找学生 🔍 · 设置 ⚙
  - 管理员：首页 🏠 · 教师 👨‍🏫 · 班级 🏫 · 学生 🎒 · 家长 👪 · 设置 ⚙
- 消息、通知导航项在有未读时显示红点
- 从设置页返回时保持正确的学生 UUID（从 AppContext.firstStudentUuid 读取）
