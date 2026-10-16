import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Folder as FolderType, StudySet } from '@/types/database.types';
import { updateStudySet } from '@/services/api/studySetService';
import { toast } from 'sonner';
import { 
  FolderPlus, 
  Search, 
  Check, 
  Layers, 
  Folder as FolderIcon, 
  CheckSquare, 
  Square 
} from 'lucide-react';

interface AddExistingSetsToFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderType | null;
  allSets: StudySet[];
  folders: FolderType[];
  onSuccess: () => void;
}

export const AddExistingSetsToFolderModal: React.FC<AddExistingSetsToFolderModalProps> = ({
  open,
  onOpenChange,
  folder,
  allSets,
  folders,
  onSuccess,
}) => {
  const [selectedSetIds, setSelectedSetIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Danh sách các bộ thẻ chưa thuộc thư mục này
  const eligibleSets = useMemo(() => {
    if (!folder) return [];
    return allSets.filter((s) => s.folder_id !== folder.id);
  }, [allSets, folder]);

  // Lọc theo tìm kiếm
  const filteredEligibleSets = useMemo(() => {
    if (!searchQuery.trim()) return eligibleSets;
    const q = searchQuery.toLowerCase();
    return eligibleSets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [eligibleSets, searchQuery]);

  // Reset state khi mở modal
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedSetIds([]);
      setSearchQuery('');
    }
    onOpenChange(newOpen);
  };

  const toggleSet = (id: string) => {
    setSelectedSetIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSetIds.length === filteredEligibleSets.length) {
      setSelectedSetIds([]);
    } else {
      setSelectedSetIds(filteredEligibleSets.map((s) => s.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folder || selectedSetIds.length === 0) return;

    setLoading(true);
    try {
      await Promise.all(
        selectedSetIds.map((setId) =>
          updateStudySet(setId, { folder_id: folder.id })
        )
      );

      toast.success(
        `Đã thêm thành công ${selectedSetIds.length} bộ thẻ vào thư mục "${folder.name}"!`
      );
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Lỗi khi thêm bộ thẻ: ${err.message || 'Không thể cập nhật'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!folder) return null;

  const isAllSelected =
    filteredEligibleSets.length > 0 &&
    selectedSetIds.length === filteredEligibleSets.length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs shrink-0"
              style={{ backgroundColor: folder.color_code || '#3B82F6' }}
            >
              <FolderPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg">Thêm Bộ Thẻ Đã Có Vào Thư Mục</DialogTitle>
              <DialogDescription className="truncate">
                Thư mục đích: <span className="font-semibold text-foreground">{folder.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Thanh tìm kiếm & Chọn tất cả */}
        <div className="space-y-3 pt-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm bộ thẻ theo tên hoặc tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              Có sẵn <strong>{eligibleSets.length}</strong> bộ thẻ có thể thêm
            </span>
            {filteredEligibleSets.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline cursor-pointer"
              >
                {isAllSelected ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Bỏ chọn tất cả</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Chọn tất cả ({filteredEligibleSets.length})</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Danh sách các bộ thẻ có thể thêm */}
        <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[360px] space-y-2 pr-1 pt-1">
          {eligibleSets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed text-center p-6 space-y-2">
              <Layers className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">
                Tất cả các bộ thẻ hiện có đều đã nằm trong thư mục này!
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Bạn có thể tạo bộ thẻ mới nếu muốn bổ sung thêm chủ đề từ vựng.
              </p>
            </div>
          ) : filteredEligibleSets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 rounded-xl border border-dashed text-center p-6">
              <p className="text-xs text-muted-foreground">
                Không tìm thấy bộ thẻ nào khớp với từ khóa "{searchQuery}"
              </p>
            </div>
          ) : (
            filteredEligibleSets.map((set) => {
              const isSelected = selectedSetIds.includes(set.id);
              const parentFolder = folders.find((f) => f.id === set.folder_id);

              return (
                <div
                  key={set.id}
                  onClick={() => toggleSet(set.id)}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                        isSelected
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/30 bg-background'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {set.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {set.total_cards || 0} từ
                        </span>

                        {parentFolder ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded font-medium text-white shadow-2xs"
                            style={{ backgroundColor: parentFolder.color_code || '#3B82F6' }}
                          >
                            <FolderIcon className="w-2.5 h-2.5 fill-white/20" />
                            <span className="truncate max-w-[120px]">{parentFolder.name}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                            Độc lập
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant={isSelected ? 'default' : 'secondary'}
                    className="shrink-0 text-[11px]"
                  >
                    {isSelected ? 'Đã chọn' : 'Chọn'}
                  </Badge>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || selectedSetIds.length === 0}
            className="rounded-xl font-semibold gap-1.5 shadow-md"
          >
            <FolderPlus className="w-4 h-4" />
            <span>
              {loading
                ? 'Đang thêm...'
                : `Thêm vào thư mục (${selectedSetIds.length})`}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
