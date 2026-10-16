import { useCallback, useState, useRef, useEffect } from 'react';

export interface UseSpeechTTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

export function useSpeechTTS(defaultOptions: UseSpeechTTSOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const optionsRef = useRef(defaultOptions);
  optionsRef.current = defaultOptions;

  // Track token phiên phát âm hiện tại để hủy mọi callback cũ khi spam
  const activeReqIdRef = useRef<number>(0);
  const lastSpeakTimeRef = useRef<number>(0);

  const stop = useCallback(() => {
    activeReqIdRef.current += 1;

    // 1. Dừng audio HTML5 ngay lập tức
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.src = '';
      audioRef.current = null;
    }

    // 2. Dừng WebSpeech ngay lập tức
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
  }, []);

  // Dọn dẹp triệt để khi component unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Fallback 1: Web Speech API bản xứ của trình duyệt
  const fallbackWebSpeech = useCallback((text: string, options?: UseSpeechTTSOptions, reqId?: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }

    if (reqId !== undefined && reqId !== activeReqIdRef.current) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang || optionsRef.current.lang || 'en-US';
      utterance.rate = options?.rate ?? optionsRef.current.rate ?? 0.9;
      utterance.pitch = options?.pitch ?? optionsRef.current.pitch ?? 1.0;

      utterance.onstart = () => {
        if (reqId === undefined || reqId === activeReqIdRef.current) {
          setIsSpeaking(true);
        }
      };
      utterance.onend = () => {
        if (reqId === undefined || reqId === activeReqIdRef.current) {
          setIsSpeaking(false);
        }
      };
      utterance.onerror = () => {
        if (reqId === undefined || reqId === activeReqIdRef.current) {
          setIsSpeaking(false);
        }
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  // Fallback 2: Google TTS Audio
  const fallbackGoogleTTS = useCallback((text: string, options?: UseSpeechTTSOptions, reqId?: number) => {
    if (reqId !== undefined && reqId !== activeReqIdRef.current) {
      return;
    }

    try {
      const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
      const gAudio = new Audio(gUrl);
      audioRef.current = gAudio;

      gAudio.onplay = () => {
        if (reqId === undefined || reqId === activeReqIdRef.current) {
          setIsSpeaking(true);
        }
      };
      gAudio.onended = () => {
        if (reqId === undefined || reqId === activeReqIdRef.current) {
          setIsSpeaking(false);
          audioRef.current = null;
        }
      };
      gAudio.onerror = () => {
        if (reqId === undefined || reqId === activeReqIdRef.current) {
          fallbackWebSpeech(text, options, reqId);
        }
      };

      const p = gAudio.play();
      if (p !== undefined) {
        p.catch((err: any) => {
          if (err?.name === 'AbortError' || (reqId !== undefined && reqId !== activeReqIdRef.current)) {
            return;
          }
          fallbackWebSpeech(text, options, reqId);
        });
      }
    } catch {
      fallbackWebSpeech(text, options, reqId);
    }
  }, [fallbackWebSpeech]);

  // Hàm phát âm chính (Primary: Authentic Native US English Audio Stream)
  const speak = useCallback(
    (text: string, options?: UseSpeechTTSOptions) => {
      if (!text || !text.trim()) return;
      const cleanText = text.trim();

      // Chống spam: nếu vừa gọi cách đây dưới 200ms thì bỏ qua
      const now = Date.now();
      if (now - lastSpeakTimeRef.current < 200) {
        return;
      }
      lastSpeakTimeRef.current = now;

      // Dừng phiên âm thanh cũ và tạo token phiên mới
      stop();
      activeReqIdRef.current += 1;
      const currentReqId = activeReqIdRef.current;

      try {
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&type=2`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          if (currentReqId === activeReqIdRef.current) {
            setIsSpeaking(true);
          }
        };
        audio.onended = () => {
          if (currentReqId === activeReqIdRef.current) {
            setIsSpeaking(false);
            audioRef.current = null;
          }
        };
        audio.onerror = () => {
          if (currentReqId !== activeReqIdRef.current) return;
          console.warn('[Audio] Primary audio error, fallback to Google TTS');
          fallbackGoogleTTS(cleanText, options, currentReqId);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err: any) => {
            // Nếu bị hủy chủ động bởi stop() hoặc phát âm mới, bỏ qua không gọi fallback
            if (err?.name === 'AbortError' || currentReqId !== activeReqIdRef.current) {
              return;
            }
            console.warn('[Audio] Primary play blocked, fallback to Google TTS:', err?.message);
            fallbackGoogleTTS(cleanText, options, currentReqId);
          });
        }
      } catch {
        fallbackGoogleTTS(cleanText, options, currentReqId);
      }
    },
    [stop, fallbackGoogleTTS]
  );

  return {
    speak,
    stop,
    isSpeaking,
    isSupported: true,
  };
}
