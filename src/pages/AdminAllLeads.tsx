import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Search, Loader2, ChevronDown, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  companyName: string;
  status: string;
  assignedClient: string;
  assignedClientId: string | null;
  dateAdded: string;
  
  // Company Information
  companyWebsite?: string;
  companyLinkedIn?: string;
  industry?: string;
  companySize?: string;
  employeeCount?: string;
  country?: string;
  location?: string;
  companyDescription?: string;
  founded?: string;
  
  // Contact Details
  contactName?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  linkedInProfile?: string;
  
  // Interaction Details
  
  // Job Information
  jobPostingTitle?: string;
  jobDescription?: string;
  jobUrl?: string;
  activeJobsUrl?: string;
  jobsOpen?: string;
  jobOpenings?: any[];
}

interface Client {
  id: string;
  email: string;
}

const AdminAllLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

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

    await Promise.all([loadLeads(), loadClients()]);
  };

  const loadLeads = async () => {
    setLoading(true);
    try {
      // Build query string for filters
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (clientFilter) params.append("client", clientFilter);
      if (searchTerm) params.append("search", searchTerm);
      
      // Get the auth session to pass in headers
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

      // Make direct fetch call to support query parameters
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-leads-admin?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to load leads" }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setLeads(data.leads || []);
    } catch (error) {
      console.error("Error loading leads:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load leads",
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
        .not("client_name", "is", null);

      if (error) throw error;

      setClients(data || []);
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const handleAssignClient = async (leadId: string, clientId: string) => {
    try {
      const { error } = await supabase.functions.invoke("assign-lead-to-client", {
        body: { leadId, clientId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead assigned to client",
      });

      loadLeads();
    } catch (error) {
      console.error("Error assigning lead:", error);
      toast({
        title: "Error",
        description: "Failed to assign lead",
        variant: "destructive",
      });
    }
  };

  // Helper function to safely parse and display URLs
  const getDisplayUrl = (url: string | undefined): string | null => {
    if (!url || url.trim() === '') return null;
    
    try {
      // Add protocol if missing
      const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`;
      
      const parsedUrl = new URL(urlWithProtocol);
      return parsedUrl.hostname.replace('www.', '');
    } catch (error) {
      // If URL parsing fails, just return the original string
      return url.replace('www.', '').replace('http://', '').replace('https://', '');
    }
  };

  // Helper function to ensure URL has protocol
  const getFullUrl = (url: string | undefined): string | null => {
    if (!url || url.trim() === '') return null;
    
    return url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Approved: "bg-green-500/10 text-green-500 border-green-500/20",
      Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
      'Needs Work': "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      NEW: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      Lead: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    return colors[status] || "bg-muted text-muted-foreground";
  };

  // Group leads by status
  const groupedLeads = leads.reduce((acc, lead) => {
    const status = lead.status || "NEW";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(lead);
    return acc;
  }, {} as Record<string, Lead[]>);

  // Define status order - show all statuses that exist
  const knownStatuses = ["NEW", "Lead", "Approved", "Needs Work", "Rejected"];
  const allStatuses = [...new Set([...knownStatuses, ...Object.keys(groupedLeads)])];
  const sortedStatuses = allStatuses.filter(status => groupedLeads[status]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Dashboard
        </Button>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">All Leads</h1>
          <Button onClick={() => navigate("/admin/submit-lead")}>
            Submit New Lead
          </Button>
        </div>

        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="NEW">NEW</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Needs Work">Needs Work</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={clientFilter || "all"} onValueChange={(value) => setClientFilter(value === "all" ? "" : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={loadLeads}>Apply Filters</Button>
          </div>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : leads.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No leads found
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedStatuses.map((status) => (
              <Collapsible key={status} defaultOpen={true}>
                <Card>
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown className="h-5 w-5 transition-transform data-[state=closed]:-rotate-90" />
                      <h2 className="text-lg font-semibold">{status}</h2>
                      <Badge variant="secondary">{groupedLeads[status].length}</Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Client</TableHead>
                            <TableHead className="whitespace-nowrap">Company</TableHead>
                            <TableHead className="whitespace-nowrap">Stage</TableHead>
                            <TableHead className="whitespace-nowrap">Industry</TableHead>
                            <TableHead className="whitespace-nowrap">Size</TableHead>
                            <TableHead className="whitespace-nowrap">Location</TableHead>
                            <TableHead className="whitespace-nowrap">Contact</TableHead>
                            <TableHead className="whitespace-nowrap">Job Title</TableHead>
                            <TableHead className="whitespace-nowrap">Email</TableHead>
                            <TableHead className="whitespace-nowrap">Phone</TableHead>
                            <TableHead className="whitespace-nowrap">Company Website</TableHead>
                            <TableHead className="whitespace-nowrap">Company LinkedIn</TableHead>
                            <TableHead className="whitespace-nowrap">Contact LinkedIn</TableHead>
                            <TableHead className="whitespace-nowrap">Jobs Open</TableHead>
                            <TableHead className="whitespace-nowrap">Date Added</TableHead>
                            <TableHead className="whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupedLeads[status].map((lead) => (
                            <TableRow key={lead.id}>
                              <TableCell>
                                {lead.assignedClient === "Unassigned" ? (
                                  <Select onValueChange={(value) => handleAssignClient(lead.id, value)}>
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue placeholder="Assign to client" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                          {client.email}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-sm whitespace-nowrap">{lead.assignedClient}</span>
                                )}
                              </TableCell>
                              <TableCell className="font-medium whitespace-nowrap">{lead.companyName}</TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">{lead.industry || 'N/A'}</TableCell>
                              <TableCell className="whitespace-nowrap">{lead.companySize || 'N/A'}</TableCell>
                              <TableCell className="whitespace-nowrap">{lead.location || 'N/A'}</TableCell>
                              <TableCell className="whitespace-nowrap">{lead.contactName || 'N/A'}</TableCell>
                              <TableCell className="whitespace-nowrap">{lead.jobTitle || 'N/A'}</TableCell>
                              <TableCell className="whitespace-nowrap">{lead.email || 'N/A'}</TableCell>
                              <TableCell className="whitespace-nowrap">{lead.phone || 'N/A'}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {lead.companyWebsite && getDisplayUrl(lead.companyWebsite) ? (
                                  <a 
                                    href={getFullUrl(lead.companyWebsite) || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    {getDisplayUrl(lead.companyWebsite)}
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-sm">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {lead.companyLinkedIn && getFullUrl(lead.companyLinkedIn) ? (
                                  <a 
                                    href={getFullUrl(lead.companyLinkedIn) || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    LinkedIn
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-sm">N/A</span>
                                )}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {lead.linkedInProfile && getFullUrl(lead.linkedInProfile) ? (
                                  <a 
                                    href={getFullUrl(lead.linkedInProfile) || '#'} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center gap-1"
                                  >
                                    LinkedIn
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground text-sm">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{lead.jobsOpen || 'N/A'}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                {new Date(lead.dateAdded).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/admin/leads/${lead.id}`)}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAllLeads;