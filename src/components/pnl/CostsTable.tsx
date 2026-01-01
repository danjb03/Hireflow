import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/pnlCalculations";

interface BusinessCost {
  id: string;
  name: string;
  description: string | null;
  amount: number;
  cost_type: "recurring" | "one_time";
  frequency: "monthly" | "quarterly" | "yearly" | null;
  category: string;
  effective_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface CostsTableProps {
  costs: BusinessCost[];
  loading?: boolean;
  onRefresh?: () => void;
}

const CostsTable = ({ costs, loading, onRefresh }: CostsTableProps) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState<BusinessCost | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleDeleteClick = (cost: BusinessCost) => {
    setSelectedCost(cost);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedCost) return;

    setDeletingId(selectedCost.id);
    setDeleteDialogOpen(false);

    try {
      const { error } = await supabase.functions.invoke("delete-business-cost", {
        body: { costId: selectedCost.id },
      });

      if (error) throw error;

      toast.success("Cost deleted successfully");
      onRefresh?.();
    } catch (error: any) {
      console.error("Error deleting cost:", error);
      toast.error(error.message || "Failed to delete cost");
    } finally {
      setDeletingId(null);
      setSelectedCost(null);
    }
  };

  const handleToggleActive = async (cost: BusinessCost) => {
    setTogglingId(cost.id);

    try {
      const { error } = await supabase.functions.invoke("update-business-cost", {
        body: {
          id: cost.id,
          isActive: !cost.is_active,
        },
      });

      if (error) throw error;

      toast.success(`Cost ${cost.is_active ? "deactivated" : "activated"} successfully`);
      onRefresh?.();
    } catch (error: any) {
      console.error("Error updating cost:", error);
      toast.error(error.message || "Failed to update cost");
    } finally {
      setTogglingId(null);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      software: "bg-blue-100 text-blue-700 border-blue-200",
      data: "bg-purple-100 text-purple-700 border-purple-200",
      marketing: "bg-green-100 text-green-700 border-green-200",
      personnel: "bg-orange-100 text-orange-700 border-orange-200",
      office: "bg-slate-100 text-slate-700 border-slate-200",
      other: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return colors[category] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (costs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No costs found
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costs.map((cost) => (
              <TableRow key={cost.id} className={!cost.is_active ? "opacity-50" : ""}>
                <TableCell>
                  <div className="font-medium">{cost.name}</div>
                  {cost.description && (
                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {cost.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getCategoryColor(cost.category)}>
                    <span className="capitalize">{cost.category}</span>
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={cost.cost_type === "recurring" ? "default" : "secondary"}>
                      {cost.cost_type === "recurring" ? (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" />
                          Recurring
                        </span>
                      ) : (
                        "One-time"
                      )}
                    </Badge>
                    {cost.frequency && (
                      <span className="text-xs text-muted-foreground capitalize">
                        {cost.frequency}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(cost.amount)}
                  {cost.cost_type === "recurring" && cost.frequency && (
                    <div className="text-xs text-muted-foreground">
                      /{cost.frequency.replace("ly", "")}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div>{formatDate(cost.effective_date)}</div>
                  {cost.end_date && (
                    <div className="text-xs">to {formatDate(cost.end_date)}</div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {cost.cost_type === "recurring" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(cost)}
                      disabled={togglingId === cost.id}
                      className={cost.is_active ? "text-emerald-600" : "text-muted-foreground"}
                    >
                      {togglingId === cost.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : cost.is_active ? (
                        "Active"
                      ) : (
                        "Inactive"
                      )}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteClick(cost)}
                    disabled={deletingId === cost.id}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    {deletingId === cost.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedCost?.name}"? This action cannot be undone.
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

export default CostsTable;
