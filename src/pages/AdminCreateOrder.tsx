import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Package } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

interface Client {
  id: string;
  client_name: string;
  email: string;
}

const AdminCreateOrder = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");

  const [formData, setFormData] = useState({
    client_id: "",
    order_number: "",
    name: "",
    description: "",
    leads_purchased: "",
    target_delivery_date: "",
    start_date: "",
    status: "Draft",
  });

  useEffect(() => {
    checkAdminAndLoadClients();
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, []);

  const checkAdminAndLoadClients = async () => {
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

      await loadClients();
    } catch (error: any) {
      toast.error("Failed to load clients");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, client_name, email")
        .order("client_name");

      if (error) throw error;

      setClients(data || []);
    } catch (error: any) {
      console.error("Error loading clients:", error);
      toast.error("Failed to load clients");
    }
  };

  const generateOrderNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${year}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Auto-generate order number if not provided
      const orderNumber = formData.order_number || generateOrderNumber();

      const { data, error } = await supabase.functions.invoke("create-order", {
        body: {
          ...formData,
          order_number: orderNumber,
          leads_purchased: parseInt(formData.leads_purchased),
        },
      });

      if (error) throw error;

      toast.success("Order created successfully!");
      navigate(`/admin/orders/${data.order.id}`);
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order: " + error.message);
    } finally {
      setSubmitting(false);
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

  return (
    <AdminLayout userEmail={userEmail}>
      <div className="space-y-4 md:space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Create New Order
              </CardTitle>
              <CardDescription>Create a new order/campaign for a client</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="client_id">Client *</Label>
                  <Select
                    value={formData.client_id}
                    onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.client_name} ({client.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_number">Order Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="order_number"
                      value={formData.order_number}
                      onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
                      placeholder="Leave empty to auto-generate"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData({ ...formData, order_number: generateOrderNumber() })}
                    >
                      Generate
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-generated format: ORD-YYYY-XXX
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Order Name (Optional)</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Q1 2025 Campaign"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Additional details about this order..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leads_purchased">Leads Purchased *</Label>
                    <Input
                      id="leads_purchased"
                      type="number"
                      min="1"
                      value={formData.leads_purchased}
                      onChange={(e) => setFormData({ ...formData, leads_purchased: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target_delivery_date">Target Delivery Date</Label>
                    <Input
                      id="target_delivery_date"
                      type="date"
                      value={formData.target_delivery_date}
                      onChange={(e) => setFormData({ ...formData, target_delivery_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/admin/orders")}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !formData.client_id || !formData.leads_purchased}
                    className="flex-1"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Order"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminCreateOrder;

