import {
  calculateNextOccurrence,
  getDueOccurrences,
  isLeapYear,
  getDaysInMonthUTC,
} from '@expense-tracker/shared';

describe('Recurrence Date Engine & Edge Cases', () => {
  describe('Utility Helpers: Leap Year & Days in Month', () => {
    it('should accurately identify leap years', () => {
      expect(isLeapYear(2020)).toBe(true);
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2000)).toBe(true);
      expect(isLeapYear(2023)).toBe(false);
      expect(isLeapYear(2025)).toBe(false);
      expect(isLeapYear(1900)).toBe(false); // Century non-leap year
    });

    it('should return correct number of days for each UTC month', () => {
      expect(getDaysInMonthUTC(2024, 0)).toBe(31); // Jan
      expect(getDaysInMonthUTC(2024, 1)).toBe(29); // Feb in leap year
      expect(getDaysInMonthUTC(2023, 1)).toBe(28); // Feb in non-leap year
      expect(getDaysInMonthUTC(2024, 3)).toBe(30); // April
    });
  });

  describe('Monthly Recurrence Edge Cases (31st Anchor Day Clamping)', () => {
    it('should clamp Jan 31 to Feb 28 in a non-leap year (2023)', () => {
      const anchor = new Date(Date.UTC(2023, 0, 31)); // 2023-01-31
      const next = calculateNextOccurrence(anchor, anchor, 'MONTHLY');

      expect(next.getUTCFullYear()).toBe(2023);
      expect(next.getUTCMonth()).toBe(1); // February
      expect(next.getUTCDate()).toBe(28); // Clamped to 28
    });

    it('should clamp Jan 31 to Feb 29 in a leap year (2024)', () => {
      const anchor = new Date(Date.UTC(2024, 0, 31)); // 2024-01-31
      const next = calculateNextOccurrence(anchor, anchor, 'MONTHLY');

      expect(next.getUTCFullYear()).toBe(2024);
      expect(next.getUTCMonth()).toBe(1); // February
      expect(next.getUTCDate()).toBe(29); // Clamped to 29
    });

    it('should restore to the 31st in March after February without drifting (Zero Day Drift)', () => {
      const anchor = new Date(Date.UTC(2023, 0, 31)); // 2023-01-31
      const febDate = calculateNextOccurrence(anchor, anchor, 'MONTHLY'); // 2023-02-28
      const marDate = calculateNextOccurrence(febDate, anchor, 'MONTHLY'); // Should be 2023-03-31

      expect(marDate.getUTCFullYear()).toBe(2023);
      expect(marDate.getUTCMonth()).toBe(2); // March
      expect(marDate.getUTCDate()).toBe(31); // Restored to 31!
    });

    it('should correctly sequence a full 12-month cycle starting Jan 31st', () => {
      const anchor = new Date(Date.UTC(2023, 0, 31));
      let current = new Date(anchor.getTime());
      const dates: string[] = [];

      for (let i = 0; i < 12; i++) {
        current = calculateNextOccurrence(current, anchor, 'MONTHLY');
        const formatted = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}-${String(current.getUTCDate()).padStart(2, '0')}`;
        dates.push(formatted);
      }

      expect(dates).toEqual([
        '2023-02-28', // Feb (28 days)
        '2023-03-31', // Mar (31 days)
        '2023-04-30', // Apr (30 days)
        '2023-05-31', // May (31 days)
        '2023-06-30', // Jun (30 days)
        '2023-07-31', // Jul (31 days)
        '2023-08-31', // Aug (31 days)
        '2023-09-30', // Sep (30 days)
        '2023-10-31', // Oct (31 days)
        '2023-11-30', // Nov (30 days)
        '2023-12-31', // Dec (31 days)
        '2024-01-31', // Jan (31 days)
      ]);
    });

    it('should clamp starting on the 30th into February and restore on March 30th', () => {
      const anchor = new Date(Date.UTC(2023, 0, 30)); // 2023-01-30
      const febDate = calculateNextOccurrence(anchor, anchor, 'MONTHLY'); // 2023-02-28
      const marDate = calculateNextOccurrence(febDate, anchor, 'MONTHLY'); // 2023-03-30
      const aprDate = calculateNextOccurrence(marDate, anchor, 'MONTHLY'); // 2023-04-30

      expect(febDate.getUTCDate()).toBe(28);
      expect(marDate.getUTCDate()).toBe(30);
      expect(aprDate.getUTCDate()).toBe(30);
    });
  });

  describe('Yearly Recurrence Edge Cases (Leap Day: Feb 29)', () => {
    it('should clamp Feb 29 to Feb 28 on non-leap years and preserve Feb 29 on leap years', () => {
      const anchor = new Date(Date.UTC(2024, 1, 29)); // 2024-02-29 (Leap year)

      const y2025 = calculateNextOccurrence(anchor, anchor, 'YEARLY');
      expect(y2025.getUTCFullYear()).toBe(2025);
      expect(y2025.getUTCMonth()).toBe(1);
      expect(y2025.getUTCDate()).toBe(28); // 2025 is non-leap

      const y2026 = calculateNextOccurrence(y2025, anchor, 'YEARLY');
      expect(y2026.getUTCFullYear()).toBe(2026);
      expect(y2026.getUTCDate()).toBe(28); // 2026 is non-leap

      const y2027 = calculateNextOccurrence(y2026, anchor, 'YEARLY');
      expect(y2027.getUTCDate()).toBe(28); // 2027 is non-leap

      const y2028 = calculateNextOccurrence(y2027, anchor, 'YEARLY');
      expect(y2028.getUTCFullYear()).toBe(2028);
      expect(y2028.getUTCDate()).toBe(29); // 2028 is leap year, restored to 29!
    });
  });

  describe('Weekly Recurrence Across Month Boundaries', () => {
    it('should step by exactly 7 days across month and year transitions', () => {
      const anchor = new Date(Date.UTC(2026, 0, 28)); // 2026-01-28 (Wednesday)
      const next1 = calculateNextOccurrence(anchor, anchor, 'WEEKLY');
      const next2 = calculateNextOccurrence(next1, anchor, 'WEEKLY');

      expect(next1.toISOString().substring(0, 10)).toBe('2026-02-04');
      expect(next2.toISOString().substring(0, 10)).toBe('2026-02-11');
    });
  });

  describe('Due Occurrences Generation & End Date Bounds', () => {
    it('should generate all overdue occurrences up to cutoff date and respect endDate', () => {
      const anchor = new Date(Date.UTC(2026, 0, 1)); // 2026-01-01
      const nextDue = new Date(Date.UTC(2026, 1, 1)); // 2026-02-01
      const cutoff = new Date(Date.UTC(2026, 4, 15)); // 2026-05-15
      const endDate = new Date(Date.UTC(2026, 3, 1)); // 2026-04-01

      const dueDates = getDueOccurrences(nextDue, anchor, 'MONTHLY', 1, cutoff, endDate);
      const formatted = dueDates.map((d) => d.toISOString().substring(0, 10));

      expect(formatted).toEqual([
        '2026-02-01',
        '2026-03-01',
        '2026-04-01',
      ]);
      // 2026-05-01 omitted because it exceeds endDate
    });
  });
});
