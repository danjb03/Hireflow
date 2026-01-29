import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  industry2: string | null;
  employeeCount: number | null;
  companySize: string | null;
  founded: string | null;
  
  titlesOfRoles: string | null;
  
  aiSummary: string | null;
  availability: string | null;
  lastContactDate: string | null;
  nextAction: string | null;
  dateCreated: string;
  marketplaceStatus?: string | null;
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
        if (clientsResponse.error || clientsResponse.data?.error) {
          const message = clientsResponse.error?.message || clientsResponse.data?.error || "Failed to load Airtable clients";
          console.error('Error fetching Airtable clients:', clientsResponse.error || clientsResponse.data?.error);
          toast({
            title: "Error",
            description: message,
            variant: "destructive",
          });
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
      // Special marketplace filter
      if (statusFilter === "marketplace") {
        if (lead.marketplaceStatus !== "Active") {
          return false;
        }
      } else if (statusFilter) {
        // Status filter (case-insensitive)
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

  const handleUpdateMarketplaceStatus = async (leadId: string, newStatus: string) => {
    if (!newStatus) return;

    try {
      const { data, error } = await supabase.functions.invoke("update-marketplace-status", {
        body: { leadId, marketplaceStatus: newStatus },
      });

      if (error) {
        throw new Error(error.message || "Failed to update marketplace status");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Update local state immediately
      setAllLeads(prev => prev.map(lead =>
        lead.id === leadId ? { ...lead, marketplaceStatus: newStatus } : lead
      ));

      toast({
        title: "Marketplace status updated",
        description: `Status set to ${newStatus}`,
      });
    } catch (error: any) {
      console.error("Error updating marketplace status:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update marketplace status",
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
      const client = clients.find(c => c.name === clientValue);
      return client?.name || clientValue;
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
        <div className="-mx-4 -my-6 flex min-h-[60vh] items-center justify-center bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      ) : (
        <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
          {/* Header Section */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
                <span className="size-2 rounded-full bg-[#34B192]" />
                Lead management
              </div>
              <h1 className="text-3xl font-semibold text-[#222121]">
                <span className="text-[#222121]/40">Review and assign</span>{" "}
                <span className="text-[#222121]">every lead.</span>
              </h1>
              <p className="text-sm text-[#222121]/60">
                {filteredLeads.length} leads{" "}
                {allLeads.length !== filteredLeads.length &&
                  `(${allLeads.length} total)`}{" "}
                {totalPages > 1 && `• Page ${currentPage} of ${totalPages}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10 w-full rounded-full border border-[#222121]/10 bg-white px-4 text-sm font-semibold text-[#222121] transition-all hover:border-[#222121]/20 hover:bg-[#34B192]/5 sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {/* Status Tabs and Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <Tabs
              value={statusFilter || "all"}
              onValueChange={handleStatusChange}
              className="w-full sm:w-auto"
            >
              <TabsList className="rounded-full border border-[#222121]/10 bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                {["all", "NEW", "Lead", "Approved", "Needs Work", "Rejected", "marketplace"].map(
                  (value) => (
                    <TabsTrigger
                      key={value}
                      value={value}
                      className={`rounded-full px-4 py-2 text-xs font-semibold transition data-[state=active]:text-white ${
                        value === "marketplace"
                          ? "text-[#34B192] data-[state=active]:bg-[#34B192]"
                          : "text-[#222121]/60 data-[state=active]:bg-[#34B192]"
                      }`}
                    >
                      {value === "all" ? "All" : value === "marketplace" ? "Marketplace" : value}
                    </TabsTrigger>
                  )
                )}
              </TabsList>
            </Tabs>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222121]/40" />
                <Input
                  placeholder="Search by company..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="h-11 rounded-full border-[#222121]/10 bg-white pl-9 text-sm text-[#222121] placeholder:text-[#222121]/40"
                />
              </div>

              <Select value={clientFilter || "all"} onValueChange={handleClientChange}>
                <SelectTrigger className="h-11 w-48 rounded-full border-[#222121]/10 bg-white text-sm text-[#222121]">
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
            <div className="overflow-hidden rounded-2xl border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#222121]/10">
                    <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                      Company
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                      Status
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                      Client
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                      Contact
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                      Location
                    </TableHead>
                    <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                      Added
                    </TableHead>
                    <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#222121]/40">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentLeads.map((lead) => (
                    <TableRow 
                      key={lead.id} 
                      className="cursor-pointer border-b border-[#222121]/10 transition-colors last:border-0 hover:bg-[#34B192]/5"
                      onClick={() => navigate(`/admin/leads/${lead.id}`)}
                    >
                      <TableCell className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-[#222121]">{lead.companyName}</span>
                          {lead.industry && (
                            <span className="text-xs text-[#222121]/50">{lead.industry}</span>
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
                              className="h-8 w-32 rounded-full border border-transparent bg-transparent text-xs hover:bg-[#34B192]/5 focus:ring-0"
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
                                <SelectTrigger className="h-8 w-36 rounded-full border-[#222121]/10 bg-white text-xs text-[#222121]" onClick={(e) => e.stopPropagation()}>
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
                                className="h-8 w-auto rounded-full border border-transparent bg-transparent p-0 text-xs hover:bg-transparent focus:ring-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {(() => {
                                  const clientName = getClientDisplayName(lead.assignedClient);
                                  const bgColor = getClientColor(clientName);
                                  return (
                                    <span
                                      className="inline-flex items-center text-white rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap max-w-[120px] truncate"
                                      style={{ backgroundColor: bgColor }}
                                    >
                                      {clientName}
                                    </span>
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
                          <span className="text-sm font-medium text-[#222121]">{lead.contactName || 'N/A'}</span>
                          {lead.email && (
                            <span className="text-xs text-[#222121]/50">{lead.email}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-[#222121]">
                        {lead.address || lead.country || 'N/A'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-[#222121]">
                        {new Date(lead.dateCreated).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Select
                            value={String(lead.status || "").toLowerCase() === "approved" ? (lead.marketplaceStatus || "") : ""}
                            onValueChange={(value) => {
                              if (String(lead.status || "").toLowerCase() !== "approved") return;
                              handleUpdateMarketplaceStatus(lead.id, value);
                            }}
                            disabled={String(lead.status || "").toLowerCase() !== "approved"}
                          >
                            <SelectTrigger className="h-8 w-[140px] rounded-full border-[#222121]/15 bg-white text-xs">
                              <SelectValue placeholder={String(lead.status || "").toLowerCase() === "approved" ? "Set status" : "Approve first"} />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              {["Pending Review", "Active", "Sold", "Hidden"].map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/leads/${lead.id}`);
                            }}
                            className="h-8 w-8 p-0 hover:bg-[#34B192]/10"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
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
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-9 rounded-full border border-[#222121]/10 bg-white px-4 text-xs font-semibold text-[#222121] hover:bg-[#34B192]/5"
              >
                Previous
              </Button>
              <span className="text-sm text-[#222121]/60">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-9 rounded-full border border-[#222121]/10 bg-white px-4 text-xs font-semibold text-[#222121] hover:bg-[#34B192]/5"
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
