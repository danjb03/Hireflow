import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, PlusCircle, Search, Package, TrendingUp, Calendar, Users, ArrowRight } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Progress } from "@/components/ui/progress";

interface Order {
  id: string;
  order_number: string;
  name?: string;
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

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    checkAdminAndLoadOrders();
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    getUserEmail();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchTerm]);

  const checkAdminAndLoadOrders = async () => {
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

      await loadOrders();
    } catch (error: any) {
      toast.error("Failed to load orders");
      navigate("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-orders");

      if (error) throw error;

      setOrders(data.orders || []);
    } catch (error: any) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load orders: " + error.message);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(search) ||
        order.name?.toLowerCase().includes(search) ||
        order.clients?.client_name.toLowerCase().includes(search) ||
        order.clients?.email.toLowerCase().includes(search)
      );
    }

    setFilteredOrders(filtered);
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

  if (isLoading) {
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Orders & Campaigns</h1>
            <p className="text-sm text-muted-foreground">Manage client orders and track lead delivery</p>
          </div>
          <Button 
            onClick={() => navigate("/admin/orders/new")}
            size="default"
            className="w-full sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Order
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Orders</p>
                <Package className="h-4 w-4 text-muted-foreground opacity-40" />
              </div>
              <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground mb-1">{orders.length}</div>
              <p className="text-xs text-muted-foreground">All orders</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Orders</p>
                <TrendingUp className="h-4 w-4 text-emerald-600 opacity-40" />
              </div>
              <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground mb-1">
                {orders.filter(o => o.status === "Active").length}
              </div>
              <p className="text-xs text-muted-foreground">In progress</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Leads</p>
                <Users className="h-4 w-4 text-muted-foreground opacity-40" />
              </div>
              <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground mb-1">
                {orders.reduce((sum, o) => sum + o.leads_purchased, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Purchased</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Delivered</p>
                <Calendar className="h-4 w-4 text-muted-foreground opacity-40" />
              </div>
              <div className="text-2xl md:text-3xl font-semibold tabular-nums text-foreground mb-1">
                {orders.reduce((sum, o) => sum + o.leads_delivered, 0)}
              </div>
              <p className="text-xs text-muted-foreground">Leads delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Paused">Paused</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">All Orders</CardTitle>
            <CardDescription className="text-sm">{filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground mb-4">No orders found</p>
                <Button onClick={() => navigate("/admin/orders/new")} variant="outline">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create First Order
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs font-semibold">Order Number</TableHead>
                      <TableHead className="text-xs font-semibold">Client</TableHead>
                      <TableHead className="text-xs font-semibold">Status</TableHead>
                      <TableHead className="text-xs font-semibold">Progress</TableHead>
                      <TableHead className="text-xs font-semibold">Leads</TableHead>
                      <TableHead className="text-xs font-semibold">Target Date</TableHead>
                      <TableHead className="text-xs font-semibold"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => navigate(`/admin/orders/${order.id}`)}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <div className="text-sm text-foreground">{order.order_number}</div>
                            {order.name && (
                              <div className="text-xs text-muted-foreground">{order.name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-foreground">{order.clients?.client_name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">{order.clients?.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-foreground font-medium">
                                {order.completion_percentage?.toFixed(1) || 0}%
                              </span>
                            </div>
                            <Progress value={order.completion_percentage || 0} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="text-foreground font-medium">
                              {order.leads_delivered} / {order.leads_purchased}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {order.leads_remaining} remaining
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.target_delivery_date ? (
                            <div className="text-sm">
                              <div className="text-foreground">
                                {new Date(order.target_delivery_date).toLocaleDateString()}
                              </div>
                              {order.days_remaining !== null && (
                                <div className={`text-xs ${order.days_remaining < 0 ? 'text-destructive' : order.days_remaining < 7 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                  {order.days_remaining < 0
                                    ? `${Math.abs(order.days_remaining)} days overdue`
                                    : `${order.days_remaining} days left`}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No date set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
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

export default AdminOrders;

