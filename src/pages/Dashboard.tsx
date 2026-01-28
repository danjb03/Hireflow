import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, LogOut, Search, Building2, User, Calendar } from "lucide-react";

interface Lead {
  id: string;
  status: string;
  companyName: string;
  contactName: string;
  titlesOfRoles: string | null;
  industry: string;
  industry2?: string;
  companySize: string;
  dateAdded: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setUser(session.user);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchLeads();
        }
      } else {
        navigate("/login");
      }
    });

    // Check current session
    checkAuth();

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);
    
    // Check if user is admin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id);
    
    const adminCheck = roles?.some(r => r.role === "admin") || false;
    setIsAdmin(adminCheck);
    
    // Redirect admins to admin dashboard
    if (adminCheck) {
      navigate("/admin");
      return;
    }
    
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "booked":
        return "border-transparent bg-[#34B192] text-white";
      case "in progress":
        return "border-transparent bg-[#F2B84B] text-white";
      case "contacted":
        return "border-transparent bg-[#34B192] text-white";
      case "new":
        return "border-transparent bg-[#64748B] text-white";
      default:
        return "border-transparent bg-[#64748B] text-white";
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
        <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Header */}
      <header className="border-b border-[#222121]/10 bg-white">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#222121]">Lead Portal</h1>
            <p className="text-sm text-[#222121]/60">
              Welcome, {user?.email}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
              >
                Admin Panel
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleLogout}
              className="h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6">
        {/* Search and Filter */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <Search className="h-4 w-4 text-[#222121]/40" />
            <Input
              placeholder="Search by company or contact name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 max-w-md rounded-full border-[#222121]/15 bg-white text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11 w-full rounded-full border-[#222121]/15 bg-white text-sm md:w-[180px]">
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

        {/* Lead Count */}
        <div className="mb-4">
          <p className="text-sm text-[#222121]/60">
            Showing {filteredLeads.length} of {leads.length} leads
          </p>
        </div>

        {/* Leads Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLeads.map((lead) => {
            const displayIndustry = lead.industry || lead.industry2 || "";
            return (
            <Card key={lead.id} className="cursor-pointer border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)]" onClick={() => navigate(`/lead/${lead.id}`)}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg text-[#222121]">{lead.companyName}</CardTitle>
                  <Badge variant="outline" className={getStatusColor(lead.status)}>
                    {lead.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1 text-[#222121]/60">
                  <User className="h-3 w-3 text-[#34B192]" />
                  {lead.contactName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#222121]/60">
                  <Building2 className="h-4 w-4 text-[#34B192]" />
                  <span>{lead.titlesOfRoles || "Roles not specified"}</span>
                </div>
                {(displayIndustry || lead.companySize) && (
                  <div className="flex items-center gap-2 text-sm text-[#222121]/60">
                    {displayIndustry && <span className="font-medium">{displayIndustry}</span>}
                    {displayIndustry && lead.companySize && <span>•</span>}
                    {lead.companySize && <span>{lead.companySize}</span>}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-[#222121]/60">
                  <Calendar className="h-4 w-4 text-[#34B192]" />
                  <span>{new Date(lead.dateAdded).toLocaleDateString()}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2 h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
                  onClick={() => navigate(`/lead/${lead.id}`)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
          })}
        </div>

        {filteredLeads.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[#222121]/60">No leads found matching your criteria.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
