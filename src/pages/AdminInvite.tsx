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
  const [email, setEmail] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate database ID if provided
      if (databaseId) {
        toast.loading("Validating Notion database...");
        
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
        toast.success(`Database validated! Found ${validationData.pageCount} pages`);
      }

      // Proceed with invitation
      const { data, error } = await supabase.functions.invoke("invite-client", {
        body: { email, databaseId }
      });

      if (error) throw error;

      toast.success(`Client invited! Temporary password: ${data.tempPassword}`);
      setEmail("");
      setDatabaseId("");
    } catch (error: any) {
      toast.error("Failed to invite client: " + error.message);
    } finally {
      setIsLoading(false);
    }
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
        <Card>
          <CardHeader>
            <CardTitle>Client Invitation</CardTitle>
            <CardDescription>
              Create a new client account. The system will generate a temporary password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="databaseId">Notion Database ID (Optional)</Label>
                <Input
                  id="databaseId"
                  type="text"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={databaseId}
                  onChange={(e) => setDatabaseId(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  You can configure this later in Client Management
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                <Send className="mr-2 h-4 w-4" />
                {isLoading ? "Creating Account..." : "Create Client Account"}
              </Button>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Important:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>A temporary password will be generated</li>
                  <li>Share the password securely with the client</li>
                  <li>If adding a database ID, it will be validated before creating the account</li>
                  <li>Make sure the Notion database is shared with your integration first</li>
                </ul>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminInvite;
