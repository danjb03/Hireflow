import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Building2, User, Briefcase, FileText, Calendar, Link, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import RepLayout from "@/components/RepLayout";

const RepSubmitLead = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [airtableRepId, setAirtableRepId] = useState<string>("");
  const [repName, setRepName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

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
    callback1: "",
    callback2: "",
    callback3: "",
    closeLinkUrl: "",
  });

  useEffect(() => {
    loadRepData();
  }, [navigate]);

  const loadRepData = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);

    // Get rep profile with airtable_rep_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('airtable_rep_id, client_name')
      .eq('id', session.user.id)
      .single();

    if (profile?.airtable_rep_id) {
      setAirtableRepId(profile.airtable_rep_id);
      setRepName(profile.client_name || "");
    } else {
      toast.error("Your profile is not configured with an Airtable rep ID");
    }

    setIsLoading(false);
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!airtableRepId) {
      toast.error("Your profile is not configured correctly. Please contact an admin.");
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("submit-lead", {
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
          repId: airtableRepId,
          callback1: formData.callback1,
          callback2: formData.callback2,
          callback3: formData.callback3,
          closeLinkUrl: formData.closeLinkUrl,
        },
      });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Lead submitted successfully!");
    } catch (error: any) {
      console.error('Error submitting lead:', error);
      toast.error("Failed to submit lead: " + (error.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      companyName: "", contactName: "", email: "", phone: "",
      companyWebsite: "", companyLinkedIn: "", contactTitle: "",
      contactLinkedIn: "", jobTitle: "", jobDescription: "", aiSummary: "",
      callback1: "", callback2: "", callback3: "", closeLinkUrl: "",
    });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <RepLayout userEmail={user?.email}>
        <div className="max-w-2xl mx-auto">
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="py-12">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
                <h2 className="text-2xl font-semibold text-emerald-700 mb-2">Lead Submitted!</h2>
                <p className="text-muted-foreground mb-6">
                  Your lead has been added to the system and will be reviewed shortly.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleReset} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                    Submit Another Lead
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/rep/leads")}>
                    View My Leads
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </RepLayout>
    );
  }

  return (
    <RepLayout userEmail={user?.email}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Submit New Lead</h1>
          <p className="text-muted-foreground mt-1">Add a new lead to the system</p>
          {repName && (
            <p className="text-sm text-muted-foreground mt-2">
              Submitting as: <span className="font-medium text-foreground">{repName}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Close Link URL */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Close Link URL
              </CardTitle>
              <CardDescription>
                If you have a Close.com link for this lead, paste it here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="closeLinkUrl">Close Link URL</Label>
                <Input
                  id="closeLinkUrl"
                  placeholder="https://app.close.com/..."
                  value={formData.closeLinkUrl}
                  onChange={e => updateField('closeLinkUrl', e.target.value)}
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

          <div className="flex gap-3">
            <Button type="submit" size="lg" className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600" disabled={submitting || !airtableRepId}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Lead"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => navigate("/rep/dashboard")}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </RepLayout>
  );
};

export default RepSubmitLead;
