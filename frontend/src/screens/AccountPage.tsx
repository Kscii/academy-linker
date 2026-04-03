import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"
import AppHeader from "@/components/layout/AppHeader"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function AccountPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [newPassword, setNewPassword] = useState("")
  const [status, setStatus] = useState<string | null>(null)

  if (!user) return null

  const phone = "1380000" + user.id.slice(-4)

  return (
    <div className="mx-auto flex min-h-[80svh] max-w-4xl flex-col gap-4 p-6">
      <AppHeader />
      <h1 className="text-3xl font-semibold">账户信息</h1>

      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-4">
            <Avatar>
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={user.name} />
              ) : null}
              <AvatarFallback>{user.name.slice(0, 1)}</AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="truncate text-base font-medium">{user.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {user.email}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="secondary">{user.role}</Badge>
                {user.sidBindings?.map((sid) => (
                  <Badge key={sid} variant="outline">
                    sid: {sid}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">手机号</span>
              <span>{phone}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">邮箱</span>
              <span>{user.email}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setStatus("mock: 头像上传在后续补齐（当前为占位）。")
              }}
            >
              更换头像
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>修改密码（mock）</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium" htmlFor="password-new">
              新密码
            </label>
            <Input
              id="password-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="输入新密码（mock）"
            />
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                if (!newPassword.trim()) {
                  setStatus("请输入新密码（mock 校验）。")
                  return
                }
                setStatus("mock: 密码修改成功（未调用后端）。")
                setNewPassword("")
              }}
            >
              保存
            </Button>
            {status ? (
              <div className="text-sm text-muted-foreground">{status}</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

