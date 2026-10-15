import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStudySetById, getCardsBySetId } from '@/services/api/studySetService';
import { submitCardReview } from '@/services/api/srsService';
import { StudySet, Card as CardType } from '@/types/database.types';
import { FlashcardViewer, ReviewRating } from '@/features/flashcards/components/FlashcardViewer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  RotateCcw, 
  Shuffle, 
  Sparkles, 
  Trophy, 
  CheckCircle2,
  BookOpen
} from 'lucide-react';

export const StudyPage: React.FC = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();

  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [stats, setStats] = useState<{ again: number; hard: number; good: number; easy: number }>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  const loadData = useCallback(async () => {
    if (!setId) return;
    setLoading(true);
    setIsFinished(false);
    try {
      const [setData, cardsData] = await Promise.all([
        getStudySetById(setId),
        getCardsBySetId(setId),
      ]);
      setStudySet(setData);
      setCards(cardsData);
    } catch (err) {
      console.error('Lỗi tải dữ liệu học:', err);
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShuffle = () => {
    setCards((prev) => [...prev].sort(() => 0.5 - Math.random()));
  };

  const handleRestart = () => {
    setIsFinished(false);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    loadData();
  };

  const handleRatingSubmit = (cardId: string, rating: ReviewRating) => {
    setStats((prev) => ({
      ...prev,
      [rating]: prev[rating] + 1,
    }));
    submitCardReview(cardId, rating).catch((err) => {
      console.warn('[StudyPage] Error updating SRS rating:', err);
    });
  };

  const handleFinish = () => {
    setIsFinished(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Đang chuẩn bị bộ thẻ học 3D...</p>
        </div>
      </div>
    );
  }

  if (!studySet || cards.length === 0) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
          <BookOpen className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold">Bộ thẻ chưa có từ vựng</h2>
        <p className="text-xs text-muted-foreground">Hãy thêm từ vựng hoặc nạp file TSV vào bộ thẻ trước khi bắt đầu học.</p>
        <Link to={`/sets/${setId || ''}`}>
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Trở về bộ thẻ</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/sets/${studySet.id}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát chế độ học</span>
          </Link>
          <span className="text-muted-foreground/40">|</span>
          <h1 className="text-sm font-bold text-foreground line-clamp-1 max-w-sm sm:max-w-md">
            {studySet.title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs rounded-xl h-8"
            onClick={handleShuffle}
            title="Xáo trộn thứ tự từ"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xáo trộn</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs rounded-xl h-8"
            onClick={handleRestart}
            title="Học lại từ đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Học lại</span>
          </Button>
        </div>
      </div>

      {/* Main Study Area */}
      {!isFinished ? (
        <FlashcardViewer
          cards={cards}
          onRatingSubmit={handleRatingSubmit}
          onFinish={handleFinish}
          autoPlayAudio={false}
        />
      ) : (
        /* Session Complete Card */
        <div className="max-w-lg mx-auto py-8 text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center shadow-lg">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight text-foreground font-sans">
              Tuyệt vời! Bạn đã hoàn thành! 🎉
            </h2>
            <p className="text-sm text-muted-foreground">
              Bạn đã ôn tập xong toàn bộ <strong>{cards.length}</strong> từ vựng trong bộ thẻ này.
            </p>
          </div>

          {/* Review Session Stats */}
          <div className="grid grid-cols-4 gap-2 p-4 rounded-2xl border bg-card">
            <div className="text-center p-2 rounded-xl bg-red-50/60 dark:bg-red-950/30">
              <span className="text-xs text-red-600 font-bold block">Again</span>
              <span className="text-xl font-extrabold text-foreground">{stats.again}</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-amber-50/60 dark:bg-amber-950/30">
              <span className="text-xs text-amber-600 font-bold block">Hard</span>
              <span className="text-xl font-extrabold text-foreground">{stats.hard}</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-blue-50/60 dark:bg-blue-950/30">
              <span className="text-xs text-blue-600 font-bold block">Good</span>
              <span className="text-xl font-extrabold text-foreground">{stats.good}</span>
            </div>
            <div className="text-center p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30">
              <span className="text-xs text-emerald-600 font-bold block">Easy</span>
              <span className="text-xl font-extrabold text-foreground">{stats.easy}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button onClick={handleRestart} variant="outline" className="w-full sm:w-auto gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>Học lại bộ này</span>
            </Button>
            <Link to={`/sets/${studySet.id}`} className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto gap-2 shadow-md">
                <CheckCircle2 className="w-4 h-4" />
                <span>Xem danh sách từ</span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
