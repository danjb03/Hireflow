import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ArrowLeft, Loader2, Building2, User, Mail, Phone, Globe, MapPin, Briefcase, Users, FileText, Linkedin, ExternalLink, CheckCircle2, AlertCircle, XCircle, Clock, Sparkles, Calendar, MessageSquare, StickyNote } from "lucide-react";
import RepLayout from "@/components/RepLayout";

interface LeadData {
  id: string;
  companyName: string;
  status: string;
  clientName: string;

  // Contact Info
  contactName: string | null;
  contactTitle: string | null;
  email: string;
  phone: string;
  contactLinkedIn: string | null;

  // Company Info
  companyWebsite: string;
  companyLinkedIn: string | null;
  companyDescription: string | null;
  address: string | null;
  country: string | null;
  industry: string | null;
  employeeCount: number | null;
  companySize: string | null;

  // Job Info
  jobTitle: string | null;
  jobDescription: string | null;
  jobUrl: string | null;
  jobType: string | null;
  jobLevel: string | null;

  // Notes
  internalNotes: string | null;
  clientNotes: string | null;

  // Activity
  dateAdded: string;
  lastContactDate: string | null;
  booking: string | null;
  availability: string | null;
  nextAction: string | null;

  // Callbacks
  callback1: string | null;
  callback2: string | null;
  callback3: string | null;

  // Client Feedback
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

        {/* Company Information */}
        {(lead.companyDescription || lead.address || lead.industry || lead.companySize) && (
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Building2 className="h-5 w-5" />
              Company Information
            </div>
            <div className="space-y-4">
              {lead.companyDescription && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{lead.companyDescription}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.industry && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Industry</p>
                    <p className="text-sm font-medium">{lead.industry}</p>
                  </div>
                )}
                {(lead.companySize || lead.employeeCount) && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Company Size</p>
                    <p className="text-sm font-medium">{lead.companySize || `${lead.employeeCount} employees`}</p>
                  </div>
                )}
                {lead.address && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                    <p className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {lead.address}
                    </p>
                  </div>
                )}
                {lead.country && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</p>
                    <p className="text-sm font-medium">{lead.country}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Job Information */}
        {(lead.jobTitle || lead.jobDescription || lead.jobUrl) && (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.jobType && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Job Type</p>
                    <p className="text-sm font-medium">{lead.jobType}</p>
                  </div>
                )}
                {lead.jobLevel && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Job Level</p>
                    <p className="text-sm font-medium">{lead.jobLevel}</p>
                  </div>
                )}
              </div>
              {lead.jobDescription && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role Details</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{lead.jobDescription}</p>
                </div>
              )}
              {lead.jobUrl && (
                <div className="pt-2">
                  <Button variant="outline" asChild className="gap-2" size="sm">
                    <a href={lead.jobUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      View Job Posting
                    </a>
                  </Button>
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
            {lead.booking && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Booking</p>
                <p className="text-sm">{lead.booking}</p>
              </div>
            )}
            {lead.nextAction && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Next Action</p>
                <p className="text-sm">{lead.nextAction}</p>
              </div>
            )}
          </div>
          {lead.availability && (
            <div className="mt-4 pt-4 border-t space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Availability</p>
              <p className="text-sm">{lead.availability}</p>
            </div>
          )}
        </div>

        {/* Callback Appointments */}
        {(lead.callback1 || lead.callback2 || lead.callback3) && (
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Calendar className="h-5 w-5" />
              Callback Appointments
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lead.callback1 && (
                <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Option 1</p>
                  <p className="text-sm font-medium">{new Date(lead.callback1).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              )}
              {lead.callback2 && (
                <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Option 2</p>
                  <p className="text-sm font-medium">{new Date(lead.callback2).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              )}
              {lead.callback3 && (
                <div className="space-y-1 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Option 3</p>
                  <p className="text-sm font-medium">{new Date(lead.callback3).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Your Notes (Internal Notes - what the rep submitted) */}
        {lead.internalNotes && (
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4">
              <StickyNote className="h-5 w-5" />
              Your Notes
            </div>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{lead.internalNotes}</p>
            <p className="text-xs text-muted-foreground mt-4 italic">
              Notes you submitted with this lead.
            </p>
          </div>
        )}

        {/* Client Feedback Card */}
        {lead.feedback && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 border rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4">
              <MessageSquare className="h-5 w-5 text-amber-600" />
              Client Feedback
            </div>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{lead.feedback}</p>
            <p className="text-xs text-muted-foreground mt-4 italic">
              Feedback from the client about this lead.
            </p>
          </div>
        )}
      </div>
    </RepLayout>
  );
};

export default RepLeadDetail;
