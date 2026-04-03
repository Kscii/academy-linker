import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"

import LoginDialog from "@/components/auth/LoginDialog"
import AppHeader from "@/components/layout/AppHeader"

export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const redirectTo = searchParams.get("redirectTo")
  const defaultAfterLogin = "/parent/students/sid-001/dashboard"

  const initialOpen = useMemo(() => Boolean(redirectTo), [redirectTo])
  const [open, setOpen] = useState(initialOpen)

  useEffect(() => {
    if (!redirectTo) return
    setOpen(true)
  }, [redirectTo])

  return (
    <>
      <div className="mx-auto max-w-6xl p-6">
        <AppHeader />
      </div>
      <div className="flex min-h-[80svh] flex-col items-center justify-center gap-6 p-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Academy Linker
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Parent portal frontend mock：只实现页面样式与交互逻辑（无后端接口）。
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => setOpen(true)}>登录</Button>
          <Button variant="secondary" onClick={() => navigate("/account")}>
            查看账户
          </Button>
        </div>

        <div className="mt-6 w-full max-w-xl text-left text-sm text-muted-foreground">
          Tip：你可以直接访问任意受保护页面（例如 `/parent/...`），未登录时会自动回到首页并弹出登录框。
        </div>
      </div>

      <LoginDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            navigate("/", { replace: true })
          }
        }}
        onLoginSuccess={() => {
          navigate(redirectTo ?? defaultAfterLogin, { replace: true })
        }}
      />
    </>
  )
}

