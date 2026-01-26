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
      return <Badge variant="outline" className="border-transparent bg-[#34B192] text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Booked</Badge>;
    }
    if (statusLower.includes('approved') || statusLower.includes('good')) {
      return <Badge variant="outline" className="border-transparent bg-[#3B82F6] text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
    }
    if (statusLower.includes('rejected') || statusLower.includes('not interested')) {
      return <Badge variant="outline" className="border-transparent bg-[#D64545] text-white"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    }
    if (statusLower.includes('needs work') || statusLower.includes('improve')) {
      return <Badge variant="outline" className="border-transparent bg-[#F2B84B] text-white"><AlertTriangle className="h-3 w-3 mr-1" />Needs Work</Badge>;
    }
    return <Badge variant="outline" className="border-transparent bg-[#64748B] text-white"><Clock className="h-3 w-3 mr-1" />New</Badge>;
  };

  const getOrderStatusBadge = (status: string) => {
    if (status === 'completed') {
      return <Badge variant="outline" className="border-transparent bg-[#34B192] text-white">Completed</Badge>;
    }
    if (status === 'active') {
      return <Badge variant="outline" className="border-transparent bg-[#3B82F6] text-white">Active</Badge>;
    }
    return <Badge variant="outline" className="border-transparent bg-[#9AA3A0] text-white">{status}</Badge>;
  };

  // Calculate order totals
  const orderTotals = orders.reduce((acc, order) => ({
    totalPurchased: acc.totalPurchased + order.leads_purchased,
    totalDelivered: acc.totalDelivered + order.leads_delivered
  }), { totalPurchased: 0, totalDelivered: 0 });

  if (isLoading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="flex min-h-[400px] items-center justify-center bg-[#F7F7F7]">
          <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
        </div>
      </AdminLayout>
    );
  }

  if (!client) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="text-center py-12 bg-[#F7F7F7]">
          <p className="text-[#222121]/60">Client not found</p>
          <Button
            onClick={() => navigate("/admin/clients")}
            variant="outline"
            className="mt-4 h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
          >
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
      <div className="-mx-4 -my-6 space-y-6 bg-[#F7F7F7] px-4 py-6 lg:-mx-6 lg:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#222121]/10 bg-white px-4 py-2 text-sm font-medium text-[#34B192]">
              <span className="size-2 rounded-full bg-[#34B192]" />
              Client detail
            </div>
            <h1 className="text-3xl font-semibold text-[#222121]">{client.name}</h1>
            {client.companyName && client.companyName !== client.name && (
              <p className="text-sm text-[#222121]/60">{client.companyName}</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/clients")}
            className="h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Client Info Card */}
        <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2 text-[#222121]">
                  <Building2 className="h-6 w-6 text-[#34B192]" />
                  {client.name}
                </CardTitle>
              </div>
              {client.status === 'Inactive' || client.status === 'Not Active' ? (
                <Badge variant="outline" className="border-transparent bg-[#9AA3A0] text-white">Inactive</Badge>
              ) : (
                <Badge variant="outline" className="border-transparent bg-[#34B192] text-white">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {client.email && (
                <div className="flex items-center gap-2 text-[#222121]/60">
                  <Mail className="h-4 w-4 text-[#34B192]" />
                  <span>{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-2 text-[#222121]/60">
                  <Phone className="h-4 w-4 text-[#34B192]" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.contactPerson && (
                <div className="text-[#222121]/60">
                  Contact: {client.contactPerson}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-semibold text-[#222121]">{orderTotals.totalPurchased || client.leadsPurchased || 0}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Total Leads Purchased</p>
            </CardContent>
          </Card>
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-semibold text-[#34B192]">{client.leadsDelivered}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Leads Delivered</p>
            </CardContent>
          </Card>
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-semibold text-[#222121]">{client.leadsRemaining}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Remaining</p>
            </CardContent>
          </Card>
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-semibold text-[#34B192]">{completionPercent}%</p>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Complete</p>
            </CardContent>
          </Card>
          <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6 text-center">
              <p className="text-3xl font-semibold text-[#222121]">{client.leadStats?.booked || 0}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">Meetings Booked</p>
            </CardContent>
          </Card>
        </div>

        {/* Orders Section */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-[#222121]">
                  <Package className="h-5 w-5 text-[#34B192]" />
                  Orders
                </CardTitle>
                <CardDescription className="text-[#222121]/60">Track lead purchases and delivery progress</CardDescription>
              </div>
              <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-10 rounded-full bg-[#34B192] px-4 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
                  >
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
                    <Button
                      variant="outline"
                      onClick={() => setIsOrderDialogOpen(false)}
                      className="h-10 rounded-full border-[#222121]/20 bg-white text-sm font-semibold text-[#222121] hover:bg-[#F7F7F7]"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateOrder}
                      disabled={isCreatingOrder}
                      variant="ghost"
                      className="h-10 rounded-full bg-[#34B192] px-5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(52,177,146,0.25)] transition-all hover:bg-[#2D9A7E]"
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
                <Loader2 className="h-6 w-6 animate-spin text-[#222121]/50" />
              </div>
            ) : !profileId ? (
              <div className="text-center py-8 text-[#222121]/60">
                <p>No linked user account found.</p>
                <p className="text-sm mt-1">Invite a user to this client to track orders.</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-[#222121]/60">
                <Package className="h-12 w-12 mx-auto mb-3 text-[#222121]/30" />
                <p>No orders yet</p>
                <p className="text-sm mt-1">Create an order to start tracking lead purchases</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#222121]/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Order #</TableHead>
                      <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-[#222121]/40">Leads</TableHead>
                      <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-[#222121]/40">Delivered</TableHead>
                      <TableHead className="text-center text-xs font-medium uppercase tracking-wide text-[#222121]/40">Progress</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Target Date</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-[#222121]">{order.order_number}</TableCell>
                        <TableCell className="text-center text-[#222121]">{order.leads_purchased}</TableCell>
                        <TableCell className="text-center text-[#222121]">{order.leads_delivered}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <div className="h-2 w-20 rounded-full bg-[#E5E5E5] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#34B192]"
                                style={{ width: `${order.completion_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-[#222121]/60">{order.completion_percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.target_delivery_date ? (
                            <div className="flex items-center gap-1 text-sm text-[#222121]">
                              <Calendar className="h-3 w-3 text-[#34B192]" />
                              {new Date(order.target_delivery_date).toLocaleDateString()}
                              {order.days_remaining !== null && (
                                <span className={`ml-1 ${order.days_remaining < 0 ? 'text-[#D64545]' : order.days_remaining < 7 ? 'text-[#C7771E]' : 'text-[#222121]/60'}`}>
                                  ({order.days_remaining < 0 ? `${Math.abs(order.days_remaining)}d overdue` : `${order.days_remaining}d left`})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[#222121]/50">—</span>
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
              <div className="mt-4 flex items-center justify-between rounded-xl border border-[#222121]/10 bg-[#F7F7F7] p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#34B192]" />
                  <span className="text-sm text-[#222121]/60">Total across all orders:</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-sm">
                    <span className="font-semibold text-[#222121]">{orderTotals.totalPurchased}</span>
                    <span className="ml-1 text-[#222121]/60">purchased</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-[#222121]">{orderTotals.totalDelivered}</span>
                    <span className="ml-1 text-[#222121]/60">delivered</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold text-[#222121]">{orderTotals.totalPurchased - orderTotals.totalDelivered}</span>
                    <span className="ml-1 text-[#222121]/60">remaining</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Breakdown */}
        {client.leadStats && client.leadStats.total > 0 && (
          <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[#222121]">
                <Target className="h-5 w-5 text-[#34B192]" />
                Lead Performance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                  <p className="text-2xl font-semibold text-[#3B82F6]">{client.leadStats.new}</p>
                  <p className="text-xs text-[#222121]/60">New</p>
                </div>
                <div className="text-center p-4 rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                  <p className="text-2xl font-semibold text-[#34B192]">{client.leadStats.approved}</p>
                  <p className="text-xs text-[#222121]/60">Approved</p>
                </div>
                <div className="text-center p-4 rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                  <p className="text-2xl font-semibold text-[#222121]">{client.leadStats.booked}</p>
                  <p className="text-xs text-[#222121]/60">Booked</p>
                </div>
                <div className="text-center p-4 rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                  <p className="text-2xl font-semibold text-[#F2B84B]">{client.leadStats.needsWork}</p>
                  <p className="text-xs text-[#222121]/60">Needs Work</p>
                </div>
                <div className="text-center p-4 rounded-xl border border-[#222121]/10 bg-[#F7F7F7]">
                  <p className="text-2xl font-semibold text-[#D64545]">{client.leadStats.rejected}</p>
                  <p className="text-xs text-[#222121]/60">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leads Table */}
        <Card className="border border-[#222121]/10 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-[#222121]">Assigned Leads</CardTitle>
            <CardDescription className="text-[#222121]/60">All leads assigned to this client</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#222121]/50" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8 text-[#222121]/60">
                No leads assigned to this client yet
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#222121]/10">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Company</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Contact</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Status</TableHead>
                      <TableHead className="text-xs font-medium uppercase tracking-wide text-[#222121]/40">Feedback</TableHead>
                      <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-[#222121]/40">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium text-[#222121]">{lead.companyName}</TableCell>
                        <TableCell className="text-[#222121]">{lead.contactName || '—'}</TableCell>
                        <TableCell>{getStatusBadge(lead.feedback || lead.status)}</TableCell>
                        <TableCell className="max-w-xs truncate text-[#222121]/70">
                          {lead.feedback || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/leads/${lead.id}`)}
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminClientDetail;
