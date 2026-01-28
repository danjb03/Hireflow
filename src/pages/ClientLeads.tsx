import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Search, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { NoLeadsEmpty } from "@/components/EmptyState";

interface Lead {
  id: string;
  status: string;
  companyName: string;
  dateAdded: string;
  
  // Company Information
  companyWebsite?: string;
  companyLinkedIn?: string;
  industry?: string;
  industry2?: string;
  companySize?: string;
  employeeCount?: string;
  country?: string;
  location?: string;
  companyDescription?: string;
  founded?: string;
  
  // Contact Details
  contactName?: string;
  titlesOfRoles?: string;
  email?: string;
  phone?: string;
  linkedInProfile?: string;
}

const ClientLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);
    await fetchLeads();
  };

  const fetchLeads = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("get-client-leads");
      if (error) throw error;
      setLeads(data.leads || []);
    } catch (error: any) {
      setError(error.message || "Failed to load leads");
      toast.error("Failed to load leads: " + error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => fetchLeads(true);

  // Memoize filtered leads to avoid recalculating on every render
  const filteredLeads = useMemo(() => {
    let filtered = leads;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) =>
          lead.companyName?.toLowerCase().includes(query) ||
          lead.contactName?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    return filtered;
  }, [searchQuery, statusFilter, leads]);

  if (isLoading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              Leads overview
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">Your leads</h1>
            <p className="text-sm text-[#222121]/60">
              {filteredLeads.length} of {leads.length} leads
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex items-center gap-4 rounded-xl border border-[#D64545]/30 bg-white p-6">
            <AlertCircle className="h-6 w-6 text-[#D64545] flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-[#8F2F2F]">Failed to load leads</p>
              <p className="text-sm text-[#D64545]">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-9 rounded-full border-[#D64545]/40 text-[#D64545] hover:bg-[#FDF1F1]"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#222121]/40" />
            <Input
              placeholder="Search by company or contact name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-full border-[#222121]/15 bg-white pl-10 text-sm text-[#222121] placeholder:text-[#222121]/40"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full rounded-full border-[#222121]/15 bg-white text-sm sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Booked">Booked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads Table or Empty State */}
        {filteredLeads.length === 0 ? (
          <NoLeadsEmpty
            onAction={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">Company</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">Contact</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">Status</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">Location</TableHead>
                  <TableHead className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-[#222121]/40">Date Added</TableHead>
                  <TableHead className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-[#222121]/40">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer border-b border-[#222121]/10 transition-colors hover:bg-[#F7F7F7] last:border-0"
                    onClick={() => navigate(`/client/leads/${lead.id}`)}
                  >
                    <TableCell className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#222121]">{lead.companyName}</p>
                        {lead.industry && (
                          <p className="text-xs text-[#222121]/60">{lead.industry}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-[#222121]">{lead.contactName || 'N/A'}</p>
                        {lead.email && (
                          <p className="text-xs text-[#222121]/60">{lead.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <StatusBadge status={lead.status} size="sm" />
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#222121]">{lead.location || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-[#222121]">
                      {new Date(lead.dateAdded).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/client/leads/${lead.id}`);
                        }}
                        className="h-9 w-9 rounded-full hover:bg-[#F5F5F5]"
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
      </div>
    </ClientLayout>
  );
};

export default ClientLeads;
