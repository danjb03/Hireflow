import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, FileText, Ticket, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import AdminLayout from "@/components/AdminLayout";
import MarketplaceLeadsTab from "@/components/admin/marketplace/MarketplaceLeadsTab";
import MarketplaceTicketsTab from "@/components/admin/marketplace/MarketplaceTicketsTab";

interface AdminMarketplaceLead {
  id: string;
  companyName: string;
  status: string;
  marketplaceStatus: string | null;
  marketplaceWriteup: string | null;
  clients: string;
  contactName: string | null;
  email: string;
  industry: string | null;
  address: string | null;
  country: string | null;
  companySize: string | null;
  titlesOfRoles: string | null;
  dateCreated: string;
}

interface MarketplaceTicket {
  id: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  companyName: string;
  message: string | null;
  leadId: string;
  leadSummary: string | null;
  status: string;
  closeOpportunityId: string | null;
  createdAt: string;
  updatedAt: string;
  contactedAt: string | null;
  adminNotes: string | null;
}

const AdminMarketplace = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [leads, setLeads] = useState<AdminMarketplaceLead[]>([]);
  const [tickets, setTickets] = useState<MarketplaceTicket[]>([]);

  const [activeTab, setActiveTab] = useState("leads");

  useEffect(() => {
    if (initialized) return;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          navigate("/login");
          return;
        }

        setUserEmail(session.user.email || "");

        // Check admin access
        const { data: isAdmin } = await supabase.rpc("is_admin", {
          _user_id: session.user.id,
        });

        if (!isAdmin) {
          navigate("/dashboard");
          return;
        }

        // Load data
        await loadData();
        setInitialized(true);
      } catch (error) {
        console.error("Error initializing:", error);
        toast({
          title: "Error",
          description: "Failed to load marketplace data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [initialized, navigate]);

  const loadData = async () => {
    try {
      // Load leads and tickets in parallel
      const [leadsResult, ticketsResult] = await Promise.all([
        supabase.functions.invoke("get-admin-marketplace-leads"),
        supabase.functions.invoke("get-marketplace-tickets"),
      ]);

      if (leadsResult.error) {
        console.error("Error loading leads:", leadsResult.error);
      } else {
        setLeads(leadsResult.data?.leads || []);
      }

      if (ticketsResult.error) {
        console.error("Error loading tickets:", ticketsResult.error);
      } else {
        setTickets(ticketsResult.data?.tickets || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Marketplace data updated",
    });
  };

  // Count new tickets for badge
  const newTicketsCount = tickets.filter((t) => t.status === "new").length;

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-medium text-violet-600">
              <span className="size-2 rounded-full bg-violet-500" />
              Marketplace
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">
              <span className="text-[#222121]/40">Manage</span>{" "}
              <span className="text-[#222121]">marketplace leads.</span>
            </h1>
            <p className="text-sm text-[#222121]/60">
              List rejected or needs-work leads on the public marketplace
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open("/marketplace", "_blank")}
              className="h-10 rounded-full border-[#222121]/10 bg-white text-sm"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Public Page
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-10 rounded-full border border-[#222121]/10 bg-white px-4 text-sm font-semibold text-[#222121]"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="rounded-full border border-[#222121]/10 bg-white p-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <TabsTrigger
              value="leads"
              className="rounded-full px-6 py-2 text-sm font-semibold text-[#222121]/60 transition data-[state=active]:bg-violet-600 data-[state=active]:text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Leads
              <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                {leads.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="tickets"
              className="relative rounded-full px-6 py-2 text-sm font-semibold text-[#222121]/60 transition data-[state=active]:bg-violet-600 data-[state=active]:text-white"
            >
              <Ticket className="mr-2 h-4 w-4" />
              Tickets
              {newTicketsCount > 0 && (
                <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                  {newTicketsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="leads" className="mt-6">
            <MarketplaceLeadsTab
              leads={leads}
              loading={loading}
              onRefresh={loadData}
            />
          </TabsContent>

          <TabsContent value="tickets" className="mt-6">
            <MarketplaceTicketsTab
              tickets={tickets}
              loading={loading}
              onRefresh={loadData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminMarketplace;
