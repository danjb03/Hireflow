import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Search, Mail, Phone, Linkedin, MapPin, Building2, Calendar, ExternalLink, FileText } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

interface Lead {
  id: string;
  status: string;
  companyName: string;
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

const ClientLeads = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("get-client-leads");

      if (error) throw error;

      setLeads(data.leads || []);
    } catch (error: any) {
      toast.error("Failed to load leads: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case "booked":
        return "bg-success text-success-foreground";
      case "in progress":
        return "bg-warning text-warning-foreground";
      case "contacted":
        return "bg-info text-info-foreground";
      case "new":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  }, []);

  if (isLoading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Leads</h1>
          <p className="text-muted-foreground mt-1">
            {filteredLeads.length} of {leads.length} leads
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by company or contact name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-lg border bg-background"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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
          <div className="bg-muted/30 border-dashed border-2 rounded-xl p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No leads found matching your criteria.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Company</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Contact</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Status</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Location</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3">Date Added</TableHead>
                  <TableHead className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 py-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="hover:bg-muted/50 transition-colors border-b last:border-0 cursor-pointer"
                    onClick={() => navigate(`/client/leads/${lead.id}`)}
                  >
                    <TableCell className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{lead.companyName}</p>
                        {lead.industry && (
                          <p className="text-sm text-muted-foreground">{lead.industry}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{lead.contactName || 'N/A'}</p>
                        {lead.email && (
                          <p className="text-sm text-muted-foreground">{lead.email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <Badge className={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-foreground">{lead.location || 'N/A'}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-foreground">
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
