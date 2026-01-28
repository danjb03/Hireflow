import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ArrowLeft, Loader2, Trash2, Building2, User, Mail, Phone, Globe, MapPin, Briefcase, Users, FileText, Linkedin, CheckCircle2, AlertCircle, XCircle, X, Clock, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import TaskPanel from "@/components/TaskPanel";

interface LeadData {
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
  industry2: string | null;
  employeeCount: number | null;
  companySize: string | null;
  founded: string | null;

  titlesOfRoles: string | null;

  internalNotes: string | null;
  clientNotes: string | null;
  availability: string | null;
  lastContactDate: string | null;
  nextAction: string | null;
  dateCreated: string;
  feedback: string | null;

  // Callback appointment slots
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

  // AI Categorization fields
  aiSuggestedStatus: string | null;
  aiReasoning: string | null;
  aiConfidence: number | null;
  aiAnalyzedAt: string | null;
  closeLeadId: string | null;
}

interface AirtableClient {
  id: string;
  name: string;
  email?: string | null;
  status?: string | null;
}

const AdminLeadDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [lead, setLead] = useState<LeadData | null>(null);
  const [clients, setClients] = useState<AirtableClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [availability, setAvailability] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, []);

  useEffect(() => {
    checkAdminAndLoadData();
  }, [id]);

  const checkAdminAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: isAdmin } = await supabase.rpc("is_admin", {
      _user_id: user.id,
    });

    if (!isAdmin) {
      navigate("/dashboard");
      return;
    }

    await Promise.all([loadLead(), loadClients()]);
  };

  const loadLead = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-lead-details", {
        body: { leadId: id },
      });

      console.log("Lead details response:", { data, error });

      if (error) {
        console.error("Function error:", error);
        throw new Error(typeof error === 'object' ? JSON.stringify(error) : String(error));
      }

      // Ensure we have valid lead data
      if (!data?.lead) {
        console.error("No lead in response:", data);
        throw new Error('No lead data returned');
      }

      // Ensure all values are primitives, not objects
      const leadData = data.lead;
      const sanitizedLead = {
        ...leadData,
        status: typeof leadData.status === 'object' ? 'New' : String(leadData.status || 'New'),
        clients: typeof leadData.clients === 'object' ? 'Unassigned' : String(leadData.clients || 'Unassigned'),
      };

      setLead(sanitizedLead);
      setSelectedStatus(sanitizedLead.status);
      setAvailability(String(leadData.availability || ""));
      setFeedback(String(leadData.feedback || ""));
    } catch (error) {
      console.error("Error loading lead:", error);
      toast({
        title: "Error",
        description: "Failed to load lead details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-airtable-clients");

      if (error) {
        console.error("Error fetching Airtable clients:", error);
        setClients([]);
        return;
      }

      if (data?.clients && Array.isArray(data.clients)) {
        setClients(data.clients);
      } else {
        setClients([]);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
      setClients([]);
    }
  };

  const handleAssignClient = async () => {
    if (!selectedClient) return;

    try {
      // Now we pass the Airtable client ID directly
      const { data, error } = await supabase.functions.invoke("assign-lead-to-client", {
        body: {
          leadId: id,
          airtableClientId: selectedClient,
        },
      });

      if (error) {
        console.error("Function error:", error);
        const errorMessage = data?.error || error?.message || "Failed to assign lead";
        throw new Error(errorMessage);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: "Lead assigned to client successfully",
      });

      // Reset selection
      setSelectedClient("");

      // Reload the lead to show updated client assignment
      await loadLead();
    } catch (error: any) {
      console.error("Error assigning lead:", error);
      const errorMessage = error?.message || "Failed to assign lead. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus) return;

    try {
      const { error } = await supabase.functions.invoke("update-lead-status", {
        body: { leadId: id, status: selectedStatus },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Stage updated successfully",
      });

      loadLead();
    } catch (error) {
      console.error("Error updating stage:", error);
      toast({
        title: "Error",
        description: "Failed to update stage",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAvailability = async () => {
    try {
      const { error } = await supabase.functions.invoke("update-lead", {
        body: { 
          leadId: id, 
          updates: { 
            availability: availability 
          } 
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Availability updated successfully",
      });

      loadLead();
    } catch (error) {
      console.error("Error updating availability:", error);
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Feedback required",
        description: "Please enter feedback before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingFeedback(true);
      const { error } = await supabase.functions.invoke("update-lead-feedback", {
        body: { leadId: id, feedback },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Feedback updated successfully",
      });

      loadLead();
    } catch (error) {
      console.error("Error updating feedback:", error);
      toast({
        title: "Error",
        description: "Failed to update feedback",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleDeleteLead = async () => {
    try {
      const { error } = await supabase.functions.invoke("delete-lead", {
        body: { leadId: id },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead marked as Rejected and removed from active leads",
      });

      navigate("/admin/leads");
    } catch (error) {
      console.error("Error marking lead as not qualified:", error);
      toast({
        title: "Error",
        description: "Failed to mark lead as not qualified",
        variant: "destructive",
      });
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
      'Not Qualified': "border-transparent bg-[#9AA3A0] text-white",
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
      case 'NEW':
      case 'Lead':
        return <Clock className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getLeadDescription = () => {
    return "New lead generated. Be sure to contact the customer on the pre-agreed date and time for the callback suggested by us.";
  };

  if (loading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F7F7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </AdminLayout>
    );
  }

  if (!lead) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="flex min-h-[60vh] items-center justify-center bg-[#F7F7F7]">
          <p className="text-sm text-[#222121]/60">Lead not found</p>
        </div>
      </AdminLayout>
    );
  }

  // Debug: Log lead data structure
  console.log("Rendering lead:", JSON.stringify(lead, null, 2));
  const displayIndustry = lead.industry || lead.industry2;

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="-mx-4 -my-6 grid grid-cols-1 gap-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:grid-cols-5 lg:px-6">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-4">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList className="text-sm text-[#222121]/60">
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/admin" className="transition-colors hover:text-[#222121]">Dashboard</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/admin/leads" className="transition-colors hover:text-[#222121]">All Leads</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{lead.companyName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Callback Appointment Slots */}
        {(lead.callback1 || lead.callback2 || lead.callback3 || lead.availability) ? (
          <Card className="mb-6 border border-[#34B192]/30 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#34B192]/10">
                  <Phone className="h-4 w-4 text-[#34B192]" />
                </span>
                Callback Appointment Options
              </CardTitle>
              <CardDescription className="text-[#222121]/60">
                Available times for callback provided by the lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.callback1 && (
                <div className="flex items-center gap-3 rounded-xl border border-[#34B192]/20 bg-[#F7F7F7] p-3">
                  <div className="rounded-full bg-[#34B192]/10 p-2">
                    <Clock className="h-4 w-4 text-[#34B192]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#34B192]">Option 1 (Primary)</p>
                    <p className="text-base font-semibold text-[#222121]/70">
                      {new Date(lead.callback1).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(lead.callback1).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
              {lead.callback2 && (
                <div className="flex items-center gap-3 rounded-xl border border-[#34B192]/20 bg-[#F7F7F7] p-3">
                  <div className="rounded-full bg-[#34B192]/10 p-2">
                    <Clock className="h-4 w-4 text-[#34B192]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#34B192]">Option 2 (Alternative)</p>
                    <p className="text-base font-semibold text-[#222121]/70">
                      {new Date(lead.callback2).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(lead.callback2).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
              {lead.callback3 && (
                <div className="flex items-center gap-3 rounded-xl border border-[#34B192]/20 bg-[#F7F7F7] p-3">
                  <div className="rounded-full bg-[#34B192]/10 p-2">
                    <Clock className="h-4 w-4 text-[#34B192]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#34B192]">Option 3 (Alternative)</p>
                    <p className="text-base font-semibold text-[#222121]/70">
                      {new Date(lead.callback3).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(lead.callback3).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}
              {lead.availability && !lead.callback1 && (
                <div className="flex items-center gap-3 rounded-xl border border-[#34B192]/20 bg-[#F7F7F7] p-3">
                  <div className="rounded-full bg-[#34B192]/10 p-2">
                    <Clock className="h-4 w-4 text-[#34B192]" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#34B192]">Availability Notes</p>
                    <p className="text-base font-semibold text-[#222121]/70">{lead.availability}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="rounded-full bg-[#F5F5F5] p-3">
                <Phone className="h-6 w-6 text-[#222121]/50" />
              </div>
              <div>
                <p className="text-base font-medium text-[#222121]">Scheduled Callback</p>
                <p className="text-base text-[#222121]/60">No callback scheduled</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Actions */}
        <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="mb-2 block text-sm font-medium text-[#222121]/60">Assign to Client</label>
              <div className="text-xs text-[#222121]/60">
                Assigned:{" "}
                {lead.clients && lead.clients !== "Unassigned"
                  ? (clients.find((client) => client.id === lead.clients)?.name || "Assigned (name unavailable)")
                  : "Unassigned"}
              </div>
              {clients.length > 0 ? (
                <div className="space-y-3">
                  <Select
                    value={selectedClient}
                    onValueChange={setSelectedClient}
                  >
                    <SelectTrigger className="h-11 w-full rounded-full border-[#222121]/15 bg-white text-sm">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={String(client.id)}>
                          {String(client.name || 'Unknown')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAssignClient}
                    disabled={!selectedClient}
                    variant="ghost"
                    className="h-11 w-full rounded-full bg-[#34B192] text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                  >
                    Assign
                  </Button>
                </div>
              ) : (
                <div className="rounded-lg bg-[#F7F7F7] p-3 text-sm text-[#222121]/60">
                  No clients with configured names. Go to{" "}
                  <button onClick={() => navigate("/admin/clients")} className="font-medium text-[#34B192] underline hover:text-[#2D9A7E] transition-colors">
                    Client Management
                  </button>{" "}
                  to configure client names.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="mb-2 block text-sm font-medium text-[#222121]/60">Update Stage</label>
              <div className="flex gap-2">
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="h-11 flex-1 rounded-full border-[#222121]/15 bg-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">NEW</SelectItem>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Needs Work">Needs Work</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleUpdateStatus}
                  variant="ghost"
                  className="h-11 rounded-full bg-[#34B192] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                >
                  Update
                </Button>
              </div>

              {/* AI Recommendation */}
              {lead.aiSuggestedStatus && (
                <div className="mt-3 rounded-xl border border-[#222121]/10 bg-[#F7F7F7] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-[#34B192]" />
                    <span className="text-sm font-medium text-[#222121]">AI Recommendation</span>
                    {lead.aiConfidence !== null && (
                      <Badge variant="outline" className="border-[#222121]/20 text-xs text-[#222121]/60">
                        {lead.aiConfidence}% confidence
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={getStatusColor(lead.aiSuggestedStatus)}>
                      {lead.aiSuggestedStatus}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full border-[#222121]/20 text-xs font-semibold text-[#222121] hover:bg-[#F7F7F7]"
                      onClick={() => setSelectedStatus(lead.aiSuggestedStatus || '')}
                    >
                      Apply Suggestion
                    </Button>
                  </div>
                  {lead.aiReasoning && (
                    <p className="text-xs text-[#222121]/70 leading-relaxed">{lead.aiReasoning}</p>
                  )}
                  {lead.aiAnalyzedAt && (
                    <p className="text-xs text-[#222121]/50 mt-1">
                      Analyzed: {new Date(lead.aiAnalyzedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="mb-2 block text-sm font-medium text-[#222121]/60">Availability</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. Mon-Fri 9am-5pm, Weekends after 2pm" 
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="flex-1 rounded-full border-[#222121]/15 bg-white text-sm"
                />
                <Button 
                  onClick={handleUpdateAvailability}
                  variant="ghost"
                  className="h-11 rounded-full bg-[#34B192] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                >
                  Update
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Company Header Card */}
        <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl font-semibold text-[#222121]">{lead.companyName}</h1>
                <Badge variant="outline" className={`${getStatusColor(lead.status)} rounded-full flex items-center gap-1.5 px-2.5 py-1`}>
                  {getStatusIcon(lead.status)}
                  <span>{lead.status}</span>
                </Badge>
              </div>
              {lead.companyDescription && (
                <p className="mt-2 text-base leading-relaxed text-[#222121]/60">{lead.companyDescription}</p>
              )}
              <div className="flex flex-wrap gap-4 mt-4">
                {lead.companyWebsite && (
                  <a 
                    href={lead.companyWebsite} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-2 text-base font-medium text-[#34B192] hover:underline"
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
                    className="flex items-center gap-2 text-base font-medium text-[#34B192] hover:underline"
                  >
                    <Linkedin className="h-4 w-4" />
                    Company LinkedIn
                  </a>
                )}
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 shrink-0 rounded-full border-[#D64545]/40 text-[#D64545] hover:bg-[#FDF1F1]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Reject Lead
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reject Lead</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will mark the lead as "Rejected" and remove it from the active leads view. The lead will still exist in Airtable but won't appear in the main leads list.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteLead} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Reject Lead</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="space-y-6">
          {/* Contact Details */}
          <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <User className="h-5 w-5 text-[#34B192]" />
              </span>
              Contact Details
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {lead.contactName && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Contact Name</p>
                  <p className="text-base font-medium flex items-center gap-2 text-[#222121]">{lead.contactName}</p>
                </div>
              )}
              {lead.contactTitle && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Contact Title</p>
                  <p className="text-base font-medium text-[#222121]">{lead.contactTitle}</p>
                </div>
              )}
              {lead.titlesOfRoles && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Roles Hiring</p>
                  <p className="text-base font-medium flex items-center gap-2 text-[#222121]">
                    <Briefcase className="h-4 w-4 text-[#34B192]" />
                    {lead.titlesOfRoles}
                  </p>
                </div>
              )}
              {lead.email && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Email</p>
                  <a 
                    href={`mailto:${lead.email}`} 
                    className="flex items-center gap-2 text-base font-medium text-[#34B192] hover:underline"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0 text-[#34B192]" />
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Phone</p>
                  <a 
                    href={`tel:${lead.phone}`} 
                    className="flex items-center gap-2 text-base font-medium text-[#34B192] hover:underline"
                  >
                    <Phone className="h-4 w-4 text-[#34B192]" />
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>
            {lead.contactLinkedIn && (
              <div className="mt-6 border-t border-[#222121]/10 pt-6">
                <Button variant="outline" asChild className="h-10 gap-2 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]">
                  <a href={lead.contactLinkedIn} target="_blank" rel="noopener noreferrer">
                    <Linkedin className="h-4 w-4" />
                    View Contact LinkedIn Profile
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Company Info */}
          <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <Building2 className="h-5 w-5 text-[#34B192]" />
              </span>
              Company Information
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {displayIndustry && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Industry</p>
                  <p className="text-base text-[#222121]">{displayIndustry}</p>
                </div>
              )}
              {lead.founded && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Founded</p>
                  <p className="text-base text-[#222121]">{lead.founded}</p>
                </div>
              )}
              {lead.companySize && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Company Size</p>
                  <p className="flex items-center gap-2 text-base text-[#222121]">
                    <Users className="h-4 w-4 text-[#34B192]" />
                    {lead.companySize}
                  </p>
                </div>
              )}
              {lead.employeeCount && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Employee Count</p>
                  <p className="text-base text-[#222121]">{lead.employeeCount}</p>
                </div>
              )}
              {lead.country && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Country</p>
                  <p className="text-base text-[#222121]">{lead.country}</p>
                </div>
              )}
              {lead.address && (
                <div className="space-y-1 col-span-2">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Address / Location</p>
                  <p className="flex items-center gap-2 text-base text-[#222121]">
                    <MapPin className="h-4 w-4 text-[#34B192]" />
                    {lead.address}
                  </p>
                </div>
              )}
              {lead.companyLinkedIn && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Company LinkedIn</p>
                  <a 
                    href={lead.companyLinkedIn} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 text-base font-medium text-[#34B192] hover:underline"
                  >
                    <Linkedin className="h-4 w-4 text-[#34B192]" />
                    View Profile
                  </a>
                </div>
              )}
            </div>
            {lead.companyDescription && (
              <>
                <Separator className="my-6 bg-[#222121]/10" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-2">Company Description</p>
                  <p className="text-base text-[#222121] leading-relaxed">{lead.companyDescription}</p>
                </div>
              </>
            )}
          </div>

          {/* Rep Notes */}
          {lead.clientNotes && (
            <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
                <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                  <Sparkles className="h-5 w-5 text-[#34B192]" />
                </span>
                Rep Notes
              </div>
              <p className="text-base leading-relaxed text-[#222121] whitespace-pre-wrap">
                {lead.clientNotes}
              </p>
              <p className="text-xs text-[#222121]/60 mt-4 italic">
                Notes submitted by the rep.
              </p>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {lead.lastContactDate && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Last Contact Date</p>
                  <p className="text-base text-[#222121]">{new Date(lead.lastContactDate).toLocaleDateString()}</p>
                </div>
              )}
              {lead.nextAction && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Next Action</p>
                  <p className="text-base text-[#222121]">{lead.nextAction}</p>
                </div>
              )}
              {lead.dateCreated && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Date Created</p>
                  <p className="text-base text-[#222121]">{new Date(lead.dateCreated).toLocaleDateString()}</p>
                </div>
              )}
              {lead.availability && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#222121]/50 uppercase tracking-wide mb-1">Availability</p>
                  <p className="text-base text-[#222121]">{lead.availability}</p>
                </div>
              )}
            </div>
          </div>

          {/* Client Feedback */}
          <div className="rounded-2xl border border-[#222121]/10 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 text-lg font-semibold mb-4 text-[#222121]">
              <span className="flex size-9 items-center justify-center rounded-full bg-[#34B192]/10">
                <FileText className="h-5 w-5 text-[#34B192]" />
              </span>
              Client Feedback
            </div>
            <Textarea
              placeholder="Client feedback will appear here..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={5}
              className="resize-none rounded-2xl border-[#222121]/15 text-sm"
            />
            <div className="mt-4 flex items-center justify-end">
              <Button
                onClick={handleSubmitFeedback}
                disabled={isSubmittingFeedback || !feedback.trim()}
                variant="ghost"
                className="h-10 rounded-full bg-[#34B192] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
              >
                {isSubmittingFeedback ? "Saving..." : "Save Feedback"}
              </Button>
            </div>
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
    </AdminLayout>
  );
};

export default AdminLeadDetail;
