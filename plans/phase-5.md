# PHASE 5: GAMIFICATION, TRẮC NGHIỆM QUIZ, GHÉP TỪ & HEATMAP CHUYÊN CẦN

> **Thời gian dự kiến**: 3 - 4 ngày  
> **Mục tiêu**: Đa dạng hóa chế độ học tập với các trò chơi tương tác (Match Game, Multiple Choice Quiz) và xây dựng hệ thống duy trì động lực với Chuỗi ngày học liên tục (Streak) và Biểu đồ nhiệt chuyên cần (GitHub Contribution Heatmap).

---

## 1. CHECKLIST CÔNG VIỆC CỤ THỂ

- [ ] **5.1. Chế độ Trắc Nghiệm (Multiple Choice Quiz)**:
  - Tạo `src/features/games/components/QuizGame.tsx`.
  - Thuật toán tự sinh đề:
    - Chọn 1 thẻ làm câu hỏi (Hiển thị Term hoặc Definition).
    - Lấy 1 đáp án đúng + bốc ngẫu nhiên 3 định nghĩa của các thẻ khác trong cùng set làm đáp án nhiễu.
    - Xáo trộn (Shuffle) vị trí 4 đáp án (A, B, C, D).
  - Phản hồi tức thì: Đổi màu xanh cho đáp án đúng, đỏ cho đáp án sai kèm câu giải thích ngữ cảnh.
  - Hỗ trợ phím tắt số `1`, `2`, `3`, `4` để chọn nhanh đáp án.

- [ ] **5.2. Trò Chơi Ghép Thẻ (Match Game)**:
  - Tạo `src/features/games/components/MatchGame.tsx`.
  - Lưới thẻ (Grid 3x4 hoặc 4x4) chứa 6 - 8 cặp [Từ vựng] và [Định nghĩa] bị xáo trộn.
  - Tương tác:
    - Bấm chọn thẻ 1 -> thẻ sáng viền xanh.
    - Bấm chọn thẻ 2: Nếu khớp -> cả 2 thẻ biến mất kèm hiệu ứng nhẹ; Nếu sai -> cả 2 thẻ rung lắc (shake animation) và hoàn nguyên.
  - Đồng hồ đếm thời gian thực (Stopwatch tính bằng giây/mili-giây).
  - Bảng thành tích hoàn thành (Leaderboard cá nhân).

- [ ] **5.3. Biểu Đồ Nhiệt Chuyên Cần (GitHub Contribution Heatmap)**:
  - Tạo `src/features/analytics/components/StreakHeatmap.tsx`.
  - Truy vấn nhóm theo ngày từ bảng `study_logs`:
    ```sql
    SELECT reviewed_date, COUNT(*) as count 
    FROM study_logs 
    WHERE user_id = auth.uid() AND reviewed_date >= NOW() - INTERVAL '1 year'
    GROUP BY reviewed_date;
    ```
  - Vẽ ma trận các ô vuông màu xanh lá (từ nhạt đến đậm) tương ứng với số từ đã học mỗi ngày trong năm.

- [ ] **5.4. Hệ Thống Duy Trì Chuỗi (Streak Counter)**:
  - Logic tính streak trong `profiles`:
    - Nếu `last_active_at == CURRENT_DATE`: Không đổi.
    - Nếu `last_active_at == CURRENT_DATE - 1`: `current_streak += 1`, cập nhật `longest_streak = MAX(longest_streak, current_streak)`.
    - Nếu `last_active_at < CURRENT_DATE - 1`: `current_streak = 1` (chuỗi bị đứt).
  - Widget ngọn lửa Streak rực sáng trên thanh Header.

---

## 2. CODE CỐT LÕI PHASE 5

### 2.1. Logic Sinh Câu Hỏi Trắc Nghiệm (`src/features/games/utils/quizGenerator.ts`)
```typescript
export interface QuizQuestion {
  cardId: string;
  term: string;
  correctDefinition: string;
  options: string[];
}

export function generateQuizQuestions(
  cards: { id: string; term: string; definition: string }[]
): QuizQuestion[] {
  if (cards.length < 4) return [];

  return cards.map((card) => {
    // Lấy danh sách các định nghĩa khác
    const otherDefinitions = cards
      .filter((c) => c.id !== card.id)
      .map((c) => c.definition);

    // Shuffle và lấy 3 đáp án nhiễu
    const shuffledOthers = [...otherDefinitions].sort(() => 0.5 - Math.random());
    const distractors = shuffledOthers.slice(0, 3);

    // Ghép với đáp án đúng và shuffle lần nữa
    const options = [card.definition, ...distractors].sort(() => 0.5 - Math.random());

    return {
      cardId: card.id,
      term: card.term,
      correctDefinition: card.definition,
      options,
    };
  });
}
```

### 2.2. Component Heatmap Chuyên Cần (`src/features/analytics/components/StreakHeatmap.tsx`)
```tsx
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapDay {
  date: string;
  count: number;
}

interface StreakHeatmapProps {
  data: Record<string, number>; // Format: { "2026-10-15": 25 }
}

export const StreakHeatmap: React.FC<StreakHeatmapProps> = ({ data }) => {
  // Tạo danh sách 90 ngày gần nhất
  const days: HeatmapDay[] = [];
  const today = new Date();

  for (let i = 89; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      count: data[dateStr] || 0,
    });
  }

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-slate-100 dark:bg-slate-800';
    if (count <= 5) return 'bg-emerald-200 dark:bg-emerald-900';
    if (count <= 15) return 'bg-emerald-400 dark:bg-emerald-700';
    if (count <= 30) return 'bg-emerald-500 dark:bg-emerald-500';
    return 'bg-emerald-600 dark:bg-emerald-400';
  };

  return (
    <div className="p-4 border rounded-2xl bg-card">
      <h4 className="text-sm font-semibold mb-3">Lịch sử ôn tập (90 ngày gần nhất)</h4>
      <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2">
        <TooltipProvider>
          {days.map((day) => (
            <Tooltip key={day.date}>
              <TooltipTrigger asChild>
                <div
                  className={`w-3.5 h-3.5 rounded-sm transition-colors ${getColorClass(day.count)}`}
                />
              </TooltipTrigger>
              <TooltipContent className="text-xs">
                <span>{day.date}: <strong>{day.count}</strong> từ đã ôn</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
};
```

---

## 3. TIÊU CHUẨN NGHIỆM THU (DEFINITION OF DONE - DOD)
1. Chế độ Quiz: Tạo đề thi ngẫu nhiên không bao giờ bị trùng đáp án đúng trong 4 phương án, có giải thích tức thì khi chọn.
2. Match Game: Lưới thẻ tương tác mượt mà, đồng hồ tính giờ chính xác, hiệu ứng biến mất khi chọn cặp đúng.
3. Heatmap cập nhật tức thì màu xanh ô ngày hôm nay ngay sau khi người dùng hoàn thành phiên ôn tập.
4. Streak Counter tự động tăng khi học vào ngày tiếp theo và hiển thị huy hiệu rực rỡ.
