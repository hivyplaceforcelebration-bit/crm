"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ShieldAlert } from "lucide-react"
import { getCurrentUserRole } from "@/lib/actions/settings"
import { canAccessRoute } from "@/lib/permissions"

export function RoleGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking")

  useEffect(() => {
    let cancelled = false
    setStatus("checking")
    getCurrentUserRole()
      .then(({ role }) => {
        if (cancelled) return
        setStatus(canAccessRoute(role, pathname) ? "allowed" : "denied")
      })
      .catch(() => {
        if (!cancelled) setStatus("allowed") // fail open on a transient fetch error, not lock the user out
      })
    return () => { cancelled = true }
  }, [pathname])

  if (status === "denied") {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">You don&apos;t have access to this page</p>
        <p className="text-sm text-muted-foreground">Your role doesn&apos;t include this section. Ask an admin if you need access.</p>
        <Link href="/protected/dashboard" className="text-sm underline">Back to Dashboard</Link>
      </div>
    )
  }

  // Render optimistically while checking, rather than blanking the page on
  // every navigation - a denied page swaps in the moment the role check
  // resolves (typically well under a second).
  return <>{children}</>
}
