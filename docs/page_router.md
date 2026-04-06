
## 页面路由设计

---

### 公共页面

/login
    - 登录页面，全屏居中卡片风格
    - 用户名 + 密码输入，提交后调用 POST /api/auth/login
    - 登录成功后根据角色跳转：家长 → /parent/students/{sid}/dashboard，教师 → /teacher/dashboard

/settings
    - 设置面板（家长与教师共用）
    - 无障碍设置：深色/浅色主题切换、多语言选择（17 种语言，i18next + AI 翻译兜底）
    - 其余设置项（AI 风格偏好、邮箱推送等）为预留占位

/ (根路径)
    - 未登录 → 重定向 /login
    - 已登录家长 → 重定向 /parent/students/{firstSid}/dashboard
    - 已登录教师 → 重定向 /teacher/dashboard

---

### 家长端

/parent/students/{sid}/dashboard
    - 学生仪表盘主页
    - 顶部：学生姓名、头像缩写、时间范围选择（7d / 30d / 90d）
    - 摘要卡片行：综合评分、作业完成率、出勤率、AI 生成总结（调用 /api/parents/me/students/{sid}/dashboard）
    - 学科卡片列表：每张卡片含学科色标、名称、评分、进度条（0–100%）
        - 点击跳转 /parent/students/{sid}/subjects/{subjectId}
    - 右下角浮动 AI 助手按钮（AIPanel），可拖拽移动

/parent/students/{sid}/subjects/{subjectId}
    - 学科详情页（调用 /api/parents/me/students/{sid}/subjects/{subjectId}）
    - 顶部：学科名称、色标、评分 badge
    - 学习进度条、近期作业列表（状态：completed / missing / pending）
    - AI 生成的学科洞察与学习路径建议
    - 老师针对该学科发布的班级帖子，进入后自动标记该学科相关帖子为已读

/parent/students/{sid}/reports
    - AI 进度简报页
    - 左侧：简报列表（按时间排序），未读显示红色 "New" badge，点击即标记已读
    - 右侧：简报详情
        - 顶部：标题、日期、下载 PDF 按钮、邮件发送按钮
        - 学科评分胶囊行（色点 + 学科名 + 分数%）
        - 正文：调用 POST /api/reports/{reportId}/generate 生成 AI 富文本报告
            - 内容涵盖：学科表现、学校活动、老师备注、教学顾问建议
            - 按软件当前语言生成，服务端缓存（report_uuid × lang）
            - 生成中显示骨架屏，生成完成后渲染 Markdown（MarkdownView 组件）
        - PDF 下载：window.open() + window.print()，含学校页眉/页脚样式
    - 报告语言随软件语言实时切换，切换后重新请求生成（有缓存则直接命中）

/parent/students/{sid}/discussions
    - 家长消息列表页（调用 /api/parents/me/students/{sid}/discussions/teachers）
    - 展示当前学生所有任课教师列表，每行显示：教师头像缩写、姓名、学科、最后消息预览、未读数 badge
    - 未读数从后端同步，点击进入会话后清零（调用 POST /api/threads/{threadUuid}/read）
    - 所有会话未读数为 0 时，侧边栏消息导航红点消失

/parent/students/{sid}/conversations/{threadUuid}
    - 具体会话聊天页（调用 /api/parents/me/students/{sid}/discussions/teachers/{teacherUuid}）
    - 气泡样式，家长消息靠右（主色），教师消息靠左（卡片色）
    - 每条消息下方有「翻译」按钮（语言非英语时显示），点击后在气泡下方显示 AI 翻译结果，再次点击收起
    - 底部输入框 + 发送按钮，Enter 发送，Shift+Enter 换行
    - 进入页面自动标记该 thread 已读

/parent/students/{sid}/tasks
    - 通知公告页
    - 顶部：未读公告数量 banner（红底）
    - 分两区块：
        1. 老师班级帖子（From Your Teacher）：按学科色标展示，可展开查看全文及回复，展开即标记已读
        2. 学校公告列表：按时间排序，点击展开全文，展开即标记已读（调用 POST /api/announcements/{uuid}/read）
    - 帖子和公告未读数合计反映在侧边栏通知红点

/parent/students/{sid}/resources
    - 学习资源页（预留页面，内容待接入）

---

### 教师端

/teacher/dashboard
    - 教师仪表盘（调用 /api/teachers/me/students）
    - 顶部搜索框，支持按姓名筛选学生
    - 学生卡片列表，每张卡片含：头像缩写、姓名、班级、综合评分
    - 点击卡片跳转 /teacher/students/{studentUuid}

/teacher/students/{studentUuid}
    - 学生详情页（调用 /api/teachers/me/students/{studentUuid}/dashboard）
    - 展示该学生的学科成绩、进度条、AI 洞察
    - 可进入该学生的消息会话

/teacher/messages
    - 教师消息列表（调用 /api/teachers/me/students 并取消息相关字段）
    - 展示有未读消息的学生列表，含未读数 badge
    - 点击学生进入内嵌聊天视图，进入后标记已读（POST /api/threads/{studentUuid}/read）
    - 所有未读清零后侧边栏消息红点消失

/teacher/posts
    - 班级帖子管理页
    - 展示教师已发布的帖子列表（按目标学生/班级分组）
    - 可新建帖子：填写标题、正文、目标学生（支持多选）、关联学科
    - 帖子发布后对应学生家长在通知页可见，家长可回复

/teacher/find-student
    - 查找学生页
    - 搜索框输入姓名，结果列表显示匹配学生，点击跳转学生详情页

/teacher/classes/{classUuid}
    - 班级详情页，展示该班级所有学生的成绩概览

---

### 全局组件

AIPanel（浮动 AI 助手）
    - 右下角固定浮动按钮，可拖拽至屏幕任意位置
    - 点击展开对话窗口，支持多轮对话（持久化至 localStorage）
    - 快捷 chip 按钮随软件语言翻译（translateBatch），但发送至后端的 prompt 保持英文
    - 当前处于报告页时，自动将报告 UUID 传入上下文，AI 可回答报告相关问题
    - 支持学科、成绩、出勤等上下文感知问答

AppShell（侧边栏 + 顶部导航）
    - 左侧固定侧边栏：Logo、角色导航（家长/教师自动切换）、设置、用户头像
    - 家长侧导航项：仪表盘、消息、报告、通知、资源
    - 教师侧导航项：仪表盘、消息、帖子、查找学生
    - 消息、通知导航项显示红点（未读数 > 0 时）
    - 底部：语言切换（LanguageCombobox）、主题切换（深色/浅色）、用户信息及登出
