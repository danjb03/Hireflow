import { ReactNode } from "react";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  UserPlus,
  Package,
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
import { Separator } from "@/components/ui/separator";

interface AdminLayoutProps {
  children: ReactNode;
  userEmail?: string;
}

const AdminLayout = ({ children, userEmail }: AdminLayoutProps) => {
  const menuItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "All Leads", url: "/admin/leads", icon: FileText },
    { title: "Orders", url: "/admin/orders", icon: Package },
    { title: "Clients", url: "/admin/clients", icon: Users },
    { title: "Invite Client", url: "/admin/invite", icon: UserPlus },
  ];

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const userData = {
    name: "Admin",
    email: userEmail || "admin@example.com",
    initials: userEmail ? getInitials(userEmail) : "AD",
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild>
                  <a href="/admin" className="flex items-center gap-2">
                    <img src={hireflowLogo} alt="Hireflow" className="h-5" />
                    <span className="font-semibold">Hireflow</span>
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
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <div className="flex-1" />
          </header>
          <main className="px-4 lg:px-6 py-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
