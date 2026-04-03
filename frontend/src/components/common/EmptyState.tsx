import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <div className="text-sm font-medium">{title}</div>
        {description ? (
          <div className="mt-2 text-sm text-muted-foreground">
            {description}
          </div>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  )
}

