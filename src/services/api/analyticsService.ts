import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { StudyLog } from '@/types/database.types';

export interface DailyActivityMap {
  [dateStr: string]: number; // "2026-10-15": 24
}

export interface UserStreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalReviews: number;
  activeDaysCount: number;
}

/**
 * Lấy dữ liệu Heatmap ôn tập từ study_logs (lọc 180 ngày gần nhất)
 */
export async function fetchStudyHeatmapData(userId?: string): Promise<DailyActivityMap> {
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'local-user';
  const activityMap: DailyActivityMap = {};

  if (isSupabaseConfigured && currentUserId !== 'local-user') {
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 180);
      const sinceDateStr = sinceDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('study_logs')
        .select('reviewed_date')
        .eq('user_id', currentUserId)
        .gte('reviewed_date', sinceDateStr);

      if (error) throw error;

      if (data) {
        data.forEach((log) => {
          const d = log.reviewed_date;
          activityMap[d] = (activityMap[d] || 0) + 1;
        });
        return activityMap;
      }
    } catch (err) {
      console.warn('[analyticsService] Supabase fetchStudyHeatmapData fallback:', err);
    }
  }

  // Fallback Local Storage
  try {
    const raw = localStorage.getItem('vocab_study_logs');
    if (raw) {
      const logs: StudyLog[] = JSON.parse(raw);
      logs
        .filter((l) => l.user_id === currentUserId)
        .forEach((l) => {
          const d = l.reviewed_date;
          activityMap[d] = (activityMap[d] || 0) + 1;
        });
    }
  } catch {
    // ignore
  }

  return activityMap;
}

export function getLocalDateStr(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getUtcDateStr(d: Date = new Date()): string {
  return d.toISOString().split('T')[0];
}

/**
 * Tính toán Chuỗi ngày học liên tục (Streak) dựa trên lịch sử study_logs
 */
export async function calculateStreak(userId?: string): Promise<UserStreakInfo> {
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'local-user';
  const activityMap = await fetchStudyHeatmapData(currentUserId);

  const activeDates = Object.keys(activityMap).sort(); // Sắp xếp tăng dần theo ngày
  const totalReviews = Object.values(activityMap).reduce((a, b) => a + b, 0);
  const activeDaysCount = activeDates.length;

  if (activeDates.length === 0) {
    const emptyResult = {
      currentStreak: 0,
      longestStreak: 0,
      totalReviews: 0,
      activeDaysCount: 0,
    };
    try {
      window.dispatchEvent(
        new CustomEvent('vocab_streak_updated', { detail: emptyResult })
      );
    } catch {
      // ignore
    }
    return emptyResult;
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  // Tính longest streak
  for (const dateStr of activeDates) {
    const currentDate = new Date(dateStr);
    if (prevDate) {
      const diffTime = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 0) {
        continue;
      } else if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = currentDate;
  }

  // Kiểm tra ngày có hoạt động (hỗ trợ cả UTC và Local date)
  const hasActivityOnDay = (d: Date) => {
    const local = getLocalDateStr(d);
    const utc = getUtcDateStr(d);
    return Boolean(activityMap[local] || activityMap[utc]);
  };

  // Tính current streak (bắt đầu từ hôm nay hoặc hôm qua lùi dần)
  const isStudiedToday = hasActivityOnDay(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isStudiedYesterday = hasActivityOnDay(yesterday);

  if (isStudiedToday || isStudiedYesterday) {
    let checkDate = new Date(isStudiedToday ? Date.now() : yesterday.getTime());
    while (true) {
      if (hasActivityOnDay(checkDate)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0;
  }

  const finalLongest = Math.max(longestStreak, currentStreak);

  // Tự động cập nhật vào profile nếu dùng Supabase
  if (isSupabaseConfigured && currentUserId !== 'local-user') {
    try {
      await supabase
        .from('profiles')
        .update({
          current_streak: currentStreak,
          longest_streak: finalLongest,
          last_active_at: new Date().toISOString(),
        })
        .eq('id', currentUserId);
    } catch {
      // ignore
    }
  }

  // Luôn lưu cache local và phát event cập nhật thời gian thực
  try {
    const rawLocalProfile = localStorage.getItem('vocab_local_profile');
    if (rawLocalProfile) {
      const parsed = JSON.parse(rawLocalProfile);
      parsed.current_streak = currentStreak;
      parsed.longest_streak = Math.max(parsed.longest_streak || 0, finalLongest);
      parsed.last_active_at = new Date().toISOString();
      localStorage.setItem('vocab_local_profile', JSON.stringify(parsed));
    }
    localStorage.setItem(
      'vocab_streak_info',
      JSON.stringify({ currentStreak, longestStreak: finalLongest })
    );

    window.dispatchEvent(
      new CustomEvent('vocab_streak_updated', {
        detail: { currentStreak, longestStreak: finalLongest },
      })
    );
  } catch {
    // ignore
  }

  return {
    currentStreak,
    longestStreak: finalLongest,
    totalReviews,
    activeDaysCount,
  };
}
