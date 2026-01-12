import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ArrowLeft, Loader2, Building2, User, Mail, Phone, Globe, MapPin, Briefcase, Users, FileText, Linkedin, ExternalLink, CheckCircle2, AlertCircle, XCircle, Clock, Sparkles } from "lucide-react";
import RepLayout from "@/components/RepLayout";

interface LeadData {
  id: string;
  companyName: string;
  status: string;
  clientName: string;

  contactName: string | null;
  contactTitle: string | null;
  email: string;
  phone: string;
  contactLinkedIn: string | null;

  companyWebsite: string;
  companyLinkedIn: string | null;
  industry: string | null;
  employeeCount: number | null;

  jobTitle: string | null;
  jobDescription: string | null;

  dateAdded: string;
  lastContactDate: string | null;
  feedback: string | null;
}

const RepLeadDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, []);

  useEffect(() => {
    loadLead();
  }, [id]);

  const loadLead = async () => {
    setLoading(true);
    try {
      // Get lead from the rep's leads list
      const { data, error } = await supabase.functions.invoke("get-rep-leads");

      if (error) {
        console.error("Error fetching leads:", error);
        throw error;
      }

      // Find the specific lead by ID
      const foundLead = data?.leads?.find((l: any) => l.id === id);

      if (!foundLead) {
        console.error("Lead not found");
        setLead(null);
      } else {
        setLead(foundLead);
      }
    } catch (error) {
      console.error("Error loading lead:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      New: "bg-blue-100 text-blue-700 border-blue-200",
      NEW: "bg-blue-100 text-blue-700 border-blue-200",
      Lead: "bg-blue-100 text-blue-700 border-blue-200",
      Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
      'Needs Work': "bg-yellow-100 text-yellow-700 border-yellow-200",
      Rejected: "bg-red-100 text-red-700 border-red-200",
      'In Progress': "bg-blue-100 text-blue-700 border-blue-200",
    };
    return colors[status] || "bg-blue-100 text-blue-700 border-blue-200";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'Needs Work':
        return <AlertCircle className="h-4 w-4" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <RepLayout userEmail={userEmail}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RepLayout>
    );
  }

  if (!lead) {
    return (
      <RepLayout userEmail={userEmail}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-muted-foreground">Lead not found</p>
          <Button variant="outline" onClick={() => navigate("/rep/leads")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </RepLayout>
    );
  }

  return (
    <RepLayout userEmail={userEmail}>
      <div className="space-y-6 max-w-4xl">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList className="text-base text-muted-foreground">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/rep/dashboard" className="hover:text-foreground transition-colors">Dashboard</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/rep/leads" className="hover:text-foreground transition-colors">My Leads</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{lead.companyName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back Button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/rep/leads")} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Leads
        </Button>

        {/* Company Header Card */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{lead.companyName}</h1>
                <Badge className={`${getStatusColor(lead.status)} border rounded-full flex items-center gap-1.5 px-2.5 py-1`}>
                  {getStatusIcon(lead.status)}
                  <span>{lead.status}</span>
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Client: <span className="font-medium text-foreground">{lead.clientName}</span>
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                {lead.companyWebsite && (
                  <a
                    href={lead.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2 text-sm"
                  >
                    <Globe className="h-4 w-4" />
                    Website
                  </a>
                )}
                {lead.companyLinkedIn && (
                  <a
                    href={lead.companyLinkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-2 text-sm"
                  >
                    <Linkedin className="h-4 w-4" />
                    Company LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-semibold mb-4">
            <User className="h-5 w-5" />
            Contact Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lead.contactName && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Name</p>
                <p className="text-sm font-medium">{lead.contactName}</p>
              </div>
            )}
            {lead.contactTitle && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact Title</p>
                <p className="text-sm font-medium">{lead.contactTitle}</p>
              </div>
            )}
            {lead.email && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                <a
                  href={`mailto:${lead.email}`}
                  className="text-primary hover:underline text-sm font-medium flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {lead.email}
                </a>
              </div>
            )}
            {lead.phone && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                <a
                  href={`tel:${lead.phone}`}
                  className="text-primary hover:underline text-sm font-medium flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {lead.phone}
                </a>
              </div>
            )}
          </div>
          {lead.contactLinkedIn && (
            <div className="mt-6 pt-6 border-t">
              <Button variant="outline" asChild className="gap-2" size="sm">
                <a href={lead.contactLinkedIn} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4" />
                  View Contact LinkedIn
                </a>
              </Button>
            </div>
          )}
        </div>

        {/* Job Information */}
        {(lead.jobTitle || lead.jobDescription) && (
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Briefcase className="h-5 w-5" />
              Job Information
            </div>
            <div className="space-y-4">
              {lead.jobTitle && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role They're Hiring For</p>
                  <p className="text-sm font-medium">{lead.jobTitle}</p>
                </div>
              )}
              {lead.jobDescription && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role Details</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{lead.jobDescription}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity Card */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Clock className="h-5 w-5" />
            Activity
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date Submitted</p>
              <p className="text-sm">{formatDate(lead.dateAdded)}</p>
            </div>
            {lead.lastContactDate && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Contact</p>
                <p className="text-sm">{formatDate(lead.lastContactDate)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Admin Feedback Card */}
        {lead.feedback && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4">
              <FileText className="h-5 w-5 text-amber-600" />
              Admin Feedback
            </div>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{lead.feedback}</p>
            <p className="text-xs text-muted-foreground mt-4 italic">
              Feedback from the admin team about this lead.
            </p>
          </div>
        )}
      </div>
    </RepLayout>
  );
};

export default RepLeadDetail;
