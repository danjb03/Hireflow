import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LeadData {
  companyName: string;
  companyWebsite: string;
  companyLinkedIn?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  contactLinkedIn?: string;
  title?: string;
  industry?: string;
  status: string;
  notes?: string;
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
        body: { pageId: id },
      });

      if (error) throw error;

      setLead(data);
      setSelectedStatus(data.status);
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
      Booked: "bg-green-500/10 text-green-500 border-green-500/20",
      "In Progress": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      Approved: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      Qualified: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
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
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Booked">Booked</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
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

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Company Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Website:</span>
                <a href={lead.companyWebsite} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                  {lead.companyWebsite}
                </a>
              </div>
              {lead.companyLinkedIn && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">LinkedIn:</span>
                  <a href={lead.companyLinkedIn} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                    View Profile
                  </a>
                </div>
              )}
              {lead.industry && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Industry:</span>
                  <span className="ml-2">{lead.industry}</span>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Name:</span>
                <span className="ml-2">{lead.contactName}</span>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Email:</span>
                <a href={`mailto:${lead.contactEmail}`} className="ml-2 text-primary hover:underline">
                  {lead.contactEmail}
                </a>
              </div>
              {lead.contactPhone && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                  <a href={`tel:${lead.contactPhone}`} className="ml-2 text-primary hover:underline">
                    {lead.contactPhone}
                  </a>
                </div>
              )}
              {lead.title && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Title:</span>
                  <span className="ml-2">{lead.title}</span>
                </div>
              )}
              {lead.contactLinkedIn && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">LinkedIn:</span>
                  <a href={lead.contactLinkedIn} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline">
                    View Profile
                  </a>
                </div>
              )}
            </div>
          </Card>

          {lead.notes && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLeadDetail;