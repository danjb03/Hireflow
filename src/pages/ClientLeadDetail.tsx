import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Loader2, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Briefcase,
  Users,
  FileText,
  Linkedin,
  ExternalLink,
  Clock,
  Sparkles
} from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

interface LeadDetail {
  id: string;
  companyName: string;
  status: string;
  clients: string;

  contactName: string | null;
  contactTitle: string | null;
  email: string;
  phone: string;
  contactLinkedIn: string | null;

  companyWebsite: string;
  companyLinkedIn: string | null;
  companyDescription: string | null;
  address: string | null;
  country: string | null;
  industry: string | null;
  employeeCount: number | null;
  companySize: string | null;

  jobTitle: string | null;
  jobDescription: string | null;
  jobUrl: string | null;
  jobType: string | null;
  jobLevel: string | null;

  aiSummary: string | null;
  booking: string | null;
  availability: string | null;
  lastContactDate: string | null;
  nextAction: string | null;
  dateCreated: string;
  feedback: string | null;

  // Callback appointment slots
  callbackDate1: string | null;
  callbackTime1: string | null;
  callbackDate2: string | null;
  callbackTime2: string | null;
  callbackDate3: string | null;
  callbackTime3: string | null;
}

const ClientLeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);
    await fetchLeadDetail();
  };

  const fetchLeadDetail = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("get-lead-details", {
        body: { leadId: id }
      });

      if (error) throw error;

      setLead(data.lead);
      setFeedback(data.lead.feedback || "");
    } catch (error: any) {
      toast.error("Failed to load lead details: " + error.message);
      navigate("/client/leads");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast.error("Please enter feedback");
      return;
    }

    try {
      setIsSubmittingFeedback(true);
      const { error } = await supabase.functions.invoke("update-lead-feedback", {
        body: { leadId: id, feedback }
      });

      if (error) throw error;

      toast.success("Feedback submitted successfully");
      await fetchLeadDetail();
    } catch (error: any) {
      toast.error("Failed to submit feedback: " + error.message);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case "new":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "approved":
      case "booked":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "needs work":
      case "in progress":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "contacted":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-blue-100 text-blue-700 border-blue-200";
    }
  };

  const getLeadDescription = () => {
    return "New lead generated. Be sure to contact the customer on the pre-agreed date and time for the callback suggested by us.";
  };

  if (isLoading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  if (!lead) {
    return null;
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="p-6 lg:p-8 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/client/leads")} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Leads
        </Button>

        {/* Callback Appointment Slots */}
        {(lead.callbackDate1 || lead.callbackDate2 || lead.callbackDate3 || lead.availability || lead.booking) ? (
          <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 border-2 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-emerald-700">
                <Phone className="h-5 w-5" />
                Callback Appointment Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.callbackDate1 && lead.callbackTime1 && (
                <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-emerald-200">
                  <div className="p-2 bg-emerald-100 rounded-full">
                    <Clock className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Option 1 (Primary)</p>
                    <p className="text-base font-semibold text-emerald-700">
                      {new Date(lead.callbackDate1).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {lead.callbackTime1}
                    </p>
                  </div>
                </div>
              )}
              {lead.callbackDate2 && lead.callbackTime2 && (
                <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-emerald-200">
                  <div className="p-2 bg-emerald-100 rounded-full">
                    <Clock className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Option 2 (Alternative)</p>
                    <p className="text-base font-semibold text-emerald-700">
                      {new Date(lead.callbackDate2).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {lead.callbackTime2}
                    </p>
                  </div>
                </div>
              )}
              {lead.callbackDate3 && lead.callbackTime3 && (
                <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-emerald-200">
                  <div className="p-2 bg-emerald-100 rounded-full">
                    <Clock className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Option 3 (Alternative)</p>
                    <p className="text-base font-semibold text-emerald-700">
                      {new Date(lead.callbackDate3).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {lead.callbackTime3}
                    </p>
                  </div>
                </div>
              )}
              {lead.availability && !lead.callbackDate1 && (
                <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-emerald-200">
                  <div className="p-2 bg-emerald-100 rounded-full">
                    <Clock className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Availability Notes</p>
                    <p className="text-base font-semibold text-emerald-700">{lead.availability}</p>
                  </div>
                </div>
              )}
              {lead.booking && (
                <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg border border-blue-200">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Original Booking</p>
                    <p className="text-base font-semibold text-blue-700">{lead.booking}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 border-2 mb-6">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <Phone className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-base text-emerald-600 font-medium">Scheduled Callback</p>
                <p className="text-base text-muted-foreground">No callback scheduled</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lead Hero Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-4xl font-bold text-foreground">{lead.companyName}</h1>
                  <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                </div>
                {lead.companyDescription && (
                  <p className="text-muted-foreground text-lg mt-2 leading-relaxed">{lead.companyDescription}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-4">
                  {lead.companyWebsite && (
                    <a 
                      href={lead.companyWebsite} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline inline-flex items-center gap-1 text-base"
                    >
                      <Globe className="h-4 w-4" />
                      {lead.companyWebsite}
                    </a>
                  )}
                  {lead.companyLinkedIn && (
                    <a 
                      href={lead.companyLinkedIn} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline inline-flex items-center gap-1 text-base"
                    >
                      <Linkedin className="h-4 w-4" />
                      Company LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Details - Now at Top */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <User className="h-6 w-6" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {lead.contactName && (
                <div className="space-y-1">
                  <p className="text-base font-medium text-muted-foreground">Contact Name</p>
                  <p className="text-foreground font-semibold text-lg">{lead.contactName}</p>
                </div>
              )}
              {lead.contactTitle && (
                <div className="space-y-1">
                  <p className="text-base font-medium text-muted-foreground">Contact Title</p>
                  <p className="text-foreground font-medium">{lead.contactTitle}</p>
                </div>
              )}
              {lead.jobTitle && (
                <div className="space-y-1">
                  <p className="text-base font-medium text-muted-foreground">Job Title (Role Hiring)</p>
                  <p className="flex items-center gap-2 text-foreground font-medium">
                    <Briefcase className="h-4 w-4 text-primary" />
                    {lead.jobTitle}
                  </p>
                </div>
              )}
              {lead.email && (
                <div className="space-y-1">
                  <p className="text-base font-medium text-muted-foreground">Email</p>
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-primary hover:underline font-medium break-all">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="space-y-1">
                  <p className="text-base font-medium text-muted-foreground">Phone</p>
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-primary hover:underline font-medium">
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>
            {lead.contactLinkedIn && (
              <div className="mt-4 pt-4 border-t">
                <a href={lead.contactLinkedIn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline font-medium">
                  <Linkedin className="h-5 w-5" />
                  View Contact LinkedIn Profile
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Company Info */}
          <div className="space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {lead.industry && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground">Industry</p>
                      <p className="text-foreground">{lead.industry}</p>
                    </div>
                  )}
                  {lead.companySize && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground">Company Size</p>
                      <p className="flex items-center gap-1 text-foreground">
                        <Users className="h-4 w-4" />
                        {lead.companySize}
                      </p>
                    </div>
                  )}
                  {lead.employeeCount && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground">Employee Count</p>
                      <p className="text-foreground">{lead.employeeCount}</p>
                    </div>
                  )}
                  {lead.country && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground">Country</p>
                      <p className="text-foreground">{lead.country}</p>
                    </div>
                  )}
                  {lead.address && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground">Address / Location</p>
                      <p className="flex items-center gap-1 text-foreground">
                        <MapPin className="h-4 w-4" />
                        {lead.address}
                      </p>
                    </div>
                  )}
                  {lead.companyLinkedIn && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground">Company LinkedIn</p>
                      <a 
                        href={lead.companyLinkedIn} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <Linkedin className="h-4 w-4" />
                        View Profile
                      </a>
                    </div>
                  )}
                </div>
                {lead.companyDescription && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-base font-medium text-muted-foreground mb-2">Description</p>
                      <p className="text-foreground text-base leading-relaxed">{lead.companyDescription}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Interaction Details */}
          <div className="space-y-6">
            {/* Job Openings */}
            {(lead.jobTitle || lead.jobDescription || lead.jobUrl || lead.jobType || lead.jobLevel) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Job Openings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lead.jobTitle && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground">Job Title</p>
                      <p className="text-foreground font-medium">{lead.jobTitle}</p>
                    </div>
                  )}
                  
                  {lead.jobType && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground">Job Type</p>
                      <p className="text-foreground">{lead.jobType}</p>
                    </div>
                  )}
                  
                  {lead.jobLevel && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground">Job Level</p>
                      <p className="text-foreground">{lead.jobLevel}</p>
                    </div>
                  )}
                  
                  {lead.jobDescription && (
                    <div>
                      <p className="text-base font-medium text-muted-foreground mb-2">Job Description</p>
                      <div className="max-h-40 overflow-y-auto text-base text-foreground leading-relaxed whitespace-pre-wrap">
                        {lead.jobDescription}
                      </div>
                    </div>
                  )}
                  
                  {lead.jobUrl && (
                    <Button variant="outline" asChild className="gap-2">
                      <a href={lead.jobUrl} target="_blank" rel="noopener noreferrer">
                        View Job Posting URL
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AI Summary */}
            {lead.aiSummary && (
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
                    {typeof lead.aiSummary === 'string'
                      ? lead.aiSummary
                      : (lead.aiSummary as any)?.value ?? 'No summary available'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.lastContactDate && (
                  <div>
                    <p className="text-base font-medium text-muted-foreground">Last Contact Date</p>
                    <p className="text-foreground">{new Date(lead.lastContactDate).toLocaleDateString()}</p>
                  </div>
                )}
                {lead.nextAction && (
                  <div>
                    <p className="text-base font-medium text-muted-foreground">Next Action</p>
                    <p className="text-foreground">{lead.nextAction}</p>
                  </div>
                )}
                {lead.dateCreated && (
                  <div>
                    <p className="text-base font-medium text-muted-foreground">Date Created</p>
                    <p className="text-foreground">{new Date(lead.dateCreated).toLocaleDateString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feedback Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Your Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Share your feedback about this lead..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <Button 
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback || !feedback.trim()}
                  className="w-full"
                >
                  {isSubmittingFeedback ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientLeadDetail;
