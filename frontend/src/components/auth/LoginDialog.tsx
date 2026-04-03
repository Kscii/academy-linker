import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import { useAuth } from "@/contexts/AuthContext"

export default function LoginDialog({
  open,
  onOpenChange,
  onLoginSuccess,
}: {
  open: boolean
  onOpenChange: (nextOpen: boolean) => void
  onLoginSuccess: () => void
}) {
  const { login } = useAuth()

  const [email, setEmail] = useState("parent@example.com")
  const [password, setPassword] = useState("mock-password")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
  }, [open])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>登录</DialogTitle>
          <DialogDescription>mock 登录：仅前端交互与样式，不会调用后端接口。</DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setSubmitting(true)
            setError(null)
            try {
              if (!email.trim() || !password.trim()) {
                setError("请输入邮箱和密码（mock 校验）。")
                return
              }
              await login({ email, password })
              onLoginSuccess()
              onOpenChange(false)
            } catch {
              setError("登录失败，请重试。")
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="email">
              邮箱
            </label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="password">
              密码
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mock-password"
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "登录中..." : "登录"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

