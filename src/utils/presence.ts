/**
 * Dynamic Real-Time Presence Utility
 * Calculates real-time online/offline state and formats precise Arabic relative activity time
 */

export interface PresenceResult {
  isOnline: boolean;
  label: string;
  diffMinutes: number;
}

/**
 * Checks if the timestamp is within 2 minutes of now (120,000 ms).
 * If < 2 minutes: isOnline = true, label = 'متصل الآن'.
 * If >= 2 minutes: isOnline = false, label = formatted Arabic relative string:
 *   - 'آخر ظهور منذ X دقيقة'
 *   - 'آخر ظهور اليوم الساعة 04:30 م'
 *   - 'آخر ظهور أمس الساعة 10:15 ص'
 *   - 'آخر ظهور منذ X أيام'
 *   - 'آخر ظهور بتاريخ DD شهر'
 */
export function formatPresence(timestamp?: number | string | null): PresenceResult {
  if (!timestamp) {
    return {
      isOnline: false,
      label: 'غير متصل',
      diffMinutes: 999999,
    };
  }

  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  if (isNaN(time) || time <= 0) {
    return {
      isOnline: false,
      label: 'غير متصل',
      diffMinutes: 999999,
    };
  }

  const now = Date.now();
  const diffMs = Math.max(0, now - time);
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffDays = Math.floor(diffMs / (86400 * 1000));

  // Strict Threshold: strictly 2 minutes (120 seconds = 120,000 ms)
  if (diffMs < 2 * 60 * 1000) {
    return {
      isOnline: true,
      label: 'متصل الآن',
      diffMinutes,
    };
  }

  const date = new Date(time);
  const nowDate = new Date(now);

  const isToday =
    date.getDate() === nowDate.getDate() &&
    date.getMonth() === nowDate.getMonth() &&
    date.getFullYear() === nowDate.getFullYear();

  const yesterdayDate = new Date(now - 86400 * 1000);
  const isYesterday =
    date.getDate() === yesterdayDate.getDate() &&
    date.getMonth() === yesterdayDate.getMonth() &&
    date.getFullYear() === yesterdayDate.getFullYear();

  const timeString = date.toLocaleTimeString('ar-IQ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffMinutes < 60) {
    const mins = Math.max(2, diffMinutes);
    return {
      isOnline: false,
      label: `آخر ظهور منذ ${mins} دقيقة`,
      diffMinutes: mins,
    };
  }

  if (isToday) {
    return {
      isOnline: false,
      label: `آخر ظهور اليوم الساعة ${timeString}`,
      diffMinutes,
    };
  }

  if (isYesterday) {
    return {
      isOnline: false,
      label: `آخر ظهور أمس الساعة ${timeString}`,
      diffMinutes,
    };
  }

  if (diffDays < 7) {
    return {
      isOnline: false,
      label: `آخر ظهور منذ ${diffDays} أيام`,
      diffMinutes,
    };
  }

  const dateString = date.toLocaleDateString('ar-IQ', {
    month: 'short',
    day: 'numeric',
  });

  return {
    isOnline: false,
    label: `آخر ظهور بتاريخ ${dateString}`,
    diffMinutes,
  };
}

let lastReportTime = 0;

/**
 * Report user activity to backend presence service
 * Automatically invoked on user actions (page navigation, opening chat, sending messages)
 */
export async function reportUserActivity(userId?: string, phone?: string): Promise<void> {
  if (!userId && !phone) return;
  const now = Date.now();
  // Throttle to at most once every 6 seconds per client, unless urgent
  if (now - lastReportTime < 6000) return;
  lastReportTime = now;

  try {
    await fetch('/api/user/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, phone, timestamp: now }),
    });
  } catch {
    // Non-blocking fail-safe
  }
}

/**
 * Fetch presence timestamps for a list of user IDs or merchant IDs
 */
export async function fetchUsersPresence(
  userIds: string[]
): Promise<Record<string, { lastActiveTimestamp: number; isOnline: boolean }>> {
  if (!userIds || userIds.length === 0) return {};
  try {
    const res = await fetch(`/api/user/presence?userIds=${encodeURIComponent(userIds.join(','))}`);
    if (res.ok) {
      const data = await res.json();
      return data.presence || {};
    }
  } catch {
    // Non-blocking fail-safe
  }
  return {};
}
