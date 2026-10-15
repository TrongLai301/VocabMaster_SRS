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

  const stop = useCallback(() => {
    // 1. Dừng audio HTML5 ngay lập tức
    if (audioRef.current) {
      audioRef.current.pause();
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
  const fallbackWebSpeech = useCallback((text: string, options?: UseSpeechTTSOptions) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang || optionsRef.current.lang || 'en-US';
      utterance.rate = options?.rate ?? optionsRef.current.rate ?? 0.9;
      utterance.pitch = options?.pitch ?? optionsRef.current.pitch ?? 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  }, []);

  // Fallback 2: Google TTS Audio
  const fallbackGoogleTTS = useCallback((text: string, options?: UseSpeechTTSOptions) => {
    try {
      const gUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
      const gAudio = new Audio(gUrl);
      audioRef.current = gAudio;

      gAudio.onplay = () => setIsSpeaking(true);
      gAudio.onended = () => {
        setIsSpeaking(false);
        audioRef.current = null;
      };
      gAudio.onerror = () => {
        fallbackWebSpeech(text, options);
      };

      const p = gAudio.play();
      if (p !== undefined) {
        p.catch(() => fallbackWebSpeech(text, options));
      }
    } catch {
      fallbackWebSpeech(text, options);
    }
  }, [fallbackWebSpeech]);

  // Hàm phát âm chính (Primary: Authentic Native US English Audio Stream)
  const speak = useCallback(
    (text: string, options?: UseSpeechTTSOptions) => {
      if (!text || !text.trim()) return;
      const cleanText = text.trim();

      // Dừng âm thanh cũ
      stop();

      try {
        const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(cleanText)}&type=2`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          audioRef.current = null;
        };
        audio.onerror = () => {
          console.warn('[Audio] Primary audio error, fallback to Google TTS');
          fallbackGoogleTTS(cleanText, options);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[Audio] Primary play blocked, fallback to Google TTS:', err.message);
            fallbackGoogleTTS(cleanText, options);
          });
        }
      } catch {
        fallbackGoogleTTS(cleanText, options);
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
