import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface RepFormData {
  id?: string;
  name: string;
  email: string;
  isActive: boolean;
  dailyCallsTarget: number;
  dailyHoursTarget: number;
  dailyBookingsTarget: number;
  dailyPipelineTarget: number;
}

interface RepFormProps {
  initialData?: Partial<RepFormData>;
  onSubmit: (data: RepFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const RepForm = ({ initialData, onSubmit, onCancel, isSubmitting }: RepFormProps) => {
  const [formData, setFormData] = useState<RepFormData>({
    name: "",
    email: "",
    isActive: true,
    dailyCallsTarget: 100,
    dailyHoursTarget: 6,
    dailyBookingsTarget: 2,
    dailyPipelineTarget: 5000,
    ...initialData,
  });

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Rep Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter rep name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email (Optional)</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email address"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Active</Label>
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
        </div>
      </div>

      {/* Targets */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-4">Daily Targets</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="callsTarget">Calls Target</Label>
            <Input
              id="callsTarget"
              type="number"
              min="0"
              value={formData.dailyCallsTarget}
              onChange={(e) =>
                setFormData({ ...formData, dailyCallsTarget: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hoursTarget">Hours Target</Label>
            <Input
              id="hoursTarget"
              type="number"
              min="0"
              step="0.5"
              value={formData.dailyHoursTarget}
              onChange={(e) =>
                setFormData({ ...formData, dailyHoursTarget: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bookingsTarget">Bookings Target</Label>
            <Input
              id="bookingsTarget"
              type="number"
              min="0"
              value={formData.dailyBookingsTarget}
              onChange={(e) =>
                setFormData({ ...formData, dailyBookingsTarget: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pipelineTarget">Pipeline Target (£)</Label>
            <Input
              id="pipelineTarget"
              type="number"
              min="0"
              step="100"
              value={formData.dailyPipelineTarget}
              onChange={(e) =>
                setFormData({ ...formData, dailyPipelineTarget: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : initialData?.id ? (
            "Update Rep"
          ) : (
            "Add Rep"
          )}
        </Button>
      </div>
    </form>
  );
};

export default RepForm;
