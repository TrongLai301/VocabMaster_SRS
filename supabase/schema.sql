-- ====================================================================
-- VOCABMASTER SRS - SUPABASE DATABASE INITIALIZATION SCHEMA
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
DO $$ BEGIN
    CREATE TYPE card_state AS ENUM ('new', 'learning', 'reviewing', 'mastered');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE review_rating AS ENUM ('again', 'hard', 'good', 'easy');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
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

-- 2. FOLDERS
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    color_code VARCHAR(16) DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. STUDY SETS
CREATE TABLE IF NOT EXISTS public.study_sets (
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

-- 4. CARDS
CREATE TABLE IF NOT EXISTS public.cards (
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

-- 5. USER CARD PROGRESS (SRS)
CREATE TABLE IF NOT EXISTS public.user_card_progress (
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

-- 6. STUDY LOGS
CREATE TABLE IF NOT EXISTS public.study_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    rating review_rating NOT NULL,
    time_taken_ms INT,
    reviewed_date DATE DEFAULT CURRENT_DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_user_card_progress_due 
    ON public.user_card_progress (user_id, next_review_at ASC);

CREATE INDEX IF NOT EXISTS idx_user_card_progress_stages 
    ON public.user_card_progress (user_id, box_level, state);

CREATE INDEX IF NOT EXISTS idx_cards_set_id ON public.cards (set_id, order_index ASC);
CREATE INDEX IF NOT EXISTS idx_study_sets_user ON public.study_sets (user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_study_logs_heatmap ON public.study_logs (user_id, reviewed_date);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
    CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);

    DROP POLICY IF EXISTS "Users can manage own folders" ON public.folders;
    CREATE POLICY "Users can manage own folders" ON public.folders FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can manage own study sets" ON public.study_sets;
    CREATE POLICY "Users can manage own study sets" ON public.study_sets FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Anyone can view public study sets" ON public.study_sets;
    CREATE POLICY "Anyone can view public study sets" ON public.study_sets FOR SELECT USING (is_public = TRUE);

    DROP POLICY IF EXISTS "Card owner full access" ON public.cards;
    CREATE POLICY "Card owner full access" ON public.cards FOR ALL USING (
        EXISTS (SELECT 1 FROM public.study_sets WHERE study_sets.id = cards.set_id AND study_sets.user_id = auth.uid())
    );

    DROP POLICY IF EXISTS "Public cards readable" ON public.cards;
    CREATE POLICY "Public cards readable" ON public.cards FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.study_sets WHERE study_sets.id = cards.set_id AND study_sets.is_public = TRUE)
    );

    DROP POLICY IF EXISTS "User progress self access" ON public.user_card_progress;
    CREATE POLICY "User progress self access" ON public.user_card_progress FOR ALL USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Study logs self access" ON public.study_logs;
    CREATE POLICY "Study logs self access" ON public.study_logs FOR ALL USING (auth.uid() = user_id);
END $$;

-- TRIGGER AUTO CREATE PROFILE ON USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
