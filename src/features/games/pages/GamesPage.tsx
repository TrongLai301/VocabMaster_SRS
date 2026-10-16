import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getStudySets, getCardsBySetId } from '@/services/api/studySetService';
import { StudySet, Card as CardType } from '@/types/database.types';
import { QuizGame } from '@/features/games/components/QuizGame';
import { MatchGame } from '@/features/games/components/MatchGame';
import { DictationGame } from '@/features/games/components/DictationGame';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CustomSelect } from '@/components/ui/custom-select';
import { 
  Trophy, 
  Zap, 
  HelpCircle, 
  ArrowLeft, 
  Layers,
  Sparkles,
  Headphones,
  Keyboard
} from 'lucide-react';

type GameMode = 'menu' | 'quiz' | 'match' | 'dictation';

export const GamesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const querySetId = searchParams.get('setId') || '';
  const queryMode = (searchParams.get('mode') as GameMode) || 'menu';

  const [sets, setSets] = useState<StudySet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string>(querySetId);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>(
    ['quiz', 'match', 'dictation'].includes(queryMode) ? queryMode : 'menu'
  );

  // Tải danh sách bộ thẻ và tự động tải từ vựng cho bộ được chọn
  const loadSets = useCallback(async () => {
    setLoading(true);
    setCardsLoading(true);
    try {
      const data = await getStudySets();
      setSets(data);
      let targetSetId = querySetId;
      if (data.length > 0) {
        if (!querySetId || !data.some((s) => s.id === querySetId)) {
          targetSetId = selectedSetId || data[0].id;
        }
      }
      if (targetSetId) {
        setSelectedSetId(targetSetId);
        const cardList = await getCardsBySetId(targetSetId);
        setCards(cardList);
      }
    } catch (err) {
      console.error('[GamesPage] Error loading sets and cards:', err);
    } finally {
      setLoading(false);
      setCardsLoading(false);
    }
  }, [querySetId, selectedSetId]);

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  const handleSelectSet = async (newSetId: string) => {
    setSelectedSetId(newSetId);
    setCardsLoading(true);
    try {
      const cardList = await getCardsBySetId(newSetId);
      setCards(cardList);
    } catch (err) {
      console.error('[GamesPage] Error loading cards:', err);
    } finally {
      setCardsLoading(false);
    }
  };

  const selectedSet = sets.find((s) => s.id === selectedSetId);

  if (loading || (gameMode !== 'menu' && cardsLoading)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Đang tải dữ liệu trò chơi...</p>
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

  // Chế độ chơi Nghe - Viết (Dictation Mode)
  if (gameMode === 'dictation') {
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

        <DictationGame cards={cards} onExit={() => setGameMode('menu')} />
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
            <Badge variant="secondary" className="gap-1 text-xs font-semibold">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              <span>3 Chế độ chơi</span>
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Luyện tập phản xạ ghi nhớ từ vựng qua Trắc nghiệm, Ghép thẻ tính giờ và Luyện gõ điền từ.
          </p>
        </div>

        {/* Study Set Selector */}
        {sets.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Chọn bộ thẻ:
            </span>
            <div className="w-full sm:w-64">
              <CustomSelect
                value={selectedSetId}
                onChange={handleSelectSet}
                options={sets.map((s) => ({
                  value: s.id,
                  label: `${s.title} (${s.total_cards || 0} từ)`,
                  icon: <Layers className="w-4 h-4 text-primary" />,
                }))}
                placeholder="Chọn bộ thẻ..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Selected Set Overview Card */}
      {selectedSet && (
        <div className="p-5 rounded-2xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
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
              {cards.length >= 4
                ? 'Đủ điều kiện chơi cả 3 chế độ'
                : cards.length >= 2
                  ? 'Đủ điều kiện Ghép từ & Luyện gõ (Cần 4 từ cho Trắc nghiệm)'
                  : 'Cần tối thiểu 2 từ để bắt đầu'}
            </Badge>
          </div>
        </div>
      )}

      {/* Game Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Game 1: Multiple Choice Quiz */}
        <div className="group rounded-3xl border bg-card p-6 space-y-5 hover:border-primary/60 hover:shadow-xl transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <HelpCircle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-foreground font-sans">
                  Trắc Nghiệm (Quiz)
                </h3>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  4 Đáp Án
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Thử thách phản xạ nhanh với 4 phương án ngẫu nhiên. Trả lời liên tiếp để kích hoạt chuỗi Combo điểm thưởng cực cao!
              </p>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground/90 font-medium">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span className="line-clamp-1">Tự động sinh đề với đáp án nhiễu</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span className="line-clamp-1">Phím tắt số [1], [2], [3], [4]</span>
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
        <div className="group rounded-3xl border bg-card p-6 space-y-5 hover:border-primary/60 hover:shadow-xl transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Zap className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-foreground font-sans">
                  Ghép Thẻ (Match)
                </h3>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  Speed Run
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nối các cặp Từ vựng & Định nghĩa trên lưới thẻ trong thời gian ngắn nhất có thể. Đua top với kỷ lục cá nhân của chính bạn!
              </p>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground/90 font-medium">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="line-clamp-1">Bấm giờ mili-giây thời gian thực</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="line-clamp-1">Lưu kỷ lục hoàn thành tốt nhất</span>
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

        {/* Game 3: Dictation & Typing Mode */}
        <div className="group rounded-3xl border bg-card p-6 space-y-5 hover:border-emerald-500/60 hover:shadow-xl transition-all flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Headphones className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-foreground font-sans">
                  Luyện Gõ & Điền Từ
                </h3>
                <Badge variant="secondary" className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10">
                  3 Chế Độ
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Đa dạng 3 hình thức luyện tập: Nghe phát âm điền từ, Nhìn nghĩa đoán từ tiếng Anh, và Nhìn từ gõ nghĩa tiếng Việt!
              </p>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground/90 font-medium">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="line-clamp-1">Nghe phát âm chuẩn + Nhìn nghĩa điền từ</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="line-clamp-1">Nhìn từ điền nghĩa + Đối chiếu từng ký tự</span>
              </div>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full gap-2 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer"
            disabled={cards.length < 1}
            onClick={() => setGameMode('dictation')}
          >
            <Headphones className="w-4 h-4" />
            <span>Bắt đầu Luyện Gõ</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
