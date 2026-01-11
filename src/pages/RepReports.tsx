import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, FileText, Clock, Phone, Calendar as CalendarIcon, TrendingUp, PlusCircle, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import RepLayout from "@/components/RepLayout";
import { Progress } from "@/components/ui/progress";

interface Report {
  id: string;
  report_date: string;
  time_on_dialer_minutes: number;
  calls_made: number;
  bookings_made: number;
  pipeline_value: number;
  notes: string | null;
  status: string;
  targets: {
    calls: { actual: number; target: number; percentOfTarget: number; status: string };
    hours: { actual: number; target: number; percentOfTarget: number; status: string };
    bookings: { actual: number; target: number; percentOfTarget: number; status: string };
    pipeline: { actual: number; target: number; percentOfTarget: number; status: string };
  };
}

const RepReports = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    loadReports();
  }, [navigate]);

  const loadReports = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);

    try {
      const { data, error } = await supabase.functions.invoke("get-my-reports");

      if (error) {
        console.error("Error fetching reports:", error);
        toast.error("Failed to load reports: " + error.message);
        setIsLoading(false);
        return;
      }

      if (data?.reports) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load reports");
    }

    setIsLoading(false);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return "N/A";
    }
  };

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "Needs Work":
        return <Badge className="bg-amber-100 text-amber-700"><AlertCircle className="h-3 w-3 mr-1" />Needs Work</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "ahead": return "bg-emerald-500";
      case "on_track": return "bg-blue-500";
      case "behind": return "bg-amber-500";
      case "critical": return "bg-red-500";
      default: return "bg-slate-500";
    }
  };

  if (isLoading) {
    return (
      <RepLayout userEmail={user?.email}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RepLayout>
    );
  }

  return (
    <RepLayout userEmail={user?.email}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">My Reports</h1>
            <p className="text-muted-foreground">
              View your submitted daily reports
            </p>
          </div>
          <Button
            onClick={() => navigate("/rep-report")}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Submit Daily Report
          </Button>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="text-lg font-medium mb-2">No reports yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't submitted any daily reports
                </p>
                <Button onClick={() => navigate("/rep-report")}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Submit Your First Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{formatDate(report.report_date)}</CardTitle>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-semibold">{formatHours(report.time_on_dialer_minutes)}</p>
                      <p className="text-xs text-muted-foreground">Time on Dialer</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <Phone className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-semibold">{report.calls_made}</p>
                      <p className="text-xs text-muted-foreground">Calls</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <CalendarIcon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-semibold">{report.bookings_made}</p>
                      <p className="text-xs text-muted-foreground">Bookings</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-lg font-semibold">{report.pipeline_value}</p>
                      <p className="text-xs text-muted-foreground">Pipeline</p>
                    </div>
                  </div>

                  {/* Target Progress */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Target Progress</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Calls</span>
                          <span className="text-muted-foreground">
                            {report.targets.calls.actual}/{report.targets.calls.target} ({report.targets.calls.percentOfTarget}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(report.targets.calls.status)} transition-all`}
                            style={{ width: `${Math.min(report.targets.calls.percentOfTarget, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Hours</span>
                          <span className="text-muted-foreground">
                            {report.targets.hours.actual.toFixed(1)}/{report.targets.hours.target}h ({report.targets.hours.percentOfTarget}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(report.targets.hours.status)} transition-all`}
                            style={{ width: `${Math.min(report.targets.hours.percentOfTarget, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Bookings</span>
                          <span className="text-muted-foreground">
                            {report.targets.bookings.actual}/{report.targets.bookings.target} ({report.targets.bookings.percentOfTarget}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(report.targets.bookings.status)} transition-all`}
                            style={{ width: `${Math.min(report.targets.bookings.percentOfTarget, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Pipeline</span>
                          <span className="text-muted-foreground">
                            {report.targets.pipeline.actual}/{report.targets.pipeline.target} ({report.targets.pipeline.percentOfTarget}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(report.targets.pipeline.status)} transition-all`}
                            style={{ width: `${Math.min(report.targets.pipeline.percentOfTarget, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {report.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {report.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RepLayout>
  );
};

export default RepReports;
