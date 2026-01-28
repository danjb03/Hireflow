import { ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  PoundSterling,
  ClipboardList,
  Mail,
  ListPlus,
  Building2,
  Store,
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
    { title: "Clients", url: "/admin/clients", icon: Building2 },
    { title: "Marketplace", url: "/admin/marketplace", icon: Store },
    { title: "Users", url: "/admin/users", icon: Users },
    { title: "P&L", url: "/admin/pnl", icon: PoundSterling },
    { title: "Reporting", url: "/admin/reporting", icon: ClipboardList },
    { title: "Sentiment", url: "/admin/sentiment", icon: BarChart3 },
    { title: "Email Settings", url: "/admin/email-settings", icon: Mail },
    { title: "List Builder", url: "/admin/list-builder", icon: ListPlus },
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
                <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
                  <a href="/admin" className="flex items-center gap-2">
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
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-[#222121]/10 bg-white px-4 lg:px-6">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <div className="flex-1" />
          </header>
          <main className="px-4 py-6 lg:px-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
