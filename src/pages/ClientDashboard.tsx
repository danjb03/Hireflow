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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="space-y-1">
            <div className="h-8 w-64 bg-muted/60 rounded animate-pulse" />
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
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Welcome Header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </h1>
          <p className="text-sm text-muted-foreground font-normal">
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
          <Card hover="lift">
            <CardContent className="p-5 relative">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Leads</p>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground">{stats.totalLeads}</div>
              </div>
            </CardContent>
          </Card>

          <Card hover="lift">
            <CardContent className="p-5 relative">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                <Target className="h-5 w-5 text-secondary" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Leads</p>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground">{stats.activeLeads}</div>
              </div>
            </CardContent>
          </Card>

          <Card hover="lift">
            <CardContent className="p-5 relative">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Upcoming Callbacks</p>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground">{stats.upcomingCallbacks}</div>
              </div>
            </CardContent>
          </Card>

          <Card hover="lift">
            <CardContent className="p-5 relative">
              <div className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversion Rate</p>
                <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground">{stats.conversionRate}%</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Summary */}
        {orders.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg font-semibold">Your Orders</CardTitle>
                </div>
              </div>
              <CardDescription>
                Track your lead purchase orders and delivery progress
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Order Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold">{orderTotals.totalPurchased}</p>
                  <p className="text-xs text-muted-foreground">Total Purchased</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{orderTotals.totalDelivered}</p>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{orderTotals.totalPurchased - orderTotals.totalDelivered}</p>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                </div>
              </div>

              {/* Individual Orders */}
              <div className="space-y-3">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.order_number}</span>
                        {order.status === 'completed' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 text-xs">Completed</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">Active</Badge>
                        )}
                      </div>
                      {order.target_delivery_date && (
                        <span className="text-xs text-muted-foreground">
                          Target: {formatDate(order.target_delivery_date)}
                          {order.days_remaining !== null && order.days_remaining >= 0 && (
                            <span className="ml-1">({order.days_remaining}d left)</span>
                          )}
                          {order.days_remaining !== null && order.days_remaining < 0 && (
                            <span className="ml-1 text-red-500">({Math.abs(order.days_remaining)}d overdue)</span>
                          )}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${order.completion_percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{order.completion_percentage}%</span>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
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
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
              {recentLeads.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/client/leads")}
                  className="text-xs"
                >
                  View All
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm font-medium text-foreground mb-1">No recent leads</p>
                <p className="text-xs text-muted-foreground">Your latest leads will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 hover:border-accent cursor-pointer transition-all duration-200 group"
                    onClick={() => navigate(`/client/leads/${lead.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{lead.companyName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(lead.dateAdded)}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <StatusBadge status={lead.status} size="sm" showIcon={false} />
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => navigate("/client/leads")} size="default" className="flex-1">
            View All Leads
          </Button>
          <Button onClick={() => navigate("/client/calendar")} variant="outline" size="default" className="flex-1">
            Check Calendar
          </Button>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientDashboard;
