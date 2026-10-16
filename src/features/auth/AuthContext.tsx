import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { Profile } from '@/types/database.types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_PROFILE_KEY = 'vocab_local_profile';

function getInitialProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    if (raw) return JSON.parse(raw);
    const initial: Profile = {
      id: 'local-user',
      email: 'local@vocabmaster.app',
      display_name: 'Người học',
      avatar_url: null,
      current_streak: 0,
      longest_streak: 0,
      daily_goal_cards: 20,
      audio_auto_play: true,
      preferred_voice: 'en-US',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_active_at: new Date().toISOString(),
    };
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(initial));
    return initial;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(getInitialProfile);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      console.error('Lỗi lấy profile:', err);
    }
  };

  // Lắng nghe sự kiện cập nhật Streak để cập nhật ngay lập tức UI profile
  useEffect(() => {
    const handleStreakUpdate = (e: any) => {
      const { currentStreak, longestStreak } = e.detail || {};
      if (typeof currentStreak === 'number') {
        setProfile((prev) => {
          if (!prev) return prev;
          const updated: Profile = {
            ...prev,
            current_streak: currentStreak,
            longest_streak: Math.max(prev.longest_streak || 0, longestStreak ?? currentStreak),
          };
          if (!user) {
            try {
              localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(updated));
            } catch {
              // ignore
            }
          }
          return updated;
        });
      }
    };

    window.addEventListener('vocab_streak_updated', handleStreakUpdate as EventListener);
    return () => {
      window.removeEventListener('vocab_streak_updated', handleStreakUpdate as EventListener);
    };
  }, [user]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Lấy session ban đầu
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Lắng nghe thay đổi trạng thái đăng nhập
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(getInitialProfile());
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase chưa được cấu hình. Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: displayName || email.split('@')[0],
        },
      },
    });

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return { error: new Error('Supabase chưa được cấu hình. Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào file .env') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(getInitialProfile());
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    } else {
      setProfile(getInitialProfile());
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};
