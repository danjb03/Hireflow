import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";

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
  client_name?: string;
}

const AdminAllLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [leadsPerPage] = useState(50);
  const [userEmail, setUserEmail] = useState<string>("");
  const isInitialMount = useRef(true);

  useEffect(() => {
    checkAdminAndLoadData();
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (clientFilter) params.append("client", clientFilter);
      if (debouncedSearch) params.append("search", debouncedSearch);
      
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
  }, [debouncedSearch, statusFilter, clientFilter, navigate]);

  // Reload when filters change (but not on initial mount)
  useEffect(() => {
    // Skip initial mount - it's handled by checkAdminAndLoadData
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Skip if still loading from initial load
    if (loading) return;
    
    loadLeads();
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, clientFilter, loadLeads, loading]);

  const checkAdminAndLoadData = async () => {
    setLoading(true);
    try {
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
    } catch (error) {
      console.error("Error in checkAdminAndLoadData:", error);
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

  const handleAssignClient = useCallback(async (leadId: string, clientId: string) => {
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
  }, [loadLeads]);

  const getDisplayUrl = (url: string | undefined): string | null => {
    if (!url || url.trim() === '') return null;
    
    try {
      const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') 
        ? url 
        : `https://${url}`;
      
      const parsedUrl = new URL(urlWithProtocol);
      return parsedUrl.hostname.replace('www.', '');
    } catch (error) {
      return url.replace('www.', '').replace('http://', '').replace('https://', '');
    }
  };

  const getFullUrl = (url: string | undefined): string | null => {
    if (!url || url.trim() === '') return null;
    
    return url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
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

  const getClientColor = useCallback((clientName: string) => {
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
  }, []);

  // Memoize pagination calculations
  const { currentLeads, totalPages } = useMemo(() => {
    const indexOfLastLead = currentPage * leadsPerPage;
    const indexOfFirstLead = indexOfLastLead - leadsPerPage;
    const currentLeads = leads.slice(indexOfFirstLead, indexOfLastLead);
    const totalPages = Math.ceil(leads.length / leadsPerPage);
    return { currentLeads, totalPages };
  }, [leads, currentPage, leadsPerPage]);

  return (
    <AdminLayout userEmail={userEmail}>
      {loading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">All Leads</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {leads.length} leads {totalPages > 1 && `• Page ${currentPage} of ${totalPages}`}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <Tabs value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={clientFilter || "all"} onValueChange={(value) => setClientFilter(value === "all" ? "" : value)}>
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

          {/* Table */}
          {leads.length === 0 ? (
            <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-sm">No leads found</p>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-lg bg-card shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-medium">Company</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Client</TableHead>
                    <TableHead className="font-medium">Contact</TableHead>
                    <TableHead className="font-medium">Location</TableHead>
                    <TableHead className="font-medium">Added</TableHead>
                    <TableHead className="text-right font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors duration-200" 
                      onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-foreground">{lead.companyName}</span>
                          {lead.industry && (
                            <span className="text-xs text-muted-foreground">{lead.industry}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(lead.status)} rounded-full`}>{lead.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {lead.assignedClient === "Unassigned" ? (
                          clients.length > 0 ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select 
                                onValueChange={(value) => {
                                  handleAssignClient(lead.id, value);
                                }}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent className="z-50">
                                  {clients.map((client) => (
                                    <SelectItem 
                                      key={client.id} 
                                      value={client.id}
                                    >
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
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/leads/${lead.id}`);
                          }}
                          className="transition-colors duration-200"
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="transition-colors duration-200"
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
                className="transition-colors duration-200"
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
