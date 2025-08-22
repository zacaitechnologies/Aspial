"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSession } from "../contexts/SessionProvider";
import {
  Settings,
  Bell,
  HelpCircle,
  Calendar,
  CalendarClockIcon,
  Wrench,
  Receipt,
  Briefcase,
  Clock,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAllPendingInvitations, isUserAdmin } from "../projects/permissions";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const mainNavItems = [
  {
    title: "Project Management",
    url: "/projects",
    icon: Briefcase,
  },
  {
    title: "Services",
    url: "/services",
    icon: Wrench,
  },
  {
    title: "Quotations",
    url: "/quotations",
    icon: Receipt,
  },
  {
    title: "Equipment Bookings",
    url: "/equipment-bookings",
    icon: CalendarClockIcon,
  },
  {
    title: "Time Tracking",
    url: "/time-tracking",
    icon: Clock,
  },
  {
    title: "Calander",
    url: "/calander",
    icon: Calendar,
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { enhancedUser } = useSession();
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchPendingInvitations = async () => {
      if (!enhancedUser?.id) return;

      try {
        const adminStatus = await isUserAdmin(enhancedUser.id);
        setIsAdmin(adminStatus);

        if (adminStatus) {
          const pendingInvitations = await getAllPendingInvitations();
          setPendingInvitationsCount(pendingInvitations.length);
        }
      } catch (error) {
        console.error("Failed to fetch pending invitations:", error);
      }
    };

    fetchPendingInvitations();
  }, [enhancedUser?.id]);

  return (
    <Sidebar className="border-r border-[var(--color-sidebar-border)] bg-[#f0e8d8]">
      <SidebarHeader className="p-0 bg-[#f0e8d8]">
        <div className="flex items-center w-full h-18 px-4 pt-0 pb-0">
          {" "}
          {/* px-4 to match nav items */}
          <div className="flex-shrink-0">
            {" "}
            {/* Prevent logo from shrinking */}
            <Image
              src="/images/logoPng.png"
              alt="ASPIAL Logo"
              width={160} // Reasonable width for sidebar
              height={50} // Reasonable height
              className="h-10 w-auto" // Fixed height, auto width
              priority
              style={{ objectFit: "contain", objectPosition: "left center" }}
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden bg-[#f0e8d8]">
        <div className="mx-2 my-0 border-t border-[var(--color-accent)]" />
        <SidebarGroup className="pt-0">
          <SidebarGroupLabel className="text-slate-600 font-medium">
            CRM
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname.includes(item.url.replace('/', ''));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="transition-all duration-150 ease-out hover:bg-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-r-2 data-[active=true]:border-sidebar-border"
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* <div className="mx-2 my-0 border-t border-[var(--color-accent)]" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-600 font-medium">
            Business Intelligence
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="transition-all duration-150 ease-out hover:bg-brand-light"
                  >
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup> */}
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-200 overflow-hidden bg-[#f0e8d8]">
        <div className="mx-0 my-0 border-t border-[var(--color-accent)]" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-sidebar-ring">
              <Link href="/notification" className="flex items-center gap-3 relative">
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
                {isAdmin && pendingInvitationsCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {pendingInvitationsCount > 99 ? '99+' : pendingInvitationsCount}
                  </Badge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-sidebar-ring">
              <Link href="#" className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5" />
                <span>Help & Support</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-sidebar-ring">
              <Link href="#" className="flex items-center gap-3">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
