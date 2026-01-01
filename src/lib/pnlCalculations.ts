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
 * Get date range for a period type with optional offset
 * @param period - The period type
 * @param offset - Number of periods to go back (0 = current, 1 = previous, etc.)
 */
export function getPeriodDateRange(
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  offset: number = 0
): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;
  let label: string;

  switch (period) {
    case 'daily': {
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
      startDate = targetDate;
      endDate = targetDate;
      label = offset === 0 ? 'Today' : targetDate.toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
      });
      break;
    }
    case 'weekly': {
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const currentWeekStart = new Date(now.getFullYear(), now.getMonth(), diff);
      startDate = new Date(currentWeekStart);
      startDate.setDate(startDate.getDate() - (offset * 7));
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      if (offset === 0) {
        label = 'This Week';
      } else {
        const weekStart = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
        const weekEnd = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        label = `${weekStart} - ${weekEnd}`;
      }
      break;
    }
    case 'monthly': {
      const targetMonth = now.getMonth() - offset;
      const targetYear = now.getFullYear() + Math.floor(targetMonth / 12);
      const adjustedMonth = ((targetMonth % 12) + 12) % 12;
      startDate = new Date(targetYear, adjustedMonth, 1);
      endDate = new Date(targetYear, adjustedMonth + 1, 0); // Last day of month
      label = startDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      break;
    }
    case 'quarterly': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const targetQuarterTotal = currentQuarter - offset;
      const targetYear = now.getFullYear() + Math.floor(targetQuarterTotal / 4);
      const targetQuarter = ((targetQuarterTotal % 4) + 4) % 4;
      startDate = new Date(targetYear, targetQuarter * 3, 1);
      endDate = new Date(targetYear, (targetQuarter + 1) * 3, 0);
      label = `Q${targetQuarter + 1} ${targetYear}`;
      break;
    }
    case 'yearly': {
      const targetYear = now.getFullYear() - offset;
      startDate = new Date(targetYear, 0, 1);
      endDate = new Date(targetYear, 11, 31);
      label = targetYear.toString();
      break;
    }
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = now;
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
