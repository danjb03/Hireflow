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
      <div className="-mx-4 -my-6 max-w-2xl space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
            <span className="size-2 rounded-full bg-[#34B192]" />
            Client onboarding
          </div>
          <h1 className="text-3xl font-semibold text-[#222121]">Invite Client User</h1>
          <p className="text-sm text-[#222121]/60">
            Add a new user to an existing client account
          </p>
        </div>

        {/* Form Card */}
        <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-[#222121]">User Information</CardTitle>
            <CardDescription className="text-[#222121]/60">
              Select the client company and enter the user's email address
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleInvite} className="space-y-4">
              {/* Airtable Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="airtableClient">Client Company *</Label>
                {loadingClients ? (
                  <div className="flex items-center gap-2 h-11 px-3 border rounded-full bg-[#F7F7F7] border-[#222121]/15">
                    <Loader2 className="h-4 w-4 animate-spin text-[#34B192]" />
                    <span className="text-[#222121]/60">Loading clients...</span>
                  </div>
                ) : airtableClients.length > 0 ? (
                  <Select
                    value={selectedAirtableClient}
                    onValueChange={handleAirtableClientSelect}
                    disabled={inviteSuccess}
                  >
                    <SelectTrigger className="h-11 w-full rounded-full border-[#222121]/15 bg-white text-sm">
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
                  <Alert className="border border-[#222121]/10 bg-[#F7F7F7]">
                    <AlertDescription>
                      No clients found in Airtable. Please create a client in Airtable first.
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-[#222121]/60">
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
                  className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                />
                <p className="text-sm text-[#222121]/60">
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
                  className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                />
                <p className="text-sm text-[#222121]/60">
                  This user will receive login credentials via email
                </p>
              </div>

              {!inviteSuccess && (
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    variant="ghost"
                    className="flex-1 h-11 rounded-full bg-[#34B192] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                  >
                    {isLoading ? "Creating Account..." : "Send Invite"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin/clients")}
                    className="h-11 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
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
          <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <Check className="h-5 w-5 text-[#34B192]" />
                User Invited Successfully
              </CardTitle>
              <CardDescription className="text-[#222121]/60">
                A welcome email has been sent to the user
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <Alert className="border border-[#222121]/10 bg-[#F7F7F7]">
                <Send className="h-4 w-4 text-[#34B192]" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      <strong>Welcome email sent to:</strong> {email}
                    </p>
                    <p className="text-[#222121]/60">
                      The email contains their login credentials and a link to access the platform.
                      They can log in immediately using the credentials in the email.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  className="flex-1 h-11 rounded-full bg-[#34B192] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                >
                  Invite Another User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/clients")}
                  className="h-11 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
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
