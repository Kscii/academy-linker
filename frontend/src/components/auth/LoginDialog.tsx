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
      <DialogContent
        overlayClassName="citypop-login-overlay supports-backdrop-filter:backdrop-blur-[2px]"
        showCloseButton
        className={[
          "top-[40%] max-w-[calc(100%-2rem)] gap-4 overflow-hidden rounded-[22px] border-[1.5px] border-[var(--bd2)] sm:max-w-[360px]",
          "bg-[var(--card)] p-7 text-[var(--tx)] ring-0",
        ].join(" ")}
      >
        <div
          className="pointer-events-none absolute -top-14 -right-14 size-[180px] rounded-full border-2 border-[var(--bd)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -top-9 -right-9 size-[120px] rounded-full border-[1.5px] border-[var(--bd2)]"
          aria-hidden
        />

        <DialogHeader>
          <div className="mb-1 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--logo)] font-display text-xl tracking-[-0.06em] text-white">
              P
            </div>
            <div>
              <DialogTitle className="font-display text-xl tracking-wide text-[var(--tx)]">
                ParentLink
              </DialogTitle>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--tx3)]">
                Sydney · 登录
              </p>
            </div>
          </div>
          <DialogDescription className="text-[13px] text-[var(--tx2)]">
            Mock 登录：仅前端交互与样式，不会调用后端接口。
          </DialogDescription>
        </DialogHeader>

        <form
          className="relative grid gap-3"
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

          <DialogFooter className="mt-1 -mx-0 -mb-0 border-0 bg-transparent p-0 sm:justify-stretch">
            <Button
              type="submit"
              disabled={submitting}
              className="font-display w-full rounded-xl py-5 text-[15px] tracking-wide"
            >
              {submitting ? "登录中…" : "登录 →"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

