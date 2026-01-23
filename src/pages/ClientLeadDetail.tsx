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
import TaskPanel from "@/components/TaskPanel";

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

  clientNotes: string | null;
  booking: string | null;
  availability: string | null;
  lastContactDate: string | null;
  nextAction: string | null;
  dateCreated: string;
  feedback: string | null;

  // Callback appointment slots (combined datetime)
  callback1: string | null;
  callback2: string | null;
  callback3: string | null;

  // Task completion status
  tasks: {
    task1: boolean;
    task2: boolean;
    task3: boolean;
    task4: boolean;
    task5: boolean;
    task6: boolean;
    task7: boolean;
  };
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
        return "border-transparent bg-[#3B82F6] text-white";
      case "approved":
      case "booked":
        return "border-transparent bg-[#34B192] text-white";
      case "needs work":
      case "in progress":
        return "border-transparent bg-[#F2B84B] text-white";
      case "rejected":
        return "border-transparent bg-[#D64545] text-white";
      case "contacted":
        return "border-transparent bg-[#3B82F6] text-white";
      default:
        return "border-transparent bg-[#3B82F6] text-white";
    }
  };

  const getLeadDescription = () => {
    return "New lead generated. Be sure to contact the customer on the pre-agreed date and time for the callback suggested by us.";
  };

  if (isLoading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </ClientLayout>
    );
  }

  if (!lead) {
    return null;
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="-mx-4 -my-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/client/leads")}
              className="mb-2 h-9 rounded-full px-4 text-sm text-[#222121]/70 hover:bg-white hover:text-[#222121]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Button>

        {/* Callback Appointment Slots */}
        {(lead.callback1 || lead.callback2 || lead.callback3 || lead.availability || lead.booking) ? (
          <Card className="mb-6 border border-[#34B192]/30 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-[#222121]">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#34B192]/10">
                  <Phone className="h-4 w-4 text-[#34B192]" />
                </span>
                Scheduled Callback
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.callback1 && (() => {
                const callbackDate = new Date(lead.callback1);
                const now = new Date();
                const diffTime = callbackDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                const isPast = diffTime < 0;
                const isToday = diffDays === 0 || (diffDays === 1 && diffHours <= 24);

                let countdownText = '';
                let countdownColor = 'text-[#34B192] bg-[#F1FBF7]';

                if (isPast) {
                  countdownText = 'OVERDUE';
                  countdownColor = 'text-[#D64545] bg-[#FDF1F1]';
                } else if (isToday) {
                  countdownText = `TODAY - ${diffHours}h`;
                  countdownColor = 'text-[#C7771E] bg-[#FFF3E1]';
                } else if (diffDays === 1) {
                  countdownText = 'TOMORROW';
                  countdownColor = 'text-[#C7771E] bg-[#FFF3E1]';
                } else {
                  countdownText = `${diffDays} days`;
                  countdownColor = 'text-[#34B192] bg-[#F1FBF7]';
                }

                return (
                  <div className="flex items-center justify-between rounded-xl border border-[#34B192]/30 bg-white p-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-[#34B192] p-2">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-[#34B192]">Primary Callback</p>
                        <p className="text-base font-semibold text-[#222121]">
                          {callbackDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-sm font-semibold text-[#222121]/70">
                          {callbackDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full font-bold text-xs ${countdownColor}`}>
                      {countdownText}
                    </div>
                  </div>
                );
              })()}
              {lead.callback2 && (
                <div className="flex items-center gap-3 rounded-xl border border-[#34B192]/20 bg-[#F7F7F7] p-2">
                  <div className="rounded-full bg-[#34B192]/10 p-1.5">
                    <Clock className="h-3 w-3 text-[#34B192]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#34B192]">Alternative 2</p>
                    <p className="text-sm font-semibold text-[#222121]/70">
                      {new Date(lead.callback2).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {new Date(lead.callback2).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
              {lead.callback3 && (
                <div className="flex items-center gap-3 rounded-xl border border-[#34B192]/20 bg-[#F7F7F7] p-2">
                  <div className="rounded-full bg-[#34B192]/10 p-1.5">
                    <Clock className="h-3 w-3 text-[#34B192]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#34B192]">Alternative 3</p>
                    <p className="text-sm font-semibold text-[#222121]/70">
                      {new Date(lead.callback3).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {new Date(lead.callback3).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
              {lead.availability && !lead.callback1 && (
                <div className="flex items-center gap-3 rounded-xl border border-[#34B192]/20 bg-[#F7F7F7] p-2">
                  <div className="rounded-full bg-[#34B192]/10 p-1.5">
                    <Clock className="h-3 w-3 text-[#34B192]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#34B192]">Availability Notes</p>
                    <p className="text-sm font-semibold text-[#222121]/70">{lead.availability}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="rounded-full bg-[#F5F5F5] p-2">
                <Phone className="h-5 w-5 text-[#222121]/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#222121]">Scheduled Callback</p>
                <p className="text-sm text-[#222121]/60">No callback scheduled yet</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lead Hero Section */}
        <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl font-semibold text-[#222121]">{lead.companyName}</h1>
                  <Badge variant="outline" className={getStatusColor(lead.status)}>
                    {lead.status}
                  </Badge>
                </div>
                {lead.companyDescription && (
                  <p className="mt-2 text-sm leading-relaxed text-[#222121]/60">{lead.companyDescription}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-4">
                  {lead.companyWebsite && (
                    <a
                      href={lead.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#34B192] hover:underline"
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
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#34B192] hover:underline"
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
        <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <User className="h-5 w-5 text-[#34B192]" />
              </span>
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {lead.contactName && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#222121]/60">Contact Name</p>
                  <p className="font-semibold text-[#222121]">{lead.contactName}</p>
                </div>
              )}
              {lead.contactTitle && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#222121]/60">Contact Title</p>
                  <p className="text-[#222121]">{lead.contactTitle}</p>
                </div>
              )}
              {lead.jobTitle && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#222121]/60">Job Title (Role Hiring)</p>
                  <p className="flex items-center gap-2 text-[#222121]">
                    <Briefcase className="h-4 w-4 text-[#34B192]" />
                    {lead.jobTitle}
                  </p>
                </div>
              )}
              {lead.email && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#222121]/60">Email</p>
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm font-medium text-[#34B192] hover:underline break-all">
                    <Mail className="h-4 w-4 flex-shrink-0 text-[#34B192]" />
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-[#222121]/60">Phone</p>
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm font-medium text-[#34B192] hover:underline">
                    <Phone className="h-4 w-4 text-[#34B192]" />
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>
            {lead.contactLinkedIn && (
              <div className="mt-4 border-t border-[#222121]/10 pt-4">
                <a href={lead.contactLinkedIn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[#34B192] hover:underline">
                  <Linkedin className="h-4 w-4 text-[#34B192]" />
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
            <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#222121]">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                    <Building2 className="h-5 w-5 text-[#34B192]" />
                  </span>
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {lead.industry && (
                    <div>
                      <p className="text-sm font-medium text-[#222121]/60">Industry</p>
                      <p className="text-sm text-[#222121]">{lead.industry}</p>
                    </div>
                  )}
                  {lead.companySize && (
                    <div>
                      <p className="text-sm font-medium text-[#222121]/60">Company Size</p>
                      <p className="flex items-center gap-1 text-sm text-[#222121]">
                        <Users className="h-4 w-4 text-[#34B192]" />
                        {lead.companySize}
                      </p>
                    </div>
                  )}
                  {lead.employeeCount && (
                    <div>
                      <p className="text-sm font-medium text-[#222121]/60">Employee Count</p>
                      <p className="text-sm text-[#222121]">{lead.employeeCount}</p>
                    </div>
                  )}
                  {lead.country && (
                    <div>
                      <p className="text-sm font-medium text-[#222121]/60">Country</p>
                      <p className="text-sm text-[#222121]">{lead.country}</p>
                    </div>
                  )}
                  {lead.address && (
                    <div>
                      <p className="text-sm font-medium text-[#222121]/60">Address / Location</p>
                      <p className="flex items-center gap-1 text-sm text-[#222121]">
                        <MapPin className="h-4 w-4 text-[#34B192]" />
                        {lead.address}
                      </p>
                    </div>
                  )}
                  {lead.companyLinkedIn && (
                    <div>
                      <p className="text-sm font-medium text-[#222121]/60">Company LinkedIn</p>
                      <a
                        href={lead.companyLinkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-[#34B192] hover:underline"
                      >
                        <Linkedin className="h-4 w-4 text-[#34B192]" />
                        View Profile
                      </a>
                    </div>
                  )}
                </div>
                {lead.companyDescription && (
                  <>
                    <Separator className="bg-[#222121]/10" />
                    <div>
                      <p className="mb-2 text-sm font-medium text-[#222121]/60">Description</p>
                      <p className="text-sm leading-relaxed text-[#222121]">{lead.companyDescription}</p>
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
              <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-[#222121]">
                    <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                      <Briefcase className="h-5 w-5 text-[#34B192]" />
                    </span>
                    Job Openings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.jobTitle && (
                    <div>
                      <p className="text-sm font-medium text-[#222121]/60">Job Title</p>
                      <p className="text-sm font-medium text-[#222121]">{lead.jobTitle}</p>
                    </div>
                  )}

                  {lead.jobType && (
                    <div>
                      <p className="text-sm font-medium text-[#222121]/60">Job Type</p>
                      <p className="text-sm text-[#222121]">{lead.jobType}</p>
                    </div>
                  )}

                  {lead.jobLevel && (
                    <div>
                      <p className="text-sm font-medium text-[#222121]/60">Job Level</p>
                      <p className="text-sm text-[#222121]">{lead.jobLevel}</p>
                    </div>
                  )}

                  {lead.jobDescription && (
                    <div>
                      <p className="mb-2 text-sm font-medium text-[#222121]/60">Job Description</p>
                      <div className="max-h-40 overflow-y-auto text-sm leading-relaxed text-[#222121] whitespace-pre-wrap">
                        {lead.jobDescription}
                      </div>
                    </div>
                  )}

                  {lead.jobUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-9 gap-2 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
                    >
                      <a href={lead.jobUrl} target="_blank" rel="noopener noreferrer">
                        View Job Posting URL
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Client Notes (AI Improved) */}
            {lead.clientNotes && (
              <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg text-[#222121]">
                    <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                      <Sparkles className="h-5 w-5 text-[#34B192]" />
                    </span>
                    Call Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-[#222121] whitespace-pre-wrap">
                    {lead.clientNotes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Activity */}
            <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#222121]">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                    <Clock className="h-5 w-5 text-[#34B192]" />
                  </span>
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.lastContactDate && (
                  <div>
                    <p className="text-sm font-medium text-[#222121]/60">Last Contact Date</p>
                    <p className="text-sm text-[#222121]">{new Date(lead.lastContactDate).toLocaleDateString()}</p>
                  </div>
                )}
                {lead.nextAction && (
                  <div>
                    <p className="text-sm font-medium text-[#222121]/60">Next Action</p>
                    <p className="text-sm text-[#222121]">{lead.nextAction}</p>
                  </div>
                )}
                {lead.dateCreated && (
                  <div>
                    <p className="text-sm font-medium text-[#222121]/60">Date Created</p>
                    <p className="text-sm text-[#222121]">{new Date(lead.dateCreated).toLocaleDateString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feedback Section */}
            <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-[#222121]">
                  <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                    <FileText className="h-5 w-5 text-[#34B192]" />
                  </span>
                  Your Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Share your feedback about this lead..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="resize-none rounded-2xl border-[#222121]/15 text-sm"
                />
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback || !feedback.trim()}
                  variant="ghost"
                  className="h-11 w-full rounded-full bg-[#34B192] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                  size="sm"
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

          {/* Task Panel - Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <TaskPanel leadId={lead.id} tasks={lead.tasks} />
            </div>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default ClientLeadDetail;
