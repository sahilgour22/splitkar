/**
 * Unit tests for the activity badge count logic.
 *
 * These tests exercise the date-window and last-seen calculations
 * that determine how many "unseen" activities exist.
 *
 * The Supabase client is mocked; no network calls are made.
 */

// ── Badge count calculation (pure logic) ─────────────────────────────────────

function computeBadge(activitiesCreatedAt: string[], lastSeenAt: string | null): number {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const afterTime = lastSeenAt ? new Date(lastSeenAt) : sevenDaysAgo;

  return activitiesCreatedAt.filter((ts) => {
    const d = new Date(ts);
    return d > afterTime && d >= sevenDaysAgo;
  }).length;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe('activity badge count logic', () => {
  it('counts all recent activities when last_seen is null', () => {
    const activities = [daysAgo(1), daysAgo(3), daysAgo(6), daysAgo(8)];
    // daysAgo(8) is outside 7-day window, rest count
    expect(computeBadge(activities, null)).toBe(3);
  });

  it('counts only activities after last_seen', () => {
    const activities = [daysAgo(1), daysAgo(2), daysAgo(4), daysAgo(6)];
    const lastSeen = daysAgo(3);
    // Only daysAgo(1) and daysAgo(2) are after lastSeen
    expect(computeBadge(activities, lastSeen)).toBe(2);
  });

  it('returns 0 when all activities are before last_seen', () => {
    const activities = [daysAgo(5), daysAgo(6)];
    const lastSeen = daysAgo(4);
    expect(computeBadge(activities, lastSeen)).toBe(0);
  });

  it('returns 0 when there are no activities in the window', () => {
    expect(computeBadge([], null)).toBe(0);
  });

  it('excludes activities older than 7 days even when last_seen is older', () => {
    const activities = [daysAgo(8), daysAgo(10)];
    const lastSeen = daysAgo(15);
    // Both are older than 7 days
    expect(computeBadge(activities, lastSeen)).toBe(0);
  });
});
