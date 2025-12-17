import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  Users,
  Target,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BarChart3,
  RefreshCw
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface LeadStats {
  total: number;
  new: number;
  approved: number;
  needsWork: number;
  rejected: number;
  booked: number;
  approvalRate: number;
  feedbackCount: number;
  recentFeedback: string | null;
}

interface ClientWithSentiment {
  clientName: string;
  stats: LeadStats;
  sentiment: 'excellent' | 'good' | 'warning' | 'critical';
}

// Fetch function for React Query
const fetchSentimentData = async (): Promise<Record<string, LeadStats>> => {
  const { data, error } = await supabase.functions.invoke("get-client-sentiment");
  if (error) throw error;
  return data?.sentiment || {};
};

const AdminSentiment = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Use React Query with 5 minute cache
  const { data: sentimentData = {}, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['client-sentiment'],
    queryFn: fetchSentimentData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: !isAuthChecking, // Only fetch after auth check
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      setUserEmail(session.user.email || "");

      const { data: isAdmin } = await supabase.rpc("is_admin", {
        _user_id: session.user.id,
      });

      if (!isAdmin) {
        navigate("/dashboard");
        return;
      }

      setIsAuthChecking(false);
    } catch (error: any) {
      toast.error("Failed to load data");
      navigate("/admin");
    }
  };

  const getSentimentLevel = (stats: LeadStats): 'excellent' | 'good' | 'warning' | 'critical' => {
    if (stats.total === 0) return 'good';
    if (stats.approvalRate >= 70) return 'excellent';
    if (stats.approvalRate >= 50) return 'good';
    if (stats.approvalRate >= 30) return 'warning';
    return 'critical';
  };

  const clientsWithSentiment: ClientWithSentiment[] = useMemo(() => {
    return Object.entries(sentimentData).map(([clientName, stats]) => ({
      clientName,
      stats,
      sentiment: getSentimentLevel(stats),
    })).sort((a, b) => b.stats.total - a.stats.total);
  }, [sentimentData]);

  const totals = useMemo(() => {
    return Object.values(sentimentData).reduce(
      (acc, stats) => ({
        total: acc.total + stats.total,
        new: acc.new + stats.new,
        approved: acc.approved + stats.approved + stats.booked,
        needsWork: acc.needsWork + stats.needsWork,
        rejected: acc.rejected + stats.rejected,
        feedbackCount: acc.feedbackCount + stats.feedbackCount,
      }),
      { total: 0, new: 0, approved: 0, needsWork: 0, rejected: 0, feedbackCount: 0 }
    );
  }, [sentimentData]);

  const overallApprovalRate = useMemo(() => {
    const processed = totals.approved + totals.rejected;
    return processed > 0 ? Math.round((totals.approved / processed) * 100) : 0;
  }, [totals]);

  const clientsByPerformance = useMemo(() => {
    const excellent = clientsWithSentiment.filter(c => c.sentiment === 'excellent');
    const good = clientsWithSentiment.filter(c => c.sentiment === 'good');
    const warning = clientsWithSentiment.filter(c => c.sentiment === 'warning');
    const critical = clientsWithSentiment.filter(c => c.sentiment === 'critical');
    return { excellent, good, warning, critical };
  }, [clientsWithSentiment]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'excellent': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'good': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'warning': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'excellent': return <CheckCircle2 className="h-4 w-4" />;
      case 'good': return <ThumbsUp className="h-4 w-4" />;
      case 'warning': return <Clock className="h-4 w-4" />;
      case 'critical': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isAuthChecking || isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sentiment Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Track client engagement and lead performance across your portfolio
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Total Leads</span>
              </div>
              <p className="text-3xl font-bold">{totals.total}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-muted-foreground uppercase">New</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">{totals.new}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Approved</span>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{totals.approved}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Needs Work</span>
              </div>
              <p className="text-3xl font-bold text-yellow-600">{totals.needsWork}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsDown className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Rejected</span>
              </div>
              <p className="text-3xl font-bold text-red-500">{totals.rejected}</p>
            </CardContent>
          </Card>

          <Card className={`bg-gradient-to-br ${overallApprovalRate >= 70 ? 'from-emerald-50 to-emerald-100' : overallApprovalRate >= 40 ? 'from-yellow-50 to-yellow-100' : 'from-red-50 to-red-100'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase">Approval Rate</span>
              </div>
              <p className={`text-3xl font-bold ${overallApprovalRate >= 70 ? 'text-emerald-600' : overallApprovalRate >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                {overallApprovalRate}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-700">Excellent</p>
                  <p className="text-xs text-muted-foreground">70%+ approval</p>
                </div>
                <div className="text-3xl font-bold text-emerald-600">{clientsByPerformance.excellent.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Good</p>
                  <p className="text-xs text-muted-foreground">50-69% approval</p>
                </div>
                <div className="text-3xl font-bold text-blue-600">{clientsByPerformance.good.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Needs Attention</p>
                  <p className="text-xs text-muted-foreground">30-49% approval</p>
                </div>
                <div className="text-3xl font-bold text-yellow-600">{clientsByPerformance.warning.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700">Critical</p>
                  <p className="text-xs text-muted-foreground">&lt;30% approval</p>
                </div>
                <div className="text-3xl font-bold text-red-500">{clientsByPerformance.critical.length}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients Needing Attention */}
        {(clientsByPerformance.critical.length > 0 || clientsByPerformance.warning.length > 0) && (
          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Clients Needing Attention
              </CardTitle>
              <CardDescription>These clients have lower than expected approval rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...clientsByPerformance.critical, ...clientsByPerformance.warning].map((client) => (
                  <div
                    key={client.clientName}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate("/admin/clients")}
                  >
                    <div className="flex items-center gap-4">
                      <Badge className={`${getSentimentColor(client.sentiment)} border`}>
                        {getSentimentIcon(client.sentiment)}
                        <span className="ml-1 capitalize">{client.sentiment}</span>
                      </Badge>
                      <div>
                        <p className="font-medium">{client.clientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {client.stats.total} leads • {client.stats.feedbackCount} feedback
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${client.stats.approvalRate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                        {client.stats.approvalRate}%
                      </p>
                      <p className="text-xs text-muted-foreground">approval rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Clients Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Clients Performance
            </CardTitle>
            <CardDescription>Detailed breakdown of lead performance by client</CardDescription>
          </CardHeader>
          <CardContent>
            {clientsWithSentiment.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No client data available yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientsWithSentiment.map((client) => (
                  <div
                    key={client.clientName}
                    className="p-4 rounded-lg border hover:bg-accent/30 cursor-pointer transition-colors"
                    onClick={() => navigate("/admin/clients")}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={`${getSentimentColor(client.sentiment)} border`}>
                          {getSentimentIcon(client.sentiment)}
                          <span className="ml-1 capitalize">{client.sentiment}</span>
                        </Badge>
                        <span className="font-semibold">{client.clientName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">{client.stats.total} total leads</span>
                        <span className={`font-bold ${client.stats.approvalRate >= 70 ? 'text-emerald-600' : client.stats.approvalRate >= 40 ? 'text-yellow-600' : 'text-red-500'}`}>
                          {client.stats.approvalRate}% approval
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 text-center">
                      <div className="p-2 bg-blue-50 rounded">
                        <p className="text-lg font-semibold text-blue-600">{client.stats.new}</p>
                        <p className="text-xs text-muted-foreground">New</p>
                      </div>
                      <div className="p-2 bg-emerald-50 rounded">
                        <p className="text-lg font-semibold text-emerald-600">{client.stats.approved + client.stats.booked}</p>
                        <p className="text-xs text-muted-foreground">Approved</p>
                      </div>
                      <div className="p-2 bg-yellow-50 rounded">
                        <p className="text-lg font-semibold text-yellow-600">{client.stats.needsWork}</p>
                        <p className="text-xs text-muted-foreground">Needs Work</p>
                      </div>
                      <div className="p-2 bg-red-50 rounded">
                        <p className="text-lg font-semibold text-red-500">{client.stats.rejected}</p>
                        <p className="text-xs text-muted-foreground">Rejected</p>
                      </div>
                      <div className="p-2 bg-purple-50 rounded">
                        <p className="text-lg font-semibold text-purple-600">{client.stats.feedbackCount}</p>
                        <p className="text-xs text-muted-foreground">Feedback</p>
                      </div>
                    </div>

                    {/* Progress bar showing approval rate */}
                    <div className="mt-3">
                      <Progress
                        value={client.stats.approvalRate}
                        className={`h-2 ${client.stats.approvalRate >= 70 ? '[&>div]:bg-emerald-500' : client.stats.approvalRate >= 40 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'}`}
                      />
                    </div>

                    {/* Recent Feedback Preview */}
                    {client.stats.recentFeedback && (
                      <div className="mt-3 p-2 bg-muted/30 rounded text-sm">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          Recent Feedback
                        </p>
                        <p className="text-muted-foreground italic">"{client.stats.recentFeedback}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSentiment;
