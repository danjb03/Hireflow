import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Users, FileText, UserPlus, ArrowLeft, PlusCircle, BarChart } from "lucide-react";
import hireflowLogo from "@/assets/hireflow-light.svg";

interface Stats {
  totalClients: number;
  totalLeads: number;
  statusBreakdown: {
    Approved: number;
    Rejected: number;
    'Needs Work': number;
    Unknown: number;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ 
    totalClients: 0, 
    totalLeads: 0, 
    statusBreakdown: {
      Approved: 0,
      Rejected: 0,
      'Needs Work': 0,
      Unknown: 0,
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAdminAndLoadStats();
  }, []);

  const checkAdminAndLoadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = roles?.some(r => r.role === "admin");
      
      if (!isAdmin) {
        toast.error("Access denied - Admin only");
        navigate("/dashboard");
        return;
      }

      // Load stats
      await loadStats();
    } catch (error: any) {
      toast.error("Failed to load admin dashboard");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-system-stats");

      if (error) throw error;

      setStats(data);
    } catch (error: any) {
      console.error("Error loading stats:", error);
      toast.error("Failed to load stats");
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Approved: "bg-green-500/10 text-green-500 border-green-500/20",
      Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
      'Needs Work': "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      Unknown: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <header className="border-b bg-card transition-all">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <img src={hireflowLogo} alt="Hireflow" className="h-8 transition-transform hover:scale-105" />
            <div>
              <h1 className="text-xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage clients and system</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <Card className="transition-all hover:shadow-lg hover:scale-[1.02] duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalClients}</div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-lg hover:scale-[1.02] duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">Across all clients</p>
            </CardContent>
          </Card>
        </div>

        {/* Stage Breakdown */}
        <Card className="mb-6 transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle>Leads by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2 transition-all hover:scale-105">
                  <Badge className={getStatusColor(status)}>{status}</Badge>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-border" onClick={() => navigate("/admin/submit-lead")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                Submit Lead
              </CardTitle>
              <CardDescription>Add new lead to system</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full transition-all hover:scale-105">
                Submit New Lead
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-border" onClick={() => navigate("/admin/leads")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                All Leads
              </CardTitle>
              <CardDescription>View all leads</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full transition-all hover:scale-105">
                View All Leads
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-border" onClick={() => navigate("/admin/clients")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Manage Clients
              </CardTitle>
              <CardDescription>View and manage clients</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full transition-all hover:scale-105">
                View Clients
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-border" onClick={() => navigate("/admin/invite")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Invite Client
              </CardTitle>
              <CardDescription>Send invitation</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full transition-all hover:scale-105">
                Invite New Client
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
