# PHASE 1: NỀN TẢNG, KHỞI TẠO DỰ ÁN, DATABASE SUPABASE & XÁC THỰC

> **Thời gian dự kiến**: 3 - 4 ngày  
> **Mục tiêu**: Xây dựng bộ khung Frontend chuẩn mực bằng Vite + React + TypeScript + Tailwind CSS + Shadcn UI, thiết lập cơ sở dữ liệu Supabase kèm Row Level Security (RLS) an toàn tuyệt đối và hoàn thiện luồng đăng nhập / đăng ký.

---

## 1. CHECKLIST CÔNG VIỆC CỤ THỂ

- [ ] **1.1. Setup Frontend Project**:
  - Khởi tạo dự án bằng Vite với React và TypeScript:
    ```bash
    npm create vite@latest . -- --template react-ts
    ```
  - Cài đặt Tailwind CSS, PostCSS, Autoprefixer:
    ```bash
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```
  - Cấu hình path alias `@/` trỏ tới `src/` trong `vite.config.ts` và `tsconfig.json`.
  - Khởi tạo Shadcn UI:
    ```bash
    npx -y shadcn@latest init
    npx -y shadcn@latest add button card input badge toast sonner dropdown-menu avatar separator
    ```
  - Cài đặt các thư viện thiết yếu:
    ```bash
    npm install lucide-react framer-motion @supabase/supabase-js react-router-dom
    ```

- [ ] **1.2. Thiết lập Database Supabase**:
  - Tạo project mới trên Supabase Cloud.
  - Chạy toàn bộ file mã SQL DDL bên dưới trên **Supabase SQL Editor**:
    - Tạo các bảng: `profiles`, `folders`, `study_sets`, `cards`, `user_card_progress`, `study_logs`.
    - Tạo Enums: `card_state`, `review_rating`.
    - Tạo Indexes tối ưu query ôn tập (`next_review_at <= NOW()`).
    - Kích hoạt RLS (Row Level Security) và các Policy bảo mật.
    - Tạo Trigger tự động đồng bộ thẻ và tự động tạo Profile khi user đăng ký qua `auth.users`.

- [ ] **1.3. Cấu hình Supabase Client & State Auth**:
  - Tạo file `src/services/supabase.ts` singleton client.
  - Tạo `AuthContext` (`src/features/auth/AuthContext.tsx`) lắng nghe session qua `supabase.auth.onAuthStateChange`.
  - Tạo các màn hình:
    - `src/features/auth/LoginPage.tsx`
    - `src/features/auth/RegisterPage.tsx`
  - Tạo component bảo vệ route: `src/components/ProtectedRoute.tsx`.

- [ ] **1.4. App Shell & Layout Navigation**:
  - Tạo `src/components/Navbar.tsx`: Logo, nút chuyển theme Dark/Light, Streak badge tạm thời, Avatar user và menu Đăng xuất.
  - Cấu hình React Router DOM trong `src/App.tsx`.

---

## 2. SQL DDL TOÀN DIỆN CHO SUPABASE

Chạy toàn bộ script sau trong **Supabase SQL Editor**:

```sql
-- ====================================================================
-- 0. EXTENSIONS & ENUMS
-- ====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE card_state AS ENUM ('new', 'learning', 'reviewing', 'mastered');
CREATE TYPE review_rating AS ENUM ('again', 'hard', 'good', 'easy');

-- ====================================================================
-- 1. BẢNG PROFILES (Mở rộng từ auth.users)
-- ====================================================================
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

-- ====================================================================
-- 2. BẢNG FOLDERS (Quản lý danh mục/thư mục)
-- ====================================================================
CREATE TABLE public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    color_code VARCHAR(16) DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ====================================================================
-- 3. BẢNG STUDY_SETS (Bộ thẻ học)
-- ====================================================================
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

-- ====================================================================
-- 4. BẢNG CARDS (Dữ liệu từ vựng gốc của set)
-- ====================================================================
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

-- ====================================================================
-- 5. BẢNG USER_CARD_PROGRESS (Tiến trình SRS riêng của mỗi user trên thẻ)
-- ====================================================================
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

-- ====================================================================
-- 6. BẢNG STUDY_LOGS (Lịch sử ôn tập để tính Heatmap & Analytics)
-- ====================================================================
CREATE TABLE public.study_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    rating review_rating NOT NULL,
    time_taken_ms INT,
    reviewed_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ====================================================================
-- 7. INDEXES TỐI ƯU HIỆU NĂNG TRUY VẤN
-- ====================================================================
CREATE INDEX idx_user_card_progress_due 
    ON public.user_card_progress (user_id, next_review_at ASC) 
    WHERE next_review_at <= NOW();

CREATE INDEX idx_user_card_progress_stages 
    ON public.user_card_progress (user_id, box_level, state);

CREATE INDEX idx_cards_set_id ON public.cards (set_id, order_index ASC);
CREATE INDEX idx_study_sets_user ON public.study_sets (user_id, folder_id);
CREATE INDEX idx_study_logs_heatmap ON public.study_logs (user_id, reviewed_date);

-- ====================================================================
-- 8. TRIGGERS TỰ ĐỘNG
-- ====================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_folders_updated BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_study_sets_updated BEFORE UPDATE ON public.study_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_cards_updated BEFORE UPDATE ON public.cards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON public.user_card_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tự động cập nhật số thẻ trong study set
CREATE OR REPLACE FUNCTION sync_study_set_card_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.study_sets SET total_cards = total_cards + 1 WHERE id = NEW.set_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.study_sets SET total_cards = GREATEST(0, total_cards - 1) WHERE id = OLD.set_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_card_count_sync
AFTER INSERT OR DELETE ON public.cards
FOR EACH ROW EXECUTE FUNCTION sync_study_set_card_count();

-- Tự động khởi tạo profile khi user đăng ký
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

-- ====================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
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
```

---

## 3. CODE CỐT LÕI PHASE 1

### File: `src/services/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong file .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
```

### File: `.env.example`
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. TIÊU CHUẨN NGHIỆM THU (DEFINITION OF DONE - DOD)
1. Chạy `npm run dev` không có lỗi compile, Tailwind CSS và component Shadcn UI render đẹp mắt.
2. Đăng ký tài khoản mới: Tự động ghi nhận user trong `auth.users` và tạo bản ghi tương ứng trong `public.profiles`.
3. Đăng nhập và đăng xuất: Session được duy trì khi reload lại trang (`F5`).
4. Thử nghiệm bảo mật: Không thể query trực tiếp các bản ghi của user khác nhờ RLS.
