import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, Trash2, Key, Save, X, UserX, Users, CheckCircle2, AlertTriangle, Smile, Frown, Clock, Building2, ExternalLink, Edit, Search, ChevronDown, ChevronUp, Info, Target } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getCompletionPercentage, getDaysRemaining } from "@/lib/clientOnboarding";
import AdminLayout from "@/components/AdminLayout";
import { NoClientsEmpty } from "@/components/EmptyState";
import { SkeletonStats, SkeletonCard } from "@/components/Skeleton";

type ClientStatus = 'happy' | 'unhappy' | 'urgent' | 'at_risk' | 'on_track';

interface LeadStats {
  total: number;
  new: number;
  approved: number;
  needsWork: number;
  rejected: number;
  booked: number;
  approvalRate: number;
  feedbackCount: number;
  recentFeedback: string | null;
}

interface Client {
  id: string;
  email: string;
  client_name: string | null;
  initial_password: string | null;
  created_at: string;
  leads_purchased?: number | null;
  onboarding_date?: string | null;
  target_delivery_date?: string | null;
  leads_per_day?: number | null;
  leads_fulfilled?: number | null;
  client_status?: ClientStatus | null;
  airtable_client_id?: string | null;
}

interface AirtableClientData {
  'Contact Person'?: string;
  'Phone'?: string;
  'Company Website'?: string;
  'Company Name'?: string;
  'Location'?: string;
  'Markets they serve (locations)'?: string;
  'Industries they serve'?: string;
  'Sub-industries/specializations'?: string;
  'Types of roles they hire for'?: string;
  'Contingent or temporary staffing?'?: string;
  'Last 5 roles placed'?: string;
  'Last 5 companies worked with (for lookalike targeting)'?: string;
  '5 current candidates (for candidate-led campaigns)'?: string;
  'Their USPs in their own words'?: string;
  'Niches they\'ve done well in'?: string;
  'Typical outreach/acquisition methods'?: string;
}

interface AirtableClientWithStats {
  id: string;
  name: string;
  email?: string | null;
  status?: string | null;
  phone?: string | null;
  companyName?: string | null;
  contactPerson?: string | null;
  leadsPurchased: number;
  leadsDelivered: number;
  leadsRemaining: number;
  campaignStartDate?: string | null;
  targetEndDate?: string | null;
  leadStats: {
    total: number;
    new: number;
    approved: number;
    rejected: number;
    needsWork: number;
    booked: number;
  } | null;
}

const AdminClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingAirtableClientId, setEditingAirtableClientId] = useState<string>("");
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [airtableClients, setAirtableClients] = useState<Array<{id: string, name: string, email?: string | null}>>([]);
  const [airtableClientsWithStats, setAirtableClientsWithStats] = useState<AirtableClientWithStats[]>([]);
  const [loadingAirtableClientsWithStats, setLoadingAirtableClientsWithStats] = useState(true);
  const [clientStatusFilter, setClientStatusFilter] = useState<string>("all");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [airtableData, setAirtableData] = useState<Record<string, AirtableClientData>>({});
  const [loadingAirtableData, setLoadingAirtableData] = useState<Set<string>>(new Set());
  const [sentimentData, setSentimentData] = useState<Record<string, LeadStats>>({});
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [attachedUsers, setAttachedUsers] = useState<Record<string, string>>({});
  const [editingCell, setEditingCell] = useState<{ clientId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [savingClient, setSavingClient] = useState<string | null>(null);
  const [clientOrders, setClientOrders] = useState<Record<string, {
    totalOrdered: number;
    totalDelivered: number;
    startDate: string | null;
    endDate: string | null;
  }>>({});

  useEffect(() => {
    checkAdminAndLoadClients();
    loadAirtableClients();
    loadAirtableClientsWithStats();
    loadAttachedUsersAndOrders();
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, []);

  const loadAttachedUsersAndOrders = async () => {
    try {
      // Fetch profiles with airtable_client_id
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, airtable_client_id')
        .not('airtable_client_id', 'is', null);

      if (profilesError) {
        console.error("Error loading attached users:", profilesError);
        return;
      }

      // Build a map of airtable_client_id -> user email
      const usersMap: Record<string, string> = {};
      const userIdToAirtableId: Record<string, string> = {};
      for (const profile of profiles || []) {
        if (profile.airtable_client_id && profile.email) {
          usersMap[profile.airtable_client_id] = profile.email;
          userIdToAirtableId[profile.id] = profile.airtable_client_id;
        }
      }
      setAttachedUsers(usersMap);

      // Fetch all orders
      const { data: ordersData, error: ordersError } = await supabase.functions.invoke("get-orders");

      if (ordersError) {
        console.error("Error loading orders:", ordersError);
        return;
      }

      // Build a map of airtable_client_id -> aggregated order stats
      const ordersMap: Record<string, {
        totalOrdered: number;
        totalDelivered: number;
        startDate: string | null;
        endDate: string | null;
      }> = {};

      for (const order of ordersData?.orders || []) {
        const airtableClientId = userIdToAirtableId[order.client_id];
        if (!airtableClientId) continue;

        if (!ordersMap[airtableClientId]) {
          ordersMap[airtableClientId] = {
            totalOrdered: 0,
            totalDelivered: 0,
            startDate: null,
            endDate: null,
          };
        }

        ordersMap[airtableClientId].totalOrdered += order.leads_purchased || 0;
        ordersMap[airtableClientId].totalDelivered += order.leads_delivered || 0;

        // Use earliest start date and latest end date
        if (order.created_at) {
          const orderStart = order.created_at.split('T')[0];
          if (!ordersMap[airtableClientId].startDate || orderStart < ordersMap[airtableClientId].startDate) {
            ordersMap[airtableClientId].startDate = orderStart;
          }
        }
        if (order.target_delivery_date) {
          const orderEnd = order.target_delivery_date.split('T')[0];
          if (!ordersMap[airtableClientId].endDate || orderEnd > ordersMap[airtableClientId].endDate) {
            ordersMap[airtableClientId].endDate = orderEnd;
          }
        }
      }

      setClientOrders(ordersMap);
    } catch (error) {
      console.error("Error loading attached users and orders:", error);
    }
  };

  const loadAirtableClientsWithStats = async () => {
    setLoadingAirtableClientsWithStats(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-airtable-clients", {
        body: { includeStats: true }
      });

      if (error || data?.error) {
        const message = error?.message || data?.error || "Failed to load Airtable clients with stats";
        console.error("Error loading Airtable clients with stats:", error || data?.error);
        toast.error(message);
        return;
      }

      if (data?.clients) {
        setAirtableClientsWithStats(data.clients);
      }
    } catch (error) {
      console.error("Error loading Airtable clients with stats:", error);
    } finally {
      setLoadingAirtableClientsWithStats(false);
    }
  };

  const loadAirtableClients = async () => {
    setLoadingOptions(true);
    try {
      // Load clients from Airtable (source of truth)
      const { data, error } = await supabase.functions.invoke("get-airtable-clients");

      if (error || data?.error) {
        const message = error?.message || data?.error || "Failed to load Airtable clients";
        console.warn("Airtable function error:", error || data?.error);
        toast.error(message);
        setAirtableClients([]);
        return;
      }

      if (!data || !data.clients) {
        console.warn("No clients data returned from Airtable");
        toast.error("No clients data returned from Airtable");
        setAirtableClients([]);
        return;
      }

      setAirtableClients(data.clients || []);
    } catch (error: any) {
      console.warn("Failed to load clients from Airtable:", error);
      toast.error(error?.message || "Failed to load clients from Airtable");
      setAirtableClients([]);
    } finally {
      setLoadingOptions(false);
    }
  };

  const checkAdminAndLoadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

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

      await loadClients();
    } catch (error: any) {
      toast.error("Failed to load clients");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      // Load profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Load user roles to exclude admins and reps
      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Build a set of user IDs that are admins or reps (internal users)
      const internalUserIds = new Set(
        (allRoles || [])
          .filter(r => r.role === 'admin' || r.role === 'rep')
          .map(r => r.user_id)
      );

      // Filter out internal users - only show actual clients
      const clientProfiles = (profiles || []).filter(p => !internalUserIds.has(p.id));

      setClients(clientProfiles.map(p => ({
        ...p,
        client_status: p.client_status as ClientStatus | null
      })) as Client[]);
      // Load sentiment data after clients are loaded
      loadSentimentData();
    } catch (error: any) {
      console.error("Error loading clients:", error);
      toast.error("Failed to load clients");
    }
  };

  const loadSentimentData = async () => {
    setLoadingSentiment(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-client-sentiment");

      if (error) {
        console.warn("Failed to load sentiment data:", error);
        return;
      }

      setSentimentData(data?.sentiment || {});
    } catch (error: any) {
      console.warn("Failed to load sentiment data:", error);
    } finally {
      setLoadingSentiment(false);
    }
  };

  const fetchAirtableClientData = async (clientId: string, airtableClientId: string | null | undefined) => {
    if (!airtableClientId) {
      // No Airtable ID, set empty data
      setAirtableData(prev => ({
        ...prev,
        [clientId]: {}
      }));
      return;
    }
    
    if (airtableData[clientId]) return; // Already loaded
    
    setLoadingAirtableData(prev => new Set(prev).add(clientId));
    try {
      const { data, error } = await supabase.functions.invoke("get-airtable-client-data", {
        body: { airtableClientId }
      });

      if (error) throw error;

      setAirtableData(prev => ({
        ...prev,
        [clientId]: data?.fields || {}
      }));
    } catch (error: any) {
      console.error("Error loading Airtable data:", error);
      // Set empty data on error
      setAirtableData(prev => ({
        ...prev,
        [clientId]: {}
      }));
    } finally {
      setLoadingAirtableData(prev => {
        const next = new Set(prev);
        next.delete(clientId);
        return next;
      });
    }
  };

  const toggleCardExpansion = (clientId: string, airtableClientId?: string | null) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
      // Fetch Airtable data when expanding
      fetchAirtableClientData(clientId, airtableClientId);
    }
    setExpandedCards(newExpanded);
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
        return <Smile className="h-4 w-4" />;
    }
  };

  const needsHelp = (client: Client): boolean => {
    return client.client_status === 'urgent' || 
           client.client_status === 'unhappy' || 
           client.client_status === 'at_risk';
  };

  const handleUpdateClient = async (clientId: string, airtableClientId: string) => {
    try {
      // Find the client name from the selected Airtable client
      const selectedClient = airtableClients.find(c => c.id === airtableClientId);
      if (!selectedClient) {
        toast.error("Selected client not found");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ 
          client_name: selectedClient.name,
          airtable_client_id: airtableClientId
        })
        .eq("id", clientId);

      if (error) throw error;

      toast.success("Client linked to Airtable record successfully");
      setEditingClient(null);
      setEditingAirtableClientId("");
      loadClients();
    } catch (error: any) {
      toast.error("Failed to update client: " + error.message);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    try {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId: client.id }
      });

      if (error) throw error;

      toast.success("Client deleted successfully");
      setDeleteClient(null);
      loadClients();
    } catch (error: any) {
      toast.error("Failed to delete client: " + error.message);
    }
  };

  const handleResetPassword = async (clientId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("reset-client-password", {
        body: { clientId }
      });

      if (error) throw error;

      toast.success(`Password reset! New password: ${data.newPassword}`);
      setResettingPassword(null);
      loadClients();
    } catch (error: any) {
      toast.error("Failed to reset password: " + error.message);
    }
  };

  const startEditing = (clientId: string, field: string, currentValue: string | number | null | undefined) => {
    setEditingCell({ clientId, field });
    setEditValue(currentValue?.toString() || "");
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const saveAirtableField = async (clientId: string, field: string, value: string) => {
    setSavingClient(clientId);
    try {
      const fields: Record<string, any> = {};

      if (field === 'leadsPurchased') {
        fields.leadsPurchased = parseInt(value) || 0;
      } else if (field === 'campaignStartDate') {
        fields.campaignStartDate = value || null;
      } else if (field === 'targetEndDate') {
        fields.targetEndDate = value || null;
      }

      const { data, error } = await supabase.functions.invoke("update-airtable-client", {
        body: { clientId, fields }
      });

      if (error) throw error;

      toast.success("Updated successfully");

      // Update local state
      setAirtableClientsWithStats(prev => prev.map(client => {
        if (client.id === clientId) {
          if (field === 'leadsPurchased') {
            const newPurchased = parseInt(value) || 0;
            return {
              ...client,
              leadsPurchased: newPurchased,
              leadsRemaining: Math.max(0, newPurchased - client.leadsDelivered)
            };
          } else if (field === 'campaignStartDate') {
            return { ...client, campaignStartDate: value || null };
          } else if (field === 'targetEndDate') {
            return { ...client, targetEndDate: value || null };
          }
        }
        return client;
      }));

      setEditingCell(null);
      setEditValue("");
    } catch (error: any) {
      console.error("Error saving to Airtable:", error);
      toast.error("Failed to save: " + error.message);
    } finally {
      setSavingClient(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, clientId: string, field: string) => {
    if (e.key === 'Enter') {
      saveAirtableField(clientId, field, editValue);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  const activeClients = clients.filter(c => c.client_name);
  const pendingUsers = clients.filter(c => !c.client_name);

  if (isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-8 w-32 bg-muted/60 rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted/60 rounded animate-pulse" />
            </div>
            <div className="h-10 w-32 bg-muted/60 rounded animate-pulse" />
          </div>
          <SkeletonStats />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
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
              Client management
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">
              <span className="text-[#222121]/40">Manage your</span>{" "}
              <span className="text-[#222121]">active client base.</span>
            </h1>
            <p className="text-sm text-[#222121]/60">
              {activeClients.length} active clients • {pendingUsers.length} pending users
            </p>
          </div>
          <Button
            onClick={() => navigate("/admin/invite")}
            variant="ghost"
            className="h-11 w-full rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E] hover:shadow-[0_8px_24px_rgba(52,177,146,0.35)] sm:w-auto"
          >
            <Mail className="mr-2 h-4 w-4" />
            Invite Client
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#222121]/50">Airtable Clients</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[#222121]">
                {airtableClientsWithStats.length}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#222121]/50">Active Clients</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[#34B192]">
                {airtableClientsWithStats.filter(c => c.status !== 'Inactive' && c.status !== 'Not Active').length}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#222121]/50">Leads Delivered</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[#222121]">
                {airtableClientsWithStats.reduce((sum, c) => sum + c.leadsDelivered, 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#222121]/50">Platform Users</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[#222121]">
                {clients.length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Sentiment Summary */}
        {Object.keys(sentimentData).length > 0 && (
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <Target className="h-5 w-5 text-[#34B192]" />
                Overall Lead Performance
              </CardTitle>
              <CardDescription className="text-[#222121]/60">
                Aggregate statistics across all clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const totals = Object.values(sentimentData).reduce(
                  (acc, stats) => ({
                    total: acc.total + stats.total,
                    new: acc.new + stats.new,
                    approved: acc.approved + stats.approved + stats.booked,
                    needsWork: acc.needsWork + stats.needsWork,
                    rejected: acc.rejected + stats.rejected,
                    feedbackCount: acc.feedbackCount + stats.feedbackCount,
                  }),
                  { total: 0, new: 0, approved: 0, needsWork: 0, rejected: 0, feedbackCount: 0 }
                );
                const processed = totals.approved + totals.needsWork + totals.rejected;
                const overallApprovalRate = processed > 0 ? Math.round((totals.approved / processed) * 100) : 0;

                return (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                    <div className="rounded-2xl border border-[#222121]/10 bg-white p-4 text-center">
                      <p className="text-3xl font-semibold text-[#222121]">{totals.total}</p>
                      <p className="text-sm text-[#222121]/60">Total Leads</p>
                    </div>
                    <div className="rounded-2xl border border-[#222121]/10 bg-white p-4 text-center">
                      <p className="text-3xl font-semibold text-[#34B192]">{totals.new}</p>
                      <p className="text-sm text-[#222121]/60">New</p>
                    </div>
                    <div className="rounded-2xl border border-[#222121]/10 bg-white p-4 text-center">
                      <p className="text-3xl font-semibold text-[#34B192]">{totals.approved}</p>
                      <p className="text-sm text-[#222121]/60">Approved</p>
                    </div>
                    <div className="rounded-2xl border border-[#222121]/10 bg-white p-4 text-center">
                      <p className="text-3xl font-semibold text-[#222121]">{totals.needsWork}</p>
                      <p className="text-sm text-[#222121]/60">Needs Work</p>
                    </div>
                    <div className="rounded-2xl border border-[#222121]/10 bg-white p-4 text-center">
                      <p className="text-3xl font-semibold text-[#222121]">{totals.rejected}</p>
                      <p className="text-sm text-[#222121]/60">Rejected</p>
                    </div>
                    <div className="rounded-2xl border border-[#222121]/10 bg-white p-4 text-center">
                      <p className="text-3xl font-semibold text-[#222121]">{overallApprovalRate}%</p>
                      <p className="text-sm text-[#222121]/60">Approval Rate</p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Pending Users Section */}
        {pendingUsers.length > 0 && (
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserX className="h-5 w-5 text-[#34B192]" />
                    Pending Users
                  </CardTitle>
                  <CardDescription className="text-[#222121]/60">
                    Review and approve or delete new signups
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full border-[#222121]/10 bg-white px-2.5 py-0.5 text-xs text-[#222121]/60"
                >
                  {pendingUsers.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border border-[#222121]/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Email</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Client Name</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Signed Up</TableHead>
                      <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-[#222121]/40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="text-sm font-medium text-[#222121]">{user.email}</TableCell>
                      <TableCell>
                        {editingClient === user.id ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={editingAirtableClientId}
                              onValueChange={setEditingAirtableClientId}
                            >
                              <SelectTrigger className="h-9 w-48 rounded-full border-[#222121]/10 bg-white text-xs text-[#222121]">
                                <SelectValue placeholder="Select client from Airtable" />
                              </SelectTrigger>
                              <SelectContent>
                                {loadingOptions ? (
                                  <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                                ) : airtableClients.length === 0 ? (
                                  <div className="p-2 text-sm text-muted-foreground">No clients in Airtable</div>
                                ) : (
                                  airtableClients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                      {client.name} {client.email && `(${client.email})`}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateClient(user.id, editingAirtableClientId)}
                              disabled={!editingAirtableClientId}
                              className="h-9 rounded-full bg-[#34B192] px-3 text-white transition-all hover:bg-[#2D9A7E]"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingClient(null);
                                setEditingAirtableClientId("");
                              }}
                              className="transition-colors duration-200"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-[#222121]/50">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-[#222121]/50">
                        {new Date(user.created_at).toLocaleDateString()} at {new Date(user.created_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingClient !== user.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                          onClick={() => {
                            setEditingClient(user.id);
                            setEditingAirtableClientId("");
                          }}
                              className="text-[#34B192] hover:text-[#2D9A7E] transition-colors duration-200"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteClient(user)}
                            className="text-red-500 hover:text-red-600 transition-colors duration-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clients Needing Help */}
        {activeClients.filter(needsHelp).length > 0 && (
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-[#34B192]" />
                    Clients Needing Help
                  </CardTitle>
                  <CardDescription className="text-[#222121]/60">
                    Clients requiring immediate attention
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full border-[#222121]/10 bg-white px-2.5 py-0.5 text-xs text-[#222121]/60"
                >
                  {activeClients.filter(needsHelp).length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-2xl border border-[#222121]/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Client</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Status</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Progress</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Days Remaining</TableHead>
                      <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-[#222121]/40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {activeClients.filter(needsHelp).map((client) => {
                    const completion = getCompletionPercentage(
                      client.leads_fulfilled || 0,
                      client.leads_purchased || 0
                    );
                    const daysRemaining = client.target_delivery_date 
                      ? getDaysRemaining(new Date(client.target_delivery_date))
                      : null;
                    
                    return (
                      <TableRow key={client.id} className="bg-[#34B192]/5">
                        <TableCell className="text-sm font-medium text-[#222121]">
                          <div>
                            <div>{client.client_name}</div>
                            <div className="text-xs text-[#222121]/50">{client.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="gap-1 rounded-full border-[#222121]/10 bg-white text-xs text-[#222121]/60"
                          >
                            <span className="text-[#34B192]">{getStatusIcon(client.client_status)}</span>
                            <span className="capitalize">{client.client_status || "on_track"}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {client.leads_purchased ? (
                            <div className="text-sm">
                              <div className="font-medium text-[#222121]">{completion}%</div>
                              <div className="text-xs text-[#222121]/50">
                                {client.leads_fulfilled || 0} / {client.leads_purchased}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-[#222121]/50">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {daysRemaining !== null ? (
                            <span className="text-sm text-[#222121]">
                              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : `${daysRemaining} days`}
                            </span>
                          ) : (
                            <span className="text-sm text-[#222121]/50">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
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
            </CardContent>
          </Card>
        )}

        {/* Airtable Clients Section */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#34B192]" />
                  Clients
                </CardTitle>
                <CardDescription className="text-[#222121]/60">
                  All clients from Airtable with lead stats
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                  <SelectTrigger className="h-9 w-32 rounded-full border-[#222121]/10 bg-white text-xs text-[#222121]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAirtableClientsWithStats ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading clients...</span>
              </div>
            ) : airtableClientsWithStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No clients found in Airtable
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#222121]/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Client Name</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Contact</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Attached User</TableHead>
                      <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-[#222121]/40">Status</TableHead>
                      <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-[#222121]/40">Ordered</TableHead>
                      <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-[#222121]/40">Delivered</TableHead>
                      <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-[#222121]/40">Remaining</TableHead>
                      <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-[#222121]/40">Start Date</TableHead>
                      <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-[#222121]/40">End Date</TableHead>
                      <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-[#222121]/40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {airtableClientsWithStats
                      .filter(client => {
                        if (clientStatusFilter === "all") return true;
                        if (clientStatusFilter === "active") return client.status !== 'Inactive' && client.status !== 'Not Active';
                        if (clientStatusFilter === "inactive") return client.status === 'Inactive' || client.status === 'Not Active';
                        return true;
                      })
                      .map((client) => {
                        // Get order data for this client
                        const orderData = clientOrders[client.id];
                        const ordered = orderData?.totalOrdered || 0;
                        // Delivered = approved leads from Airtable (client.leadsDelivered comes from edge function)
                        const delivered = client.leadsDelivered || 0;
                        const remaining = Math.max(0, ordered - delivered);
                        const completionPercent = ordered > 0 ? Math.round((delivered / ordered) * 100) : 0;
                        const startDate = orderData?.startDate;
                        const endDate = orderData?.endDate;

                        return (
                          <TableRow
                            key={client.id}
                            className="cursor-pointer hover:bg-[#34B192]/5"
                            onClick={() => navigate(`/admin/clients/${client.id}`)}
                          >
                            <TableCell>
                              <div className="font-medium text-[#222121]">{client.name}</div>
                              {client.companyName && client.companyName !== client.name && (
                                <div className="text-sm text-[#222121]/50">{client.companyName}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {client.email && (
                                  <div className="flex items-center gap-1 text-[#222121]/50">
                                    <Mail className="h-3 w-3" />
                                    {client.email}
                                  </div>
                                )}
                                {client.contactPerson && (
                                  <div className="text-[#222121]/50">{client.contactPerson}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {attachedUsers[client.id] ? (
                                <div className="text-sm text-[#222121]/50">
                                  {attachedUsers[client.id]}
                                </div>
                              ) : (
                                <span className="text-xs text-[#222121]/40">No user</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {client.status === 'Inactive' || client.status === 'Not Active' ? (
                                <Badge variant="outline" className="rounded-full border-transparent bg-[#222121]/15 text-white">
                                  Inactive
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="rounded-full border-transparent bg-[#34B192] text-white">
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm font-medium text-[#222121]">
                                {ordered || <span className="text-[#222121]/40">—</span>}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium text-[#222121]">{delivered || <span className="text-[#222121]/40">—</span>}</div>
                              {ordered > 0 && (
                                <div className="text-xs text-[#222121]/50">{completionPercent}%</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={remaining > 0 ? "font-medium text-[#222121]" : "text-[#222121]/50"}>
                                {ordered > 0 ? remaining : <span className="text-[#222121]/40">—</span>}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm text-[#222121]">
                                {startDate
                                  ? new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                                  : <span className="text-[#222121]/40">—</span>}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-sm text-[#222121]">
                                {endDate
                                  ? new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                                  : <span className="text-[#222121]/40">—</span>}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/admin/clients/${client.id}`);
                                }}
                                className="hover:bg-[#34B192]/10"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteClient && !deleteClient.client_name ? "Delete Pending User" : "Delete Client"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteClient && !deleteClient.client_name ? (
                <>
                  Are you sure you want to delete the pending user <strong>{deleteClient.email}</strong>? 
                  This will permanently remove their account. This action cannot be undone.
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{deleteClient?.email}</strong>? 
                  This will permanently remove their account and all associated data. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClient && handleDeleteClient(deleteClient)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={!!resettingPassword} onOpenChange={() => setResettingPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              A new temporary password will be generated for this client. Make sure to share it with them securely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resettingPassword && handleResetPassword(resettingPassword)}
            >
              Reset Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminClients;
