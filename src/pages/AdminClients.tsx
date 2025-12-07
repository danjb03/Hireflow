import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Mail, Trash2, Key, Save, X, UserX, CheckCircle2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import AdminLayout from "@/components/AdminLayout";

interface Client {
  id: string;
  email: string;
  client_name: string | null;
  initial_password: string | null;
  created_at: string;
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Clients</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {activeClients.length} active clients • {pendingUsers.length} pending users
            </p>
          </div>
          <Button onClick={() => navigate("/admin/invite")}>
            <Mail className="h-4 w-4 mr-2" />
            Invite Client
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeClients.length}</div>
              <p className="text-xs text-muted-foreground mt-1">With assigned names</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-warning">{pendingUsers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clients.length}</div>
              <p className="text-xs text-muted-foreground mt-1">All accounts</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Available Names</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{airtableOptions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">From Airtable</p>
            </CardContent>
          </Card>
        </div>

        {/* Pending Users Section */}
        {pendingUsers.length > 0 && (
          <Card className="border-warning/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-warning" />
                  <CardTitle className="text-base">Pending Users</CardTitle>
                  <Badge variant="outline" className="ml-2">{pendingUsers.length}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review and approve or delete new signups
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Email</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()} at {new Date(user.created_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingClient(user.id);
                              setEditingName("");
                            }}
                            className="text-success hover:text-success"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteClient(user)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Active Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {activeClients.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No active clients yet. Approve pending users or invite new clients.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Email</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeClients.map((client) => (
                    <TableRow key={client.id}>
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
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingClient(null)}
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
                      <TableCell className="text-sm">
                        {new Date(client.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingClient !== client.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingClient(client.id);
                                setEditingName(client.client_name || "");
                              }}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setResettingPassword(client.id)}
                          >
                            <Key className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteClient(client)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
