"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { usePathname, useRouter } from "next/navigation"
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
import { clearAllCachesOnLogout } from "@/lib/clear-all-cache"

export function AppHeader() {
    const { enhancedUser } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    // Prevent hydration mismatch by only rendering dropdown after mount
    useEffect(() => {
      setMounted(true);
    }, []);
    
    // Get page title based on current path
    const getPageTitle = () => {
      const navItems = [
        { path: "/services", title: "Services" },
        { path: "/quotations", title: "Quotations" },
        { path: "/projects", title: "Projects" },
        { path: "/equipment-bookings", title: "Equipment Bookings" },
        { path: "/calander", title: "Calendar" },
        { path: "/time-tracking", title: "Time Tracking" },
        { path: "/clients", title: "Clients" },
      ];
      
      const currentItem = navItems.find(item => pathname.includes(item.path.replace('/', '')));
      return currentItem?.title || "Dashboard";
    };

    // Get user initials
    const getInitials = () => {
      const firstName = enhancedUser?.profile?.firstName || "";
      const lastName = enhancedUser?.profile?.lastName || "";
      const firstInitial = firstName.charAt(0).toUpperCase() || "";
      const lastInitial = lastName.charAt(0).toUpperCase() || "";
      return firstInitial + lastInitial || "U";
    };

  return (
    <header className="border-b border-[var(--color-sidebar-border)] bg-sidebar px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="hover:bg-slate-100" />
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-sidebar-foreground">{getPageTitle()}</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 transition-colors duration-150">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </Button> */}

          {mounted ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-muted hover:cursor-pointer transition-colors">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={enhancedUser?.profile?.profilePicture || undefined} 
                      alt={`${enhancedUser?.profile?.firstName || ""} ${enhancedUser?.profile?.lastName || ""}`} 
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{enhancedUser?.profile?.firstName} {enhancedUser?.profile?.lastName}</p>
                    <p className="text-xs leading-none text-slate-500">{enhancedUser?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  clearAllCachesOnLogout()
                  signout()
                }}>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-muted">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
