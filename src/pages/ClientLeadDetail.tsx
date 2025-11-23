import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  Mic,
  Linkedin,
  ExternalLink
} from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

interface LeadDetail {
  id: string;
  status: string;
  companyName: string;
  companyWebsite: string;
  companyLinkedIn: string | null;
  industry: string | null;
  companySize: string | null;
  employeeCount: string | null;
  country: string | null;
  location: string | null;
  companyDescription: string | null;
  founded: string | null;
  contactName: string | null;
  jobTitle: string | null;
  email: string;
  phone: string;
  linkedInProfile: string;
  callNotes: string | null;
  callbackDateTime: string | null;
  jobOpenings: Array<{ title: string; url: string; type?: string }>;
  recordingTranscript: string | null;
  aiSummary: string | null;
  jobUrl: string | null;
  activeJobsUrl: string | null;
  jobsOpen: string | null;
  jobPostingTitle: string | null;
  jobDescription: string | null;
  dateAdded: string;
}

const ClientLeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

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
    } catch (error: any) {
      toast.error("Failed to load lead details: " + error.message);
      navigate("/client/leads");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "needs work":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getLeadDescription = () => {
    if (lead?.aiSummary) {
      const firstLine = lead.aiSummary.split('\n').find(line => line.trim());
      if (firstLine) return firstLine.replace(/^[•\-]\s*/, '');
    }
    
    if (lead?.jobsOpen && lead?.industry) {
      return `New callback lead interested in ${lead.industry.toLowerCase()} with ${lead.jobsOpen} open position${lead.jobsOpen !== '1' ? 's' : ''}`;
    }
    
    if (lead?.industry) {
      return `New callback lead in ${lead.industry.toLowerCase()}`;
    }
    
    return "New callback lead requiring follow-up";
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

        {/* Lead Hero Section */}
        <Card className="border-primary/20 bg-gradient-to-br from-card to-card/50">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-4xl font-bold text-foreground">{lead.companyName}</h1>
                  <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                </div>
                {lead.companyWebsite && (
                  <a 
                    href={lead.companyWebsite} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline inline-flex items-center gap-1 text-sm mb-3"
                  >
                    <Globe className="h-4 w-4" />
                    {lead.companyWebsite}
                  </a>
                )}
                <p className="text-muted-foreground text-lg mt-2">{getLeadDescription()}</p>
              </div>
            </div>

            {/* Callback Schedule - Prominent Display */}
            {lead.callbackDateTime && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <span className="text-2xl">📅</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Scheduled Callback</p>
                      <p className="text-xl font-bold text-foreground">
                        {new Date(lead.callbackDateTime).toLocaleString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  {new Date(lead.callbackDateTime) < new Date() ? (
                    <Badge variant="destructive" className="text-sm">Overdue</Badge>
                  ) : (
                    <Badge className="text-sm bg-green-500/10 text-green-500 border-green-500/20">Upcoming</Badge>
                  )}
                </div>
              </div>
            )}
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
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-foreground font-semibold text-lg">{lead.contactName}</p>
                </div>
              )}
              {lead.jobTitle && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Job Title</p>
                  <p className="flex items-center gap-2 text-foreground font-medium">
                    <Briefcase className="h-4 w-4 text-primary" />
                    {lead.jobTitle}
                  </p>
                </div>
              )}
              {lead.email && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-primary hover:underline font-medium break-all">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-primary hover:underline font-medium">
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>
            {lead.linkedInProfile && (
              <div className="mt-4 pt-4 border-t">
                <a href={lead.linkedInProfile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline font-medium">
                  <Linkedin className="h-5 w-5" />
                  View LinkedIn Profile
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
                      <p className="text-sm font-medium text-muted-foreground">Industry</p>
                      <p className="text-foreground">{lead.industry}</p>
                    </div>
                  )}
                  {lead.companySize && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company Size</p>
                      <p className="flex items-center gap-1 text-foreground">
                        <Users className="h-4 w-4" />
                        {lead.companySize}
                      </p>
                    </div>
                  )}
                  {lead.employeeCount && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Employee Count</p>
                      <p className="text-foreground">{lead.employeeCount}</p>
                    </div>
                  )}
                  {lead.country && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Country</p>
                      <p className="text-foreground">{lead.country}</p>
                    </div>
                  )}
                  {lead.location && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="flex items-center gap-1 text-foreground">
                        <MapPin className="h-4 w-4" />
                        {lead.location}
                      </p>
                    </div>
                  )}
                  {lead.founded && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Founded</p>
                      <p className="text-foreground">{lead.founded}</p>
                    </div>
                  )}
                  {lead.companyLinkedIn && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company LinkedIn</p>
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
                      <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                      <p className="text-foreground text-sm leading-relaxed">{lead.companyDescription}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Interaction Details */}
          <div className="space-y-6">
            {/* Call Notes */}
            {lead.callNotes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Call Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{lead.callNotes}</p>
                </CardContent>
              </Card>
            )}

            {/* AI Summary */}
            {lead.aiSummary && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ✨ AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1 text-sm text-foreground">
                    {lead.aiSummary.split('\n').filter(line => line.trim()).map((line, idx) => (
                      <li key={idx}>{line.replace(/^[•\-]\s*/, '')}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Job Openings */}
            {(lead.jobOpenings?.length > 0 || lead.jobUrl || lead.jobsOpen || lead.activeJobsUrl || lead.jobPostingTitle || lead.jobDescription) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Job Openings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lead.jobsOpen && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Open Positions</p>
                      <p className="text-2xl font-bold text-foreground">{lead.jobsOpen}</p>
                    </div>
                  )}
                  
                  {lead.jobPostingTitle && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Job Title</p>
                      <p className="text-foreground font-medium">{lead.jobPostingTitle}</p>
                    </div>
                  )}
                  
                  {lead.jobDescription && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Job Description</p>
                      <p className="text-foreground text-sm leading-relaxed">{lead.jobDescription}</p>
                    </div>
                  )}
                  
                  {lead.jobOpenings && lead.jobOpenings.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Available Positions</p>
                      <ul className="space-y-3">
                        {lead.jobOpenings.map((job, index) => (
                          <li key={index} className="border-l-2 border-primary pl-3">
                            <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                              {job.title}
                            </a>
                            {job.type && <p className="text-sm text-muted-foreground">{job.type}</p>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {lead.jobUrl && (
                    <a 
                      href={lead.jobUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View Job Posting URL
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  
                  {lead.activeJobsUrl && (
                    <a 
                      href={lead.activeJobsUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Find Active Job Openings
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recording Transcript */}
            {lead.recordingTranscript && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="h-5 w-5" />
                    Recording Transcript
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed max-h-96 overflow-y-auto">
                    {lead.recordingTranscript}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientLeadDetail;
