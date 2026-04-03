import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useSettings } from "@/contexts/SettingsContext"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import AppHeader from "@/components/layout/AppHeader"

export default function SettingsPage() {
  const { settings, setSettings } = useSettings()

  return (
    <div className="mx-auto flex min-h-[80svh] max-w-4xl flex-col gap-4 p-6">
      <AppHeader />
      <div>
        <h1 className="text-3xl font-semibold">设置</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          基于 `SettingsContext` 的本地存储：刷新后仍会保持当前配置。
        </p>
      </div>

      <Tabs defaultValue="accessibility">
        <TabsList>
          <TabsTrigger value="accessibility">无障碍</TabsTrigger>
          <TabsTrigger value="ai">AI 风格偏好</TabsTrigger>
          <TabsTrigger value="notifications">通知</TabsTrigger>
        </TabsList>

        <TabsContent value="accessibility">
          <Card>
            <CardHeader>
              <CardTitle>无障碍与显示</CardTitle>
              <CardDescription>夜间模式 / 多语言 / 高对比度 / TTS（mock）。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">夜间模式</div>
                  <div className="text-xs text-muted-foreground">切换到暗色主题。</div>
                </div>
                <Switch
                  checked={settings.theme === "dark"}
                  onCheckedChange={(checked) => {
                    setSettings({ theme: checked ? "dark" : "light" })
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">高对比度</div>
                  <div className="text-xs text-muted-foreground">仅影响本地 UI 状态。</div>
                </div>
                <Switch
                  checked={settings.highContrast}
                  onCheckedChange={(checked) => {
                    setSettings({ highContrast: checked })
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">TTS 功能</div>
                  <div className="text-xs text-muted-foreground">仅保存开关状态，不实际播报。</div>
                </div>
                <Switch
                  checked={settings.ttsEnabled}
                  onCheckedChange={(checked) => {
                    setSettings({ ttsEnabled: checked })
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">多语言</div>
                <Select
                  value={settings.language}
                  onValueChange={(value) => {
                    if (!value) return
                    if (value === "zh-CN" || value === "en") {
                      setSettings({ language: value })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">中文</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI 风格与记录</CardTitle>
              <CardDescription>用于后续 AI 总结/聊天的渲染偏好（mock）。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="flex flex-col gap-2">
                <div className="text-sm font-medium">AI 风格偏好</div>
                <Select
                  value={settings.aiStyle}
                  onValueChange={(value) => {
                    if (!value) return
                    if (
                      value === "concise" ||
                      value === "detailed" ||
                      value === "encouraging"
                    ) {
                      setSettings({ aiStyle: value })
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="encouraging">鼓励型</SelectItem>
                    <SelectItem value="concise">简洁型</SelectItem>
                    <SelectItem value="detailed">详细型</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">AI 聊天记录归档</div>
                  <div className="text-xs text-muted-foreground">
                    影响后续归档列表展示（mock）。
                  </div>
                </div>
                <Switch
                  checked={settings.aiHistoryArchive}
                  onCheckedChange={(checked) => {
                    setSettings({ aiHistoryArchive: checked })
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>邮箱推送</CardTitle>
              <CardDescription>简报与帖子通知（mock）。</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">简报（digest）</div>
                  <div className="text-xs text-muted-foreground">接收每周简报。</div>
                </div>
                <Switch
                  checked={settings.emailDigestEnabled}
                  onCheckedChange={(checked) => {
                    setSettings({ emailDigestEnabled: checked })
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium">帖子（posts）</div>
                  <div className="text-xs text-muted-foreground">接收新帖子提醒。</div>
                </div>
                <Switch
                  checked={settings.emailPostsEnabled}
                  onCheckedChange={(checked) => {
                    setSettings({ emailPostsEnabled: checked })
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

