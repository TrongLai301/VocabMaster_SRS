import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
      toast.error(`Không thể xóa bộ thẻ: ${err.message || 'Lỗi không xác định'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent onClose={onClose} className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Xóa bộ thẻ vĩnh viễn?</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium line-clamp-1">
                "{studySet.title}"
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogDescription className="space-y-3 pt-2 text-sm text-foreground">
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-destructive" />
            <div className="text-xs leading-relaxed">
              <strong className="font-semibold">Cảnh báo hành động không thể khôi phục:</strong> Toàn bộ <strong>{studySet.total_cards || 0} thẻ từ vựng</strong> cùng lịch sử học và tiến trình SRS liên quan sẽ bị xóa vĩnh viễn khỏi hệ thống.
            </div>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Bạn có chắc chắn muốn tiếp tục xóa bộ thẻ này không?
          </p>
        </DialogDescription>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="rounded-xl gap-1.5"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang xóa...
              </span>
            ) : (
              'Xác nhận xóa vĩnh viễn'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
