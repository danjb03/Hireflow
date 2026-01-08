import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { NoLeadsEmpty } from "@/components/EmptyState";

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

interface AirtableClient {
  id: string;
  name: string;
  email?: string | null;
  status?: string | null;
}

const AdminAllLeads = () => {
  const navigate = useNavigate();
  const [allLeads, setAllLeads] = useState<Lead[]>([]); // Store all leads for client-side filtering
  const [clients, setClients] = useState<AirtableClient[]>([]);
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

        // Load admin check, clients from Airtable, and leads in parallel
        const [adminResult, clientsResponse, leadsResponse] = await Promise.all([
          supabase.rpc("is_admin", { _user_id: session.user.id }),
          supabase.functions.invoke("get-airtable-clients"),
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

        // Handle Airtable clients response
        if (clientsResponse.error) {
          console.error('Error fetching Airtable clients:', clientsResponse.error);
          setClients([]);
        } else if (clientsResponse.data?.clients && Array.isArray(clientsResponse.data.clients)) {
          setClients(clientsResponse.data.clients);
        } else {
          setClients([]);
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
      // Status filter (case-insensitive)
      if (statusFilter) {
        const filterLower = statusFilter.toLowerCase();
        const statusLower = (lead.status || '').toLowerCase();
        if (statusLower !== filterLower) {
          return false;
        }
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
          if (client && lead.assignedClient !== client.name) {
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

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("update-lead-status", {
        body: { leadId, status: newStatus },
      });

      if (error) {
        console.error("Function error:", error);
        throw new Error(error.message || "Failed to update status");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Update local state immediately
      setAllLeads(prev => prev.map(lead =>
        lead.id === leadId ? { ...lead, status: newStatus } : lead
      ));

      toast({
        title: "Success",
        description: `Lead status updated to ${newStatus}`,
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleAssignClient = async (leadId: string, airtableClientId: string) => {
    const isUnassigning = !airtableClientId;

    try {
      // Pass the Airtable client ID directly - empty string means unassign
      const { data, error } = await supabase.functions.invoke("assign-lead-to-client", {
        body: { leadId, airtableClientId: airtableClientId || null },
      });

      if (error) {
        console.error("Function error:", error, "Data:", data);
        let errorMessage = isUnassigning ? "Failed to unassign lead" : "Failed to assign lead";

        if (data?.error) {
          errorMessage = data.error;
        } else if (error.context?.body) {
          try {
            const errorBody = JSON.parse(error.context.body);
            errorMessage = errorBody.error || errorMessage;
          } catch {
            errorMessage = error.message || errorMessage;
          }
        } else {
          errorMessage = error.message || errorMessage;
        }

        throw new Error(errorMessage);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Update local state immediately
      if (isUnassigning) {
        setAllLeads(prev => prev.map(lead =>
          lead.id === leadId
            ? { ...lead, assignedClient: null, assignedClientId: null }
            : lead
        ));
        toast({
          title: "Success",
          description: "Lead unassigned successfully",
        });
      } else {
        const client = clients.find(c => c.id === airtableClientId);
        if (client) {
          setAllLeads(prev => prev.map(lead =>
            lead.id === leadId
              ? { ...lead, assignedClient: client.name, assignedClientId: airtableClientId }
              : lead
          ));
        }
        toast({
          title: "Success",
          description: "Lead assigned to client successfully",
        });
      }
    } catch (error: any) {
      console.error("Error assigning lead:", error);
      const errorMessage = error?.message || (isUnassigning ? "Failed to unassign lead" : "Failed to assign lead");
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
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

  // Color palette for client badges - hex colors for inline styles (Tailwind purges dynamic classes)
  const clientColors = [
    "#ef4444", // red-500
    "#f97316", // orange-500
    "#f59e0b", // amber-500
    "#eab308", // yellow-500
    "#84cc16", // lime-500
    "#22c55e", // green-500
    "#10b981", // emerald-500
    "#14b8a6", // teal-500
    "#06b6d4", // cyan-500
    "#0ea5e9", // sky-500
    "#3b82f6", // blue-500
    "#6366f1", // indigo-500
    "#8b5cf6", // violet-500
    "#a855f7", // purple-500
    "#d946ef", // fuchsia-500
    "#ec4899", // pink-500
    "#f43f5e", // rose-500
    "#dc2626", // red-600
    "#ea580c", // orange-600
    "#d97706", // amber-600
    "#ca8a04", // yellow-600
    "#65a30d", // lime-600
    "#16a34a", // green-600
    "#059669", // emerald-600
    "#0d9488", // teal-600
    "#0891b2", // cyan-600
    "#0284c7", // sky-600
    "#2563eb", // blue-600
    "#4f46e5", // indigo-600
    "#7c3aed", // violet-600
    "#9333ea", // purple-600
    "#c026d3", // fuchsia-600
    "#db2777", // pink-600
    "#e11d48", // rose-600
    "#b91c1c", // red-700
    "#c2410c", // orange-700
    "#b45309", // amber-700
    "#15803d", // green-700
    "#047857", // emerald-700
    "#0f766e", // teal-700
    "#0e7490", // cyan-700
    "#0369a1", // sky-700
    "#1d4ed8", // blue-700
    "#4338ca", // indigo-700
    "#6d28d9", // violet-700
    "#7e22ce", // purple-700
    "#a21caf", // fuchsia-700
    "#be185d", // pink-700
    "#be123c", // rose-700
    "#475569", // slate-600
  ];

  const getClientColor = (clientName: string): string => {
    // Generate a consistent hash from client name using djb2 algorithm
    let hash = 5381;
    for (let i = 0; i < clientName.length; i++) {
      hash = ((hash << 5) + hash) ^ clientName.charCodeAt(i);
    }
    // Use absolute value and modulo to get index
    const index = Math.abs(hash) % clientColors.length;
    return clientColors[index];
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
              <h1 className="text-2xl font-bold tracking-tight">All Leads</h1>
              <p className="text-sm text-muted-foreground mt-1">
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
                  {clients.map((client) => {
                    const clientName = String(client.name || 'Unknown');
                    const bgColor = getClientColor(clientName);
                    return (
                      <SelectItem key={client.id} value={String(client.id)}>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: bgColor }}></span>
                          {clientName}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <NoLeadsEmpty
              onAction={() => {
                setSearchTerm("");
                setStatusFilter("");
                setClientFilter("");
              }}
            />
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
                        <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                          <Select
                            value={lead.status}
                            onValueChange={(value) => handleUpdateLeadStatus(lead.id, value)}
                          >
                            <SelectTrigger
                              className="w-32 h-7 text-xs border-0 bg-transparent hover:bg-muted/50 focus:ring-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <StatusBadge status={lead.status} size="sm" />
                            </SelectTrigger>
                            <SelectContent className="z-50" onPointerDownOutside={(e) => e.stopPropagation()}>
                              <SelectItem value="NEW">New</SelectItem>
                              <SelectItem value="Lead">Lead</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Needs Work">Needs Work</SelectItem>
                              <SelectItem value="Rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {getClientDisplayName(lead.assignedClient) === "Unassigned" ? (
                          clients.length > 0 ? (
                            <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                              <Select onValueChange={(value) => handleAssignClient(lead.id, value)}>
                                <SelectTrigger className="w-36 h-7 text-xs" onClick={(e) => e.stopPropagation()}>
                                  <SelectValue placeholder="Assign" />
                                </SelectTrigger>
                                <SelectContent className="z-50" onPointerDownOutside={(e) => e.stopPropagation()}>
                                  {clients.map((client) => {
                                    const clientName = String(client.name || 'Unknown');
                                    const bgColor = getClientColor(clientName);
                                    return (
                                      <SelectItem key={client.id} value={String(client.id)}>
                                        <div className="flex items-center gap-2">
                                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: bgColor }}></span>
                                          {clientName}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No clients</span>
                          )
                        ) : (
                          <div onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                            <Select
                              value={lead.assignedClientId || "assigned"}
                              onValueChange={(value) => {
                                if (value === "unassign") {
                                  handleAssignClient(lead.id, "");
                                } else if (value !== "assigned") {
                                  handleAssignClient(lead.id, value);
                                }
                              }}
                            >
                              <SelectTrigger
                                className="w-auto h-7 border-0 p-0 bg-transparent hover:bg-transparent focus:ring-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {(() => {
                                  const clientName = getClientDisplayName(lead.assignedClient);
                                  const bgColor = getClientColor(clientName);
                                  return (
                                    <Badge
                                      className="text-white rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap max-w-[120px] truncate border-0"
                                      style={{ backgroundColor: bgColor }}
                                    >
                                      {clientName}
                                    </Badge>
                                  );
                                })()}
                              </SelectTrigger>
                              <SelectContent className="z-50" onPointerDownOutside={(e) => e.stopPropagation()}>
                                <SelectItem value="unassign" className="text-red-600">
                                  ✕ Unassign
                                </SelectItem>
                                {clients.map((client) => {
                                  const clientName = String(client.name || 'Unknown');
                                  const bgColor = getClientColor(clientName);
                                  return (
                                    <SelectItem key={client.id} value={String(client.id)}>
                                      <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: bgColor }}></span>
                                        {clientName}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
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