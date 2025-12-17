import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, TrendingUp, Users, Calendar, Target, ArrowRight, FileText } from "lucide-react";
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
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeLeads: 0,
    upcomingCallbacks: 0,
    conversionRate: 0,
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);

  useEffect(() => {
    checkOnboarding();
  }, [navigate]);

  const checkOnboarding = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);

    // Fetch profile and leads data in parallel
    const [profileResult, leadsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .single(),
      supabase.functions.invoke("get-client-leads"),
    ]);

    // Check onboarding status
    if (!profileResult.data?.onboarding_completed) {
      navigate('/onboarding');
      return;
    }

    setCheckingOnboarding(false);

    // Process leads data
    if (leadsResult.error) {
      if (leadsResult.error.message?.includes('No Notion database configured')) {
        toast.error('Your account is not yet configured. Please contact your administrator to set up your Notion database.');
      } else {
        toast.error("Failed to load dashboard data: " + leadsResult.error.message);
      }
      setIsLoading(false);
      return;
    }

    const leads = leadsResult.data?.leads || [];

    // Calculate stats
    const totalLeads = leads.length;
    const activeLeads = leads.filter((l: any) =>
      l.status === "In Progress" || l.status === "Booked"
    ).length;
    const bookedLeads = leads.filter((l: any) => l.status === "Booked").length;
    const conversionRate = totalLeads > 0 ? Math.round((bookedLeads / totalLeads) * 100) : 0;
    const upcomingCallbacks = Math.floor(activeLeads * 0.6);

    setStats({
      totalLeads,
      activeLeads,
      upcomingCallbacks,
      conversionRate,
    });

    // Get recent leads (last 5)
    setRecentLeads(leads.slice(0, 5));
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "new":
        return "bg-blue-100 text-blue-700";
      case "approved":
      case "booked":
        return "bg-emerald-100 text-emerald-700";
      case "needs work":
      case "in progress":
        return "bg-yellow-100 text-yellow-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "contacted":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return "N/A";
    }
  };

  if (checkingOnboarding || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Welcome Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </h1>
          <p className="text-sm text-muted-foreground font-normal">
            {new Date().toLocaleDateString("en-US", { 
              weekday: "long", 
              year: "numeric", 
              month: "long", 
              day: "numeric" 
            })}
          </p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 relative">
              <div className="absolute top-3 right-3 opacity-40">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Leads</p>
                <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground">{stats.totalLeads}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 relative">
              <div className="absolute top-3 right-3 opacity-40">
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Leads</p>
                <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground">{stats.activeLeads}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 relative">
              <div className="absolute top-3 right-3 opacity-40">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming Callbacks</p>
                <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground">{stats.upcomingCallbacks}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 relative">
              <div className="absolute top-3 right-3 opacity-40">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversion Rate</p>
                <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground">{stats.conversionRate}%</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No recent leads</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/client/leads/${lead.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{lead.companyName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(lead.dateAdded)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {lead.status}
                      </Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate("/client/leads")} size="default" className="flex-1">
            View All Leads
          </Button>
          <Button onClick={() => navigate("/client/calendar")} variant="outline" size="default" className="flex-1">
            Check Calendar
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientDashboard;
