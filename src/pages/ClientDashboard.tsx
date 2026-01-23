import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, TrendingUp, Users, Calendar, Target, ArrowRight, FileText, Package } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";

interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  upcomingCallbacks: number;
  conversionRate: number;
}

interface RecentLead {
  id: string;
  companyName: string;
  status: string;
  dateAdded: string;
}

interface Order {
  id: string;
  order_number: string;
  leads_purchased: number;
  leads_delivered: number;
  target_delivery_date: string | null;
  status: string;
  completion_percentage: number;
  days_remaining: number | null;
}

const ClientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeLeads: 0,
    upcomingCallbacks: 0,
    conversionRate: 0,
  });
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    checkOnboarding();
  }, [navigate]);

  const checkOnboarding = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);

    // Fetch profile, leads data, and orders in parallel
    const [profileResult, leadsResult, ordersResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .single(),
      supabase.functions.invoke("get-client-leads"),
      supabase.functions.invoke("get-orders"),
    ]);

    // Check onboarding status
    if (!profileResult.data?.onboarding_completed) {
      navigate('/onboarding');
      return;
    }

    setCheckingOnboarding(false);

    // Process orders data
    if (!ordersResult.error && ordersResult.data?.orders) {
      setOrders(ordersResult.data.orders);
    }
    setLoadingOrders(false);

    // Process leads data
    if (leadsResult.error) {
      if (leadsResult.error.message?.includes('No Notion database configured')) {
        toast.error('Your account is not yet configured. Please contact your administrator to set up your Notion database.');
      } else {
        toast.error("Failed to load dashboard data: " + leadsResult.error.message);
      }
      setIsLoading(false);
      return;
    }

    const leads = leadsResult.data?.leads || [];

    // Calculate stats
    const totalLeads = leads.length;
    const activeLeads = leads.filter((l: any) =>
      l.status === "In Progress" || l.status === "Booked"
    ).length;
    const bookedLeads = leads.filter((l: any) => l.status === "Booked").length;
    const conversionRate = totalLeads > 0 ? Math.round((bookedLeads / totalLeads) * 100) : 0;
    const upcomingCallbacks = Math.floor(activeLeads * 0.6);

    setStats({
      totalLeads,
      activeLeads,
      upcomingCallbacks,
      conversionRate,
    });

    // Get recent leads (last 5)
    setRecentLeads(leads.slice(0, 5));
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

  // Calculate order totals
  const orderTotals = orders.reduce((acc, order) => ({
    totalPurchased: acc.totalPurchased + order.leads_purchased,
    totalDelivered: acc.totalDelivered + order.leads_delivered
  }), { totalPurchased: 0, totalDelivered: 0 });

  if (checkingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
          <div className="space-y-2">
            <div className="h-7 w-40 rounded-full bg-muted/60 animate-pulse" />
            <div className="h-8 w-72 bg-muted/60 rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted/60 rounded animate-pulse" />
          </div>
          <SkeletonStats />
          <SkeletonTable rows={3} />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Welcome Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
            <span className="size-2 rounded-full bg-[#34B192]" />
            Client dashboard
          </div>
          <h1 className="text-3xl font-semibold text-[#222121]">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}.
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

        {/* Key Metrics Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 stagger-children">
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <Users className="h-5 w-5 text-[#34B192]" />
              </div>
              <div className="text-2xl font-semibold tabular-nums text-[#222121]">{stats.totalLeads}</div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#222121]/50">Total Leads</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <Target className="h-5 w-5 text-[#34B192]" />
              </div>
              <div className="text-2xl font-semibold tabular-nums text-[#222121]">{stats.activeLeads}</div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#222121]/50">Active Leads</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <Calendar className="h-5 w-5 text-[#34B192]" />
              </div>
              <div className="text-2xl font-semibold tabular-nums text-[#222121]">{stats.upcomingCallbacks}</div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#222121]/50">Callbacks</p>
            </CardContent>
          </Card>

          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-5">
              <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <TrendingUp className="h-5 w-5 text-[#34B192]" />
              </div>
              <div className="text-2xl font-semibold tabular-nums text-[#222121]">{stats.conversionRate}%</div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-[#222121]/50">Conversion</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Summary */}
        {orders.length > 0 && (
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-[#34B192]" />
                  <CardTitle className="text-lg font-semibold text-[#222121]">Your Orders</CardTitle>
                </div>
              </div>
              <CardDescription className="text-[#222121]/60">
                Track your lead purchase orders and delivery progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Order Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 rounded-xl border border-[#222121]/10 bg-[#F5F5F5] p-4">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-[#222121]">{orderTotals.totalPurchased}</p>
                  <p className="text-xs text-[#222121]/60">Total Purchased</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-[#34B192]">{orderTotals.totalDelivered}</p>
                  <p className="text-xs text-[#222121]/60">Delivered</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-[#222121]">{orderTotals.totalPurchased - orderTotals.totalDelivered}</p>
                  <p className="text-xs text-[#222121]/60">Remaining</p>
                </div>
              </div>

              {/* Individual Orders */}
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-xl border border-[#222121]/10 bg-white p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[#222121]">{order.order_number}</span>
                        {order.status === 'completed' ? (
                          <Badge variant="outline" className="border-transparent bg-[#34B192] text-white text-xs">Completed</Badge>
                        ) : (
                          <Badge variant="outline" className="border-transparent bg-[#222121]/70 text-white text-xs">Active</Badge>
                        )}
                      </div>
                      {order.target_delivery_date && (
                        <span className="text-xs text-[#222121]/60">
                          Target: {formatDate(order.target_delivery_date)}
                          {order.days_remaining !== null && order.days_remaining >= 0 && (
                            <span className="ml-1">({order.days_remaining}d left)</span>
                          )}
                          {order.days_remaining !== null && order.days_remaining < 0 && (
                            <span className="ml-1 text-[#D64545]">({Math.abs(order.days_remaining)}d overdue)</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="h-2 w-full rounded-full bg-[#E5E5E5] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#34B192] transition-all duration-500"
                            style={{ width: `${order.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="w-12 text-right text-sm font-medium text-[#222121]">{order.completion_percentage}%</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-[#222121]/60">
                      <span>{order.leads_delivered} of {order.leads_purchased} leads delivered</span>
                      <span>{order.leads_purchased - order.leads_delivered} remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-[#222121]">Recent Activity</CardTitle>
              {recentLeads.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/client/leads")}
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
                <FileText className="h-10 w-10 mx-auto mb-3 text-[#222121]/30" />
                <p className="text-sm font-medium text-[#222121] mb-1">No recent leads</p>
                <p className="text-xs text-[#222121]/60">Your latest leads will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between rounded-xl border border-[#222121]/10 bg-white p-3 transition-all duration-200 group hover:border-[#34B192]/40 hover:bg-[#F7F7F7]"
                    onClick={() => navigate(`/client/leads/${lead.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-[#222121]">{lead.companyName}</p>
                      <p className="mt-0.5 text-xs text-[#222121]/60">{formatDate(lead.dateAdded)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <StatusBadge status={lead.status} size="sm" showIcon={false} />
                      <ArrowRight className="h-3.5 w-3.5 text-[#222121]/40 transition-colors group-hover:text-[#222121]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate("/client/leads")}
            size="default"
            variant="ghost"
            className="flex-1 h-11 rounded-full bg-[#34B192] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E] hover:shadow-[0_8px_24px_rgba(52,177,146,0.35)]"
          >
            View All Leads
          </Button>
          <Button
            onClick={() => navigate("/client/calendar")}
            variant="outline"
            size="default"
            className="flex-1 h-11 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
          >
            Check Calendar
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientDashboard;
