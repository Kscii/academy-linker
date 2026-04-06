# Academy Linker

A modern school communication platform connecting parents, teachers, and administrators — with AI-powered insights, multilingual support, and real-time student progress tracking.

---

## Overview

Academy Linker bridges the gap between home and school by giving:

- **Parents** a clear, personalised view of their child's academic progress, direct messaging with teachers, school notices, leave management, and AI-powered learning suggestions.
- **Teachers** a dashboard to monitor student performance, publish class posts, and communicate with families.
- **Administrators** tools to manage teachers, classes, students, and parent-student bindings.

---

## Features

### Parent Portal
| Feature | Description |
|---------|-------------|
| Dashboard | Learning trend chart, weekly schedule, upcoming activities, wellbeing tips, birthday reminders, leave requests |
| Grades | Subject scores, bar/line charts, class averages, progress bars |
| Messages | Direct messaging with each subject teacher, unread badges |
| Reports | AI-generated weekly progress reports with PDF export |
| Notices | School announcements and teacher class posts |
| Teaching Suggestions | Subject-specific tips based on the student's performance |
| Incident Reporting | Anonymous bullying / drug / misconduct reporting |

### Teacher Portal
| Feature | Description |
|---------|-------------|
| Dashboard | Student overview with scores and at-risk flags |
| Class Posts | Publish AI-personalised posts to individual students or whole classes |
| Messages | Conversations with parents, organised by student |
| Find Student | Quick search across all students |

### Admin Portal
| Feature | Description |
|---------|-------------|
| Overview | School-wide stats (teachers, students, parents, classes) |
| Teacher Management | Create and manage teacher accounts |
| Class Management | Create classes, assign homeroom teachers, enrol students |
| Student Management | Create student records |
| Parent Management | Create parent accounts, link/unlink students |

### Platform-wide
- **AI Assistant** — Floating chat panel powered by DeepSeek, context-aware of the current page
- **17-language support** — i18next static translations + AI translation fallback for dynamic content
- **Dark / Light mode** — Follows system preference, user preference persisted
- **JWT auth** — HttpOnly cookie, auto-refresh on expiry
- **Celebration banners** — Birthday countdowns and upcoming Australian/cultural holiday reminders

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 · TypeScript · Vite · react-router v7 |
| Styling | CSS variables · Tailwind v4 |
| i18n | react-i18next · DeepSeek AI translation fallback |
| AI | DeepSeek Chat API (deepseek-chat model) |
| Mock Backend | Python · Flask · PyJWT |
| Charts | Custom SVG line/bar chart components |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+

### 1. Clone and install

```bash
git clone https://github.com/your-org/academy-linker.git
cd academy-linker
cd frontend && npm install && cd ..
pip install flask pyjwt flask-cors requests
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and add your DeepSeek API key
```

### 3. Start the mock backend

```bash
python3 mock_server.py
# Runs on http://localhost:8000
```

### 4. Start the frontend

```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### 5. Login

| Role | Email | Password |
|------|-------|----------|
| Parent | `li.wei@email.com` | `password123` |
| Teacher | `thompson@westside.edu.au` | `password123` |
| Admin | `admin@westside.edu.au` | `admin123` |

---

## Project Structure

```
academy-linker/
├── frontend/
│   ├── src/
│   │   ├── screens/          # Page components (parent / teacher / admin)
│   │   ├── components/       # Shared UI (AppShell, AIPanel, charts…)
│   │   ├── contexts/         # AppContext — global state & persistence
│   │   ├── lib/              # API client, translation helpers, mock data
│   │   └── types/            # TypeScript API types
│   └── public/locales/       # i18n JSON files (17 languages)
├── mock_server.py            # Flask mock backend with AI endpoints
├── .env.example              # Environment variable template
└── docs/                     # Design documents
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEEPSEEK_API_KEY` | Yes (for AI) | DeepSeek API key. AI features gracefully degrade if unset. |

Set via `.env` file (see `.env.example`) or export in your shell before running `mock_server.py`.

---

## License

MIT
