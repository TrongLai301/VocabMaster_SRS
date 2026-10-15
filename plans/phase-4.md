# PHASE 4: THUẬT TOÁN SPACED REPETITION (SRS SM-2) & HÀNG ĐỢI ÔN TẬP HÀNG NGÀY

> **Thời gian dự kiến**: 3 - 4 ngày  
> **Mục tiêu**: Xây dựng cỗ máy ghi nhớ ngắt quãng thông minh chuẩn Anki (SuperMemo SM-2) kết hợp mô hình 5 tầng trí nhớ của MochiMochi, tự động quản lý danh sách thẻ đến hạn ôn tập mỗi ngày.

---

## 1. CHECKLIST CÔNG VIỆC CỤ THỂ

- [ ] **4.1. Core Thuật toán SM-2 Engine (`src/services/srs/sm2.ts`)**:
  - Viết hàm `calculateNextSRS(currentProgress, rating)`.
  - Công thức tính toán Ease Factor mới:
    $$EF' = EF + (0.1 - (5 - q) \times (0.08 + (5 - q) \times 0.02))$$
  - Xử lý các cấp độ:
    - `Again (0)`: Reset `repetition = 0`, `interval = 1 ngày`, `boxLevel = 1`, `state = 'learning'`.
    - `Hard (1)`: Tăng chậm `interval = interval * 1.2`.
    - `Good (2)`: Tăng chuẩn theo `interval = interval * easeFactor`.
    - `Easy (3)`: Tăng vượt bậc theo `interval = interval * easeFactor * 1.3`.
  - Phân loại 5 cấp độ nhớ Mochi (Box Level 1 -> 5):
    - Box 1: < 2 ngày
    - Box 2: 2 - 5 ngày
    - Box 3: 6 - 13 ngày
    - Box 4: 14 - 29 ngày
    - Box 5: >= 30 ngày (Mastered)

- [ ] **4.2. Quản lý Tiến trình Thẻ (`src/services/api/srsService.ts`)**:
  - Viết query lấy danh sách thẻ cần ôn hôm nay:
    ```sql
    SELECT * FROM user_card_progress WHERE user_id = auth.uid() AND next_review_at <= NOW();
    ```
  - Viết mutation upsert tiến trình thẻ vào bảng `user_card_progress`.
  - Tự động ghi 1 log vào `study_logs` khi hoàn thành 1 lượt đánh giá thẻ.

- [ ] **4.3. Màn hình Daily Review (Ôn tập hàng ngày)**:
  - Tạo `src/features/srs/pages/DailyReviewPage.tsx`.
  - Badge cảnh báo trên Dashboard: *"Hôm nay có X từ cần ôn tập"*.
  - Tích hợp `FlashcardViewer`: Khi người dùng bấm nút Again/Hard/Good/Easy, tiến trình được lưu vào database và thẻ được loại khỏi hàng đợi hôm đó.
  - Màn hình chúc mừng khi hoàn thành toàn bộ số thẻ trong hàng đợi.

- [ ] **4.4. Hiển thị Phân Tầng Trí Nhớ 5 Cấp Độ**:
  - Widget thống kê số lượng thẻ phân bổ ở từng Hộp (Box 1 đến Box 5) trên Dashboard.

---

## 2. CODE CỐT LÕI PHASE 4

### 2.1. File: `src/services/srs/sm2.ts`
```typescript
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type CardState = 'new' | 'learning' | 'reviewing' | 'mastered';

export interface CardProgressInput {
  boxLevel: number;
  repetition: number;
  intervalDays: number;
  easeFactor: number;
  state: CardState;
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

export function calculateNextSRS(
  current: CardProgressInput,
  rating: ReviewRating
): CardProgressOutput {
  const score = RATING_SCORE_MAP[rating];
  let { repetition, intervalDays, easeFactor, boxLevel } = current;

  // 1. Tính toán lại Ease Factor (tối thiểu 1.30)
  const newEaseFactor = Math.max(
    1.3,
    Number((easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))).toFixed(2))
  );

  // 2. Cập nhật Repetition & Interval
  if (score < 3) {
    repetition = 0;
    intervalDays = 1;
    boxLevel = 1;
  } else {
    if (repetition === 0) {
      intervalDays = 1;
    } else if (repetition === 1) {
      intervalDays = rating === 'hard' ? 3 : 6;
    } else {
      let modifier = newEaseFactor;
      if (rating === 'hard') modifier = 1.2;
      if (rating === 'easy') modifier = newEaseFactor * 1.3;

      intervalDays = Math.round(intervalDays * modifier);
    }

    repetition += 1;
    // Map sang 5 Box levels
    if (intervalDays >= 30) boxLevel = 5;
    else if (intervalDays >= 14) boxLevel = 4;
    else if (intervalDays >= 6) boxLevel = 3;
    else if (intervalDays >= 2) boxLevel = 2;
    else boxLevel = 1;
  }

  // 3. Phân loại Card State
  let state: CardState = 'reviewing';
  if (boxLevel === 5 && repetition >= 4) {
    state = 'mastered';
  } else if (repetition < 2) {
    state = 'learning';
  }

  // 4. Timestamp tiếp theo
  const nextReviewAt = new Date();
  nextReviewAt.setMinutes(nextReviewAt.getMinutes() + Math.round(intervalDays * 24 * 60));

  return {
    boxLevel,
    repetition,
    intervalDays,
    easeFactor: newEaseFactor,
    state,
    nextReviewAt,
  };
}
```

### 2.2. Service tương tác Database (`src/services/api/srsService.ts`)
```typescript
import { supabase } from '@/services/supabase';
import { calculateNextSRS, ReviewRating, CardProgressInput } from '@/services/srs/sm2';

export async function fetchDueCards(userId: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('user_card_progress')
    .select('*, cards(*)')
    .eq('user_id', userId)
    .lte('next_review_at', now)
    .order('next_review_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function reviewCard(
  userId: string,
  cardId: string,
  currentProgress: CardProgressInput,
  rating: ReviewRating
) {
  const nextSrs = calculateNextSRS(currentProgress, rating);

  // 1. Cập nhật tiến trình thẻ
  const { error: progressError } = await supabase.from('user_card_progress').upsert({
    user_id: userId,
    card_id: cardId,
    box_level: nextSrs.boxLevel,
    repetition: nextSrs.repetition,
    interval_days: nextSrs.intervalDays,
    ease_factor: nextSrs.easeFactor,
    state: nextSrs.state,
    next_review_at: nextSrs.nextReviewAt.toISOString(),
    last_reviewed_at: new Date().toISOString(),
  });

  if (progressError) throw progressError;

  // 2. Ghi log học tập
  await supabase.from('study_logs').insert({
    user_id: userId,
    card_id: cardId,
    rating,
    reviewed_date: new Date().toISOString().split('T')[0],
  });

  return nextSrs;
}
```

---

## 3. TIÊU CHUẨN NGHIỆM THU (DEFINITION OF DONE - DOD)
1. Các phép tính của `calculateNextSRS` chạy chính xác theo đúng công thức SM-2 đối với cả 4 mức đánh giá (Again, Hard, Good, Easy).
2. Khi người học hoàn thành review 1 thẻ, trường `next_review_at` được dời về tương lai và thẻ tự động biến mất khỏi danh sách ôn tập hôm đó.
3. Box level (1 đến 5) phản ánh chính xác trạng thái ghi nhớ trên giao diện người dùng.
