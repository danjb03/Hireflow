import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  RefreshCw,
  Brain,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  AlertCircle,
  Sparkles
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
  recentFeedbackLeadId: string | null;
  clientAirtableId: string | null;
}

interface ClientWithSentiment {
  clientName: string;
  stats: LeadStats;
  sentiment: 'excellent' | 'good' | 'warning' | 'critical';
}

interface HealthAnalysis {
  score: number;
  sentiment: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  summary: string;
  concerns: string[];
  positives: string[];
  recommendation: string;
}

interface ClientHealthResult {
  clientName: string;
  health: HealthAnalysis;
  feedbackCount: number;
  leadsAnalyzed: number;
  analyzedAt: string;
}

const AdminSentiment = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Sentiment data state
  const [sentimentData, setSentimentData] = useState<Record<string, LeadStats>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Health analysis state
  const [healthData, setHealthData] = useState<ClientHealthResult[]>([]);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [isHealthFetching, setIsHealthFetching] = useState(false);
  const [healthError, setHealthError] = useState<Error | null>(null);

  // Fetch sentiment data
  const fetchSentimentData = useCallback(async () => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-client-sentiment");
      if (error) throw error;
      setSentimentData(data?.sentiment || {});
    } catch (error) {
      toast.error("Failed to load sentiment data");
    } finally {
      setIsFetching(false);
      setIsLoading(false);
    }
  }, []);

  // Fetch health analysis (only on button click)
  const fetchHealthAnalysis = useCallback(async () => {
    setIsHealthFetching(true);
    setIsHealthLoading(true);
    setHealthError(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-client-health");
      if (error) throw error;
      setHealthData(data?.results || []);
    } catch (error) {
      setHealthError(error instanceof Error ? error : new Error("Failed to analyze health"));
    } finally {
      setIsHealthFetching(false);
      setIsHealthLoading(false);
    }
  }, []);

  const refetch = fetchSentimentData;
  const refetchHealth = fetchHealthAnalysis;

  useEffect(() => {
    checkAdmin();
  }, []);

  // Fetch sentiment data after auth check
  useEffect(() => {
    if (!isAuthChecking) {
      fetchSentimentData();
    }
  }, [isAuthChecking, fetchSentimentData]);

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
      case 'excellent': return 'bg-[#34B192] text-white';
      case 'good': return 'bg-[#34B192]/70 text-white';
      case 'warning': return 'bg-amber-500 text-white';
      case 'critical': return 'bg-red-500 text-white';
      default: return 'bg-[#222121]/30 text-white';
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

  const getHealthScoreColor = (score: number) => {
    if (score >= 8) return 'text-[#34B192] bg-[#34B192]/10 border-[#34B192]/20';
    if (score >= 6) return 'text-[#34B192] bg-[#34B192]/10 border-[#34B192]/20';
    if (score >= 4) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getHealthSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'very_positive': return { label: 'Very Happy', color: 'bg-[#34B192] text-white' };
      case 'positive': return { label: 'Happy', color: 'bg-[#34B192]/70 text-white' };
      case 'neutral': return { label: 'Neutral', color: 'bg-[#222121]/30 text-white' };
      case 'negative': return { label: 'Unhappy', color: 'bg-amber-500 text-white' };
      case 'very_negative': return { label: 'Very Unhappy', color: 'bg-red-500 text-white' };
      default: return { label: 'Unknown', color: 'bg-[#222121]/30 text-white' };
    }
  };

  if (isAuthChecking || isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="-mx-4 -my-6 flex min-h-[60vh] items-center justify-center bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              Sentiment tracking
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">
              <span className="text-[#222121]/40">Client health</span>{" "}
              <span className="text-[#222121]">at a glance.</span>
            </h1>
            <p className="text-sm text-[#222121]/60">
              AI-powered sentiment analysis and lead performance tracking.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchHealth()}
              disabled={isHealthFetching}
              className="h-9 rounded-full border border-[#222121]/10 bg-white px-4 text-xs font-semibold text-[#222121] hover:bg-[#34B192]/5"
            >
              <Brain className={`h-4 w-4 mr-2 ${isHealthFetching ? 'animate-pulse' : ''}`} />
              {isHealthFetching ? 'Analyzing...' : 'Run AI Analysis'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 rounded-full border border-[#222121]/10 bg-white px-4 text-xs font-semibold text-[#222121] hover:bg-[#34B192]/5"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing...' : 'Refresh Stats'}
            </Button>
          </div>
        </div>

        {/* AI Health Scores Section */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#222121]">
              <Sparkles className="h-5 w-5 text-[#34B192]" />
              AI Client Health Analysis
            </CardTitle>
            <CardDescription className="text-[#222121]/60">
              Real-time sentiment analysis of client feedback using AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthError ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                <p className="mb-2 text-[#222121]/60">Unable to load AI analysis</p>
                <p className="text-sm text-[#222121]/50">
                  {healthError instanceof Error && healthError.message.includes('ANTHROPIC_API_KEY')
                    ? 'Anthropic API key not configured. Add ANTHROPIC_API_KEY to Supabase secrets.'
                    : 'Click "Run AI Analysis" to try again.'}
                </p>
              </div>
            ) : isHealthLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-[#34B192]" />
                <p className="text-[#222121]/60">Analyzing client feedback with AI...</p>
              </div>
            ) : healthData.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-[#222121]/40" />
                <p className="text-[#222121]/60">No client feedback to analyze yet</p>
                <p className="text-sm text-[#222121]/50 mt-1">
                  Health scores will appear once clients provide feedback on leads
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {healthData.map((client) => {
                  const sentimentInfo = getHealthSentimentLabel(client.health.sentiment);
                  return (
                    <div
                      key={client.clientName}
                      className="rounded-2xl border border-[#222121]/10 bg-white p-4 transition-shadow hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {/* Health Score Badge */}
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center border-2 ${getHealthScoreColor(client.health.score)}`}>
                            <span className="text-2xl font-bold">{client.health.score}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#222121]">{client.clientName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className={`${sentimentInfo.color} border-transparent text-xs`}
                              >
                                {sentimentInfo.label}
                              </Badge>
                              <span className="text-xs text-[#222121]/50">
                                {client.feedbackCount} feedback analyzed
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right text-xs text-[#222121]/40">
                          Analyzed {new Date(client.analyzedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* AI Summary */}
                      <p className="mb-3 rounded-2xl border border-[#222121]/10 bg-[#F7F7F7] p-3 text-sm text-[#222121]/70">
                        "{client.health.summary}"
                      </p>

                      <div className="grid md:grid-cols-3 gap-3">
                        {/* Positives */}
                        {client.health.positives.length > 0 && (
                          <div className="rounded-2xl border border-[#222121]/10 bg-white p-3">
                            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-[#34B192]">
                              <TrendingUp className="h-3 w-3" />
                              Positives
                            </p>
                            <ul className="space-y-1">
                              {client.health.positives.map((positive, i) => (
                                <li key={i} className="text-xs text-[#222121]/70">• {positive}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Concerns */}
                        {client.health.concerns.length > 0 && (
                          <div className="rounded-2xl border border-[#222121]/10 bg-white p-3">
                            <p className="mb-2 flex items-center gap-1 text-xs font-medium text-red-600">
                              <TrendingDown className="h-3 w-3" />
                              Concerns
                            </p>
                            <ul className="space-y-1">
                              {client.health.concerns.map((concern, i) => (
                                <li key={i} className="text-xs text-[#222121]/70">• {concern}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendation */}
                        <div className="rounded-2xl border border-[#222121]/10 bg-white p-3">
                          <p className="mb-2 flex items-center gap-1 text-xs font-medium text-[#222121]">
                            <Lightbulb className="h-3 w-3" />
                            Recommendation
                          </p>
                          <p className="text-xs text-[#222121]/70">{client.health.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-[#222121]/50" />
                <span className="text-xs font-medium uppercase text-[#222121]/50">Total Leads</span>
              </div>
              <p className="text-3xl font-semibold text-[#222121]">{totals.total}</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-[#34B192]" />
                <span className="text-xs font-medium uppercase text-[#222121]/50">New</span>
              </div>
              <p className="text-3xl font-semibold text-[#222121]">{totals.new}</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="h-4 w-4 text-[#34B192]" />
                <span className="text-xs font-medium uppercase text-[#222121]/50">Approved</span>
              </div>
              <p className="text-3xl font-semibold text-[#222121]">{totals.approved}</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium uppercase text-[#222121]/50">Needs Work</span>
              </div>
              <p className="text-3xl font-semibold text-[#222121]">{totals.needsWork}</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsDown className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium uppercase text-[#222121]/50">Rejected</span>
              </div>
              <p className="text-3xl font-semibold text-[#222121]">{totals.rejected}</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-[#222121]/50" />
                <span className="text-xs font-medium uppercase text-[#222121]/50">Approval Rate</span>
              </div>
              <p className="text-3xl font-semibold text-[#222121]">
                {overallApprovalRate}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#222121]">Excellent</p>
                  <p className="text-xs text-[#222121]/50">70%+ approval</p>
                </div>
                <div className="text-3xl font-bold text-[#34B192]">{clientsByPerformance.excellent.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#222121]">Good</p>
                  <p className="text-xs text-[#222121]/50">50-69% approval</p>
                </div>
                <div className="text-3xl font-bold text-[#222121]">{clientsByPerformance.good.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#222121]">Needs Attention</p>
                  <p className="text-xs text-[#222121]/50">30-49% approval</p>
                </div>
                <div className="text-3xl font-bold text-amber-500">{clientsByPerformance.warning.length}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#222121]">Critical</p>
                  <p className="text-xs text-[#222121]/50">&lt;30% approval</p>
                </div>
                <div className="text-3xl font-bold text-red-500">{clientsByPerformance.critical.length}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clients Needing Attention */}
        {(clientsByPerformance.critical.length > 0 || clientsByPerformance.warning.length > 0) && (
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Clients Needing Attention
              </CardTitle>
              <CardDescription className="text-[#222121]/60">
                These clients have lower than expected approval rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...clientsByPerformance.critical, ...clientsByPerformance.warning].map((client) => (
                  <div
                    key={client.clientName}
                    className="flex items-center justify-between rounded-2xl border border-[#222121]/10 bg-white p-4 transition-colors hover:bg-[#34B192]/5 cursor-pointer"
                    onClick={() => {
                      if (client.stats.recentFeedbackLeadId) {
                        navigate(`/admin/leads/${client.stats.recentFeedbackLeadId}`);
                      } else if (client.stats.clientAirtableId) {
                        navigate(`/admin/clients/${client.stats.clientAirtableId}`);
                      } else {
                        navigate("/admin/clients");
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <Badge
                        variant="outline"
                        className={`${getSentimentColor(client.sentiment)} border-transparent`}
                      >
                        {getSentimentIcon(client.sentiment)}
                        <span className="ml-1 capitalize">{client.sentiment}</span>
                      </Badge>
                      <div>
                        <p className="font-medium text-[#222121]">{client.clientName}</p>
                        <p className="text-sm text-[#222121]/50">
                          {client.stats.total} leads • {client.stats.feedbackCount} feedback
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${client.stats.approvalRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                        {client.stats.approvalRate}%
                      </p>
                      <p className="text-xs text-[#222121]/50">approval rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Clients Performance */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#222121]">
              <Users className="h-5 w-5 text-[#34B192]" />
              All Clients Performance
            </CardTitle>
            <CardDescription className="text-[#222121]/60">Detailed breakdown of lead performance by client</CardDescription>
          </CardHeader>
          <CardContent>
            {clientsWithSentiment.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-[#222121]/40" />
                <p className="text-[#222121]/60">No client data available yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {clientsWithSentiment.map((client) => (
                  <div
                    key={client.clientName}
                    className="rounded-2xl border border-[#222121]/10 bg-white p-4 transition-colors hover:bg-[#34B192]/5 cursor-pointer"
                    onClick={() => {
                      if (client.stats.clientAirtableId) {
                        navigate(`/admin/clients/${client.stats.clientAirtableId}`);
                      } else {
                        navigate("/admin/clients");
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`${getSentimentColor(client.sentiment)} border-transparent`}
                        >
                          {getSentimentIcon(client.sentiment)}
                          <span className="ml-1 capitalize">{client.sentiment}</span>
                        </Badge>
                        <span className="font-semibold text-[#222121]">{client.clientName}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-[#222121]/50">{client.stats.total} total leads</span>
                        <span className={`font-bold ${client.stats.approvalRate >= 70 ? 'text-[#34B192]' : client.stats.approvalRate >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                          {client.stats.approvalRate}% approval
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-5 gap-4 text-center">
                      <div className="rounded-2xl border border-[#222121]/10 bg-white p-2">
                        <p className="text-lg font-semibold text-[#34B192]">{client.stats.new}</p>
                        <p className="text-xs text-[#222121]/50">New</p>
                      </div>
                      <div className="rounded-2xl border border-[#222121]/10 bg-white p-2">
                        <p className="text-lg font-semibold text-[#34B192]">{client.stats.approved + client.stats.booked}</p>
                        <p className="text-xs text-[#222121]/50">Approved</p>
                      </div>
                      <div className="rounded-2xl border border-[#222121]/10 bg-white p-2">
                        <p className="text-lg font-semibold text-amber-500">{client.stats.needsWork}</p>
                        <p className="text-xs text-[#222121]/50">Needs Work</p>
                      </div>
                      <div className="rounded-2xl border border-[#222121]/10 bg-white p-2">
                        <p className="text-lg font-semibold text-red-500">{client.stats.rejected}</p>
                        <p className="text-xs text-[#222121]/50">Rejected</p>
                      </div>
                      <div className="rounded-2xl border border-[#222121]/10 bg-white p-2">
                        <p className="text-lg font-semibold text-[#222121]">{client.stats.feedbackCount}</p>
                        <p className="text-xs text-[#222121]/50">Feedback</p>
                      </div>
                    </div>

                    {/* Progress bar showing approval rate */}
                    <div className="mt-3">
                      <Progress
                        value={client.stats.approvalRate}
                        className={`h-2 ${client.stats.approvalRate >= 70 ? '[&>div]:bg-[#34B192]' : client.stats.approvalRate >= 40 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
                      />
                    </div>

                    {/* Recent Feedback Preview */}
                    {client.stats.recentFeedback && (
                      <div className="mt-3 rounded-2xl border border-[#222121]/10 bg-[#F7F7F7] p-2 text-sm">
                        <p className="mb-1 flex items-center gap-1 text-xs text-[#222121]/40">
                          <MessageSquare className="h-3 w-3" />
                          Recent Feedback
                        </p>
                        <p className="italic text-[#222121]/70">"{client.stats.recentFeedback}"</p>
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
