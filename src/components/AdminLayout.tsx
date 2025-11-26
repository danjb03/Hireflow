import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  UserPlus,
  LogOut,
  Search
} from "lucide-react";
import hireflowLogo from "@/assets/hireflow-light.svg";

interface AdminLayoutProps {
  children: ReactNode;
  userEmail?: string;
}

const AdminLayout = ({ children, userEmail }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
    { icon: FileText, label: "All Leads", path: "/admin/leads" },
    { icon: Users, label: "Clients", path: "/admin/clients" },
    { icon: UserPlus, label: "Invite Client", path: "/admin/invite" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r bg-card">
        {/* Logo */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <img src={hireflowLogo} alt="Hireflow" className="h-6" />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={`justify-start gap-3 ${
                isActive(item.path) 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-4 w-4" />
              <span className="text-sm">{item.label}</span>
            </Button>
          ))}
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 border-t p-4">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {userEmail ? getInitials(userEmail) : "AD"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{userEmail || "Admin"}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-56">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-6">
          <div className="flex-1 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="max-w-md border-0 bg-transparent focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {userEmail ? getInitials(userEmail) : "AD"}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
