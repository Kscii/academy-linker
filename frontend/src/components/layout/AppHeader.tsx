import { useNavigate } from "react-router-dom"
import { Moon, Sun } from "lucide-react"

import { useAuth } from "@/contexts/AuthContext"
import { useSettings } from "@/contexts/SettingsContext"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function AppHeader() {
  const navigate = useNavigate()
  const { isLoggedIn, logout } = useAuth()
  const { settings, setSettings } = useSettings()
  const night = settings.theme === "dark"

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border border-[var(--bd)] px-4 py-3",
        "bg-[var(--card)]/80 shadow-sm backdrop-blur-sm",
      )}
    >
      <button
        type="button"
        onClick={() => navigate("/")}
        className="min-w-0 text-left transition-opacity hover:opacity-85"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[var(--logo)] font-display text-sm leading-none tracking-[-0.04em] text-white">
            P
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-base tracking-wide text-[var(--tx)]">
              ParentLink
            </div>
            <div className="text-xs font-medium text-[var(--tx3)]">Sydney · 家长门户</div>
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          className="shrink-0 rounded-lg border-[var(--bd2)]"
          title={night ? "切换到日间" : "切换到夜间"}
          onClick={() => setSettings({ theme: night ? "light" : "dark" })}
        >
          {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        {isLoggedIn ? (
          <>
            <Button
              variant="outline"
              className="rounded-lg border-[var(--bd2)]"
              onClick={() => navigate("/account")}
            >
              账户
            </Button>
            <Button
              variant="outline"
              className="rounded-lg border-[var(--bd2)]"
              onClick={() => navigate("/settings")}
            >
              设置
            </Button>
            <Button
              variant="destructive"
              className="rounded-lg"
              onClick={() => {
                logout()
                navigate("/", { replace: true })
              }}
            >
              登出
            </Button>
          </>
        ) : (
          <Button className="rounded-lg" onClick={() => navigate("/login")}>
            登录
          </Button>
        )}
      </div>
    </div>
  )
}
