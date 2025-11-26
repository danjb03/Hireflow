import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Mail, Copy, Check } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const AdminInvite = () => {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [email, setEmail] = useState("");
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
          <p className="text-sm text-muted-foreground mt-1">
            Create a new client account and generate credentials
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
            <CardDescription>
              Enter the client's email and name to create their account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
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

              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  type="text"
                  placeholder="Client Company Name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  disabled={!!generatedPassword}
                />
                <p className="text-xs text-muted-foreground">
                  This will be used to identify the client in the system
                </p>
              </div>

              {!generatedPassword && (
                <div className="flex gap-2 pt-2">
                  <Button type="submit" disabled={isLoading} className="flex-1">
                    {isLoading ? "Creating Account..." : "Create Client Account"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin/clients")}
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
          <Card className="border-success">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <Check className="h-5 w-5" />
                Account Created Successfully
              </CardTitle>
              <CardDescription>
                Share these credentials with the client securely
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      <strong>Email:</strong> {email}
                    </div>
                    <div className="flex items-center gap-2">
                      <strong>Temporary Password:</strong>
                      <code className="relative rounded bg-muted px-2 py-1 font-mono text-sm">
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
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> Make sure to save this password. The client will need to change it on their first login.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleReset} className="flex-1">
                  Invite Another Client
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/clients")}
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
