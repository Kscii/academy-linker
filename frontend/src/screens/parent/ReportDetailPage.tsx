import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import ReactMarkdown from "react-markdown"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import ReportStatusBadge from "@/components/reports/ReportStatusBadge"
import { mockReports } from "@/mock/data"
import type { Report, ReportStatus } from "@/types"

const STORAGE_KEY = "academy-linker:reports-status"

function loadStatusMap(): Record<string, ReportStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, ReportStatus>
  } catch {
    return {}
  }
}

function saveStatusMap(map: Record<string, ReportStatus>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function getStatus(report: Report, statusMap: Record<string, ReportStatus>) {
  return statusMap[report.id] ?? report.statusDefault
}

export default function ReportDetailPage() {
  const { sid, reportId } = useParams()
  const navigate = useNavigate()

  const reports = mockReports

  const report = useMemo(
    () => reports.find((r) => r.id === reportId) ?? null,
    [reportId],
  )

  const [status, setStatus] = useState<ReportStatus>("read")

  const [view, setView] = useState<"summary" | "original">("summary")
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)

  useEffect(() => {
    if (!report) return
    const statusMap = loadStatusMap()
    setStatus(getStatus(report, statusMap))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report])

  const persistStatus = (nextStatus: ReportStatus) => {
    if (!report) return
    const nextMap = loadStatusMap()
    nextMap[report.id] = nextStatus
    saveStatusMap(nextMap)
    setStatus(nextStatus)
  }

  if (!report) {
    return (
      <div className="min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>简报不存在</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            reportId：{reportId}
            <div className="mt-3">
              <Button variant="outline" onClick={() => navigate(`/parent/students/${sid}/reports`)}>
                返回列表
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const markdown = view === "summary" ? report.summaryMarkdown : report.originalMarkdown

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">简报详情</h1>
          <div className="mt-1 text-sm text-muted-foreground">
            sid: {sid} · {report.week}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/parent/students/${sid}/reports`)}
          >
            返回列表
          </Button>
          {status !== "archived" ? (
            <Button
              variant="secondary"
              onClick={() => persistStatus("archived")}
            >
              归档
            </Button>
          ) : null}
          {status === "unread" ? (
            <Button onClick={() => persistStatus("read")}>标记为已读</Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{report.title}</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ReportStatusBadge status={status} />
              <Badge variant="outline">{report.type}</Badge>
              <Badge variant="secondary">
                来源：{report.origin === "AI" ? "AI 生成" : "教师提交"}
              </Badge>
              <Badge variant="outline">{report.createdAt}</Badge>
            </div>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={view === "summary" ? "default" : "outline"}
                onClick={() => setView("summary")}
              >
                显示摘要
              </Button>
              <Button
                variant={view === "original" ? "default" : "outline"}
                onClick={() => setView("original")}
              >
                显示原文
              </Button>
            </div>

            <Separator className="my-4" />

            <div className="prose max-w-none">
              <ReactMarkdown>{markdown}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">AI 助手（mock）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div>
                当你在简报详情页时，系统会把当前简报文本加入提示词（这里只做模拟渲染）。
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const content = view === "summary" ? report.summaryMarkdown : report.originalMarkdown
                    const preview = content.replace(/[#>*`-]/g, "").slice(0, 120)
                    setAiAnswer(
                      `一键回答（mock）：基于当前简报，我建议你关注“重点巩固易错题”和“保持学习节奏”。当前内容摘要：${preview}...`,
                    )
                  }}
                >
                  一键总结/回答
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAiAnswer(null)}
                >
                  清空
                </Button>
              </div>
              {aiAnswer ? (
                <div className="rounded-xl border bg-muted/30 p-3 text-foreground">
                  {aiAnswer}
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/20 p-3">
                  点击按钮生成一个 mock 回复。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

