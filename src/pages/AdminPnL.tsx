import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, RefreshCw, PoundSterling, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import DealEntryForm from "@/components/pnl/DealEntryForm";
import BusinessCostForm from "@/components/pnl/BusinessCostForm";
import DealsTable from "@/components/pnl/DealsTable";
import CostsTable from "@/components/pnl/CostsTable";
import PLReportView from "@/components/pnl/PLReportView";
import { getPeriodDateRange } from "@/lib/pnlCalculations";

type PeriodType = "daily" | "weekly" | "monthly" | "quarterly";

interface PLReport {
  period: { type: string; startDate: string; endDate: string };
  totalRevenueIncVat: number;
  totalRevenueNet: number;
  vatDeducted: number;
  dealCosts: {
    operatingExpenses: number;
    setterCosts: number;
    salesRepCosts: number;
    leadFulfillmentCosts: number;
    total: number;
  };
  additionalCosts: {
    recurring: number;
    oneTime: number;
    total: number;
    byCategory: Record<string, number>;
  };
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
  totalDeals: number;
  totalLeadsSold: number;
  avgRevenuePerDeal: number;
  avgProfitPerDeal: number;
  deals: any[];
  recurringCosts: any[];
  oneTimeCosts: any[];
}

const AdminPnL = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [period, setPeriod] = useState<PeriodType>("monthly");
  const [periodOffset, setPeriodOffset] = useState(0); // 0 = current, 1 = previous, etc.
  const [report, setReport] = useState<PLReport | null>(null);
  const [businessCosts, setBusinessCosts] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("report");
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const { startDate, endDate } = getPeriodDateRange(period, periodOffset);

      // Use URL params for the function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-pnl-report?period=${period}&startDate=${startDate}&endDate=${endDate}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load report");
      }

      const result = await response.json();

      if (result.success) {
        setReport(result.report);
      }
    } catch (error: any) {
      console.error("Error loading report:", error);
      toast.error(error.message || "Failed to load P&L report");
    }
  }, [period, periodOffset]);

  const loadCosts = useCallback(async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-business-costs`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load costs");
      }

      const result = await response.json();

      if (result.success) {
        setBusinessCosts(result.costs || []);
      }
    } catch (error: any) {
      console.error("Error loading costs:", error);
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
      loadReport();
      loadCosts();
    }
  }, [isLoading, period, periodOffset, loadReport, loadCosts]);

  // Reset offset when period type changes
  useEffect(() => {
    setPeriodOffset(0);
  }, [period]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadReport(), loadCosts()]);
    setIsRefreshing(false);
    toast.success("Data refreshed");
  };

  const handleDealSuccess = () => {
    setDealDialogOpen(false);
    loadReport();
  };

  const handleCostSuccess = () => {
    setCostDialogOpen(false);
    loadReport();
    loadCosts();
  };

  const periodLabel = getPeriodDateRange(period, periodOffset).label;

  const handlePreviousPeriod = () => {
    setPeriodOffset((prev) => prev + 1);
  };

  const handleNextPeriod = () => {
    setPeriodOffset((prev) => Math.max(0, prev - 1));
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
              Finance overview
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-[#222121]">
              <span className="text-[#222121]/40">Track profit</span>{" "}
              <span className="text-[#222121]">and cash flow.</span>
            </h1>
            <p className="mt-2 text-sm text-[#222121]/60">
              Track deals, costs, and profitability.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#222121]/50" />
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                <SelectTrigger className="h-9 w-36 rounded-full border-[#222121]/10 bg-white text-xs text-[#222121]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Period Navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePreviousPeriod}
                title="Previous period"
                className="h-9 w-9 rounded-full border border-[#222121]/10 bg-white text-[#222121] hover:bg-[#34B192]/5"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNextPeriod}
                disabled={periodOffset === 0}
                title="Next period"
                className="h-9 w-9 rounded-full border border-[#222121]/10 bg-white text-[#222121] hover:bg-[#34B192]/5"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              {periodOffset > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPeriodOffset(0)}
                  className="h-9 rounded-full border border-[#222121]/10 bg-white px-4 text-xs font-semibold text-[#222121] hover:bg-[#34B192]/5"
                >
                  Today
                </Button>
              )}
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

        {/* Period Label */}
        <div className="text-sm text-[#222121]/60">
          Showing data for: <span className="font-medium text-[#222121]">{periodLabel}</span>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="rounded-full border border-[#222121]/10 bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            {["report", "deals", "costs"].map((value) => (
              <TabsTrigger
                key={value}
                value={value}
                className="rounded-full px-4 py-2 text-xs font-semibold text-[#222121]/60 transition data-[state=active]:bg-[#34B192] data-[state=active]:text-white"
              >
                {value === "report" ? "Report" : value === "deals" ? "Deals" : "Costs"}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Report Tab */}
          <TabsContent value="report" className="mt-6">
            <PLReportView report={report} loading={isRefreshing} />
          </TabsContent>

          {/* Deals Tab */}
          <TabsContent value="deals" className="mt-6">
            <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[#222121]">Deals</CardTitle>
                  <CardDescription className="text-[#222121]/60">
                    {report?.deals?.length || 0} deals in this period
                  </CardDescription>
                </div>
                <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 rounded-full bg-[#34B192] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] hover:bg-[#2D9A7E]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Log Deal
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Log New Deal</DialogTitle>
                    </DialogHeader>
                    <DealEntryForm
                      onSuccess={handleDealSuccess}
                      onCancel={() => setDealDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <DealsTable
                  deals={report?.deals || []}
                  loading={isRefreshing}
                  onRefresh={loadReport}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Costs Tab */}
          <TabsContent value="costs" className="mt-6">
            <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[#222121]">Business Costs</CardTitle>
                  <CardDescription className="text-[#222121]/60">
                    {businessCosts.length} costs logged
                  </CardDescription>
                </div>
                <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 rounded-full bg-[#34B192] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] hover:bg-[#2D9A7E]"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Cost
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add Business Cost</DialogTitle>
                    </DialogHeader>
                    <BusinessCostForm
                      onSuccess={handleCostSuccess}
                      onCancel={() => setCostDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <CostsTable
                  costs={businessCosts}
                  loading={isRefreshing}
                  onRefresh={loadCosts}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminPnL;
