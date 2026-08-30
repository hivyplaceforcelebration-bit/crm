"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  UserPlus,
  ClipboardList,
  Users,
  Menu,
  Coffee,
  ChevronRight,
  Settings,
  Receipt,
  MessageCircle,
  BarChart3,
  UserCog
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useBrand } from "@/hooks/use-brand"

const bottomTabs = [
  { name: "Home", href: "/protected/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/protected/leads", icon: UserPlus },
  { name: "Bookings", href: "/protected/bookings", icon: ClipboardList },
  { name: "Customers", href: "/protected/customers", icon: Users },
]

const moreItems = [
  { name: "Packages", href: "/protected/packages", icon: Coffee },
  { name: "Invoices", href: "/protected/invoices", icon: Receipt },
  { name: "Marketing", href: "/protected/marketing", icon: MessageCircle },
  { name: "Analytics", href: "/protected/analytics", icon: BarChart3 },
  { name: "Staff & Payroll", href: "/protected/staff", icon: UserCog },
  { name: "Settings", href: "/protected/settings", icon: Settings },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const { activeBrand } = useBrand()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/90 backdrop-blur-lg px-2 pb-safe-bottom md:hidden shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.15)]">
      <div className="flex h-16 items-center justify-around">
        {bottomTabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href === "/protected/dashboard" && pathname === "/protected")
          const Icon = tab.icon

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all relative",
                isActive ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-5.5 w-5.5" />
              <span className="text-[10px] font-semibold tracking-wide">{tab.name}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          )
        })}

        {/* More Tab trigger opening Sheet */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all",
                isOpen ? "text-primary scale-105" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Menu className="h-5.5 w-5.5" />
              <span className="text-[10px] font-semibold tracking-wide">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] p-0 overflow-y-auto">
            <SheetHeader className="border-b p-5 flex-row items-center gap-3 space-y-0">
              <Coffee className="h-6 w-6 text-primary animate-pulse" />
              <SheetTitle className="text-lg font-bold tracking-tight text-primary">
                {activeBrand.logoText} Menu
              </SheetTitle>
            </SheetHeader>
            <div className="p-4 space-y-2 pb-8">
              <p className="text-xs font-semibold text-muted-foreground px-3 uppercase tracking-wider mb-2">
                Secondary Pages
              </p>
              <div className="grid grid-cols-1 gap-1">
                {moreItems.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  const Icon = item.icon

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}
