"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSession } from "../contexts/SessionProvider";
import {
  Settings,
  Bell,
  Calendar,
  CalendarClockIcon,
  Wrench,
  Receipt,
  Briefcase,
  Clock,
  Users,
  Gift,
  Shield,
  ChevronDown,
  ChevronRight,
  FileText,
  Wallet,
  FileCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAllPendingInvitations, getUserInvitations } from "../projects/permissions";
import { checkIsAdmin, checkIsOperationUser } from "../actions/admin-actions";

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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
    title: "Appointment Bookings",
    url: "/appointment-bookings",
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
  {
    title: "Benefits",
    url: "/benefits",
    icon: Gift,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { enhancedUser } = useSession();
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOperationUser, setIsOperationUser] = useState<boolean | null>(null);
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(
    pathname.includes("/quotations") || pathname.includes("/invoices") || pathname.includes("/receipts")
  );

  useEffect(() => {
    const fetchPendingInvitations = async () => {
      if (!enhancedUser?.id) return;

      try {
        const [adminStatus, operationUserStatus] = await Promise.all([
          checkIsAdmin(enhancedUser.id),
          checkIsOperationUser(enhancedUser.id)
        ]);
        
        setIsAdmin(adminStatus);
        setIsOperationUser(operationUserStatus);

        if (adminStatus) {
          // For admins: get all pending invitations
          const pendingInvitations = await getAllPendingInvitations();
          setPendingInvitationsCount(pendingInvitations.length);
        } else {
          // For regular users: get their own pending invitations
          const userInvitations = await getUserInvitations(enhancedUser.id);
          const pendingCount = userInvitations.filter(inv => inv.status === "pending").length;
          setPendingInvitationsCount(pendingCount);
        }
      } catch (error) {
        console.error("Failed to fetch pending invitations:", error);
        setPendingInvitationsCount(0);
      }
    };

    fetchPendingInvitations();
    
    // Refresh count periodically (every 30 seconds)
    const interval = setInterval(fetchPendingInvitations, 30000);
    
    return () => clearInterval(interval);
  }, [enhancedUser?.id]);

  return (
    <Sidebar className="border-r border-(--color-sidebar-border) bg-[#f0e8d8]">
      <SidebarHeader className="p-0 bg-[#f0e8d8]">
        <div className="flex items-center w-full h-18 px-4 pt-0 pb-0">
          {" "}
          {/* px-4 to match nav items */}
          <div className="shrink-0">
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
        <div className="mx-2 my-0 border-t border-(--color-accent)" />
        <SidebarGroup className="pt-0">
          <SidebarGroupLabel className="text-slate-600 font-medium">
            CRM
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems
                .filter((item) => {
                  // Operation users can only see: Projects, Appointment Bookings, Time Tracking, Calendar (no Benefits)
                  const allowedUrlsForOperationUser = ["/projects", "/appointment-bookings", "/time-tracking", "/calander"];
                  
                  // If role check is still in progress, show only allowed items (safer default)
                  if (isOperationUser === null) {
                    return allowedUrlsForOperationUser.includes(item.url);
                  }
                  
                  // If user is operation-user, only show allowed items (Benefits excluded)
                  if (isOperationUser) {
                    return allowedUrlsForOperationUser.includes(item.url);
                  }
                  
                  // Show all items for admin and brand-advisor
                  return true;
                })
                .map((item) => {
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
              
              {/* Payments Collapsible Section - Hidden for operation-user */}
              {isOperationUser !== null && !isOperationUser && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setIsPaymentsOpen(!isPaymentsOpen)}
                  isActive={pathname.includes("/quotations") || pathname.includes("/invoices") || pathname.includes("/receipts")}
                  className="transition-all duration-150 ease-out hover:bg-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-r-2 data-[active=true]:border-sidebar-border"
                >
                  <div className="flex items-center gap-3 w-full justify-between">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-5 h-5" />
                      <span className="font-medium">Payments</span>
                    </div>
                    <div className={`transition-transform duration-300 ease-in-out ${isPaymentsOpen ? 'rotate-0' : '-rotate-90'}`}>
                      {isPaymentsOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </div>
                </SidebarMenuButton>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isPaymentsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <SidebarMenuSub className="mt-1">
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.includes("/quotations") && !pathname.includes("/invoices") && !pathname.includes("/receipts")}
                      >
                        <Link 
                          href="/quotations" 
                          className={`flex items-center gap-2 ${
                            pathname.includes("/quotations") && !pathname.includes("/invoices") && !pathname.includes("/receipts")
                              ? ''
                              : '[&>svg]:!text-[#202F21]'
                          }`}
                        >
                          <FileText className="w-4 h-4 transition-colors" />
                          <span>Quotations</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.includes("/invoices")}
                      >
                        <Link 
                          href="/invoices" 
                          className={`flex items-center gap-2 ${
                            pathname.includes("/invoices")
                              ? ''
                              : '[&>svg]:!text-[#202F21]'
                          }`}
                        >
                          <FileCheck className="w-4 h-4 transition-colors" />
                          <span>Invoices</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname.includes("/receipts")}
                      >
                        <Link 
                          href="/receipts" 
                          className={`flex items-center gap-2 ${
                            pathname.includes("/receipts")
                              ? ''
                              : '[&>svg]:!text-[#202F21]'
                          }`}
                        >
                          <Wallet className="w-4 h-4 transition-colors" />
                          <span>Receipts</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </div>
              </SidebarMenuItem>
              )}
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

      <SidebarFooter className="border-t border-slate-200 overflow-visible bg-[#f0e8d8]">
        <div className="mx-0 my-0 border-t border-(--color-accent)" />
        <SidebarMenu>
          <SidebarMenuItem className="overflow-visible">
            <SidebarMenuButton 
              asChild 
              isActive={pathname === "/notification" || pathname.startsWith("/notification/")}
              className="transition-all duration-150 ease-out hover:bg-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-r-2 data-[active=true]:border-sidebar-border overflow-visible"
            >
              <Link href="/notification" className="flex items-center gap-3 relative overflow-visible w-full">
                <Bell className="w-5 h-5 shrink-0" />
                <span className="flex-1">Notifications</span>
                {pendingInvitationsCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-xs shrink-0"
                  >
                    {pendingInvitationsCount > 99 ? '99+' : pendingInvitationsCount}
                  </Badge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                isActive={pathname === "/user-management" || pathname.startsWith("/user-management/")}
                className="transition-all duration-150 ease-out hover:bg-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-r-2 data-[active=true]:border-sidebar-border"
              >
                <Link href="/user-management" className="flex items-center gap-3">
                  <Shield className="w-5 h-5" />
                  <span>User Management</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              isActive={pathname === "/settings" || pathname.startsWith("/settings/")}
              className="transition-all duration-150 ease-out hover:bg-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:border-r-2 data-[active=true]:border-sidebar-border"
            >
              <Link href="/settings" className="flex items-center gap-3">
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
