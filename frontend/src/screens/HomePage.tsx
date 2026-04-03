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
      <div className="relative min-h-[100svh] bg-[var(--bg)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage: `radial-gradient(circle, var(--dot) 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />
        <div className="citypop-login-overlay absolute inset-0 opacity-55" aria-hidden />
        <div className="relative mx-auto max-w-6xl p-4 md:p-6">
          <AppHeader />
        </div>
        <div className="relative flex min-h-[calc(100svh-120px)] flex-col items-center justify-center gap-6 px-6 pb-16">
        <div className="text-center">
          <h1 className="font-display text-4xl font-medium tracking-wide text-[var(--tx)] md:text-5xl">
            ParentLink
          </h1>
          <p className="mt-3 max-w-md text-sm font-medium text-[var(--tx2)]">
            City Pop Sydney 风格家长门户（前端 mock）：页面样式与交互，无后端接口。
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => setOpen(true)}>登录</Button>
          <Button variant="secondary" onClick={() => navigate("/account")}>
            查看账户
          </Button>
        </div>

        <div className="mt-6 w-full max-w-xl text-left text-sm text-[var(--tx2)]">
          Tip：你可以直接访问任意受保护页面（例如 `/parent/...`），未登录时会自动回到首页并弹出登录框。
        </div>
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

