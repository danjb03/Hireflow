import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Search, Mail, Phone, Linkedin, MapPin, Building2, Calendar, ExternalLink } from "lucide-react";
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
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
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

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke("get-client-leads");

      if (error) throw error;

      setLeads(data.leads || []);
      setFilteredLeads(data.leads || []);
    } catch (error: any) {
      toast.error("Failed to load leads: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = leads;

    if (searchQuery) {
      filtered = filtered.filter(
        (lead) =>
          lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.contactName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  }, [searchQuery, statusFilter, leads]);

  const getStatusColor = (status: string) => {
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
  };

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
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Your Leads</h1>
          <p className="text-muted-foreground mt-1">
            {filteredLeads.length} of {leads.length} leads
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company or contact name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
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

        {/* Leads Grid */}
        {filteredLeads.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground text-center">
                No leads found matching your criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredLeads.map((lead) => (
              <Card 
                key={lead.id} 
                className="hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/client/leads/${lead.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status}
                    </Badge>
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardTitle className="text-xl">{lead.companyName}</CardTitle>
                  <CardDescription className="font-medium">
                    {lead.contactName}
                    {lead.jobTitle && ` • ${lead.jobTitle}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {lead.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.linkedInProfile && (
                    <div className="flex items-center gap-2 text-sm text-primary">
                      <Linkedin className="h-4 w-4 flex-shrink-0" />
                      <a 
                        href={lead.linkedInProfile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:underline"
                      >
                        LinkedIn Profile
                      </a>
                    </div>
                  )}
                  <div className="pt-2 border-t space-y-2">
                    {lead.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{lead.location}</span>
                      </div>
                    )}
                    {lead.industry && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {lead.industry}
                          {lead.companySize && ` • ${lead.companySize}`}
                        </span>
                      </div>
                    )}
                    {lead.jobsOpen && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Jobs Open:</span> {lead.jobsOpen}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{new Date(lead.dateAdded).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default ClientLeads;
