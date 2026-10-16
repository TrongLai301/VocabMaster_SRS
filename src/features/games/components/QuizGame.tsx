import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card as CardType } from '@/types/database.types';
import { generateQuizQuestions, QuizQuestion } from '@/features/games/utils/quizGenerator';
import { useSpeechTTS } from '@/hooks/useSpeechTTS';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Volume2, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  RotateCcw, 
  Flame, 
  Sparkles, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { soundFX } from '@/lib/audioFX';

interface QuizGameProps {
  cards: CardType[];
  onFinish?: (score: number, total: number) => void;
  onExit?: () => void;
}

export const QuizGame: React.FC<QuizGameProps> = ({ cards, onFinish, onExit }) => {
  const questions = useMemo(() => generateQuizQuestions(cards), [cards]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const { speak, isSpeaking } = useSpeechTTS();
  const currentQuestion: QuizQuestion | undefined = questions[currentIndex];
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Xử lý chọn đáp án
  const handleSelectOption = useCallback(
    (option: string) => {
      if (isAnswered || !currentQuestion) return;

      setSelectedOption(option);
      setIsAnswered(true);

      const isCorrect = option === currentQuestion.correctAnswer;

      if (isCorrect) {
        soundFX.playSuccess();
        const comboBonus = combo * 10;
        setScore((prev) => prev + 100 + comboBonus);
        setCombo((prev) => {
          const next = prev + 1;
          setMaxCombo((m) => Math.max(m, next));
          return next;
        });
        setCorrectCount((prev) => prev + 1);

        // Tự động phát âm từ vựng khi trả lời đúng
        speak(currentQuestion.term);
      } else {
        soundFX.playError();
        setCombo(0);
      }
    },
    [isAnswered, currentQuestion, combo, speak]
  );

  // Chuyển sang câu tiếp theo
  const handleNextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      soundFX.playVictory();
      setIsGameOver(true);
      if (onFinish) {
        onFinish(score, questions.length);
      }
    }
  }, [currentIndex, questions.length, score, onFinish]);

  // Keyboard Shortcuts: 1, 2, 3, 4 chọn đáp án, Space chuyển câu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'Control' || e.code === 'ControlLeft' || e.code === 'ControlRight') {
        e.preventDefault();
        if (e.repeat) return;
        if (currentQuestion?.term) {
          speak(currentQuestion.term);
        }
        return;
      }

      if (!isAnswered && currentQuestion) {
        if (['Digit1', 'Numpad1'].includes(e.code) && currentQuestion.options[0]) {
          handleSelectOption(currentQuestion.options[0]);
        } else if (['Digit2', 'Numpad2'].includes(e.code) && currentQuestion.options[1]) {
          handleSelectOption(currentQuestion.options[1]);
        } else if (['Digit3', 'Numpad3'].includes(e.code) && currentQuestion.options[2]) {
          handleSelectOption(currentQuestion.options[2]);
        } else if (['Digit4', 'Numpad4'].includes(e.code) && currentQuestion.options[3]) {
          handleSelectOption(currentQuestion.options[3]);
        }
      } else if (isAnswered && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        handleNextQuestion();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, currentQuestion, handleSelectOption, handleNextQuestion, speak]);

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setIsGameOver(false);
  };

  if (questions.length < 2) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <HelpCircle className="w-12 h-12 mx-auto text-muted-foreground" />
        <h3 className="text-lg font-bold">Cần tối thiểu 2 từ vựng</h3>
        <p className="text-xs text-muted-foreground">
          Bộ thẻ cần có từ 2 từ trở lên để tạo câu hỏi trắc nghiệm tự động.
        </p>
        {onExit && (
          <Button onClick={onExit} variant="outline" size="sm">
            Quay lại
          </Button>
        )}
      </div>
    );
  }

  // MÀN HÌNH TỔNG KẾT KHI HOÀN THÀNH QUIZ
  if (isGameOver) {
    const accuracy = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="max-w-lg mx-auto py-8 text-center space-y-6 animate-in zoom-in-95 duration-200 select-none">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center shadow-lg">
          <Trophy className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground font-sans">
            Hoàn thành bài trắc nghiệm! 🎉
          </h2>
          <p className="text-sm text-muted-foreground">
            Bạn đã hoàn thành toàn bộ <strong>{questions.length}</strong> câu hỏi trắc nghiệm tốc độ.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl border bg-card">
          <div className="text-center p-3 rounded-xl bg-primary/5">
            <span className="text-xs text-muted-foreground font-semibold block">Điểm số</span>
            <span className="text-2xl font-black text-primary font-mono">{score}</span>
          </div>

          <div className="text-center p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30">
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold block">Chính xác</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {accuracy}%
            </span>
          </div>

          <div className="text-center p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30">
            <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold block">Max Combo</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              🔥 x{maxCombo}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button onClick={handleRestart} variant="outline" className="w-full sm:w-auto gap-2">
            <RotateCcw className="w-4 h-4" />
            <span>Làm lại bài này</span>
          </Button>

          {onExit && (
            <Button onClick={onExit} className="w-full sm:w-auto gap-2 shadow-md">
              <CheckCircle2 className="w-4 h-4" />
              <span>Kết thúc</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  const isCorrectAnswer = selectedOption === currentQuestion.correctAnswer;

  return (
    <div className="max-w-2xl mx-auto space-y-6 select-none">
      {/* Top Header: Progress, Score & Combo */}
      <div className="flex items-center justify-between gap-4 bg-card p-4 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-mono font-bold text-muted-foreground whitespace-nowrap">
            Câu {currentIndex + 1} / {questions.length}
          </span>
          <Progress value={progressPercent} className="h-2 flex-1 max-w-xs" />
        </div>

        <div className="flex items-center gap-3">
          {combo > 1 && (
            <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 animate-pulse font-mono font-bold">
              <Flame className="w-3.5 h-3.5 fill-amber-500" />
              <span>x{combo} Combo</span>
            </Badge>
          )}

          <div className="text-right">
            <span className="text-xs font-semibold text-muted-foreground block text-[10px] uppercase">Điểm</span>
            <span className="text-base font-black text-primary font-mono">{score}</span>
          </div>
        </div>
      </div>

      {/* Question Card */}
      <div className="p-8 sm:p-10 rounded-3xl border bg-card shadow-lg text-center space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="uppercase font-mono text-[10px]">
            {currentQuestion.questionType === 'term_to_def'
              ? currentQuestion.partOfSpeech || 'Từ vựng'
              : 'Chọn từ tương ứng'}
          </Badge>

          <Button
            size="sm"
            variant="ghost"
            className={`h-8 px-2 sm:px-2.5 rounded-full text-xs font-semibold gap-1 sm:gap-1.5 transition-all cursor-pointer ${
              isSpeaking ? 'text-primary bg-primary/10 animate-pulse' : 'text-muted-foreground hover:bg-primary/10 hover:text-primary'
            }`}
            onClick={() => speak(currentQuestion.term)}
            title="Phát âm từ vựng (Phím tắt: [Ctrl])"
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-muted/80 text-muted-foreground border border-border/50 uppercase">
              Ctrl
            </span>
          </Button>
        </div>

        {currentQuestion.questionType === 'term_to_def' ? (
          <div className="space-y-2 py-4">
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground font-sans">
              {currentQuestion.prompt}
            </h2>
            {currentQuestion.ipa && (
              <p className="text-lg text-muted-foreground font-mono">{currentQuestion.ipa}</p>
            )}
          </div>
        ) : (
          <div className="space-y-2 py-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Định nghĩa:
            </span>
            <p className="text-2xl sm:text-3xl font-bold text-primary leading-relaxed">
              "{currentQuestion.prompt}"
            </p>
          </div>
        )}
      </div>

      {/* 4 Answer Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentQuestion.options.map((option, idx) => {
          const letter = String.fromCharCode(65 + idx); // A, B, C, D
          const isSelected = selectedOption === option;
          const isCorrect = option === currentQuestion.correctAnswer;

          let btnStyle = 'border bg-card hover:bg-muted/60 text-card-foreground';
          if (isAnswered) {
            if (isCorrect) {
              btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 font-bold shadow-sm';
            } else if (isSelected && !isCorrect) {
              btnStyle = 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 shadow-sm';
            } else {
              btnStyle = 'opacity-40 border bg-muted/20';
            }
          }

          return (
            <button
              key={idx}
              disabled={isAnswered}
              onClick={() => handleSelectOption(option)}
              className={`p-4 rounded-2xl text-left flex items-start gap-3 transition-all cursor-pointer ${btnStyle}`}
            >
              <span className="w-7 h-7 rounded-xl bg-muted/80 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                {letter}
              </span>
              <span className="text-sm font-medium leading-relaxed flex-1 pt-0.5">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback & Next Button Area */}
      {isAnswered && (
        <div className="p-4 rounded-2xl border bg-card flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in-50 duration-150">
          <div className="flex items-center gap-2">
            {isCorrectAnswer ? (
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Chính xác! +{100 + (combo - 1) * 10} điểm</span>
              </div>
            ) : (
              <div className="text-sm">
                <div className="flex items-center gap-2 text-rose-600 font-bold">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <span>Chưa đúng! Đáp án đúng: <strong>{currentQuestion.correctAnswer}</strong></span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 ml-7">
                  <span className="font-semibold">{currentQuestion.term}</span>: {currentQuestion.definition}
                  {currentQuestion.example && <span> &bull; <em>"{currentQuestion.example}"</em></span>}
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleNextQuestion} className="w-full sm:w-auto gap-2 font-semibold shadow-md">
            <span>{currentIndex < questions.length - 1 ? 'Câu tiếp theo [Space]' : 'Xem kết quả'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
