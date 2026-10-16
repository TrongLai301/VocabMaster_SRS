# PHASE 7: QUẢN LÝ FOLDER/BỘ THẺ NÂNG CAO & CHẾ ĐỘ HỌC NGHE - VIẾT CHÍNH TẢ (DICTATION MODE)

> **Mục tiêu**: 
> 1. Bổ sung tính năng **Xóa Thư mục (Delete Folder)** an toàn: Chỉ xóa bản ghi folder, toàn bộ bộ thẻ con bên trong vẫn được bảo toàn nguyên vẹn và tự động chuyển ra ngoài danh mục độc lập (`folder_id = NULL`).
> 2. Bổ sung tính năng **Xóa Bộ thẻ (Delete Study Set)** triệt để: Xóa bộ thẻ kèm dọn dẹp toàn bộ flashcards và tiến trình học SRS liên quan, có hộp thoại cảnh báo xác nhận (Destructive Confirmation Dialog).
> 3. Xây dựng tính năng **Nghe & Viết Từ Vựng (Listen & Type / Dictation Mode)**: Chế độ luyện phản xạ nghe phát âm (Audio/TTS Web Speech) và gõ lại từ vựng chính xác, kiểm tra lỗi chính tả tức thì kèm gợi ý ngữ cảnh, câu ví dụ che từ và tích hợp tiến trình SRS.

---

## 📌 MỤC LỤC
1. [Phân Tích Kiến Trúc & Yêu Cầu Kỹ Thuật](#1-phân-tích-kiến-trúc--yêu-cầu-kỹ-thuật)
2. [Checklist Công Việc Chi Tiết](#2-checklist-công-việc-chi-tiết)
3. [Thiết Kế Giao Diện & Trải Nghiệm Người Dùng (UI/UX)](#3-thiết-kế-giao-diện--trải-nghiệm-người-dùng-uiux)
4. [Đặc Tả Mã Nguồn & Logic Cốt Lõi (Core Implementation)](#4-đặc-tả-mã-nguồn--logic-cốt-lõi-core-implementation)
   - [4.1. Service API: Xóa Folder & Xóa Study Set](#41-service-api-xóa-folder--xóa-study-set)
   - [4.2. Dialog Xác Nhận Xóa Thư Mục (Bảo Toàn Bộ Thẻ)](#42-dialog-xác-nhận-xóa-thư-mục-bảo-toàn-bộ-thẻ)
   - [4.3. Dialog Cảnh Báo Xóa Bộ Thẻ](#43-dialog-cảnh-báo-xóa-bộ-thẻ)
   - [4.4. Thuật Toán So Khớp Ký Tự Nghe - Viết (Diff Character Engine)](#44-thuật-toán-so-khớp-ký-tự-nghe---viết-diff-character-engine)
   - [4.5. Component Chế Độ Nghe Viết (DictationGame)](#45-component-chế-độ-nghe-viết-dictationgame)
5. [Tích Hợp Vào Hệ Thống Hiện Tại](#5-tích-hợp-vào-hệ-thống-hiện-tại)
6. [Kịch Bản Kiểm Thử & Tiêu Chí Nghiệm Thu (Acceptance Criteria)](#6-kịch-bản-kiểm-thử--tiêu-chí-nghiệm-thu-acceptance-criteria)

---

## 1. PHÂN TÍCH KIẾN TRÚC & YÊU CẦU KỸ THUẬT

### 1.1. Logic Xóa Thư Mục (Folder Deletion with Safe Detach)
- **Đặc tả quan trọng**: Khi người dùng xóa một Folder, **chỉ xóa Folder đó**, các bộ thẻ (`study_sets`) bên trong **hoàn toàn không bị mất**.
- **Cơ sở dữ liệu (Database level)**:
  - Bảng `study_sets` đã được thiết kế với Foreign Key:
    ```sql
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL
    ```
  - Khi một bản ghi trong `folders` bị `DELETE`, PostgreSQL sẽ tự động chuyển `folder_id` của tất cả các `study_sets` liên quan thành `NULL`.
- **LocalStorage Fallback level**:
  - Với môi trường LocalStorage (chưa kết nối Supabase): Khi xóa folder, cần duyệt mảng `study_sets` và gán `s.folder_id = null` cho các bộ thẻ có `s.folder_id === folderId`.
- **UI State level**:
  - Nếu người dùng đang lọc theo folder đó (`selectedFolderId === folderId`), sau khi xóa cần tự động chuyển bộ lọc về `null` (Xem tất cả bộ thẻ) để người dùng thấy ngay các bộ thẻ vừa được đưa ra ngoài.
  - Hiển thị Toast thông báo: *"Đã xóa thư mục. Các bộ thẻ bên trong đã được chuyển ra ngoài danh mục chung."*

### 1.2. Logic Xóa Bộ Thẻ (Study Set Deletion with Cascade Cleanup)
- **Đặc tả**: Xóa hoàn toàn bộ thẻ cùng các thẻ flashcards con (`cards`) và lịch sử tiến trình học (`user_card_progress`, `study_logs`).
- **Cơ sở dữ liệu**:
  - Bảng `cards` có `set_id UUID NOT NULL REFERENCES public.study_sets(id) ON DELETE CASCADE`.
  - Bảng `user_card_progress` có `card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE`.
  - Do đó việc xóa `study_sets` sẽ kích hoạt tầng cascade an toàn và sạch sẽ trong DB.
- **UI/UX**:
  - Hành động này mang tính phá hủy dữ liệu (Destructive Action), cần hiển thị modal cảnh báo rõ ràng với số lượng từ vựng bị ảnh hưởng, nút xác nhận màu đỏ cảnh báo.
  - Sau khi xóa: Nếu đang ở màn hình chi tiết bộ thẻ (`StudySetDetailPage`), điều hướng (redirect) về `/study-sets` kèm thông báo.

### 1.3. Logic Chế Độ Học Nghe - Viết Từ Vựng (Listen & Write / Dictation Mode)
- **Bản chất**: Luyện đồng thời kỹ năng **Nghe (Listening)** và **Viết chính tả (Spelling & Typing)**.
- **Quy trình tương tác**:
  1. Người học vào bài: Hệ thống tự động kích hoạt Web Speech API đọc phát âm của từ vựng (chuẩn giọng Anh/Mỹ).
  2. Màn hình hiển thị ngữ cảnh hỗ trợ (không để lộ từ gốc):
     - Loại từ (Noun, Verb, Adjective,...).
     - Định nghĩa (Definition).
     - Câu ví dụ có từ vựng được che thành chỗ trống (Cloze format: `Smartphones have become _______ in daily modern life.`).
     - Tùy chọn gợi ý: Độ dài ký tự (`_ _ _ _ _ _ _ _ _ _`), chữ cái đầu.
  3. Người học gõ từ vào ô Input:
     - Nhấn phím `Enter` để kiểm tra.
     - Nhấn phím `Ctrl + Space` (hoặc nút Loa) để nghe lại phát âm bất cứ lúc nào.
  4. Phản hồi tức thì (Instant Feedback):
     - **Nếu đúng**: Đổi viền xanh lá, âm thanh báo đúng, hiển thị phiên âm IPA, tự động chuyển từ tiếp theo sau 1 giây (hoặc bấm Enter để sang ngay).
     - **Nếu sai**: Đổi viền đỏ, hiển thị bảng so sánh trực quan (Diff): Ký tự nào đúng, ký tự nào sai, từ đúng là gì. Cho phép gõ lại để nhớ trước khi sang từ tiếp theo.
  5. Màn hình tổng kết (Summary Result): Thống kê độ chính xác (Accuracy %), danh sách từ đúng/sai, số lần nghe lại, nút học lại các từ đã sai.

---

## 2. CHECKLIST CÔNG VIỆC CHI TIẾT

### 2.1. Quản Lý Thư Mục: Bổ Sung Xóa Folder An Toàn
- [x] **2.1.1. API Service**:
  - Thêm hàm `deleteFolder(folderId: string): Promise<void>` trong `src/services/api/studySetService.ts`.
  - Đảm bảo logic đồng bộ: Trong LocalStorage, tìm tất cả sets thuộc folder đó và gán `folder_id = null`, sau đó xóa folder khỏi danh sách. Trong Supabase, gọi `supabase.from('folders').delete().eq('id', folderId)`.
- [x] **2.1.2. Component `DeleteFolderDialog.tsx`**:
  - Tạo hộp thoại xác nhận xóa với giao diện Shadcn AlertDialog/Dialog.
  - Thông điệp nhấn mạnh: *"Các bộ thẻ trong thư mục này sẽ KHÔNG bị mất mà được chuyển ra ngoài danh sách chung."*
  - Nút bấm: "Hủy bỏ" và "Xác nhận xóa thư mục".
- [x] **2.1.3. Tích hợp UI vào `StudySetsPage.tsx`**:
  - Bổ sung nút menu ngữ cảnh (Dropdown Menu hoặc icon thùng rác nhỏ) trên mỗi thẻ Folder.
  - Xử lý sự kiện click không bị kích hoạt nhầm việc chọn Folder (`e.stopPropagation()`).
  - Xử lý reset `selectedFolderId` nếu folder đang mở bị xóa.

### 2.2. Quản Lý Bộ Thẻ: Bổ Sung Xóa Bộ Thẻ
- [x] **2.2.1. API Service**:
  - Thêm hàm `deleteStudySet(setId: string): Promise<void>` trong `src/services/api/studySetService.ts`.
  - Hỗ trợ cả Supabase client và LocalStorage (dọn sạch set, cards thuộc set và tiến trình SRS liên quan).
- [x] **2.2.2. Component `DeleteStudySetDialog.tsx`**:
  - Hộp thoại cảnh báo màu đỏ (Destructive Alert).
  - Hiển thị tên bộ thẻ và số lượng thẻ flashcards bên trong.
  - Yêu cầu người dùng xác nhận thao tác không thể hoàn tác.
- [x] **2.2.3. Tích hợp UI**:
  - Thêm nút xóa vào dropdown menu của từng bộ thẻ trên trang danh sách `StudySetsPage.tsx`.
  - Thêm nút "Xóa bộ thẻ" trên thanh tiêu đề/Action Bar của trang chi tiết `StudySetDetailPage.tsx`.
  - Điều hướng an toàn về `/study-sets` sau khi xóa từ trang chi tiết.

### 2.3. Tính Năng Nghe - Viết Từ Vựng (Dictation Mode)
- [x] **2.3.1. Engine So Sánh Ký Tự (`characterDiff.ts`)**:
  - Xây dựng thuật toán phân tích chuỗi người dùng gõ so với đáp án gốc:
    - Bỏ qua hoa/thường, chuẩn hóa khoảng trắng thừa.
    - Chấp nhận nếu người dùng gõ trúng từ gốc hoặc bất kỳ từ nào trong mảng từ đồng nghĩa `synonyms`.
    - Phân tích chi tiết: Đánh dấu ký tự gõ đúng (xanh), ký tự sai (đỏ), ký tự bị thiếu.
- [x] **2.3.2. Bộ Điều Khiển Âm Thanh (Audio Speech Controller)**:
  - Tích hợp Web Speech API `window.speechSynthesis` phát âm tiếng Anh chuẩn (`en-US` hoặc `en-GB`).
  - Tự động kích hoạt khi mở từ mới (có công tắc bật/tắt autoplay trong cài đặt).
  - Hỗ trợ nút điều chỉnh tốc độ phát âm (0.75x để nghe chậm rõ từng âm, 1.0x tốc độ chuẩn).
- [x] **2.3.3. Component Giao Diện `DictationGame.tsx`**:
  - Header: Thanh tiến trình, tỉ lệ hoàn thành, nút thoát.
  - Body:
    - Nút Loa phát âm trung tâm kích thước lớn, hiệu ứng sóng âm (sound wave animation).
    - Câu ví dụ có ô trống `[ ... ]` tạo phản xạ nhận diện từ trong ngữ cảnh.
    - Ô nhập từ vựng `Input` lớn, autofocus, vô hiệu hóa tự động sửa chính tả của trình duyệt (`autoCorrect="off" autoCapitalize="off" spellCheck="false"`).
    - Khu vực hiển thị kết quả: Thẻ phản hồi tức thì với màu sắc trực quan, bảng so sánh ký tự.
    - Nút "Nghe lại" (`Ctrl + Space`), "Gợi ý chữ cái" (`Hint`).
  - Footer: Nút nộp bài / Chuyển từ kế tiếp.
- [x] **2.3.4. Màn Hình Tổng Kết Kết Quả (Dictation Summary Screen)**:
  - Điểm số, độ chính xác (%), số từ đúng ngay lần đầu.
  - Danh sách chi tiết các từ trong bài học kèm nút bấm nghe lại từng từ.
  - Tùy chọn "Học lại các từ chưa đúng" hoặc "Quay về bộ thẻ".
- [x] **2.3.5. Tích hợp Điều Hướng & Router**:
  - Thêm mode `dictation` vào `GamesPage.tsx` (`/games?setId=...&mode=dictation`).
  - Bổ sung nút "Luyện Nghe & Viết" (icon tai nghe/bút viết) trên trang chi tiết bộ thẻ `StudySetDetailPage.tsx` và màn hình chọn game.

---

## 3. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

### 3.1. Trải Nghiệm Xóa Thư Mục An Toàn
```
+-------------------------------------------------------------+
|  Xóa Thư Mục                                            [X] |
+-------------------------------------------------------------+
|  Bạn có chắc chắn muốn xóa thư mục "IELTS Academic"?        |
|                                                             |
|  [!] LƯU Ý QUAN TRỌNG:                                      |
|  Hành động này CHỈ xóa thư mục quản lý. Toàn bộ 5 bộ thẻ    |
|  bên trong sẽ KHÔNG bị mất và được chuyển ra ngoài danh     |
|  mục chung an toàn.                                         |
|                                                             |
|                          [ Hủy bỏ ]   [ Xóa Thư Mục ]       |
+-------------------------------------------------------------+
```

### 3.2. Trải Nghiệm Chế Độ Nghe - Viết Từ Vựng
```
+-------------------------------------------------------------+
|  <- Thoát bài học       Từ 3 / 15           Chính xác: 85%  |
|  [==========================-----------------------------] |
+-------------------------------------------------------------+
|                                                             |
|                     ((  [ 🔊 NGHE PHÁT ÂM ]  ))             |
|                        Phím tắt: Ctrl + Space               |
|                                                             |
|   Loại từ: [ Adjective ]                                    |
|   Ngữ cảnh: "Smartphones have become ________ in daily       |
|             modern life."                                   |
|   Định nghĩa: Xuất hiện ở khắp mọi nơi cùng một lúc.        |
|                                                             |
|   +-----------------------------------------------------+   |
|   | u b i q u i t o u s                                 |   |
|   +-----------------------------------------------------+   |
|   [ Gợi ý chữ cái ]                         [ Kiểm tra ↵ ]  |
|                                                             |
|   Phản hồi sau khi kiểm tra:                                |
|   ✓ CHÍNH XÁC!                                              |
|   Phiên âm: /juːˈbɪk.wə.t̬əs/                                 |
|   [ Tiếp tục (Enter) -> ]                                   |
+-------------------------------------------------------------+
```

---

## 4. ĐẶC TẢ MÃ NGUỒN & LOGIC CỐT LÕI (CORE IMPLEMENTATION)

### 4.1. Service API: Xóa Folder & Xóa Study Set
Cập nhật file: `src/services/api/studySetService.ts`

```typescript
/**
 * Xóa Folder: Chỉ xóa thư mục, các bộ thẻ bên trong được giữ nguyên
 * và tự động chuyển về folder_id = null (Unassigned/Root).
 */
export async function deleteFolder(folderId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    // 1. Cập nhật các bộ thẻ trong LocalStorage về folder_id = null
    const rawSets = localStorage.getItem('vocab_study_sets');
    if (rawSets) {
      const sets: StudySet[] = JSON.parse(rawSets);
      const updatedSets = sets.map((s) =>
        s.folder_id === folderId ? { ...s, folder_id: null, updated_at: new Date().toISOString() } : s
      );
      localStorage.setItem('vocab_study_sets', JSON.stringify(updatedSets));
    }

    // 2. Xóa folder khỏi danh sách
    const rawFolders = localStorage.getItem('vocab_folders');
    if (rawFolders) {
      const folders: Folder[] = JSON.parse(rawFolders);
      const updatedFolders = folders.filter((f) => f.id !== folderId);
      localStorage.setItem('vocab_folders', JSON.stringify(updatedFolders));
    }
    return;
  }

  // 1. Chuyển các bộ thẻ trong folder về NULL trước (đảm bảo an toàn tuyệt đối)
  const { error: updateError } = await supabase
    .from('study_sets')
    .update({ folder_id: null })
    .eq('folder_id', folderId);

  if (updateError) {
    console.error('[deleteFolder] Error detaching study sets:', updateError);
    throw updateError;
  }

  // 2. Xóa folder
  const { error: deleteError } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId);

  if (deleteError) {
    console.error('[deleteFolder] Error deleting folder:', deleteError);
    throw deleteError;
  }
}

/**
 * Xóa Bộ thẻ: Xóa hoàn toàn bộ thẻ và các thẻ từ vựng con bên trong
 */
export async function deleteStudySet(setId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    // 1. Xóa cards thuộc set trong LocalStorage
    const rawCards = localStorage.getItem('vocab_cards');
    if (rawCards) {
      const cards: Card[] = JSON.parse(rawCards);
      const updatedCards = cards.filter((c) => c.set_id !== setId);
      localStorage.setItem('vocab_cards', JSON.stringify(updatedCards));
    }

    // 2. Xóa study set
    const rawSets = localStorage.getItem('vocab_study_sets');
    if (rawSets) {
      const sets: StudySet[] = JSON.parse(rawSets);
      const updatedSets = sets.filter((s) => s.id !== setId);
      localStorage.setItem('vocab_study_sets', JSON.stringify(updatedSets));
    }
    return;
  }

  // Trên Supabase, CASCADE Foreign Key sẽ tự động dọn sạch cards và user_card_progress
  const { error } = await supabase
    .from('study_sets')
    .delete()
    .eq('id', setId);

  if (error) {
    console.error('[deleteStudySet] Error deleting set:', error);
    throw error;
  }
}
```

---

### 4.2. Dialog Xác Nhận Xóa Thư Mục (Bảo Toàn Bộ Thẻ)
File mới: `src/features/study-sets/components/DeleteFolderDialog.tsx`

```tsx
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Folder } from '@/types/database.types';
import { deleteFolder } from '@/services/api/studySetService';
import { toast } from 'sonner';
import { FolderKanban, Info } from 'lucide-react';

interface DeleteFolderDialogProps {
  folder: Folder | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (folderId: string) => void;
}

export const DeleteFolderDialog: React.FC<DeleteFolderDialogProps> = ({
  folder,
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);

  if (!folder) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteFolder(folder.id);
      toast.success(`Đã xóa thư mục "${folder.name}". Các bộ thẻ bên trong đã được chuyển ra ngoài.`);
      onDeleted(folder.id);
      onClose();
    } catch (err: any) {
      toast.error(`Không thể xóa thư mục: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <FolderKanban className="w-5 h-5" />
            <AlertDialogTitle>Xóa thư mục "{folder.name}"?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2 text-sm text-foreground">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Yên tâm:</strong> Các bộ thẻ bên trong thư mục này <strong>sẽ không bị xóa</strong>. Chúng sẽ được chuyển ra danh sách bộ thẻ độc lập ngoài trang chính.
              </span>
            </div>
            <p className="text-muted-foreground text-xs">
              Thao tác này chỉ gỡ bỏ cấu trúc thư mục phân loại, dữ liệu từ vựng của bạn hoàn toàn nguyên vẹn.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Đang xóa...' : 'Xóa Thư Mục'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

---

### 4.3. Dialog Cảnh Báo Xóa Bộ Thẻ
File mới: `src/features/study-sets/components/DeleteStudySetDialog.tsx`

```tsx
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StudySet } from '@/types/database.types';
import { deleteStudySet } from '@/services/api/studySetService';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteStudySetDialogProps {
  studySet: StudySet | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (setId: string) => void;
}

export const DeleteStudySetDialog: React.FC<DeleteStudySetDialogProps> = ({
  studySet,
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [loading, setLoading] = useState(false);

  if (!studySet) return null;

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteStudySet(studySet.id);
      toast.success(`Đã xóa vĩnh viễn bộ thẻ "${studySet.title}"`);
      onDeleted(studySet.id);
      onClose();
    } catch (err: any) {
      toast.error(`Không thể xóa bộ thẻ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <Trash2 className="w-5 h-5" />
            <AlertDialogTitle>Xóa bộ thẻ vĩnh viễn?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-2 text-sm text-foreground">
            <p>
              Bạn có chắc chắn muốn xóa bộ thẻ <strong className="text-destructive font-semibold">"{studySet.title}"</strong>?
            </p>
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Toàn bộ <strong>{studySet.total_cards} thẻ từ vựng</strong> cùng toàn bộ tiến trình học và thống kê SRS liên quan sẽ bị xóa vĩnh viễn và không thể khôi phục.
              </span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Hủy bỏ</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Đang xóa...' : 'Xác Nhận Xóa'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

---

### 4.4. Thuật Toán So Khớp Ký Tự Nghe - Viết (Diff Character Engine)
File mới: `src/features/games/utils/dictationEngine.ts`

```typescript
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

/**
 * Chuẩn hóa chuỗi nhập liệu: loại bỏ ký tự đặc biệt thừa, chuyển lowercase
 */
export function normalizeInput(str: string): string {
  return (str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Kiểm tra kết quả gõ chính tả và tạo diff từng ký tự
 */
export function evaluateDictation(
  userInput: string,
  targetTerm: string,
  synonyms: string[] = []
): DictationCheckResult {
  const userNorm = normalizeInput(userInput);
  const targetNorm = normalizeInput(targetTerm);

  // 1. Kiểm tra khớp chính xác với target term
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

  // 2. Kiểm tra nếu khớp với bất kỳ từ đồng nghĩa nào
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

  // 3. Phân tích chi tiết từng ký tự giữa input của người dùng và từ gốc
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
 * Tạo câu ví dụ che từ (Cloze Question)
 */
export function createClozeExample(example: string | null | undefined, term: string): string {
  if (!example) return '';
  const regex = new RegExp(`\\b${term}\\b`, 'gi');
  if (regex.test(example)) {
    return example.replace(regex, '_______');
  }
  return example;
}
```

---

### 4.5. Component Chế Độ Nghe Viết (DictationGame)
File mới: `src/features/games/components/DictationGame.tsx`

```tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card as CardType } from '@/types/database.types';
import { 
  evaluateDictation, 
  createClozeExample, 
  DictationCheckResult 
} from '@/features/games/utils/dictationEngine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Volume2, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Lightbulb, 
  Sparkles,
  Award,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DictationGameProps {
  cards: CardType[];
  onFinish: (stats: { total: number; correctFirstTime: number; accuracy: number }) => void;
  onExit: () => void;
}

export const DictationGame: React.FC<DictationGameProps> = ({ cards, onFinish, onExit }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [checkResult, setCheckResult] = useState<DictationCheckResult | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hasTriedCurrentCard, setHasTriedCurrentCard] = useState(false);
  const [firstTimeCorrectCount, setFirstTimeCorrectCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const inputRef = useRef<HTMLInputElement>(null);
  const currentCard = cards[currentIndex];

  // Phát âm Web Speech API
  const speakCurrentWord = useCallback((rate: number = playbackRate) => {
    if (!currentCard || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(currentCard.term);
    utterance.lang = 'en-US';
    utterance.rate = rate;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [currentCard, playbackRate]);

  // Tự động phát âm khi chuyển sang từ mới
  useEffect(() => {
    if (!currentCard) return;
    setUserInput('');
    setCheckResult(null);
    setIsAnswerChecked(false);
    setShowHint(false);
    setHasTriedCurrentCard(false);

    // Phát âm sau một nhịp chuyển cảnh mượt
    const timer = setTimeout(() => {
      speakCurrentWord();
      inputRef.current?.focus();
    }, 250);

    return () => clearTimeout(timer);
  }, [currentIndex, currentCard, speakCurrentWord]);

  // Lắng nghe phím tắt: Ctrl + Space để nghe lại, Enter để nộp / chuyển câu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
        e.preventDefault();
        speakCurrentWord();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [speakCurrentWord]);

  const handleCheck = () => {
    if (!userInput.trim() || !currentCard) return;

    const result = evaluateDictation(userInput, currentCard.term, currentCard.synonyms || []);
    setCheckResult(result);
    setIsAnswerChecked(true);

    if (result.isExactMatch || result.isSynonymMatch) {
      if (!hasTriedCurrentCard) {
        setFirstTimeCorrectCount((prev) => prev + 1);
      }
    } else {
      setHasTriedCurrentCard(true);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < cards.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      const total = cards.length;
      const accuracy = Math.round((firstTimeCorrectCount / total) * 100);
      onFinish({ total, correctFirstTime: firstTimeCorrectCount, accuracy });
    }
  };

  const progressPercent = Math.round(((currentIndex) / cards.length) * 100);

  if (!currentCard) {
    return null;
  }

  const cloze = createClozeExample(currentCard.example, currentCard.term);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <button
          onClick={onExit}
          className="hover:text-foreground transition-colors cursor-pointer"
        >
          &larr; Rời khỏi chế độ
        </button>
        <span className="font-mono">
          Từ {currentIndex + 1} / {cards.length}
        </span>
        <span>Chính xác: {cards.length > 0 ? Math.round((firstTimeCorrectCount / Math.max(1, currentIndex + (isAnswerChecked && (checkResult?.isExactMatch || checkResult?.isSynonymMatch) ? 1 : 0))) * 100) : 0}%</span>
      </div>

      <Progress value={progressPercent} className="h-2 rounded-full" />

      {/* Main Study Card */}
      <div className="rounded-3xl border bg-card p-6 sm:p-10 shadow-lg space-y-8 relative overflow-hidden">
        {/* Audio Button Area */}
        <div className="flex flex-col items-center justify-center gap-4 py-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => speakCurrentWord(1.0)}
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-md transition-colors cursor-pointer ${
              isSpeaking
                ? 'bg-primary text-primary-foreground ring-8 ring-primary/20'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            <Volume2 className={`w-10 h-10 ${isSpeaking ? 'animate-pulse' : ''}`} />
          </motion.button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">
              Nhấn để nghe (Phím tắt: <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Ctrl+Space</kbd>)
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary h-7 px-2"
              onClick={() => {
                const newRate = playbackRate === 1.0 ? 0.75 : 1.0;
                setPlaybackRate(newRate);
                speakCurrentWord(newRate);
              }}
            >
              Tốc độ: {playbackRate}x
            </Button>
          </div>
        </div>

        {/* Clues & Context Area */}
        <div className="space-y-3 bg-muted/40 p-4 sm:p-5 rounded-2xl border text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {currentCard.part_of_speech && (
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                {currentCard.part_of_speech}
              </Badge>
            )}
            {showHint && (
              <Badge variant="secondary" className="font-mono text-xs">
                Độ dài: {currentCard.term.length} chữ cái | Bắt đầu bằng "{currentCard.term[0].toUpperCase()}"
              </Badge>
            )}
          </div>

          <p className="text-sm sm:text-base font-medium text-foreground">
            {currentCard.definition}
          </p>

          {cloze && (
            <p className="text-xs sm:text-sm text-muted-foreground italic pt-1">
              "{cloze}"
            </p>
          )}
        </div>

        {/* Input & Feedback Section */}
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isAnswerChecked && (checkResult?.isExactMatch || checkResult?.isSynonymMatch)) {
                handleNext();
              } else {
                handleCheck();
              }
            }}
            className="space-y-3"
          >
            <div className="relative">
              <Input
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Gõ từ bạn nghe được vào đây..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                disabled={isAnswerChecked && (checkResult?.isExactMatch || checkResult?.isSynonymMatch)}
                className={`text-center text-xl sm:text-2xl font-bold tracking-wide h-14 sm:h-16 rounded-2xl transition-all ${
                  isAnswerChecked
                    ? checkResult?.isExactMatch || checkResult?.isSynonymMatch
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-destructive bg-destructive/10 text-destructive ring-2 ring-destructive/20'
                    : 'focus-visible:ring-primary/30'
                }`}
              />
            </div>

            {/* Visual Character Diff Feedback */}
            <AnimatePresence>
              {isAnswerChecked && checkResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3 text-center"
                >
                  {checkResult.isExactMatch || checkResult.isSynonymMatch ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Chính xác tuyệt vời!</span>
                      {currentCard.ipa && (
                        <span className="font-mono text-muted-foreground ml-1">
                          {currentCard.ipa}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                      <div className="flex items-center justify-center gap-1.5 text-destructive font-semibold text-xs">
                        <XCircle className="w-4 h-4" />
                        <span>Chưa chính xác. Xem đáp án bên dưới:</span>
                      </div>

                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs text-muted-foreground">Đáp án đúng:</span>
                        <span className="text-base font-extrabold text-foreground font-mono tracking-wider">
                          {currentCard.term}
                        </span>
                        {currentCard.ipa && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {currentCard.ipa}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(true)}
                disabled={showHint || (isAnswerChecked && (checkResult?.isExactMatch || checkResult?.isSynonymMatch))}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý ký tự</span>
              </Button>

              {isAnswerChecked && (checkResult?.isExactMatch || checkResult?.isSynonymMatch) ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <span>{currentIndex + 1 === cards.length ? 'Xem kết quả' : 'Từ tiếp theo'}</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : isAnswerChecked ? (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAnswerChecked(false);
                      setUserInput('');
                      inputRef.current?.focus();
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Thử lại</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    variant="secondary"
                    className="gap-1.5 text-xs"
                  >
                    <span>Bỏ qua & Sang từ khác</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="gap-2 rounded-xl font-semibold shadow-sm"
                >
                  <span>Kiểm tra</span>
                  <kbd className="hidden sm:inline-block px-1 py-0.5 rounded bg-primary-foreground/20 text-[10px] font-mono">↵</kbd>
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
```

---

## 5. TÍCH HỢP VÀO HỆ THỐNG HIỆN TẠI

### 5.1. Tích Hợp UI Xóa Thư Mục Vào `StudySetsPage.tsx`
Trên mỗi card thư mục trong danh sách `folders`:
- Thêm menu 3 chấm (`MoreVertical`) ở góc trên bên phải.
- Tùy chọn: "Đổi màu", "Chỉnh sửa", "Xóa thư mục".
- Bấm "Xóa thư mục" -> Mở `DeleteFolderDialog`.
- Sau khi `onDeleted(folderId)`:
  - Cập nhật state: `setFolders((prev) => prev.filter((f) => f.id !== folderId))`
  - Cập nhật các bộ thẻ trong state: `setSets((prev) => prev.map(s => s.folder_id === folderId ? { ...s, folder_id: null } : s))`
  - Nếu `selectedFolderId === folderId`: `setSelectedFolderId(null)`.

### 5.2. Tích Hợp UI Xóa Bộ Thẻ Vào `StudySetsPage.tsx` & `StudySetDetailPage.tsx`
- **Trên `StudySetsPage.tsx`**: Thêm icon thùng rác nhỏ hoặc dropdown menu trên từng card bộ thẻ.
- **Trên `StudySetDetailPage.tsx`**: Thêm nút "Xóa bộ thẻ" vào thanh công cụ đầu trang (cạnh nút TSV Import và Thêm thẻ).
- Sau khi `onDeleted(setId)`:
  - Nếu ở trang chi tiết -> gọi `navigate('/study-sets')`.

### 5.3. Tích Hợp Chế Độ Nghe Viết Vào `GamesPage.tsx` & `StudySetDetailPage.tsx`
- Cập nhật `GameMode`:
  ```typescript
  type GameMode = 'menu' | 'quiz' | 'match' | 'dictation';
  ```
- Trên `StudySetDetailPage.tsx`: Thêm thẻ "Luyện Nghe & Viết (Dictation)" vào khối các chế độ học tập.
- Khi người dùng click: Điều hướng đến `/games?setId=${studySet.id}&mode=dictation`.

---

## 6. KỊCH BẢN KIỂM THỬ & TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

| Mã kiểm thử | Kịch bản kiểm thử | Hành vi kỳ vọng |
| :--- | :--- | :--- |
| **TC-DEL-01** | Xóa thư mục chứa 3 bộ thẻ con | - Hộp thoại xác nhận hiển thị thông điệp an toàn.<br>- Sau khi xác nhận, thư mục biến mất khỏi danh sách.<br>- Cả 3 bộ thẻ vẫn tồn tại đầy đủ, chuyển thành nhãn "Độc lập" (`folder_id = null`).<br>- Không có bộ thẻ nào bị mất dữ liệu. |
| **TC-DEL-02** | Xóa bộ thẻ có 20 thẻ từ vựng | - Hộp thoại cảnh báo màu đỏ hiển thị rõ số lượng thẻ sẽ bị xóa vĩnh viễn.<br>- Sau khi xác nhận, bộ thẻ và 20 thẻ bị dọn sạch khỏi database/localStorage.<br>- Tự động redirect về `/study-sets`. |
| **TC-DIC-01** | Mở chế độ Nghe Viết từ vựng | - Web Speech API tự động phát âm chuẩn xác từ vựng hiện tại.<br>- Hiển thị ô trống che từ trong câu ví dụ.<br>- Ô Input tự động focus để người dùng sẵn sàng gõ. |
| **TC-DIC-02** | Phím tắt nghe lại | - Nhấn `Ctrl + Space` phát âm lại từ vựng ngay tức thì mà không làm mất nội dung đang gõ. |
| **TC-DIC-03** | Gõ đúng chính tả (Exact / Synonyms) | - Viền ô input đổi màu xanh lá.<br>- Hiển thị phiên âm IPA chuẩn.<br>- Nhấn Enter chuyển sang từ kế tiếp mượt mà. |
| **TC-DIC-04** | Gõ sai chính tả | - Viền ô input đổi màu đỏ cảnh báo.<br>- Hiển thị đáp án đúng để người dùng ghi nhớ.<br>- Cung cấp nút "Thử lại" hoặc "Bỏ qua". |
| **TC-DIC-05** | Hoàn thành bài học Dictation | - Hiển thị màn hình tổng kết với tỷ lệ chính xác % và danh sách từ vựng.<br>- Cung cấp nút luyện tập lại các từ chưa đạt. |
