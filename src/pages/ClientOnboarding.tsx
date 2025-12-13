import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Building2, MapPin, Briefcase, Target } from "lucide-react";
import { toast } from "sonner";

const ClientOnboarding = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    clientName: "",
    contactPerson: "",
    email: "",
    phone: "",
    companyWebsite: "",
    companyName: "",
    location: "",
    marketsServed: "",
    industriesServed: "",
    subIndustries: "",
    roleTypes: "",
    staffingModel: "",
    lastRolesPlaced: "",
    lastCompaniesWorkedWith: "",
    currentCandidates: "",
    uniqueSellingPoints: "",
    nicheSuccesses: "",
    outreachMethods: ""
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }

      // Check if onboarding is already completed
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .single();

      if (profile?.onboarding_completed) {
        navigate('/client/dashboard');
        return;
      }

      setChecking(false);
    };

    checkAuth();
  }, [navigate]);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke('register-client', {
        body: formData
      });

      if (error) throw error;

      toast.success("Welcome to Hireflow! Your onboarding is complete. Let's find you some leads!");
      
      navigate('/client/dashboard');
    } catch (error) {
      console.error('Error submitting onboarding:', error);
      toast.error(error instanceof Error ? error.message : "Failed to complete onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Hireflow!</h1>
          <p className="text-muted-foreground mt-2">
            Let's get to know your business so we can find the perfect leads for you.
          </p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`h-2 w-16 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'}`} 
              />
            ))}
          </div>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Tell us about you and your company</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    placeholder="How we'll refer to you"
                    value={formData.clientName}
                    onChange={e => updateField('clientName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input
                    id="contactPerson"
                    placeholder="Your name"
                    value={formData.contactPerson}
                    onChange={e => updateField('contactPerson', e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={e => updateField('email', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+44 123 456 7890"
                    value={formData.phone}
                    onChange={e => updateField('phone', e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Your recruitment agency"
                    value={formData.companyName}
                    onChange={e => updateField('companyName', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyWebsite">Company Website</Label>
                  <Input
                    id="companyWebsite"
                    placeholder="https://yourcompany.com"
                    value={formData.companyWebsite}
                    onChange={e => updateField('companyWebsite', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={e => updateField('location', e.target.value)}
                  required
                />
              </div>
              <Button onClick={nextStep} className="w-full bg-primary hover:bg-primary/90">Continue</Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Markets & Industries
              </CardTitle>
              <CardDescription>Where and who do you recruit for?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="marketsServed">Markets You Serve (Locations) *</Label>
                <Textarea
                  id="marketsServed"
                  placeholder="e.g. UK, London, South East England, Remote UK roles..."
                  value={formData.marketsServed}
                  onChange={e => updateField('marketsServed', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industriesServed">Industries You Serve *</Label>
                <Textarea
                  id="industriesServed"
                  placeholder="e.g. Technology, Financial Services, Healthcare..."
                  value={formData.industriesServed}
                  onChange={e => updateField('industriesServed', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subIndustries">Sub-industries / Specializations</Label>
                <Textarea
                  id="subIndustries"
                  placeholder="e.g. Fintech, SaaS, Biotech, specific niches..."
                  value={formData.subIndustries}
                  onChange={e => updateField('subIndustries', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={prevStep} className="flex-1">Back</Button>
                <Button onClick={nextStep} className="flex-1 bg-primary hover:bg-primary/90">Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Your Recruitment Focus
              </CardTitle>
              <CardDescription>Help us understand what you place</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roleTypes">Types of Roles You Hire For *</Label>
                <Textarea
                  id="roleTypes"
                  placeholder="e.g. Software Engineers, Sales Executives, Finance Directors..."
                  value={formData.roleTypes}
                  onChange={e => updateField('roleTypes', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staffingModel">Staffing Model *</Label>
                <Select value={formData.staffingModel} onValueChange={v => updateField('staffingModel', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your primary model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contingent">Contingent (Permanent)</SelectItem>
                    <SelectItem value="Temporary">Temporary / Contract</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastRolesPlaced">Last 5 Roles Placed *</Label>
                <Textarea
                  id="lastRolesPlaced"
                  placeholder="Describe your recent placements with context (role, level, industry)..."
                  value={formData.lastRolesPlaced}
                  onChange={e => updateField('lastRolesPlaced', e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastCompaniesWorkedWith">Last 5 Companies Worked With *</Label>
                <Textarea
                  id="lastCompaniesWorkedWith"
                  placeholder="List companies with brief context - we use this to find similar businesses to target..."
                  value={formData.lastCompaniesWorkedWith}
                  onChange={e => updateField('lastCompaniesWorkedWith', e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">This helps us build lookalike searches</p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={prevStep} className="flex-1">Back</Button>
                <Button onClick={nextStep} className="flex-1 bg-primary hover:bg-primary/90">Continue</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Your Edge & Current Candidates
              </CardTitle>
              <CardDescription>What makes you different and who do you have available?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentCandidates">5 Current Candidates *</Label>
                <Textarea
                  id="currentCandidates"
                  placeholder="List at least 5 candidates you have available now. Include: title, experience level, key skills, industries. We use this for candidate-led outreach..."
                  value={formData.currentCandidates}
                  onChange={e => updateField('currentCandidates', e.target.value)}
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">We'll use these to run candidate-led campaigns</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="uniqueSellingPoints">Your Unique Selling Points *</Label>
                <Textarea
                  id="uniqueSellingPoints"
                  placeholder="In your own words, what makes you different from other recruiters?"
                  value={formData.uniqueSellingPoints}
                  onChange={e => updateField('uniqueSellingPoints', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nicheSuccesses">Niches You've Done Well In</Label>
                <Textarea
                  id="nicheSuccesses"
                  placeholder="Any specific areas where you've had great success?"
                  value={formData.nicheSuccesses}
                  onChange={e => updateField('nicheSuccesses', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outreachMethods">Your Current Outreach Methods</Label>
                <Textarea
                  id="outreachMethods"
                  placeholder="How do you currently win new clients? (cold calling, LinkedIn, referrals, etc.)"
                  value={formData.outreachMethods}
                  onChange={e => updateField('outreachMethods', e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={prevStep} className="flex-1">Back</Button>
                <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-primary hover:bg-primary/90">
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    "Complete Onboarding"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClientOnboarding;

