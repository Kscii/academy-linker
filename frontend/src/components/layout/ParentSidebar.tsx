import { NavLink } from "react-router-dom"

import { Card } from "@/components/ui/card"

export default function ParentSidebar({ sid }: { sid: string }) {
  const sidValue = sid ?? ""

  const items: Array<{ to: string; label: string }> = [
    { to: `/parent/students/${sidValue}/dashboard`, label: "仪表盘" },
    { to: `/parent/students/${sidValue}/subjects/subject-001`, label: "学科" },
    { to: `/parent/students/${sidValue}/reports`, label: "简报" },
    { to: `/parent/students/${sidValue}/discussions`, label: "讨论区" },
    { to: `/parent/students/${sidValue}/tasks`, label: "公告/任务" },
  ]

  return (
    <Card className="p-4">
      <div className="text-sm font-medium">学生仪表盘</div>
      <div className="mt-1 text-xs text-muted-foreground">sid: {sidValue}</div>

      <div className="mt-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "block rounded-lg border px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-ring bg-muted/50 text-foreground"
                  : "border-transparent hover:border-border hover:bg-muted/40 text-muted-foreground",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </Card>
  )
}

