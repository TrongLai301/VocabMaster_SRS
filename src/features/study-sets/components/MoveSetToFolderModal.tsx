import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CustomSelect, SelectOption } from '@/components/ui/custom-select';
import { Folder, StudySet } from '@/types/database.types';
import { updateStudySet } from '@/services/api/studySetService';
import { toast } from 'sonner';
import { FolderInput, Folder as FolderIcon, Layers } from 'lucide-react';

interface MoveSetToFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studySet: StudySet | null;
  folders: Folder[];
  onSuccess: () => void;
}

export const MoveSetToFolderModal: React.FC<MoveSetToFolderModalProps> = ({
  open,
  onOpenChange,
  studySet,
  folders,
  onSuccess,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (studySet) {
      setSelectedFolderId(studySet.folder_id || '');
    }
  }, [studySet]);

  if (!studySet) return null;

  const folderOptions: SelectOption[] = [
    {
      value: '',
      label: '-- Không xếp vào thư mục (Bộ thẻ độc lập) --',
      icon: <Layers className="w-4 h-4 text-primary" />,
    },
    ...folders.map((f) => ({
      value: f.id,
      label: f.name,
      icon: <FolderIcon className="w-4 h-4" style={{ color: f.color_code || '#3B82F6' }} />,
    })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateStudySet(studySet.id, {
        folder_id: selectedFolderId || null,
      });

      const targetFolderName = folders.find((f) => f.id === selectedFolderId)?.name;
      if (selectedFolderId && targetFolderName) {
        toast.success(`Đã thêm bộ thẻ "${studySet.title}" vào thư mục "${targetFolderName}"!`);
      } else {
        toast.success(`Đã chuyển bộ thẻ "${studySet.title}" thành bộ thẻ độc lập!`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Lỗi khi chuyển thư mục: ${err.message || 'Không thể cập nhật'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[94vw] sm:w-full sm:max-w-xl md:max-w-2xl p-5 sm:p-7 overflow-visible">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <FolderInput className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold">Thêm / Chuyển Thư Mục</DialogTitle>
              <DialogDescription className="text-sm mt-0.5 truncate">
                Bộ thẻ: <span className="font-semibold text-foreground">"{studySet.title}"</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chọn Thư mục đích
              </label>
              <span className="text-xs text-muted-foreground">
                {folders.length} thư mục khả dụng
              </span>
            </div>
            <CustomSelect
              value={selectedFolderId}
              onChange={setSelectedFolderId}
              options={folderOptions}
              placeholder="Chọn thư mục muốn xếp vào..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-5 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="rounded-xl flex-1 sm:flex-none px-6 h-11"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl flex-1 sm:flex-none px-7 h-11 font-semibold gap-1.5 shadow-md"
            >
              {loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
