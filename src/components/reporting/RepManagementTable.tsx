import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RepForm from "./RepForm";

interface SalesRep {
  id: string;
  name: string;
  email: string | null;
  is_active: boolean;
  daily_calls_target: number;
  daily_hours_target: number;
  daily_bookings_target: number;
  daily_pipeline_target: number;
}

interface RepManagementTableProps {
  reps: SalesRep[];
  loading: boolean;
  onRefresh: () => void;
}

const RepManagementTable = ({ reps, loading, onRefresh }: RepManagementTableProps) => {
  const [editingRep, setEditingRep] = useState<SalesRep | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deletingRep, setDeletingRep] = useState<SalesRep | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddRep = async (data: any) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("manage-reps", {
        body: data,
      });
      if (error) throw error;
      toast.success("Rep added successfully");
      setIsAddDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to add rep");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRep = async (data: any) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-reps`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...data, id: editingRep?.id }),
        }
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Rep updated successfully");
      setEditingRep(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update rep");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRep = async () => {
    if (!deletingRep) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-reps?id=${deletingRep.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      toast.success("Rep deleted successfully");
      setDeletingRep(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete rep");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-medium">{reps.length} Sales Reps</h3>
          <p className="text-sm text-muted-foreground">
            {reps.filter((r) => r.is_active).length} active
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rep
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Calls Target</TableHead>
              <TableHead className="text-center">Hours Target</TableHead>
              <TableHead className="text-center">Bookings Target</TableHead>
              <TableHead className="text-center">Pipeline Target</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No reps added yet. Click "Add Rep" to get started.
                </TableCell>
              </TableRow>
            ) : (
              reps.map((rep) => (
                <TableRow key={rep.id} className={!rep.is_active ? "opacity-50" : ""}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rep.name}</p>
                      {rep.email && (
                        <p className="text-sm text-muted-foreground">{rep.email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={rep.is_active ? "default" : "secondary"}>
                      {rep.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">{rep.daily_calls_target}</TableCell>
                  <TableCell className="text-center">{rep.daily_hours_target}h</TableCell>
                  <TableCell className="text-center">{rep.daily_bookings_target}</TableCell>
                  <TableCell className="text-center">
                    {rep.daily_pipeline_target}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingRep(rep)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingRep(rep)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Rep Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Rep</DialogTitle>
          </DialogHeader>
          <RepForm
            onSubmit={handleAddRep}
            onCancel={() => setIsAddDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Rep Dialog */}
      <Dialog open={!!editingRep} onOpenChange={() => setEditingRep(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rep</DialogTitle>
          </DialogHeader>
          {editingRep && (
            <RepForm
              initialData={{
                id: editingRep.id,
                name: editingRep.name,
                email: editingRep.email || "",
                isActive: editingRep.is_active,
                dailyCallsTarget: editingRep.daily_calls_target,
                dailyHoursTarget: editingRep.daily_hours_target,
                dailyBookingsTarget: editingRep.daily_bookings_target,
                dailyPipelineTarget: editingRep.daily_pipeline_target,
              }}
              onSubmit={handleUpdateRep}
              onCancel={() => setEditingRep(null)}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRep} onOpenChange={() => setDeletingRep(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rep</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingRep?.name}</strong>? This will also
              delete all their reports. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRep}
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

export default RepManagementTable;
