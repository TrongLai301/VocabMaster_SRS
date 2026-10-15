import { Card } from '@/types/database.types';

export interface QuizQuestion {
  cardId: string;
  term: string;
  definition: string;
  ipa?: string | null;
  partOfSpeech?: string | null;
  example?: string | null;
  prompt: string;          // Nội dung hiển thị trong đề bài (nếu term_to_def: term; nếu def_to_term: definition)
  correctAnswer: string;   // Đáp án đúng để so khớp khi người dùng bấm chọn (A/B/C/D)
  options: string[];       // 4 lựa chọn A, B, C, D đã shuffle
  questionType: 'term_to_def' | 'def_to_term';
}

/**
 * Xáo trộn mảng ngẫu nhiên (Fisher-Yates shuffle)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Tự động tạo bộ câu hỏi trắc nghiệm 4 đáp án từ danh sách thẻ
 */
export function generateQuizQuestions(
  cards: Card[],
  count?: number
): QuizQuestion[] {
  if (cards.length < 2) return [];

  const shuffledCards = shuffleArray(cards);
  const selectedCards = count ? shuffledCards.slice(0, count) : shuffledCards;

  return selectedCards.map((card, index) => {
    // Luân phiên loại câu hỏi: hỏi Từ chọn Nghĩa, hoặc hỏi Nghĩa chọn Từ
    const questionType: 'term_to_def' | 'def_to_term' =
      index % 3 === 2 ? 'def_to_term' : 'term_to_def';

    if (questionType === 'term_to_def') {
      // Câu hỏi: Hiển thị Term (tiếng Anh) -> 4 đáp án là Definition (tiếng Việt)
      const otherDefinitions = Array.from(
        new Set(cards.filter((c) => c.id !== card.id).map((c) => c.definition))
      );
      const distractors = shuffleArray(otherDefinitions).slice(0, 3);
      const options = shuffleArray([card.definition, ...distractors]);

      return {
        cardId: card.id,
        term: card.term,
        definition: card.definition,
        ipa: card.ipa,
        partOfSpeech: card.part_of_speech,
        example: card.example,
        prompt: card.term,
        correctAnswer: card.definition,
        options,
        questionType,
      };
    } else {
      // Câu hỏi: Hiển thị Definition (tiếng Việt) -> 4 đáp án là Term (tiếng Anh)
      const otherTerms = Array.from(
        new Set(cards.filter((c) => c.id !== card.id).map((c) => c.term))
      );
      const distractors = shuffleArray(otherTerms).slice(0, 3);
      const options = shuffleArray([card.term, ...distractors]);

      return {
        cardId: card.id,
        term: card.term,
        definition: card.definition,
        ipa: card.ipa,
        partOfSpeech: card.part_of_speech,
        example: card.example,
        prompt: card.definition, // Hiển thị đúng nghĩa tiếng Việt ở đề bài
        correctAnswer: card.term, // Đáp án đúng là từ tiếng Anh
        options,
        questionType,
      };
    }
  });
}
