import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Package, Edit, Save, X, Calendar, Users, TrendingUp } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface Order {
  id: string;
  order_number: string;
  name?: string;
  description?: string;
  client_id: string;
  leads_purchased: number;
  leads_delivered: number;
  leads_remaining: number;
  status: string;
  target_delivery_date?: string;
  start_date?: string;
  completion_date?: string;
  completion_percentage?: number;
  days_remaining?: number;
  clients?: {
    client_name: string;
    email: string;
  };
}

interface Lead {
  id: string;
  company_name: string;
  status: string;
  email: string;
  date_created: string;
}

const AdminOrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  const [editData, setEditData] = useState({
    name: "",
    description: "",
    leads_purchased: "",
    target_delivery_date: "",
    start_date: "",
    status: "",
  });

  useEffect(() => {
    checkAdminAndLoadOrder();
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, [id]);

  const checkAdminAndLoadOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const isAdmin = roles?.some(r => r.role === "admin");
      
      if (!isAdmin) {
        toast.error("Access denied - Admin only");
        navigate("/dashboard");
        return;
      }

      await loadOrder();
    } catch (error: any) {
      toast.error("Failed to load order");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-order-details", {
        body: { orderId: id },
      });

      if (error) throw error;

      setOrder(data.order);
      setLeads(data.leads || []);
      
      // Initialize edit data
      if (data.order) {
        setEditData({
          name: data.order.name || "",
          description: data.order.description || "",
          leads_purchased: data.order.leads_purchased.toString(),
          target_delivery_date: data.order.target_delivery_date || "",
          start_date: data.order.start_date || "",
          status: data.order.status,
        });
      }
    } catch (error: any) {
      console.error("Error loading order:", error);
      toast.error("Failed to load order: " + error.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-order", {
        body: {
          order_id: id,
          ...editData,
          leads_purchased: parseInt(editData.leads_purchased),
        },
      });

      if (error) throw error;

      toast.success("Order updated successfully!");
      setEditing(false);
      await loadOrder();
    } catch (error: any) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-100 text-emerald-700";
      case "Completed":
        return "bg-blue-100 text-blue-700";
      case "Paused":
        return "bg-amber-100 text-amber-700";
      case "Draft":
        return "bg-gray-100 text-gray-700";
      case "Cancelled":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout userEmail={userEmail}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Order not found</p>
          <Button onClick={() => navigate("/admin/orders")} className="mt-4">
            Back to Orders
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="space-y-4 md:space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </div>

        {/* Order Header */}
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">{order.order_number}</CardTitle>
                  <Badge variant="outline" className={getStatusColor(order.status)}>
                    {order.status}
                  </Badge>
                </div>
                {order.name && (
                  <CardDescription className="text-base">{order.name}</CardDescription>
                )}
                <CardDescription className="text-sm">
                  Client: {order.clients?.client_name || "Unknown"} ({order.clients?.email})
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (editing) {
                    setEditData({
                      name: order.name || "",
                      description: order.description || "",
                      leads_purchased: order.leads_purchased.toString(),
                      target_delivery_date: order.target_delivery_date || "",
                      start_date: order.start_date || "",
                      status: order.status,
                    });
                  }
                  setEditing(!editing);
                }}
              >
                {editing ? <X className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                {editing ? "Cancel" : "Edit"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Delivery Progress</span>
                <span className="font-semibold">{order.completion_percentage?.toFixed(1) || 0}%</span>
              </div>
              <Progress value={order.completion_percentage || 0} className="h-3" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{order.leads_delivered} delivered</span>
                <span>{order.leads_remaining} remaining</span>
                <span>{order.leads_purchased} total</span>
              </div>
            </div>

            {/* Order Details */}
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Order Name</Label>
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={editData.status}
                      onValueChange={(value) => setEditData({ ...editData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Paused">Paused</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Leads Purchased</Label>
                    <Input
                      type="number"
                      value={editData.leads_purchased}
                      onChange={(e) => setEditData({ ...editData, leads_purchased: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={editData.start_date}
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Target Delivery Date</Label>
                    <Input
                      type="date"
                      value={editData.target_delivery_date}
                      onChange={(e) => setEditData({ ...editData, target_delivery_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Leads Purchased</p>
                  <p className="text-lg font-semibold">{order.leads_purchased}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Leads Delivered</p>
                  <p className="text-lg font-semibold">{order.leads_delivered}</p>
                </div>
                {order.start_date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                    <p className="text-sm font-medium">{new Date(order.start_date).toLocaleDateString()}</p>
                  </div>
                )}
                {order.target_delivery_date && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Target Date</p>
                    <p className="text-sm font-medium">{new Date(order.target_delivery_date).toLocaleDateString()}</p>
                    {order.days_remaining !== null && (
                      <p className={`text-xs ${order.days_remaining < 0 ? 'text-destructive' : order.days_remaining < 7 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        {order.days_remaining < 0
                          ? `${Math.abs(order.days_remaining)} days overdue`
                          : `${order.days_remaining} days left`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {order.description && !editing && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{order.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Assigned Leads</CardTitle>
            <CardDescription className="text-sm">
              {leads.length} lead{leads.length !== 1 ? 's' : ''} assigned to this order
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No leads assigned to this order yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Company</TableHead>
                      <TableHead className="text-xs font-semibold">Email</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Date Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => navigate(`/admin/leads/${lead.id}`)}
                      >
                        <TableCell className="font-medium text-sm">{lead.company_name}</TableCell>
                        <TableCell className="text-sm">{lead.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(lead.date_created).toLocaleDateString()}
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

export default AdminOrderDetail;

