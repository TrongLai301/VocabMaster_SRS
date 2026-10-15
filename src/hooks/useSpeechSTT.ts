import { useState, useCallback, useRef } from 'react';

export interface SpeechRecognitionResult {
  transcript: string;
  isMatch: boolean;
  confidence: number;
}

export function useSpeechSTT() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const startListening = useCallback(
    (targetWord: string, onResult: (res: SpeechRecognitionResult) => void, lang = 'en-US') => {
      if (!isSupported) {
        setError('Trình duyệt không hỗ trợ Web Speech Recognition');
        return;
      }

      setError(null);
      setTranscript('');

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang = lang;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setError(`Lỗi nhận diện âm thanh: ${event.error}`);
        }
      };

      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
        const target = targetWord.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '');
        const confidence = event.results[0][0].confidence || 1.0;

        setTranscript(spoken);

        // Kiểm tra khớp từ hoặc kiểm tra các phương án thay thế
        let isMatch = spoken === target;
        if (!isMatch && event.results[0].length > 1) {
          for (let i = 1; i < event.results[0].length; i++) {
            const alt = event.results[0][i].transcript.trim().toLowerCase();
            if (alt === target) {
              isMatch = true;
              break;
            }
          }
        }

        onResult({
          transcript: spoken,
          isMatch,
          confidence,
        });
      };

      recognition.start();
    },
    [isSupported]
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
  };
}
