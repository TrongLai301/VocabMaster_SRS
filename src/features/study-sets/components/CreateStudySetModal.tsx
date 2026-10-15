import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen } from 'lucide-react';
import { createStudySet } from '@/services/api/studySetService';
import { Folder, StudySet } from '@/types/database.types';

interface CreateStudySetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  initialFolderId?: string;
  onSuccess: (newSet: StudySet) => void;
}

export const CreateStudySetModal: React.FC<CreateStudySetModalProps> = ({
  open,
  onOpenChange,
  folders,
  initialFolderId,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState(initialFolderId || '');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const tags = tagsInput
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean);

      const set = await createStudySet({
        title: title.trim(),
        description: description.trim() || undefined,
        folder_id: folderId || null,
        tags,
      });

      onSuccess(set);
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setTagsInput('');
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể tạo bộ thẻ'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Tạo Bộ Thẻ Mới</DialogTitle>
              <DialogDescription>Tập hợp các từ vựng bạn muốn ghi nhớ</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Tiêu đề bộ thẻ</label>
            <Input
              placeholder="VD: 50 Từ vựng Academic Writing Task 2..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Thuộc thư mục</label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">-- Không xếp vào thư mục (Đứng độc lập) --</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Mô tả (Tùy chọn)</label>
            <Textarea
              placeholder="Ghi chú về nguồn gốc từ vựng hoặc mục tiêu ghi nhớ..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Thẻ phân loại (Tags)</label>
            <Input
              placeholder="IELTS, C1, Technology (cách nhau bởi dấu phẩy)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !title.trim()} className="font-semibold shadow-md">
              {loading ? 'Đang tạo...' : 'Tạo bộ thẻ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
