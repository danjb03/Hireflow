import { ReactNode } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings,
} from "lucide-react";
import hireflowLogo from "@/assets/hireflow-light.svg";
import { NavMain } from "@/components/admin/NavMain";
import { NavUser } from "@/components/admin/NavUser";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface ClientLayoutProps {
  children: ReactNode;
  userEmail?: string;
}

const ClientLayout = ({ children, userEmail }: ClientLayoutProps) => {
  const menuItems = [
    { title: "Dashboard", url: "/client/dashboard", icon: LayoutDashboard },
    { title: "Leads", url: "/client/leads", icon: Users },
    { title: "Calendar", url: "/client/calendar", icon: Calendar },
    { title: "Settings", url: "/client/settings", icon: Settings },
  ];

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const userData = {
    name: "Client",
    email: userEmail || "client@example.com",
    initials: userEmail ? getInitials(userEmail) : "CL",
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <a href="/client/dashboard" className="flex items-center gap-2">
                    <img src={hireflowLogo} alt="Hireflow" className="h-5" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <NavMain items={menuItems} />
          </SidebarContent>
          <SidebarFooter>
            <NavUser user={userData} />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <main className="p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default ClientLayout;
