import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

const AdminInvite = () => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("invite-client", {
        body: { email, clientName }
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
    setClientName("");
    setEmail("");
    setGeneratedPassword("");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Invite Client</h1>
              <p className="text-sm text-muted-foreground">Create new client account</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 max-w-2xl">
        {generatedPassword ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Client Account Created!</CardTitle>
              <CardDescription>
                Share these credentials with the client securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Client Name</p>
                  <p className="text-lg font-semibold">{clientName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-lg font-semibold">{email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Temporary Password</p>
                  <code className="block text-2xl font-bold bg-background p-3 rounded border-2 border-primary">
                    {generatedPassword}
                  </code>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">⚠️ Important:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Screenshot these credentials to send to the client</li>
                  <li>The password is also saved in Client Management for reference</li>
                  <li>Ask the client to change their password on first login</li>
                  <li>Make sure "{clientName}" exactly matches the Airtable dropdown option</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => navigate("/admin/clients")} className="flex-1">
                  Go to Client Management
                </Button>
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  Create Another Client
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create Client Account</CardTitle>
              <CardDescription>
                Enter client details for Airtable access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    type="text"
                    placeholder="e.g., Acme Corp"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Must exactly match the option in your Airtable "Client Name" dropdown
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Client Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="client@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !email || !clientName}>
                  {isLoading ? "Creating Account..." : "Create Client Account"}
                </Button>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">What happens next:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>A secure password will be generated automatically</li>
                    <li>The client account will be created with this name</li>
                    <li>They'll only see leads where "Client Name" = "{clientName || "their name"}"</li>
                    <li>You'll see the password to share with the client</li>
                    <li>The password will be saved for reference in Client Management</li>
                  </ul>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminInvite;
