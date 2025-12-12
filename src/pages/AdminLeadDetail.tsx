import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { ArrowLeft, Loader2, Trash2, Building2, User, Mail, Phone, Globe, MapPin, Briefcase, Users, FileText, Linkedin, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";

interface LeadData {
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
  jobPostingTitle: string | null;
  jobDescription: string | null;
  jobUrl: string | null;
  activeJobsUrl: string | null;
  jobsOpen: string | null;
  dateAdded: string;
  feedback: string | null;
}

interface Client {
  id: string;
  email: string;
  client_name?: string;
}

const AdminLeadDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [lead, setLead] = useState<LeadData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [callbackDateTime, setCallbackDateTime] = useState("");
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

      if (error) throw error;

      setLead(data.lead);
      setSelectedStatus(data.lead.status);
      if (data.lead.callbackDateTime) {
        // Convert to local datetime-local format
        const date = new Date(data.lead.callbackDateTime);
        const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setCallbackDateTime(localDateTime);
      }
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
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, client_name")
        .not("client_name", "is", null)
        .neq("client_name", "");

      if (error) throw error;

      setClients(data || []);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const handleAssignClient = async () => {
    if (!selectedClient) return;

    try {
      const { error } = await supabase.functions.invoke("assign-lead-to-client", {
        body: { leadId: id, clientId: selectedClient },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead assigned to client",
      });
    } catch (error) {
      console.error("Error assigning lead:", error);
      toast({
        title: "Error",
        description: "Failed to assign lead",
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

  const handleUpdateCallbackDateTime = async () => {
    if (!callbackDateTime) return;

    try {
      const { error } = await supabase.functions.invoke("update-lead", {
        body: { 
          leadId: id, 
          updates: { 
            callbackDateTime: new Date(callbackDateTime).toISOString() 
          } 
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Callback date updated successfully",
      });

      loadLead();
    } catch (error) {
      console.error("Error updating callback date:", error);
      toast({
        title: "Error",
        description: "Failed to update callback date",
        variant: "destructive",
      });
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
        description: "Lead deleted successfully",
      });

      navigate("/admin/leads");
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Approved: "bg-emerald-100 text-emerald-700",
      Rejected: "bg-red-100 text-red-700",
      'Needs Work': "bg-amber-100 text-amber-700",
      NEW: "bg-blue-100 text-blue-700",
      Lead: "bg-blue-100 text-blue-700",
    };
    return colors[status] || "bg-blue-100 text-blue-700";
  };

  const getLeadDescription = () => {
    return "New lead generated. Be sure to contact the customer on the pre-agreed date and time for the callback suggested by us.";
  };

  if (loading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!lead) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground">Lead not found</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/admin">Dashboard</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href="/admin/leads">All Leads</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{lead.companyName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Admin Actions */}
        <Card className="shadow-sm border-border">
          <CardHeader className="p-6 pb-4">
            <CardTitle className="text-lg font-semibold">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Assign to Client</label>
                {clients.length > 0 ? (
                  <div className="flex gap-2">
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.email} ({client.client_name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleAssignClient} 
                      disabled={!selectedClient}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
                    >
                      Assign
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md border border-border">
                    No clients with configured names. Go to <button onClick={() => navigate("/admin/clients")} className="text-primary underline hover:text-primary/80 transition-colors duration-200">Client Management</button> to configure client names.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Update Stage</label>
                <div className="flex gap-2">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="flex-1">
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
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
                  >
                    Update
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Callback Date & Time</label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={callbackDateTime}
                    onChange={(e) => setCallbackDateTime(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <Button 
                    onClick={handleUpdateCallbackDateTime} 
                    disabled={!callbackDateTime}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200"
                  >
                    Update
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Hero Section */}
        <Card className="shadow-sm border-border">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <h1 className="text-4xl font-bold text-foreground">{lead.companyName}</h1>
                  <Badge className={`${getStatusColor(lead.status)} rounded-full`}>{lead.status}</Badge>
                </div>
                {lead.companyWebsite && (
                  <a 
                    href={lead.companyWebsite} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline inline-flex items-center gap-1 text-sm mb-3 transition-colors duration-200"
                  >
                    <Globe className="h-4 w-4" />
                    {lead.companyWebsite}
                  </a>
                )}
                <p className="text-muted-foreground text-base mt-2">{getLeadDescription()}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="transition-colors duration-200">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Lead
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this lead? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteLead}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                    <Badge variant="destructive" className="text-sm rounded-full">Overdue</Badge>
                  ) : (
                    <Badge className="text-sm bg-emerald-100 text-emerald-700 rounded-full">Upcoming</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Contact Details */}
          <Card className="shadow-sm border-border">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="flex items-center gap-2 text-xl">
                <User className="h-5 w-5" />
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-0">
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
              <Card className="shadow-sm border-border">
                <CardHeader className="p-6 pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 space-y-4">
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
                        <p className="text-sm font-medium text-muted-foreground">Address / Location</p>
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
                        <p className="text-sm font-medium text-muted-foreground mb-2">Company Description</p>
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
                <Card className="shadow-sm border-border">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Call Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">{lead.callNotes}</p>
                  </CardContent>
                </Card>
              )}

              {/* Job Openings */}
              {(lead.jobOpenings?.length > 0 || lead.jobUrl || lead.jobsOpen || lead.activeJobsUrl || lead.jobPostingTitle || lead.jobDescription) && (
                <Card className="shadow-sm border-border">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      Job Openings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-4">
                    {lead.jobsOpen && (
                      <div>
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

              {/* Client Feedback */}
              {lead.feedback && (
                <Card className="shadow-sm border-border">
                  <CardHeader className="p-6 pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Client Feedback
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                      {lead.feedback}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminLeadDetail;
