import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { fetchMemoryStageStats, MemoryStageStats } from '@/services/api/srsService';
import { fetchStudyHeatmapData, DailyActivityMap } from '@/services/api/analyticsService';
import { MemoryBoxDistribution } from '@/features/srs/components/MemoryBoxDistribution';
import { StreakHeatmap } from '@/features/analytics/components/StreakHeatmap';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Layers, 
  PlusCircle, 
  Flame, 
  Brain, 
  BookOpen, 
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Trophy,
  Zap,
  HelpCircle,
  Headphones,
  BarChart3
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, profile, isConfigured } = useAuth();
  const [srsStats, setSrsStats] = useState<MemoryStageStats>({
    box1: 0,
    box2: 0,
    box3: 0,
    box4: 0,
    box5: 0,
    totalCards: 0,
    totalDue: 0,
  });
  const [heatmapData, setHeatmapData] = useState<DailyActivityMap>({});

  useEffect(() => {
    fetchMemoryStageStats().then((data) => {
      setSrsStats(data);
    }).catch((err) => {
      console.warn('[DashboardPage] Error loading SRS stats:', err);
    });

    fetchStudyHeatmapData().then((data) => {
      setHeatmapData(data);
    }).catch((err) => {
      console.warn('[DashboardPage] Error loading Heatmap:', err);
    });
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Banner cảnh báo nếu chưa điền credentials Supabase */}
      {!isConfigured && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 p-5 text-amber-900 dark:text-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-300">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm">Chế độ Demo cục bộ (Chưa kết nối Supabase)</h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                Vui lòng điền <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code> vào file <code>.env</code> để đồng bộ dữ liệu vào PostgreSQL.
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">
            Cấu hình Supabase
          </Badge>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-background p-8 sm:p-10 shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Spaced Repetition System (SRS SM-2)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Chào mừng {profile?.display_name || user?.email?.split('@')[0] || 'bạn'} trở lại! 👋
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
            Học ít hơn, nhớ lâu hơn với phương pháp lặp lại ngắt quãng khoa học. Hệ thống tự động phân phối thời gian ôn tập tối ưu để đưa từ vựng vào trí nhớ vĩnh viễn.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/review">
              <Button size="lg" className="rounded-xl shadow-md gap-2 font-semibold">
                <Layers className="w-4 h-4" />
                <span>Bắt đầu ôn tập hôm nay</span>
              </Button>
            </Link>
            <Link to="/sets">
              <Button variant="outline" size="lg" className="rounded-xl gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Xem bộ thẻ</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Decorative Background Blob */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/review" className="block">
          <Card className="hover:border-primary/50 transition-all hover:shadow-md cursor-pointer">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cần ôn hôm nay</span>
                <p className="text-3xl font-extrabold text-foreground font-mono">{srsStats.totalDue}</p>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {srsStats.totalDue > 0 ? 'Nhấn để ôn tập ngay' : 'Đã hoàn thành mục tiêu'}
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:border-primary/50 transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Chuỗi chuyên cần</span>
              <p className="text-3xl font-extrabold text-foreground font-mono">{profile?.current_streak || 0} ngày</p>
              <span className="text-[11px] text-amber-600 font-medium">Duy trì hàng ngày</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-6 h-6 fill-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Từ đã thành thạo</span>
              <p className="text-3xl font-extrabold text-foreground font-mono">{srsStats.box5}</p>
              <span className="text-[11px] text-muted-foreground">Hộp 5 (Mastered &gt;= 30 ngày)</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mục tiêu hằng ngày</span>
              <p className="text-3xl font-extrabold text-foreground">{profile?.daily_goal_cards || 20} thẻ</p>
              <span className="text-[11px] text-muted-foreground">Tiến độ hôm nay: 0%</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feature Navigation Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Study Sets Fast Action */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Bộ thẻ từ vựng & Thư mục</h3>
                <p className="text-xs text-muted-foreground">Quản lý theo chủ đề và nạp hàng loạt bằng TSV</p>
              </div>
            </div>
            <Link to="/sets">
              <Button size="sm" variant="ghost" className="gap-1">
                <span>Xem tất cả</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground space-y-3">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-muted-foreground/60" />
            <p>Hỗ trợ nhập trực tiếp từ clipboard định dạng: <code>Word \t Synonyms \t IPA \t POS \t Example \t Definition</code></p>
            <Link to="/sets">
              <Button size="sm" className="gap-1.5">
                <PlusCircle className="w-4 h-4" />
                <span>Khám phá bộ thẻ</span>
              </Button>
            </Link>
          </div>
        </Card>

        {/* 5 Memory Stages Distribution (MochiMochi Style) */}
        <div>
          <MemoryBoxDistribution stats={srsStats} />
        </div>
      </div>

      {/* Gamification Hub Fast Action */}
      <div className="rounded-3xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-tight">Đấu Trường Trò Chơi Ôn Tập (Gamification)</h3>
              <p className="text-xs text-muted-foreground">Tăng tốc độ phản xạ và củng cố trí nhớ với các chế độ chơi kịch tính</p>
            </div>
          </div>
          <Link to="/games">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs font-semibold">
              <span>Đến phòng Games</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/games?mode=quiz" className="block group">
            <div className="h-full rounded-2xl border p-5 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent hover:border-indigo-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-indigo-600 transition-colors">Trắc Nghiệm 4 Đáp Án</h4>
                </div>
                <p className="text-xs text-muted-foreground pl-10">
                  Chọn 1 trong 4 đáp án đúng, chuỗi combo điểm thưởng kèm phát âm tự động.
                </p>
              </div>
              <div className="flex justify-end pt-3">
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          <Link to="/games?mode=match" className="block group">
            <div className="h-full rounded-2xl border p-5 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent hover:border-amber-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-amber-600 transition-colors">Ghép Từ Nhanh (Match)</h4>
                </div>
                <p className="text-xs text-muted-foreground pl-10">
                  Lưới thẻ phản xạ tính giờ mili-giây, shake animation khi ghép sai và lưu kỷ lục.
                </p>
              </div>
              <div className="flex justify-end pt-3">
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>

          <Link to="/games?mode=dictation" className="block group">
            <div className="h-full rounded-2xl border p-5 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-sm text-foreground group-hover:text-emerald-600 transition-colors">Luyện Gõ & Điền Từ</h4>
                </div>
                <p className="text-xs text-muted-foreground pl-10">
                  Nghe âm đoán từ, nhìn nghĩa điền tiếng Anh, nhìn từ gõ tiếng Việt với 3 chế độ.
                </p>
              </div>
              <div className="flex justify-end pt-3">
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-foreground">Chuyên Cần & Nhật Ký Hoạt Động</h3>
            <Badge variant="outline" className="text-[11px] font-mono">17 tuần</Badge>
          </div>
          <Link to="/analytics" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <span>Chi tiết báo cáo</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <StreakHeatmap data={heatmapData} daysCount={119} />
      </div>
    </div>
  );
};
