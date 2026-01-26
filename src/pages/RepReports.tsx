import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, FileText, Clock, Phone, Calendar as CalendarIcon, TrendingUp, PlusCircle, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import RepLayout from "@/components/RepLayout";

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
        return <Badge variant="outline" className="border-transparent bg-[#34B192] text-white"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "Rejected":
        return <Badge variant="outline" className="border-transparent bg-[#D64545] text-white"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "Needs Work":
        return <Badge variant="outline" className="border-transparent bg-[#F2B84B] text-white"><AlertCircle className="h-3 w-3 mr-1" />Needs Work</Badge>;
      default:
        return <Badge variant="outline" className="border-transparent bg-[#64748B] text-white"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
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
        <div className="flex min-h-[400px] items-center justify-center bg-[#F7F7F7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </RepLayout>
    );
  }

  return (
    <RepLayout userEmail={user?.email}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              Reporting overview
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">My Reports</h1>
            <p className="text-sm text-[#222121]/60">
              View your submitted daily reports
            </p>
          </div>
          <Button
            onClick={() => navigate("/rep-report")}
            variant="ghost"
            className="h-11 rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Submit Daily Report
          </Button>
        </div>

        {/* Reports List */}
        {reports.length === 0 ? (
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-[#222121]/30" />
                <h3 className="text-lg font-medium mb-2 text-[#222121]">No reports yet</h3>
                <p className="text-sm text-[#222121]/60 mb-4">
                  You haven't submitted any daily reports
                </p>
                <Button
                  onClick={() => navigate("/rep-report")}
                  variant="ghost"
                  className="h-10 rounded-full bg-[#34B192] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Submit Your First Report
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <Card key={report.id} className="overflow-hidden border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarIcon className="h-5 w-5 text-[#34B192]" />
                      <CardTitle className="text-lg text-[#222121]">{formatDate(report.report_date)}</CardTitle>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                      <Clock className="h-4 w-4 mx-auto mb-1 text-[#34B192]" />
                      <p className="text-lg font-semibold text-[#222121]">{formatHours(report.time_on_dialer_minutes)}</p>
                      <p className="text-xs text-[#222121]/60">Time on Dialer</p>
                    </div>
                    <div className="text-center p-3 rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                      <Phone className="h-4 w-4 mx-auto mb-1 text-[#34B192]" />
                      <p className="text-lg font-semibold text-[#222121]">{report.calls_made}</p>
                      <p className="text-xs text-[#222121]/60">Calls</p>
                    </div>
                    <div className="text-center p-3 rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                      <CalendarIcon className="h-4 w-4 mx-auto mb-1 text-[#34B192]" />
                      <p className="text-lg font-semibold text-[#222121]">{report.bookings_made}</p>
                      <p className="text-xs text-[#222121]/60">Bookings</p>
                    </div>
                    <div className="text-center p-3 rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                      <TrendingUp className="h-4 w-4 mx-auto mb-1 text-[#34B192]" />
                      <p className="text-lg font-semibold text-[#222121]">{report.pipeline_value}</p>
                      <p className="text-xs text-[#222121]/60">Pipeline</p>
                    </div>
                  </div>

                  {/* Target Progress */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#222121]/60">Target Progress</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#222121]">Calls</span>
                          <span className="text-[#222121]/60">
                            {report.targets.calls.actual}/{report.targets.calls.target} ({report.targets.calls.percentOfTarget}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#E5E5E5] overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(report.targets.calls.status)} transition-all`}
                            style={{ width: `${Math.min(report.targets.calls.percentOfTarget, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#222121]">Hours</span>
                          <span className="text-[#222121]/60">
                            {report.targets.hours.actual.toFixed(1)}/{report.targets.hours.target}h ({report.targets.hours.percentOfTarget}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#E5E5E5] overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(report.targets.hours.status)} transition-all`}
                            style={{ width: `${Math.min(report.targets.hours.percentOfTarget, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#222121]">Bookings</span>
                          <span className="text-[#222121]/60">
                            {report.targets.bookings.actual}/{report.targets.bookings.target} ({report.targets.bookings.percentOfTarget}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#E5E5E5] overflow-hidden">
                          <div
                            className={`h-full ${getProgressColor(report.targets.bookings.status)} transition-all`}
                            style={{ width: `${Math.min(report.targets.bookings.percentOfTarget, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#222121]">Pipeline</span>
                          <span className="text-[#222121]/60">
                            {report.targets.pipeline.actual}/{report.targets.pipeline.target} ({report.targets.pipeline.percentOfTarget}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-[#E5E5E5] overflow-hidden">
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
                    <div className="pt-2 border-t border-[#222121]/10">
                      <p className="text-sm text-[#222121]/60">
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
