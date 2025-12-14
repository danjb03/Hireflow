import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, User, Briefcase, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SubmitLead = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    companyWebsite: "",
    companyLinkedIn: "",
    industry: "",
    employeeCount: "",
    country: "",
    address: "",
    contactTitle: "",
    contactLinkedIn: "",
    jobTitle: "",
    jobType: "",
    jobLevel: "",
    jobUrl: "",
    jobDescription: "",
    aiSummary: "",
    availability: ""
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const response = await supabase.functions.invoke('submit-lead', {
        body: {
          ...formData,
          employeeCount: formData.employeeCount ? parseInt(formData.employeeCount) : null
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
        companyWebsite: "", companyLinkedIn: "", industry: "",
        employeeCount: "", country: "", address: "", contactTitle: "",
        contactLinkedIn: "", jobTitle: "", jobType: "", jobLevel: "",
        jobUrl: "", jobDescription: "", aiSummary: "", availability: ""
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Submit New Lead</h1>
          <p className="text-muted-foreground mt-2">Add a new lead to the system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                <Input id="companyWebsite" value={formData.companyWebsite} onChange={e => updateField('companyWebsite', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyLinkedIn">Company LinkedIn</Label>
                <Input id="companyLinkedIn" value={formData.companyLinkedIn} onChange={e => updateField('companyLinkedIn', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" value={formData.industry} onChange={e => updateField('industry', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeCount">Employee Count</Label>
                <Input id="employeeCount" type="number" value={formData.employeeCount} onChange={e => updateField('employeeCount', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={formData.country} onChange={e => updateField('country', e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formData.address} onChange={e => updateField('address', e.target.value)} />
              </div>
            </CardContent>
          </Card>

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
                <Label htmlFor="contactTitle">Contact Title</Label>
                <Input id="contactTitle" value={formData.contactTitle} onChange={e => updateField('contactTitle', e.target.value)} />
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
                <Input id="contactLinkedIn" value={formData.contactLinkedIn} onChange={e => updateField('contactLinkedIn', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input id="jobTitle" value={formData.jobTitle} onChange={e => updateField('jobTitle', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobUrl">Job URL</Label>
                <Input id="jobUrl" value={formData.jobUrl} onChange={e => updateField('jobUrl', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type</Label>
                <Select value={formData.jobType} onValueChange={v => updateField('jobType', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Temporary">Temporary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobLevel">Job Level</Label>
                <Select value={formData.jobLevel} onValueChange={v => updateField('jobLevel', v)}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Entry">Entry</SelectItem>
                    <SelectItem value="Mid">Mid</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                    <SelectItem value="Executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea id="jobDescription" value={formData.jobDescription} onChange={e => updateField('jobDescription', e.target.value)} rows={3} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes & Callback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="availability">Availability (When to call)</Label>
                <Input id="availability" placeholder="e.g. Monday 2pm, 15/12/2025 10:00am" value={formData.availability} onChange={e => updateField('availability', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="aiSummary">Notes / Summary</Label>
                <Textarea id="aiSummary" placeholder="Any relevant notes about this lead..." value={formData.aiSummary} onChange={e => updateField('aiSummary', e.target.value)} rows={4} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Lead"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default SubmitLead;

