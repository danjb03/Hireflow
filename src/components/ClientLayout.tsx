import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

interface ClientLayoutProps {
  children: ReactNode;
  userEmail?: string;
}

const ClientLayout = ({ children, userEmail }: ClientLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      // Skip onboarding check if already on onboarding page
      if (location.pathname.includes('/onboarding')) {
        setCheckingOnboarding(false);
        return;
      }

      // Check onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .single();

      // If onboarding not completed and not already on onboarding page, redirect
      if (!profile?.onboarding_completed) {
        navigate('/onboarding');
        return;
      }

      setCheckingOnboarding(false);
    };

    checkOnboarding();
  }, [navigate, location.pathname]);

  if (checkingOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
      </div>
    );
  }
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
                <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
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

export default ClientLayout;
