import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { mockStudentBySid, mockSubjectScoresByRange } from "@/mock/data"

type SubjectScore = { subjectId: string; name: string; score: number }

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export default function StudentDashboardPage() {
  const { sid } = useParams()
  const navigate = useNavigate()

  const [timeRange, setTimeRange] = useState<"week" | "month">("week")

  const student = useMemo(
    () => ({
      sid: sid ?? "sid-001",
      className: mockStudentBySid[sid ?? "sid-001"]?.className ?? "—",
      name: mockStudentBySid[sid ?? "sid-001"]?.name ?? "—",
      lastUpdated:
        timeRange === "week" ? "2026-04-03 09:40" : "2026-04-01 18:20",
      unreadMessages: true,
      unreadImportantNotices: timeRange === "month",
    }),
    [sid, timeRange],
  )

  const subjectScores = mockSubjectScoresByRange[timeRange] as SubjectScore[]
  const maxScore = Math.max(...subjectScores.map((s) => s.score), 1)

  const summary = useMemo(
    () => ({
      performanceIndex: timeRange === "week" ? 91 : 88,
      homeworkCompletion: timeRange === "week" ? 96 : 92,
      attendance: timeRange === "week" ? 98 : 97,
      aiSummary:
        timeRange === "week"
          ? "这周你在核心学科上稳步提升，建议继续保持，并重点巩固易错题。"
          : "本月综合表现稳定。建议调整学习节奏，针对薄弱学科做阶段复盘。",
      cardToSubject: [
        { subjectId: "subject-002", label: "综合表现指数" },
        { subjectId: "subject-001", label: "作业完成情况" },
        { subjectId: "subject-004", label: "出勤率" },
        { subjectId: "subject-003", label: "AI 生成总结" },
      ] as const,
    }),
    [timeRange],
  )

  const importantBanner = useMemo(() => {
    if (!student.unreadImportantNotices) return null
    return {
      title: "重要公告：本周主题答疑",
      description:
        "请在任务页查看最新的答疑安排（mock）。过期后会自动隐藏。",
    }
  }, [student.unreadImportantNotices])

  const gotoSubject = (subjectId: string) => {
    if (!sid) return
    navigate(`/parent/students/${sid}/subjects/${subjectId}`)
  }

  const gotoTasks = () => {
    if (!sid) return
    navigate(`/parent/students/${sid}/tasks`)
  }

  const gotoDiscussions = () => {
    if (!sid) return
    navigate(`/parent/students/${sid}/discussions`)
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-semibold">学生仪表盘</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            {student.className} · {student.name}
          </div>
        </div>

        <div className="text-right text-sm text-muted-foreground">
          最近更新时间
          <div className="mt-1 text-foreground">{student.lastUpdated}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">顶部学生基本信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                未读留言 & 公告：
                <span className="ml-2 inline-flex items-center gap-2">
                  <Badge
                    variant={student.unreadMessages ? "default" : "outline"}
                  >
                    {student.unreadMessages ? "有未读" : "无未读"}
                  </Badge>
                  <Badge
                    variant={
                      student.unreadImportantNotices ? "secondary" : "outline"
                    }
                  >
                    {student.unreadImportantNotices ? "重要公告" : "暂无重要"}
                  </Badge>
                </span>
              </div>
              <Button variant="outline" onClick={gotoDiscussions}>
                点击查看留言/公告
              </Button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">统计时间范围</div>
              <Select
                value={timeRange}
                onValueChange={(value) => {
                  if (value === "week" || value === "month") {
                    setTimeRange(value)
                  }
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">本周</SelectItem>
                  <SelectItem value="month">本月</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {importantBanner ? (
            <Alert
              variant="destructive"
              className="cursor-pointer"
              onClick={gotoTasks}
            >
              <AlertTitle>重要公告</AlertTitle>
              <AlertDescription>{importantBanner.description}</AlertDescription>
            </Alert>
          ) : (
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">重要通知</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                暂无重要公告（mock）。你可以查看任务页了解更多。
                <div className="mt-3">
                  <Button variant="outline" onClick={gotoTasks}>
                    前往任务页
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          className="cursor-pointer"
          onClick={() => gotoSubject(summary.cardToSubject[0].subjectId)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {summary.cardToSubject[0].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">
              {summary.performanceIndex}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">综合指数（mock）</div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer"
          onClick={() => gotoSubject(summary.cardToSubject[1].subjectId)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {summary.cardToSubject[1].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">
              {summary.homeworkCompletion}%
            </div>
            <div className="mt-1 text-xs text-muted-foreground">作业完成（mock）</div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer"
          onClick={() => gotoSubject(summary.cardToSubject[2].subjectId)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {summary.cardToSubject[2].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">{summary.attendance}%</div>
            <div className="mt-1 text-xs text-muted-foreground">出勤率（mock）</div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer"
          onClick={() => gotoSubject(summary.cardToSubject[3].subjectId)}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {summary.cardToSubject[3].label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="line-clamp-3 text-sm text-muted-foreground">
              {summary.aiSummary}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              点击查看对应学科详情
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">学科柱状图（点击跳转）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-3">
              {subjectScores.map((s) => (
                <button
                  key={s.subjectId}
                  className="group flex-1"
                  onClick={() => gotoSubject(s.subjectId)}
                  title={s.name}
                >
                  <div
                    className="mx-auto w-full rounded-lg bg-primary/20 transition-colors group-hover:bg-primary/30"
                    style={{
                      height: `${clamp(
                        (s.score / maxScore) * 140,
                        18,
                        140,
                      )}px`,
                    }}
                  />
                  <div className="mt-2 text-center text-xs text-muted-foreground">
                    {s.name}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">学科条形图（点击跳转）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjectScores.map((s) => {
              const percent = Math.round((s.score / maxScore) * 100)
              return (
                <button
                  key={s.subjectId}
                  className="w-full rounded-lg border p-3 text-left hover:bg-muted/30"
                  onClick={() => gotoSubject(s.subjectId)}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">{s.score}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary/40"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </button>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">学习进度图（mock）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {subjectScores.slice(0, 3).map((s, idx) => {
                const progress = clamp(
                  Math.round(s.score - idx * 3),
                  30,
                  100,
                )
                return (
                  <button
                    key={s.subjectId}
                    className="w-full rounded-lg border p-3 text-left hover:bg-muted/30"
                    onClick={() => gotoSubject(s.subjectId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{s.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {progress}%
                      </div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary/40"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      周期：{timeRange === "week" ? "近 7 天" : "近 30 天"}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

