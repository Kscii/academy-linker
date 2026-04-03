import { useEffect, useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"

import LoginDialog from "@/components/auth/LoginDialog"

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get("redirectTo")
  const defaultAfterLogin = "/parent/students/sid-001/dashboard"
  const [open, setOpen] = useState(true)

  const afterLoginPath = useMemo(
    () => redirectTo ?? defaultAfterLogin,
    [redirectTo],
  )

  useEffect(() => {
    setOpen(true)
  }, [])

  return (
    <div className="mx-auto flex min-h-[80svh] max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold">登录</h1>
      <p className="text-sm text-muted-foreground">
        使用同一个登录弹窗组件（mock：无后端接口）。
      </p>
      <div className="flex gap-3">
        <Button
          onClick={() => {
            setOpen(true)
          }}
        >
          打开登录框
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            navigate("/", { replace: true })
          }}
        >
          返回首页
        </Button>
      </div>

      <LoginDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) navigate("/", { replace: true })
        }}
        onLoginSuccess={() => {
          navigate(afterLoginPath, { replace: true })
        }}
      />
    </div>
  )
}

