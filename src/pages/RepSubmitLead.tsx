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
    titlesOfRoles: "",
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
          titlesOfRoles: formData.titlesOfRoles,
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
      contactLinkedIn: "", titlesOfRoles: "", aiSummary: "",
      callback1: "", callback2: "", callback3: "", closeLinkUrl: "",
    });
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <RepLayout userEmail={user?.email}>
        <div className="max-w-2xl mx-auto">
          <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="py-12">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#34B192]/10">
                  <CheckCircle className="h-8 w-8 text-[#34B192]" />
                </div>
                <h2 className="text-2xl font-semibold text-[#222121] mb-2">Lead Submitted!</h2>
                <p className="text-[#222121]/60 mb-6">
                  Your lead has been added to the system and will be reviewed shortly.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={handleReset}
                    variant="ghost"
                    className="h-10 rounded-full bg-[#34B192] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                  >
                    Submit Another Lead
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/rep/leads")}
                    className="h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
                  >
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
      <div className="-mx-4 -my-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        <div className="max-w-4xl mx-auto">
        <div className="mb-6 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
            <span className="size-2 rounded-full bg-[#34B192]" />
            Submit new lead
          </div>
          <h1 className="text-3xl font-semibold text-[#222121]">Submit New Lead</h1>
          <p className="text-sm text-[#222121]/60">Add a new lead to the system</p>
          {repName && (
            <p className="text-sm text-[#222121]/60">
              Submitting as: <span className="font-medium text-[#222121]">{repName}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <Building2 className="h-5 w-5 text-[#34B192]" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input id="companyName" value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} required className="h-11 rounded-full border-[#222121]/15 bg-white text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Company Website</Label>
                <Input id="companyWebsite" placeholder="https://..." value={formData.companyWebsite} onChange={e => updateField('companyWebsite', e.target.value)} className="h-11 rounded-full border-[#222121]/15 bg-white text-sm" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="companyLinkedIn">Company LinkedIn</Label>
                <Input id="companyLinkedIn" placeholder="https://linkedin.com/company/..." value={formData.companyLinkedIn} onChange={e => updateField('companyLinkedIn', e.target.value)} className="h-11 rounded-full border-[#222121]/15 bg-white text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <User className="h-5 w-5 text-[#34B192]" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input id="contactName" value={formData.contactName} onChange={e => updateField('contactName', e.target.value)} required className="h-11 rounded-full border-[#222121]/15 bg-white text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactTitle">Contact Title / Role</Label>
                <Input id="contactTitle" placeholder="e.g. HR Manager, CEO" value={formData.contactTitle} onChange={e => updateField('contactTitle', e.target.value)} className="h-11 rounded-full border-[#222121]/15 bg-white text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} required className="h-11 rounded-full border-[#222121]/15 bg-white text-sm" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" value={formData.phone} onChange={e => updateField('phone', e.target.value)} required className="h-11 rounded-full border-[#222121]/15 bg-white text-sm" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contactLinkedIn">Contact LinkedIn</Label>
                <Input id="contactLinkedIn" placeholder="https://linkedin.com/in/..." value={formData.contactLinkedIn} onChange={e => updateField('contactLinkedIn', e.target.value)} className="h-11 rounded-full border-[#222121]/15 bg-white text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Roles Hiring */}
          <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <Briefcase className="h-5 w-5 text-[#34B192]" />
                Roles Hiring
              </CardTitle>
              <CardDescription className="text-[#222121]/60">
                What role(s) are they hiring for?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titlesOfRoles">Titles of Roles They're Hiring For</Label>
                <Input
                  id="titlesOfRoles"
                  placeholder="e.g. Software Developer, Sales Manager"
                  value={formData.titlesOfRoles}
                  onChange={e => updateField('titlesOfRoles', e.target.value)}
                  className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Callback Dates & Times */}
          <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <Calendar className="h-5 w-5 text-[#34B192]" />
                Callback Appointment Slots
              </CardTitle>
              <CardDescription className="text-[#222121]/60">
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
                  className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callback2">Callback Option 2 (Alternative)</Label>
                <Input
                  id="callback2"
                  type="datetime-local"
                  value={formData.callback2}
                  onChange={e => updateField('callback2', e.target.value)}
                  className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="callback3">Callback Option 3 (Alternative)</Label>
                <Input
                  id="callback3"
                  type="datetime-local"
                  value={formData.callback3}
                  onChange={e => updateField('callback3', e.target.value)}
                  className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Close Link URL */}
          <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <Link className="h-5 w-5 text-[#34B192]" />
                Close Link URL
              </CardTitle>
              <CardDescription className="text-[#222121]/60">
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
                  className="h-11 rounded-full border-[#222121]/15 bg-white text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Call Notes */}
          <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <FileText className="h-5 w-5 text-[#34B192]" />
                Call Notes & Summary
              </CardTitle>
              <CardDescription className="text-sm space-y-1 text-[#222121]/60">
                <p>Please include details about the call:</p>
                <ul className="list-disc list-inside text-[#222121]/60 mt-2 space-y-1">
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
                className="resize-none rounded-2xl border-[#222121]/15 text-sm"
              />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              type="submit"
              size="lg"
              variant="ghost"
              className="flex-1 h-12 rounded-full bg-[#34B192] text-base font-semibold text-white shadow-[0_6px_18px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
              disabled={submitting || !airtableRepId}
            >
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Lead"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => navigate("/rep/dashboard")}
              className="h-12 rounded-full border-[#222121]/20 bg-white text-base font-semibold text-[#222121] hover:bg-[#F7F7F7]"
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
      </div>
    </RepLayout>
  );
};

export default RepSubmitLead;
