import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  fetchDueCards, 
  fetchNewUnreviewedCards, 
  fetchMemoryStageStats, 
  submitCardReview, 
  DueCardItem, 
  MemoryStageStats 
} from '@/services/api/srsService';
import { Card as CardType } from '@/types/database.types';
import { ReviewRating } from '@/services/srs/sm2';
import { FlashcardViewer } from '@/features/flashcards/components/FlashcardViewer';
import { MemoryBoxDistribution } from '@/features/srs/components/MemoryBoxDistribution';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  CheckCircle2, 
  Trophy, 
  RotateCcw, 
  Layers, 
  BookOpen, 
  Flame,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { soundFX } from '@/lib/audioFX';

export const DailyReviewPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dueCards, setDueCards] = useState<DueCardItem[]>([]);
  const [activeCards, setActiveCards] = useState<CardType[]>([]);
  const [stats, setStats] = useState<MemoryStageStats>({
    box1: 0,
    box2: 0,
    box3: 0,
    box4: 0,
    box5: 0,
    totalCards: 0,
    totalDue: 0,
  });
  const [sessionStats, setSessionStats] = useState<{
    again: number;
    hard: number;
    good: number;
    easy: number;
  }>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [isFinished, setIsFinished] = useState(false);
  const [isLearningNew, setIsLearningNew] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setIsFinished(false);
    try {
      const [dueData, stageStats] = await Promise.all([
        fetchDueCards(),
        fetchMemoryStageStats(),
      ]);

      setDueCards(dueData);
      setActiveCards(dueData.map((d) => d.card));
      setStats(stageStats);
      setIsLearningNew(false);
    } catch (err) {
      console.error('[DailyReviewPage] Error loading SRS data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Nạp thêm từ mới chưa học từ các bộ thẻ của người dùng
  const handleLoadNewCards = async () => {
    setLoading(true);
    try {
      const newCards = await fetchNewUnreviewedCards(undefined, 15);
      if (newCards.length > 0) {
        setActiveCards(newCards);
        setIsLearningNew(true);
        setIsFinished(false);
      }
    } catch (err) {
      console.error('[DailyReviewPage] Error loading new cards:', err);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý khi người dùng đánh giá thẻ (Again / Hard / Good / Easy)
  const handleRatingSubmit = async (cardId: string, rating: ReviewRating) => {
    // 1. Cập nhật thống kê phiên học
    setSessionStats((prev) => ({
      ...prev,
      [rating]: prev[rating] + 1,
    }));

    // 2. Gửi mutation SM-2 Spaced Repetition vào database
    try {
      await submitCardReview(cardId, rating);
      // Cập nhật lại chỉ số memory stage ngầm
      fetchMemoryStageStats().then((newStats) => setStats(newStats));
    } catch (err) {
      console.error('[DailyReviewPage] Error submitting card review:', err);
    }
  };

  const handleFinish = () => {
    soundFX.playVictory();
    toast.success('Xuất sắc! Bạn đã hoàn thành phiên ôn tập ngắt quãng hôm nay! 🎉');
    setIsFinished(true);
  };

  const handleRestart = () => {
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">
            Đang tải hàng đợi ôn tập SuperMemo SM-2...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-foreground font-sans">
              Ôn Tập Hôm Nay (Spaced Repetition)
            </h1>
            <Badge variant="secondary" className="gap-1 text-xs font-mono font-bold">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>SM-2 Engine</span>
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Hệ thống tự động tính toán thời điểm vàng não bộ sắp quên để nhắc bạn ôn tập.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-600 dark:text-amber-400 font-bold text-xs">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>Đến hạn hôm nay: {dueCards.length} từ</span>
          </div>
        </div>
      </div>

      {/* Main Review Session */}
      {!isFinished && activeCards.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">
                {isLearningNew ? 'Đang học từ mới' : 'Đang ôn thẻ đến hạn'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {activeCards.length} thẻ
              </span>
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleRestart}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Bắt đầu lại</span>
            </Button>
          </div>

          {/* Flashcard 3D Viewer */}
          <FlashcardViewer
            cards={activeCards}
            onRatingSubmit={handleRatingSubmit}
            onFinish={handleFinish}
            autoPlayAudio={false}
          />
        </div>
      ) : isFinished ? (
        /* Review Complete Celebration Screen */
        <div className="max-w-xl mx-auto py-10 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center shadow-lg">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-foreground font-sans">
              Hoàn thành phiên ôn tập! 🎉
            </h2>
            <p className="text-sm text-muted-foreground">
              Bạn đã xem xét xong toàn bộ <strong>{activeCards.length}</strong> từ vựng. Trí nhớ của bạn đang được củng cố theo chu kỳ ngắt quãng.
            </p>
          </div>

          {/* Rating Breakdown */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 p-4 rounded-2xl border bg-card">
            <div className="text-center p-2 rounded-xl bg-red-50/60 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
              <span className="text-xs text-red-600 font-bold block">Again [1]</span>
              <span className="text-2xl font-black text-foreground font-mono">{sessionStats.again}</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
              <span className="text-xs text-amber-600 font-bold block">Hard [2]</span>
              <span className="text-2xl font-black text-foreground font-mono">{sessionStats.hard}</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
              <span className="text-xs text-blue-600 font-bold block">Good [3]</span>
              <span className="text-2xl font-black text-foreground font-mono">{sessionStats.good}</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
              <span className="text-xs text-emerald-600 font-bold block">Easy [4]</span>
              <span className="text-2xl font-black text-foreground font-mono">{sessionStats.easy}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button onClick={handleRestart} variant="outline" className="w-full sm:w-auto gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>Ôn tập lại từ đầu</span>
            </Button>
            <Button onClick={handleLoadNewCards} className="w-full sm:w-auto gap-2 shadow-md">
              <Sparkles className="w-4 h-4" />
              <span>Học thêm từ mới</span>
            </Button>
          </div>
        </div>
      ) : (
        /* Empty Queue State: No cards due today */
        <div className="max-w-xl mx-auto py-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shadow-md">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Hôm nay bạn không có từ nào cần ôn tập! 🎉
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Bạn đã ôn hết các từ đến hạn. Hãy học thêm từ vựng mới hoặc quay lại vào ngày mai khi có từ mới bước vào chu kỳ ôn tập.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button onClick={handleLoadNewCards} className="w-full sm:w-auto gap-2 shadow-md font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Học từ mới ngay</span>
            </Button>
            <Link to="/sets" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Khám phá bộ thẻ</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* MochiMochi 5 Memory Stages Distribution Widget */}
      <div className="pt-4">
        <MemoryBoxDistribution stats={stats} />
      </div>
    </div>
  );
};
