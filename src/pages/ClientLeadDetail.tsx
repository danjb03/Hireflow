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
  companyLinkedIn: string;
  industry: string;
  companySize: string;
  employeeCount: string;
  location: string;
  companyDescription: string;
  contactName: string;
  jobTitle: string;
  email: string;
  phone: string;
  linkedInProfile: string;
  callNotes: string;
  callbackDateTime: string;
  jobOpenings: Array<{ title: string; url: string; type: string }>;
  recordingTranscript: string;
  aiSummary: string;
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
      case "booked":
        return "bg-success text-success-foreground";
      case "in progress":
        return "bg-warning text-warning-foreground";
      case "contacted":
        return "bg-info text-info-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
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
        {/* Header */}
        <div>
          <Button variant="ghost" onClick={() => navigate("/client/leads")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Leads
          </Button>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{lead.companyName}</h1>
              {lead.companyWebsite && (
                <a 
                  href={lead.companyWebsite} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary hover:underline inline-flex items-center gap-1 mt-1"
                >
                  {lead.companyWebsite}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <Badge className={getStatusColor(lead.status)}>
              {lead.status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Company & Contact Info */}
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
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Industry</p>
                    <p className="text-foreground">{lead.industry}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company Size</p>
                    <p className="flex items-center gap-1 text-foreground">
                      <Users className="h-4 w-4" />
                      {lead.companySize}
                    </p>
                  </div>
                  {lead.employeeCount && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Employee Count</p>
                      <p className="text-foreground">{lead.employeeCount}</p>
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

            {/* Contact Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contact Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Name</p>
                    <p className="text-foreground font-medium">{lead.contactName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Job Title</p>
                    <p className="flex items-center gap-1 text-foreground">
                      <Briefcase className="h-4 w-4" />
                      {lead.jobTitle}
                    </p>
                  </div>
                  {lead.email && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Email</p>
                      <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Mail className="h-4 w-4" />
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                      <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-4 w-4" />
                        {lead.phone}
                      </a>
                    </div>
                  )}
                  {lead.linkedInProfile && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">LinkedIn Profile</p>
                      <a href={lead.linkedInProfile} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        <Linkedin className="h-4 w-4" />
                        View Profile
                      </a>
                    </div>
                  )}
                </div>
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

            {/* Callback Schedule */}
            {lead.callbackDateTime && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📅 Callback Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold text-foreground">
                    {new Date(lead.callbackDateTime).toLocaleString()}
                  </p>
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
            {lead.jobOpenings && lead.jobOpenings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Job Openings
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
