import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Package, Users } from "lucide-react";
import ClientLayout from "@/components/ClientLayout";

interface Order {
  id: string;
  order_number: string;
  name?: string;
  description?: string;
  leads_purchased: number;
  leads_delivered: number;
  leads_remaining: number;
  status: string;
  target_delivery_date?: string;
  start_date?: string;
  completion_percentage?: number;
  days_remaining?: number;
}

interface Lead {
  id: string;
  company_name: string;
  status: string;
  email: string;
  date_created: string;
}

const ClientOrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoadOrder();
  }, [id]);

  const checkAuthAndLoadOrder = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    setUser(session.user);
    await loadOrder();
  };

  const loadOrder = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("get-order-details", {
        body: { orderId: id },
      });

      if (error) throw error;

      setOrder(data.order);
      setLeads(data.leads || []);
    } catch (error: any) {
      console.error("Error loading order:", error);
      toast.error("Failed to load order: " + error.message);
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

  if (!order) {
    return (
      <ClientLayout userEmail={user?.email}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Order not found</p>
          <Button onClick={() => navigate("/client/orders")} className="mt-4">
            Back to Orders
          </Button>
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout userEmail={user?.email}>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/client/orders")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </div>

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
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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

            {order.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{order.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

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
                        onClick={() => navigate(`/client/leads/${lead.id}`)}
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
    </ClientLayout>
  );
};

export default ClientOrderDetail;

