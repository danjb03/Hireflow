import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, User, Briefcase, FileText, Users, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";

interface AirtableRep {
  id: string;
  name: string;
  email: string;
}

const AdminSubmitLead = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [reps, setReps] = useState<AirtableRep[]>([]);
  const [loadingReps, setLoadingReps] = useState(true);
  const [repsError, setRepsError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    companyWebsite: "",
    companyLinkedIn: "",
    contactTitle: "",
    contactLinkedIn: "",
    jobTitle: "",
    jobDescription: "",
    aiSummary: "",
    repId: "",
    callback1: "",
    callback2: "",
    callback3: "",
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
      await loadReps();
    };
    init();
  }, []);

  const loadReps = async () => {
    try {
      setRepsError(null);
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-airtable-reps`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session?.access_token || ''}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      const result = await response.json();
      console.log("Reps response:", result);

      if (result.success) {
        setReps(result.reps || []);
        if (!result.reps || result.reps.length === 0) {
          setRepsError("No reps found. Please add reps to the Reps table in Airtable.");
        }
      } else {
        setRepsError(result.error || "Failed to load reps");
      }
    } catch (error: any) {
      console.error("Error loading reps:", error);
      setRepsError(error?.message || "Failed to load reps");
    } finally {
      setLoadingReps(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.repId) {
      toast({
        title: "Rep Required",
        description: "Please select which rep generated this lead.",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await supabase.functions.invoke('submit-lead', {
        body: {
          companyName: formData.companyName,
          contactName: formData.contactName,
          email: formData.email,
          phone: formData.phone,
          companyWebsite: formData.companyWebsite,
          companyLinkedIn: formData.companyLinkedIn,
          contactTitle: formData.contactTitle,
          contactLinkedIn: formData.contactLinkedIn,
          jobTitle: formData.jobTitle,
          jobDescription: formData.jobDescription,
          aiSummary: formData.aiSummary,
          repId: formData.repId,
          callback1: formData.callback1,
          callback2: formData.callback2,
          callback3: formData.callback3,
        }
      });

      if (response.error) throw response.error;

      toast({
        title: "Lead Submitted!",
        description: "The lead has been added successfully.",
      });

      // Reset form
      setFormData({
        companyName: "", contactName: "", email: "", phone: "",
        companyWebsite: "", companyLinkedIn: "", contactTitle: "",
        contactLinkedIn: "", jobTitle: "", jobDescription: "", aiSummary: "", repId: "",
        callback1: "", callback2: "", callback3: "",
      });
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast({
        title: "Error",
        description: "Failed to submit lead. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Submit New Lead</h1>
          <p className="text-muted-foreground mt-2">Add a new lead to the system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Rep Selection - REQUIRED */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Rep Assignment *
              </CardTitle>
              <CardDescription>
                Select which rep generated this lead
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingReps ? (
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-muted-foreground text-sm">Loading reps...</span>
                </div>
              ) : repsError ? (
                <div className="p-3 border border-red-200 bg-red-50 rounded-md text-red-700 text-sm">
                  {repsError}
                  <Button variant="link" className="text-red-700 p-0 h-auto ml-2" onClick={loadReps}>
                    Retry
                  </Button>
                </div>
              ) : reps.length === 0 ? (
                <div className="p-3 border border-yellow-200 bg-yellow-50 rounded-md text-yellow-700 text-sm">
                  No reps available. Please add reps to the Reps table in Airtable.
                </div>
              ) : (
                <Select
                  value={formData.repId}
                  onValueChange={(value) => updateField('repId', value)}
                  required
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select the rep who generated this lead *" />
                  </SelectTrigger>
                  <SelectContent>
                    {reps.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>
                        {rep.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Company Website</Label>
                <Input id="companyWebsite" placeholder="https://..." value={formData.companyWebsite} onChange={e => updateField('companyWebsite', e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="companyLinkedIn">Company LinkedIn</Label>
                <Input id="companyLinkedIn" placeholder="https://linkedin.com/company/..." value={formData.companyLinkedIn} onChange={e => updateField('companyLinkedIn', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input id="contactName" value={formData.contactName} onChange={e => updateField('contactName', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactTitle">Contact Title / Role</Label>
                <Input id="contactTitle" placeholder="e.g. HR Manager, CEO" value={formData.contactTitle} onChange={e => updateField('contactTitle', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" value={formData.phone} onChange={e => updateField('phone', e.target.value)} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contactLinkedIn">Contact LinkedIn</Label>
                <Input id="contactLinkedIn" placeholder="https://linkedin.com/in/..." value={formData.contactLinkedIn} onChange={e => updateField('contactLinkedIn', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Job Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Information
              </CardTitle>
              <CardDescription>
                What role(s) are they hiring for? What did they mention on the call?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title / Role They're Hiring For</Label>
                <Input id="jobTitle" placeholder="e.g. Software Developer, Sales Manager" value={formData.jobTitle} onChange={e => updateField('jobTitle', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobDescription">Role Details</Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Any details about the role they mentioned..."
                  value={formData.jobDescription}
                  onChange={e => updateField('jobDescription', e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Callback Dates & Times */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Callback Appointment Slots
              </CardTitle>
              <CardDescription>
                Enter the date(s) and time(s) the lead is available for a callback. Add up to 3 options.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="callback1">Callback Option 1</Label>
                <Input
                  id="callback1"
                  type="datetime-local"
                  value={formData.callback1}
                  onChange={e => updateField('callback1', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callback2">Callback Option 2 (Alternative)</Label>
                <Input
                  id="callback2"
                  type="datetime-local"
                  value={formData.callback2}
                  onChange={e => updateField('callback2', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callback3">Callback Option 3 (Alternative)</Label>
                <Input
                  id="callback3"
                  type="datetime-local"
                  value={formData.callback3}
                  onChange={e => updateField('callback3', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Call Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Call Notes & Summary
              </CardTitle>
              <CardDescription className="text-sm space-y-1">
                <p>Please include details about the call:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                  <li>How did the call go overall?</li>
                  <li>Was the customer interested in moving forward?</li>
                  <li>Did the customer explicitly agree to work with a recruiter?</li>
                  <li>Did the customer confirm a callback date and time?</li>
                  <li>What did they mention about the roles they're hiring for?</li>
                  <li>Any other relevant information from the conversation</li>
                </ul>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="aiSummary"
                placeholder="Enter your call notes here... Include all relevant details about the conversation, customer interest level, and any important information mentioned during the call."
                value={formData.aiSummary}
                onChange={e => updateField('aiSummary', e.target.value)}
                rows={6}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" size="lg" className="flex-1" disabled={submitting || !formData.repId}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Lead"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => navigate("/admin/leads")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default AdminSubmitLead;
