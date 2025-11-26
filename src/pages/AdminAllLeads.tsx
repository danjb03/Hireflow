import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reload when filters change
  useEffect(() => {
    if (!loading) {
      loadLeads();
      setCurrentPage(1);
    }
  }, [debouncedSearch, statusFilter, clientFilter]);

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
      if (debouncedSearch) params.append("search", debouncedSearch);
      
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
        .select("id, email, client_name")
        .not("client_name", "is", null)
        .neq("client_name", "");

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

  // Pagination
  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = leads.slice(indexOfFirstLead, indexOfLastLead);
  const totalPages = Math.ceil(leads.length / leadsPerPage);

  // Group current page leads
  const groupedCurrentLeads = currentLeads.reduce((acc, lead) => {
    const status = lead.status || "NEW";
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(lead);
    return acc;
  }, {} as Record<string, Lead[]>);

  const currentSortedStatuses = sortedStatuses.filter(status => groupedCurrentLeads[status]);

  return (
    <div className="min-h-screen bg-background p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/admin")}
          className="mb-6 transition-all hover:translate-x-[-4px]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Admin Dashboard
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">All Leads</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {leads.length} total leads {totalPages > 1 && `• Page ${currentPage} of ${totalPages}`}
            </p>
          </div>
          <Button onClick={() => navigate("/admin/submit-lead")} className="transition-all hover:scale-105">
            Submit New Lead
          </Button>
        </div>

        <Card className="p-6 mb-6 transition-all hover:shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 transition-all focus:ring-2 focus:ring-primary"
              />
              {searchTerm && (
                <span className="absolute right-3 top-3 text-xs text-muted-foreground">
                  Searching...
                </span>
              )}
            </div>

            <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary">
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
              <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary">
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
          </div>
        </Card>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="h-32 w-full" />
              </Card>
            ))}
          </div>
        ) : leads.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground animate-fade-in">
            No leads found
          </Card>
        ) : (
          <>
            <div className="space-y-4 animate-fade-in">
              {currentSortedStatuses.map((status) => (
                <Collapsible key={status} defaultOpen={true}>
                  <Card className="transition-all hover:shadow-lg">
                    <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        <ChevronDown className="h-5 w-5 transition-transform duration-200 data-[state=closed]:-rotate-90" />
                        <h2 className="text-lg font-semibold">{status}</h2>
                        <Badge variant="secondary" className="transition-all hover:scale-105">{groupedCurrentLeads[status].length}</Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="transition-all duration-300">
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
                          {groupedCurrentLeads[status].map((lead) => (
                            <TableRow key={lead.id} className="transition-colors hover:bg-accent/30">
                              <TableCell>
                                {lead.assignedClient === "Unassigned" ? (
                                  clients.length > 0 ? (
                                    <Select onValueChange={(value) => handleAssignClient(lead.id, value)}>
                                      <SelectTrigger className="w-[240px] transition-all hover:scale-105">
                                        <SelectValue placeholder="Assign to client" />
                                      </SelectTrigger>
                                      <SelectContent className="z-50">
                                        {clients.map((client) => (
                                          <SelectItem 
                                            key={client.id} 
                                            value={client.id}
                                            className="cursor-pointer"
                                          >
                                            <div className={`px-3 py-2 rounded-md font-medium transition-all ${getClientColor(client.client_name || client.email)}`}>
                                              <div className="font-semibold text-sm">{client.client_name || "No Name"}</div>
                                              <div className="text-xs opacity-75">{client.email}</div>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No clients configured</span>
                                  )
                                ) : (
                                  <Badge className={`${getClientColor(lead.assignedClient)} px-3 py-1.5 font-medium whitespace-nowrap`}>
                                    {lead.assignedClient}
                                  </Badge>
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
                                  className="transition-all hover:scale-105 hover:bg-primary hover:text-primary-foreground"
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

          {totalPages > 1 && (
            <Card className="p-4 mt-6 animate-fade-in">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer transition-all hover:scale-105"}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(i + 1)}
                        isActive={currentPage === i + 1}
                        className="cursor-pointer transition-all hover:scale-105"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer transition-all hover:scale-105"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </Card>
          )}
        </>
        )}
      </div>
    </div>
  );
};

export default AdminAllLeads;