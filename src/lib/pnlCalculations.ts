// P&L Calculation Utilities

export interface DealInput {
  revenueIncVat: number;
  leadsSold: number;
  leadSalePrice: number;
  setterCommissionPercent: number;
  salesRepCommissionPercent: number;
}

export interface DealCalculations {
  revenueNet: number;
  vatDeducted: number;
  operatingExpense: number;
  setterCost: number;
  salesRepCost: number;
  leadFulfillmentCost: number;
  totalCosts: number;
  grossProfit: number;
  profitMargin: number;
}

/**
 * Calculate all derived financial fields for a deal
 */
export function calculateDealFinancials(input: DealInput): DealCalculations {
  const { revenueIncVat, leadsSold, setterCommissionPercent, salesRepCommissionPercent } = input;

  // Remove 20% VAT
  const revenueNet = revenueIncVat / 1.20;
  const vatDeducted = revenueIncVat - revenueNet;

  // 20% of net revenue for operating expenses
  const operatingExpense = revenueNet * 0.20;

  // Commission costs (percentage of net revenue)
  const setterCost = revenueNet * (setterCommissionPercent / 100);
  const salesRepCost = revenueNet * (salesRepCommissionPercent / 100);

  // £20 per lead for fulfillment
  const leadFulfillmentCost = leadsSold * 20;

  // Total costs from this deal
  const totalCosts = operatingExpense + setterCost + salesRepCost + leadFulfillmentCost;

  // Profit
  const grossProfit = revenueNet - totalCosts;
  const profitMargin = revenueNet > 0 ? (grossProfit / revenueNet) * 100 : 0;

  return {
    revenueNet: roundToTwoDecimals(revenueNet),
    vatDeducted: roundToTwoDecimals(vatDeducted),
    operatingExpense: roundToTwoDecimals(operatingExpense),
    setterCost: roundToTwoDecimals(setterCost),
    salesRepCost: roundToTwoDecimals(salesRepCost),
    leadFulfillmentCost: roundToTwoDecimals(leadFulfillmentCost),
    totalCosts: roundToTwoDecimals(totalCosts),
    grossProfit: roundToTwoDecimals(grossProfit),
    profitMargin: roundToTwoDecimals(profitMargin),
  };
}

/**
 * Round a number to 2 decimal places
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Format a number as GBP currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a number as percentage
 */
export function formatPercent(value: number): string {
  return `${roundToTwoDecimals(value)}%`;
}

/**
 * Get date range for a period type
 */
export function getPeriodDateRange(period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const now = new Date();
  let startDate: Date;
  const endDate = now;
  let label: string;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      label = 'Today';
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.getFullYear(), now.getMonth(), diff);
      label = 'This Week';
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      label = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      break;
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      label = `Q${quarter + 1} ${now.getFullYear()}`;
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1);
      label = now.getFullYear().toString();
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      label = 'This Month';
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    label,
  };
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get color class based on profit margin
 */
export function getProfitMarginColor(margin: number): string {
  if (margin >= 30) return 'text-emerald-600';
  if (margin >= 20) return 'text-green-600';
  if (margin >= 10) return 'text-yellow-600';
  if (margin >= 0) return 'text-orange-600';
  return 'text-red-600';
}

/**
 * Get background color class for stat cards
 */
export function getStatCardGradient(type: 'revenue' | 'costs' | 'profit' | 'margin'): string {
  switch (type) {
    case 'revenue':
      return 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5';
    case 'costs':
      return 'bg-gradient-to-br from-red-500/20 to-red-500/5';
    case 'profit':
      return 'bg-gradient-to-br from-blue-500/20 to-blue-500/5';
    case 'margin':
      return 'bg-gradient-to-br from-purple-500/20 to-purple-500/5';
    default:
      return 'bg-gradient-to-br from-primary/20 to-primary/5';
  }
}

/**
 * Category icons mapping
 */
export const categoryIcons: Record<string, string> = {
  software: 'Monitor',
  data: 'Database',
  marketing: 'Megaphone',
  personnel: 'Users',
  office: 'Building2',
  other: 'Package',
};

/**
 * Category colors mapping
 */
export const categoryColors: Record<string, string> = {
  software: 'blue',
  data: 'purple',
  marketing: 'green',
  personnel: 'orange',
  office: 'slate',
  other: 'gray',
};
