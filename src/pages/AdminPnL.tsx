import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, RefreshCw, PoundSterling, Calendar } from "lucide-react";
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
  const [report, setReport] = useState<PLReport | null>(null);
  const [businessCosts, setBusinessCosts] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState("report");
  const [dealDialogOpen, setDealDialogOpen] = useState(false);
  const [costDialogOpen, setCostDialogOpen] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const { startDate, endDate } = getPeriodDateRange(period);

      const { data, error } = await supabase.functions.invoke("get-pnl-report", {
        body: {},
        headers: {},
      });

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
  }, [period]);

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
  }, [isLoading, period, loadReport, loadCosts]);

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

  const periodLabel = getPeriodDateRange(period).label;

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
              <PoundSterling className="h-6 w-6" />
              Profit & Loss
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track deals, costs, and profitability
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                <SelectTrigger className="w-36">
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

        {/* Period Label */}
        <div className="text-sm text-muted-foreground">
          Showing data for: <span className="font-medium text-foreground">{periodLabel}</span>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="deals">Deals</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
          </TabsList>

          {/* Report Tab */}
          <TabsContent value="report" className="mt-6">
            <PLReportView report={report} loading={isRefreshing} />
          </TabsContent>

          {/* Deals Tab */}
          <TabsContent value="deals" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Deals</CardTitle>
                  <CardDescription>
                    {report?.deals?.length || 0} deals in this period
                  </CardDescription>
                </div>
                <Dialog open={dealDialogOpen} onOpenChange={setDealDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Business Costs</CardTitle>
                  <CardDescription>
                    {businessCosts.length} costs logged
                  </CardDescription>
                </div>
                <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
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
