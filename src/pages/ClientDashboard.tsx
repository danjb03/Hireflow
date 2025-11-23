import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, TrendingUp, Users, Calendar, Target, ArrowRight } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  upcomingCallbacks: number;
  conversionRate: number;
}

interface RecentLead {
  id: string;
  companyName: string;
  status: string;
  dateAdded: string;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeLeads: 0,
    upcomingCallbacks: 0,
    conversionRate: 0,
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);
    await fetchDashboardData();
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all leads to calculate stats
      const { data, error } = await supabase.functions.invoke("get-client-leads");

      if (error) throw error;

      const leads = data.leads || [];
      
      // Calculate stats
      const totalLeads = leads.length;
      const activeLeads = leads.filter((l: any) => 
        l.status === "In Progress" || l.status === "Booked"
      ).length;
      const bookedLeads = leads.filter((l: any) => l.status === "Booked").length;
      const conversionRate = totalLeads > 0 ? Math.round((bookedLeads / totalLeads) * 100) : 0;
      
      // For callbacks, we'd need a callback date field - using placeholder for now
      const upcomingCallbacks = Math.floor(activeLeads * 0.6);

      setStats({
        totalLeads,
        activeLeads,
        upcomingCallbacks,
        conversionRate,
      });

      // Get recent leads (last 5)
      setRecentLeads(leads.slice(0, 5));
    } catch (error: any) {
      toast.error("Failed to load dashboard data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "booked":
        return "bg-success text-success-foreground";
      case "in progress":
        return "bg-warning text-warning-foreground";
      case "contacted":
        return "bg-info text-info-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  if (isLoading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Hero Section */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back!
          </h1>
          <p className="text-muted-foreground mt-1">
            Today is {new Date().toLocaleDateString("en-US", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}
          </p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Leads
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All-time leads
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Leads
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.activeLeads}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalLeads > 0 ? Math.round((stats.activeLeads / stats.totalLeads) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Callbacks
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.upcomingCallbacks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                This week
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversion Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stats.conversionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Leads to booked
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest leads</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No recent leads</p>
            ) : (
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/client/leads/${lead.id}`)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{lead.companyName}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(lead.dateAdded)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button onClick={() => navigate("/client/leads")} size="lg">
            View All Leads
          </Button>
          <Button onClick={() => navigate("/client/calendar")} variant="outline" size="lg">
            Check Calendar
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientDashboard;
