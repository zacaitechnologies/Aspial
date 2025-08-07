"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession } from "../contexts/SessionProvider"
import { signout } from "@/lib/auth-actions"

export function AppHeader() {
    const { enhancedUser } = useSession();
    const pathname = usePathname();
    
    // Get page title based on current path
    const getPageTitle = () => {
      const navItems = [
        { path: "/service", title: "Services" },
        { path: "/quotations", title: "Quotations" },
        { path: "/projects", title: "Projects" },
        { path: "/equipment-bookings", title: "Equipment Bookings" },
        { path: "/calander", title: "Calendar" },
        { path: "/time-tracking", title: "Time Tracking" },
      ];
      
      const currentItem = navItems.find(item => pathname === item.path);
      return currentItem?.title || "Dashboard";
    };

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="hover:bg-slate-100" />
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-card">{getPageTitle()}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 transition-colors duration-150">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-slate-100">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
                  <AvatarFallback className="bg-blue-600 text-white">JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{enhancedUser.profile?.firstName} {enhancedUser.profile?.lastName}</p>
                  <p className="text-xs leading-none text-slate-500">{enhancedUser.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Billing</DropdownMenuItem>
              <DropdownMenuItem>Team</DropdownMenuItem>
              <DropdownMenuItem>Subscription</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signout}>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
