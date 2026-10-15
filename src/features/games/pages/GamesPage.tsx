import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getStudySets, getCardsBySetId } from '@/services/api/studySetService';
import { StudySet, Card as CardType } from '@/types/database.types';
import { QuizGame } from '@/features/games/components/QuizGame';
import { MatchGame } from '@/features/games/components/MatchGame';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Zap, 
  HelpCircle, 
  BookOpen, 
  ArrowLeft, 
  Layers,
  Sparkles
} from 'lucide-react';

type GameMode = 'menu' | 'quiz' | 'match';

export const GamesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const querySetId = searchParams.get('setId') || '';
  const queryMode = (searchParams.get('mode') as GameMode) || 'menu';

  const [sets, setSets] = useState<StudySet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>(querySetId);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>(
    ['quiz', 'match'].includes(queryMode) ? queryMode : 'menu'
  );

  // Tải danh sách bộ thẻ của người dùng
  const loadSets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStudySets();
      setSets(data);
      if (data.length > 0) {
        if (querySetId && data.some((s) => s.id === querySetId)) {
          setSelectedSetId(querySetId);
        } else if (!selectedSetId) {
          setSelectedSetId(data[0].id);
        }
      }
    } catch (err) {
      console.error('[GamesPage] Error loading sets:', err);
    } finally {
      setLoading(false);
    }
  }, [querySetId, selectedSetId]);

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  // Tải thẻ của bộ được chọn
  useEffect(() => {
    if (!selectedSetId) return;
    getCardsBySetId(selectedSetId).then((cardList) => {
      setCards(cardList);
    });
  }, [selectedSetId]);

  const selectedSet = sets.find((s) => s.id === selectedSetId);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Đang tải trung tâm trò chơi...</p>
        </div>
      </div>
    );
  }

  // Chế độ chơi Quiz
  if (gameMode === 'quiz') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGameMode('menu')}
            className="gap-2 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát về Menu Trò chơi</span>
          </Button>

          <span className="text-xs font-bold text-muted-foreground line-clamp-1">
            Bộ: {selectedSet?.title}
          </span>
        </div>

        <QuizGame cards={cards} onExit={() => setGameMode('menu')} />
      </div>
    );
  }

  // Chế độ chơi Match Game
  if (gameMode === 'match') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setGameMode('menu')}
            className="gap-2 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát về Menu Trò chơi</span>
          </Button>

          <span className="text-xs font-bold text-muted-foreground line-clamp-1">
            Bộ: {selectedSet?.title}
          </span>
        </div>

        <MatchGame cards={cards} onExit={() => setGameMode('menu')} />
      </div>
    );
  }

  // MENU LỰA CHỌN CHẾ ĐỘ CHƠI
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-8 select-none">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground font-sans">
              Khu Vực Trò Chơi Ôn Tập
            </h1>
            <Badge variant="secondary" className="gap-1 font-mono text-xs">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>Phase 5 Gamification</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Luyện tập phản xạ ghi nhớ từ vựng qua các mini-game trắc nghiệm và ghép thẻ tính giờ.
          </p>
        </div>

        {/* Study Set Selector */}
        {sets.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Chọn bộ thẻ:
            </span>
            <select
              value={selectedSetId}
              onChange={(e) => setSelectedSetId(e.target.value)}
              className="h-9 px-3 py-1 text-xs rounded-xl border bg-card text-foreground font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer max-w-xs truncate"
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.total_cards} từ)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Selected Set Overview Card */}
      {selectedSet && (
        <div className="p-5 rounded-2xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground line-clamp-1">{selectedSet.title}</h3>
              <p className="text-xs text-muted-foreground">
                Tổng cộng <strong>{cards.length} từ vựng</strong> sẵn sàng để bắt đầu trò chơi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {cards.length >= 4 ? 'Đủ điều kiện chơi cả 2 chế độ' : 'Cần tối thiểu 2 từ'}
            </Badge>
          </div>
        </div>
      )}

      {/* Game Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Game 1: Multiple Choice Quiz */}
        <div className="group rounded-3xl border bg-card p-6 sm:p-8 space-y-5 hover:border-primary/60 hover:shadow-xl transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <HelpCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-foreground font-sans">
                  Trắc Nghiệm Tốc Độ (Quiz)
                </h3>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  4 Đáp Án
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Thử thách phản xạ nhanh với 4 phương án ngẫu nhiên. Trả lời liên tiếp để kích hoạt chuỗi Combo điểm thưởng cực cao!
              </p>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground/90 font-medium">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Tự động sinh đề với đáp án nhiễu thông minh</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>Phím tắt số [1], [2], [3], [4] thao tác cực nhanh</span>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full gap-2 rounded-xl font-bold shadow-md cursor-pointer"
            disabled={cards.length < 2}
            onClick={() => setGameMode('quiz')}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Bắt đầu Trắc nghiệm</span>
          </Button>
        </div>

        {/* Game 2: Speed Match Game */}
        <div className="group rounded-3xl border bg-card p-6 sm:p-8 space-y-5 hover:border-primary/60 hover:shadow-xl transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-extrabold text-foreground font-sans">
                  Ghép Thẻ Tính Giờ (Match)
                </h3>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  Speed Run
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Nối các cặp Từ vựng & Định nghĩa trên lưới thẻ trong thời gian ngắn nhất có thể. Đua top với kỷ lục cá nhân của chính bạn!
              </p>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground/90 font-medium">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Đồng hồ bấm giờ mili-giây thời gian thực</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Tự động lưu và so sánh Kỷ lục hoàn thành tốt nhất</span>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            variant="outline"
            className="w-full gap-2 rounded-xl font-bold border-amber-300 dark:border-amber-800 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/40 shadow-sm cursor-pointer"
            disabled={cards.length < 2}
            onClick={() => setGameMode('match')}
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Bắt đầu Ghép từ</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
