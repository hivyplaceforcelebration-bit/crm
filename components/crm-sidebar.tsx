"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Coffee,
  LayoutDashboard,
  Users,
  ClipboardList,
  Package,
  Receipt,
  Settings,
  BarChart3,
  UserPlus,
  Menu,
  ChevronDown,
  MapPin,
  Clock,
  UserCog,
  Search,
} from "lucide-react"
import { useEffect, useState } from "react"
import { getCurrentUserRole } from "@/lib/actions/settings"
import { canAccessRoute } from "@/lib/permissions"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

import { useBrand } from "@/hooks/use-brand"

const sidebarItems = [
  { name: "Dashboard", href: "/protected/dashboard", icon: LayoutDashboard },
  { name: "Leads & Enquiries", href: "/protected/leads", icon: UserPlus },
  { name: "Bookings", href: "/protected/bookings", icon: ClipboardList },
  { name: "Customers", href: "/protected/customers", icon: Users },
  { name: "Packages", href: "/protected/packages", icon: Package },
  { name: "Invoices", href: "/protected/invoices", icon: Receipt },
  { name: "Analytics", href: "/protected/analytics", icon: BarChart3 },
  { name: "Staff & Payroll", href: "/protected/staff", icon: UserCog },
]

const settingsItems = [
  { name: "General Settings", href: "/protected/settings?tab=general" },
  { name: "Outlets", href: "/protected/settings?tab=outlets" },
  { name: "Time Slots", href: "/protected/settings?tab=slots" },
  { name: "Users & Roles", href: "/protected/settings?tab=users" },
  { name: "Templates", href: "/protected/settings?tab=notifications" },
  { name: "Policies", href: "/protected/settings?tab=policies" },
]

export function CRMSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { activeBrand } = useBrand()
  const [settingsOpen, setSettingsOpen] = useState(pathname.startsWith("/protected/settings"))
  const [searchValue, setSearchValue] = useState("")
  const [role, setRole] = useState("admin")

  useEffect(() => {
    getCurrentUserRole().then(({ role }) => setRole(role)).catch(() => {})
  }, [])

  const visibleSidebarItems = sidebarItems.filter((item) => canAccessRoute(role, item.href))

  const runSearch = () => {
    if (!searchValue.trim()) return
    router.push(`/protected/customers?search=${encodeURIComponent(searchValue.trim())}`)
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/protected" className="flex items-center gap-3">
          <Coffee className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold text-primary tracking-tight">{activeBrand.logoText}</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {visibleSidebarItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === "/protected/dashboard" && pathname === "/protected")
          return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        )})}

        {/* Settings with submenu - admin only */}
        {role === "admin" && (
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4" />
              Settings
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", settingsOpen && "rotate-180")} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 pt-1 space-y-1">
            {settingsItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.name}
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>
        )}
      </nav>

      <div className="border-t p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search customers…"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runSearch()}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
    </div>
  )

  return (
    <aside className="hidden w-64 border-r md:block">
      <SidebarContent />
    </aside>
  )
}
