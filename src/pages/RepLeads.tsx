import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Search, Filter, Users, ArrowRight, PlusCircle, Building2, Mail, Phone } from "lucide-react";
import RepLayout from "@/components/RepLayout";

interface Lead {
  id: string;
  companyName: string;
  status: string;
  clientName: string;
  clientId: string | null;
  contactName: string | null;
  email: string;
  phone: string;
  industry: string | null;
  dateAdded: string;
  feedback: string | null;
}

const RepLeads = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [clients, setClients] = useState<string[]>([]);

  useEffect(() => {
    loadLeads();
  }, [navigate]);

  useEffect(() => {
    filterLeads();
  }, [leads, searchTerm, statusFilter, clientFilter]);

  const loadLeads = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);

    try {
      const { data, error } = await supabase.functions.invoke("get-rep-leads");

      if (error) {
        console.error("Error fetching leads:", error);
        toast.error("Failed to load leads: " + error.message);
        setIsLoading(false);
        return;
      }

      if (data?.leads) {
        setLeads(data.leads);

        // Extract unique clients for filter
        const uniqueClients = [...new Set(data.leads.map((l: Lead) => l.clientName).filter(Boolean))];
        setClients(uniqueClients as string[]);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load leads");
    }

    setIsLoading(false);
  };

  const filterLeads = () => {
    let filtered = [...leads];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(lead =>
        lead.companyName?.toLowerCase().includes(term) ||
        lead.contactName?.toLowerCase().includes(term) ||
        lead.email?.toLowerCase().includes(term)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    // Client filter
    if (clientFilter !== "all") {
      filtered = filtered.filter(lead => lead.clientName === clientFilter);
    }

    setFilteredLeads(filtered);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "N/A";
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return "N/A";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return <Badge variant="outline" className="border-transparent bg-[#34B192] text-white">Approved</Badge>;
      case "Needs Work":
        return <Badge variant="outline" className="border-transparent bg-[#F2B84B] text-white">Needs Work</Badge>;
      case "Rejected":
        return <Badge variant="outline" className="border-transparent bg-[#D64545] text-white">Rejected</Badge>;
      case "In Progress":
        return <Badge variant="outline" className="border-transparent bg-[#64748B] text-white">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="border-transparent bg-[#3B82F6] text-white">New</Badge>;
    }
  };

  const statusCounts = {
    all: leads.length,
    New: leads.filter(l => l.status === "New").length,
    "In Progress": leads.filter(l => l.status === "In Progress").length,
    Approved: leads.filter(l => l.status === "Approved").length,
    "Needs Work": leads.filter(l => l.status === "Needs Work").length,
    Rejected: leads.filter(l => l.status === "Rejected").length,
  };

  if (isLoading) {
    return (
      <RepLayout userEmail={user?.email}>
        <div className="flex min-h-[400px] items-center justify-center bg-[#F7F7F7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </RepLayout>
    );
  }

  return (
    <RepLayout userEmail={user?.email}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              Leads overview
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">My Leads</h1>
            <p className="text-sm text-[#222121]/60">
              View and track leads you've submitted
            </p>
          </div>
          <Button
            onClick={() => navigate("/rep/submit-lead")}
            variant="ghost"
            className="h-11 rounded-full bg-[#34B192] px-6 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Submit New Lead
          </Button>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("all")}
            className={statusFilter === "all" ? "h-9 rounded-full border-transparent bg-[#34B192] text-white" : "h-9 rounded-full border-[#222121]/20 bg-white text-[#222121] hover:bg-[#F7F7F7]"}
          >
            All ({statusCounts.all})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("New")}
            className={statusFilter === "New" ? "h-9 rounded-full border-transparent bg-[#3B82F6] text-white" : "h-9 rounded-full border-[#222121]/20 bg-white text-[#222121] hover:bg-[#F7F7F7]"}
          >
            New ({statusCounts.New})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("In Progress")}
            className={statusFilter === "In Progress" ? "h-9 rounded-full border-transparent bg-[#64748B] text-white" : "h-9 rounded-full border-[#222121]/20 bg-white text-[#222121] hover:bg-[#F7F7F7]"}
          >
            In Progress ({statusCounts["In Progress"]})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("Approved")}
            className={statusFilter === "Approved" ? "h-9 rounded-full border-transparent bg-[#34B192] text-white" : "h-9 rounded-full border-[#222121]/20 bg-white text-[#222121] hover:bg-[#F7F7F7]"}
          >
            Approved ({statusCounts.Approved})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("Needs Work")}
            className={statusFilter === "Needs Work" ? "h-9 rounded-full border-transparent bg-[#F2B84B] text-white" : "h-9 rounded-full border-[#222121]/20 bg-white text-[#222121] hover:bg-[#F7F7F7]"}
          >
            Needs Work ({statusCounts["Needs Work"]})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusFilter("Rejected")}
            className={statusFilter === "Rejected" ? "h-9 rounded-full border-transparent bg-[#D64545] text-white" : "h-9 rounded-full border-[#222121]/20 bg-white text-[#222121] hover:bg-[#F7F7F7]"}
          >
            Rejected ({statusCounts.Rejected})
          </Button>
        </div>

        {/* Filters */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#222121]/40" />
                <Input
                  placeholder="Search by company, contact, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-11 rounded-full border-[#222121]/15 bg-white pl-10 text-sm"
                />
              </div>
              {clients.length > 1 && (
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="h-11 w-full rounded-full border-[#222121]/15 bg-white text-sm sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2 text-[#222121]/50" />
                    <SelectValue placeholder="Filter by client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leads List */}
        {filteredLeads.length === 0 ? (
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-[#222121]/30" />
                <h3 className="text-lg font-medium mb-2 text-[#222121]">No leads found</h3>
                <p className="text-sm text-[#222121]/60 mb-4">
                  {leads.length === 0
                    ? "You haven't submitted any leads yet"
                    : "No leads match your current filters"}
                </p>
                {leads.length === 0 && (
                  <Button
                    onClick={() => navigate("/rep/submit-lead")}
                    variant="ghost"
                    className="h-10 rounded-full bg-[#34B192] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Submit Your First Lead
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => (
              <Card
                key={lead.id}
                className="cursor-pointer border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all hover:border-[#34B192]/40"
                onClick={() => navigate(`/rep/leads/${lead.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate text-[#222121]">{lead.companyName}</h3>
                        {getStatusBadge(lead.status)}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#222121]/60">
                        {lead.contactName && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {lead.contactName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {lead.clientName}
                        </span>
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {lead.phone}
                          </span>
                        )}
                      </div>

                      {lead.feedback && lead.status === "Needs Work" && (
                        <div className="mt-2 rounded-lg border border-[#F2B84B]/40 bg-[#FFF3E1] p-2 text-sm text-[#C7771E]">
                          <strong>Feedback:</strong> {lead.feedback}
                        </div>
                      )}

                      <p className="mt-2 text-xs text-[#222121]/50">
                        Submitted: {formatDate(lead.dateAdded)}
                      </p>
                    </div>

                    <ArrowRight className="h-5 w-5 text-[#222121]/40 flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RepLayout>
  );
};

export default RepLeads;
