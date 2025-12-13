import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, FileText, CheckCircle2, AlertTriangle, X, ArrowUpRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";

interface Lead {
  id: string;
  companyName: string;
  status: string;
  assignedClient: string;
  assignedClientId: string | null;
  dateAdded: string;
  companyWebsite?: string;
  companyLinkedIn?: string;
  industry?: string;
  companySize?: string;
  employeeCount?: string;
  country?: string;
  location?: string;
  companyDescription?: string;
  founded?: string;
  contactName?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  linkedInProfile?: string;
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
  client_name?: string;
}

const AdminAllLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [userEmail, setUserEmail] = useState<string>("");
  const [initialized, setInitialized] = useState(false);
  const leadsPerPage = 50;

  // Single initialization effect
  useEffect(() => {
    if (initialized) return;
    
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/login");
          return;
        }

        setUserEmail(user.email || "");

        const { data: isAdmin } = await supabase.rpc("is_admin", {
          _user_id: user.id,
        });

        if (!isAdmin) {
          navigate("/dashboard");
          return;
        }

        // Load clients
        const { data: clientData } = await supabase
          .from("profiles")
          .select("id, email, client_name")
          .not("client_name", "is", null)
          .neq("client_name", "");
        
        setClients(clientData || []);

        // Load leads
        await fetchLeads("", "", "");
        
        setInitialized(true);
      } catch (error) {
        console.error("Error initializing:", error);
        setLoading(false);
      }
    };

    init();
  }, [initialized, navigate]);

  const fetchLeads = async (status: string, client: string, search: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (client) params.append("client", client);
      if (search) params.append("search", search);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }

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

  const handleStatusChange = (value: string) => {
    const newStatus = value === "all" ? "" : value;
    setStatusFilter(newStatus);
    setCurrentPage(1);
    fetchLeads(newStatus, clientFilter, searchTerm);
  };

  const handleClientChange = (value: string) => {
    const newClient = value === "all" ? "" : value;
    setClientFilter(newClient);
    setCurrentPage(1);
    fetchLeads(statusFilter, newClient, searchTerm);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Debounce search
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchLeads(statusFilter, clientFilter, value);
    }, 500);
    return () => clearTimeout(timer);
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

      fetchLeads(statusFilter, clientFilter, searchTerm);
    } catch (error) {
      console.error("Error assigning lead:", error);
      toast({
        title: "Error",
        description: "Failed to assign lead",
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

  const getClientColor = (clientName: string) => {
    const colors = [
      "bg-primary/10 text-primary border-2 border-primary/30",
      "bg-purple-500/10 text-purple-600 border-2 border-purple-500/30",
      "bg-emerald-500/10 text-emerald-600 border-2 border-emerald-500/30",
      "bg-amber-500/10 text-amber-600 border-2 border-amber-500/30",
      "bg-rose-500/10 text-rose-600 border-2 border-rose-500/30",
      "bg-cyan-500/10 text-cyan-600 border-2 border-cyan-500/30",
      "bg-indigo-500/10 text-indigo-600 border-2 border-indigo-500/30",
      "bg-pink-500/10 text-pink-600 border-2 border-pink-500/30",
    ];
    const hash = clientName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = leads.slice(indexOfFirstLead, indexOfLastLead);
  const totalPages = Math.ceil(leads.length / leadsPerPage);

  return (
    <AdminLayout userEmail={userEmail}>
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">All Leads</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {leads.length} leads {totalPages > 1 && `• Page ${currentPage} of ${totalPages}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Tabs value={statusFilter || "all"} onValueChange={handleStatusChange}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="NEW">New</TabsTrigger>
                <TabsTrigger value="Lead">Lead</TabsTrigger>
                <TabsTrigger value="Approved">Approved</TabsTrigger>
                <TabsTrigger value="Needs Work">Needs Work</TabsTrigger>
                <TabsTrigger value="Rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={clientFilter || "all"} onValueChange={handleClientChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.client_name || client.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {leads.length === 0 ? (
            <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-sm">No leads found</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader className="bg-muted sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer" 
                      onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{lead.companyName}</span>
                          {lead.industry && (
                            <span className="text-xs text-muted-foreground">{lead.industry}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {lead.status === 'Approved' && <CheckCircle2 className="h-3 w-3 text-emerald-600" />}
                          {lead.status === 'Needs Work' && <AlertTriangle className="h-3 w-3 text-amber-600" />}
                          {lead.status === 'Rejected' && <X className="h-3 w-3 text-red-600" />}
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.assignedClient === "Unassigned" ? (
                          clients.length > 0 ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select onValueChange={(value) => handleAssignClient(lead.id, value)}>
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent className="z-50">
                                  {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                      {client.client_name || client.email}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No clients</span>
                          )
                        ) : (
                          <Badge className={`${getClientColor(lead.assignedClient)} font-medium rounded-full`}>
                            {lead.assignedClient}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="text-foreground">{lead.contactName || 'N/A'}</span>
                          {lead.email && (
                            <span className="text-xs text-muted-foreground">{lead.email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{lead.location || 'N/A'}</TableCell>
                      <TableCell className="text-sm text-foreground">
                        {new Date(lead.dateAdded).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/leads/${lead.id}`);
                          }}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminAllLeads;