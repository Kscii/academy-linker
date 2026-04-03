import { useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { mockTasks } from "@/mock/data"
import type { Task } from "@/types"

export default function TasksPage() {
  const { sid } = useParams()

  const tasks = mockTasks as Task[]

  const now = new Date()
  const visibleTasks = tasks
    .filter((t) => new Date(t.dueDate) >= now)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">学校公告 / 任务</h1>
          <div className="mt-1 text-sm text-muted-foreground">sid: {sid}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {visibleTasks.length ? (
          visibleTasks.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={t.type === "通知" ? "secondary" : "outline"}>
                    {t.type}
                  </Badge>
                  <Badge variant="outline">{t.from}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  截止：{t.dueDate}
                </div>
                <div className="text-xs text-muted-foreground">
                  创建时间：{t.createdAt}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              当前没有未过期的公告/任务（mock）。
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

