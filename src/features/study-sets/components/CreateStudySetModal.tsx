import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Folder as FolderIcon, Layers } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
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
      <DialogContent className="w-[94vw] sm:w-full sm:max-w-xl md:max-w-2xl p-5 sm:p-7 overflow-visible">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
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
            <CustomSelect
              value={folderId}
              onChange={setFolderId}
              options={[
                {
                  value: '',
                  label: '-- Không xếp vào thư mục (Đứng độc lập) --',
                  icon: <Layers className="w-4 h-4 text-primary" />,
                },
                ...folders.map((f) => ({
                  value: f.id,
                  label: f.name,
                  icon: <FolderIcon className="w-4 h-4" style={{ color: f.color_code || '#3B82F6' }} />,
                })),
              ]}
              placeholder="Chọn thư mục chứa..."
            />
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

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl flex-1 sm:flex-none px-5 h-10"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="rounded-xl flex-1 sm:flex-none px-6 h-10 font-semibold shadow-md"
            >
              {loading ? 'Đang tạo...' : 'Tạo bộ thẻ'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
