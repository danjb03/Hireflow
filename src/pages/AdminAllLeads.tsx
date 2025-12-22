import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, FileText, CheckCircle2, AlertTriangle, X, ExternalLink, Clock, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";

interface Lead {
  id: string;
  companyName: string;
  status: string;
  assignedClient: string | null | undefined;
  assignedClientId: string | null;
  
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
  
  aiSummary: string | null;
  availability: string | null;
  lastContactDate: string | null;
  nextAction: string | null;
  dateCreated: string;
}

interface Client {
  id: string;
  email: string;
  client_name?: string;
}

const AdminAllLeads = () => {
  const navigate = useNavigate();
  const [allLeads, setAllLeads] = useState<Lead[]>([]); // Store all leads for client-side filtering
  const [clients, setClients] = useState<Client[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
        // Use getSession for faster cached auth
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          navigate("/login");
          return;
        }

        setUserEmail(session.user.email || "");

        // Load admin check, clients, and leads in parallel
        const [adminResult, clientsResult, leadsResponse] = await Promise.all([
          supabase.rpc("is_admin", { _user_id: session.user.id }),
          supabase
            .from("profiles")
            .select("id, email, client_name")
            .not("client_name", "is", null)
            .neq("client_name", ""),
          fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-leads-admin`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
            }
          ),
        ]);

        // Ensure adminResult is a proper Supabase response, not a React Query object
        if (!adminResult || typeof adminResult !== 'object' || !('data' in adminResult)) {
          console.error('Invalid adminResult:', adminResult);
          navigate("/dashboard");
          return;
        }

        if (!adminResult.data) {
          navigate("/dashboard");
          return;
        }

        // Ensure clients data is properly formatted (not a React Query object)
        if (!clientsResult || typeof clientsResult !== 'object' || !('data' in clientsResult)) {
          console.error('Invalid clientsResult:', clientsResult);
          setClients([]);
        } else {
          const clientsData = clientsResult.data;
          if (clientsData && Array.isArray(clientsData)) {
            setClients(clientsData);
          } else {
            setClients([]);
          }
        }

        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          // Ensure leads data is properly formatted (not a React Query object)
          const leadsArray = leadsData?.leads;
          if (leadsArray && Array.isArray(leadsArray)) {
            setAllLeads(leadsArray);
          } else {
            setAllLeads([]);
          }
        } else {
          const errorText = await leadsResponse.text();
          console.error("Failed to fetch leads:", errorText);
          toast({
            title: "Error",
            description: "Failed to load leads from server",
            variant: "destructive",
          });
        }

        setInitialized(true);
      } catch (error) {
        console.error("Error initializing:", error);
        toast({
          title: "Error",
          description: "Failed to load leads",
          variant: "destructive",
        });
      } finally {
        setInitialLoading(false);
      }
    };

    init();
  }, [initialized, navigate]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-all-leads-admin`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Ensure leads data is properly formatted (not a React Query object)
        const leadsArray = data?.leads;
        if (leadsArray && Array.isArray(leadsArray)) {
          setAllLeads(leadsArray);
          toast({ title: "Refreshed", description: "Leads updated successfully" });
        } else {
          setAllLeads([]);
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to refresh leads", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Client-side filtering - instant!
  const filteredLeads = useMemo(() => {
    return allLeads.filter(lead => {
      // Status filter
      if (statusFilter && lead.status !== statusFilter) {
        return false;
      }

      // Client filter
      if (clientFilter) {
        if (clientFilter === "unassigned") {
          if (lead.assignedClient && lead.assignedClient !== "Unassigned") {
            return false;
          }
        } else {
          // Find client by ID and match by name
          const client = clients.find(c => c.id === clientFilter);
          if (client && lead.assignedClient !== client.client_name) {
            return false;
          }
        }
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesCompany = lead.companyName?.toLowerCase().includes(search);
        const matchesContact = lead.contactName?.toLowerCase().includes(search);
        const matchesEmail = lead.email?.toLowerCase().includes(search);
        if (!matchesCompany && !matchesContact && !matchesEmail) {
          return false;
        }
      }

      return true;
    });
  }, [allLeads, statusFilter, clientFilter, searchTerm, clients]);

  const handleStatusChange = (value: string) => {
    const newStatus = value === "all" ? "" : value;
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handleClientChange = (value: string) => {
    const newClient = value === "all" ? "" : value;
    setClientFilter(newClient);
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleAssignClient = async (leadId: string, clientId: string) => {
    try {
      const { error } = await supabase.functions.invoke("assign-lead-to-client", {
        body: { leadId, clientId },
      });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      // Update local state immediately instead of re-fetching
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setAllLeads(prev => prev.map(lead =>
          lead.id === leadId
            ? { ...lead, assignedClient: client.client_name, assignedClientId: clientId }
            : lead
        ));
      }

      toast({
        title: "Success",
        description: "Lead assigned to client successfully",
      });
    } catch (error: any) {
      console.error("Error assigning lead:", error);
      const errorMessage = error?.message || error?.error || "Failed to assign lead. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      New: "bg-blue-100 text-blue-700 border-blue-200",
      NEW: "bg-blue-100 text-blue-700 border-blue-200",
      Lead: "bg-blue-100 text-blue-700 border-blue-200",
      Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
      'Needs Work': "bg-yellow-100 text-yellow-700 border-yellow-200",
      Rejected: "bg-red-100 text-red-700 border-red-200",
      'Not Qualified': "bg-gray-100 text-gray-700 border-gray-200",
    };
    return colors[status] || "bg-blue-100 text-blue-700 border-blue-200";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'Needs Work':
        return <AlertTriangle className="h-3 w-3" />;
      case 'Rejected':
        return <X className="h-3 w-3" />;
      case 'NEW':
      case 'Lead':
        return <Clock className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };


  // Helper function to get client name from assignedClient value
  const getClientDisplayName = (assignedClient: string | null | undefined): string => {
    // Handle null, undefined, or empty values
    if (!assignedClient || assignedClient === "Unassigned") {
      return "Unassigned";
    }
    
    // Ensure it's a string before calling string methods
    const clientValue = String(assignedClient);
    
    // If it looks like an Airtable record ID (starts with "rec"), it means the backend
    // couldn't resolve it - show a fallback. Otherwise, it should be the client name.
    if (clientValue.startsWith('rec')) {
      // Try to find client by matching - this shouldn't happen if backend works correctly
      const client = clients.find(c => c.client_name === clientValue);
      return client?.client_name || clientValue;
    }
    
    return clientValue;
  };

  const indexOfLastLead = currentPage * leadsPerPage;
  const indexOfFirstLead = indexOfLastLead - leadsPerPage;
  const currentLeads = filteredLeads.slice(indexOfFirstLead, indexOfLastLead);
  const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);

  return (
    <AdminLayout userEmail={userEmail}>
      {initialLoading ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6 relative">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">All Leads</h1>
              <p className="text-muted-foreground mt-1">
                {filteredLeads.length} leads {allLeads.length !== filteredLeads.length && `(${allLeads.length} total)`} {totalPages > 1 && `• Page ${currentPage} of ${totalPages}`}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* Status Tabs and Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <Tabs value={statusFilter || "all"} onValueChange={handleStatusChange} className="w-full sm:w-auto">
              <TabsList className="bg-background rounded-lg p-1 shadow-sm border">
                <TabsTrigger 
                  value="all"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2"
                >
                  All
                </TabsTrigger>
                <TabsTrigger 
                  value="NEW"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2"
                >
                  New
                </TabsTrigger>
                <TabsTrigger 
                  value="Lead"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2"
                >
                  Lead
                </TabsTrigger>
                <TabsTrigger 
                  value="Approved"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2"
                >
                  Approved
                </TabsTrigger>
                <TabsTrigger 
                  value="Needs Work"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2"
                >
                  Needs Work
                </TabsTrigger>
                <TabsTrigger 
                  value="Rejected"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-xl px-4 py-2"
                >
                  Rejected
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by company..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9 rounded-lg border bg-background"
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
                    <SelectItem key={client.id} value={String(client.id)}>
                      {String(client.client_name || client.email || 'Unknown')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-base">No leads found</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Company
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Client
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Contact
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Location
                    </TableHead>
                    <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Added
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-0" 
                      onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    >
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">{lead.companyName}</span>
                          {lead.industry && (
                            <span className="text-xs text-muted-foreground">{lead.industry}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge className={`${getStatusColor(lead.status)} border rounded-full flex items-center gap-1 px-2 py-0.5 text-xs font-medium`}>
                          {getStatusIcon(lead.status)}
                          <span>{lead.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {getClientDisplayName(lead.assignedClient) === "Unassigned" ? (
                          clients.length > 0 ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              <Select value="" onValueChange={(value) => handleAssignClient(lead.id, value)}>
                                <SelectTrigger className="w-36 h-7 text-xs">
                                  <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent className="z-50">
                                  {clients.map((client) => (
                                    <SelectItem key={client.id} value={String(client.id)}>
                                      {String(client.client_name || client.email || 'Unknown')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No clients</span>
                          )
                        ) : (
                          <Badge className="bg-violet-100 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 text-xs font-medium">
                            {String(getClientDisplayName(lead.assignedClient))}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm text-foreground">{lead.contactName || 'N/A'}</span>
                          {lead.email && (
                            <span className="text-xs text-muted-foreground">{lead.email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-foreground">
                        {lead.address || lead.country || 'N/A'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-foreground">
                        {new Date(lead.dateCreated).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/leads/${lead.id}`);
                          }}
                          className="hover:bg-muted"
                        >
                          <ExternalLink className="h-4 w-4" />
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
              <span className="text-base text-muted-foreground">
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