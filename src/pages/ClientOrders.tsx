import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Package, ArrowRight } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

interface Order {
  id: string;
  order_number: string;
  name?: string;
  leads_purchased: number;
  leads_delivered: number;
  leads_remaining: number;
  status: string;
  target_delivery_date?: string;
  completion_percentage?: number;
  days_remaining?: number;
}

const ClientOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoadOrders();
  }, []);

  const checkAuthAndLoadOrders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);
    await loadOrders();
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("get-orders");

      if (error) throw error;

      setOrders(data.orders || []);
    } catch (error: any) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load orders: " + error.message);
    } finally {
      setLoading(false);
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
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">My Orders</h1>
          <p className="text-sm text-muted-foreground">Track your order progress and lead delivery</p>
        </div>

        {orders.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No orders found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/client/orders/${order.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{order.order_number}</CardTitle>
                      {order.name && (
                        <CardDescription className="text-base">{order.name}</CardDescription>
                      )}
                    </div>
                    <Badge variant="outline" className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold">{order.completion_percentage?.toFixed(1) || 0}%</span>
                    </div>
                    <Progress value={order.completion_percentage || 0} className="h-2" />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{order.leads_delivered} delivered</span>
                      <span>{order.leads_remaining} remaining</span>
                      <span>{order.leads_purchased} total</span>
                    </div>
                  </div>

                  {order.target_delivery_date && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Target Date</span>
                      <div className="text-right">
                        <span className="font-medium">
                          {new Date(order.target_delivery_date).toLocaleDateString()}
                        </span>
                        {order.days_remaining !== null && (
                          <div className={`text-xs ${order.days_remaining < 0 ? 'text-destructive' : order.days_remaining < 7 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            {order.days_remaining < 0
                              ? `${Math.abs(order.days_remaining)} days overdue`
                              : `${order.days_remaining} days left`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end pt-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
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

export default ClientOrders;

