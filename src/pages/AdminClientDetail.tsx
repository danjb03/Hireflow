import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail, Phone, Building2, ExternalLink, Target, CheckCircle2, Clock, XCircle, AlertTriangle, Plus, Package, Calendar, TrendingUp } from "lucide-react";
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

interface Order {
  id: string;
  order_number: string;
  leads_purchased: number;
  leads_delivered: number;
  start_date: string | null;
  target_delivery_date: string | null;
  status: string;
  created_at: string;
  completion_percentage: number;
  days_remaining: number | null;
}

const AdminClientDetail = () => {
  const navigate = useNavigate();
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<ClientData | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [userEmail, setUserEmail] = useState<string>("");
  const [profileId, setProfileId] = useState<string | null>(null);

  // New order form state
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [newOrderNumber, setNewOrderNumber] = useState("");
  const [newLeadsPurchased, setNewLeadsPurchased] = useState<number>(0);
  const [newStartDate, setNewStartDate] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
    loadClientData();
    loadClientLeads();
  }, [clientId]);

  useEffect(() => {
    if (profileId) {
      loadClientOrders();
    }
  }, [profileId]);

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
        // Find the profile linked to this Airtable client
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('airtable_client_id', clientId)
          .single();

        if (profileData?.id) {
          setProfileId(profileData.id);
        }
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
      const { data, error } = await supabase.functions.invoke("get-all-leads-admin");

      if (error) throw error;

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

  const loadClientOrders = async () => {
    if (!profileId) return;

    try {
      const { data, error } = await supabase.functions.invoke("get-orders", {
        body: {}
      });

      if (error) throw error;

      // Filter orders for this specific client
      const clientOrders = (data?.orders || []).filter(
        (order: any) => order.client_id === profileId
      );

      setOrders(clientOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!profileId) {
      toast.error("No linked user account found for this client");
      return;
    }

    if (!newOrderNumber.trim() || newLeadsPurchased <= 0) {
      toast.error("Please fill in order number and leads purchased");
      return;
    }

    setIsCreatingOrder(true);

    try {
      const { error } = await supabase.functions.invoke("create-order", {
        body: {
          order_number: newOrderNumber.trim(),
          client_id: profileId,
          leads_purchased: newLeadsPurchased,
          start_date: newStartDate || null,
          target_delivery_date: newTargetDate || null,
          status: 'active'
        }
      });

      if (error) throw error;

      toast.success("Order created successfully");
      setIsOrderDialogOpen(false);
      setNewOrderNumber("");
      setNewLeadsPurchased(0);
      setNewStartDate("");
      setNewTargetDate("");
      loadClientOrders();
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order: " + error.message);
    } finally {
      setIsCreatingOrder(false);
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

  const getOrderStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
    }
    if (status === 'active') {
      return <Badge className="bg-blue-100 text-blue-700">Active</Badge>;
    }
    return <Badge className="bg-slate-100 text-slate-600">{status}</Badge>;
  };

  // Calculate order totals
  const orderTotals = orders.reduce((acc, order) => ({
    totalPurchased: acc.totalPurchased + order.leads_purchased,
    totalDelivered: acc.totalDelivered + order.leads_delivered
  }), { totalPurchased: 0, totalDelivered: 0 });

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
              <p className="text-3xl font-bold">{orderTotals.totalPurchased || client.leadsPurchased || 0}</p>
              <p className="text-sm text-muted-foreground">Total Leads Purchased</p>
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

        {/* Orders Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Orders
                </CardTitle>
                <CardDescription>Track lead purchases and delivery progress</CardDescription>
              </div>
              <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Order
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Order</DialogTitle>
                    <DialogDescription>
                      Add a new lead purchase order for {client.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="orderNumber">Order Number *</Label>
                      <Input
                        id="orderNumber"
                        placeholder="e.g., ORD-001"
                        value={newOrderNumber}
                        onChange={(e) => setNewOrderNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leadsPurchased">Leads Purchased *</Label>
                      <Input
                        id="leadsPurchased"
                        type="number"
                        min="1"
                        placeholder="100"
                        value={newLeadsPurchased || ""}
                        onChange={(e) => setNewLeadsPurchased(parseInt(e.target.value) || 0)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={newStartDate}
                          onChange={(e) => setNewStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="targetDate">Target Delivery Date</Label>
                        <Input
                          id="targetDate"
                          type="date"
                          value={newTargetDate}
                          onChange={(e) => setNewTargetDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateOrder}
                      disabled={isCreatingOrder}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                    >
                      {isCreatingOrder ? "Creating..." : "Create Order"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loadingOrders ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !profileId ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No linked user account found.</p>
                <p className="text-sm mt-1">Invite a user to this client to track orders.</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No orders yet</p>
                <p className="text-sm mt-1">Create an order to start tracking lead purchases</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead className="text-center">Leads</TableHead>
                      <TableHead className="text-center">Delivered</TableHead>
                      <TableHead className="text-center">Progress</TableHead>
                      <TableHead>Target Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell className="text-center">{order.leads_purchased}</TableCell>
                        <TableCell className="text-center">{order.leads_delivered}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${order.completion_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground">{order.completion_percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.target_delivery_date ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {new Date(order.target_delivery_date).toLocaleDateString()}
                              {order.days_remaining !== null && (
                                <span className={`ml-1 ${order.days_remaining < 0 ? 'text-red-500' : order.days_remaining < 7 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                  ({order.days_remaining < 0 ? `${Math.abs(order.days_remaining)}d overdue` : `${order.days_remaining}d left`})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{getOrderStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Order Summary */}
            {orders.length > 0 && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total across all orders:</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-sm">
                    <span className="font-semibold">{orderTotals.totalPurchased}</span>
                    <span className="text-muted-foreground ml-1">purchased</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">{orderTotals.totalDelivered}</span>
                    <span className="text-muted-foreground ml-1">delivered</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">{orderTotals.totalPurchased - orderTotals.totalDelivered}</span>
                    <span className="text-muted-foreground ml-1">remaining</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
