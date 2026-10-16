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
import { Folder } from '@/types/database.types';
import { deleteFolder } from '@/services/api/studySetService';
import { toast } from 'sonner';
import { FolderKanban, Info, AlertCircle } from 'lucide-react';

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
      toast.success(`Đã xóa thư mục "${folder.name}". Các bộ thẻ bên trong đã được giữ nguyên và chuyển ra ngoài.`);
      onDeleted(folder.id);
      onClose();
    } catch (err: any) {
      toast.error(`Không thể xóa thư mục: ${err.message || 'Lỗi không xác định'}`);
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
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Xóa thư mục?</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium line-clamp-1">
                "{folder.name}"
              </p>
            </div>
          </div>
        </DialogHeader>

        <DialogDescription className="space-y-3 pt-2 text-sm text-foreground">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            <div className="text-xs leading-relaxed">
              <strong className="font-semibold">Bộ thẻ của bạn an toàn:</strong> Các bộ thẻ bên trong thư mục này <strong>hoàn toàn không bị mất</strong>. Chúng sẽ được tự động chuyển ra ngoài danh sách bộ thẻ độc lập.
            </div>
          </div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Hành động này chỉ xóa nhãn thư mục phân loại. Bạn có thể sắp xếp lại các bộ thẻ vào thư mục khác bất kỳ lúc nào.
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
              'Xác nhận xóa thư mục'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
