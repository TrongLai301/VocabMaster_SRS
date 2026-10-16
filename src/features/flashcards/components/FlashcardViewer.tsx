import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Volume2, 
  Mic, 
  MicOff, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  VolumeX,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSpeechTTS } from '@/hooks/useSpeechTTS';
import { useSpeechSTT, SpeechRecognitionResult } from '@/hooks/useSpeechSTT';
import { Card as CardType } from '@/types/database.types';

import { soundFX } from '@/lib/audioFX';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardViewerProps {
  cards: CardType[];
  onRatingSubmit?: (cardId: string, rating: ReviewRating) => void;
  onFinish?: () => void;
  autoPlayAudio?: boolean;
}

export const FlashcardViewer: React.FC<FlashcardViewerProps> = ({
  cards,
  onRatingSubmit,
  onFinish,
  autoPlayAudio: initialAutoPlay = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(initialAutoPlay);
  const [sttFeedback, setSttFeedback] = useState<SpeechRecognitionResult | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const { speak, stop, isSpeaking, isSupported: isTtsSupported } = useSpeechTTS();
  const { isListening, isSupported: isSttSupported, startListening, stopListening } = useSpeechSTT();

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  // Khi đổi thẻ: reset lật thẻ về mặt trước & dừng ngay âm thanh cũ
  useEffect(() => {
    setIsFlipped(false);
    setSttFeedback(null);
    stop();
  }, [currentIndex, stop]);

  // Dọn dẹp âm thanh khi component unmount (chuyển trang)
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Chỉ phát âm khi chuyển thẻ NẾU người dùng chủ động BẬT chế độ tự động phát âm (autoPlayAudio = true)
  useEffect(() => {
    if (autoPlayAudio && currentCard?.term) {
      const timer = setTimeout(() => {
        speak(currentCard.term);
      }, 150);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, autoPlayAudio]);

  const handleFlip = useCallback(() => {
    soundFX.playFlip();
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    setSttFeedback(null);
    stop();
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (onFinish) {
      onFinish();
    }
  }, [currentIndex, cards.length, onFinish, stop]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    setSttFeedback(null);
    stop();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, stop]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const deltaX = e.changedTouches[0].clientX - touchStart.x;
    const deltaY = e.changedTouches[0].clientY - touchStart.y;
    setTouchStart(null);

    // Vuốt ngang có biên độ đủ lớn
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        handleNext(); // Vuốt sang trái -> Thẻ tiếp theo
      } else {
        handlePrev(); // Vuốt sang phải -> Thẻ trước đó
      }
    }
  };

  const handleRate = (rating: ReviewRating) => {
    soundFX.playSuccess();
    if (onRatingSubmit && currentCard) {
      onRatingSubmit(currentCard.id, rating);
    }
    handleNext();
  };

  const handleMicClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentCard) return;

    if (isListening) {
      stopListening();
    } else {
      setSttFeedback(null);
      startListening(currentCard.term, (result) => {
        setSttFeedback(result);
        if (result.isMatch) {
          speak('Excellent!');
        }
      });
    }
  };

  // Keyboard Shortcuts: Space, Enter, Arrows, 1-4, Ctrl để nghe phát âm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Control' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
        e.preventDefault();
        if (e.repeat) return;
        if (currentCard?.term) {
          speak(currentCard.term);
        }
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (['Digit1', 'Numpad1'].includes(e.code)) {
        handleRate('again');
      } else if (['Digit2', 'Numpad2'].includes(e.code)) {
        handleRate('hard');
      } else if (['Digit3', 'Numpad3'].includes(e.code)) {
        handleRate('good');
      } else if (['Digit4', 'Numpad4'].includes(e.code)) {
        handleRate('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, currentCard, speak]);

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center animate-bounce">
          <Sparkles className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold">Bạn đã hoàn thành phiên học!</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Toàn bộ thẻ trong danh sách đã được xem xét. Tiếp tục duy trì chuỗi học tập hàng ngày nhé!
        </p>
        {onFinish && (
          <Button onClick={onFinish} className="font-semibold shadow-md mt-2">
            Xem lại kết quả
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center px-4 py-4 select-none">
      {/* Top Header: Progress Bar, Counter & Audio Toggle */}
      <div className="w-full flex items-center justify-between gap-4 mb-4">
        <span className="text-xs font-bold text-muted-foreground font-mono">
          Thẻ {currentIndex + 1} / {cards.length}
        </span>

        <Progress value={progressPercent} className="h-2 flex-1 max-w-md bg-muted/60" />

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => setAutoPlayAudio((prev) => !prev)}
            title={autoPlayAudio ? 'Tắt tự động phát âm' : 'Bật tự động phát âm'}
          >
            {autoPlayAudio ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div 
        key={currentCard.id}
        className="relative w-full h-[390px] sm:h-[420px] cursor-pointer"
        style={{ perspective: 1200 }}
        onClick={handleFlip}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* MẶT TRƯỚC (FRONT) */}
        <motion.div
          key={`front-${currentCard.id}`}
          className="absolute inset-0 w-full h-full p-5 sm:p-10 flex flex-col justify-between items-center rounded-3xl border bg-card text-card-foreground shadow-xl hover:shadow-2xl transition-shadow"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            pointerEvents: isFlipped ? 'none' : 'auto',
            zIndex: isFlipped ? 10 : 20,
          }}
          initial={{ rotateY: 0, opacity: 1 }}
          animate={{
            rotateY: isFlipped ? 180 : 0,
            opacity: isFlipped ? 0 : 1,
          }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Front Header */}
          <div className="w-full flex justify-between items-center">
            <Badge variant="secondary" className="uppercase font-mono text-[10px] sm:text-xs tracking-wider px-2.5 py-0.5 sm:px-3 sm:py-1">
              {currentCard.part_of_speech || 'vocabulary'}
            </Badge>

            <div className="flex items-center gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className={`h-8 px-2 sm:px-2.5 rounded-full text-xs font-semibold gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                  isSpeaking ? 'text-primary bg-primary/10 animate-pulse scale-105' : 'hover:bg-primary/10 hover:text-primary text-muted-foreground'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  speak(currentCard.term);
                }}
                title="Nghe phát âm bản xứ (Phím tắt: [Ctrl])"
              >
                <Volume2 className="w-4 h-4" />
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted/80 text-muted-foreground border border-border/50 uppercase">
                  Ctrl
                </span>
              </Button>

              {isSttSupported && (
                <Button
                  size="icon"
                  variant={isListening ? 'destructive' : 'ghost'}
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full transition-all cursor-pointer ${
                    isListening ? 'animate-pulse scale-110' : 'hover:bg-primary/10'
                  }`}
                  onClick={handleMicClick}
                  title="Bấm để luyện nói & kiểm tra phát âm"
                >
                  {isListening ? <MicOff className="w-4 sm:w-5 h-4 sm:h-5" /> : <Mic className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-500" />}
                </Button>
              )}
            </div>
          </div>

          {/* Front Content: Word & IPA */}
          <div className="text-center my-auto flex flex-col items-center max-w-full px-2">
            <h2 className="text-3xl xs:text-4xl sm:text-6xl font-black tracking-tight text-foreground font-sans break-words max-w-full">
              {currentCard.term}
            </h2>

            {currentCard.ipa && (
              <p className="text-base sm:text-2xl text-muted-foreground font-mono mt-2 sm:mt-3 font-medium break-words">
                {currentCard.ipa}
              </p>
            )}

            {/* Pronunciation Feedback */}
            {sttFeedback && (
              <div 
                className={`mt-4 sm:mt-5 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-semibold animate-in fade-in-50 duration-200 ${
                  sttFeedback.isMatch 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {sttFeedback.isMatch ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="truncate max-w-[240px] sm:max-w-none">
                  {sttFeedback.isMatch
                    ? 'Phát âm chuẩn xác! 🎉'
                    : `Bạn đọc: "${sttFeedback.transcript}"`}
                </span>
              </div>
            )}
          </div>

          {/* Front Footer */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground/80 font-medium text-center">
            <RotateCw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Bấm vào thẻ hoặc nhấn [Space] để lật xem định nghĩa</span>
            <span className="sm:hidden">Chạm vào thẻ để lật xem nghĩa</span>
          </div>
        </motion.div>

        {/* MẶT SAU (BACK) */}
        <motion.div
          key={`back-${currentCard.id}`}
          className="absolute inset-0 w-full h-full p-5 sm:p-10 flex flex-col justify-between items-center rounded-3xl border bg-card text-card-foreground shadow-xl hover:shadow-2xl transition-shadow"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            pointerEvents: isFlipped ? 'auto' : 'none',
            zIndex: isFlipped ? 20 : 10,
          }}
          initial={{ rotateY: -180, opacity: 0 }}
          animate={{
            rotateY: isFlipped ? 0 : -180,
            opacity: isFlipped ? 1 : 0,
          }}
          transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Back Header */}
          <div className="w-full flex justify-between items-center">
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              Định nghĩa & Ngữ cảnh
            </Badge>

            <Button
              variant="ghost"
              size="sm"
              className={`h-8 px-2 sm:px-2.5 rounded-full text-xs font-semibold gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                isSpeaking ? 'text-primary bg-primary/10 animate-pulse scale-105' : 'hover:bg-primary/10 hover:text-primary text-muted-foreground'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                speak(currentCard.term);
              }}
              title="Nghe lại phát âm (Phím tắt: [Ctrl])"
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted/80 text-muted-foreground border border-border/50 uppercase">
                Ctrl
              </span>
            </Button>
          </div>

          {/* Back Content */}
          <div className="text-center my-auto max-w-xl space-y-3 sm:space-y-4 px-2 overflow-y-auto max-h-[220px] sm:max-h-none">
            <p className="text-lg sm:text-3xl font-bold text-primary leading-relaxed font-sans break-words">
              {currentCard.definition}
            </p>

            {currentCard.example && (
              <blockquote className="italic text-muted-foreground bg-muted/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border-l-4 border-primary text-xs sm:text-base text-left leading-relaxed break-words">
                "{currentCard.example}"
              </blockquote>
            )}

            {currentCard.synonyms && currentCard.synonyms.length > 0 && (
              <div className="flex flex-wrap justify-center items-center gap-1 sm:gap-1.5 pt-0.5 sm:pt-1">
                <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground mr-1">Đồng nghĩa:</span>
                {currentCard.synonyms.map((syn, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px] sm:text-xs">
                    {syn}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Back Footer */}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground/80 font-medium text-center">
            <RotateCw className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Bấm vào thẻ hoặc nhấn [Space] để lật lại mặt trước</span>
            <span className="sm:hidden">Chạm vào thẻ để lật lại mặt trước</span>
          </div>
        </motion.div>
      </div>

      {/* Quick Flip Button & SRS Controls */}
      <div className="w-full mt-3 sm:mt-4 flex items-center justify-center">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs rounded-full font-semibold border-dashed"
          onClick={handleFlip}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>{isFlipped ? 'Lật lại mặt trước [Space]' : 'Lật xem nghĩa [Space]'}</span>
        </Button>
      </div>

      {/* SRS RATING BUTTONS (1, 2, 3, 4) */}
      <div className="w-full mt-3 sm:mt-4 grid grid-cols-4 gap-1.5 sm:gap-3 max-w-2xl">
        <Button
          variant="outline"
          className="border-red-200 dark:border-red-900/60 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 flex flex-col h-auto py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl cursor-pointer"
          onClick={() => handleRate('again')}
        >
          <span className="font-bold text-[11px] sm:text-sm">Again [1]</span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">&lt; 1 ngày</span>
        </Button>

        <Button
          variant="outline"
          className="border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 flex flex-col h-auto py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl cursor-pointer"
          onClick={() => handleRate('hard')}
        >
          <span className="font-bold text-[11px] sm:text-sm">Hard [2]</span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">~3 ngày</span>
        </Button>

        <Button
          variant="outline"
          className="border-blue-200 dark:border-blue-900/60 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 flex flex-col h-auto py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl cursor-pointer"
          onClick={() => handleRate('good')}
        >
          <span className="font-bold text-[11px] sm:text-sm">Good [3]</span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">~7 ngày</span>
        </Button>

        <Button
          variant="outline"
          className="border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 flex flex-col h-auto py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl cursor-pointer"
          onClick={() => handleRate('easy')}
        >
          <span className="font-bold text-[11px] sm:text-sm">Easy [4]</span>
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">~14+ ngày</span>
        </Button>
      </div>

      {/* Bottom Prev / Next Nav */}
      <div className="flex items-center justify-between w-full max-w-2xl mt-4 px-2">
        <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentIndex === 0} className="gap-1 text-xs">
          <ChevronLeft className="w-4 h-4" />
          <span>Thẻ trước</span>
        </Button>

        <span className="text-xs text-muted-foreground/75 hidden sm:inline">
          Dùng phím [←] [→], [Space] lật thẻ, [Ctrl] nghe phát âm, [1] [2] [3] [4] đánh giá
        </span>

        <Button variant="ghost" size="sm" onClick={handleNext} className="gap-1 text-xs">
          <span>Tiếp theo</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
