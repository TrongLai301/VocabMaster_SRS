export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type CardState = 'new' | 'learning' | 'reviewing' | 'mastered';

export interface CardProgressInput {
  boxLevel?: number;
  repetition?: number;
  intervalDays?: number;
  easeFactor?: number;
  state?: CardState;
}

export interface CardProgressOutput {
  boxLevel: number;
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  state: CardState;
  nextReviewAt: Date;
}

const RATING_SCORE_MAP: Record<ReviewRating, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

/**
 * Thuật toán Spaced Repetition SuperMemo SM-2 cải tiến
 * kết hợp mô hình 5 tầng trí nhớ (MochiMochi 5 Box Levels).
 * 
 * @param current Tiến trình hiện tại của thẻ (hoặc mặc định nếu thẻ mới)
 * @param rating Đánh giá của người học: 'again' | 'hard' | 'good' | 'easy'
 */
export function calculateNextSRS(
  current: CardProgressInput = {},
  rating: ReviewRating
): CardProgressOutput {
  const score = RATING_SCORE_MAP[rating];
  let repetition = current.repetition ?? 0;
  let intervalDays = current.intervalDays ?? 0;
  let easeFactor = current.easeFactor ?? 2.5;
  let boxLevel = current.boxLevel ?? 1;

  // 1. Tính toán lại Ease Factor theo công thức chuẩn SM-2 (Tối thiểu 1.30)
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const deltaEF = 0.1 - (5 - score) * (0.08 + (5 - score) * 0.02);
  const newEaseFactor = Math.max(1.3, Number((easeFactor + deltaEF).toFixed(2)));

  // 2. Cập nhật Repetition & Khoảng cách ngày (Interval Days)
  if (score < 3) {
    // Again: Quên từ -> Reset chu kỳ về 0, ôn lại sau 1 ngày hoặc < 1 ngày
    repetition = 0;
    intervalDays = 1;
    boxLevel = 1;
  } else {
    // Vượt qua (Hard, Good, Easy)
    if (repetition === 0) {
      intervalDays = 1;
    } else if (repetition === 1) {
      intervalDays = rating === 'hard' ? 2 : (rating === 'easy' ? 5 : 3);
    } else {
      let modifier = newEaseFactor;
      if (rating === 'hard') modifier = 1.2;
      if (rating === 'easy') modifier = newEaseFactor * 1.35;

      intervalDays = Math.max(1, Math.round(intervalDays * modifier));
    }

    repetition += 1;

    // Phân loại 5 cấp độ trí nhớ (MochiMochi 5 Boxes):
    // Box 1: < 2 ngày (Mới bắt đầu / Cần củng cố)
    // Box 2: 2 - 5 ngày (Bắt đầu nhớ)
    // Box 3: 6 - 13 ngày (Nhớ tương đối vững)
    // Box 4: 14 - 29 ngày (Khắc sâu trí nhớ dài hạn)
    // Box 5: >= 30 ngày (Mastered / Thành thạo tuyệt đối)
    if (intervalDays >= 30) {
      boxLevel = 5;
    } else if (intervalDays >= 14) {
      boxLevel = 4;
    } else if (intervalDays >= 6) {
      boxLevel = 3;
    } else if (intervalDays >= 2) {
      boxLevel = 2;
    } else {
      boxLevel = 1;
    }
  }

  // 3. Phân loại Card State
  let state: CardState = 'reviewing';
  if (boxLevel === 5 && repetition >= 4) {
    state = 'mastered';
  } else if (repetition < 2) {
    state = 'learning';
  }

  // 4. Timestamp tiếp theo cần ôn tập
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + intervalDays);

  return {
    boxLevel,
    repetition,
    intervalDays,
    easeFactor: newEaseFactor,
    state,
    nextReviewAt,
  };
}

/**
 * Trả về thông tin hiển thị của 5 cấp độ trí nhớ Mochi
 */
export function getBoxLevelInfo(level: number) {
  switch (level) {
    case 5:
      return {
        level: 5,
        name: 'Thành thạo (Mastered)',
        description: 'Đã khắc sâu vào trí nhớ dài hạn (>= 30 ngày)',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
        badge: 'bg-emerald-500 text-white',
      };
    case 4:
      return {
        level: 4,
        name: 'Khắc sâu (Deep Memory)',
        description: 'Trí nhớ ổn định vững chắc (14 - 29 ngày)',
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
        badge: 'bg-indigo-500 text-white',
      };
    case 3:
      return {
        level: 3,
        name: 'Ghi nhớ tốt (Good Memory)',
        description: 'Phản xạ nhận diện từ tốt (6 - 13 ngày)',
        color: 'text-sky-600 dark:text-sky-400',
        bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
        badge: 'bg-sky-500 text-white',
      };
    case 2:
      return {
        level: 2,
        name: 'Nhớ mang máng (Intermediate)',
        description: 'Đang hình thành liên kết não bộ (2 - 5 ngày)',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
        badge: 'bg-amber-500 text-white',
      };
    default:
      return {
        level: 1,
        name: 'Khởi động (Learning)',
        description: 'Từ vựng mới hoặc vừa quên (< 2 ngày)',
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
        badge: 'bg-rose-500 text-white',
      };
  }
}
