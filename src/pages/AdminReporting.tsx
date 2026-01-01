import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCw, BarChart3, Calendar, Users, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import TeamSummary from "@/components/reporting/TeamSummary";
import RepCard from "@/components/reporting/RepCard";
import RepManagementTable from "@/components/reporting/RepManagementTable";
import { getTodayDate } from "@/lib/reportingCalculations";

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
  weeklyStats: {
    reportsSubmitted: number;
    avgCalls: number;
    avgHours: number;
    avgBookings: number;
    totalPipeline: number;
  };
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
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Rep Reporting
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track daily performance and manage your sales team
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={getTodayDate()}
                className="w-40"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Form Link Card */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <ExternalLink className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Rep Report Form</p>
                  <p className="text-sm text-muted-foreground">
                    Share this link with your reps to submit daily reports
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-white/50 px-3 py-1 rounded border">
                  {window.location.origin}/rep-report
                </code>
                <Button variant="outline" size="sm" onClick={copyFormLink}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open("/rep-report", "_blank")}
                >
                  Open Form
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports">Individual Reports</TabsTrigger>
            <TabsTrigger value="settings">
              <Users className="h-4 w-4 mr-1" />
              Manage Reps
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {dashboardData ? (
              <>
                {/* Team Summary */}
                <TeamSummary team={dashboardData.team} />

                {/* Status Breakdown */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Team Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <span className="text-sm">
                          {dashboardData.team.statusBreakdown.ahead} Ahead
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm">
                          {dashboardData.team.statusBreakdown.onTrack} On Track
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-sm">
                          {dashboardData.team.statusBreakdown.behind} Behind
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm">
                          {dashboardData.team.statusBreakdown.critical} Critical
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-300" />
                        <span className="text-sm">
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
                        overallStatus={repData.overallStatus as any}
                      />
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium mb-1">No Reps Added</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add your sales reps in the "Manage Reps" tab to start tracking
                      </p>
                      <Button onClick={() => setActiveTab("settings")}>
                        Add Your First Rep
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </TabsContent>

          {/* Individual Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Report History</CardTitle>
                <CardDescription>
                  View all submitted reports for {selectedDate}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData?.reps.filter((r) => r.today.hasReport).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No reports submitted for this date
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData?.reps
                      .filter((r) => r.today.hasReport)
                      .map((repData) => (
                        <div
                          key={repData.rep.id}
                          className="border rounded-lg p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{repData.rep.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                Submitted at{" "}
                                {repData.today.submittedAt
                                  ? new Date(repData.today.submittedAt).toLocaleTimeString()
                                  : "N/A"}
                              </p>
                            </div>
                            {repData.today.screenshotUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(repData.today.screenshotUrl!, "_blank")
                                }
                              >
                                View Screenshot
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Calls:</span>{" "}
                              <span className="font-medium">
                                {repData.today.calls.actual}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Hours:</span>{" "}
                              <span className="font-medium">
                                {Math.round(repData.today.hours.actual * 10) / 10}h
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Bookings:</span>{" "}
                              <span className="font-medium">
                                {repData.today.bookings.actual}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Pipeline:</span>{" "}
                              <span className="font-medium">
                                £{repData.today.pipeline.actual.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {repData.today.notes && (
                            <div className="bg-slate-50 rounded p-3 text-sm">
                              <p className="font-medium text-xs text-muted-foreground uppercase mb-1">
                                Notes
                              </p>
                              <p>{repData.today.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Sales Reps</CardTitle>
                <CardDescription>
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
      </div>
    </AdminLayout>
  );
};

export default AdminReporting;
