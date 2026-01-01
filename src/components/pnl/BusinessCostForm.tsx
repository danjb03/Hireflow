import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

interface BusinessCostFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BusinessCostForm = ({ onSuccess, onCancel }: BusinessCostFormProps) => {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ name: string; description: string }[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    costType: "one_time" as "recurring" | "one_time",
    frequency: "" as "" | "monthly" | "quarterly" | "yearly",
    category: "",
    effectiveDate: new Date().toISOString().split('T')[0],
    endDate: "",
    isActive: true,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-business-costs");
      if (error) throw error;
      if (data?.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      // Use default categories if fetch fails
      setCategories([
        { name: "software", description: "Software subscriptions and licenses" },
        { name: "data", description: "Data providers and systems" },
        { name: "marketing", description: "Marketing and advertising" },
        { name: "personnel", description: "Staff and contractor costs" },
        { name: "office", description: "Office and facilities" },
        { name: "other", description: "Other miscellaneous costs" },
      ]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.amount || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.costType === "recurring" && !formData.frequency) {
      toast.error("Please select a frequency for recurring costs");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("create-business-cost", {
        body: {
          name: formData.name,
          description: formData.description || null,
          amount: parseFloat(formData.amount),
          costType: formData.costType,
          frequency: formData.costType === "recurring" ? formData.frequency : null,
          category: formData.category,
          effectiveDate: formData.effectiveDate,
          endDate: formData.endDate || null,
          isActive: formData.isActive,
        },
      });

      if (error) throw error;

      toast.success("Cost logged successfully");

      // Reset form
      setFormData({
        name: "",
        description: "",
        amount: "",
        costType: "one_time",
        frequency: "",
        category: "",
        effectiveDate: new Date().toISOString().split('T')[0],
        endDate: "",
        isActive: true,
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating cost:", error);
      toast.error(error.message || "Failed to log cost");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Cost Details
          </CardTitle>
          <CardDescription>Enter the business cost information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">
                Cost Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="CRM Subscription"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="99.00"
                  value={formData.amount}
                  onChange={handleChange}
                  className="pl-7"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="costType">
                Cost Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.costType}
                onValueChange={(value: "recurring" | "one_time") =>
                  setFormData({ ...formData, costType: value, frequency: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_time">One-Time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.costType === "recurring" && (
              <div className="space-y-2">
                <Label htmlFor="frequency">
                  Frequency <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: "monthly" | "quarterly" | "yearly") =>
                    setFormData({ ...formData, frequency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.name} value={cat.name}>
                    <span className="capitalize">{cat.name}</span>
                    <span className="text-muted-foreground text-xs ml-2">- {cat.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">
                {formData.costType === "recurring" ? "Start Date" : "Date"} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="effectiveDate"
                name="effectiveDate"
                type="date"
                value={formData.effectiveDate}
                onChange={handleChange}
                required
              />
            </div>

            {formData.costType === "recurring" && (
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (optional)</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Additional details about this cost..."
              value={formData.description}
              onChange={handleChange}
              rows={2}
            />
          </div>

          {formData.costType === "recurring" && (
            <div className="flex items-center gap-3 pt-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Cost is currently active
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Log Cost"
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
};

export default BusinessCostForm;
