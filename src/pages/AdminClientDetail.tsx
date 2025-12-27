import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, Phone, Building2, ExternalLink, Target, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface ClientData {
  id: string;
  name: string;
  email?: string | null;
  status?: string | null;
  phone?: string | null;
  companyName?: string | null;
  contactPerson?: string | null;
  leadsPurchased: number;
  leadsDelivered: number;
  leadsRemaining: number;
  leadStats: {
    total: number;
    new: number;
    approved: number;
    rejected: number;
    needsWork: number;
    booked: number;
  } | null;
}

interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  status: string;
  feedback: string;
  createdAt: string;
}

const AdminClientDetail = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<ClientData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
    loadClientData();
    loadClientLeads();
  }, [clientId]);

  const loadClientData = async () => {
    if (!clientId) return;

    try {
      const { data, error } = await supabase.functions.invoke("get-airtable-clients", {
        body: { includeStats: true }
      });

      if (error) throw error;

      const foundClient = data?.clients?.find((c: ClientData) => c.id === clientId);
      if (foundClient) {
        setClient(foundClient);
      } else {
        toast.error("Client not found");
        navigate("/admin/clients");
      }
    } catch (error) {
      console.error("Error loading client:", error);
      toast.error("Failed to load client data");
    } finally {
      setIsLoading(false);
    }
  };

  const loadClientLeads = async () => {
    if (!clientId) return;

    try {
      // Fetch leads for this specific client from Airtable
      const { data, error } = await supabase.functions.invoke("get-all-leads-admin");

      if (error) throw error;

      // Filter leads that belong to this client
      const clientLeads = (data?.leads || []).filter((lead: any) => {
        const assignedClientId = lead.assignedClientId;
        return assignedClientId === clientId;
      }).map((lead: any) => ({
        id: lead.id,
        companyName: lead.companyName || 'Unknown',
        contactName: lead.contactName || '',
        status: lead.status || 'New',
        feedback: lead.clientFeedback || '',
        createdAt: lead.createdAt || ''
      }));

      setLeads(clientLeads);
    } catch (error) {
      console.error("Error loading client leads:", error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('booked') || statusLower.includes('meeting')) {
      return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />Booked</Badge>;
    }
    if (statusLower.includes('approved') || statusLower.includes('good')) {
      return <Badge className="bg-blue-100 text-blue-700"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    }
    if (statusLower.includes('rejected') || statusLower.includes('not interested')) {
      return <Badge className="bg-red-100 text-red-600"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
    if (statusLower.includes('needs work') || statusLower.includes('improve')) {
      return <Badge className="bg-yellow-100 text-yellow-700"><AlertTriangle className="h-3 w-3 mr-1" />Needs Work</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-600"><Clock className="h-3 w-3 mr-1" />New</Badge>;
  };

  if (isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!client) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Client not found</p>
          <Button onClick={() => navigate("/admin/clients")} className="mt-4">
            Back to Clients
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const completionPercent = client.leadsPurchased > 0
    ? Math.round((client.leadsDelivered / client.leadsPurchased) * 100)
    : 0;

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/clients")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Client Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Building2 className="h-6 w-6" />
                  {client.name}
                </CardTitle>
                {client.companyName && client.companyName !== client.name && (
                  <CardDescription className="text-base mt-1">{client.companyName}</CardDescription>
                )}
              </div>
              {client.status === 'Inactive' || client.status === 'Not Active' ? (
                <Badge variant="secondary" className="bg-slate-100 text-slate-600">Inactive</Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {client.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.contactPerson && (
                <div className="text-muted-foreground">
                  Contact: {client.contactPerson}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-t from-primary/5 to-card">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold">{client.leadsPurchased || 0}</p>
              <p className="text-sm text-muted-foreground">Leads Ordered</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-t from-blue-500/10 to-card">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-blue-600">{client.leadsDelivered}</p>
              <p className="text-sm text-muted-foreground">Leads Delivered</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-t from-amber-500/10 to-card">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-amber-600">{client.leadsRemaining}</p>
              <p className="text-sm text-muted-foreground">Remaining</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-t from-emerald-500/10 to-card">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-emerald-600">{completionPercent}%</p>
              <p className="text-sm text-muted-foreground">Complete</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-t from-purple-500/10 to-card">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-bold text-purple-600">{client.leadStats?.booked || 0}</p>
              <p className="text-sm text-muted-foreground">Meetings Booked</p>
            </CardContent>
          </Card>
        </div>

        {/* Lead Breakdown */}
        {client.leadStats && client.leadStats.total > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Lead Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{client.leadStats.new}</p>
                  <p className="text-sm text-muted-foreground">New</p>
                </div>
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{client.leadStats.approved}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{client.leadStats.booked}</p>
                  <p className="text-sm text-muted-foreground">Booked</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{client.leadStats.needsWork}</p>
                  <p className="text-sm text-muted-foreground">Needs Work</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-500">{client.leadStats.rejected}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Leads</CardTitle>
            <CardDescription>All leads assigned to this client</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No leads assigned to this client yet
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.companyName}</TableCell>
                        <TableCell>{lead.contactName || '—'}</TableCell>
                        <TableCell>{getStatusBadge(lead.feedback || lead.status)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {lead.feedback || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/leads/${lead.id}`)}
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminClientDetail;
