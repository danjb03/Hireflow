// Reporting utility functions

export type PerformanceStatus = 'ahead' | 'on_track' | 'behind' | 'critical' | 'no_report';

export interface TargetComparison {
  actual: number;
  target: number;
  percent: number;
  status: PerformanceStatus;
}

export interface RepTargets {
  dailyCalls: number;
  dailyHours: number;
  dailyBookings: number;
  dailyPipeline: number;
}

/**
 * Get performance status based on percentage of target achieved
 */
export function getPerformanceStatus(actual: number, target: number): PerformanceStatus {
  if (target === 0) return 'on_track';
  const percentage = (actual / target) * 100;
  if (percentage >= 100) return 'ahead';
  if (percentage >= 80) return 'on_track';
  if (percentage >= 50) return 'behind';
  return 'critical';
}

/**
 * Get status color for UI display
 */
export function getStatusColor(status: PerformanceStatus): string {
  switch (status) {
    case 'ahead':
      return 'text-emerald-600';
    case 'on_track':
      return 'text-green-600';
    case 'behind':
      return 'text-yellow-600';
    case 'critical':
      return 'text-red-600';
    case 'no_report':
      return 'text-slate-400';
    default:
      return 'text-slate-600';
  }
}

/**
 * Get status background color for badges
 */
export function getStatusBgColor(status: PerformanceStatus): string {
  switch (status) {
    case 'ahead':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'on_track':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'behind':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'no_report':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: PerformanceStatus): string {
  switch (status) {
    case 'ahead':
      return 'Ahead';
    case 'on_track':
      return 'On Track';
    case 'behind':
      return 'Behind';
    case 'critical':
      return 'Critical';
    case 'no_report':
      return 'No Report';
    default:
      return 'Unknown';
  }
}

/**
 * Format minutes as hours:minutes (e.g., "5h 30m")
 */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format minutes as decimal hours (e.g., 5.5)
 */
export function formatHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

/**
 * Format currency value
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format date for input field (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Calculate target comparison with status
 */
export function calculateTargetComparison(
  actual: number,
  target: number
): TargetComparison {
  const percent = target > 0 ? Math.round((actual / target) * 100) : 0;
  const status = getPerformanceStatus(actual, target);
  return { actual, target, percent, status };
}

/**
 * Convert hours and minutes to total minutes
 */
export function hoursMinutesToMinutes(hours: number, minutes: number): number {
  return (hours * 60) + minutes;
}

/**
 * Convert total minutes to hours and minutes
 */
export function minutesToHoursMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
}

/**
 * Get the progress bar width percentage (capped at 100%)
 */
export function getProgressWidth(percent: number): number {
  return Math.min(percent, 100);
}

/**
 * Get the progress bar color based on percentage
 */
export function getProgressColor(percent: number): string {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 80) return 'bg-green-500';
  if (percent >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}
