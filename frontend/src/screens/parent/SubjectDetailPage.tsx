import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { mockSubjectsById } from "@/mock/data"

type Assignment = {
  id: string
  title: string
  dueDate: string
  status: "已提交" | "未提交" | "进行中"
}

export default function SubjectDetailPage() {
  const { sid, subjectId } = useParams()
  const navigate = useNavigate()

  const data = useMemo(() => {
    const fallback = {
      subjectName: "未知学科",
      teacher: "—",
      avgScore: 0,
      assignments: [] as Assignment[],
    }

    if (!subjectId) return fallback
    const subject = mockSubjectsById[subjectId]
    if (!subject) return fallback
    return {
      subjectName: subject.subjectName,
      teacher: subject.teacher,
      avgScore: subject.avgScore,
      assignments: subject.assignments,
    }
  }, [subjectId])

  const progressPercent = clamp(Math.round(data.avgScore), 0, 100)

  const backToDashboard = () => {
    if (!sid) return
    navigate(`/parent/students/${sid}/dashboard`)
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">学科详情</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            sid: {sid} · subjectId: {subjectId}
          </div>
        </div>

        <Button variant="outline" onClick={backToDashboard}>
          返回仪表盘
        </Button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">学科信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-xl font-semibold">{data.subjectName}</div>
              <Badge variant="outline">平均分：{data.avgScore}</Badge>
              <Badge variant="secondary">老师：{data.teacher}</Badge>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">学习进度</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-primary/50"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">近期作业</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.assignments.map((a) => (
              <div key={a.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      截止：{a.dueDate}
                    </div>
                  </div>
                  <Badge
                    variant={
                      a.status === "已提交"
                        ? "secondary"
                        : a.status === "未提交"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

