import { useNavigate, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

import { mockTeachers } from "@/mock/data"
import EmptyState from "@/components/common/EmptyState"

export default function DiscussionsPage() {
  const { sid } = useParams()
  const navigate = useNavigate()
  const teachers = mockTeachers

  const gotoTeacher = (tid: string) => {
    if (!sid) return
    navigate(`/parent/students/${sid}/discussions/teachers/${tid}`)
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">讨论区</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            sid: {sid}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[260px_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">老师列表</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[420px]">
              <div className="space-y-2 pr-2">
                {teachers
                  .slice()
                  .sort((a, b) => b.unreadCount - a.unreadCount)
                  .map((t) => (
                    <button
                      key={t.tid}
                      className="w-full rounded-xl border p-3 text-left hover:bg-muted/30"
                      onClick={() => gotoTeacher(t.tid)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {t.name}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {t.subject}
                          </div>
                        </div>
                        {t.unreadCount > 0 ? (
                          <Badge variant="destructive">
                            {t.unreadCount}
                          </Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <EmptyState title="选择一位老师查看帖子" />
      </div>
    </div>
  )
}

