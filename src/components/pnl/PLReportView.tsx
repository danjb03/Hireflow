import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, TrendingDown, PoundSterling, Receipt, Wallet, Building2, Users } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/pnlCalculations";

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
        <Loader2 className="h-8 w-8 animate-spin text-[#34B192]" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="py-12 text-center text-[#222121]/60">
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
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34B192]/10">
                <PoundSterling className="h-5 w-5 text-[#34B192]" />
              </div>
            </div>
            <div className="text-2xl font-semibold tabular-nums text-[#222121] md:text-3xl">
              {formatCurrency(report.totalRevenueIncVat)}
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
              Total Revenue
            </p>
            <p className="mt-1 text-xs text-[#222121]/40">(inc. VAT)</p>
          </CardContent>
        </Card>

        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                <Receipt className="h-5 w-5 text-red-500" />
              </div>
            </div>
            <div className="text-2xl font-semibold tabular-nums text-red-500 md:text-3xl">
              {formatCurrency(report.totalCosts + report.vatDeducted)}
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
              Total Deductions
            </p>
            <p className="mt-1 text-xs text-[#222121]/40">(VAT + Costs)</p>
          </CardContent>
        </Card>

        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isProfitable ? "bg-[#34B192]/10" : "bg-red-500/10"}`}>
                <Wallet className={`h-5 w-5 ${isProfitable ? "text-[#34B192]" : "text-red-500"}`} />
              </div>
            </div>
            <div className={`text-2xl font-semibold tabular-nums md:text-3xl ${isProfitable ? "text-[#222121]" : "text-red-500"}`}>
              {formatCurrency(report.grossProfit)}
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
              Gross Profit
            </p>
            <p className="mt-1 text-xs text-[#222121]/40">(before tax/salary)</p>
          </CardContent>
        </Card>

        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isProfitable ? "bg-[#34B192]/10" : "bg-red-500/10"}`}>
                {isProfitable ? (
                  <TrendingUp className="h-5 w-5 text-[#34B192]" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
            <div className={`text-2xl font-semibold tabular-nums md:text-3xl ${isProfitable ? "text-[#222121]" : "text-red-500"}`}>
              {formatPercent(report.profitMargin)}
            </div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#222121]/50">
              Profit Margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Volume Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-[#222121]">{report.totalDeals}</p>
            <p className="text-sm text-[#222121]/60">Total Deals</p>
          </CardContent>
        </Card>
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-[#222121]">{report.totalLeadsSold}</p>
            <p className="text-sm text-[#222121]/60">Leads Sold</p>
          </CardContent>
        </Card>
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-semibold text-[#222121]">{formatCurrency(report.avgRevenuePerDeal)}</p>
            <p className="text-sm text-[#222121]/60">Avg Revenue/Deal</p>
          </CardContent>
        </Card>
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-semibold ${report.avgProfitPerDeal >= 0 ? "text-[#34B192]" : "text-red-500"}`}>
              {formatCurrency(report.avgProfitPerDeal)}
            </p>
            <p className="text-sm text-[#222121]/60">Avg Profit/Deal</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Deal Costs */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-base text-[#222121]">Deal Costs</CardTitle>
            <CardDescription className="text-[#222121]/60">Costs from closed deals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[#222121]/60">Growth Investment Fund</span>
                  <p className="text-xs text-[#222121]/40">20% reinvested for future growth</p>
                </div>
                <span className="font-medium text-[#222121]">{formatCurrency(report.dealCosts.operatingExpenses)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#222121]/60">Lead Fulfillment (£20/lead)</span>
                <span className="font-medium text-[#222121]">{formatCurrency(report.dealCosts.leadFulfillmentCosts)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#222121]/60">Setter Commissions</span>
                <span className="font-medium text-[#222121]">{formatCurrency(report.dealCosts.setterCosts)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#222121]/60">Sales Rep Commissions</span>
                <span className="font-medium text-[#222121]">{formatCurrency(report.dealCosts.salesRepCosts)}</span>
              </div>
              <div className="pt-3 border-t border-[#222121]/10 flex justify-between items-center">
                <span className="font-medium text-[#222121]">Total Deal Costs</span>
                <span className="font-bold text-red-600">{formatCurrency(report.dealCosts.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Costs */}
        <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-base text-[#222121]">Additional Costs</CardTitle>
            <CardDescription className="text-[#222121]/60">Business expenses for the period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#222121]/60">Recurring Costs</span>
                <span className="font-medium text-[#222121]">{formatCurrency(report.additionalCosts.recurring)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#222121]/60">One-Time Costs</span>
                <span className="font-medium text-[#222121]">{formatCurrency(report.additionalCosts.oneTime)}</span>
              </div>

              {Object.keys(report.additionalCosts.byCategory).length > 0 && (
                <>
                  <div className="pt-3 border-t border-[#222121]/10">
                    <p className="text-sm font-medium text-[#222121] mb-2">By Category:</p>
                    <div className="space-y-2">
                      {Object.entries(report.additionalCosts.byCategory).map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center">
                          <Badge
                            variant="outline"
                            className="capitalize rounded-full border-[#222121]/10 bg-white text-xs text-[#222121]/60"
                          >
                            {category}
                          </Badge>
                          <span className="text-sm text-[#222121]">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="pt-3 border-t border-[#222121]/10 flex justify-between items-center">
                <span className="font-medium text-[#222121]">Total Additional Costs</span>
                <span className="font-bold text-red-600">{formatCurrency(report.additionalCosts.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P&L Summary */}
      <Card className="border border-[#222121]/[0.08] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="text-base text-[#222121]">Profit & Loss Summary</CardTitle>
          <CardDescription className="text-[#222121]/60">Complete breakdown from revenue to final profit</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Revenue Section */}
            <div className="flex justify-between items-center text-lg">
              <span className="font-medium text-[#222121]">Total Revenue (inc. VAT)</span>
              <span className="font-bold text-[#34B192]">{formatCurrency(report.totalRevenueIncVat)}</span>
            </div>

            {/* VAT Deduction */}
            <div className="flex justify-between items-center">
              <span className="text-[#222121]/60">− VAT (20%)</span>
              <span className="text-red-600">-{formatCurrency(report.vatDeducted)}</span>
            </div>

            {/* Net Revenue */}
            <div className="flex justify-between items-center pt-2 border-t border-[#222121]/10">
              <span className="font-medium text-[#222121]">Net Revenue (ex. VAT)</span>
              <span className="font-semibold text-[#222121]">{formatCurrency(report.totalRevenueNet)}</span>
            </div>

            {/* Deal Costs Breakdown */}
            <div className="pt-3 border-t border-[#222121]/10">
              <p className="text-sm font-medium text-[#222121]/60 mb-2">Deal Costs:</p>
              <div className="space-y-1 ml-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#222121]/50">Growth Investment Fund (20%)</span>
                  <span className="text-red-600">-{formatCurrency(report.dealCosts.operatingExpenses)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#222121]/50">Lead Fulfillment</span>
                  <span className="text-red-600">-{formatCurrency(report.dealCosts.leadFulfillmentCosts)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#222121]/50">Setter Commissions</span>
                  <span className="text-red-600">-{formatCurrency(report.dealCosts.setterCosts)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#222121]/50">Sales Rep Commissions</span>
                  <span className="text-red-600">-{formatCurrency(report.dealCosts.salesRepCosts)}</span>
                </div>
              </div>
            </div>

            {/* Additional Costs */}
            <div className="flex justify-between items-center">
              <span className="text-[#222121]/60">− Additional Business Costs</span>
              <span className="text-red-600">-{formatCurrency(report.additionalCosts.total)}</span>
            </div>

            {/* Gross Profit */}
            <div className="pt-3 border-t border-[#222121]/10 flex justify-between items-center text-lg">
              <span className="font-bold text-[#222121]">Gross Profit</span>
              <span className={`font-bold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(report.grossProfit)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax & Salary Section */}
      <Card className="border border-dashed border-[#222121]/20 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-[#222121]">
            <Building2 className="h-5 w-5 text-[#34B192]" />
            Tax & Salary Calculator
          </CardTitle>
          <CardDescription className="text-[#222121]/60">
            Calculate your take-home profit after tax and salaries
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Corporation Tax Toggle */}
            <div className="flex items-center justify-between rounded-2xl border border-[#222121]/10 bg-[#F7F7F7] p-4">
              <div className="space-y-1">
                <Label htmlFor="corp-tax" className="font-medium text-[#222121]">Corporation Tax (UK)</Label>
                <p className="text-sm text-[#222121]/60">
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
                <Users className="h-4 w-4 text-[#34B192]" />
                Monthly Salary Drawings
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-[#222121]/60">£</span>
                <Input
                  id="salary"
                  type="number"
                  min="0"
                  step="100"
                  value={salaryAmount || ""}
                  onChange={(e) => setSalaryAmount(parseFloat(e.target.value) || 0)}
                  placeholder="Enter salary amount"
                  className="max-w-xs rounded-full border-[#222121]/10 bg-white"
                />
              </div>
              <p className="text-xs text-[#222121]/50">
                Enter total salaries to be drawn this period
              </p>
            </div>

            {/* Final Calculation */}
            <div className="pt-4 border-t border-[#222121]/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#222121]">Gross Profit</span>
                <span className={`font-semibold ${isProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(report.grossProfit)}
                </span>
              </div>

              {includeCorpTax && report.grossProfit > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[#222121]/60">− Corporation Tax (20%)</span>
                  <span className="text-red-600">-{formatCurrency(corpTaxAmount)}</span>
                </div>
              )}

              {includeCorpTax && (
                <div className="flex justify-between items-center">
                  <span className="font-medium text-[#222121]">Profit After Tax</span>
                  <span className={`font-semibold ${profitAfterTax >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(profitAfterTax)}
                  </span>
                </div>
              )}

              {salaryAmount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-[#222121]/60">− Salary Drawings</span>
                  <span className="text-red-600">-{formatCurrency(salaryAmount)}</span>
                </div>
              )}

              <div className="pt-3 border-t border-[#222121]/10 flex justify-between items-center text-lg">
                <span className="font-bold text-[#222121]">Final Retained Profit</span>
                <span className={`font-bold text-xl ${isFinalProfitable ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(finalProfit)}
                </span>
              </div>

              {!isFinalProfitable && (
                <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">
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
