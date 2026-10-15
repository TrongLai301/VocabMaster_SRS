# PHASE 3: TRẢI NGHIỆM FLASHCARDS 3D & WEB SPEECH AUDIO (TTS & STT)

> **Thời gian dự kiến**: 3 - 4 ngày  
> **Mục tiêu**: Xây dựng trải nghiệm học thẻ tương tác 3D lật mặt chân thực (Framer Motion), tích hợp âm thanh bản xứ native (Web Speech TTS), chấm phát âm giọng đọc (Speech Recognition STT) và hệ thống phím tắt bàn phím tiện lợi.

---

## 1. CHECKLIST CÔNG VIỆC CỤ THỂ

- [ ] **3.1. Thiết kế Component Flashcard 3D Viewer**:
  - Tạo `src/features/flashcards/components/FlashcardViewer.tsx`.
  - Sử dụng Framer Motion kết hợp CSS 3D: `perspective: 1200px` và `transformStyle: 'preserve-3d'`.
  - **Mặt trước**: Từ vựng lớn, IPA, badge loại từ, nút audio, nút micro luyện nói.
  - **Mặt sau**: Định nghĩa nổi bật, ví dụ ngữ cảnh, danh sách từ đồng nghĩa.
  - Hiệu ứng lật 180 độ mượt mà khi click chuột hoặc bấm phím tắt.

- [ ] **3.2. Tích hợp Web Speech API (Text-to-Speech - TTS)**:
  - Tạo hook `src/hooks/useSpeechTTS.ts` bao bọc `window.speechSynthesis`.
  - Tự động phát âm khi chuyển sang thẻ mới (hỗ trợ toggle bật/tắt trong settings).
  - Tùy chỉnh tốc độ đọc `rate = 0.9` và giọng chuẩn US/UK (`en-US`, `en-GB`).

- [ ] **3.3. Tích hợp Web Speech API (Speech Recognition - Chấm phát âm)**:
  - Tạo hook `src/hooks/useSpeechSTT.ts` bao bọc `webkitSpeechRecognition` / `SpeechRecognition`.
  - Khi bấm nút Micro: Thu âm giọng đọc của người học, chuyển thành text và so khớp với `term` của thẻ hiện tại.
  - Hiển thị badge kết quả trực quan (Xanh: Phát âm chuẩn xác; Đỏ: Chưa chuẩn kèm text nhận diện được).

- [ ] **3.4. Hệ thống Phím Tắt Toàn Diện (Keyboard Shortcuts)**:
  - `Space` hoặc `Enter`: Lật mặt thẻ (Flip card).
  - `ArrowLeft` (`←`): Trở về thẻ trước.
  - `ArrowRight` (`→`): Chuyển sang thẻ tiếp theo.
  - `1`, `2`, `3`, `4`: Đánh giá nhanh mức độ nhớ (Again, Hard, Good, Easy) tương thích với hệ thống SRS.

---

## 2. CODE CỐT LÕI PHASE 3

### 2.1. Hook Text-to-Speech (`src/hooks/useSpeechTTS.ts`)
```typescript
import { useCallback } from 'react';

export function useSpeechTTS() {
  const speak = useCallback((text: string, lang = 'en-US', rate = 0.9) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Trình duyệt không hỗ trợ Web Speech Synthesis.');
      return;
    }
    window.speechSynthesis.cancel(); // Dừng câu đang đọc dở

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  }, []);

  return { speak };
}
```

### 2.2. Hook Speech Recognition (`src/hooks/useSpeechSTT.ts`)
```typescript
import { useState, useCallback } from 'react';

export function useSpeechSTT() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');

  const listen = useCallback((onResult: (spokenText: string) => void, lang = 'en-US') => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Trình duyệt không hỗ trợ Speech Recognition.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript.trim().toLowerCase();
      setTranscript(result);
      onResult(result);
    };

    recognition.start();
  }, []);

  return { isListening, transcript, listen };
}
```

### 2.3. Component `FlashcardViewer.tsx` Hoàn Chỉnh
```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Mic, MicOff, RotateCw, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { useSpeechTTS } from '@/hooks/useSpeechTTS';
import { useSpeechSTT } from '@/hooks/useSpeechSTT';

export interface FlashcardItem {
  id: string;
  term: string;
  ipa?: string;
  partOfSpeech?: string;
  definition: string;
  example?: string;
  synonyms?: string[];
  boxLevel?: number;
}

interface FlashcardViewerProps {
  cards: FlashcardItem[];
  onRatingSubmit?: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') => void;
  onFinish?: () => void;
  autoPlayAudio?: boolean;
}

export const FlashcardViewer: React.FC<FlashcardViewerProps> = ({
  cards,
  onRatingSubmit,
  onFinish,
  autoPlayAudio = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [feedback, setFeedback] = useState<{ match: boolean; text: string } | null>(null);

  const { speak } = useSpeechTTS();
  const { isListening, listen } = useSpeechSTT();

  const currentCard = cards[currentIndex];
  const progressPercent = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  useEffect(() => {
    setIsFlipped(false);
    setFeedback(null);
    if (autoPlayAudio && currentCard?.term) {
      speak(currentCard.term);
    }
  }, [currentIndex, currentCard, autoPlayAudio, speak]);

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else if (onFinish) {
      onFinish();
    }
  }, [currentIndex, cards.length, onFinish]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  }, [currentIndex]);

  const handleRate = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (onRatingSubmit && currentCard) onRatingSubmit(currentCard.id, rating);
    handleNext();
  };

  const handleSpeechCheck = () => {
    if (!currentCard) return;
    listen((spokenText) => {
      const match = spokenText.toLowerCase() === currentCard.term.toLowerCase();
      setFeedback({ match, text: spokenText });
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (['Digit1', 'Numpad1'].includes(e.code)) handleRate('again');
      else if (['Digit2', 'Numpad2'].includes(e.code)) handleRate('hard');
      else if (['Digit3', 'Numpad3'].includes(e.code)) handleRate('good');
      else if (['Digit4', 'Numpad4'].includes(e.code)) handleRate('easy');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, currentCard]);

  if (!currentCard) {
    return <div className="p-12 text-center font-bold text-lg">Đã hoàn thành phiên học!</div>;
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center px-4 py-6 select-none">
      {/* Top Header */}
      <div className="w-full flex items-center justify-between gap-4 mb-4">
        <span className="text-sm font-semibold text-muted-foreground">
          Thẻ {currentIndex + 1} / {cards.length}
        </span>
        <Progress value={progressPercent} className="h-2 flex-1 max-w-md" />
        {currentCard.boxLevel && (
          <Badge variant="outline" className="border-indigo-500 text-indigo-500 font-mono">
            Box {currentCard.boxLevel}
          </Badge>
        )}
      </div>

      {/* 3D Flip Card Container */}
      <div 
        className="w-full h-[400px] cursor-pointer"
        style={{ perspective: '1200px' }}
        onClick={() => setIsFlipped((prev) => !prev)}
      >
        <motion.div
          className="relative w-full h-full rounded-2xl shadow-xl hover:shadow-2xl"
          style={{ transformStyle: 'preserve-3d' }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          {/* MẶT TRƯỚC (FRONT) */}
          <Card 
            className="absolute inset-0 w-full h-full p-8 flex flex-col justify-between items-center rounded-2xl border bg-card"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="w-full flex justify-between items-center">
              <Badge variant="secondary" className="uppercase font-mono text-xs">
                {currentCard.partOfSpeech || 'vocabulary'}
              </Badge>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => speak(currentCard.term)}>
                  <Volume2 className="w-5 h-5" />
                </Button>
                <Button size="icon" variant={isListening ? 'destructive' : 'ghost'} className="rounded-full" onClick={handleSpeechCheck}>
                  {isListening ? <MicOff className="w-5 h-5 animate-pulse" /> : <Mic className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            <div className="text-center my-auto">
              <h2 className="text-5xl font-extrabold tracking-tight text-foreground font-sans">
                {currentCard.term}
              </h2>
              {currentCard.ipa && (
                <p className="text-xl text-muted-foreground font-mono mt-3">{currentCard.ipa}</p>
              )}
              {feedback && (
                <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${feedback.match ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}>
                  {feedback.match ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>Bạn đọc: "{feedback.text}"</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Bấm chuột hoặc nhấn [Space] để lật thẻ</span>
            </div>
          </Card>

          {/* MẶT SAU (BACK) */}
          <Card 
            className="absolute inset-0 w-full h-full p-8 flex flex-col justify-between items-center rounded-2xl border bg-card"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <div className="w-full flex justify-between items-center">
              <Badge variant="outline" className="text-xs">Định nghĩa & Ngữ cảnh</Badge>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={(e) => { e.stopPropagation(); speak(currentCard.term); }}>
                <Volume2 className="w-5 h-5" />
              </Button>
            </div>

            <div className="text-center my-auto max-w-xl">
              <p className="text-2xl font-semibold text-primary mb-4 leading-relaxed">{currentCard.definition}</p>
              {currentCard.example && (
                <blockquote className="italic text-muted-foreground bg-muted/40 p-4 rounded-xl border-l-4 border-primary text-base">
                  "{currentCard.example}"
                </blockquote>
              )}
              {currentCard.synonyms && currentCard.synonyms.length > 0 && (
                <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                  <span className="text-xs font-semibold text-muted-foreground self-center mr-1">Đồng nghĩa:</span>
                  {currentCard.synonyms.map((syn, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">{syn}</Badge>
                  ))}
                </div>
              )}
            </div>

            <span className="text-xs text-muted-foreground">Đánh giá độ nhớ bên dưới để lên lịch ôn tiếp</span>
          </Card>
        </motion.div>
      </div>

      {/* SRS Rating Buttons */}
      <div className="w-full mt-6 grid grid-cols-4 gap-3 max-w-2xl">
        <Button variant="outline" className="border-red-300 hover:bg-red-50 hover:text-red-600 flex flex-col h-auto py-2.5" onClick={() => handleRate('again')}>
          <span className="font-bold text-sm">Again [1]</span>
          <span className="text-[11px] text-muted-foreground">&lt; 1 ngày</span>
        </Button>
        <Button variant="outline" className="border-amber-300 hover:bg-amber-50 hover:text-amber-600 flex flex-col h-auto py-2.5" onClick={() => handleRate('hard')}>
          <span className="font-bold text-sm">Hard [2]</span>
          <span className="text-[11px] text-muted-foreground">~3 ngày</span>
        </Button>
        <Button variant="outline" className="border-blue-300 hover:bg-blue-50 hover:text-blue-600 flex flex-col h-auto py-2.5" onClick={() => handleRate('good')}>
          <span className="font-bold text-sm">Good [3]</span>
          <span className="text-[11px] text-muted-foreground">~7 ngày</span>
        </Button>
        <Button variant="outline" className="border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 flex flex-col h-auto py-2.5" onClick={() => handleRate('easy')}>
          <span className="font-bold text-sm">Easy [4]</span>
          <span className="text-[11px] text-muted-foreground">~14+ ngày</span>
        </Button>
      </div>

      {/* Nav Controls */}
      <div className="flex items-center justify-between w-full max-w-2xl mt-4">
        <Button variant="ghost" size="sm" onClick={handlePrev} disabled={currentIndex === 0}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Thẻ trước
        </Button>
        <span className="text-xs text-muted-foreground">Phím [←] [→] chuyển thẻ</span>
        <Button variant="ghost" size="sm" onClick={handleNext}>
          Tiếp theo <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};
```

---

## 3. TIÊU CHUẨN NGHIỆM THU (DEFINITION OF DONE - DOD)
1. Thẻ lật 3D 60fps mượt mà khi bấm chuột hoặc nhấn phím Space.
2. Web Speech TTS tự động đọc từ vựng bản xứ với âm thanh rõ ràng, không bị méo tiếng.
3. Bấm phím số `1`, `2`, `3`, `4` kích hoạt chính xác rating tương ứng và tự động nhảy sang thẻ tiếp theo.
4. Chấm điểm giọng đọc bằng Micro nhận diện chính xác các từ vựng tiếng Anh thông dụng.
