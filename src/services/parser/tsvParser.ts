export interface ParsedCardItem {
  term: string;
  synonyms: string[];
  ipa: string;
  partOfSpeech: string;
  example: string;
  definition: string;
  isValid: boolean;
  errors?: string[];
}

export interface ParseResult {
  items: ParsedCardItem[];
  totalParsed: number;
  validCount: number;
  invalidCount: number;
}

export const SAMPLE_TSV_DATA = `Word\tSynonyms\tIPA\tPartOfSpeech\tExample\tDefinition
ubiquitous\tomnipresent, pervasive\tjuːˈbɪk.wə.t̬əs\tadjective\tSmartphones have become ubiquitous in daily modern life.\tPresent, appearing, or found everywhere at the same time.
ephemeral\ttransient, fleeting\tɪˈfem.ər.əl\tadjective\tFame in the digital age can be remarkably ephemeral.\tLasting for a very short time; short-lived.
meticulous\tthorough, conscientious\tməˈtɪk.jə.ləs\tadjective\tHe kept meticulous records of all his financial transactions.\tShowing great attention to detail; very careful and precise.
resilience\ttoughness, adaptability\trɪˈzɪl.jəns\tnoun\tThe economic resilience of the community surprised analysts.\tThe capacity to withstand or recover quickly from difficulties.
pragmatic\tpractical, realistic\tpræɡˈmæt̬.ɪk\tadjective\tShe took a pragmatic approach to solving the team's dispute.\tDealing with things sensibly and realistically in a practical way.`;

export function parseTsvVocabulary(tsvRawContent: string): ParseResult {
  const lines = tsvRawContent.split(/\r?\n/);
  const items: ParsedCardItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue; // Bỏ qua dòng trống

    const columns = rawLine.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));

    // Bỏ qua dòng tiêu đề nếu có
    if (
      i === 0 &&
      (columns[0].toLowerCase() === 'word' || columns[0].toLowerCase() === 'term')
    ) {
      continue;
    }

    const errors: string[] = [];
    const term = columns[0] || '';
    const synonymsRaw = columns[1] || '';
    const ipaRaw = columns[2] || '';
    const partOfSpeech = columns[3] || '';
    const example = columns[4] || '';
    const definition = columns[5] || '';

    if (!term) errors.push(`Dòng ${i + 1}: Thiếu từ vựng chính (Word).`);
    if (!definition) errors.push(`Dòng ${i + 1}: Thiếu định nghĩa (Definition).`);

    // Chuẩn hóa IPA
    let ipa = ipaRaw;
    if (ipa && !ipa.startsWith('/')) {
      ipa = `/${ipa}/`;
    }

    // Tách mảng từ đồng nghĩa
    const synonyms = synonymsRaw
      ? synonymsRaw
          .split(/[,;/]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    items.push({
      term,
      synonyms,
      ipa,
      partOfSpeech: partOfSpeech.toLowerCase() || 'vocabulary',
      example,
      definition,
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    });
  }

  const validCount = items.filter((item) => item.isValid).length;

  return {
    items,
    totalParsed: items.length,
    validCount,
    invalidCount: items.length - validCount,
  };
}
