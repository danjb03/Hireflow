import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Users, FileText, PlusCircle, AlertTriangle, Smile, Frown, Clock, CheckCircle2, X } from "lucide-react";
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
  airtable_campaign_start_date?: string | null;
  airtable_target_end_date?: string | null;
}

interface AirtableClientStats {
  id: string;
  name: string;
  leadsPurchased: number;
  leadsDelivered: number;
  leadsRemaining: number;
  campaignStartDate: string | null;
  targetEndDate: string | null;
  firstLeadDate: string | null;
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
      const enhancedClients = ((profilesResult.data || []) as Client[]).map((client) => {
        if (client.airtable_client_id && airtableStatsMap[client.airtable_client_id]) {
          const airtableStats = airtableStatsMap[client.airtable_client_id];
          return {
            ...client,
            airtable_leads_purchased: airtableStats.leadsPurchased,
            airtable_leads_delivered: airtableStats.leadsDelivered,
            airtable_campaign_start_date: airtableStats.campaignStartDate,
            airtable_target_end_date: airtableStats.targetEndDate,
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

  if (isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="-mx-4 -my-6 space-y-4 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
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
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              Admin overview
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">
              <span className="text-[#222121]/40">Monitor the</span>{" "}
              <span className="text-[#222121]">Hireflow pipeline.</span>
            </h1>
            <p className="text-sm text-[#222121]/60">
              System health, lead progress, and client delivery status.
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/submit-lead")}
            variant="ghost"
            className="h-11 w-full rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E] hover:shadow-[0_8px_24px_rgba(52,177,146,0.35)] sm:w-auto"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Submit Lead
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5 stagger-children">
          <Card
            hover="none"
            className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                  <Users className="h-5 w-5 text-[#34B192]" />
                </div>
              </div>
              <div className="mb-1 text-3xl font-semibold tabular-nums text-[#222121] md:text-4xl">
                {stats.totalClients}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
                Active Clients
              </p>
            </CardContent>
          </Card>

          <Card
            hover="none"
            className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                  <FileText className="h-5 w-5 text-[#34B192]" />
                </div>
              </div>
              <div className="mb-1 text-3xl font-semibold tabular-nums text-[#222121] md:text-4xl">
                {stats.totalLeads}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
                Total Leads
              </p>
            </CardContent>
          </Card>

          <Card
            hover="none"
            className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                  <CheckCircle2 className="h-5 w-5 text-[#34B192]" />
                </div>
              </div>
              <div className="mb-1 text-3xl font-semibold tabular-nums text-[#222121] md:text-4xl">
                {stats.statusBreakdown.Approved}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
                Approved
              </p>
            </CardContent>
          </Card>

          <Card
            hover="none"
            className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                  <AlertTriangle className="h-5 w-5 text-[#34B192]" />
                </div>
              </div>
              <div className="mb-1 text-3xl font-semibold tabular-nums text-[#222121] md:text-4xl">
                {stats.statusBreakdown["Needs Work"]}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
                Needs Work
              </p>
            </CardContent>
          </Card>

          <Card
            hover="none"
            className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
          >
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#34B192]/10">
                  <X className="h-5 w-5 text-[#34B192]" />
                </div>
              </div>
              <div className="mb-1 text-3xl font-semibold tabular-nums text-[#222121] md:text-4xl">
                {stats.statusBreakdown.Rejected}
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
                Rejected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status Breakdown */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-[#222121]">
              Leads by Status
            </CardTitle>
            <CardDescription className="text-sm text-[#222121]/60">
              Breakdown of lead statuses across the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2">
                <div className="text-xl font-semibold tabular-nums text-[#222121] md:text-2xl">
                  {stats.statusBreakdown.Approved ?? 0}
                </div>
                <Badge
                  variant="outline"
                  className="gap-1 rounded-full border-transparent bg-[#34B192] px-2.5 py-0.5 text-xs text-white"
                >
                  <CheckCircle2 className="h-3 w-3 text-white" />
                  Approved
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xl font-semibold tabular-nums text-[#222121] md:text-2xl">
                  {stats.statusBreakdown["Needs Work"] ?? 0}
                </div>
                <Badge
                  variant="outline"
                  className="gap-1 rounded-full border-transparent bg-amber-500 px-2.5 py-0.5 text-xs text-white"
                >
                  <AlertTriangle className="h-3 w-3 text-white" />
                  Needs Work
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xl font-semibold tabular-nums text-[#222121] md:text-2xl">
                  {stats.statusBreakdown.Rejected ?? 0}
                </div>
                <Badge
                  variant="outline"
                  className="gap-1 rounded-full border-transparent bg-red-500 px-2.5 py-0.5 text-xs text-white"
                >
                  <X className="h-3 w-3 text-white" />
                  Rejected
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xl font-semibold tabular-nums text-[#222121] md:text-2xl">
                  {stats.statusBreakdown.Unknown ?? 0}
                </div>
                <Badge
                  variant="outline"
                  className="gap-1 rounded-full border-transparent bg-[#222121]/40 px-2.5 py-0.5 text-xs text-white"
                >
                  <FileText className="h-3 w-3 text-white" />
                  Unknown
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Status Overview - Prioritized View */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold text-[#222121]">
                  Client Status Overview
                </CardTitle>
                <CardDescription className="text-sm text-[#222121]/60">
                  Monitor client progress and status
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin/clients")}
                className="h-9 w-full rounded-full border border-[#222121]/10 bg-white px-4 text-xs font-semibold text-[#222121] transition-all hover:border-[#222121]/20 hover:bg-[#34B192]/5 sm:w-auto"
              >
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
                      <span className="text-[#34B192]">{getStatusIcon(status)}</span>
                      <h3 className="text-base font-semibold text-[#222121]">
                        {getStatusLabel(status)}
                      </h3>
                      <Badge className="ml-2 rounded-full border border-[#222121]/10 bg-white px-2 py-0.5 text-xs text-[#222121]/60">
                        {statusClients.length}
                      </Badge>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-[#222121]/10">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                              Client
                            </TableHead>
                            <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                              Progress
                            </TableHead>
                            <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                              Leads/Day
                            </TableHead>
                            <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                              Days Remaining
                            </TableHead>
                            <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                              Status
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {statusClients.map((client) => {
                            // Use Airtable data if available, otherwise fallback to manual values
                            const leadsDelivered = client.airtable_leads_delivered ?? client.leads_fulfilled ?? 0;
                            const leadsPurchased = client.airtable_leads_purchased ?? client.leads_purchased ?? 0;
                            const completion = getCompletionPercentage(leadsDelivered, leadsPurchased);

                            // Use Airtable campaign start date, fallback to Supabase onboarding_date
                            const campaignStartDate = client.airtable_campaign_start_date || client.onboarding_date;

                            // Calculate leads per day based on actual delivery
                            let calculatedLeadsPerDay: number | null = null;
                            if (campaignStartDate && leadsDelivered > 0) {
                              const daysSinceStart = Math.max(1, Math.ceil(
                                (Date.now() - new Date(campaignStartDate).getTime()) / (1000 * 60 * 60 * 24)
                              ));
                              calculatedLeadsPerDay = Math.round((leadsDelivered / daysSinceStart) * 10) / 10;
                            }
                            const displayLeadsPerDay = client.leads_per_day ?? calculatedLeadsPerDay;

                            // Use Airtable target end date, fallback to Supabase target_delivery_date
                            const targetEndDate = client.airtable_target_end_date || client.target_delivery_date;

                            // Calculate days remaining
                            let daysRemaining: number | null = null;
                            if (targetEndDate) {
                              daysRemaining = getDaysRemaining(new Date(targetEndDate));
                            } else if (displayLeadsPerDay && displayLeadsPerDay > 0 && leadsPurchased > leadsDelivered) {
                              // Estimate based on current rate
                              const remaining = leadsPurchased - leadsDelivered;
                              daysRemaining = Math.ceil(remaining / displayLeadsPerDay);
                            }

                            return (
                              <TableRow
                                key={client.id}
                                className={status === "urgent" ? "bg-[#34B192]/5" : ""}
                              >
                                <TableCell className="font-medium">
                                  <div>
                                    <div className="text-sm text-[#222121]">{client.client_name}</div>
                                    <div className="text-xs text-[#222121]/50">{client.email}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {leadsPurchased > 0 ? (
                                    <div>
                                      <div className="text-sm font-medium text-[#222121]">
                                        {completion}%
                                      </div>
                                      <div className="text-xs text-[#222121]/50">
                                        {leadsDelivered} / {leadsPurchased}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-[#222121]/50">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {displayLeadsPerDay ? (
                                    <span className="text-sm font-medium text-[#222121]">
                                      {displayLeadsPerDay}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-[#222121]/50">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {daysRemaining !== null ? (
                                    <span
                                      className={
                                        daysRemaining < 0
                                          ? "text-sm font-semibold text-[#222121]"
                                          : daysRemaining < 7
                                            ? "text-sm font-medium text-[#222121]"
                                            : "text-sm text-[#222121]"
                                      }
                                    >
                                      {daysRemaining < 0
                                        ? `${Math.abs(daysRemaining)} overdue`
                                        : `${daysRemaining} days`}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-[#222121]/50">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={client.client_status || 'on_track'}
                                    onValueChange={(value) => handleUpdateStatus(client.id, value as ClientStatus)}
                                    disabled={updatingStatus === client.id}
                                  >
                                    <SelectTrigger className="h-9 w-32 rounded-full border-[#222121]/10 bg-white text-xs text-[#222121]">
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
          <Card
            hover="none"
            className="group cursor-pointer border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
            onClick={() => navigate("/admin/leads")}
          >
            <CardHeader className="pb-3">
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10 transition-transform group-hover:scale-105">
                <FileText className="h-5 w-5 text-[#34B192]" />
              </div>
              <CardTitle className="text-base font-semibold text-[#222121]">All Leads</CardTitle>
              <CardDescription className="text-sm text-[#222121]/60">
                View and manage all leads in the system
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            hover="none"
            className="group cursor-pointer border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
            onClick={() => navigate("/admin/clients")}
          >
            <CardHeader className="pb-3">
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10 transition-transform group-hover:scale-105">
                <Users className="h-5 w-5 text-[#34B192]" />
              </div>
              <CardTitle className="text-base font-semibold text-[#222121]">
                Manage Clients
              </CardTitle>
              <CardDescription className="text-sm text-[#222121]/60">
                View and configure client accounts
              </CardDescription>
            </CardHeader>
          </Card>

          <Card
            hover="none"
            className="group cursor-pointer border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
            onClick={() => navigate("/admin/invite")}
          >
            <CardHeader className="pb-3">
              <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-[#34B192]/10 transition-transform group-hover:scale-105">
                <PlusCircle className="h-5 w-5 text-[#34B192]" />
              </div>
              <CardTitle className="text-base font-semibold text-[#222121]">
                Invite Client
              </CardTitle>
              <CardDescription className="text-sm text-[#222121]/60">
                Send invitation to new client
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
