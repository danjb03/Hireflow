import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Users, FileText, CheckCircle, Clock, AlertCircle, PlusCircle, ArrowRight } from "lucide-react";
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
        return <Badge variant="outline" className="border-transparent bg-[#34B192] text-white">Approved</Badge>;
      case "Needs Work":
        return <Badge variant="outline" className="border-transparent bg-[#F2B84B] text-white">Needs Work</Badge>;
      case "Rejected":
        return <Badge variant="outline" className="border-transparent bg-[#D64545] text-white">Rejected</Badge>;
      case "In Progress":
        return <Badge variant="outline" className="border-transparent bg-[#64748B] text-white">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="border-transparent bg-[#3B82F6] text-white">New</Badge>;
    }
  };

  if (isLoading) {
    return (
      <RepLayout userEmail={user?.email}>
        <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
          <div className="space-y-2">
            <div className="h-7 w-40 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-8 w-72 bg-muted/60 rounded animate-pulse" />
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
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Welcome Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
            <span className="size-2 rounded-full bg-[#34B192]" />
            Rep dashboard
          </div>
          <h1 className="text-3xl font-semibold text-[#222121]">
            Welcome back{repName ? `, ${repName}` : ""}.
          </h1>
          <p className="text-sm text-[#222121]/60">
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
          <Button
            onClick={() => navigate("/rep/submit-lead")}
            variant="ghost"
            className="h-11 rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Submit New Lead
          </Button>
          <Button
            onClick={() => navigate("/rep-report")}
            variant="outline"
            className="h-11 rounded-full border-[#222121]/20 bg-white px-5 text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
          >
            <FileText className="h-4 w-4 mr-2" />
            Submit Daily Report
          </Button>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 stagger-children">
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <Users className="h-5 w-5 text-[#34B192]" />
              </div>
              <div className="text-3xl font-semibold tabular-nums text-[#222121]">{stats.totalLeads}</div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Total Leads</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <CheckCircle className="h-5 w-5 text-[#34B192]" />
              </div>
              <div className="text-3xl font-semibold tabular-nums text-[#222121]">{stats.approvedLeads}</div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Approved</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <Clock className="h-5 w-5 text-[#34B192]" />
              </div>
              <div className="text-3xl font-semibold tabular-nums text-[#222121]">{stats.pendingLeads}</div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Pending</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <AlertCircle className="h-5 w-5 text-[#34B192]" />
              </div>
              <div className="text-3xl font-semibold tabular-nums text-[#222121]">{stats.needsWorkLeads}</div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Needs Work</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Reports Summary */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#34B192]" />
                <CardTitle className="text-lg font-semibold text-[#222121]">Reports This Week</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/rep/reports")} className="text-xs text-[#222121]/60 hover:text-[#222121]">
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-semibold text-[#34B192]">{stats.recentReportsCount}</div>
              <div>
                <p className="text-sm font-medium text-[#222121]">reports submitted</p>
                <p className="text-xs text-[#222121]/60">in the last 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Leads */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-[#222121]">Recent Leads</CardTitle>
              {recentLeads.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/rep/leads")}
                  className="text-xs text-[#222121]/60 hover:text-[#222121]"
                >
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-[#222121]/20 bg-[#F7F7F7]">
                <Users className="h-10 w-10 mx-auto mb-3 text-[#222121]/30" />
                <p className="text-sm font-medium text-[#222121] mb-1">No leads yet</p>
                <p className="text-xs text-[#222121]/60">Submit your first lead to get started</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 h-9 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
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
                    className="flex items-center justify-between rounded-xl border border-[#222121]/10 bg-white p-3 transition-all duration-200 group hover:border-[#34B192]/40 hover:bg-[#F7F7F7]"
                    onClick={() => navigate(`/rep/leads/${lead.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[#222121]">{lead.companyName}</p>
                      <p className="mt-0.5 text-xs text-[#222121]/60">
                        {lead.clientName} - {formatDate(lead.dateAdded)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {getStatusBadge(lead.status)}
                      <ArrowRight className="h-3.5 w-3.5 text-[#222121]/40 transition-colors group-hover:text-[#222121]" />
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
