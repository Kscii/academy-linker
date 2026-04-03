import { useNavigate } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"

export default function AppHeader() {
  const navigate = useNavigate()
  const { isLoggedIn, logout } = useAuth()

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background/50 px-4 py-3">
      <div className="min-w-0">
        <div className="truncate text-base font-semibold">Academy Linker</div>
        <div className="text-xs text-muted-foreground">Parent portal</div>
      </div>

      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <>
            <Button variant="outline" onClick={() => navigate("/account")}>
              账户
            </Button>
            <Button variant="outline" onClick={() => navigate("/settings")}>
              设置
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                logout()
                navigate("/", { replace: true })
              }}
            >
              登出
            </Button>
          </>
        ) : (
          <Button onClick={() => navigate("/login")}>登录</Button>
        )}
      </div>
    </div>
  )
}

