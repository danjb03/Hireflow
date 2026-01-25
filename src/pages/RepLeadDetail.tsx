import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ArrowLeft, Loader2, Building2, User, Mail, Phone, Globe, MapPin, Briefcase, Linkedin, ExternalLink, CheckCircle2, AlertCircle, XCircle, Clock, Calendar, MessageSquare, StickyNote } from "lucide-react";
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
      New: "border-transparent bg-[#3B82F6] text-white",
      NEW: "border-transparent bg-[#3B82F6] text-white",
      Lead: "border-transparent bg-[#3B82F6] text-white",
      Approved: "border-transparent bg-[#34B192] text-white",
      'Needs Work': "border-transparent bg-[#F2B84B] text-white",
      Rejected: "border-transparent bg-[#D64545] text-white",
      'In Progress': "border-transparent bg-[#64748B] text-white",
    };
    return colors[status] || "border-transparent bg-[#3B82F6] text-white";
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
        <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F7F7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </RepLayout>
    );
  }

  if (!lead) {
    return (
      <RepLayout userEmail={userEmail}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#F7F7F7]">
          <p className="text-sm text-[#222121]/60">Lead not found</p>
          <Button
            variant="outline"
            onClick={() => navigate("/rep/leads")}
            className="h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </RepLayout>
    );
  }

  return (
    <RepLayout userEmail={userEmail}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList className="text-sm text-[#222121]/60">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/rep/dashboard" className="transition-colors hover:text-[#222121]">Dashboard</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/rep/leads" className="transition-colors hover:text-[#222121]">My Leads</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{lead.companyName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/rep/leads")}
          className="mb-2 h-9 rounded-full px-4 text-sm text-[#222121]/70 hover:bg-white hover:text-[#222121]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to My Leads
        </Button>

        {/* Company Header Card */}
        <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-semibold text-[#222121]">{lead.companyName}</h1>
                <Badge variant="outline" className={`${getStatusColor(lead.status)} rounded-full flex items-center gap-1.5 px-2.5 py-1`}>
                  {getStatusIcon(lead.status)}
                  <span>{lead.status}</span>
                </Badge>
              </div>
              <p className="text-sm text-[#222121]/60">
                Client: <span className="font-medium text-[#222121]">{lead.clientName}</span>
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                {lead.companyWebsite && (
                  <a
                    href={lead.companyWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium text-[#34B192] hover:underline"
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
                    className="flex items-center gap-2 text-sm font-medium text-[#34B192] hover:underline"
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
        <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
              <User className="h-5 w-5 text-[#34B192]" />
            </span>
            Contact Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {lead.contactName && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Contact Name</p>
                <p className="text-sm font-medium text-[#222121]">{lead.contactName}</p>
              </div>
            )}
            {lead.contactTitle && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Contact Title</p>
                <p className="text-sm font-medium text-[#222121]">{lead.contactTitle}</p>
              </div>
            )}
            {lead.email && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Email</p>
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2 text-sm font-medium text-[#34B192] hover:underline"
                >
                  <Mail className="h-4 w-4 text-[#34B192]" />
                  {lead.email}
                </a>
              </div>
            )}
            {lead.phone && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Phone</p>
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 text-sm font-medium text-[#34B192] hover:underline"
                >
                  <Phone className="h-4 w-4 text-[#34B192]" />
                  {lead.phone}
                </a>
              </div>
            )}
          </div>
          {lead.contactLinkedIn && (
            <div className="mt-6 border-t border-[#222121]/10 pt-6">
              <Button
                variant="outline"
                asChild
                className="h-9 gap-2 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
                size="sm"
              >
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
          <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <Building2 className="h-5 w-5 text-[#34B192]" />
              </span>
              Company Information
            </div>
            <div className="space-y-4">
              {lead.companyDescription && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Description</p>
                  <p className="text-sm text-[#222121] whitespace-pre-wrap">{lead.companyDescription}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.industry && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Industry</p>
                    <p className="text-sm font-medium text-[#222121]">{lead.industry}</p>
                  </div>
                )}
                {(lead.companySize || lead.employeeCount) && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Company Size</p>
                    <p className="text-sm font-medium text-[#222121]">{lead.companySize || `${lead.employeeCount} employees`}</p>
                  </div>
                )}
                {lead.address && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Address</p>
                    <p className="text-sm font-medium flex items-center gap-2 text-[#222121]">
                      <MapPin className="h-4 w-4 text-[#34B192]" />
                      {lead.address}
                    </p>
                  </div>
                )}
                {lead.country && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Country</p>
                    <p className="text-sm font-medium text-[#222121]">{lead.country}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Job Information */}
        {(lead.jobTitle || lead.jobDescription || lead.jobUrl) && (
          <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <Briefcase className="h-5 w-5 text-[#34B192]" />
              </span>
              Job Information
            </div>
            <div className="space-y-4">
              {lead.jobTitle && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Role They're Hiring For</p>
                  <p className="text-sm font-medium text-[#222121]">{lead.jobTitle}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.jobType && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Job Type</p>
                    <p className="text-sm font-medium text-[#222121]">{lead.jobType}</p>
                  </div>
                )}
                {lead.jobLevel && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Job Level</p>
                    <p className="text-sm font-medium text-[#222121]">{lead.jobLevel}</p>
                  </div>
                )}
              </div>
              {lead.jobDescription && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Role Details</p>
                  <p className="text-sm text-[#222121] whitespace-pre-wrap">{lead.jobDescription}</p>
                </div>
              )}
              {lead.jobUrl && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    asChild
                    className="h-9 gap-2 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
                    size="sm"
                  >
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
        <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
              <Clock className="h-5 w-5 text-[#34B192]" />
            </span>
            Activity
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Date Submitted</p>
              <p className="text-sm text-[#222121]">{formatDate(lead.dateAdded)}</p>
            </div>
            {lead.lastContactDate && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Last Contact</p>
                <p className="text-sm text-[#222121]">{formatDate(lead.lastContactDate)}</p>
              </div>
            )}
            {lead.booking && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Booking</p>
                <p className="text-sm text-[#222121]">{lead.booking}</p>
              </div>
            )}
            {lead.nextAction && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Next Action</p>
                <p className="text-sm text-[#222121]">{lead.nextAction}</p>
              </div>
            )}
          </div>
          {lead.availability && (
            <div className="mt-4 space-y-1 border-t border-[#222121]/10 pt-4">
              <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Availability</p>
              <p className="text-sm text-[#222121]">{lead.availability}</p>
            </div>
          )}
        </div>

        {/* Callback Appointments */}
        {(lead.callback1 || lead.callback2 || lead.callback3) && (
          <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <Calendar className="h-5 w-5 text-[#34B192]" />
              </span>
              Callback Appointments
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {lead.callback1 && (
                <div className="space-y-1 rounded-xl border border-[#222121]/10 bg-[#F7F7F7] p-3">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Option 1</p>
                  <p className="text-sm font-medium text-[#222121]">{new Date(lead.callback1).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              )}
              {lead.callback2 && (
                <div className="space-y-1 rounded-xl border border-[#222121]/10 bg-[#F7F7F7] p-3">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Option 2</p>
                  <p className="text-sm font-medium text-[#222121]">{new Date(lead.callback2).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              )}
              {lead.callback3 && (
                <div className="space-y-1 rounded-xl border border-[#222121]/10 bg-[#F7F7F7] p-3">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide">Option 3</p>
                  <p className="text-sm font-medium text-[#222121]">{new Date(lead.callback3).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Your Notes (Internal Notes - what the rep submitted) */}
        {lead.internalNotes && (
          <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <StickyNote className="h-5 w-5 text-[#34B192]" />
              </span>
              Your Notes
            </div>
            <p className="text-sm leading-relaxed text-[#222121] whitespace-pre-wrap">{lead.internalNotes}</p>
            <p className="mt-4 text-xs italic text-[#222121]/60">
              Notes you submitted with this lead.
            </p>
          </div>
        )}

        {/* Client Feedback Card */}
        {lead.feedback && (
          <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <MessageSquare className="h-5 w-5 text-[#34B192]" />
              </span>
              Client Feedback
            </div>
            <p className="text-sm leading-relaxed text-[#222121] whitespace-pre-wrap">{lead.feedback}</p>
            <p className="mt-4 text-xs italic text-[#222121]/60">
              Feedback from the client about this lead.
            </p>
          </div>
        )}
      </div>
    </RepLayout>
  );
};

export default RepLeadDetail;
