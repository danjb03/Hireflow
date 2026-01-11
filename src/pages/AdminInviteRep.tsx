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

interface AirtableRep {
  id: string;
  name: string;
  email?: string | null;
}

const AdminInviteRep = () => {
  const navigate = useNavigate();
  const [airtableReps, setAirtableReps] = useState<AirtableRep[]>([]);
  const [selectedAirtableRep, setSelectedAirtableRep] = useState<string>("");
  const [loadingReps, setLoadingReps] = useState(true);
  const [repName, setRepName] = useState("");
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

  // Fetch Airtable reps on mount
  useEffect(() => {
    const fetchAirtableReps = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-airtable-reps");
        if (error) {
          console.error("Error fetching Airtable reps:", error);
          return;
        }
        if (data?.reps) {
          setAirtableReps(data.reps);
        }
      } catch (error) {
        console.error("Error fetching Airtable reps:", error);
      } finally {
        setLoadingReps(false);
      }
    };
    fetchAirtableReps();
  }, []);

  // When an Airtable rep is selected, auto-fill rep name and email
  const handleAirtableRepSelect = (repId: string) => {
    setSelectedAirtableRep(repId);
    const rep = airtableReps.find(r => r.id === repId);
    if (rep) {
      setRepName(rep.name);
      if (rep.email) {
        setEmail(rep.email);
      }
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Require Airtable rep selection
    if (!selectedAirtableRep) {
      toast.error("Please select an Airtable rep");
      return;
    }

    // Validation: Don't allow submission if repName is empty
    if (!repName.trim()) {
      toast.error("Rep Name is required");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("invite-rep", {
        body: {
          email,
          repName: repName.trim(),
          airtableRepId: selectedAirtableRep,
        }
      });

      if (error) throw error;

      setInviteSuccess(true);
      toast.success("Rep invited successfully! Welcome email sent.");
    } catch (error: any) {
      toast.error("Failed to invite rep: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedAirtableRep("");
    setRepName("");
    setEmail("");
    setInviteSuccess(false);
  };

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Invite Sales Rep</h1>
          <p className="text-base text-muted-foreground mt-1">
            Create a portal account for a sales rep
          </p>
        </div>

        {/* Form Card */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-6 pb-4">
            <CardTitle>Rep Information</CardTitle>
            <CardDescription>
              Select the rep from Airtable and enter their email address
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleInvite} className="space-y-4">
              {/* Airtable Rep Selection */}
              <div className="space-y-2">
                <Label htmlFor="airtableRep">Sales Rep *</Label>
                {loadingReps ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground">Loading reps...</span>
                  </div>
                ) : airtableReps.length > 0 ? (
                  <Select
                    value={selectedAirtableRep}
                    onValueChange={handleAirtableRepSelect}
                    disabled={inviteSuccess}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a sales rep" />
                    </SelectTrigger>
                    <SelectContent>
                      {airtableReps.map((rep) => (
                        <SelectItem key={rep.id} value={rep.id}>
                          {rep.name} {rep.email ? `(${rep.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Alert>
                    <AlertDescription>
                      No reps found in Airtable. Please create a rep in Airtable first.
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-muted-foreground">
                  Select which rep to create a portal account for
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repName">Rep Name</Label>
                <Input
                  id="repName"
                  placeholder="Auto-filled from selection"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  required
                  disabled={inviteSuccess || !!selectedAirtableRep}
                />
                <p className="text-sm text-muted-foreground">
                  {selectedAirtableRep ? "Name from selected rep" : "Select a rep above"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Rep Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rep@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={inviteSuccess}
                />
                <p className="text-sm text-muted-foreground">
                  This rep will receive login credentials via email
                </p>
              </div>

              {!inviteSuccess && (
                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white transition-all duration-200"
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
          <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <Check className="h-5 w-5" />
                Rep Invited Successfully
              </CardTitle>
              <CardDescription>
                A welcome email has been sent to the rep
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <Alert className="bg-white border-blue-200">
                <Send className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      <strong>Welcome email sent to:</strong> {email}
                    </p>
                    <p className="text-muted-foreground">
                      The email contains their login credentials and a link to access the rep portal.
                      They can log in immediately using the credentials in the email.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleReset}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white transition-all duration-200"
                >
                  Invite Another Rep
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin/clients")}
                  className="transition-colors duration-200"
                >
                  Back to Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminInviteRep;
