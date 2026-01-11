import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, TrendingUp, Users, FileText, CheckCircle, Clock, AlertCircle, PlusCircle, ArrowRight } from "lucide-react";
import RepLayout from "@/components/RepLayout";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";

interface DashboardStats {
  totalLeads: number;
  approvedLeads: number;
  pendingLeads: number;
  needsWorkLeads: number;
  recentReportsCount: number;
}

interface RecentLead {
  id: string;
  companyName: string;
  status: string;
  clientName: string;
  dateAdded: string;
}

const RepDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    approvedLeads: 0,
    pendingLeads: 0,
    needsWorkLeads: 0,
    recentReportsCount: 0,
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [repName, setRepName] = useState<string>("");

  useEffect(() => {
    loadDashboardData();
  }, [navigate]);

  const loadDashboardData = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);

    // Get rep profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_name, airtable_rep_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.client_name) {
      setRepName(profile.client_name);
    }

    // Fetch leads for this rep
    try {
      const { data, error } = await supabase.functions.invoke("get-rep-leads");

      if (error) {
        console.error("Error fetching leads:", error);
        toast.error("Failed to load leads");
      } else if (data?.leads) {
        const leads = data.leads;

        // Calculate stats
        const totalLeads = leads.length;
        const approvedLeads = leads.filter((l: any) => l.status === "Approved").length;
        const pendingLeads = leads.filter((l: any) => l.status === "New" || l.status === "In Progress").length;
        const needsWorkLeads = leads.filter((l: any) => l.status === "Needs Work").length;

        setStats({
          totalLeads,
          approvedLeads,
          pendingLeads,
          needsWorkLeads,
          recentReportsCount: 0, // Will be updated when we fetch reports
        });

        // Get recent leads (last 5)
        setRecentLeads(leads.slice(0, 5).map((lead: any) => ({
          id: lead.id,
          companyName: lead.companyName || "Unknown",
          status: lead.status || "New",
          clientName: lead.clientName || "Unknown Client",
          dateAdded: lead.dateAdded || new Date().toISOString(),
        })));
      }
    } catch (error) {
      console.error("Error:", error);
    }

    // Fetch recent reports count
    try {
      const { data, error } = await supabase.functions.invoke("get-my-reports");
      if (!error && data?.reports) {
        // Count reports from last 7 days
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const recentReports = data.reports.filter((r: any) =>
          new Date(r.report_date) >= weekAgo
        ).length;
        setStats(prev => ({ ...prev, recentReportsCount: recentReports }));
      }
    } catch (error) {
      console.error("Error fetching reports:", error);
    }

    setIsLoading(false);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
      case "Needs Work":
        return <Badge className="bg-amber-100 text-amber-700">Needs Work</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      case "In Progress":
        return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700">New</Badge>;
    }
  };

  if (isLoading) {
    return (
      <RepLayout userEmail={user?.email}>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="space-y-1">
            <div className="h-8 w-64 bg-muted/60 rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted/60 rounded animate-pulse" />
          </div>
          <SkeletonStats />
          <SkeletonTable rows={3} />
        </div>
      </RepLayout>
    );
  }

  return (
    <RepLayout userEmail={user?.email}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Welcome Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Welcome back{repName ? `, ${repName}` : ''}!
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

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate("/rep/submit-lead")} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
            <PlusCircle className="h-4 w-4 mr-2" />
            Submit New Lead
          </Button>
          <Button onClick={() => navigate("/rep-report")} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Submit Daily Report
          </Button>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 stagger-children">
          <Card hover="lift">
            <CardContent className="p-5 relative">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Leads</p>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground">{stats.totalLeads}</div>
              </div>
            </CardContent>
          </Card>

          <Card hover="lift">
            <CardContent className="p-5 relative">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approved</p>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground">{stats.approvedLeads}</div>
              </div>
            </CardContent>
          </Card>

          <Card hover="lift">
            <CardContent className="p-5 relative">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground">{stats.pendingLeads}</div>
              </div>
            </CardContent>
          </Card>

          <Card hover="lift">
            <CardContent className="p-5 relative">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-orange-500" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Needs Work</p>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground">{stats.needsWorkLeads}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports Summary */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg font-semibold">Reports This Week</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/rep/reports")} className="text-xs">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-blue-600">{stats.recentReportsCount}</div>
              <div>
                <p className="text-sm font-medium">reports submitted</p>
                <p className="text-xs text-muted-foreground">in the last 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Leads</CardTitle>
              {recentLeads.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/rep/leads")}
                  className="text-xs"
                >
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground mb-1">No leads yet</p>
                <p className="text-xs text-muted-foreground">Submit your first lead to get started</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate("/rep/submit-lead")}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Submit Lead
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 hover:border-accent cursor-pointer transition-all duration-200 group"
                    onClick={() => navigate(`/rep/leads/${lead.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{lead.companyName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {lead.clientName} - {formatDate(lead.dateAdded)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {getStatusBadge(lead.status)}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RepLayout>
  );
};

export default RepDashboard;
