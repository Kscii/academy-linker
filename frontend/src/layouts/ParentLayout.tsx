import { Outlet, useParams } from "react-router-dom"

import ParentSidebar from "@/components/layout/ParentSidebar"

export default function ParentLayout() {
  const { sid } = useParams()
  const sidValue = sid ?? ""

  return (
    <div className="mx-auto min-h-[80svh] max-w-6xl p-6">
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <ParentSidebar sid={sidValue} />

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

