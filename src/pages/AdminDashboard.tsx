import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, FileText, PlusCircle, TrendingUp, AlertTriangle, Smile, Frown, Clock, CheckCircle2, X } from "lucide-react";
import { getCompletionPercentage, getDaysRemaining, getPriorityScore } from "@/lib/clientOnboarding";
import AdminLayout from "@/components/AdminLayout";
import { NoClientsEmpty } from "@/components/EmptyState";
import { SkeletonStats, SkeletonTable } from "@/components/Skeleton";

type ClientStatus = 'happy' | 'unhappy' | 'urgent' | 'at_risk' | 'on_track';

interface Client {
  id: string;
  email: string;
  client_name: string | null;
  leads_purchased?: number | null;
  onboarding_date?: string | null;
  target_delivery_date?: string | null;
  leads_per_day?: number | null;
  leads_fulfilled?: number | null;
  client_status?: ClientStatus | null;
  airtable_client_id?: string | null;
  // Enhanced with Airtable data
  airtable_leads_purchased?: number;
  airtable_leads_delivered?: number;
}

interface AirtableClientStats {
  id: string;
  name: string;
  leadsPurchased: number;
  leadsDelivered: number;
  leadsRemaining: number;
}

interface Stats {
  totalClients: number;
  totalLeads: number;
  statusBreakdown: {
    Approved: number;
    Rejected: number;
    'Needs Work': number;
    Unknown: number;
  };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ 
    totalClients: 0, 
    totalLeads: 0, 
    statusBreakdown: {
      Approved: 0,
      Rejected: 0,
      'Needs Work': 0,
      Unknown: 0,
    }
  });
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    checkAdminAndLoadStats();
  }, []);

  const checkAdminAndLoadStats = async () => {
    try {
      // Use getSession for faster cached auth check
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/login");
        return;
      }

      const user = session.user;
      setUserEmail(user.email || "");

      // Load admin check, stats, and clients in parallel
      const [rolesResult] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        loadStats(),
        loadClients(),
      ]);

      const isAdmin = rolesResult.data?.some(r => r.role === "admin");

      if (!isAdmin) {
        toast.error("Access denied - Admin only");
        navigate("/dashboard");
        return;
      }
    } catch (error: any) {
      toast.error("Failed to load admin dashboard");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-system-stats");

      if (error) throw error;

      setStats(data);
    } catch (error: any) {
      console.error("Error loading stats:", error);
      toast.error("Failed to load stats");
    }
  };

  const loadClients = async () => {
    try {
      // Load both Supabase profiles and Airtable stats in parallel
      const [profilesResult, airtableResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .not("client_name", "is", null)
          .neq("client_name", "")
          .order("created_at", { ascending: false }),
        supabase.functions.invoke("get-airtable-clients", {
          body: { includeStats: true }
        })
      ]);

      if (profilesResult.error) throw profilesResult.error;

      // Build a map of Airtable client ID -> stats
      const airtableStatsMap: Record<string, AirtableClientStats> = {};
      if (airtableResult.data?.clients) {
        for (const client of airtableResult.data.clients) {
          airtableStatsMap[client.id] = client;
        }
      }

      // Enhance profile data with Airtable stats
      const enhancedClients = (profilesResult.data || []).map((client: Client) => {
        if (client.airtable_client_id && airtableStatsMap[client.airtable_client_id]) {
          const airtableStats = airtableStatsMap[client.airtable_client_id];
          return {
            ...client,
            airtable_leads_purchased: airtableStats.leadsPurchased,
            airtable_leads_delivered: airtableStats.leadsDelivered,
          };
        }
        return client;
      });

      setClients(enhancedClients);
    } catch (error: any) {
      console.error("Error loading clients:", error);
      toast.error("Failed to load clients");
    }
  };

  const handleUpdateStatus = async (clientId: string, newStatus: ClientStatus) => {
    setUpdatingStatus(clientId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ client_status: newStatus })
        .eq("id", clientId);

      if (error) throw error;

      toast.success("Client status updated successfully");
      loadClients();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Failed to update client status: " + error.message);
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Group and prioritize clients by status
  const clientsByStatus = useMemo(() => {
    const activeClients = clients.filter(c => c.client_name);
    const grouped: Record<string, Client[]> = {
      urgent: [],
      unhappy: [],
      at_risk: [],
      on_track: [],
      happy: [],
    };

    activeClients.forEach(client => {
      const status = client.client_status || 'on_track';
      if (grouped[status]) {
        grouped[status].push(client);
      }
    });

    // Sort each group by priority (least fulfilled + shortest time remaining)
    Object.keys(grouped).forEach(status => {
      grouped[status].sort((a, b) => {
        const scoreA = getPriorityScore(
          a.leads_fulfilled || 0,
          a.leads_purchased || 0,
          a.target_delivery_date ? new Date(a.target_delivery_date) : null
        );
        const scoreB = getPriorityScore(
          b.leads_fulfilled || 0,
          b.leads_purchased || 0,
          b.target_delivery_date ? new Date(b.target_delivery_date) : null
        );
        return scoreA - scoreB; // Lower score = higher priority
      });
    });

    return grouped;
  }, [clients]);

  const getStatusColor = (status: ClientStatus | null | undefined) => {
    const colors: Record<string, string> = {
      happy: "bg-success/10 text-success border-success/20",
      unhappy: "bg-destructive/10 text-destructive border-destructive/20",
      urgent: "bg-destructive/20 text-destructive border-destructive/40 font-bold",
      at_risk: "bg-warning/10 text-warning border-warning/20",
      on_track: "bg-info/10 text-info border-info/20",
    };
    return colors[status || 'on_track'] || colors.on_track;
  };

  const getStatusIcon = (status: ClientStatus | null | undefined) => {
    switch (status) {
      case 'happy':
        return <Smile className="h-4 w-4" />;
      case 'unhappy':
        return <Frown className="h-4 w-4" />;
      case 'urgent':
        return <AlertTriangle className="h-4 w-4" />;
      case 'at_risk':
        return <Clock className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      urgent: 'Urgent',
      unhappy: 'Unhappy',
      at_risk: 'At Risk',
      on_track: 'On Track',
      happy: 'Happy',
    };
    return labels[status] || status;
  };

  const getLeadStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      New: "bg-blue-100 text-blue-700",
      Approved: "bg-emerald-100 text-emerald-700",
      'Needs Work': "bg-yellow-100 text-yellow-700",
      Rejected: "bg-red-100 text-red-700",
      Unknown: "bg-blue-100 text-blue-700",
      'Not Qualified': "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-blue-100 text-blue-700";
  };

  if (isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="space-y-3 md:space-y-4 p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="h-7 w-32 bg-muted/60 rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted/60 rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-muted/60 rounded animate-pulse" />
          </div>
          <SkeletonStats />
          <SkeletonTable rows={4} />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="space-y-3 md:space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">System overview and quick actions</p>
          </div>
          <Button 
            onClick={() => navigate("/admin/submit-lead")}
            size="default"
            className="w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Submit Lead
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5 stagger-children">
          <Card hover="lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground mb-1">{stats.totalClients}</div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Clients</p>
            </CardContent>
          </Card>

          <Card hover="lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-secondary" />
                </div>
              </div>
              <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground mb-1">{stats.totalLeads}</div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Leads</p>
            </CardContent>
          </Card>

          <Card hover="lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
              </div>
              <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground mb-1">{stats.statusBreakdown.Approved}</div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approved</p>
            </CardContent>
          </Card>

          <Card hover="lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
              </div>
              <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground mb-1">{stats.statusBreakdown['Needs Work']}</div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Needs Work</p>
            </CardContent>
          </Card>

          <Card hover="lift">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center">
                  <X className="h-5 w-5 text-destructive" />
                </div>
              </div>
              <div className="text-3xl md:text-4xl font-bold tabular-nums text-foreground mb-1">{stats.statusBreakdown.Rejected}</div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Leads by Status</CardTitle>
            <CardDescription className="text-sm">Breakdown of lead statuses across the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <div className="text-xl md:text-2xl font-semibold tabular-nums text-foreground">{stats.statusBreakdown.Approved ?? 0}</div>
                <Badge variant="outline" className="gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Approved
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xl md:text-2xl font-semibold tabular-nums text-foreground">{stats.statusBreakdown['Needs Work'] ?? 0}</div>
                <Badge variant="outline" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3 text-amber-600" />
                  Needs Work
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xl md:text-2xl font-semibold tabular-nums text-foreground">{stats.statusBreakdown.Rejected ?? 0}</div>
                <Badge variant="outline" className="gap-1 text-xs">
                  <X className="h-3 w-3 text-red-600" />
                  Rejected
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xl md:text-2xl font-semibold tabular-nums text-foreground">{stats.statusBreakdown.Unknown ?? 0}</div>
                <Badge variant="outline" className="gap-1 text-xs">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  Unknown
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Status Overview - Prioritized View */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">Client Status Overview</CardTitle>
                <CardDescription className="text-sm">Monitor client progress and status</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/clients")} className="w-full sm:w-auto">
                View All Clients
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {(['urgent', 'unhappy', 'at_risk', 'on_track', 'happy'] as ClientStatus[]).map((status) => {
                const statusClients = clientsByStatus[status] || [];
                if (statusClients.length === 0) return null;

                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <h3 className="font-semibold text-base text-foreground">{getStatusLabel(status)}</h3>
                      <Badge variant="outline" className="ml-2 rounded-full text-xs px-2 py-0.5">{statusClients.length}</Badge>
                    </div>
                    <div className="overflow-hidden rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-semibold">Client</TableHead>
                            <TableHead className="text-xs font-semibold">Progress</TableHead>
                            <TableHead className="text-xs font-semibold">Leads/Day</TableHead>
                            <TableHead className="text-xs font-semibold">Days Remaining</TableHead>
                            <TableHead className="text-xs font-semibold">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statusClients.map((client) => {
                            // Use Airtable data if available, otherwise fallback to manual values
                            const leadsDelivered = client.airtable_leads_delivered ?? client.leads_fulfilled ?? 0;
                            const leadsPurchased = client.airtable_leads_purchased ?? client.leads_purchased ?? 0;
                            const completion = getCompletionPercentage(leadsDelivered, leadsPurchased);

                            // Calculate leads per day based on actual delivery
                            let calculatedLeadsPerDay: number | null = null;
                            if (client.onboarding_date && leadsDelivered > 0) {
                              const daysSinceStart = Math.max(1, Math.ceil(
                                (Date.now() - new Date(client.onboarding_date).getTime()) / (1000 * 60 * 60 * 24)
                              ));
                              calculatedLeadsPerDay = Math.round((leadsDelivered / daysSinceStart) * 10) / 10;
                            }
                            const displayLeadsPerDay = client.leads_per_day ?? calculatedLeadsPerDay;

                            // Calculate days remaining
                            let daysRemaining: number | null = null;
                            if (client.target_delivery_date) {
                              daysRemaining = getDaysRemaining(new Date(client.target_delivery_date));
                            } else if (displayLeadsPerDay && displayLeadsPerDay > 0 && leadsPurchased > leadsDelivered) {
                              // Estimate based on current rate
                              const remaining = leadsPurchased - leadsDelivered;
                              daysRemaining = Math.ceil(remaining / displayLeadsPerDay);
                            }

                            return (
                              <TableRow
                                key={client.id}
                                className={status === 'urgent' ? "bg-destructive/5" : ""}
                              >
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="text-sm text-foreground">{client.client_name}</div>
                                    <div className="text-xs text-muted-foreground">{client.email}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {leadsPurchased > 0 ? (
                                    <div>
                                      <div className="text-sm font-medium text-foreground">{completion}%</div>
                                      <div className="text-xs text-muted-foreground">
                                        {leadsDelivered} / {leadsPurchased}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {displayLeadsPerDay ? (
                                    <span className="text-sm font-medium text-foreground">{displayLeadsPerDay}</span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {daysRemaining !== null ? (
                                    <span className={daysRemaining < 0 ? "text-sm text-destructive font-semibold" : daysRemaining < 7 ? "text-sm text-warning font-medium" : "text-sm text-foreground"}>
                                      {daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : `${daysRemaining} days`}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={client.client_status || 'on_track'}
                                    onValueChange={(value) => handleUpdateStatus(client.id, value as ClientStatus)}
                                    disabled={updatingStatus === client.id}
                                  >
                                    <SelectTrigger className="w-32 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="happy">Happy</SelectItem>
                                      <SelectItem value="on_track">On Track</SelectItem>
                                      <SelectItem value="at_risk">At Risk</SelectItem>
                                      <SelectItem value="unhappy">Unhappy</SelectItem>
                                      <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
              
              {clients.filter(c => c.client_name).length === 0 && (
                <NoClientsEmpty onAction={() => navigate("/admin/invite")} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card hover="glow" className="cursor-pointer group" onClick={() => navigate("/admin/leads")}>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <FileText className="h-5 w-5 text-secondary" />
              </div>
              <CardTitle className="text-base font-semibold">All Leads</CardTitle>
              <CardDescription className="text-sm">View and manage all leads in the system</CardDescription>
            </CardHeader>
          </Card>

          <Card hover="glow" className="cursor-pointer group" onClick={() => navigate("/admin/clients")}>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-base font-semibold">Manage Clients</CardTitle>
              <CardDescription className="text-sm">View and configure client accounts</CardDescription>
            </CardHeader>
          </Card>

          <Card hover="glow" className="cursor-pointer group" onClick={() => navigate("/admin/invite")}>
            <CardHeader className="pb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <PlusCircle className="h-5 w-5 text-accent" />
              </div>
              <CardTitle className="text-base font-semibold">Invite Client</CardTitle>
              <CardDescription className="text-sm">Send invitation to new client</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
