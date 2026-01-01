import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate, formatPercent } from "@/lib/pnlCalculations";

interface Deal {
  id: string;
  company_name: string;
  revenue_inc_vat: number;
  revenue_net: number;
  operating_expense: number;
  leads_sold: number;
  lead_sale_price: number;
  setter_commission_percent: number;
  sales_rep_commission_percent: number;
  setter_cost: number;
  sales_rep_cost: number;
  lead_fulfillment_cost: number;
  close_date: string;
  notes: string | null;
  created_at: string;
}

interface DealsTableProps {
  deals: Deal[];
  loading?: boolean;
  onRefresh?: () => void;
}

const DealsTable = ({ deals, loading, onRefresh }: DealsTableProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  const handleDeleteClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedDeal) return;

    setDeletingId(selectedDeal.id);
    setDeleteDialogOpen(false);

    try {
      const { error } = await supabase.functions.invoke("delete-deal", {
        body: { dealId: selectedDeal.id },
      });

      if (error) throw error;

      toast.success("Deal deleted successfully");
      onRefresh?.();
    } catch (error: any) {
      console.error("Error deleting deal:", error);
      toast.error(error.message || "Failed to delete deal");
    } finally {
      setDeletingId(null);
      setSelectedDeal(null);
    }
  };

  const calculateProfit = (deal: Deal) => {
    const totalCosts = deal.operating_expense + deal.setter_cost + deal.sales_rep_cost + deal.lead_fulfillment_cost;
    return deal.revenue_net - totalCosts;
  };

  const calculateMargin = (deal: Deal) => {
    const profit = calculateProfit(deal);
    return deal.revenue_net > 0 ? (profit / deal.revenue_net) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No deals found for this period
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Revenue (net)</TableHead>
              <TableHead className="text-center">Leads</TableHead>
              <TableHead className="text-right">Costs</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-center">Margin</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.map((deal) => {
              const profit = calculateProfit(deal);
              const margin = calculateMargin(deal);

              return (
                <TableRow key={deal.id}>
                  <TableCell>
                    <div className="font-medium">{deal.company_name}</div>
                    {deal.notes && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {deal.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(deal.revenue_net)}
                    <div className="text-xs text-muted-foreground">
                      (inc VAT: {formatCurrency(deal.revenue_inc_vat)})
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{deal.leads_sold}</Badge>
                    <div className="text-xs text-muted-foreground">
                      @ {formatCurrency(deal.lead_sale_price)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(
                      deal.operating_expense + deal.setter_cost + deal.sales_rep_cost + deal.lead_fulfillment_cost
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(profit)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        margin >= 30
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : margin >= 20
                          ? "bg-green-50 text-green-700 border-green-200"
                          : margin >= 10
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : margin >= 0
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }
                    >
                      {formatPercent(margin)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(deal.close_date)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(deal)}
                      disabled={deletingId === deal.id}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      {deletingId === deal.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the deal with {selectedDeal?.company_name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DealsTable;
