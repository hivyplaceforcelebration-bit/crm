"use client"

import type { User } from "@supabase/supabase-js"
import { Button } from "@/components/ui/button"
import { Coffee, LogOut, Building } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useBrand, type ActiveCity } from "@/hooks/use-brand"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function DashboardHeader({ user }: { user: User }) {
  const router = useRouter()
  const { activeCity, activeBrand, setActiveCity } = useBrand()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const initials = user.email
    ?.split("@")[0]
    .split(".")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="sticky top-0 z-50 border-b bg-card/85 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-8 gap-4">
        {/* Dynamic Logo/Brand Text */}
        <div className="flex items-center gap-2">
          <Coffee className="h-5.5 w-5.5 text-primary" />
          <span className="font-bold text-primary tracking-tight text-sm sm:text-base">
            {activeBrand.logoText}
          </span>
        </div>

        {/* Spacer on desktop, center-right content on mobile */}
        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3">
          {/* Global City Switcher */}
          <Select value={activeCity} onValueChange={(val) => setActiveCity(val as ActiveCity)}>
            <SelectTrigger className="w-[110px] sm:w-[140px] h-9 text-xs sm:text-sm bg-background border-muted-foreground/20">
              <Building className="h-3.5 w-3.5 mr-1.5 sm:mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              <SelectItem value="Surat">Surat (HIVY)</SelectItem>
              <SelectItem value="Vadodara">Vadodara (FFC)</SelectItem>
            </SelectContent>
          </Select>

          {/* User Profile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm font-semibold">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Account</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
