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
import { Mail, Copy, Check, Calculator, Loader2 } from "lucide-react";
import { calculateLeadsPerDay } from "@/lib/clientOnboarding";
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
  const [leadsPurchased, setLeadsPurchased] = useState<number>(0);
  const [onboardingDate, setOnboardingDate] = useState("");
  const [targetDeliveryDate, setTargetDeliveryDate] = useState("");
  const [calculatedLeadsPerDay, setCalculatedLeadsPerDay] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [copied, setCopied] = useState(false);
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

  // Calculate leads per day when relevant fields change
  useEffect(() => {
    if (leadsPurchased > 0 && onboardingDate && targetDeliveryDate) {
      const onboarding = new Date(onboardingDate);
      const target = new Date(targetDeliveryDate);
      const leadsPerDay = calculateLeadsPerDay(leadsPurchased, onboarding, target);
      setCalculatedLeadsPerDay(leadsPerDay);
    } else {
      setCalculatedLeadsPerDay(null);
    }
  }, [leadsPurchased, onboardingDate, targetDeliveryDate]);

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
      // Prepare onboarding data
      const onboardingData: any = {
        email,
        clientName: clientName.trim(),
        airtableClientId: selectedAirtableClient || null,
        leadsPurchased: leadsPurchased || 0,
        onboardingDate: onboardingDate || null,
        targetDeliveryDate: targetDeliveryDate || null,
        leadsPerDay: calculatedLeadsPerDay,
        clientStatus: 'on_track' // Default status for new clients
      };

      const { data, error } = await supabase.functions.invoke("invite-client", {
        body: onboardingData
      });

      if (error) throw error;

      setGeneratedPassword(data.tempPassword);
      toast.success("Client account created successfully!");
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
    setLeadsPurchased(0);
    setOnboardingDate("");
    setTargetDeliveryDate("");
    setCalculatedLeadsPerDay(null);
    setGeneratedPassword("");
    setCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    toast.success("Password copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Invite Client</h1>
          <p className="text-base text-muted-foreground mt-1">
            Create a new client account and generate credentials
          </p>
        </div>

        {/* Form Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-6 pb-4">
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              Enter the client's email and name to create their account
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleInvite} className="space-y-4">
              {/* Airtable Client Selection */}
              <div className="space-y-2">
                <Label htmlFor="airtableClient">Link to Airtable Client *</Label>
                {loadingClients ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground">Loading clients...</span>
                  </div>
                ) : airtableClients.length > 0 ? (
                  <Select
                    value={selectedAirtableClient}
                    onValueChange={handleAirtableClientSelect}
                    disabled={!!generatedPassword}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an Airtable client" />
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
                <p className="text-base text-muted-foreground">
                  Select the Airtable client record to link this user to
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="Auto-filled from Airtable selection"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  disabled={!!generatedPassword || !!selectedAirtableClient}
                />
                <p className="text-base text-muted-foreground">
                  {selectedAirtableClient ? "Name from Airtable client" : "Select an Airtable client above"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!!generatedPassword}
                />
              </div>

              {/* Onboarding Information */}
              <div className="pt-4 border-t space-y-4">
                <div>
                  <h3 className="text-base font-medium mb-3">Onboarding Information</h3>
                  <p className="text-base text-muted-foreground mb-4">
                    Set up the client's campaign details and delivery targets
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="leadsPurchased">Leads Purchased</Label>
                  <Input
                    id="leadsPurchased"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={leadsPurchased || ""}
                    onChange={(e) => setLeadsPurchased(parseInt(e.target.value) || 0)}
                    disabled={!!generatedPassword}
                  />
                  <p className="text-base text-muted-foreground">
                    Total number of leads the client has purchased
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="onboardingDate">Onboarding Date</Label>
                    <Input
                      id="onboardingDate"
                      type="date"
                      value={onboardingDate}
                      onChange={(e) => setOnboardingDate(e.target.value)}
                      disabled={!!generatedPassword}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="targetDeliveryDate">Target Delivery Date</Label>
                    <Input
                      id="targetDeliveryDate"
                      type="date"
                      value={targetDeliveryDate}
                      onChange={(e) => setTargetDeliveryDate(e.target.value)}
                      disabled={!!generatedPassword}
                    />
                  </div>
                </div>

                {calculatedLeadsPerDay !== null && (
                  <Alert className="bg-info/10 border-info/20">
                    <Calculator className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Leads Per Day Required:</span>
                        <span className="text-lg font-bold">{calculatedLeadsPerDay}</span>
                      </div>
                      <p className="text-base mt-1 text-muted-foreground">
                        Based on work days between onboarding and target delivery date
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {!generatedPassword && (
                <div className="flex gap-2 pt-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
                  >
                    {isLoading ? "Creating Account..." : "Create Client Account"}
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
        {generatedPassword && (
          <Card className="border-emerald-200 shadow-sm border-border">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <Check className="h-5 w-5" />
                Account Created Successfully
              </CardTitle>
              <CardDescription>
                Share these credentials with the client securely
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      <strong>Email:</strong> {email}
                    </div>
                    <div className="flex items-center gap-2">
                      <strong>Temporary Password:</strong>
                      <code className="relative rounded bg-muted px-2 py-1 font-mono text-base">
                        {generatedPassword}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyToClipboard}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>

              <Alert className="bg-warning/10 border-warning/20">
                <AlertDescription className="text-base">
                  <strong>Important:</strong> Make sure to save this password. The client will need to change it on their first login.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={handleReset} 
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
                >
                  Invite Another Client
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
