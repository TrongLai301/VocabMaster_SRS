import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card as CardType } from '@/types/database.types';
import { useSpeechTTS } from '@/hooks/useSpeechTTS';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Timer, 
  RotateCcw, 
  Trophy, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  ArrowLeft 
} from 'lucide-react';
import { soundFX } from '@/lib/audioFX';

interface MatchTile {
  id: string; // unique tile id
  cardId: string;
  type: 'term' | 'definition';
  text: string;
  ipa?: string | null;
}

interface MatchGameProps {
  cards: CardType[];
  maxPairs?: number;
  onFinish?: (elapsedMs: number, moves: number) => void;
  onExit?: () => void;
}

export const MatchGame: React.FC<MatchGameProps> = ({
  cards,
  maxPairs = 6,
  onFinish,
  onExit,
}) => {
  const { speak } = useSpeechTTS();

  // Khởi tạo các cặp thẻ
  const setupTiles = useCallback(() => {
    const selectedCards = [...cards].sort(() => 0.5 - Math.random()).slice(0, maxPairs);
    const tiles: MatchTile[] = [];

    selectedCards.forEach((c) => {
      tiles.push({
        id: `term-${c.id}`,
        cardId: c.id,
        type: 'term',
        text: c.term,
        ipa: c.ipa,
      });
      tiles.push({
        id: `def-${c.id}`,
        cardId: c.id,
        type: 'definition',
        text: c.definition,
      });
    });

    return tiles.sort(() => 0.5 - Math.random());
  }, [cards, maxPairs]);

  const [tiles, setTiles] = useState<MatchTile[]>(setupTiles);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [matchedCardIds, setMatchedCardIds] = useState<Set<string>>(new Set());
  const [mismatchedTileIds, setMismatchedTileIds] = useState<[string, string] | null>(null);
  const [moves, setMoves] = useState(0);

  // Timer Stopwatch
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Highscore từ localStorage
  const bestTimeKey = `vocab_best_time_${cards[0]?.set_id || 'default'}`;
  const [bestTime, setBestTime] = useState<number | null>(() => {
    const saved = localStorage.getItem(bestTimeKey);
    return saved ? Number(saved) : null;
  });

  const totalPairs = Math.min(cards.length, maxPairs);
  const isCompleted = matchedCardIds.size === totalPairs && totalPairs > 0;

  // Khởi động đồng hồ khi bắt đầu tương tác
  useEffect(() => {
    if (isRunning && !isCompleted) {
      const start = Date.now() - elapsedMs;
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - start);
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, isCompleted]);

  // Hoàn thành trò chơi
  useEffect(() => {
    if (isCompleted) {
      soundFX.playVictory();
      setIsRunning(false);
      if (!bestTime || elapsedMs < bestTime) {
        setBestTime(elapsedMs);
        localStorage.setItem(bestTimeKey, String(elapsedMs));
      }
      if (onFinish) {
        onFinish(elapsedMs, moves);
      }
    }
  }, [isCompleted, elapsedMs, bestTime, bestTimeKey, moves, onFinish]);

  // Format thời gian MM:SS.s
  const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  };

  const handleTileClick = (tile: MatchTile) => {
    if (matchedCardIds.has(tile.cardId) || mismatchedTileIds) return;

    // Bắt đầu đếm giờ ở lần click đầu tiên
    if (!isRunning && !isCompleted) {
      setIsRunning(true);
    }

    // Nếu bấm lại chính thẻ đang chọn -> hủy chọn
    if (selectedTileId === tile.id) {
      setSelectedTileId(null);
      return;
    }

    // Nếu chưa chọn thẻ nào -> chọn thẻ này
    if (!selectedTileId) {
      setSelectedTileId(tile.id);
      return;
    }

    // Đã chọn thẻ 1, giờ bấm thẻ 2
    const firstTile = tiles.find((t) => t.id === selectedTileId);
    if (!firstTile) return;

    setMoves((prev) => prev + 1);

    // Kiểm tra khớp cặp: Cùng cardId và khác id
    if (firstTile.cardId === tile.cardId && firstTile.id !== tile.id) {
      // MATCH!
      soundFX.playSuccess();
      setMatchedCardIds((prev) => new Set(prev).add(tile.cardId));
      setSelectedTileId(null);

      // Phát âm từ vựng tương ứng
      const matchedCard = cards.find((c) => c.id === tile.cardId);
      if (matchedCard) {
        speak(matchedCard.term);
      }
    } else {
      // MISMATCH!
      soundFX.playError();
      setMismatchedTileIds([firstTile.id, tile.id]);
      setTimeout(() => {
        setMismatchedTileIds(null);
        setSelectedTileId(null);
      }, 550);
    }
  };

  const handleRestart = () => {
    setTiles(setupTiles());
    setSelectedTileId(null);
    setMatchedCardIds(new Set());
    setMismatchedTileIds(null);
    setMoves(0);
    setElapsedMs(0);
    setIsRunning(false);
  };

  if (cards.length < 2) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <Zap className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-bold">Cần tối thiểu 2 từ vựng</h3>
        <p className="text-xs text-muted-foreground">
          Hãy thêm hoặc nạp thêm từ vựng để chơi game ghép thẻ.
        </p>
        {onExit && (
          <Button onClick={onExit} variant="outline" size="sm">
            Quay lại
          </Button>
        )}
      </div>
    );
  }

  // MÀN HÌNH CHIẾN THẮNG
  if (isCompleted) {
    const isNewRecord = bestTime !== null && elapsedMs <= bestTime;

    return (
      <div className="max-w-lg mx-auto py-8 text-center space-y-6 animate-in zoom-in-95 duration-200 select-none">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center shadow-lg">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground font-sans">
            Tuyệt đỉnh! Bạn đã ghép xong! ⚡
          </h2>
          <p className="text-sm text-muted-foreground">
            Toàn bộ <strong>{totalPairs} cặp thẻ</strong> đã được ghép chính xác.
          </p>
        </div>

        {/* Results Box */}
        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl border bg-card">
          <div className="text-center p-3 rounded-xl bg-primary/5">
            <span className="text-xs text-muted-foreground font-semibold block">Thời gian</span>
            <span className="text-2xl font-black text-primary font-mono">{formatTime(elapsedMs)}</span>
          </div>

          <div className="text-center p-3 rounded-xl bg-muted/40">
            <span className="text-xs text-muted-foreground font-semibold block">Số lượt ghép</span>
            <span className="text-2xl font-black text-foreground font-mono">{moves} lượt</span>
          </div>
        </div>

        {isNewRecord && (
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 text-xs font-bold">
            <Sparkles className="w-4 h-4 fill-amber-500" />
            <span>Kỷ lục mới của bạn! 🎉</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button onClick={handleRestart} variant="outline" className="w-full sm:w-auto gap-2">
            <RotateCcw className="w-4 h-4" />
            <span>Chơi lại</span>
          </Button>

          {onExit && (
            <Button onClick={onExit} className="w-full sm:w-auto gap-2 shadow-md">
              <CheckCircle2 className="w-4 h-4" />
              <span>Hoàn tất</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 select-none">
      {/* Top Header: Timer, Matched Pairs & Highscore */}
      <div className="flex items-center justify-between gap-4 bg-card p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/10 text-primary font-mono font-bold text-sm">
            <Timer className="w-4 h-4 animate-spin-slow" />
            <span>{formatTime(elapsedMs)}</span>
          </div>

          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
            Đã ghép: <strong>{matchedCardIds.size}</strong> / {totalPairs} cặp
          </span>
        </div>

        <div className="flex items-center gap-3">
          {bestTime && (
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-muted-foreground font-medium block uppercase">Kỷ lục</span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                🏆 {formatTime(bestTime)}
              </span>
            </div>
          )}

          <Button size="sm" variant="ghost" onClick={handleRestart} className="h-8 gap-1.5 text-xs text-muted-foreground">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chơi lại</span>
          </Button>
        </div>
      </div>

      {/* Grid of Match Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
        {tiles.map((tile) => {
          const isMatched = matchedCardIds.has(tile.cardId);
          const isSelected = selectedTileId === tile.id;
          const isMismatched = mismatchedTileIds && mismatchedTileIds.includes(tile.id);

          // Tile Classes
          let tileClasses = 'border bg-card hover:bg-muted/60 text-card-foreground shadow-sm hover:shadow-md';

          if (isMatched) {
            tileClasses = 'opacity-0 scale-90 pointer-events-none transition-all duration-300';
          } else if (isMismatched) {
            tileClasses = 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 scale-95 shadow-md animate-shake';
          } else if (isSelected) {
            tileClasses = 'border-primary ring-2 ring-primary/40 bg-primary/5 text-primary scale-102 shadow-md';
          }

          return (
            <button
              key={tile.id}
              disabled={isMatched}
              onClick={() => handleTileClick(tile)}
              className={`min-h-[110px] p-4 rounded-2xl flex flex-col justify-center items-center text-center transition-all duration-150 cursor-pointer ${tileClasses}`}
            >
              {tile.type === 'term' ? (
                <div>
                  <span className="font-extrabold text-base sm:text-lg text-foreground font-sans block">
                    {tile.text}
                  </span>
                  {tile.ipa && (
                    <span className="text-[11px] text-muted-foreground font-mono mt-1 block">
                      {tile.ipa}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs sm:text-sm font-medium leading-relaxed line-clamp-3 text-muted-foreground">
                  {tile.text}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Hint footer */}
      <div className="text-center text-xs text-muted-foreground/75 pt-2">
        <span>💡 Bấm 1 thẻ từ tiếng Anh và 1 thẻ định nghĩa tương ứng để ghép cặp</span>
      </div>
    </div>
  );
};
