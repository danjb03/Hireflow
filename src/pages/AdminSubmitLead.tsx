import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";

interface AirtableRep {
  id: string;
  name: string;
  email: string;
}

const AdminSubmitLead = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [reps, setReps] = useState<AirtableRep[]>([]);
  const [loadingReps, setLoadingReps] = useState(true);
  const [formData, setFormData] = useState({
    companyName: "",
    companyWebsite: "",
    companyLinkedIn: "",
    industry: "",
    notes: "",
    repId: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);

      // Load reps from Airtable
      await loadReps();
    };
    init();
  }, []);

  const loadReps = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-airtable-reps`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const result = await response.json();
      if (result.success) {
        setReps(result.reps || []);
      }
    } catch (error) {
      console.error("Error loading reps:", error);
    } finally {
      setLoadingReps(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.companyWebsite) {
      toast({
        title: "Error",
        description: "Company name and website are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("submit-lead", {
        body: formData,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead submitted successfully",
      });

      setFormData({
        companyName: "",
        companyWebsite: "",
        companyLinkedIn: "",
        industry: "",
        notes: "",
        repId: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit lead",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">Submit New Lead</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a new company lead to the system
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
            <CardDescription>
              Enter the company details to create a new lead
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Rep Assignment Section */}
              <div className="space-y-4 pb-4 border-b">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Rep Assignment
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="repId">Assigned Rep</Label>
                  {loadingReps ? (
                    <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-muted-foreground text-sm">Loading reps...</span>
                    </div>
                  ) : (
                    <Select
                      value={formData.repId}
                      onValueChange={(value) => setFormData({ ...formData, repId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a rep (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No rep assigned</SelectItem>
                        {reps.map((rep) => (
                          <SelectItem key={rep.id} value={rep.id}>
                            {rep.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Assign this lead to a rep for tracking and commission purposes
                  </p>
                </div>
              </div>

              {/* Company Details Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Company Details</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">
                      Company Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      placeholder="Acme Inc."
                      value={formData.companyName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      name="industry"
                      placeholder="Technology"
                      value={formData.industry}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">
                    Company Website <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="companyWebsite"
                    name="companyWebsite"
                    placeholder="https://example.com"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyLinkedIn">Company LinkedIn</Label>
                  <Input
                    id="companyLinkedIn"
                    name="companyLinkedIn"
                    placeholder="https://linkedin.com/company/example"
                    value={formData.companyLinkedIn}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-medium">Additional Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Add any additional notes about this lead..."
                    value={formData.notes}
                    onChange={handleChange}
                    rows={4}
                  />
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Lead"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/leads")}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSubmitLead;
