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
  Mic
} from "lucide-react";

interface LeadDetail {
  id: string;
  status: string;
  companyName: string;
  companyWebsite: string;
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
  jobOpenings: Array<{ title: string; url: string }>;
  recordingTranscript: string;
  dateAdded: string;
}

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

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
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "booked":
        return "bg-green-500";
      case "in progress":
        return "bg-yellow-500";
      case "contacted":
        return "bg-emerald-500";
      case "new":
        return "bg-gray-500";
      default:
        return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto p-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{lead.companyName}</h1>
              <p className="text-muted-foreground">Lead Details</p>
            </div>
            <Badge className={getStatusColor(lead.status)}>
              {lead.status}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                <p className="text-foreground">{lead.companyName}</p>
              </div>
              {lead.companyWebsite && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Website</p>
                  <a href={lead.companyWebsite} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <Globe className="h-4 w-4" />
                    {lead.companyWebsite}
                  </a>
                </div>
              )}
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
            </div>
            {lead.companyDescription && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                  <p className="text-foreground">{lead.companyDescription}</p>
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-foreground">{lead.contactName}</p>
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
            </div>
            {lead.linkedInProfile && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">LinkedIn Profile</p>
                <a href={lead.linkedInProfile} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {lead.linkedInProfile}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

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
              <p className="text-foreground whitespace-pre-wrap">{lead.callNotes}</p>
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
              <ul className="space-y-2">
                {lead.jobOpenings.map((job, index) => (
                  <li key={index}>
                    <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {job.title}
                    </a>
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
              <p className="text-foreground whitespace-pre-wrap">{lead.recordingTranscript}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default LeadDetail;