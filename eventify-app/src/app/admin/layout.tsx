"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  UserCog,
  Store,
  UserCircle,
  Moon,
  Sun,
  Zap,
  LogOut,
  Star,
  MessageSquare,
  ClipboardList,
  FileText,
  MessageCircleQuestion,
} from "lucide-react";
import { getApiBase } from "@/lib/api-base";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/organizers", label: "Organizers", icon: UserCog },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/feedback", label: "Feedback", icon: MessageCircleQuestion },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/messages", label: "Messages", icon: MessageSquare },
  { href: "/admin/agreements", label: "Agreements", icon: ClipboardList },
  { href: "/admin/profile", label: "Profile", icon: UserCircle },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [overview, setOverview] = useState<{
    events?: { pending_organizer?: number };
    payments?: {
      pending_requests?: number;
      pending_organizer_requests?: number;
    };
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      router.replace("/login");
      return;
    }
    const token = localStorage.getItem("token")?.replace(/['"]+/g, "").trim();
    if (!token) return;
    fetch(`${getApiBase()}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok && r.json())
      .then((data) => data && setOverview(data))
      .catch(() => {});
  }, [router]);

  const pendingEvents = overview?.events?.pending_organizer ?? 0;
  const pendingRequests = overview?.payments?.pending_requests ?? 0;
  const pendingOrgRequests =
    overview?.payments?.pending_organizer_requests ?? 0;
  const pendingTotal = pendingEvents + pendingRequests + pendingOrgRequests;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    document.cookie =
      "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    document.cookie =
      "role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    router.push("/login");
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-svh w-full bg-background text-foreground">
        <Sidebar
          collapsible="icon"
          className="border-r border-sidebar-border transition-all duration-200"
        >
          <SidebarHeader className="border-b border-sidebar-border/50 p-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LayoutDashboard className="size-5" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
                <span className="text-base font-semibold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                  Eventify Admin
                </span>
                <span className="text-xs text-muted-foreground">
                  Platform controls
                </span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/admin" && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href}>
                            <Icon className="size-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border/50 p-2 group-data-[collapsible=icon]:p-2">
            <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {mounted ? (
                  theme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  )
                ) : (
                  <Sun className="size-4" />
                )}
              </Button>
              <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                Theme
              </span>
            </div>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex flex-1 items-center justify-between gap-4">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Admin
              </h1>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-border text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" />
                  Logout
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-border"
                    >
                      <Zap className="size-4" />
                      Quick actions
                      {pendingTotal > 0 && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                          {pendingTotal}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {pendingEvents > 0 && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/events?organizer_status=pending">
                          Pending event approvals ({pendingEvents})
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {pendingRequests > 0 && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/payments?tab=requests">
                          Pending vendor payment requests ({pendingRequests})
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {pendingOrgRequests > 0 && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin/payments?tab=organizer-requests">
                          Pending organizer payment requests (
                          {pendingOrgRequests})
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {pendingTotal === 0 && (
                      <DropdownMenuItem disabled>
                        No pending actions
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
