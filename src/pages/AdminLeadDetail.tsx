import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Trash2, Building2, User, Mail, Phone, Globe, MapPin, Briefcase, Users, FileText, Mic, Linkedin, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  recordingTranscript: string | null;
  aiSummary: string | null;
  jobPostingTitle: string | null;
  jobDescription: string | null;
  jobUrl: string | null;
  activeJobsUrl: string | null;
  jobsOpen: string | null;
  dateAdded: string;
}

interface Client {
  id: string;
  email: string;
}

const AdminLeadDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [lead, setLead] = useState<LeadData | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

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
        .select("id, email")
        .not("notion_database_id", "is", null);

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
        description: "Status updated successfully",
      });

      loadLead();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
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
      Approved: "bg-green-500/10 text-green-500 border-green-500/20",
      Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
      'Needs Work': "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Lead not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin/leads")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Leads
        </Button>

        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{lead.companyName}</h1>
            <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
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

        <div className="grid gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Admin Actions</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign to Client</label>
                <div className="flex gap-2">
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAssignClient} disabled={!selectedClient}>
                    Assign
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Update Status</label>
                <div className="flex gap-2">
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Needs Work">Needs Work</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleUpdateStatus}>
                    Update
                  </Button>
                </div>
              </div>
            </div>
          </Card>

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
                    {lead.companyWebsite && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Website</p>
                        <a 
                          href={lead.companyWebsite} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {lead.companyWebsite}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
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
                    {lead.contactName && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Name</p>
                        <p className="text-foreground font-medium">{lead.contactName}</p>
                      </div>
                    )}
                    {lead.jobTitle && (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Job Title</p>
                        <p className="flex items-center gap-1 text-foreground">
                          <Briefcase className="h-4 w-4" />
                          {lead.jobTitle}
                        </p>
                      </div>
                    )}
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
                        <p className="text-sm font-medium text-muted-foreground">Contact's LinkedIn</p>
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
                      {new Date(lead.callbackDateTime).toLocaleString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                    {new Date(lead.callbackDateTime) < new Date() && (
                      <Badge variant="destructive" className="mt-2">Overdue</Badge>
                    )}
                    {new Date(lead.callbackDateTime) > new Date() && (
                      <Badge variant="default" className="mt-2 bg-green-500/10 text-green-500 border-green-500/20">Upcoming</Badge>
                    )}
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
      </div>
    </div>
  );
};

export default AdminLeadDetail;