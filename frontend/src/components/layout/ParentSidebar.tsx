import { NavLink, useLocation, useNavigate } from "react-router-dom"
import {
  BookOpen,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Moon,
  FileText,
  Sun,
} from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { useSettings } from "@/contexts/SettingsContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function OperaDeco() {
  return (
    <div className="relative z-[1] px-4 pb-2">
      <svg
        className="w-full text-primary opacity-70"
        viewBox="0 0 180 55"
        fill="none"
        aria-hidden
      >
        <rect
          x="0"
          y="48"
          width="180"
          height="3"
          fill="currentColor"
          opacity="0.4"
          rx="1.5"
        />
        <path
          d="M18 48 Q40 18 62 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M28 48 Q50 10 72 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.6"
        />
        <path
          d="M68 48 Q100 4 132 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="M78 48 Q110 0 142 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          opacity="0.6"
        />
        <path
          d="M4 48 Q18 28 32 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.8"
        />
      </svg>
      <div className="mt-0.5 text-center text-[9px] font-bold tracking-[0.12em] text-[var(--tx3)] uppercase">
        Sydney
      </div>
    </div>
  )
}

export default function ParentSidebar({ sid }: { sid: string }) {
  const sidValue = sid ?? ""
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const studentBase = `/parent/students/${sidValue}`
  const dashboardActive =
    pathname === studentBase || pathname.startsWith(`${studentBase}/dashboard`)
  const { user } = useAuth()
  const { settings, setSettings } = useSettings()
  const night = settings.theme === "dark"

  const items: Array<{
    to: string
    label: string
    icon: typeof LayoutDashboard
    isActive: () => boolean
  }> = [
    {
      to: `/parent/students/${sidValue}/dashboard`,
      label: "仪表盘",
      icon: LayoutDashboard,
      isActive: () => dashboardActive,
    },
    {
      to: `/parent/students/${sidValue}/subjects/subject-001`,
      label: "学科",
      icon: BookOpen,
      isActive: () => pathname.startsWith(`${studentBase}/subjects`),
    },
    {
      to: `/parent/students/${sidValue}/reports`,
      label: "简报",
      icon: FileText,
      isActive: () => pathname.startsWith(`${studentBase}/reports`),
    },
    {
      to: `/parent/students/${sidValue}/discussions`,
      label: "讨论区",
      icon: MessageSquare,
      isActive: () => pathname.startsWith(`${studentBase}/discussions`),
    },
    {
      to: `/parent/students/${sidValue}/tasks`,
      label: "公告/任务",
      icon: ListTodo,
      isActive: () => pathname.startsWith(`${studentBase}/tasks`),
    },
  ]

  return (
    <aside className="citypop-sidebar flex min-h-0 flex-col text-[13px] font-semibold tracking-wide text-[var(--tx2)] md:min-h-[min(740px,85svh)]">
      <div className="relative z-[1] border-b border-[var(--bd)] px-4 pb-3.5 pt-[18px]">
        <div className="mb-3.5 flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--logo)] font-display text-base leading-none tracking-[-0.06em] text-white">
            P
          </div>
          <div className="min-w-0">
            <div className="font-display text-[17px] leading-tight tracking-wide text-[var(--tx)]">
              ParentLink
            </div>
            <div className="mt-px text-[10px] font-medium uppercase tracking-wider text-[var(--tx3)]">
              家长端
            </div>
          </div>
          <button
            type="button"
            title={night ? "切换到日间" : "切换到夜间"}
            className="ml-auto flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border border-[var(--bd2)] bg-transparent text-[15px] text-[var(--tx2)] transition-colors hover:bg-[var(--bg2)]"
            onClick={() =>
              setSettings({ theme: night ? "light" : "dark" })
            }
          >
            {night ? <Sun className="size-[15px]" strokeWidth={2} /> : <Moon className="size-[15px]" strokeWidth={2} />}
          </button>
        </div>

        <div className="flex gap-[3px] rounded-[10px] bg-[var(--bg2)] p-[3px]">
          <span className="flex-1 rounded-[7px] bg-primary py-1.5 text-center text-[11px] font-semibold tracking-wide text-primary-foreground">
            家长
          </span>
          <button
            type="button"
            disabled
            title="教师端即将推出"
            className="flex-1 cursor-not-allowed rounded-[7px] py-1.5 text-center text-[11px] font-semibold tracking-wide text-[var(--tx2)] opacity-45"
          >
            教师
          </button>
        </div>
      </div>

      <nav className="relative z-[1] min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        <div className="mb-1.5 px-2 text-[9px] font-semibold uppercase tracking-widest text-[var(--tx3)]">
          导航
        </div>
        <div className="space-y-[3px]">
          {items.map((item) => {
            const Icon = item.icon
            const active = item.isActive()
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-[var(--tx2)] hover:bg-[var(--bg2)] hover:text-[var(--tx)]",
                )}
              >
                <Icon
                  className={cn(
                    "size-[15px] shrink-0 opacity-70",
                    active && "opacity-100",
                  )}
                  strokeWidth={2}
                />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      <OperaDeco />

      <div className="relative z-[1] mt-auto border-t border-[var(--bd)] px-3 py-3">
        <Button
          variant="outline"
          className="mb-2 h-8 w-full justify-start gap-2 rounded-[10px] border-[var(--bd2)] text-[11px] font-bold"
          onClick={() => navigate("/settings")}
        >
          设置与语言
        </Button>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[var(--bg2)]"
          onClick={() => navigate("/account")}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
            {user?.name?.slice(0, 1) ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] text-[var(--tx)]">{user?.name ?? "访客"}</div>
            <div className="truncate text-[11px] font-medium text-[var(--tx3)]">
              {user?.email ?? ""}
            </div>
          </div>
        </button>
      </div>
    </aside>
  )
}
