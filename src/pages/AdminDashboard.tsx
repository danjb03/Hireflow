import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Users, FileText, PlusCircle, TrendingUp, AlertTriangle, Smile, Frown, Clock, CheckCircle2 } from "lucide-react";
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
      Unknown: "bg-blue-100 text-blue-700",
    };
    return colors[status] || "bg-blue-100 text-blue-700";
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">System overview and quick actions</p>
          </div>
          <Button 
            onClick={() => navigate("/admin/submit-lead")}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Submit Lead
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground">{stats.totalClients}</div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground mt-2">Across all clients</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-sm font-medium text-muted-foreground">Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold text-foreground">{stats.statusBreakdown.Approved}</div>
              <p className="text-xs text-muted-foreground mt-2">Approved leads</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-base font-medium">Leads by Status</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-semibold text-foreground">{stats.statusBreakdown.Approved}</div>
                <Badge className={`${getLeadStatusColor("Approved")} rounded-full`}>Approved</Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-semibold text-foreground">{stats.statusBreakdown['Needs Work']}</div>
                <Badge className={`${getLeadStatusColor("Needs Work")} rounded-full`}>Needs Work</Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-semibold text-foreground">{stats.statusBreakdown.Rejected}</div>
                <Badge className={`${getLeadStatusColor("Rejected")} rounded-full`}>Rejected</Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-semibold text-foreground">{stats.statusBreakdown.Unknown}</div>
                <Badge className={`${getLeadStatusColor("Unknown")} rounded-full`}>Unknown</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Status Overview - Prioritized View */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-6 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">Client Status Overview</CardTitle>
              <Button variant="outline" size="sm" onClick={() => navigate("/admin/clients")} className="transition-colors duration-200">
                View All Clients
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-6 p-6">
              {(['urgent', 'unhappy', 'at_risk', 'on_track', 'happy'] as ClientStatus[]).map((status) => {
                const statusClients = clientsByStatus[status] || [];
                if (statusClients.length === 0) return null;

                return (
                  <div key={status} className="space-y-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <h3 className="font-semibold text-lg text-foreground">{getStatusLabel(status)}</h3>
                      <Badge variant="outline" className="ml-2 rounded-full">{statusClients.length}</Badge>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="font-medium">Client</TableHead>
                            <TableHead className="font-medium">Progress</TableHead>
                            <TableHead className="font-medium">Leads/Day</TableHead>
                            <TableHead className="font-medium">Days Remaining</TableHead>
                            <TableHead className="font-medium">Status</TableHead>
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
                                className={`${status === 'urgent' ? "bg-destructive/5" : ""} hover:bg-muted/50 transition-colors duration-200`}
                              >
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="text-foreground">{client.client_name}</div>
                                    <div className="text-xs text-muted-foreground">{client.email}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {client.leads_purchased ? (
                                    <div className="text-sm">
                                      <div className="font-medium text-foreground">{completion}%</div>
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
                                    <span className={daysRemaining < 0 ? "text-destructive font-bold" : daysRemaining < 7 ? "text-warning font-medium" : "text-sm text-foreground"}>
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
                                    <SelectTrigger className="w-32">
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
                  <p>No active clients yet. Invite clients to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors duration-200 shadow-sm border-border rounded-lg" onClick={() => navigate("/admin/leads")}>
            <CardContent className="p-6">
              <CardTitle className="text-sm font-medium flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                All Leads
              </CardTitle>
              <p className="text-sm text-muted-foreground">View and manage all leads in the system</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors duration-200 shadow-sm border-border rounded-lg" onClick={() => navigate("/admin/clients")}>
            <CardContent className="p-6">
              <CardTitle className="text-sm font-medium flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Manage Clients
              </CardTitle>
              <p className="text-sm text-muted-foreground">View and configure client accounts</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-muted/50 transition-colors duration-200 shadow-sm border-border rounded-lg" onClick={() => navigate("/admin/invite")}>
            <CardContent className="p-6">
              <CardTitle className="text-sm font-medium flex items-center gap-2 mb-2">
                <PlusCircle className="h-4 w-4 text-muted-foreground" />
                Invite Client
              </CardTitle>
              <p className="text-sm text-muted-foreground">Send invitation to new client</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
