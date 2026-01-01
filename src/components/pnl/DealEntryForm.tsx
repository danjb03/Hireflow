import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PoundSterling, TrendingUp, TrendingDown, Calculator } from "lucide-react";
import { toast } from "sonner";
import { calculateDealFinancials, formatCurrency, formatPercent, DealCalculations } from "@/lib/pnlCalculations";

interface DealEntryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const DealEntryForm = ({ onSuccess, onCancel }: DealEntryFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    revenueIncVat: "",
    leadsSold: "",
    leadSalePrice: "",
    setterCommissionPercent: "",
    salesRepCommissionPercent: "",
    closeDate: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const [calculations, setCalculations] = useState<DealCalculations | null>(null);

  // Calculate preview whenever relevant fields change
  useEffect(() => {
    const revenue = parseFloat(formData.revenueIncVat) || 0;
    const leads = parseInt(formData.leadsSold) || 0;
    const leadPrice = parseFloat(formData.leadSalePrice) || 0;
    const setterPercent = parseFloat(formData.setterCommissionPercent) || 0;
    const salesRepPercent = parseFloat(formData.salesRepCommissionPercent) || 0;

    if (revenue > 0) {
      const calcs = calculateDealFinancials({
        revenueIncVat: revenue,
        leadsSold: leads,
        leadSalePrice: leadPrice,
        setterCommissionPercent: setterPercent,
        salesRepCommissionPercent: salesRepPercent,
      });
      setCalculations(calcs);
    } else {
      setCalculations(null);
    }
  }, [formData.revenueIncVat, formData.leadsSold, formData.leadSalePrice, formData.setterCommissionPercent, formData.salesRepCommissionPercent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName || !formData.revenueIncVat || !formData.leadsSold || !formData.leadSalePrice) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke("create-deal", {
        body: {
          companyName: formData.companyName,
          revenueIncVat: parseFloat(formData.revenueIncVat),
          leadsSold: parseInt(formData.leadsSold),
          leadSalePrice: parseFloat(formData.leadSalePrice),
          setterCommissionPercent: parseFloat(formData.setterCommissionPercent) || 0,
          salesRepCommissionPercent: parseFloat(formData.salesRepCommissionPercent) || 0,
          closeDate: formData.closeDate,
          notes: formData.notes || null,
        },
      });

      if (error) throw error;

      toast.success("Deal logged successfully");

      // Reset form
      setFormData({
        companyName: "",
        revenueIncVat: "",
        leadsSold: "",
        leadSalePrice: "",
        setterCommissionPercent: "",
        salesRepCommissionPercent: "",
        closeDate: new Date().toISOString().split('T')[0],
        notes: "",
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating deal:", error);
      toast.error(error.message || "Failed to log deal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Deal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PoundSterling className="h-5 w-5" />
            Deal Details
          </CardTitle>
          <CardDescription>Enter the deal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">
                Company Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="Acme Inc."
                value={formData.companyName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="closeDate">
                Close Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="closeDate"
                name="closeDate"
                type="date"
                value={formData.closeDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="revenueIncVat">
                Total Revenue (inc. VAT) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <Input
                  id="revenueIncVat"
                  name="revenueIncVat"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="5000.00"
                  value={formData.revenueIncVat}
                  onChange={handleChange}
                  className="pl-7"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">Enter the full amount including 20% VAT</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leadsSold">
                Leads Sold <span className="text-destructive">*</span>
              </Label>
              <Input
                id="leadsSold"
                name="leadsSold"
                type="number"
                min="1"
                placeholder="10"
                value={formData.leadsSold}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="leadSalePrice">
              Price Per Lead <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
              <Input
                id="leadSalePrice"
                name="leadSalePrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="500.00"
                value={formData.leadSalePrice}
                onChange={handleChange}
                className="pl-7"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Commission</CardTitle>
          <CardDescription>Enter commission percentages (calculated from net revenue)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="setterCommissionPercent">Setter Commission %</Label>
              <div className="relative">
                <Input
                  id="setterCommissionPercent"
                  name="setterCommissionPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="10"
                  value={formData.setterCommissionPercent}
                  onChange={handleChange}
                  className="pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salesRepCommissionPercent">Sales Rep Commission %</Label>
              <div className="relative">
                <Input
                  id="salesRepCommissionPercent"
                  name="salesRepCommissionPercent"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="5"
                  value={formData.salesRepCommissionPercent}
                  onChange={handleChange}
                  className="pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Any additional notes about this deal..."
            value={formData.notes}
            onChange={handleChange}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Calculation Preview */}
      {calculations && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Calculation Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Net Revenue</p>
                <p className="text-lg font-semibold text-emerald-600">{formatCurrency(calculations.revenueNet)}</p>
                <p className="text-xs text-muted-foreground">VAT: {formatCurrency(calculations.vatDeducted)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Total Costs</p>
                <p className="text-lg font-semibold text-red-600">{formatCurrency(calculations.totalCosts)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Gross Profit</p>
                <p className={`text-lg font-semibold ${calculations.grossProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(calculations.grossProfit)}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Profit Margin</p>
                <p className={`text-lg font-semibold flex items-center gap-1 ${calculations.profitMargin >= 20 ? 'text-emerald-600' : calculations.profitMargin >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {calculations.profitMargin >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {formatPercent(calculations.profitMargin)}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t space-y-2 text-sm">
              <p className="font-medium">Cost Breakdown:</p>
              <div className="grid gap-2 sm:grid-cols-2 text-muted-foreground">
                <div className="flex justify-between">
                  <span>Operating Expenses (20%):</span>
                  <span>{formatCurrency(calculations.operatingExpense)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Lead Fulfillment (£20 x {formData.leadsSold || 0}):</span>
                  <span>{formatCurrency(calculations.leadFulfillmentCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Setter Cost ({formData.setterCommissionPercent || 0}%):</span>
                  <span>{formatCurrency(calculations.setterCost)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sales Rep Cost ({formData.salesRepCommissionPercent || 0}%):</span>
                  <span>{formatCurrency(calculations.salesRepCost)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Log Deal"
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

export default DealEntryForm;
