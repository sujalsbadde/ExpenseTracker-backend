import { RecurrenceFrequency } from '../types/recurrence';

/**
 * Returns the number of days in a given UTC month (0-indexed).
 */
export const getDaysInMonthUTC = (year: number, month: number): number => {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
};

/**
 * Checks if a given year is a leap year.
 */
export const isLeapYear = (year: number): boolean => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
};

/**
 * Calculates the next occurrence date for a recurring rule while strictly
 * preserving the original anchor day-of-month and handling month-end / leap-year edge cases.
 *
 * Edge cases handled:
 * - 31st starting date: Jan 31 -> Feb 28 (or 29) -> Mar 31 -> Apr 30 -> May 31 (Zero Day Drift).
 * - Leap year Feb 29 yearly: Feb 29 2024 -> Feb 28 2025 -> Feb 28 2026 -> Feb 29 2028.
 *
 * @param fromDate The most recent occurrence date
 * @param anchorStartDate The original start date of the recurring series (defines the target anchor day)
 * @param frequency 'WEEKLY' | 'MONTHLY' | 'YEARLY'
 * @param interval The step interval (default 1)
 */
export const calculateNextOccurrence = (
  fromDate: Date,
  anchorStartDate: Date,
  frequency: RecurrenceFrequency,
  interval = 1
): Date => {
  const safeInterval = Math.max(1, interval);

  if (frequency === 'WEEKLY') {
    const next = new Date(fromDate.getTime());
    next.setUTCDate(next.getUTCDate() + 7 * safeInterval);
    return next;
  }

  if (frequency === 'MONTHLY') {
    const currentYear = fromDate.getUTCFullYear();
    const currentMonth = fromDate.getUTCMonth();
    const anchorDay = anchorStartDate.getUTCDate(); // e.g. 31

    // Calculate total months and target year/month
    const totalMonths = currentYear * 12 + currentMonth + safeInterval;
    const targetYear = Math.floor(totalMonths / 12);
    const targetMonth = totalMonths % 12;

    // Clamp to maximum days in target month (e.g. 28 for Feb in non-leap year, 30 for April)
    const maxDays = getDaysInMonthUTC(targetYear, targetMonth);
    const clampedDay = Math.min(anchorDay, maxDays);

    return new Date(
      Date.UTC(
        targetYear,
        targetMonth,
        clampedDay,
        anchorStartDate.getUTCHours(),
        anchorStartDate.getUTCMinutes(),
        anchorStartDate.getUTCSeconds(),
        anchorStartDate.getUTCMilliseconds()
      )
    );
  }

  if (frequency === 'YEARLY') {
    const targetYear = fromDate.getUTCFullYear() + safeInterval;
    const targetMonth = anchorStartDate.getUTCMonth();
    const anchorDay = anchorStartDate.getUTCDate();

    const maxDays = getDaysInMonthUTC(targetYear, targetMonth);
    const clampedDay = Math.min(anchorDay, maxDays);

    return new Date(
      Date.UTC(
        targetYear,
        targetMonth,
        clampedDay,
        anchorStartDate.getUTCHours(),
        anchorStartDate.getUTCMinutes(),
        anchorStartDate.getUTCSeconds(),
        anchorStartDate.getUTCMilliseconds()
      )
    );
  }

  throw new Error(`Unsupported recurrence frequency: ${frequency}`);
};

/**
 * Generates all due occurrence dates between a start/nextDueDate and a cutoff date.
 */
export const getDueOccurrences = (
  nextDueDate: Date,
  anchorStartDate: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  cutoffDate: Date,
  endDate?: Date | null
): Date[] => {
  const occurrences: Date[] = [];
  let current = new Date(nextDueDate.getTime());

  while (current <= cutoffDate) {
    if (endDate && current > endDate) {
      break;
    }
    occurrences.push(new Date(current.getTime()));
    current = calculateNextOccurrence(current, anchorStartDate, frequency, interval);
  }

  return occurrences;
};
