import { useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ReportStatusBadge from "@/components/reports/ReportStatusBadge"
import { mockReports } from "@/mock/data"
import type { Report, ReportStatus } from "@/types"

const STORAGE_KEY = "academy-linker:reports-status"

function loadStatusMap(): Record<string, ReportStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, ReportStatus>
    return parsed
  } catch {
    return {}
  }
}

function saveStatusMap(map: Record<string, ReportStatus>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function resolveStatus(report: Report, statusMap: Record<string, ReportStatus>) {
  return statusMap[report.id] ?? report.statusDefault
}

export default function ReportsListPage() {
  const { sid } = useParams()
  const navigate = useNavigate()
  const [showArchived, setShowArchived] = useState(false)

  const reports = mockReports as Report[]

  const statusMap = useMemo(() => loadStatusMap(), [showArchived])

  const resolvedReports = useMemo(() => {
    return reports
      .map((r) => ({ report: r, status: resolveStatus(r, statusMap) }))
      .sort((a, b) => (a.report.createdAt < b.report.createdAt ? 1 : -1))
  }, [statusMap])

  const visibleReports = resolvedReports.filter((x) => x.status !== "archived")
  const unreadReports = visibleReports.filter((x) => x.status === "unread")
  const readReports = visibleReports.filter((x) => x.status === "read")

  const archivedReports = resolvedReports.filter((x) => x.status === "archived")

  const goReport = (reportId: string) => {
    if (!sid) return
    navigate(`/parent/students/${sid}/reports/${reportId}`)
  }

  const ensureStatusMapSeeded = () => {
    const map = loadStatusMap()
    const next = { ...map }
    let changed = false
    for (const r of reports) {
      if (!next[r.id]) {
        next[r.id] = r.statusDefault
        changed = true
      }
    }
    if (changed) saveStatusMap(next)
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">简报列表</h1>
          <div className="mt-1 text-sm text-muted-foreground">sid: {sid}</div>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            ensureStatusMapSeeded()
            setShowArchived((v) => !v)
          }}
        >
          历史简报（{archivedReports.length}）
        </Button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              未阅读 {unreadReports.length ? "" : "(空)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unreadReports.length ? (
              unreadReports.map(({ report, status }) => (
                <button
                  key={report.id}
                  className="w-full rounded-xl border p-4 text-left hover:bg-muted/30"
                  onClick={() => goReport(report.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {report.title}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{report.week}</Badge>
                        <Badge variant="secondary">{report.type}</Badge>
                      </div>
                    </div>
                    <ReportStatusBadge status={status} showDot />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {report.createdAt} · 来源：{report.origin === "AI" ? "AI" : "教师"}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                当前没有未阅读简报。
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              已阅读 {readReports.length ? "" : "(空)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {readReports.length ? (
              readReports.map(({ report, status }) => (
                <button
                  key={report.id}
                  className="w-full rounded-xl border p-4 text-left hover:bg-muted/30"
                  onClick={() => goReport(report.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {report.title}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{report.week}</Badge>
                        <Badge variant="secondary">{report.type}</Badge>
                      </div>
                    </div>
                    <ReportStatusBadge status={status} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {report.createdAt} · 来源：{report.origin === "AI" ? "AI" : "教师"}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                当前没有已阅读简报。
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showArchived ? (
        <div className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">归档简报（只展示归档）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {archivedReports.length ? (
                archivedReports.map(({ report, status }) => (
                  <button
                    key={report.id}
                    className="w-full rounded-xl border p-4 text-left hover:bg-muted/30"
                    onClick={() => goReport(report.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {report.title}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{report.week}</Badge>
                          <Badge variant="secondary">{report.type}</Badge>
                        </div>
                      </div>
                      <ReportStatusBadge status={status} />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {report.createdAt} · 来源：{report.origin === "AI" ? "AI" : "教师"}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                  当前没有归档简报。
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}

