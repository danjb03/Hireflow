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
      <div className="-mx-4 -my-6 max-w-2xl space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
            <span className="size-2 rounded-full bg-[#34B192]" />
            Team access
          </div>
          <h1 className="text-3xl font-semibold text-[#222121]">
            <span className="text-[#222121]/40">Invite a</span>{" "}
            <span className="text-[#222121]">sales rep.</span>
          </h1>
          <p className="text-sm text-[#222121]/60">
            Create a portal account for a sales rep.
          </p>
        </div>

        {/* Form Card */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-[#222121]">Rep Information</CardTitle>
            <CardDescription className="text-[#222121]/60">
              Select the rep from Airtable and enter their email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleInvite} className="space-y-4">
              {/* Airtable Rep Selection */}
              <div className="space-y-2">
                <Label htmlFor="airtableRep" className="text-sm text-[#222121]/70">Sales Rep *</Label>
                {loadingReps ? (
                  <div className="flex h-10 items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[#34B192]" />
                    <span className="text-[#222121]/50">Loading reps...</span>
                  </div>
                ) : airtableReps.length > 0 ? (
                  <Select
                    value={selectedAirtableRep}
                    onValueChange={handleAirtableRepSelect}
                    disabled={inviteSuccess}
                  >
                    <SelectTrigger className="h-11 w-full rounded-full border-[#222121]/10 bg-white text-sm text-[#222121]">
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
                  <Alert className="border border-[#222121]/10 bg-white">
                    <AlertDescription className="text-[#222121]/60">
                      No reps found in Airtable. Please create a rep in Airtable first.
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-[#222121]/50">
                  Select which rep to create a portal account for
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="repName" className="text-sm text-[#222121]/70">Rep Name</Label>
                <Input
                  id="repName"
                  placeholder="Auto-filled from selection"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  required
                  disabled={inviteSuccess || !!selectedAirtableRep}
                  className="h-11 rounded-full border-[#222121]/10 bg-white text-[#222121] placeholder:text-[#222121]/40"
                />
                <p className="text-sm text-[#222121]/50">
                  {selectedAirtableRep ? "Name from selected rep" : "Select a rep above"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-[#222121]/70">Rep Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="rep@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={inviteSuccess}
                  className="h-11 rounded-full border-[#222121]/10 bg-white text-[#222121] placeholder:text-[#222121]/40"
                />
                <p className="text-sm text-[#222121]/50">
                  This rep will receive login credentials via email
                </p>
              </div>

              {!inviteSuccess && (
                <div className="flex flex-col gap-2 pt-4 sm:flex-row">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    variant="ghost"
                    className="h-11 flex-1 rounded-full bg-[#34B192] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                  >
                    {isLoading ? "Creating Account..." : "Send Invite"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate("/admin/clients")}
                    className="h-11 flex-1 rounded-full border border-[#222121]/10 bg-white text-sm font-semibold text-[#222121] transition-all hover:bg-[#34B192]/5 sm:flex-none sm:px-6"
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
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <Check className="h-5 w-5 text-[#34B192]" />
                Rep Invited Successfully
              </CardTitle>
              <CardDescription className="text-[#222121]/60">
                A welcome email has been sent to the rep
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <Alert className="border border-[#222121]/10 bg-white">
                <Send className="h-4 w-4 text-[#34B192]" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>
                      <strong>Welcome email sent to:</strong> {email}
                    </p>
                    <p className="text-[#222121]/60">
                      The email contains their login credentials and a link to access the rep portal.
                      They can log in immediately using the credentials in the email.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  className="h-11 flex-1 rounded-full bg-[#34B192] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                >
                  Invite Another Rep
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/admin/clients")}
                  className="h-11 flex-1 rounded-full border border-[#222121]/10 bg-white text-sm font-semibold text-[#222121] transition-all hover:bg-[#34B192]/5 sm:flex-none sm:px-6"
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
