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
import { Loader2, Mail, Trash2, Key, Save, X, UserX, CheckCircle2, AlertTriangle, Smile, Frown, Clock } from "lucide-react";
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
}

const AdminClients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [airtableOptions, setAirtableOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadClients();
    loadAirtableOptions();
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, []);

  const loadAirtableOptions = async () => {
    setLoadingOptions(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-airtable-client-options");

      if (error) throw error;

      setAirtableOptions(data.options || []);
    } catch (error: any) {
      console.error("Failed to load Airtable options:", error);
      toast.error("Failed to load client name options from Airtable");
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

  const handleUpdateClient = async (clientId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ client_name: newName })
        .eq("id", clientId);

      if (error) throw error;

      toast.success("Client name updated successfully");
      setEditingClient(null);
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
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeClients.length} active clients • {pendingUsers.length} pending users
            </p>
          </div>
          <Button 
            onClick={() => navigate("/admin/invite")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Mail className="h-4 w-4 mr-2" />
            Invite Client
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
            <CardHeader>
              <CardDescription>Active Clients</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{activeClients.length}</CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              With assigned names
            </CardFooter>
          </Card>
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
            <CardHeader>
              <CardDescription>Pending Users</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{pendingUsers.length}</CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              Awaiting approval
            </CardFooter>
          </Card>
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
            <CardHeader>
              <CardDescription>Total Users</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{clients.length}</CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              All accounts
            </CardFooter>
          </Card>
          <Card className="bg-gradient-to-t from-primary/5 to-card shadow-sm">
            <CardHeader>
              <CardDescription>Available Names</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums">{airtableOptions.length}</CardTitle>
            </CardHeader>
            <CardFooter className="text-xs text-muted-foreground">
              From Airtable
            </CardFooter>
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
                  <TableHeader className="bg-muted sticky top-0 z-10">
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
                              value={editingName}
                              onValueChange={setEditingName}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="Select name" />
                              </SelectTrigger>
                              <SelectContent>
                                {loadingOptions ? (
                                  <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                                ) : (
                                  airtableOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateClient(user.id, editingName)}
                              disabled={!editingName}
                              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingClient(null)}
                              className="transition-colors duration-200"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
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
                                setEditingName("");
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
                  <TableHeader className="bg-muted sticky top-0 z-10">
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
                            <div className="text-xs text-muted-foreground">{client.email}</div>
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
                            <div className="text-sm">
                              <div className="font-medium">{completion}%</div>
                              <div className="text-xs text-muted-foreground">
                                {client.leads_fulfilled || 0} / {client.leads_purchased}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {daysRemaining !== null ? (
                            <span className={daysRemaining < 0 ? "text-destructive font-bold" : daysRemaining < 7 ? "text-warning font-medium" : ""}>
                              {daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : `${daysRemaining} days`}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
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

        {/* Active Clients Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Active Clients</CardTitle>
            <CardDescription>All active client accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {activeClients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No active clients yet. Approve pending users or invite new clients.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted sticky top-0 z-10">
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {activeClients.map((client) => {
                    const completion = getCompletionPercentage(
                      client.leads_fulfilled || 0,
                      client.leads_purchased || 0
                    );
                    const isHighlighted = needsHelp(client);
                    
                    return (
                      <TableRow 
                        key={client.id}
                        className={isHighlighted ? "bg-warning/5 border-l-4 border-l-warning" : ""}
                      >
                        <TableCell className="font-medium">{client.email}</TableCell>
                        <TableCell>
                          {editingClient === client.id ? (
                            <div className="flex items-center gap-2">
                              <Select
                                value={editingName}
                                onValueChange={setEditingName}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select name" />
                                </SelectTrigger>
                                <SelectContent>
                                  {loadingOptions ? (
                                    <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                                  ) : (
                                    airtableOptions.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option}
                                      </SelectItem>
                                    ))
                                  )}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                onClick={() => handleUpdateClient(client.id, editingName)}
                                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingClient(null)}
                                className="transition-colors duration-200"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{client.client_name}</Badge>
                            </div>
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
                        <TableCell>
                          {client.leads_purchased ? (
                            <div className="text-sm">
                              <div className="font-medium">{completion}%</div>
                              <div className="text-xs text-muted-foreground">
                                {client.leads_fulfilled || 0} / {client.leads_purchased}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(client.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {editingClient !== client.id && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingClient(client.id);
                                  setEditingName(client.client_name || "");
                                }}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setResettingPassword(client.id)}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleteClient(client)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
