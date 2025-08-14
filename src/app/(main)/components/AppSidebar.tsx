"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Building2,
  Settings,
  FileText,
  TrendingUp,
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
  SidebarSeparator,
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

const businessItems = [
  {
    title: "Growth",
    url: "#",
    icon: TrendingUp,
  },
  {
    title: "Company",
    url: "#",
    icon: Building2,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-slate-200 bg-card-background text-card-foreground">
      <SidebarHeader className="p-0 bg-card-background">
        <div className="flex items-center w-full h-16 px-4 pt-0 pb-0"> {/* px-4 to match nav items */}
          <div className="flex-shrink-0"> {/* Prevent logo from shrinking */}
            <Image
              src="/images/SidebarLogo.png"
              alt="ASPIAL Logo"
              width={160}  // Reasonable width for sidebar
              height={50}  // Reasonable height
              className="h-10 w-auto" // Fixed height, auto width
              priority
              style={{ objectFit: 'contain', objectPosition: 'left center' }}
            />
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-card-background">
        <SidebarGroup className="pt-0">
          <SidebarGroupLabel className="text-slate-600 font-medium">
            CRM
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="transition-all duration-150 ease-out hover:bg-brand-light data-[active=true]:bg-brand-light data-[active=true]:text-brand data-[active=true]:border-r-2 data-[active=true]:border-brand"
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

        <SidebarSeparator className="my-4" />

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
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-slate-200 bg-card-background">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-brand-light">
              <Link href="/notification" className="flex items-center gap-3">
                <Bell className="w-5 h-5" />
                <span>Notifications</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-brand-light">
              <Link href="#" className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5" />
                <span>Help & Support</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-brand-light">
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
