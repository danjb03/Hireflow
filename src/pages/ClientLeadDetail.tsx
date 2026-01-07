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
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-4 space-y-6">
            <Button variant="ghost" onClick={() => navigate("/client/leads")} className="mb-2">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Button>

        {/* Callback Appointment Slots */}
        {(lead.callback1 || lead.callback2 || lead.callback3 || lead.availability || lead.booking) ? (
          <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 border-2 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-700">
                <Phone className="h-5 w-5" />
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
                let countdownColor = 'text-emerald-600 bg-emerald-100';

                if (isPast) {
                  countdownText = 'OVERDUE';
                  countdownColor = 'text-red-600 bg-red-100';
                } else if (isToday) {
                  countdownText = `TODAY - ${diffHours}h`;
                  countdownColor = 'text-orange-600 bg-orange-100';
                } else if (diffDays === 1) {
                  countdownText = 'TOMORROW';
                  countdownColor = 'text-amber-600 bg-amber-100';
                } else {
                  countdownText = `${diffDays} days`;
                  countdownColor = 'text-emerald-600 bg-emerald-100';
                }

                return (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-emerald-300">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500 rounded-full">
                        <Clock className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Primary Callback</p>
                        <p className="text-base font-bold text-emerald-800">
                          {callbackDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-sm font-semibold text-emerald-700">
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
                <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg border border-emerald-200">
                  <div className="p-1.5 bg-emerald-100 rounded-full">
                    <Clock className="h-3 w-3 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Alternative 2</p>
                    <p className="text-sm font-semibold text-emerald-700">
                      {new Date(lead.callback2).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {new Date(lead.callback2).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
              {lead.callback3 && (
                <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg border border-emerald-200">
                  <div className="p-1.5 bg-emerald-100 rounded-full">
                    <Clock className="h-3 w-3 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Alternative 3</p>
                    <p className="text-sm font-semibold text-emerald-700">
                      {new Date(lead.callback3).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at {new Date(lead.callback3).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
              {lead.availability && !lead.callback1 && (
                <div className="flex items-center gap-3 p-2 bg-white/60 rounded-lg border border-emerald-200">
                  <div className="p-1.5 bg-emerald-100 rounded-full">
                    <Clock className="h-3 w-3 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Availability Notes</p>
                    <p className="text-sm font-semibold text-emerald-700">{lead.availability}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 border mb-6">
            <CardContent className="flex items-center gap-3 py-4">
              <div className="p-2 bg-gray-200 rounded-full">
                <Phone className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-medium">Scheduled Callback</p>
                <p className="text-sm text-muted-foreground">No callback scheduled yet</p>
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
                  <h1 className="text-2xl font-bold text-foreground">{lead.companyName}</h1>
                  <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                </div>
                {lead.companyDescription && (
                  <p className="text-muted-foreground text-sm mt-2 leading-relaxed">{lead.companyDescription}</p>
                )}
                <div className="flex flex-wrap gap-4 mt-4">
                  {lead.companyWebsite && (
                    <a
                      href={lead.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
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
                      className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Contact Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {lead.contactName && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Contact Name</p>
                  <p className="text-foreground font-semibold">{lead.contactName}</p>
                </div>
              )}
              {lead.contactTitle && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Contact Title</p>
                  <p className="text-foreground">{lead.contactTitle}</p>
                </div>
              )}
              {lead.jobTitle && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Job Title (Role Hiring)</p>
                  <p className="flex items-center gap-2 text-foreground">
                    <Briefcase className="h-4 w-4 text-primary" />
                    {lead.jobTitle}
                  </p>
                </div>
              )}
              {lead.email && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-primary hover:underline text-sm break-all">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-primary hover:underline text-sm">
                    <Phone className="h-4 w-4" />
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>
            {lead.contactLinkedIn && (
              <div className="mt-4 pt-4 border-t">
                <a href={lead.contactLinkedIn} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline text-sm">
                  <Linkedin className="h-4 w-4" />
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
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {lead.industry && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Industry</p>
                      <p className="text-foreground text-sm">{lead.industry}</p>
                    </div>
                  )}
                  {lead.companySize && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Company Size</p>
                      <p className="flex items-center gap-1 text-foreground text-sm">
                        <Users className="h-4 w-4" />
                        {lead.companySize}
                      </p>
                    </div>
                  )}
                  {lead.employeeCount && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Employee Count</p>
                      <p className="text-foreground text-sm">{lead.employeeCount}</p>
                    </div>
                  )}
                  {lead.country && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Country</p>
                      <p className="text-foreground text-sm">{lead.country}</p>
                    </div>
                  )}
                  {lead.address && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Address / Location</p>
                      <p className="flex items-center gap-1 text-foreground text-sm">
                        <MapPin className="h-4 w-4" />
                        {lead.address}
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
                        className="text-primary hover:underline inline-flex items-center gap-1 text-sm"
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
            {/* Job Openings */}
            {(lead.jobTitle || lead.jobDescription || lead.jobUrl || lead.jobType || lead.jobLevel) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Briefcase className="h-5 w-5" />
                    Job Openings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.jobTitle && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Job Title</p>
                      <p className="text-foreground font-medium text-sm">{lead.jobTitle}</p>
                    </div>
                  )}

                  {lead.jobType && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Job Type</p>
                      <p className="text-foreground text-sm">{lead.jobType}</p>
                    </div>
                  )}

                  {lead.jobLevel && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Job Level</p>
                      <p className="text-foreground text-sm">{lead.jobLevel}</p>
                    </div>
                  )}

                  {lead.jobDescription && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Job Description</p>
                      <div className="max-h-40 overflow-y-auto text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {lead.jobDescription}
                      </div>
                    </div>
                  )}

                  {lead.jobUrl && (
                    <Button variant="outline" size="sm" asChild className="gap-2">
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
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Call Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {lead.clientNotes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5" />
                  Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lead.lastContactDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Last Contact Date</p>
                    <p className="text-foreground text-sm">{new Date(lead.lastContactDate).toLocaleDateString()}</p>
                  </div>
                )}
                {lead.nextAction && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Next Action</p>
                    <p className="text-foreground text-sm">{lead.nextAction}</p>
                  </div>
                )}
                {lead.dateCreated && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Date Created</p>
                    <p className="text-foreground text-sm">{new Date(lead.dateCreated).toLocaleDateString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Feedback Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Your Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Share your feedback about this lead..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  className="resize-none text-sm"
                />
                <Button
                  onClick={handleSubmitFeedback}
                  disabled={isSubmittingFeedback || !feedback.trim()}
                  className="w-full"
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
