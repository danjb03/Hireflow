import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, Loader2, Send } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface AirtableClient {
  id: string;
  name: string;
  email?: string | null;
  status?: string | null;
}

const AdminInvite = () => {
  const navigate = useNavigate();
  const [airtableClients, setAirtableClients] = useState<AirtableClient[]>([]);
  const [selectedAirtableClient, setSelectedAirtableClient] = useState<string>("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, []);

  // Fetch Airtable clients on mount
  useEffect(() => {
    const fetchAirtableClients = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-airtable-clients");
        if (error) {
          console.error("Error fetching Airtable clients:", error);
          return;
        }
        if (data?.clients) {
          setAirtableClients(data.clients);
        }
      } catch (error) {
        console.error("Error fetching Airtable clients:", error);
      } finally {
        setLoadingClients(false);
      }
    };
    fetchAirtableClients();
  }, []);

  // When an Airtable client is selected, auto-fill client name and email
  const handleAirtableClientSelect = (clientId: string) => {
    setSelectedAirtableClient(clientId);
    const client = airtableClients.find(c => c.id === clientId);
    if (client) {
      setClientName(client.name);
      if (client.email) {
        setEmail(client.email);
      }
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Require Airtable client selection
    if (!selectedAirtableClient) {
      toast.error("Please select an Airtable client");
      return;
    }

    // Validation: Don't allow submission if clientName is empty
    if (!clientName.trim()) {
      toast.error("Client Name is required");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("invite-client", {
        body: {
          email,
          clientName: clientName.trim(),
          airtableClientId: selectedAirtableClient,
        }
      });

      if (error) throw error;

      setInviteSuccess(true);
      toast.success("Client invited successfully! Welcome email sent.");
    } catch (error: any) {
      toast.error("Failed to invite client: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedAirtableClient("");
    setClientName("");
    setEmail("");
    setInviteSuccess(false);
  };

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Invite Client User</h1>
          <p className="text-base text-muted-foreground mt-1">
            Add a new user to an existing client account
          </p>
        </div>

        {/* Form Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-6 pb-4">
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Select the client company and enter the user's email address
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleInvite} className="space-y-4">
              {/* Airtable Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="airtableClient">Client Company *</Label>
                {loadingClients ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground">Loading clients...</span>
                  </div>
                ) : airtableClients.length > 0 ? (
                  <Select
                    value={selectedAirtableClient}
                    onValueChange={handleAirtableClientSelect}
                    disabled={inviteSuccess}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a client company" />
                    </SelectTrigger>
                    <SelectContent>
                      {airtableClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} {client.email ? `(${client.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No clients found in Airtable. Please create a client in Airtable first.
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-muted-foreground">
                  Select which client company this user belongs to
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="Auto-filled from selection"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  disabled={inviteSuccess || !!selectedAirtableClient}
                />
                <p className="text-sm text-muted-foreground">
                  {selectedAirtableClient ? "Name from selected client" : "Select a client above"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">User Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={inviteSuccess}
                />
                <p className="text-sm text-muted-foreground">
                  This user will receive login credentials via email
                </p>
              </div>

              {!inviteSuccess && (
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Send Invite"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin/clients")}
                    className="transition-colors duration-200"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Success Card */}
        {inviteSuccess && (
          <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <Check className="h-5 w-5" />
                User Invited Successfully
              </CardTitle>
              <CardDescription>
                A welcome email has been sent to the user
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <Alert className="bg-white border-emerald-200">
                <Send className="h-4 w-4 text-emerald-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      <strong>Welcome email sent to:</strong> {email}
                    </p>
                    <p className="text-muted-foreground">
                      The email contains their login credentials and a link to access the platform.
                      They can log in immediately using the credentials in the email.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleReset}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
                >
                  Invite Another User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/clients")}
                  className="transition-colors duration-200"
                >
                  View All Clients
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInvite;
