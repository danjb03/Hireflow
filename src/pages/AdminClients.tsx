import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, Trash2, Key, Save, X, UserX, Users, CheckCircle2, AlertTriangle, Smile, Frown, Clock, Building2, ExternalLink, Edit, Search, ChevronDown, ChevronUp, Info } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getCompletionPercentage, getDaysRemaining } from "@/lib/clientOnboarding";
import AdminLayout from "@/components/AdminLayout";

type ClientStatus = 'happy' | 'unhappy' | 'urgent' | 'at_risk' | 'on_track';

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

const AdminClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingAirtableClientId, setEditingAirtableClientId] = useState<string>("");
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [airtableClients, setAirtableClients] = useState<Array<{id: string, name: string, email?: string | null}>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [airtableData, setAirtableData] = useState<Record<string, AirtableClientData>>({});
  const [loadingAirtableData, setLoadingAirtableData] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAdminAndLoadClients();
    loadAirtableClients();
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, []);

  const loadAirtableClients = async () => {
    setLoadingOptions(true);
    try {
      // Try to load from Supabase clients table first (preferred)
      const { data: supabaseClients, error: supabaseError } = await supabase
        .from("clients")
        .select("id, client_name, email")
        .order("client_name");

      if (!supabaseError && supabaseClients && supabaseClients.length > 0) {
        // Use Supabase clients
        setAirtableClients(
          supabaseClients.map(c => ({
            id: c.id,
            name: c.client_name,
            email: c.email || null
          }))
        );
        setLoadingOptions(false);
        return;
      }

      // Fallback to Airtable if Supabase clients table is empty or doesn't exist
      const { data, error } = await supabase.functions.invoke("get-airtable-clients");

      if (error) {
        console.warn("Airtable function error (non-critical):", error);
        // Don't show error toast - just log it
        setAirtableClients([]);
        return;
      }

      if (!data || !data.clients) {
        console.warn("No clients data returned from function");
        setAirtableClients([]);
        return;
      }

      setAirtableClients(data.clients || []);
    } catch (error: any) {
      // Silently fail - this is not critical for the page to function
      console.warn("Failed to load external clients (non-critical):", error);
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
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setClients(data || []);
    } catch (error: any) {
      console.error("Error loading clients:", error);
      toast.error("Failed to load clients");
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

  const activeClients = clients.filter(c => c.client_name);
  const pendingUsers = clients.filter(c => !c.client_name);

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
            <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
            <p className="text-muted-foreground mt-1">
              {activeClients.length} active clients • {pendingUsers.length} pending users
            </p>
          </div>
          <Button 
            onClick={() => navigate("/admin/invite")}
            className="bg-primary hover:bg-primary/90"
          >
            <Mail className="h-4 w-4 mr-2" />
            Invite Client
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm aspect-square flex flex-col">
            <CardContent className="flex-1 flex flex-col justify-center p-6">
              <CardDescription className="text-base mb-2">Active Clients</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums mb-1">{activeClients.length}</CardTitle>
              <p className="text-base text-muted-foreground mt-auto">With assigned names</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm aspect-square flex flex-col">
            <CardContent className="flex-1 flex flex-col justify-center p-6">
              <CardDescription className="text-base mb-2">Pending Users</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums mb-1">{pendingUsers.length}</CardTitle>
              <p className="text-base text-muted-foreground mt-auto">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm aspect-square flex flex-col">
            <CardContent className="flex-1 flex flex-col justify-center p-6">
              <CardDescription className="text-base mb-2">Total Users</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums mb-1">{clients.length}</CardTitle>
              <p className="text-base text-muted-foreground mt-auto">All accounts</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm aspect-square flex flex-col">
            <CardContent className="flex-1 flex flex-col justify-center p-6">
              <CardDescription className="text-base mb-2">Available Names</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums mb-1">{airtableClients.length}</CardTitle>
              <p className="text-base text-muted-foreground mt-auto">Client options</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Users Section */}
        {pendingUsers.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserX className="h-5 w-5 text-amber-600" />
                    Pending Users
                  </CardTitle>
                  <CardDescription>Review and approve or delete new signups</CardDescription>
                </div>
                <Badge variant="outline">{pendingUsers.length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Signed Up</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>
                        {editingClient === user.id ? (
                          <div className="flex items-center gap-2">
                            <Select
                              value={editingAirtableClientId}
                              onValueChange={setEditingAirtableClientId}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select client from Airtable" />
                              </SelectTrigger>
                              <SelectContent>
                                {loadingOptions ? (
                                  <div className="p-2 text-base text-muted-foreground">Loading...</div>
                                ) : airtableClients.length === 0 ? (
                                  <div className="p-2 text-base text-muted-foreground">No clients in Airtable</div>
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
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
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
                          <span className="text-base text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-base text-muted-foreground">
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
                              className="text-success hover:text-success transition-colors duration-200"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteClient(user)}
                            className="text-destructive hover:text-destructive transition-colors duration-200"
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
          <Card className="shadow-sm border-destructive/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Clients Needing Help
                  </CardTitle>
                  <CardDescription>Clients requiring immediate attention</CardDescription>
                </div>
                <Badge variant="destructive">{activeClients.filter(needsHelp).length}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Days Remaining</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                      <TableRow key={client.id} className="bg-destructive/5">
                        <TableCell className="font-medium">
                          <div>
                            <div>{client.client_name}</div>
                            <div className="text-base text-muted-foreground">{client.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {getStatusIcon(client.client_status)}
                            <span className="capitalize">{client.client_status || 'on_track'}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {client.leads_purchased ? (
                            <div className="text-base">
                              <div className="font-medium">{completion}%</div>
                              <div className="text-base text-muted-foreground">
                                {client.leads_fulfilled || 0} / {client.leads_purchased}
                              </div>
                            </div>
                          ) : (
                            <span className="text-base text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {daysRemaining !== null ? (
                            <span className={daysRemaining < 0 ? "text-destructive font-bold" : daysRemaining < 7 ? "text-warning font-medium" : ""}>
                              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : `${daysRemaining} days`}
                            </span>
                          ) : (
                            <span className="text-base text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
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
            </CardContent>
          </Card>
        )}

        {/* Active Clients Grid */}
        {activeClients.length === 0 ? (
          <div className="bg-muted/30 border-dashed border-2 rounded-xl p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">No active clients yet. Approve pending users or invite new clients.</p>
            <Button 
              onClick={() => navigate("/admin/invite")}
              className="bg-primary hover:bg-primary/90"
            >
              <Mail className="h-4 w-4 mr-2" />
              Invite Client
            </Button>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-semibold mb-2">Active Clients</h2>
              <p className="text-base text-muted-foreground">All active client accounts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeClients.map((client) => {
                const completion = getCompletionPercentage(
                  client.leads_fulfilled || 0,
                  client.leads_purchased || 0
                );
                const daysRemaining = client.target_delivery_date 
                  ? getDaysRemaining(new Date(client.target_delivery_date))
                  : null;
                const isActive = client.client_name && !needsHelp(client);
                
                const isExpanded = expandedCards.has(client.id);
                const clientAirtableData = airtableData[client.id];
                const isLoadingAirtable = loadingAirtableData.has(client.id);
                
                return (
                  <div 
                    key={client.id}
                    className="bg-card border rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="p-6">
                      {/* Client Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                        {editingClient === client.id ? (
                          <div className="flex items-center gap-2 mb-2">
                            <Select
                              value={editingAirtableClientId}
                              onValueChange={setEditingAirtableClientId}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select client from Airtable" />
                              </SelectTrigger>
                              <SelectContent>
                                {loadingOptions ? (
                                  <div className="p-2 text-base text-muted-foreground">Loading...</div>
                                ) : airtableClients.length === 0 ? (
                                  <div className="p-2 text-base text-muted-foreground">No clients in Airtable</div>
                                ) : (
                                  airtableClients.map((airtableClient) => (
                                    <SelectItem key={airtableClient.id} value={airtableClient.id}>
                                      {airtableClient.name} {airtableClient.email && `(${airtableClient.email})`}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateClient(client.id, editingAirtableClientId)}
                              disabled={!editingAirtableClientId}
                              className="bg-primary hover:bg-primary/90"
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
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <h3 className="text-xl font-semibold mb-1">{client.client_name}</h3>
                        )}
                          <p className="text-base text-muted-foreground flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </p>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="mb-4">
                        {isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border rounded-full flex items-center gap-1.5 px-2.5 py-1 w-fit">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </Badge>
                        ) : needsHelp(client) ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200 border rounded-full flex items-center gap-1.5 px-2.5 py-1 w-fit">
                            <Clock className="h-3 w-3" />
                            Needs Attention
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 border rounded-full flex items-center gap-1.5 px-2.5 py-1 w-fit">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="space-y-2 mb-4">
                        {client.leads_purchased && (
                          <div className="text-base text-muted-foreground">
                            <span className="font-medium text-foreground">{completion}%</span> complete • {client.leads_fulfilled || 0} / {client.leads_purchased} leads
                          </div>
                        )}
                        {daysRemaining !== null && (
                          <div className="text-base text-muted-foreground">
                            {daysRemaining < 0 
                              ? `${Math.abs(daysRemaining)} days overdue`
                              : `${daysRemaining} days remaining`
                            }
                          </div>
                        )}
                        <div className="text-base text-muted-foreground">
                          Created {new Date(client.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Status Select */}
                      <div className="mb-4">
                        <Select
                          value={client.client_status || 'on_track'}
                          onValueChange={(value) => handleUpdateStatus(client.id, value as ClientStatus)}
                          disabled={updatingStatus === client.id}
                        >
                          <SelectTrigger className="w-full">
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
                      </div>

                      {/* Expand/Collapse Button */}
                      <div className="mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => toggleCardExpansion(client.id, client.airtable_client_id || undefined)}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Hide Onboarding Info
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              View Onboarding Info
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Expanded Onboarding Information */}
                      {isExpanded && (
                        <div className="border-t pt-4 space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Info className="h-4 w-4 text-primary" />
                            <h4 className="font-semibold">Onboarding & Campaign Information</h4>
                          </div>

                          {/* Onboarding Dates & Leads Info */}
                          <div className="grid grid-cols-2 gap-4 text-base">
                            {client.onboarding_date && (
                              <div>
                                <p className="text-muted-foreground text-base mb-1">Onboarding Date</p>
                                <p className="font-medium">{new Date(client.onboarding_date).toLocaleDateString()}</p>
                              </div>
                            )}
                            {client.target_delivery_date && (
                              <div>
                                <p className="text-muted-foreground text-base mb-1">Target Delivery Date</p>
                                <p className="font-medium">{new Date(client.target_delivery_date).toLocaleDateString()}</p>
                              </div>
                            )}
                            {client.leads_purchased !== null && (
                              <div>
                                <p className="text-muted-foreground text-base mb-1">Leads Purchased</p>
                                <p className="font-medium">{client.leads_purchased}</p>
                              </div>
                            )}
                            {client.leads_per_day !== null && (
                              <div>
                                <p className="text-muted-foreground text-base mb-1">Leads Per Day</p>
                                <p className="font-medium">{client.leads_per_day}</p>
                              </div>
                            )}
                          </div>

                          {/* Airtable Client Data */}
                          {isLoadingAirtable ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              <span className="ml-2 text-base text-muted-foreground">Loading client data...</span>
                            </div>
                          ) : clientAirtableData ? (
                            <div className="space-y-3 text-base">
                              {clientAirtableData['Contact Person'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Contact Person</p>
                                  <p className="font-medium">{clientAirtableData['Contact Person']}</p>
                                </div>
                              )}
                              {clientAirtableData['Phone'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Phone</p>
                                  <p className="font-medium">{clientAirtableData['Phone']}</p>
                                </div>
                              )}
                              {clientAirtableData['Company Website'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Company Website</p>
                                  <a href={clientAirtableData['Company Website']} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                                    {clientAirtableData['Company Website']}
                                  </a>
                                </div>
                              )}
                              {clientAirtableData['Company Name'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Company Name</p>
                                  <p className="font-medium">{clientAirtableData['Company Name']}</p>
                                </div>
                              )}
                              {clientAirtableData['Location'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Location</p>
                                  <p className="font-medium">{clientAirtableData['Location']}</p>
                                </div>
                              )}
                              {clientAirtableData['Markets they serve (locations)'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Markets Served</p>
                                  <p className="font-medium">{clientAirtableData['Markets they serve (locations)']}</p>
                                </div>
                              )}
                              {clientAirtableData['Industries they serve'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Industries Served</p>
                                  <p className="font-medium">{clientAirtableData['Industries they serve']}</p>
                                </div>
                              )}
                              {clientAirtableData['Sub-industries/specializations'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Sub-industries/Specializations</p>
                                  <p className="font-medium">{clientAirtableData['Sub-industries/specializations']}</p>
                                </div>
                              )}
                              {clientAirtableData['Types of roles they hire for'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Types of Roles</p>
                                  <p className="font-medium">{clientAirtableData['Types of roles they hire for']}</p>
                                </div>
                              )}
                              {clientAirtableData['Contingent or temporary staffing?'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Staffing Model</p>
                                  <p className="font-medium">{clientAirtableData['Contingent or temporary staffing?']}</p>
                                </div>
                              )}
                              {clientAirtableData['Last 5 roles placed'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Last 5 Roles Placed</p>
                                  <p className="font-medium whitespace-pre-line">{clientAirtableData['Last 5 roles placed']}</p>
                                </div>
                              )}
                              {clientAirtableData['Last 5 companies worked with (for lookalike targeting)'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Last 5 Companies Worked With</p>
                                  <p className="font-medium whitespace-pre-line">{clientAirtableData['Last 5 companies worked with (for lookalike targeting)']}</p>
                                </div>
                              )}
                              {clientAirtableData['5 current candidates (for candidate-led campaigns)'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Current Candidates</p>
                                  <p className="font-medium whitespace-pre-line">{clientAirtableData['5 current candidates (for candidate-led campaigns)']}</p>
                                </div>
                              )}
                              {clientAirtableData['Their USPs in their own words'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Unique Selling Points</p>
                                  <p className="font-medium whitespace-pre-line">{clientAirtableData['Their USPs in their own words']}</p>
                                </div>
                              )}
                              {clientAirtableData['Niches they\'ve done well in'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Niches They've Done Well In</p>
                                  <p className="font-medium whitespace-pre-line">{clientAirtableData['Niches they\'ve done well in']}</p>
                                </div>
                              )}
                              {clientAirtableData['Typical outreach/acquisition methods'] && (
                                <div>
                                  <p className="text-muted-foreground text-base mb-1">Outreach Methods</p>
                                  <p className="font-medium whitespace-pre-line">{clientAirtableData['Typical outreach/acquisition methods']}</p>
                                </div>
                              )}
                            </div>
                          ) : client.airtable_client_id ? (
                            <p className="text-base text-muted-foreground">No additional client data available</p>
                          ) : null}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-4 border-t mt-4">
                        {editingClient !== client.id && (
                          <Button
                            variant="outline"
                            size="sm"
                          onClick={() => {
                            setEditingClient(client.id);
                            // Set the current airtable_client_id if it exists, otherwise empty
                            setEditingAirtableClientId(client.airtable_client_id || "");
                          }}
                            className="flex-1"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setResettingPassword(client.id)}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteClient(client)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
