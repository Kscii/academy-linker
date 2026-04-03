import { Badge } from "@/components/ui/badge"

import type { ReportStatus } from "@/types"

const statusLabel: Record<ReportStatus, string> = {
  unread: "未阅读",
  read: "已阅读",
  archived: "已归档",
}

const statusVariant: Record<ReportStatus, "destructive" | "secondary" | "outline"> =
  {
    unread: "destructive",
    read: "secondary",
    archived: "outline",
  }

export default function ReportStatusBadge({
  status,
  showDot = false,
}: {
  status: ReportStatus
  showDot?: boolean
}) {
  const variant = statusVariant[status]
  return (
    <span className="inline-flex items-center gap-2">
      {showDot && status === "unread" ? (
        <span className="inline-block size-2 rounded-full bg-destructive" />
      ) : null}
      <Badge variant={variant}>{statusLabel[status]}</Badge>
    </span>
  )
}

