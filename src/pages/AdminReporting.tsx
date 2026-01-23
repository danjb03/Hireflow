import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, BarChart3, Calendar, Users, ExternalLink, Copy, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import TeamSummary from "@/components/reporting/TeamSummary";
import RepCard from "@/components/reporting/RepCard";
import RepManagementTable from "@/components/reporting/RepManagementTable";
import ReportReviewDialog from "@/components/reporting/ReportReviewDialog";
import { getTodayDate, formatDuration, formatCurrency } from "@/lib/reportingCalculations";

interface PeriodStats {
  reportsSubmitted: number;
  avgCalls: number;
  avgHours: number;
  avgBookings: number;
  totalPipeline: number;
  totalCalls?: number;
  totalHours?: number;
  totalBookings?: number;
}

interface RepDashboard {
  rep: {
    id: string;
    name: string;
    email?: string;
    targets: {
      dailyCalls: number;
      dailyHours: number;
      dailyBookings: number;
      dailyPipeline: number;
    };
  };
  today: {
    hasReport: boolean;
    calls: { actual: number; target: number; percent: number; status: string };
    hours: { actual: number; target: number; percent: number; status: string };
    bookings: { actual: number; target: number; percent: number; status: string };
    pipeline: { actual: number; target: number; percent: number; status: string };
    notes: string | null;
    screenshotUrl: string | null;
    submittedAt: string | null;
  };
  weeklyStats: PeriodStats;
  stats7Day?: PeriodStats;
  stats14Day?: PeriodStats;
  stats30Day?: PeriodStats;
  overallStatus: string;
}

interface DashboardData {
  date: string;
  team: {
    totalReps: number;
    reportsSubmittedToday: number;
    totalCalls: number;
    totalHours: number;
    totalBookings: number;
    totalPipeline: number;
    statusBreakdown: {
      ahead: number;
      onTrack: number;
      behind: number;
      critical: number;
      noReport: number;
    };
  };
  reps: RepDashboard[];
}

interface SalesRep {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  daily_calls_target: number;
  daily_hours_target: number;
  daily_bookings_target: number;
  daily_pipeline_target: number;
}

const AdminReporting = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [allReps, setAllReps] = useState<SalesRep[]>([]);
  const [isLoadingReps, setIsLoadingReps] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");
  const [reviewingReport, setReviewingReport] = useState<any>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-rep-dashboard?date=${selectedDate}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to load dashboard");
      }

      setDashboardData(result);
    } catch (error: any) {
      console.error("Error loading dashboard:", error);
      toast.error(error.message || "Failed to load dashboard");
    }
  }, [selectedDate]);

  const loadAllReps = useCallback(async () => {
    setIsLoadingReps(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-reps`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setAllReps(result.reps || []);
      }
    } catch (error: any) {
      console.error("Error loading reps:", error);
    } finally {
      setIsLoadingReps(false);
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate("/login");
        return;
      }

      setUserEmail(session.user.email || "");

      // Check admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const isAdmin = roles?.some((r) => r.role === "admin");
      if (!isAdmin) {
        navigate("/client/dashboard");
        return;
      }

      setIsLoading(false);
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!isLoading) {
      loadDashboard();
      loadAllReps();
    }
  }, [isLoading, selectedDate, loadDashboard, loadAllReps]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadDashboard(), loadAllReps()]);
    setIsRefreshing(false);
    toast.success("Data refreshed");
  };

  const copyFormLink = () => {
    const link = `${window.location.origin}/rep-report`;
    navigator.clipboard.writeText(link);
    toast.success("Form link copied to clipboard");
  };

  if (isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="-mx-4 -my-6 flex min-h-[400px] items-center justify-center bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
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
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              Reporting overview
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[#222121]">
              <span className="text-[#222121]/40">Track daily</span>{" "}
              <span className="text-[#222121]">rep performance.</span>
            </h1>
            <p className="mt-2 text-sm text-[#222121]/60">
              Track daily performance and manage your sales team.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#222121]/50" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getTodayDate()}
                className="h-9 w-40 rounded-full border-[#222121]/10 bg-white text-xs text-[#222121]"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 rounded-full border border-[#222121]/10 bg-white px-4 text-xs font-semibold text-[#222121] hover:bg-[#34B192]/5"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Form Link Card */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34B192]/10">
                  <ExternalLink className="h-5 w-5 text-[#34B192]" />
                </div>
                <div>
                  <p className="font-medium text-[#222121]">Rep Report Form</p>
                  <p className="text-sm text-[#222121]/60">
                    Share this link with your reps to submit daily reports.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-full border border-[#222121]/10 bg-[#F7F7F7] px-4 py-1 text-sm text-[#222121]/70">
                  {window.location.origin}/rep-report
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyFormLink}
                  className="h-9 rounded-full border border-[#222121]/10 bg-white px-3 text-xs font-semibold text-[#222121] hover:bg-[#34B192]/5"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => window.open("/rep-report", "_blank")}
                  className="h-9 rounded-full bg-[#34B192] px-4 text-xs font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] hover:bg-[#2D9A7E]"
                >
                  Open Form
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="rounded-full border border-[#222121]/10 bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {[
              { value: "overview", label: "Overview" },
              { value: "reports", label: "Individual Reports" },
              { value: "settings", label: "Manage Reps" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#222121]/60 transition data-[state=active]:bg-[#34B192] data-[state=active]:text-white"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {dashboardData ? (
              <>
                {/* Team Summary */}
                <TeamSummary team={dashboardData.team} />

                {/* Status Breakdown */}
                <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-[#222121]">Team Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#34B192]" />
                        <span className="text-sm text-[#222121]">
                          {dashboardData.team.statusBreakdown.ahead} Ahead
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#34B192]/70" />
                        <span className="text-sm text-[#222121]">
                          {dashboardData.team.statusBreakdown.onTrack} On Track
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-amber-400" />
                        <span className="text-sm text-[#222121]">
                          {dashboardData.team.statusBreakdown.behind} Behind
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                        <span className="text-sm text-[#222121]">
                          {dashboardData.team.statusBreakdown.critical} Critical
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-[#222121]/20" />
                        <span className="text-sm text-[#222121]">
                          {dashboardData.team.statusBreakdown.noReport} No Report
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Rep Cards */}
                {dashboardData.reps.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dashboardData.reps.map((repData) => (
                      <RepCard
                        key={repData.rep.id}
                        rep={repData.rep}
                        today={repData.today as any}
                        weeklyStats={repData.weeklyStats}
                        stats7Day={repData.stats7Day}
                        stats14Day={repData.stats14Day}
                        stats30Day={repData.stats30Day}
                        overallStatus={repData.overallStatus as any}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                    <CardContent className="py-12 text-center">
                      <Users className="mx-auto mb-4 h-12 w-12 text-[#222121]/40" />
                      <h3 className="mb-1 font-medium text-[#222121]">No Reps Added</h3>
                      <p className="mb-4 text-sm text-[#222121]/60">
                        Add your sales reps in the "Manage Reps" tab to start tracking
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() => setActiveTab("settings")}
                        className="h-10 rounded-full bg-[#34B192] px-4 text-sm font-semibold text-white hover:bg-[#2D9A7E]"
                      >
                        Add Your First Rep
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
              </div>
            )}
          </TabsContent>

          {/* Individual Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#222121]">Report Review</CardTitle>
                    <CardDescription className="text-[#222121]/60">
                      Review and approve reports for {selectedDate}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge
                      variant="outline"
                      className="gap-1 rounded-full border-[#222121]/10 bg-[#222121]/10 text-xs text-[#222121]"
                    >
                      <Clock className="h-3 w-3 text-[#222121]" />
                      {dashboardData?.reps.filter((r) => r.today.hasReport && (r.today as any).reportStatus === "pending").length || 0} Pending
                    </Badge>
                    <Badge
                      variant="outline"
                      className="gap-1 rounded-full border-transparent bg-[#34B192] text-xs text-white"
                    >
                      <CheckCircle2 className="h-3 w-3 text-white" />
                      {dashboardData?.reps.filter((r) => r.today.hasReport && (r.today as any).reportStatus === "approved").length || 0} Approved
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {dashboardData?.reps.filter((r) => r.today.hasReport).length === 0 ? (
                  <div className="py-8 text-center text-[#222121]/60">
                    No reports submitted for this date
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData?.reps
                      .filter((r) => r.today.hasReport)
                      .map((repData) => {
                        const reportStatus = (repData.today as any).reportStatus || "pending";
                        const getStatusBadge = () => {
                          switch (reportStatus) {
                            case "approved":
                              return (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-transparent bg-[#34B192] text-white"
                                >
                                  Approved
                                </Badge>
                              );
                            case "rejected":
                              return (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-transparent bg-red-500 text-white"
                                >
                                  Rejected
                                </Badge>
                              );
                            case "edited":
                              return (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-transparent bg-blue-500 text-white"
                                >
                                  Edited
                                </Badge>
                              );
                            default:
                              return (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-transparent bg-[#222121]/10 text-[#222121]"
                                >
                                  Pending Review
                                </Badge>
                              );
                          }
                        };

                        return (
                          <div
                            key={repData.rep.id}
                            className={`space-y-3 rounded-2xl border border-[#222121]/10 bg-white p-4 ${
                              reportStatus === "pending" ? "bg-[#34B192]/5" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div>
                                  <h4 className="font-medium text-[#222121]">{repData.rep.name}</h4>
                                  <p className="text-sm text-[#222121]/50">
                                    Submitted at{" "}
                                    {repData.today.submittedAt
                                      ? new Date(repData.today.submittedAt).toLocaleTimeString()
                                      : "N/A"}
                                  </p>
                                </div>
                                {getStatusBadge()}
                              </div>
                              <div className="flex gap-2">
                                {repData.today.screenshotUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      window.open(repData.today.screenshotUrl!, "_blank")
                                    }
                                    className="h-9 rounded-full border border-[#222121]/10 bg-white px-3 text-xs font-semibold text-[#222121] hover:bg-[#34B192]/5"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    Screenshot
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setReviewingReport({
                                      id: (repData.today as any).reportId,
                                      repName: repData.rep.name,
                                      reportDate: selectedDate,
                                      callsMade: repData.today.calls.actual,
                                      timeOnDialerMinutes: Math.round(repData.today.hours.actual * 60),
                                      bookingsMade: repData.today.bookings.actual,
                                      pipelineValue: repData.today.pipeline.actual,
                                      notes: repData.today.notes,
                                      screenshotUrl: repData.today.screenshotUrl,
                                      status: reportStatus,
                                      aiExtractedCalls: (repData.today as any).aiExtractedCalls,
                                      aiExtractedTimeMinutes: (repData.today as any).aiExtractedTimeMinutes,
                                      aiConfidenceScore: (repData.today as any).aiConfidenceScore,
                                      submittedAt: repData.today.submittedAt,
                                    })
                                  }
                                  className="h-9 rounded-full bg-[#34B192] px-4 text-xs font-semibold text-white hover:bg-[#2D9A7E]"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Review
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm text-[#222121]/70">
                              <div>
                                <span className="text-[#222121]/50">Calls:</span>{" "}
                                <span className="font-medium text-[#222121]">
                                  {repData.today.calls.actual}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#222121]/50">Hours:</span>{" "}
                                <span className="font-medium text-[#222121]">
                                  {formatDuration(Math.round(repData.today.hours.actual * 60))}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#222121]/50">Bookings:</span>{" "}
                                <span className="font-medium text-[#222121]">
                                  {repData.today.bookings.actual}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#222121]/50">Pipeline:</span>{" "}
                                <span className="font-medium text-[#222121]">
                                  {repData.today.pipeline.actual}
                                </span>
                              </div>
                            </div>
                            {repData.today.notes && (
                              <div className="rounded-2xl border border-[#222121]/10 bg-[#F7F7F7] p-3 text-sm">
                                <p className="mb-1 text-xs font-medium uppercase text-[#222121]/40">
                                  Notes
                                </p>
                                <p className="text-[#222121]/70">{repData.today.notes}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle className="text-[#222121]">Manage Sales Reps</CardTitle>
                <CardDescription className="text-[#222121]/60">
                  Add, edit, and set targets for your sales team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RepManagementTable
                  reps={allReps}
                  loading={isLoadingReps}
                  onRefresh={loadAllReps}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Report Review Dialog */}
        <ReportReviewDialog
          report={reviewingReport}
          open={!!reviewingReport}
          onOpenChange={(open) => !open && setReviewingReport(null)}
          onReviewComplete={loadDashboard}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminReporting;
