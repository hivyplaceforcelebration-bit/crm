import type React from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { CRMSidebar } from "@/components/crm-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { BrandProvider } from "@/hooks/use-brand"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
  }

  return (
    <BrandProvider>
      <div className="flex min-h-screen bg-secondary/20">
        <CRMSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <DashboardHeader user={user} />
          <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8">{children}</main>
        </div>
        <MobileBottomNav />
      </div>
    </BrandProvider>
  )
}
