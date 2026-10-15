# KẾ HOẠCH TRIỂN KHAI DỰ ÁN THEO CÁC PHASE (PHASED IMPLEMENTATION PLAN)
**Dự án**: Ứng dụng Học Từ Vựng Tương Tác Hiện Đại (OpenQuiz UI/UX x Anki SRS SM-2 x MochiMochi 5 Memory Stages)  
**Tech Stack**: Vite + React (TypeScript) | Tailwind CSS + Shadcn UI | Web Speech API | Supabase (PostgreSQL + RLS) | Vercel / GitHub Pages

---

## 📌 MỤC LỤC CÁC PHASE THỰC HIỆN
1. [PHASE 1: Nền tảng, Khởi tạo Dự án, Database Supabase & Xác thực](#-phase-1-nền-tảng-khởi-tạo-dự-án-database-supabase--xác-thực)
2. [PHASE 2: Quản lý Thư mục, Bộ thẻ & TSV Import Engine (OpenQuiz Flat List)](#-phase-2-quản-lý-thư-mục-bộ-thẻ--tsv-import-engine-openquiz-flat-list)
3. [PHASE 3: Trải nghiệm Flashcards 3D & Web Speech Audio (TTS & STT)](#-phase-3-trải-nghiệm-flashcards-3d--web-speech-audio-tts--stt)
4. [PHASE 4: Thuật toán Spaced Repetition (SRS SM-2) & Hàng đợi Ôn tập Hàng ngày](#-phase-4-thuật-toán-spaced-repetition-srs-sm-2--hàng-đợi-ôn-tập-hàng-ngày)
5. [PHASE 5: Gamification, Trắc nghiệm Quiz, Ghép từ & Heatmap Chuyên cần](#-phase-5-gamification-trắc-nghiệm-quiz-ghép-từ--heatmap-chuyên-cần)
6. [PHASE 6: Tối ưu hóa Hiệu năng, Responsive Mobile & Triển khai Production](#-phase-6-tối-ưu-hóa-hiệu-năng-responsive-mobile--triển-khai-production)

---

## 🟢 PHASE 1: NỀN TẢNG, KHỞI TẠO DỰ ÁN, DATABASE SUPABASE & XÁC THỰC
> **Thời gian dự kiến**: 3 - 4 ngày  
> **Mục tiêu**: Xây dựng bộ khung Frontend chuẩn mực, thiết lập cơ sở dữ liệu Supabase kèm Row Level Security (RLS) an toàn tuyệt đối và hoàn thiện luồng đăng nhập / đăng ký.

### 1. Checklist công việc cụ thể
- [ ] **1.1. Setup Frontend Project**:
  - Khởi tạo dự án bằng Vite: `npm create vite@latest . -- --template react-ts`
  - Cài đặt Tailwind CSS, PostCSS, Autoprefixer:
    ```bash
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```
  - Cấu hình path alias `@/` trong `vite.config.ts` và `tsconfig.json`.
  - Khởi tạo Shadcn UI:
    ```bash
    npx -y shadcn@latest init
    npx -y shadcn@latest add button card input badge toast sonner dropdown-menu avatar
    ```
  - Cài đặt Lucide React & Framer Motion:
    ```bash
    npm install lucide-react framer-motion @supabase/supabase-js react-router-dom
    ```
- [ ] **1.2. Chạy SQL Schema trên Supabase**:
  - Tạo bảng `profiles`, `folders`, `study_sets`, `cards`, `user_card_progress`, `study_logs`.
  - Thiết lập Enums, Foreign Keys, Triggers cập nhật timestamp và đếm số thẻ.
  - Thiết lập Trigger tự động tạo `profiles` khi người dùng đăng ký qua `auth.users`.
  - Kích hoạt RLS (Row Level Security) cho toàn bộ các bảng.
- [ ] **1.3. Cấu hình Supabase Client & Auth Context**:
  - Tạo file `src/services/supabase.ts` singleton client.
  - Tạo `AuthContext` lắng nghe `supabase.auth.onAuthStateChange`.
  - Xây dựng các trang `/login`, `/register`, component `ProtectedRoute.tsx`.
- [ ] **1.4. Layout Cơ Bản (App Shell)**:
  - Header với Logo, Streak Counter badge, Avatar User, Menu đăng xuất, Dark/Light mode toggle.

### 2. DDL Database Schema Cần Thực Thi (Chạy trên Supabase SQL Editor)
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE card_state AS ENUM ('new', 'learning', 'reviewing', 'mastered');
CREATE TYPE review_rating AS ENUM ('again', 'hard', 'good', 'easy');

-- 1. Profiles
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    daily_goal_cards INT DEFAULT 20,
    audio_auto_play BOOLEAN DEFAULT TRUE,
    preferred_voice TEXT DEFAULT 'en-US',
    last_active_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. Folders
CREATE TABLE public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    color_code VARCHAR(16) DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. Study Sets
CREATE TABLE public.study_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    total_cards INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 4. Cards
CREATE TABLE public.cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID NOT NULL REFERENCES public.study_sets(id) ON DELETE CASCADE,
    term VARCHAR(255) NOT NULL,
    ipa VARCHAR(100),
    part_of_speech VARCHAR(50),
    definition TEXT NOT NULL,
    example TEXT,
    synonyms TEXT[] DEFAULT ARRAY[]::TEXT[],
    audio_url TEXT,
    image_url TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. User Card Progress (SRS)
CREATE TABLE public.user_card_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    box_level INT DEFAULT 1 CHECK (box_level BETWEEN 1 AND 5),
    repetition INT DEFAULT 0,
    interval_days NUMERIC(8,2) DEFAULT 0,
    ease_factor NUMERIC(4,2) DEFAULT 2.50,
    state card_state DEFAULT 'new',
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    total_reviews INT DEFAULT 0,
    consecutive_correct INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    UNIQUE(user_id, card_id)
);

-- 6. Study Logs
CREATE TABLE public.study_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    rating review_rating NOT NULL,
    time_taken_ms INT,
    reviewed_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own folders" ON public.folders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own study sets" ON public.study_sets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view public study sets" ON public.study_sets FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Card owner full access" ON public.cards FOR ALL USING (
    EXISTS (SELECT 1 FROM public.study_sets WHERE study_sets.id = cards.set_id AND study_sets.user_id = auth.uid())
);
CREATE POLICY "Public cards readable" ON public.cards FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.study_sets WHERE study_sets.id = cards.set_id AND study_sets.is_public = TRUE)
);
CREATE POLICY "User progress self access" ON public.user_card_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Study logs self access" ON public.study_logs FOR ALL USING (auth.uid() = user_id);

-- Auto Profile Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Tiêu chuẩn nghiệm thu Phase 1 (DoD)
- Người dùng đăng ký tài khoản mới qua Supabase Auth, tự sinh profile trong bảng `profiles`.
- Đăng xuất / Đăng nhập hoạt động mượt mà, lưu token session trong localStorage.
- Cố tình truy vấn trực tiếp bảng của user khác bị RLS chặn hoàn toàn.

---

## 🟢 PHASE 2: QUẢN LÝ THƯ MỤC, BỘ THẺ & TSV IMPORT ENGINE (OPENQUIZ FLAT LIST)
> **Thời gian dự kiến**: 3 - 4 ngày  
> **Mục tiêu**: Cho phép tạo cấu trúc thư mục phân cấp, bộ thẻ và nạp dữ liệu từ vựng cực nhanh từ TSV kèm bảng tra cứu OpenQuiz flat list.

### 1. Checklist công việc cụ thể
- [ ] **2.1. Quản lý Thư mục (Folders)**:
  - Tạo Modal tạo/sửa thư mục (Tên, mô tả, chọn màu phân loại).
  - Hiển thị danh sách Thư mục và số lượng bộ thẻ bên trong.
- [ ] **2.2. Quản lý Bộ thẻ (Study Sets)**:
  - CRUD Bộ thẻ (Title, Description, Folder, gắn Tags, toggle Public/Private).
  - Tự động sync tổng số thẻ trong set bằng database trigger.
- [ ] **2.3. Bộ Parser TSV (Bulk Import Module)**:
  - Định dạng chuẩn: `Word \t Synonyms \t IPA \t PartOfSpeech \t Example \t Definition`.
  - Hỗ trợ dán Clipboard trực tiếp hoặc Upload file `.tsv`.
  - Xử lý các trường hợp ngoại lệ: bỏ qua header `Word`, tự bọc dấu gạch chéo `/.../` cho IPA, tách mảng từ đồng nghĩa, cảnh báo lỗi dòng thiếu trường.
  - Bảng xem trước dữ liệu (Preview Table) trước khi xác nhận lưu vào Supabase.
- [ ] **2.4. Giao diện Flat List Tra Cứu (Phong cách OpenQuiz)**:
  - Bảng danh sách từ chi tiết trong bộ thẻ: Cột Từ vựng, Phiên âm IPA, Loại từ (Badge), Định nghĩa, Câu ví dụ, Trạng thái SRS.
  - Ô tìm kiếm tức thì (Instant Search) theo từ hoặc nghĩa.
  - Lọc theo loại từ (Noun, Verb, Adjective, Phrasal Verb...).
  - Thao tác nhanh: Nút nghe thử phát âm ngay trên từng dòng, sửa/xóa thẻ.

### 2. Code TypeScript TSV Parser (`src/services/parser/tsvParser.ts`)
```typescript
export interface ParsedCardItem {
  term: string;
  synonyms: string[];
  ipa: string;
  partOfSpeech: string;
  example: string;
  definition: string;
  isValid: boolean;
  errors?: string[];
}

export interface ParseResult {
  items: ParsedCardItem[];
  totalParsed: number;
  validCount: number;
  invalidCount: number;
}

export function parseTsvVocabulary(tsvRawContent: string): ParseResult {
  const lines = tsvRawContent.split(/\r?\n/);
  const items: ParsedCardItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    const columns = rawLine.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (i === 0 && (columns[0].toLowerCase() === 'word' || columns[0].toLowerCase() === 'term')) {
      continue;
    }

    const errors: string[] = [];
    const term = columns[0] || '';
    const synonymsRaw = columns[1] || '';
    const ipa = columns[2] || '';
    const partOfSpeech = columns[3] || '';
    const example = columns[4] || '';
    const definition = columns[5] || '';

    if (!term) errors.push(`Dòng ${i + 1}: Thiếu từ vựng.`);
    if (!definition) errors.push(`Dòng ${i + 1}: Thiếu định nghĩa.`);

    const synonyms = synonymsRaw ? synonymsRaw.split(/[,;/]/).map((s) => s.trim()).filter(Boolean) : [];

    items.push({
      term,
      synonyms,
      ipa: ipa.startsWith('/') ? ipa : (ipa ? `/${ipa}/` : ''),
      partOfSpeech: partOfSpeech.toLowerCase(),
      example,
      definition,
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  const validCount = items.filter((item) => item.isValid).length;
  return { items, totalParsed: items.length, validCount, invalidCount: items.length - validCount };
}
```

### 3. Tiêu chuẩn nghiệm thu Phase 2 (DoD)
- Người dùng paste được 100+ dòng TSV từ Google Sheets/Excel vào ứng dụng.
- Dữ liệu hiển thị xem trước rõ ràng, báo lỗi nếu thiếu cột.
- Bảng Flat List hiển thị đầy đủ thông tin chuẩn phong cách OpenQuiz với thanh tìm kiếm phản hồi < 100ms.

---

## 🟢 PHASE 3: TRẢI NGHIỆM FLASHCARDS 3D & WEB SPEECH AUDIO (TTS & STT)
> **Thời gian dự kiến**: 3 - 4 ngày  
> **Mục tiêu**: Xây dựng trải nghiệm học thẻ tương tác 3 chiều tuyệt đẹp, âm thanh Text-to-Speech tự nhiên và luyện phát âm giọng đọc.

### 1. Checklist công việc cụ thể
- [ ] **3.1. Thiết kế 3D Flashcard Viewer (Framer Motion)**:
  - Tạo hiệu ứng lật thẻ 3 chiều mượt mà với `rotateY` và CSS `transform-style: preserve-3d`.
  - Mặt trước: Từ vựng lớn, IPA, Badge loại từ, nút audio, nút micro luyện nói.
  - Mặt sau: Định nghĩa nổi bật, câu ví dụ thực tế trong ngữ cảnh, mảng từ đồng nghĩa.
- [ ] **3.2. Web Speech API (Text-to-Speech - TTS)**:
  - Viết custom hook `useSpeechTTS.ts` sử dụng `window.speechSynthesis`.
  - Tự động phát âm khi chuyển sang thẻ mới (có thể bật/tắt trong settings).
  - Hỗ trợ chọn giọng chuẩn bản xứ (`en-US` hoặc `en-GB`).
- [ ] **3.3. Web Speech API (Speech Recognition - Chấm phát âm)**:
  - Tích hợp `webkitSpeechRecognition` cho phép người học bấm nút Micro để phát âm.
  - Hiển thị phản hồi tức thì: So sánh từ người học vừa đọc với từ trên thẻ và thông báo đúng/sai bằng màu sắc.
- [ ] **3.4. Hệ thống Phím Tắt Tiện Lợi (Keyboard Hotkeys)**:
  - `Space` / `Enter`: Lật mặt thẻ.
  - `←` / `→`: Chuyển lùi / tiến thẻ.
  - `1`, `2`, `3`, `4`: Đánh giá mức độ nhớ tương ứng (Again, Hard, Good, Easy).

### 2. Tiêu chuẩn nghiệm thu Phase 3 (DoD)
- Thẻ lật 60fps mượt mà, không bị giật lag trên cả màn hình điện thoại và máy tính.
- Phát âm bản xứ đọc rõ ràng ngay khi chuyển thẻ.
- Bấm phím tắt trên bàn phím điều khiển toàn bộ phiên học không cần chạm chuột.

---

## 🟢 PHASE 4: THUẬT TOÁN SPACED REPETITION (SRS SM-2) & HÀNG ĐỢI ÔN TẬP HÀNG NGÀY
> **Thời gian dự kiến**: 3 - 4 ngày  
> **Mục tiêu**: Triển khai thuật toán SuperMemo SM-2 kết hợp mô hình 5 cấp độ nhớ MochiMochi, tự động lên lịch ôn tập thông minh.

### 1. Checklist công việc cụ thể
- [ ] **4.1. Core Thuật toán SM-2 Engine**:
  - Tạo `src/services/srs/sm2.ts` tính toán `intervalDays`, `easeFactor`, `boxLevel` và `nextReviewAt`.
  - Phân loại đánh giá:
    - `Again (0)`: Reset về 1 ngày, box level 1.
    - `Hard (1)`: Tăng chậm, hệ số 1.2.
    - `Good (2)`: Tăng chuẩn theo Ease Factor.
    - `Easy (3)`: Tăng vượt bậc theo hệ số thưởng 1.3x Ease Factor.
- [ ] **4.2. Quản lý Tiến trình Thẻ (`user_card_progress`)**:
  - Tự động tạo bản ghi tiến trình lần đầu học thẻ.
  - Cập nhật thời gian ôn tập tiếp theo (`next_review_at`) sau mỗi lần chấm điểm.
- [ ] **4.3. Hàng Đợi Ôn Tập Hàng Ngày (Daily Due Reviews)**:
  - Truy vấn tối ưu lấy các thẻ đến hạn: `next_review_at <= NOW()`.
  - Dashboard hiển thị badge cảnh báo: *"Hôm nay bạn có X từ cần ôn tập"*.
  - Chế độ "Ôn tập hôm nay": Lần lượt ôn tập các thẻ đến hạn, hoàn thành thì thông báo chúc mừng.
- [ ] **4.4. Phân Tầng Trí Nhớ 5 Cấp Độ (Mochi 5 Memory Stages)**:
  - Thẻ được phân loại trực quan vào 5 hộp nhớ (Box 1: Mới học -> Box 5: Đã thuộc vĩnh viễn).

### 2. Code Thuật Toán SRS (`src/services/srs/sm2.ts`)
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

export function calculateNextSRS(current: CardProgressInput, rating: ReviewRating): CardProgressOutput {
  const score = RATING_SCORE_MAP[rating];
  let { repetition, intervalDays, easeFactor, boxLevel } = current;

  const newEaseFactor = Math.max(
    1.3,
    Number((easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02))).toFixed(2))
  );

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
    if (intervalDays >= 30) boxLevel = 5;
    else if (intervalDays >= 14) boxLevel = 4;
    else if (intervalDays >= 6) boxLevel = 3;
    else if (intervalDays >= 2) boxLevel = 2;
    else boxLevel = 1;
  }

  let state: CardState = 'reviewing';
  if (boxLevel === 5 && repetition >= 4) state = 'mastered';
  else if (repetition < 2) state = 'learning';

  const nextReviewAt = new Date();
  nextReviewAt.setMinutes(nextReviewAt.getMinutes() + Math.round(intervalDays * 24 * 60));

  return { boxLevel, repetition, intervalDays, easeFactor: newEaseFactor, state, nextReviewAt };
}
```

### 3. Tiêu chuẩn nghiệm thu Phase 4 (DoD)
- Sau khi chọn đánh giá thẻ, ngày ôn tập kế tiếp được cập nhật chính xác theo thuật toán.
- Thẻ đã ôn tập hôm nay rời khỏi hàng đợi `Due Cards`.
- Cột trạng thái trong bảng Flat List phản ánh đúng Box Level của từng thẻ.

---

## 🟢 PHASE 5: GAMIFICATION, TRẮC NGHIỆM QUIZ, GHÉP TỪ & HEATMAP CHUYÊN CẦN
> **Thời gian dự kiến**: 3 - 4 ngày  
> **Mục tiêu**: Đa dạng hóa chế độ học tập và tạo thói quen học tập liên tục thông qua mini-games và biểu đồ chuyên cần.

### 1. Checklist công việc cụ thể
- [ ] **5.1. Chế độ Trắc Nghiệm (Multiple Choice Quiz)**:
  - Tự động sinh câu hỏi trắc nghiệm 4 đáp án: Lấy 1 từ vựng làm câu hỏi, chọn ngẫu nhiên 3 định nghĩa của các từ khác trong set làm đáp án nhiễu.
  - Có chế độ tính giờ hoặc không giới hạn thời gian.
  - Hiển thị giải thích câu ví dụ ngay sau khi chọn đáp án.
- [ ] **5.2. Chế độ Ghép Từ (Match Game)**:
  - Lưới thẻ (12 hoặc 16 ô) chứa các cặp [Từ vựng] và [Định nghĩa] bị xáo trộn.
  - Người dùng bấm chọn 2 thẻ khớp nhau: Biến mất nếu đúng, rung lắc nếu sai.
  - Đồng hồ đếm thời gian thực và ghi nhận điểm kỷ lục cá nhân.
- [ ] **5.3. Nhật Ký Học Tập & Heatmap Chuyên Cần (GitHub Contribution Style)**:
  - Mỗi lần ôn tập thẻ, tự động ghi 1 log vào bảng `study_logs`.
  - Vẽ biểu đồ ma trận ô vuông theo ngày trong năm (càng học nhiều từ, màu xanh càng đậm).
- [ ] **5.4. Hệ Thống Duy Trì Chuỗi (Streak Counter)**:
  - Kiểm tra `last_active_at`: Nếu học liên tiếp các ngày thì tăng `current_streak + 1`, nếu ngắt quãng thì reset về 1.
  - Lưu trữ `longest_streak` (kỷ lục chuỗi dài nhất).

### 2. Tiêu chuẩn nghiệm thu Phase 5 (DoD)
- Game ghép từ chạy trơn tru, không có bug click đúp.
- Trắc nghiệm không bao giờ bị trùng đáp án đúng trong 4 phương án.
- Heatmap cập nhật tức thì màu xanh ô ngày hôm nay ngay sau khi hoàn thành phiên học.

---

## 🟢 PHASE 6: TỐI ƯU HÓA HIỆU NĂNG, RESPONSIVE MOBILE & TRIỂN KHAI PRODUCTION
> **Thời gian dự kiến**: 2 - 3 ngày  
> **Mục tiêu**: Hoàn thiện toàn bộ chi tiết UX, tối ưu hóa tốc độ tải trang, kiểm thử trên thiết bị di động và triển khai lên Vercel / GitHub Pages.

### 1. Checklist công việc cụ thể
- [ ] **6.1. Tối Ưu UX & Loading States**:
  - Thêm Skeleton Loader cho bảng từ vựng và flashcard khi đang tải dữ liệu từ Supabase.
  - Hiển thị Toast thông báo (Shadcn Sonner) khi import thành công, lưu thẻ hoặc đạt mốc streak mới.
  - Thêm hiệu ứng âm thanh nhẹ (tiếng flip thẻ, tiếng chuông khi trả lời đúng).
- [ ] **6.2. Tối Ưu Giao Diện Di Động (Mobile-First Polish)**:
  - Thao tác vuốt (swipe gestures) trên màn hình cảm ứng để chuyển flashcard.
  - Menu thanh điều hướng dưới đáy (Bottom Navigation Bar) tiện lợi cho ngón cái trên điện thoại.
- [ ] **6.3. Cấu hình CI/CD & Deploy Production**:
  - Tạo file `vercel.json` định tuyến SPA:
    ```json
    {
      "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
    }
    ```
  - Cấu hình Environment Variables trên Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
  - Audit hiệu năng bằng Google Lighthouse (mục tiêu > 90 điểm).

### 2. Tiêu chuẩn nghiệm thu Phase 6 (DoD)
- Sản phẩm chạy trực tiếp trên domain Vercel / Cloudflare Pages.
- F5 tại bất kỳ trang con nào không bị lỗi 404.
- Trải nghiệm mượt mà, đầy đủ tính năng trên cả iOS Safari, Android Chrome và Desktop.
