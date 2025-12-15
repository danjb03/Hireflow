import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Users, FileText, PlusCircle, TrendingUp, TrendingDown, AlertTriangle, Smile, Frown, Clock, CheckCircle2, ArrowUpRight, X } from "lucide-react";
import { getCompletionPercentage, getDaysRemaining, getPriorityScore } from "@/lib/clientOnboarding";
import AdminLayout from "@/components/AdminLayout";

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

  useEffect(() => {
    checkAdminAndLoadStats();
  }, []);

  const checkAdminAndLoadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = roles?.some(r => r.role === "admin");
      
      if (!isAdmin) {
        toast.error("Access denied - Admin only");
        navigate("/dashboard");
        return;
      }

      // Load stats and clients
      await Promise.all([loadStats(), loadClients()]);
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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .not("client_name", "is", null)
        .neq("client_name", "")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setClients(data || []);
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
      Approved: "bg-emerald-100 text-emerald-700",
      Rejected: "bg-red-100 text-red-700",
      'Needs Work': "bg-amber-100 text-amber-700",
      Unknown: "bg-emerald-100 text-emerald-700",
      'Not Qualified': "bg-gray-100 text-gray-700",
    };
    return colors[status] || "bg-emerald-100 text-emerald-700";
  };

  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, []);

  if (isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Clients</p>
                <Badge variant="outline" className="h-4 px-1.5">
                  <TrendingUp className="h-2.5 w-2.5" />
                </Badge>
              </div>
              <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground mb-1">{stats.totalClients}</div>
              <p className="text-xs text-muted-foreground">Active accounts</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Leads</p>
                <Badge variant="outline" className="h-4 px-1.5">
                  <TrendingUp className="h-2.5 w-2.5" />
                </Badge>
              </div>
              <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground mb-1">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">Across all clients</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approved Leads</p>
                <Badge variant="outline" className="h-4 px-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                </Badge>
              </div>
              <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground mb-1">{stats.statusBreakdown.Approved}</div>
              <p className="text-xs text-muted-foreground">Successfully approved</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Needs Work</p>
                <Badge variant="outline" className="h-4 px-1.5">
                  <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
                </Badge>
              </div>
              <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground mb-1">{stats.statusBreakdown['Needs Work']}</div>
              <p className="text-xs text-muted-foreground">Requiring attention</p>
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
                            const completion = getCompletionPercentage(
                              client.leads_fulfilled || 0,
                              client.leads_purchased || 0
                            );
                            const daysRemaining = client.target_delivery_date 
                              ? getDaysRemaining(new Date(client.target_delivery_date))
                              : null;
                            
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
                                  {client.leads_purchased ? (
                                    <div>
                                      <div className="text-sm font-medium text-foreground">{completion}%</div>
                                      <div className="text-xs text-muted-foreground">
                                        {client.leads_fulfilled || 0} / {client.leads_purchased}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {client.leads_per_day ? (
                                    <span className="text-sm font-medium text-foreground">{client.leads_per_day}</span>
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
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No active clients yet. Invite clients to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors shadow-sm border" onClick={() => navigate("/admin/leads")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                All Leads
              </CardTitle>
              <CardDescription className="text-xs">View and manage all leads in the system</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors shadow-sm border" onClick={() => navigate("/admin/clients")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Manage Clients
              </CardTitle>
              <CardDescription className="text-xs">View and configure client accounts</CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:bg-accent/50 transition-colors shadow-sm border" onClick={() => navigate("/admin/invite")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Invite Client
              </CardTitle>
              <CardDescription className="text-xs">Send invitation to new client</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
