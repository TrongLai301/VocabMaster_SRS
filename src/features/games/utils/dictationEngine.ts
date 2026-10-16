export interface DiffCharacter {
  char: string;
  status: 'correct' | 'incorrect' | 'missing';
}

export interface DictationCheckResult {
  isExactMatch: boolean;
  isSynonymMatch: boolean;
  matchedWord: string;
  userNormalized: string;
  targetNormalized: string;
  diffChars: DiffCharacter[];
}

export type DictationSubMode = 'listen_write' | 'meaning_to_word' | 'word_to_meaning' | 'mixed';

/**
 * Chuẩn hóa chuỗi nhập liệu: loại bỏ ký tự khoảng trắng thừa, chuyển chữ thường,
 * giữ lại các ký tự chữ cái, số, dấu nối và khoảng cách chuẩn.
 */
export function normalizeInput(str: string): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/[.,;!?]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * So sánh kết quả người dùng gõ từ vựng tiếng Anh với từ gốc hoặc các từ đồng nghĩa
 */
export function evaluateDictation(
  userInput: string,
  targetTerm: string,
  synonyms: string[] = []
): DictationCheckResult {
  const userNorm = normalizeInput(userInput);
  const targetNorm = normalizeInput(targetTerm);

  // 1. Khớp chính xác với từ vựng gốc
  if (userNorm === targetNorm) {
    return {
      isExactMatch: true,
      isSynonymMatch: false,
      matchedWord: targetTerm,
      userNormalized: userNorm,
      targetNormalized: targetNorm,
      diffChars: targetNorm.split('').map((char) => ({ char, status: 'correct' })),
    };
  }

  // 2. Khớp với bất kỳ từ đồng nghĩa nào
  const matchedSyn = synonyms.find((s) => normalizeInput(s) === userNorm);
  if (matchedSyn) {
    return {
      isExactMatch: false,
      isSynonymMatch: true,
      matchedWord: matchedSyn,
      userNormalized: userNorm,
      targetNormalized: targetNorm,
      diffChars: userNorm.split('').map((char) => ({ char, status: 'correct' })),
    };
  }

  // 3. Phân tích khác biệt ký tự chi tiết giữa input và từ gốc
  const diffChars: DiffCharacter[] = [];
  const maxLen = Math.max(userNorm.length, targetNorm.length);

  for (let i = 0; i < maxLen; i++) {
    const userChar = userNorm[i];
    const targetChar = targetNorm[i];

    if (!userChar && targetChar) {
      diffChars.push({ char: targetChar, status: 'missing' });
    } else if (userChar && !targetChar) {
      diffChars.push({ char: userChar, status: 'incorrect' });
    } else if (userChar === targetChar) {
      diffChars.push({ char: userChar, status: 'correct' });
    } else {
      diffChars.push({ char: userChar, status: 'incorrect' });
    }
  }

  return {
    isExactMatch: false,
    isSynonymMatch: false,
    matchedWord: targetTerm,
    userNormalized: userNorm,
    targetNormalized: targetNorm,
    diffChars,
  };
}

/**
 * So sánh kết quả gõ định nghĩa tiếng Việt/Anh (Word -> Meaning)
 * Hỗ trợ tách các nghĩa ngăn cách bởi dấu phẩy, chấm phẩy, gạch chéo
 */
export function evaluateDefinition(
  userInput: string,
  targetDefinition: string
): DictationCheckResult {
  const userNorm = normalizeInput(userInput);
  const targetNorm = normalizeInput(targetDefinition);

  // 1. Khớp nguyên văn định nghĩa
  if (userNorm === targetNorm) {
    return {
      isExactMatch: true,
      isSynonymMatch: false,
      matchedWord: targetDefinition,
      userNormalized: userNorm,
      targetNormalized: targetNorm,
      diffChars: targetNorm.split('').map((char) => ({ char, status: 'correct' })),
    };
  }

  // 2. Tách các phân đoạn nghĩa nếu có (ví dụ: "tính từ, thuộc tính chất" hoặc "từ ngữ / lời nói")
  const segments = targetDefinition
    .split(/[,;/()]/)
    .map((s) => normalizeInput(s))
    .filter((s) => s.length > 0);

  const matchedSegment = segments.find((seg) => seg === userNorm || userNorm.includes(seg) || seg.includes(userNorm));
  if (matchedSegment) {
    return {
      isExactMatch: false,
      isSynonymMatch: true,
      matchedWord: matchedSegment,
      userNormalized: userNorm,
      targetNormalized: targetNorm,
      diffChars: userNorm.split('').map((char) => ({ char, status: 'correct' })),
    };
  }

  // 3. Phân tích khác biệt ký tự
  const diffChars: DiffCharacter[] = [];
  const maxLen = Math.max(userNorm.length, targetNorm.length);

  for (let i = 0; i < maxLen; i++) {
    const userChar = userNorm[i];
    const targetChar = targetNorm[i];

    if (!userChar && targetChar) {
      diffChars.push({ char: targetChar, status: 'missing' });
    } else if (userChar && !targetChar) {
      diffChars.push({ char: userChar, status: 'incorrect' });
    } else if (userChar === targetChar) {
      diffChars.push({ char: userChar, status: 'correct' });
    } else {
      diffChars.push({ char: userChar, status: 'incorrect' });
    }
  }

  return {
    isExactMatch: false,
    isSynonymMatch: false,
    matchedWord: targetDefinition,
    userNormalized: userNorm,
    targetNormalized: targetNorm,
    diffChars,
  };
}

/**
 * Tạo câu ví dụ che từ (Cloze Question) để tạo phản xạ nhận diện từ trong ngữ cảnh
 */
export function createClozeExample(example: string | null | undefined, term: string): string {
  if (!example || !term) return '';
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
  if (regex.test(example)) {
    return example.replace(regex, '_______');
  }
  const simpleRegex = new RegExp(escaped, 'gi');
  if (simpleRegex.test(example)) {
    return example.replace(simpleRegex, '_______');
  }
  return example;
}

