/**
 * Calculate the number of work days (Monday-Friday) between two dates
 */
export function calculateWorkDays(startDate: Date, endDate: Date): number {
  let workDays = 0;
  const currentDate = new Date(startDate);
  
  // Set to start of day for accurate comparison
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday, so 1-5 are weekdays
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      workDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workDays;
}

/**
 * Calculate leads per day needed to meet target
 * Returns null if dates are invalid or work days is 0
 */
export function calculateLeadsPerDay(
  leadsPurchased: number,
  onboardingDate: Date,
  targetDeliveryDate: Date
): number | null {
  if (leadsPurchased <= 0) return null;
  if (onboardingDate >= targetDeliveryDate) return null;
  
  const workDays = calculateWorkDays(onboardingDate, targetDeliveryDate);
  if (workDays === 0) return null;
  
  return Number((leadsPurchased / workDays).toFixed(2));
}

/**
 * Calculate days remaining until target delivery date
 */
export function getDaysRemaining(targetDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

/**
 * Calculate completion percentage
 */
export function getCompletionPercentage(leadsFulfilled: number, leadsPurchased: number): number {
  if (leadsPurchased === 0) return 0;
  return Math.round((leadsFulfilled / leadsPurchased) * 100);
}

/**
 * Get priority score for sorting (lower = higher priority)
 * Priority: least fulfilled + shortest time remaining
 */
export function getPriorityScore(
  leadsFulfilled: number,
  leadsPurchased: number,
  targetDate: Date | null
): number {
  const completionRate = leadsPurchased > 0 ? leadsFulfilled / leadsPurchased : 0;
  const daysRemaining = targetDate ? getDaysRemaining(targetDate) : 999;
  
  // Lower completion rate = higher priority (multiply by large number)
  // Fewer days remaining = higher priority
  // Lower score = higher priority
  return (1 - completionRate) * 1000 + daysRemaining;
}

