const DEFAULT_OVERDUE_HOURS = 24;
const MAX_OVERDUE_HOURS = 168;

function normalizeOverdueHours(preferences) {
  const value = Number(preferences?.overdueAfterHours);
  return Number.isFinite(value) && value >= 1 && value <= MAX_OVERDUE_HOURS
    ? value
    : DEFAULT_OVERDUE_HOURS;
}

function deriveCheckInState(latestCheckIn, overdueAfterHours, now = new Date()) {
  if (!latestCheckIn) return 'not_started';
  if (latestCheckIn.status === 'missed') return 'overdue';
  const checkedInAt = new Date(latestCheckIn.checked_in_at).getTime();
  if (!Number.isFinite(checkedInAt)) return 'overdue';
  return now.getTime() - checkedInAt > overdueAfterHours * 60 * 60 * 1000
    ? 'overdue'
    : 'checked_in';
}

function isActiveSosStatus(status) {
  return status === 'triggered' || status === 'acknowledged';
}

module.exports = { DEFAULT_OVERDUE_HOURS, deriveCheckInState, isActiveSosStatus, normalizeOverdueHours };