import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";

const AdminInvite = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // Step 1: DB ID, Step 2: Email
  const [databaseId, setDatabaseId] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState("");

  const handleFetchDatabaseName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      toast.loading("Fetching Notion database name...");
      
      const { data: validationData, error: validationError } = await supabase.functions.invoke(
        "validate-notion-database",
        { body: { databaseId } }
      );

      if (validationError) throw validationError;

      if (!validationData.valid) {
        toast.dismiss();
        toast.error(`Database validation failed: ${validationData.error}`);
        setIsLoading(false);
        return;
      }

      toast.dismiss();
      setDatabaseName(validationData.databaseName || "Notion Database");
      toast.success(`Database found: ${validationData.databaseName || "Notion Database"}`);
      setStep(2);
    } catch (error: any) {
      toast.error("Failed to fetch database: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("invite-client", {
        body: { email, databaseId }
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
    setStep(1);
    setDatabaseId("");
    setDatabaseName("");
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
                  <p className="text-lg font-semibold">{databaseName}</p>
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
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notion Database ID</p>
                  <code className="text-sm bg-background p-2 rounded block break-all">
                    {databaseId}
                  </code>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">⚠️ Important:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Screenshot these credentials to send to the client</li>
                  <li>The password is also saved in Client Management for reference</li>
                  <li>Ask the client to change their password on first login</li>
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
        ) : step === 1 ? (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Enter Notion Database ID</CardTitle>
              <CardDescription>
                First, provide the Notion database ID to fetch the client's name
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleFetchDatabaseName} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="databaseId">Notion Database ID *</Label>
                  <Input
                    id="databaseId"
                    type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={databaseId}
                    onChange={(e) => setDatabaseId(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the full Notion database ID
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading || !databaseId}>
                  {isLoading ? "Fetching Database..." : "Fetch Database Name"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Enter Client Email</CardTitle>
              <CardDescription>
                Creating account for: <strong>{databaseName}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label>Notion Database</Label>
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="font-semibold">{databaseName}</p>
                    <code className="text-xs text-muted-foreground block mt-1 break-all">
                      {databaseId}
                    </code>
                  </div>
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

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading || !email}>
                    {isLoading ? "Creating Account..." : "Create Client Account"}
                  </Button>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">What happens next:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>A secure password will be generated automatically</li>
                    <li>The client account will be created with access to their database</li>
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
