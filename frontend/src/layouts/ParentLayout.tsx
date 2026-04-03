import { Outlet, useParams } from "react-router-dom"

import ParentSidebar from "@/components/layout/ParentSidebar"

export default function ParentLayout() {
  const { sid } = useParams()
  const sidValue = sid ?? ""

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col p-4 md:p-6">
      <div className="citypop-shell flex flex-col md:flex-row">
        <ParentSidebar sid={sidValue} />
        <main className="citypop-main-bg max-h-[65svh] overflow-y-auto md:max-h-none md:flex-1 md:overflow-y-auto md:min-h-0 px-5 py-5 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
