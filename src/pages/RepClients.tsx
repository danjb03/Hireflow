import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Building2, Users, ArrowRight } from "lucide-react";
import RepLayout from "@/components/RepLayout";

interface Client {
  id: string;
  client_airtable_id: string;
  client_name: string;
  leadCount: number;
  approvedCount: number;
  pendingCount: number;
}

const RepClients = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    loadClients();
  }, [navigate]);

  const loadClients = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);

    try {
      // Get allocated clients from Supabase
      const { data: allocations, error: allocError } = await supabase
        .from('rep_client_allocations')
        .select('*')
        .eq('rep_id', session.user.id);

      if (allocError) {
        console.error("Error fetching allocations:", allocError);
        toast.error("Failed to load clients");
        setIsLoading(false);
        return;
      }

      // Get leads to count per client
      const { data: leadsData, error: leadsError } = await supabase.functions.invoke("get-rep-leads");

      const leads = leadsData?.leads || [];

      // Build client list with lead counts
      const clientsWithCounts = (allocations || []).map(allocation => {
        const clientLeads = leads.filter((l: any) => l.clientId === allocation.client_airtable_id);
        const approved = clientLeads.filter((l: any) => l.status === "Approved").length;
        const pending = clientLeads.filter((l: any) => l.status === "New" || l.status === "In Progress").length;

        return {
          id: allocation.id,
          client_airtable_id: allocation.client_airtable_id,
          client_name: allocation.client_name || "Unknown Client",
          leadCount: clientLeads.length,
          approvedCount: approved,
          pendingCount: pending,
        };
      });

      setClients(clientsWithCounts);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load clients");
    }

    setIsLoading(false);
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
        <div>
          <h1 className="text-2xl font-semibold">My Clients</h1>
          <p className="text-muted-foreground">
            View clients you're allocated to work with
          </p>
        </div>

        {/* Clients List */}
        {clients.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <h3 className="text-lg font-medium mb-2">No clients allocated</h3>
                <p className="text-muted-foreground">
                  You haven't been allocated to any clients yet. Contact your manager to get started.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="hover:border-primary/50 cursor-pointer transition-all"
                onClick={() => navigate(`/rep/leads?client=${encodeURIComponent(client.client_name)}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-blue-600" />
                      </div>
                      <CardTitle className="text-lg">{client.client_name}</CardTitle>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <strong>{client.leadCount}</strong> leads
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Badge className="bg-emerald-100 text-emerald-700">
                      {client.approvedCount} approved
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700">
                      {client.pendingCount} pending
                    </Badge>
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

export default RepClients;
