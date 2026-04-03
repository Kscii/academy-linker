import { Navigate, useLocation } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode
}) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()

  if (isLoggedIn) return <>{children}</>

  const redirectTo = `${location.pathname}${location.search}`
  return (
    <Navigate
      to={`/?redirectTo=${encodeURIComponent(redirectTo)}`}
      replace
    />
  )
}

