import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, TrendingDown, PoundSterling, Receipt, Wallet, Percent, Building2, Users } from "lucide-react";
import { formatCurrency, formatPercent, getStatCardGradient } from "@/lib/pnlCalculations";

interface PLReport {
  period: {
    type: string;
    startDate: string;
    endDate: string;
  };
  totalRevenueIncVat: number;
  totalRevenueNet: number;
  vatDeducted: number;
  dealCosts: {
    operatingExpenses: number;
    setterCosts: number;
    salesRepCosts: number;
    leadFulfillmentCosts: number;
    total: number;
  };
  additionalCosts: {
    recurring: number;
    oneTime: number;
    total: number;
    byCategory: Record<string, number>;
  };
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
  totalDeals: number;
  totalLeadsSold: number;
  avgRevenuePerDeal: number;
  avgProfitPerDeal: number;
}

interface PLReportViewProps {
  report: PLReport | null;
  loading?: boolean;
}

const PLReportView = ({ report, loading }: PLReportViewProps) => {
  const [includeCorpTax, setIncludeCorpTax] = useState(false);
  const [salaryAmount, setSalaryAmount] = useState<number>(0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No report data available
      </div>
    );
  }

  // Calculate corporation tax (20% of gross profit, only if profitable)
  const corpTaxAmount = includeCorpTax && report.grossProfit > 0
    ? report.grossProfit * 0.20
    : 0;

  // Profit after corporation tax
  const profitAfterTax = report.grossProfit - corpTaxAmount;

  // Final profit after salaries
  const finalProfit = profitAfterTax - salaryAmount;

  const isProfitable = report.grossProfit >= 0;
  const isFinalProfitable = finalProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className={getStatCardGradient('revenue')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <PoundSterling className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold tabular-nums text-emerald-600">
              {formatCurrency(report.totalRevenueIncVat)}
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Revenue
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              (inc. VAT)
            </p>
          </CardContent>
        </Card>

        <Card className={getStatCardGradient('costs')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold tabular-nums text-red-600">
              {formatCurrency(report.totalCosts + report.vatDeducted)}
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Deductions
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              (VAT + Costs)
            </p>
          </CardContent>
        </Card>

        <Card className={getStatCardGradient('profit')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${isProfitable ? 'bg-blue-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                <Wallet className={`h-5 w-5 ${isProfitable ? 'text-blue-600' : 'text-red-600'}`} />
              </div>
            </div>
            <div className={`text-2xl md:text-3xl font-bold tabular-nums ${isProfitable ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(report.grossProfit)}
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Gross Profit
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              (before tax/salary)
            </p>
          </CardContent>
        </Card>

        <Card className={getStatCardGradient('margin')}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${isProfitable ? 'bg-purple-500/20' : 'bg-red-500/20'} flex items-center justify-center`}>
                {isProfitable ? (
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
            </div>
            <div className={`text-2xl md:text-3xl font-bold tabular-nums ${
              report.profitMargin >= 30 ? 'text-emerald-600' :
              report.profitMargin >= 20 ? 'text-green-600' :
              report.profitMargin >= 10 ? 'text-yellow-600' :
              report.profitMargin >= 0 ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {formatPercent(report.profitMargin)}
            </div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Profit Margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{report.totalDeals}</p>
            <p className="text-sm text-muted-foreground">Total Deals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{report.totalLeadsSold}</p>
            <p className="text-sm text-muted-foreground">Leads Sold</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{formatCurrency(report.avgRevenuePerDeal)}</p>
            <p className="text-sm text-muted-foreground">Avg Revenue/Deal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${report.avgProfitPerDeal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(report.avgProfitPerDeal)}
            </p>
            <p className="text-sm text-muted-foreground">Avg Profit/Deal</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Deal Costs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deal Costs</CardTitle>
            <CardDescription>Costs from closed deals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-muted-foreground">Growth Investment Fund</span>
                  <p className="text-xs text-muted-foreground">20% reinvested for future growth</p>
                </div>
                <span className="font-medium">{formatCurrency(report.dealCosts.operatingExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Lead Fulfillment (£20/lead)</span>
                <span className="font-medium">{formatCurrency(report.dealCosts.leadFulfillmentCosts)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Setter Commissions</span>
                <span className="font-medium">{formatCurrency(report.dealCosts.setterCosts)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Sales Rep Commissions</span>
                <span className="font-medium">{formatCurrency(report.dealCosts.salesRepCosts)}</span>
              </div>
              <div className="pt-3 border-t flex justify-between items-center">
                <span className="font-medium">Total Deal Costs</span>
                <span className="font-bold text-red-600">{formatCurrency(report.dealCosts.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Costs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Costs</CardTitle>
            <CardDescription>Business expenses for the period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Recurring Costs</span>
                <span className="font-medium">{formatCurrency(report.additionalCosts.recurring)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">One-Time Costs</span>
                <span className="font-medium">{formatCurrency(report.additionalCosts.oneTime)}</span>
              </div>

              {Object.keys(report.additionalCosts.byCategory).length > 0 && (
                <>
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium mb-2">By Category:</p>
                    <div className="space-y-2">
                      {Object.entries(report.additionalCosts.byCategory).map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center">
                          <Badge variant="outline" className="capitalize">
                            {category}
                          </Badge>
                          <span className="text-sm">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="pt-3 border-t flex justify-between items-center">
                <span className="font-medium">Total Additional Costs</span>
                <span className="font-bold text-red-600">{formatCurrency(report.additionalCosts.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profit & Loss Summary</CardTitle>
          <CardDescription>Complete breakdown from revenue to final profit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Revenue Section */}
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium">Total Revenue (inc. VAT)</span>
              <span className="font-bold text-emerald-600">{formatCurrency(report.totalRevenueIncVat)}</span>
            </div>

            {/* VAT Deduction */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">− VAT (20%)</span>
              <span className="text-red-600">-{formatCurrency(report.vatDeducted)}</span>
            </div>

            {/* Net Revenue */}
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="font-medium">Net Revenue (ex. VAT)</span>
              <span className="font-semibold">{formatCurrency(report.totalRevenueNet)}</span>
            </div>

            {/* Deal Costs Breakdown */}
            <div className="pt-3 border-t">
              <p className="text-sm font-medium text-muted-foreground mb-2">Deal Costs:</p>
              <div className="space-y-1 ml-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Growth Investment Fund (20%)</span>
                  <span className="text-red-600">-{formatCurrency(report.dealCosts.operatingExpenses)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Lead Fulfillment</span>
                  <span className="text-red-600">-{formatCurrency(report.dealCosts.leadFulfillmentCosts)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Setter Commissions</span>
                  <span className="text-red-600">-{formatCurrency(report.dealCosts.setterCosts)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Sales Rep Commissions</span>
                  <span className="text-red-600">-{formatCurrency(report.dealCosts.salesRepCosts)}</span>
                </div>
              </div>
            </div>

            {/* Additional Costs */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">− Additional Business Costs</span>
              <span className="text-red-600">-{formatCurrency(report.additionalCosts.total)}</span>
            </div>

            {/* Gross Profit */}
            <div className="pt-3 border-t flex justify-between items-center text-lg">
              <span className="font-bold">Gross Profit</span>
              <span className={`font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(report.grossProfit)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax & Salary Section */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Tax & Salary Calculator
          </CardTitle>
          <CardDescription>
            Calculate your take-home profit after tax and salaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Corporation Tax Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="corp-tax" className="font-medium">Corporation Tax (UK)</Label>
                <p className="text-sm text-muted-foreground">
                  20% of gross profit - Toggle off for UAE/tax-free zones
                </p>
              </div>
              <Switch
                id="corp-tax"
                checked={includeCorpTax}
                onCheckedChange={setIncludeCorpTax}
              />
            </div>

            {/* Salary Input */}
            <div className="space-y-2">
              <Label htmlFor="salary" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Monthly Salary Drawings
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">£</span>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  step="100"
                  value={salaryAmount || ""}
                  onChange={(e) => setSalaryAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter salary amount"
                  className="max-w-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter total salaries to be drawn this period
              </p>
            </div>

            {/* Final Calculation */}
            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between items-center">
                <span>Gross Profit</span>
                <span className={`font-semibold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(report.grossProfit)}
                </span>
              </div>

              {includeCorpTax && report.grossProfit > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">− Corporation Tax (20%)</span>
                  <span className="text-red-600">-{formatCurrency(corpTaxAmount)}</span>
                </div>
              )}

              {includeCorpTax && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Profit After Tax</span>
                  <span className={`font-semibold ${profitAfterTax >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(profitAfterTax)}
                  </span>
                </div>
              )}

              {salaryAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">− Salary Drawings</span>
                  <span className="text-red-600">-{formatCurrency(salaryAmount)}</span>
                </div>
              )}

              <div className="pt-3 border-t flex justify-between items-center text-lg">
                <span className="font-bold">Final Retained Profit</span>
                <span className={`font-bold text-xl ${isFinalProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(finalProfit)}
                </span>
              </div>

              {!isFinalProfitable && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  Warning: Salary drawings exceed available profit after tax
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PLReportView;
