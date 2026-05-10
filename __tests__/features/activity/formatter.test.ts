import { formatRelativeTime } from '@/features/activity/utils';

function isoSecondsAgo(n: number) {
  return new Date(Date.now() - n * 1000).toISOString();
}

describe('formatRelativeTime', () => {
  it('returns "Just now" for < 60 seconds', () => {
    expect(formatRelativeTime(isoSecondsAgo(30))).toBe('Just now');
  });

  it('returns minutes for < 60 min', () => {
    expect(formatRelativeTime(isoSecondsAgo(5 * 60))).toBe('5m ago');
  });

  it('returns hours for < 24 h', () => {
    expect(formatRelativeTime(isoSecondsAgo(3 * 3600))).toBe('3h ago');
  });

  it('returns "Yesterday" for yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(10, 0, 0, 0);
    expect(formatRelativeTime(yesterday.toISOString())).toBe('Yesterday');
  });

  it('includes year when date is in a different year', () => {
    const old = new Date('2022-03-15T10:00:00Z');
    const result = formatRelativeTime(old.toISOString());
    expect(result).toMatch(/2022/);
  });

  it('omits year when date is in the current year', () => {
    const thisYear = new Date();
    thisYear.setMonth(0, 2); // Jan 2 of this year
    thisYear.setHours(10, 0, 0, 0);
    const result = formatRelativeTime(thisYear.toISOString());
    expect(result).not.toMatch(String(thisYear.getFullYear()));
  });
});
