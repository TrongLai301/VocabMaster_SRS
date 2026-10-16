import React, { useState, useEffect, useCallback } from 'react';
import { 
  fetchStudyHeatmapData, 
  calculateStreak, 
  DailyActivityMap, 
  UserStreakInfo 
} from '@/services/api/analyticsService';
import { fetchMemoryStageStats, MemoryStageStats } from '@/services/api/srsService';
import { StreakHeatmap } from '@/features/analytics/components/StreakHeatmap';
import { MemoryBoxDistribution } from '@/features/srs/components/MemoryBoxDistribution';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Flame, 
  Trophy, 
  Brain, 
  Calendar, 
  Sparkles,
  Layers,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<DailyActivityMap>({});
  const [streakInfo, setStreakInfo] = useState<UserStreakInfo>({
    currentStreak: 0,
    longestStreak: 0,
    totalReviews: 0,
    activeDaysCount: 0,
  });
  const [stageStats, setStageStats] = useState<MemoryStageStats>({
    box1: 0,
    box2: 0,
    box3: 0,
    box4: 0,
    box5: 0,
    totalCards: 0,
    totalDue: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [heatmap, streak, stages] = await Promise.all([
        fetchStudyHeatmapData(),
        calculateStreak(),
        fetchMemoryStageStats(),
      ]);

      setHeatmapData(heatmap);
      setStreakInfo(streak);
      setStageStats(stages);
    } catch (err) {
      console.error('[AnalyticsPage] Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Đang tải biểu đồ và thống kê chuyên cần...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8 select-none">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground font-sans">
              Thống Kê & Chuyên Cần
            </h1>
            <Badge variant="secondary" className="gap-1 text-xs font-semibold">
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              <span>Báo cáo học tập</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Theo dõi chuỗi học tập hàng ngày, biểu đồ nhiệt đóng góp và phân bổ 5 cấp độ trí nhớ dài hạn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 font-bold text-xs">
            <Flame className="w-4 h-4 fill-amber-500" />
            <span>Chuỗi: {streakInfo.currentStreak} ngày liên tiếp</span>
          </div>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Current Streak */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Chuỗi hiện tại
              </span>
              <p className="text-3xl font-black text-foreground font-mono">
                {streakInfo.currentStreak} <span className="text-sm font-semibold text-muted-foreground">ngày</span>
              </p>
              <span className="text-[11px] text-amber-600 font-medium">Học liên tục mỗi ngày</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Flame className="w-6 h-6 fill-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Longest Streak */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Kỷ lục chuỗi dài nhất
              </span>
              <p className="text-3xl font-black text-foreground font-mono">
                {streakInfo.longestStreak} <span className="text-sm font-semibold text-muted-foreground">ngày</span>
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">Thành tích xuất sắc</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Total Reviews */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Tổng lượt ôn tập
              </span>
              <p className="text-3xl font-black text-foreground font-mono">
                {streakInfo.totalReviews}
              </p>
              <span className="text-[11px] text-muted-foreground font-medium">
                {streakInfo.activeDaysCount} ngày hoạt động
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Mastered Words */}
        <Card className="hover:border-primary/50 transition-all hover:shadow-md">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Từ đã khắc sâu
              </span>
              <p className="text-3xl font-black text-foreground font-mono">
                {stageStats.box4 + stageStats.box5}
              </p>
              <span className="text-[11px] text-emerald-600 font-medium">
                Hộp 4 & 5 (Trí nhớ dài hạn)
              </span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GitHub-style Activity Heatmap */}
      <div>
        <StreakHeatmap data={heatmapData} />
      </div>

      {/* MochiMochi 5 Memory Stages Distribution */}
      <div>
        <MemoryBoxDistribution stats={stageStats} />
      </div>
    </div>
  );
};
