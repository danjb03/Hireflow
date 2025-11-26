import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, Database, Trash2, Key } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  const [databaseId, setDatabaseId] = useState("");
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [airtableOptions, setAirtableOptions] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    checkAdminAndLoadClients();
    loadAirtableOptions();
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
        toast.error("Access denied");
        navigate("/dashboard");
        return;
      }

      await loadClients();
    } catch (error: any) {
      toast.error("Failed to load clients");
      navigate("/admin");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      const adminUserIds = allRoles?.filter(r => r.role === "admin").map(r => r.user_id) || [];
      
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const clientProfiles = profiles?.filter(p => !adminUserIds.includes(p.id)) || [];
      setClients(clientProfiles);
    } catch (error: any) {
      toast.error("Failed to load clients");
    }
  };

  const handleUpdateClientName = async (clientId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ client_name: databaseId })
        .eq("id", clientId);

      if (error) throw error;

      toast.success("Client name updated");
      setEditingClient(null);
      setDatabaseId("");
      await loadClients();
    } catch (error: any) {
      toast.error("Failed to update client name");
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteClient) return;

    try {
      const { error } = await supabase.auth.admin.deleteUser(deleteClient.id);
      
      if (error) throw error;

      toast.success("Client deleted");
      setDeleteClient(null);
      await loadClients();
    } catch (error: any) {
      toast.error("Failed to delete client");
    }
  };

  const handleResetPassword = async (clientId: string, clientEmail: string) => {
    setResettingPassword(clientId);
    try {
      const { data, error } = await supabase.functions.invoke("reset-client-password", {
        body: { userId: clientId }
      });

      if (error) throw error;

      toast.success(`Password reset! New password: ${data.tempPassword}`, {
        duration: 10000,
      });
      
      // Reload clients to show updated password
      await loadClients();
    } catch (error: any) {
      toast.error("Failed to reset password: " + error.message);
    } finally {
      setResettingPassword(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <header className="border-b bg-card transition-all">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin")} className="transition-all hover:translate-x-[-4px]">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Client Management</h1>
              <p className="text-sm text-muted-foreground">{clients.length} clients</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <div className="grid gap-4">
          {clients.map((client) => (
            <Card key={client.id} className="transition-all hover:shadow-lg duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {client.email}
                    </CardTitle>
                    <CardDescription>
                      Joined {new Date(client.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteClient(client)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.initial_password && (
                  <div className="bg-primary/10 border-2 border-primary p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="h-5 w-5 text-primary" />
                      <span className="text-sm font-semibold text-primary">Account Credentials</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium">{client.email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Password</p>
                        <code className="block text-lg font-bold bg-background px-3 py-2 rounded border">
                          {client.initial_password}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        💡 Screenshot this to share with the client
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Client Name (Airtable):</span>
                  {client.client_name ? (
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {client.client_name}
                    </code>
                  ) : (
                    <span className="text-sm text-muted-foreground">Not configured</span>
                  )}
                </div>

                {editingClient === client.id ? (
                  <div className="space-y-2">
                    {loadingOptions ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading client names from Airtable...
                      </div>
                    ) : airtableOptions.length > 0 ? (
                      <div className="flex gap-2">
                        <Select value={databaseId} onValueChange={setDatabaseId}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select client name from Airtable" />
                          </SelectTrigger>
                          <SelectContent>
                            {airtableOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button onClick={() => handleUpdateClientName(client.id)} disabled={!databaseId}>
                          Save
                        </Button>
                        <Button variant="outline" onClick={() => {
                          setEditingClient(null);
                          setDatabaseId("");
                        }}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          No client names found in Airtable. Add options to the 'Client' dropdown field in Airtable first.
                        </p>
                        <Button variant="outline" onClick={() => {
                          setEditingClient(null);
                          setDatabaseId("");
                        }}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingClient(client.id);
                        setDatabaseId(client.client_name || "");
                      }}
                      className="transition-all hover:scale-105"
                    >
                      Update Client Name
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleResetPassword(client.id, client.email)}
                      disabled={resettingPassword === client.id}
                      className="transition-all hover:scale-105"
                    >
                      {resettingPassword === client.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Key className="h-4 w-4 mr-2" />
                      )}
                      Reset Password
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {clients.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No clients yet</p>
          </div>
        )}
      </main>

      <AlertDialog open={!!deleteClient} onOpenChange={() => setDeleteClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteClient?.email}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminClients;
