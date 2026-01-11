import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
      case "Needs Work":
        return <Badge className="bg-amber-100 text-amber-700">Needs Work</Badge>;
      case "Rejected":
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      case "In Progress":
        return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700">New</Badge>;
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
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RepLayout>
    );
  }

  return (
    <RepLayout userEmail={user?.email}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">My Leads</h1>
            <p className="text-muted-foreground">
              View and track leads you've submitted
            </p>
          </div>
          <Button
            onClick={() => navigate("/rep/submit-lead")}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Submit New Lead
          </Button>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            All ({statusCounts.all})
          </Button>
          <Button
            variant={statusFilter === "New" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("New")}
          >
            New ({statusCounts.New})
          </Button>
          <Button
            variant={statusFilter === "In Progress" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("In Progress")}
          >
            In Progress ({statusCounts["In Progress"]})
          </Button>
          <Button
            variant={statusFilter === "Approved" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("Approved")}
            className={statusFilter === "Approved" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
          >
            Approved ({statusCounts.Approved})
          </Button>
          <Button
            variant={statusFilter === "Needs Work" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("Needs Work")}
            className={statusFilter === "Needs Work" ? "bg-amber-500 hover:bg-amber-600" : ""}
          >
            Needs Work ({statusCounts["Needs Work"]})
          </Button>
          <Button
            variant={statusFilter === "Rejected" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("Rejected")}
            className={statusFilter === "Rejected" ? "bg-red-500 hover:bg-red-600" : ""}
          >
            Rejected ({statusCounts.Rejected})
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company, contact, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {clients.length > 1 && (
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="h-4 w-4 mr-2" />
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
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="text-lg font-medium mb-2">No leads found</h3>
                <p className="text-muted-foreground mb-4">
                  {leads.length === 0
                    ? "You haven't submitted any leads yet"
                    : "No leads match your current filters"}
                </p>
                {leads.length === 0 && (
                  <Button onClick={() => navigate("/rep/submit-lead")}>
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
                className="hover:border-primary/50 cursor-pointer transition-all"
                onClick={() => navigate(`/rep/leads/${lead.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{lead.companyName}</h3>
                        {getStatusBadge(lead.status)}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
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
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                          <strong>Feedback:</strong> {lead.feedback}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground mt-2">
                        Submitted: {formatDate(lead.dateAdded)}
                      </p>
                    </div>

                    <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
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
