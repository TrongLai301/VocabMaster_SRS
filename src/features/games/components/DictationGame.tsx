import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card as CardType } from '@/types/database.types';
import { useSpeechTTS } from '@/hooks/useSpeechTTS';
import {
  evaluateDictation,
  evaluateDefinition,
  createClozeExample,
  DictationCheckResult,
  DictationSubMode,
} from '@/features/games/utils/dictationEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  Sparkles,
  Trophy,
  Headphones,
  Check,
  X,
  Languages,
  BookOpen,
  Shuffle,
  ThumbsUp,
} from 'lucide-react';

export interface DictationStats {
  total: number;
  correctFirstTime: number;
  accuracy: number;
  wrongCards: CardType[];
}

interface DictationGameProps {
  cards: CardType[];
  onFinish?: (stats: DictationStats) => void;
  onExit: () => void;
}

export const DictationGame: React.FC<DictationGameProps> = ({ cards, onFinish, onExit }) => {
  const [activeCards, setActiveCards] = useState<CardType[]>(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [subMode, setSubMode] = useState<DictationSubMode>('listen_write');
  const [userInput, setUserInput] = useState('');
  const [checkResult, setCheckResult] = useState<DictationCheckResult | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hasTriedCurrentCard, setHasTriedCurrentCard] = useState(false);
  const [firstTimeCorrectCount, setFirstTimeCorrectCount] = useState(0);
  const [wrongCards, setWrongCards] = useState<CardType[]>([]);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isCompleted, setIsCompleted] = useState(false);

  const { speak, isSpeaking, stop } = useSpeechTTS();
  const inputRef = useRef<HTMLInputElement>(null);
  const currentCard = activeCards[currentIndex];

  // Xác định chế độ cụ thể cho câu hiện tại (nếu chọn Mixed)
  const getQuestionMode = useCallback(
    (index: number, mode: DictationSubMode): 'listen_write' | 'meaning_to_word' | 'word_to_meaning' => {
      if (mode !== 'mixed') return mode;
      const mod = index % 3;
      if (mod === 0) return 'listen_write';
      if (mod === 1) return 'meaning_to_word';
      return 'word_to_meaning';
    },
    []
  );

  const currentQuestionMode = getQuestionMode(currentIndex, subMode);

  // Đồng bộ activeCards khi cards prop được truyền vào (sau khi load async)
  useEffect(() => {
    setActiveCards(cards);
    setCurrentIndex(0);
    setIsCompleted(false);
    setWrongCards([]);
    setFirstTimeCorrectCount(0);
  }, [cards]);

  // Phát âm chuẩn Authentic Native Audio & WebSpeech Fallback
  const speakCurrentWord = useCallback(
    (rate: number = playbackRate) => {
      if (!currentCard?.term) return;
      speak(currentCard.term, { rate, lang: 'en-US' });
    },
    [currentCard, playbackRate, speak]
  );

  // Tự động phát âm khi chuyển sang từ mới (nếu là chế độ nghe hoặc nhìn từ)
  useEffect(() => {
    if (!currentCard || isCompleted) return;
    setUserInput('');
    setCheckResult(null);
    setIsAnswerChecked(false);
    setShowHint(false);
    setHasTriedCurrentCard(false);

    // Tự động phát âm nếu là chế độ Nghe điền từ hoặc Nhìn từ điền nghĩa
    if (currentQuestionMode === 'listen_write' || currentQuestionMode === 'word_to_meaning') {
      const timer = setTimeout(() => {
        speakCurrentWord();
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    } else {
      inputRef.current?.focus();
    }
  }, [currentIndex, currentCard, isCompleted, currentQuestionMode, speakCurrentWord]);

  // Lắng nghe phím tắt: Ctrl + Space để nghe lại
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        speakCurrentWord();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [speakCurrentWord]);

  const handleCheck = () => {
    if (!userInput.trim() || !currentCard) return;

    let result: DictationCheckResult;

    if (currentQuestionMode === 'word_to_meaning') {
      // Nhìn từ điền nghĩa -> So khớp với định nghĩa tiếng Việt/Anh
      result = evaluateDefinition(userInput, currentCard.definition);
    } else {
      // Nghe điền từ HOẶC Nhìn nghĩa điền từ -> So khớp với từ tiếng Anh
      result = evaluateDictation(userInput, currentCard.term, currentCard.synonyms || []);
    }

    setCheckResult(result);
    setIsAnswerChecked(true);

    if (result.isExactMatch || result.isSynonymMatch) {
      if (!hasTriedCurrentCard) {
        setFirstTimeCorrectCount((prev) => prev + 1);
      }
    } else {
      if (!hasTriedCurrentCard) {
        setHasTriedCurrentCard(true);
        setWrongCards((prev) => (prev.some((c) => c.id === currentCard.id) ? prev : [...prev, currentCard]));
      }
    }
  };

  // Nút chấp nhận đáp án của người dùng (tự chấm đúng)
  const handleOverrideCorrect = () => {
    if (!checkResult) return;
    setCheckResult({
      ...checkResult,
      isExactMatch: true,
      diffChars: checkResult.targetNormalized.split('').map((char) => ({ char, status: 'correct' })),
    });
    if (!hasTriedCurrentCard) {
      setFirstTimeCorrectCount((prev) => prev + 1);
    }
    setWrongCards((prev) => prev.filter((c) => c.id !== currentCard.id));
  };

  const handleNext = () => {
    if (currentIndex + 1 < activeCards.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      const total = activeCards.length;
      const accuracy = total > 0 ? Math.round((firstTimeCorrectCount / total) * 100) : 0;
      onFinish?.({
        total,
        correctFirstTime: firstTimeCorrectCount,
        accuracy,
        wrongCards,
      });
    }
  };

  const handleRetryWrongs = () => {
    if (wrongCards.length === 0) return;
    setActiveCards([...wrongCards]);
    setCurrentIndex(0);
    setWrongCards([]);
    setFirstTimeCorrectCount(0);
    setIsCompleted(false);
  };

  const handleRestartAll = () => {
    setActiveCards([...cards]);
    setCurrentIndex(0);
    setWrongCards([]);
    setFirstTimeCorrectCount(0);
    setIsCompleted(false);
  };

  if (activeCards.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <Headphones className="w-12 h-12 mx-auto text-muted-foreground/60" />
        <h3 className="text-lg font-bold">Bộ thẻ chưa có từ vựng nào</h3>
        <p className="text-xs text-muted-foreground">Vui lòng thêm từ vựng vào bộ thẻ trước khi luyện tập.</p>
        <Button onClick={onExit} variant="outline" className="rounded-xl">Quay lại</Button>
      </div>
    );
  }

  // Màn hình tổng kết kết quả sau khi hoàn thành
  if (isCompleted) {
    const accuracy = activeCards.length > 0 ? Math.round((firstTimeCorrectCount / activeCards.length) * 100) : 0;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8 animate-in fade-in-0 duration-300">
        <div className="rounded-3xl border bg-card p-6 sm:p-10 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 text-primary mx-auto flex items-center justify-center shadow-inner">
            <Trophy className="w-10 h-10 animate-bounce" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground">
              Hoàn Thành Luyện Tập!
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tuyệt vời! Bạn đã hoàn thành toàn bộ bài tập gõ từ và nghĩa hôm nay.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-muted/40 border">
            <div className="space-y-1">
              <span className="text-2xl font-black text-foreground">{activeCards.length}</span>
              <p className="text-[11px] font-semibold text-muted-foreground">Tổng số từ</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {firstTimeCorrectCount}
              </span>
              <p className="text-[11px] font-semibold text-muted-foreground">Đúng lần đầu</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-black text-primary">{accuracy}%</span>
              <p className="text-[11px] font-semibold text-muted-foreground">Độ chính xác</p>
            </div>
          </div>

          {/* Detailed Card Review List */}
          <div className="text-left space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Danh sách từ vựng trong bài
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {activeCards.map((card) => {
                const wasWrong = wrongCards.some((c) => c.id === card.id);
                return (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-background/50 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => speak(card.term, { lang: 'en-US' })}
                        className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer shrink-0"
                        title="Nghe lại phát âm"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{card.term}</span>
                          {card.ipa && (
                            <span className="text-xs text-muted-foreground font-mono">{card.ipa}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{card.definition}</p>
                      </div>
                    </div>

                    {wasWrong ? (
                      <Badge variant="destructive" className="gap-1 text-[11px] shrink-0">
                        <X className="w-3 h-3" />
                        <span>Cần ôn lại</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400 gap-1 text-[11px] shrink-0">
                        <Check className="w-3 h-3" />
                        <span>Đạt chuẩn</span>
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t">
            {wrongCards.length > 0 && (
              <Button
                onClick={handleRetryWrongs}
                className="w-full sm:w-auto gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Luyện lại {wrongCards.length} từ chưa đúng</span>
              </Button>
            )}

            <Button
              onClick={handleRestartAll}
              variant="outline"
              className="w-full sm:w-auto gap-2 rounded-xl font-semibold"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Luyện lại cả bộ ({activeCards.length})</span>
            </Button>

            <Button
              onClick={onExit}
              variant="secondary"
              className="w-full sm:w-auto rounded-xl font-semibold"
            >
              Quay lại danh mục
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((currentIndex / activeCards.length) * 100);
  const cloze = createClozeExample(currentCard.example, currentCard.term);
  const isCorrect = isAnswerChecked && (checkResult?.isExactMatch || checkResult?.isSynonymMatch);

  // Target word or definition to display in diff
  const targetLabel = currentQuestionMode === 'word_to_meaning' ? 'Nghĩa đúng' : 'Từ tiếng Anh đúng';
  const targetValue = currentQuestionMode === 'word_to_meaning' ? currentCard.definition : currentCard.term;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <button
          onClick={onExit}
          className="hover:text-foreground transition-colors cursor-pointer flex items-center gap-1"
        >
          &larr; <span>Thoát chế độ</span>
        </button>
        <span className="font-mono bg-muted px-2.5 py-1 rounded-full text-foreground">
          Từ {currentIndex + 1} / {activeCards.length}
        </span>
        <span className="text-primary font-mono font-bold">
          Đúng lần đầu: {firstTimeCorrectCount}
        </span>
      </div>

      <Progress value={progressPercent} className="h-2 rounded-full" />

      {/* Sub-mode Selector Bar */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 rounded-2xl bg-muted/60 border text-xs font-semibold">
        <button
          type="button"
          onClick={() => setSubMode('listen_write')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            subMode === 'listen_write'
              ? 'bg-background text-foreground shadow-sm font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Headphones className="w-3.5 h-3.5 text-primary" />
          <span>Nghe điền từ</span>
        </button>

        <button
          type="button"
          onClick={() => setSubMode('meaning_to_word')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            subMode === 'meaning_to_word'
              ? 'bg-background text-foreground shadow-sm font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Languages className="w-3.5 h-3.5 text-amber-500" />
          <span>Nhìn nghĩa điền từ</span>
        </button>

        <button
          type="button"
          onClick={() => setSubMode('word_to_meaning')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            subMode === 'word_to_meaning'
              ? 'bg-background text-foreground shadow-sm font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
          <span>Nhìn từ điền nghĩa</span>
        </button>

        <button
          type="button"
          onClick={() => setSubMode('mixed')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
            subMode === 'mixed'
              ? 'bg-background text-foreground shadow-sm font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Shuffle className="w-3.5 h-3.5 text-emerald-500" />
          <span>Trộn lẫn</span>
        </button>
      </div>

      {/* Main Study Card */}
      <div className="rounded-3xl border bg-card p-6 sm:p-10 shadow-lg space-y-7 relative overflow-hidden transition-all">
        {/* Mode Specific Prompt Banner */}
        <div className="flex items-center justify-between pb-2 border-b border-border/60">
          <Badge variant="secondary" className="gap-1.5 py-1 px-3 text-xs font-semibold">
            {currentQuestionMode === 'listen_write' && (
              <>
                <Headphones className="w-3.5 h-3.5 text-primary" />
                <span>Chế độ: Nghe phát âm & Gõ từ tiếng Anh</span>
              </>
            )}
            {currentQuestionMode === 'meaning_to_word' && (
              <>
                <Languages className="w-3.5 h-3.5 text-amber-500" />
                <span>Chế độ: Nhìn định nghĩa & Gõ từ tiếng Anh</span>
              </>
            )}
            {currentQuestionMode === 'word_to_meaning' && (
              <>
                <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                <span>Chế độ: Nhìn từ tiếng Anh & Gõ nghĩa tiếng Việt</span>
              </>
            )}
          </Badge>

          {currentCard.part_of_speech && (
            <Badge variant="outline" className="capitalize text-xs font-mono font-medium">
              {currentCard.part_of_speech}
            </Badge>
          )}
        </div>

        {/* Central Display Area depending on Mode */}
        {currentQuestionMode === 'listen_write' && (
          /* Mode 1: Listen and Write */
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center gap-4 py-2">
              <button
                type="button"
                onClick={() => speakCurrentWord(playbackRate)}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-95 cursor-pointer ${
                  isSpeaking
                    ? 'bg-primary text-primary-foreground ring-8 ring-primary/25 scale-105'
                    : 'bg-primary/10 text-primary hover:bg-primary/20 hover:scale-105'
                }`}
                title="Bấm để nghe phát âm"
              >
                <Volume2 className={`w-10 h-10 ${isSpeaking ? 'animate-pulse' : ''}`} />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">
                  Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border">Ctrl + Space</kbd>
                </span>
                <span className="text-muted-foreground/40">•</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary h-7 px-2 font-mono font-bold hover:bg-primary/10 rounded-lg"
                  onClick={() => {
                    const nextRate = playbackRate === 1.0 ? 0.75 : 1.0;
                    setPlaybackRate(nextRate);
                    speakCurrentWord(nextRate);
                  }}
                >
                  Tốc độ: {playbackRate}x
                </Button>
              </div>
            </div>

            <div className="space-y-2 bg-muted/40 p-4 sm:p-5 rounded-2xl border text-center">
              <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed">
                {currentCard.definition}
              </p>
              {cloze && (
                <p className="text-xs sm:text-sm text-muted-foreground italic pt-1 border-t border-border/50">
                  "{cloze}"
                </p>
              )}
            </div>
          </div>
        )}

        {currentQuestionMode === 'meaning_to_word' && (
          /* Mode 2: Meaning to Word */
          <div className="space-y-5 text-center">
            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Định nghĩa / Nghĩa cần tìm:
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-foreground">
                "{currentCard.definition}"
              </h3>
              {cloze && (
                <p className="text-xs sm:text-sm text-muted-foreground italic pt-1 border-t border-amber-500/15">
                  "{cloze}"
                </p>
              )}
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => speakCurrentWord(playbackRate)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-background hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-primary" />
                <span>Nghe gợi ý âm thanh</span>
              </button>
            </div>
          </div>
        )}

        {currentQuestionMode === 'word_to_meaning' && (
          /* Mode 3: Word to Meaning */
          <div className="space-y-5 text-center">
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl space-y-3">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {currentCard.term}
                </h3>
                <button
                  type="button"
                  onClick={() => speakCurrentWord(playbackRate)}
                  className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer shrink-0"
                  title="Nghe phát âm"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {currentCard.ipa && (
                <p className="text-sm font-mono text-muted-foreground font-medium">
                  {currentCard.ipa}
                </p>
              )}

              {currentCard.example && (
                <p className="text-xs sm:text-sm text-muted-foreground italic pt-1 border-t border-indigo-500/15">
                  "{currentCard.example}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hint Box */}
        {showHint && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center text-xs font-mono text-amber-700 dark:text-amber-300">
            {currentQuestionMode === 'word_to_meaning' ? (
              <span>
                Gợi ý nghĩa: {currentCard.definition.length} ký tự | Bắt đầu bằng "{currentCard.definition[0]}"
              </span>
            ) : (
              <span>
                Gợi ý từ: {currentCard.term.length} chữ cái | Bắt đầu bằng "{currentCard.term[0].toUpperCase()}"
              </span>
            )}
          </div>
        )}

        {/* Input & Feedback Form */}
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isCorrect) {
                handleNext();
              } else {
                handleCheck();
              }
            }}
            className="space-y-3"
          >
            <div>
              <Input
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={
                  currentQuestionMode === 'word_to_meaning'
                    ? 'Gõ nghĩa của từ vựng (tiếng Việt)...'
                    : 'Gõ từ tiếng Anh vào đây...'
                }
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={isCorrect}
                className={`text-center text-lg sm:text-xl font-bold tracking-wide h-14 sm:h-16 rounded-2xl transition-all ${
                  isAnswerChecked
                    ? isCorrect
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/20'
                    : 'focus-visible:ring-primary/30'
                }`}
              />
            </div>

            {/* Character Diff or Correct Banner */}
            {isAnswerChecked && checkResult && (
              <div className="space-y-3 text-center animate-in fade-in-0 duration-200">
                {isCorrect ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <span>Chính xác tuyệt vời!</span>
                    {currentCard.ipa && currentQuestionMode !== 'word_to_meaning' && (
                      <span className="font-mono text-xs text-muted-foreground font-normal ml-1">
                        {currentCard.ipa}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-destructive font-semibold text-xs">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Chưa chính xác:</span>
                      </div>

                      {/* Manual Accept Button */}
                      <button
                        type="button"
                        onClick={handleOverrideCorrect}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Nghĩa của tôi đúng</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Bạn đã gõ:</span>
                      <div className="flex items-center gap-0.5 font-mono text-sm font-bold bg-background/80 px-2.5 py-1 rounded-lg border">
                        {checkResult.diffChars.map((dc, i) => (
                          <span
                            key={i}
                            className={
                              dc.status === 'correct'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : dc.status === 'missing'
                                ? 'text-amber-500 underline'
                                : 'text-destructive line-through'
                            }
                          >
                            {dc.char}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs pt-1 border-t border-destructive/20">
                      <span className="text-muted-foreground">{targetLabel}:</span>
                      <span className="font-mono text-sm font-black text-foreground tracking-wider">
                        {targetValue}
                      </span>
                      {currentCard.ipa && currentQuestionMode !== 'word_to_meaning' && (
                        <span className="font-mono text-xs text-muted-foreground">{currentCard.ipa}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(true)}
                disabled={showHint || isCorrect}
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý</span>
              </Button>

              {isCorrect ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <span>{currentIndex + 1 === activeCards.length ? 'Xem tổng kết' : 'Từ tiếp theo'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : isAnswerChecked ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAnswerChecked(false);
                      setUserInput('');
                      inputRef.current?.focus();
                    }}
                    className="gap-1.5 text-xs rounded-xl"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Thử lại</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    variant="secondary"
                    className="gap-1.5 text-xs rounded-xl"
                  >
                    <span>Bỏ qua</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="gap-2 rounded-xl font-semibold shadow-sm"
                >
                  <span>Kiểm tra</span>
                  <kbd className="hidden sm:inline-block px-1 py-0.5 rounded bg-primary-foreground/20 text-[10px] font-mono">
                    ↵
                  </kbd>
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
