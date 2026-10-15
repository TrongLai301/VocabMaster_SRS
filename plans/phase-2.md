# PHASE 2: QUẢN LÝ THƯ MỤC, BỘ THẺ & TSV IMPORT ENGINE (OPENQUIZ FLAT LIST)

> **Thời gian dự kiến**: 3 - 4 ngày  
> **Mục tiêu**: Xây dựng toàn bộ hệ thống quản lý dữ liệu học tập (Folders -> Study Sets -> Cards), công cụ nạp từ vựng cực nhanh từ TSV (Clipboard / File) và bảng tra cứu Flat List chuẩn phong cách OpenQuiz.

---

## 1. CHECKLIST CÔNG VIỆC CỤ THỂ

- [ ] **2.1. Quản lý Thư mục (Folders CRUD)**:
  - Tạo `src/features/study-sets/components/CreateFolderDialog.tsx`: Hỗ trợ đặt tên, mô tả, chọn mã màu icon.
  - Xây dựng API service `src/services/api/folderService.ts` tương tác Supabase.
  - Hiển thị danh sách Folders dạng Grid/Cards kèm số lượng bộ thẻ bên trong.

- [ ] **2.2. Quản lý Bộ thẻ (Study Sets CRUD)**:
  - Tạo `src/features/study-sets/components/CreateStudySetDialog.tsx`: Tiêu đề, mô tả, chọn Folder cha, Tags, toggle Public/Private.
  - Xây dựng API service `src/services/api/studySetService.ts`.
  - Màn hình chi tiết bộ thẻ: `src/features/study-sets/pages/StudySetDetailPage.tsx`.

- [ ] **2.3. Xây dựng TSV Parser & Bulk Import Engine**:
  - Tạo file `src/services/parser/tsvParser.ts`:
    - Định dạng chuẩn 6 cột: `Word \t Synonyms \t IPA \t PartOfSpeech \t Example \t Definition`.
    - Tự động bỏ qua dòng header (nếu cột đầu là `Word` hoặc `Term`).
    - Chuẩn hóa IPA (tự bọc `/.../` nếu thiếu).
    - Tách mảng synonyms (phân cách bởi dấu phẩy, chấm phẩy hoặc slash).
    - Validate bắt buộc có `term` và `definition`, báo lỗi kèm số dòng cụ thể.
  - Tạo component `src/features/study-sets/components/ImportTsvModal.tsx`:
    - Tab 1: Paste từ Clipboard (Textarea).
    - Tab 2: Kéo thả file `.tsv` hoặc `.txt`.
    - Bảng xem trước dữ liệu (Preview Table) với badge đánh dấu dòng hợp lệ / không hợp lệ.
    - Nút "Nhập vào bộ thẻ" thực hiện bulk insert vào bảng `cards` qua Supabase.

- [ ] **2.4. Giao diện Flat List Tra Cứu (Chuẩn OpenQuiz Style)**:
  - Tạo component `src/features/study-sets/components/CardFlatListTable.tsx`:
    - Cột: *Từ vựng (Term)*, *Phiên âm (IPA)*, *Loại từ (Part of Speech - Badge)*, *Định nghĩa*, *Câu ví dụ*, *Trạng thái học*.
    - Nút phát âm loa nhanh trên từng dòng (Web Speech TTS).
    - Nút sửa/xóa từng thẻ thủ công.
  - Thanh công cụ phía trên bảng:
    - Ô tìm kiếm tức thì (Instant Search) theo từ vựng hoặc nghĩa.
    - Lọc theo loại từ (All, Noun, Verb, Adjective, Adverb, Idiom/Phrase).
    - Bộ đếm tổng số từ đang hiển thị.

---

## 2. CODE CỐT LÕI PHASE 2

### 2.1. File: `src/services/parser/tsvParser.ts`
```typescript
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

export function parseTsvVocabulary(tsvRawContent: string): ParseResult {
  const lines = tsvRawContent.split(/\r?\n/);
  const items: ParsedCardItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Tách cột bằng Tab
    const columns = rawLine.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));

    // Bỏ qua header nếu có
    if (
      i === 0 &&
      (columns[0].toLowerCase() === 'word' || columns[0].toLowerCase() === 'term')
    ) {
      continue;
    }

    const errors: string[] = [];
    const term = columns[0] || '';
    const synonymsRaw = columns[1] || '';
    const ipa = columns[2] || '';
    const partOfSpeech = columns[3] || '';
    const example = columns[4] || '';
    const definition = columns[5] || '';

    if (!term) errors.push(`Dòng ${i + 1}: Thiếu từ vựng chính (Word).`);
    if (!definition) errors.push(`Dòng ${i + 1}: Thiếu định nghĩa (Definition).`);

    const synonyms = synonymsRaw
      ? synonymsRaw.split(/[,;/]/).map((s) => s.trim()).filter(Boolean)
      : [];

    items.push({
      term,
      synonyms,
      ipa: ipa.startsWith('/') ? ipa : (ipa ? `/${ipa}/` : ''),
      partOfSpeech: partOfSpeech.toLowerCase(),
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
```

### 2.2. Service chèn hàng loạt vào Supabase (`src/services/api/cardService.ts`)
```typescript
import { supabase } from '@/services/supabase';
import { ParsedCardItem } from '@/services/parser/tsvParser';

export async function bulkInsertCards(setId: string, items: ParsedCardItem[]) {
  const validItems = items.filter((item) => item.isValid);
  if (validItems.length === 0) return { count: 0 };

  const recordsToInsert = validItems.map((item, index) => ({
    set_id: setId,
    term: item.term,
    ipa: item.ipa,
    part_of_speech: item.partOfSpeech,
    definition: item.definition,
    example: item.example,
    synonyms: item.synonyms,
    order_index: index,
  }));

  const { data, error } = await supabase.from('cards').insert(recordsToInsert).select();
  if (error) throw error;
  return { count: data.length };
}
```

---

## 3. TIÊU CHUẨN NGHIỆM THU (DEFINITION OF DONE - DOD)
1. Tạo thành công Thư mục và Bộ thẻ mới, dữ liệu lưu chuẩn vào Supabase.
2. Thao tác dán Clipboard 100+ từ vựng dạng TSV:
   - Parser hoàn thành trong < 200ms.
   - Bảng xem trước hiển thị rõ ràng, đánh dấu chính xác dòng bị thiếu cột nếu có.
   - Bấm nút Import: Dữ liệu được lưu vào bảng `cards` và tổng số thẻ của set được cập nhật tự động.
3. Bảng Flat List hiển thị mượt mà: Có thể tìm kiếm tức thì theo từ vựng và lọc theo loại từ.
