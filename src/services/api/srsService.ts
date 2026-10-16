import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { calculateNextSRS, ReviewRating, CardProgressInput } from '@/services/srs/sm2';
import { Card, UserCardProgress, StudyLog } from '@/types/database.types';

const PROGRESS_STORAGE_KEY = 'vocab_user_card_progress';
const STUDY_LOGS_STORAGE_KEY = 'vocab_study_logs';

export interface DueCardItem {
  card: Card;
  progress?: UserCardProgress;
}

export interface MemoryStageStats {
  box1: number;
  box2: number;
  box3: number;
  box4: number;
  box5: number;
  totalCards: number;
  totalDue: number;
}

// Local storage helper
function getLocalProgress(): UserCardProgress[] {
  try {
    const raw = localStorage.getItem(PROGRESS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProgress(list: UserCardProgress[]) {
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(list));
}

function getLocalLogs(): StudyLog[] {
  try {
    const raw = localStorage.getItem(STUDY_LOGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalLogs(list: StudyLog[]) {
  localStorage.setItem(STUDY_LOGS_STORAGE_KEY, JSON.stringify(list));
}

/**
 * Lấy danh sách thẻ đến hạn ôn tập hôm nay (next_review_at <= NOW())
 */
export async function fetchDueCards(userId?: string): Promise<DueCardItem[]> {
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'local-user';

  if (isSupabaseConfigured && currentUserId !== 'local-user') {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_card_progress')
        .select(`
          *,
          cards (*)
        `)
        .eq('user_id', currentUserId)
        .lte('next_review_at', now)
        .order('next_review_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        return data
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((item: any) => item.cards)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => ({
            card: item.cards as Card,
            progress: item as UserCardProgress,
          }));
      }
    } catch (err) {
      console.warn('[srsService] Supabase fetchDueCards failed, fallback to local:', err);
    }
  }

  // Fallback Local Storage
  const allProgress = getLocalProgress().filter((p) => p.user_id === currentUserId);
  const now = new Date();
  const dueProgress = allProgress.filter((p) => new Date(p.next_review_at) <= now);

  // Lấy cards từ local storage của study sets
  const rawCards = localStorage.getItem('vocab_cards');
  const allCards: Card[] = rawCards ? JSON.parse(rawCards) : [];

  const result: DueCardItem[] = [];
  for (const prog of dueProgress) {
    const matchedCard = allCards.find((c) => c.id === prog.card_id);
    if (matchedCard) {
      result.push({
        card: matchedCard,
        progress: prog,
      });
    }
  }

  return result;
}

/**
 * Lấy danh sách tất cả thẻ có trong các bộ thẻ của user nhưng chưa từng học (chưa có trong user_card_progress)
 */
export async function fetchNewUnreviewedCards(userId?: string, limit = 20): Promise<Card[]> {
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'local-user';

  if (isSupabaseConfigured && currentUserId !== 'local-user') {
    try {
      // 1. Lấy tất cả card_id đã có tiến trình
      const { data: progressData } = await supabase
        .from('user_card_progress')
        .select('card_id')
        .eq('user_id', currentUserId);

      const reviewedIds = new Set((progressData || []).map((p) => p.card_id));

      // 2. Lấy danh sách thẻ từ các bộ thẻ của người dùng
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*, study_sets!inner(user_id)')
        .eq('study_sets.user_id', currentUserId)
        .limit(100);

      if (cardsError) throw cardsError;

      if (cardsData) {
        const unreviewed = cardsData.filter((c) => !reviewedIds.has(c.id));
        return unreviewed.slice(0, limit) as unknown as Card[];
      }
    } catch (err) {
      console.warn('[srsService] Supabase fetchNewUnreviewedCards error, fallback:', err);
    }
  }

  // Local fallback
  const allProgress = getLocalProgress().filter((p) => p.user_id === currentUserId);
  const reviewedIds = new Set(allProgress.map((p) => p.card_id));
  const rawCards = localStorage.getItem('vocab_cards');
  const allCards: Card[] = rawCards ? JSON.parse(rawCards) : [];

  return allCards.filter((c) => !reviewedIds.has(c.id)).slice(0, limit);
}

/**
 * Thống kê phân bổ 5 cấp độ trí nhớ (MochiMochi 5 Box Levels)
 */
export async function fetchMemoryStageStats(userId?: string): Promise<MemoryStageStats> {
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'local-user';
  let progressList: UserCardProgress[] = [];

  if (isSupabaseConfigured && currentUserId !== 'local-user') {
    try {
      const { data, error } = await supabase
        .from('user_card_progress')
        .select('box_level, next_review_at')
        .eq('user_id', currentUserId);

      if (error) throw error;
      if (data) {
        progressList = data as unknown as UserCardProgress[];
      }
    } catch (err) {
      console.warn('[srsService] Supabase fetchMemoryStageStats fallback:', err);
      progressList = getLocalProgress().filter((p) => p.user_id === currentUserId);
    }
  } else {
    progressList = getLocalProgress().filter((p) => p.user_id === currentUserId);
  }

  const now = new Date();
  let box1 = 0;
  let box2 = 0;
  let box3 = 0;
  let box4 = 0;
  let box5 = 0;
  let totalDue = 0;

  for (const item of progressList) {
    if (new Date(item.next_review_at) <= now) {
      totalDue++;
    }
    const level = item.box_level || 1;
    if (level === 5) box5++;
    else if (level === 4) box4++;
    else if (level === 3) box3++;
    else if (level === 2) box2++;
    else box1++;
  }

  return {
    box1,
    box2,
    box3,
    box4,
    box5,
    totalCards: progressList.length,
    totalDue,
  };
}

/**
 * Đánh giá thẻ (Again, Hard, Good, Easy) và cập nhật tiến trình Spaced Repetition SM-2
 */
export async function submitCardReview(
  cardId: string,
  rating: ReviewRating,
  userId?: string
) {
  const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id || 'local-user';

  // 1. Lấy tiến trình hiện tại của thẻ
  let currentProgress: CardProgressInput = {
    boxLevel: 1,
    repetition: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    state: 'new',
  };

  let existingProgressRecord: UserCardProgress | null = null;

  if (isSupabaseConfigured && currentUserId !== 'local-user') {
    try {
      const { data } = await supabase
        .from('user_card_progress')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('card_id', cardId)
        .maybeSingle();

      if (data) {
        existingProgressRecord = data;
        currentProgress = {
          boxLevel: data.box_level,
          repetition: data.repetition,
          intervalDays: data.interval_days,
          easeFactor: data.ease_factor,
          state: data.state,
        };
      }
    } catch {
      // ignore
    }
  } else {
    const localList = getLocalProgress();
    const found = localList.find((p) => p.user_id === currentUserId && p.card_id === cardId);
    if (found) {
      existingProgressRecord = found;
      currentProgress = {
        boxLevel: found.box_level,
        repetition: found.repetition,
        intervalDays: found.interval_days,
        easeFactor: found.ease_factor,
        state: found.state,
      };
    }
  }

  // 2. Tính toán kết quả SRS SM-2 mới
  const nextSRS = calculateNextSRS(currentProgress, rating);
  const nowIso = new Date().toISOString();

  // 3. Cập nhật vào Supabase
  if (isSupabaseConfigured && currentUserId !== 'local-user') {
    try {
      const { error: upsertErr } = await supabase.from('user_card_progress').upsert({
        user_id: currentUserId,
        card_id: cardId,
        box_level: nextSRS.boxLevel,
        repetition: nextSRS.repetition,
        interval_days: nextSRS.intervalDays,
        ease_factor: nextSRS.easeFactor,
        state: nextSRS.state,
        last_reviewed_at: nowIso,
        next_review_at: nextSRS.nextReviewAt.toISOString(),
        total_reviews: (existingProgressRecord?.total_reviews || 0) + 1,
        consecutive_correct:
          rating === 'again' ? 0 : (existingProgressRecord?.consecutive_correct || 0) + 1,
      });

      if (upsertErr) throw upsertErr;

      // Ghi log học tập vào study_logs
      await supabase.from('study_logs').insert({
        user_id: currentUserId,
        card_id: cardId,
        rating,
        reviewed_date: nowIso.split('T')[0],
      });
    } catch (err) {
      console.warn('[srsService] Supabase submitCardReview error, fallback to local:', err);
      saveToLocal();
    }
  } else {
    saveToLocal();
  }

  function saveToLocal() {
    const localList = getLocalProgress();
    const idx = localList.findIndex((p) => p.user_id === currentUserId && p.card_id === cardId);
    const updatedRecord: UserCardProgress = {
      id: existingProgressRecord?.id || `prog-${Date.now()}`,
      user_id: currentUserId,
      card_id: cardId,
      box_level: nextSRS.boxLevel,
      repetition: nextSRS.repetition,
      interval_days: nextSRS.intervalDays,
      ease_factor: nextSRS.easeFactor,
      state: nextSRS.state,
      last_reviewed_at: nowIso,
      next_review_at: nextSRS.nextReviewAt.toISOString(),
      total_reviews: (existingProgressRecord?.total_reviews || 0) + 1,
      consecutive_correct:
        rating === 'again' ? 0 : (existingProgressRecord?.consecutive_correct || 0) + 1,
      created_at: existingProgressRecord?.created_at || nowIso,
      updated_at: nowIso,
    };

    if (idx >= 0) {
      localList[idx] = updatedRecord;
    } else {
      localList.push(updatedRecord);
    }
    saveLocalProgress(localList);

    // Ghi local log
    const localLogs = getLocalLogs();
    localLogs.push({
      id: `log-${Date.now()}`,
      user_id: currentUserId,
      card_id: cardId,
      rating,
      time_taken_ms: null,
      reviewed_date: nowIso.split('T')[0],
      created_at: nowIso,
    });
    saveLocalLogs(localLogs);
  }

  return nextSRS;
}
