import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  FileText,
  PlusCircle,
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

interface RepLayoutProps {
  children: ReactNode;
  userEmail?: string;
}

const RepLayout = ({ children, userEmail }: RepLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      // Verify user has rep role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      const isRep = roles?.some(r => r.role === 'rep');

      if (!isRep) {
        navigate("/login");
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const menuItems = [
    { title: "Dashboard", url: "/rep/dashboard", icon: LayoutDashboard },
    { title: "My Leads", url: "/rep/leads", icon: Users },
    { title: "My Reports", url: "/rep/reports", icon: FileText },
    { title: "Submit Lead", url: "/rep/submit-lead", icon: PlusCircle },
    { title: "Settings", url: "/rep/settings", icon: Settings },
  ];

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const userData = {
    name: "Sales Rep",
    email: userEmail || "rep@example.com",
    initials: userEmail ? getInitials(userEmail) : "SR",
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
                  <a href="/rep/dashboard" className="flex items-center gap-2">
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

export default RepLayout;
