import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Flame, 
  Moon, 
  Sun, 
  LogOut, 
  Folder, 
  Layers, 
  RotateCcw,
  Trophy, 
  BarChart3,
  User,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';

import { fetchMemoryStageStats } from '@/services/api/srsService';
import { calculateStreak } from '@/services/api/analyticsService';
import { soundFX } from '@/lib/audioFX';

export const Navbar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [streak, setStreak] = useState(() => profile?.current_streak || 0);
  const [soundEnabled, setSoundEnabled] = useState(() => soundFX.getSoundEnabled());
  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (profile?.current_streak !== undefined) {
      setStreak(profile.current_streak);
    }
  }, [profile?.current_streak]);

  useEffect(() => {
    fetchMemoryStageStats()
      .then((data) => setDueCount(data.totalDue))
      .catch(() => {});

    // Tính toán lại chuỗi Streak ngay khi nạp ứng dụng để cập nhật chính xác từ study_logs
    calculateStreak()
      .then((info) => {
        setStreak(info.currentStreak);
      })
      .catch(() => {});

    const handleStreakUpdate = (e: any) => {
      if (typeof e.detail?.currentStreak === 'number') {
        setStreak(e.detail.currentStreak);
      }
    };

    window.addEventListener('vocab_streak_updated', handleStreakUpdate as EventListener);
    return () => {
      window.removeEventListener('vocab_streak_updated', handleStreakUpdate as EventListener);
    };
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    soundFX.setSoundEnabled(next);
    setSoundEnabled(next);
    if (next) soundFX.playSuccess();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md transition-colors">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent font-extrabold text-xl">
              VocabMaster
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              to="/sets"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Layers className="w-4 h-4 text-primary" />
              <span>Bộ thẻ</span>
            </Link>
            <Link
              to="/review"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ôn tập hôm nay</span>
              {dueCount !== null && dueCount > 0 ? (
                <Badge className="h-4 px-1.5 text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-full">
                  {dueCount}
                </Badge>
              ) : (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </Link>
            <Link
              to="/games"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <Trophy className="w-4 h-4" />
              <span>Trò chơi</span>
            </Link>
            <Link
              to="/analytics"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Thống kê</span>
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Streak Flame Badge */}
          <div className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 font-bold text-xs select-none">
            <Flame className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-amber-500 text-amber-500" />
            <span className="hidden sm:inline">{streak} ngày</span>
            <span className="sm:hidden">{streak}d</span>
          </div>

          {/* Sound FX Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-foreground"
            onClick={toggleSound}
            title={soundEnabled ? 'Tắt hiệu ứng âm thanh' : 'Bật hiệu ứng âm thanh'}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          {/* Dark / Light Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            title={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* User Profile / Auth State */}
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold leading-none">
                  {profile?.display_name || user.email?.split('@')[0]}
                </span>
                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 sm:px-3 text-xs gap-1.5 rounded-full"
                onClick={() => {
                  signOut();
                  navigate('/login');
                }}
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs">
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm" className="h-8 px-2.5 sm:px-3 text-xs gap-1 shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline sm:inline">Bắt đầu</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
