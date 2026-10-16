import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getFolders, getStudySets } from '@/services/api/studySetService';
import { Folder as FolderType, StudySet } from '@/types/database.types';
import { CreateFolderModal } from '@/features/study-sets/components/CreateFolderModal';
import { CreateStudySetModal } from '@/features/study-sets/components/CreateStudySetModal';
import { CreateSetFromTsvModal } from '@/features/study-sets/components/CreateSetFromTsvModal';
import { MoveSetToFolderModal } from '@/features/study-sets/components/MoveSetToFolderModal';
import { AddExistingSetsToFolderModal } from '@/features/study-sets/components/AddExistingSetsToFolderModal';
import { DeleteFolderDialog } from '@/features/study-sets/components/DeleteFolderDialog';
import { DeleteStudySetDialog } from '@/features/study-sets/components/DeleteStudySetDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Folder,
  FolderOpen,
  FolderPlus,
  FolderInput,
  PlusCircle, 
  ArrowRight, 
  Layers, 
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export const StudySetsPage: React.FC = () => {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [sets, setSets] = useState<StudySet[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [isTsvModalOpen, setIsTsvModalOpen] = useState(false);
  const [isAddExistingModalOpen, setIsAddExistingModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [setToDelete, setSetToDelete] = useState<StudySet | null>(null);
  const [setToMove, setSetToMove] = useState<StudySet | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [foldersData, setsData] = await Promise.all([
        getFolders(),
        getStudySets(),
      ]);
      setFolders(foldersData);
      setSets(setsData);
    } catch (err) {
      console.error('Lỗi nạp thư mục & bộ thẻ:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredSets = selectedFolderId
    ? sets.filter((s) => s.folder_id === selectedFolderId)
    : sets;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-sans">
            Thư Viện Thư Mục & Bộ Thẻ
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tổ chức từ vựng theo cấu trúc phân cấp Folders &rarr; Study Sets &rarr; Flashcards
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs font-semibold justify-center"
            onClick={() => setIsFolderModalOpen(true)}
          >
            <FolderPlus className="w-4 h-4 text-primary" />
            <span>Tạo Thư Mục</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs font-semibold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 justify-center"
            onClick={() => setIsTsvModalOpen(true)}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Nạp file TSV</span>
          </Button>

          <Button
            size="sm"
            className="col-span-2 sm:col-span-1 gap-1.5 rounded-xl text-xs font-semibold shadow-md justify-center"
            onClick={() => setIsSetModalOpen(true)}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tạo Bộ Thẻ Mới</span>
          </Button>
        </div>
      </div>

      {/* Folders Row */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold tracking-tight">Thư mục chủ đề</h2>
            <span className="text-xs text-muted-foreground font-mono">({folders.length})</span>
          </div>

          {selectedFolderId && (
            <button
              onClick={() => setSelectedFolderId(null)}
              className="text-xs text-primary font-semibold hover:underline cursor-pointer"
            >
              Xem tất cả bộ thẻ
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {folders.map((folder) => {
            const isSelected = selectedFolderId === folder.id;
            const count = sets.filter((s) => s.folder_id === folder.id).length;

            return (
              <div
                key={folder.id}
                onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
                className={`flex items-start justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30'
                    : 'bg-card hover:border-primary/40 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 pr-2">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs shrink-0 mt-0.5"
                    style={{ backgroundColor: folder.color_code || '#3B82F6' }}
                  >
                    <Folder className="w-5 h-5 fill-white/20" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-sm text-foreground line-clamp-2 break-words leading-snug">
                      {folder.name}
                    </h4>
                    {folder.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {folder.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <Badge variant={isSelected ? 'default' : 'secondary'} className="text-xs font-mono">
                    {count} bộ
                  </Badge>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderToDelete(folder);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    title="Xóa thư mục (bảo toàn bộ thẻ)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Study Sets Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold tracking-tight">
              {selectedFolderId
                ? `Bộ thẻ trong thư mục: ${folders.find((f) => f.id === selectedFolderId)?.name}`
                : 'Tất cả Bộ thẻ từ vựng'}
            </h2>
            <span className="text-xs text-muted-foreground font-mono">({filteredSets.length})</span>
          </div>

          {selectedFolderId && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-xl text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10 transition-colors shadow-2xs"
                onClick={() => setIsAddExistingModalOpen(true)}
              >
                <FolderPlus className="w-4 h-4" />
                <span>Thêm bộ thẻ đã có</span>
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-2xl border bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filteredSets.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground space-y-3">
            <Layers className="w-10 h-10 mx-auto text-muted-foreground/60" />
            <p className="font-semibold text-base text-foreground">Chưa có bộ thẻ nào trong danh mục này</p>
            <p className="text-xs max-w-sm mx-auto">
              Bạn có thể thêm các bộ thẻ đã có sẵn vào thư mục này hoặc tạo bộ thẻ mới hoàn toàn.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              {selectedFolderId && (
                <Button
                  size="sm"
                  onClick={() => setIsAddExistingModalOpen(true)}
                  className="gap-1.5 font-semibold rounded-xl shadow-md"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Thêm bộ thẻ đã có vào thư mục</span>
                </Button>
              )}
              <Button
                size="sm"
                variant={selectedFolderId ? 'outline' : 'default'}
                onClick={() => setIsSetModalOpen(true)}
                className="gap-1.5 rounded-xl font-semibold"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Tạo bộ thẻ mới</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSets.map((set, index) => {
              const folder = folders.find((f) => f.id === set.folder_id);

              return (
                <Link key={set.id} to={`/sets/${set.id}`}>
                  <Card className="h-full flex flex-col justify-between hover:border-primary/50 hover:shadow-lg transition-all group p-5 sm:p-6 bg-card/80 backdrop-blur-xs">
                    <div className="space-y-3">
                      {/* Top Badge & Action Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* STT badge: Thứ tự cái nào vào trước xếp thứ 1 */}
                          <span
                            className="flex items-center justify-center h-6 min-w-6 px-1.5 rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold shrink-0"
                            title={`Số thứ tự: #${index + 1}`}
                          >
                            #{index + 1}
                          </span>

                          {folder ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-xs truncate max-w-[160px] sm:max-w-[200px]"
                              style={{ backgroundColor: folder.color_code || '#3B82F6' }}
                              title={`Thư mục: ${folder.name}`}
                            >
                              <Folder className="w-3 h-3 shrink-0 fill-white/20" />
                              <span className="truncate">{folder.name}</span>
                            </span>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] gap-1 shrink-0 font-normal">
                              <Layers className="w-3 h-3 text-muted-foreground" />
                              <span>Độc lập</span>
                            </Badge>
                          )}
                        </div>

                        {/* Card Count & Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="font-mono text-xs bg-background/50">
                            {set.total_cards} từ
                          </Badge>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSetToMove(set);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Thêm vào / Chuyển thư mục"
                          >
                            <FolderInput className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSetToDelete(set);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Xóa bộ thẻ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Set Title - Displays 2 lines gracefully so text is never awkwardly cut off */}
                      <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug break-words">
                        {set.title}
                      </h3>

                      {set.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {set.description}
                        </p>
                      )}

                      {set.tags && set.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {set.tags.slice(0, 3).map((tag, tIdx) => (
                            <span key={tIdx} className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/60 text-xs font-semibold text-primary">
                      <span>Xem chi tiết & Flat list</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateFolderModal
        open={isFolderModalOpen}
        onOpenChange={setIsFolderModalOpen}
        onSuccess={() => {
          loadData();
          toast.success('Đã tạo thư mục mới!');
        }}
      />

      <CreateStudySetModal
        open={isSetModalOpen}
        onOpenChange={setIsSetModalOpen}
        folders={folders}
        initialFolderId={selectedFolderId || undefined}
        onSuccess={() => {
          loadData();
          toast.success('Đã tạo bộ thẻ mới!');
        }}
      />

      <CreateSetFromTsvModal
        open={isTsvModalOpen}
        onOpenChange={setIsTsvModalOpen}
        folders={folders}
        initialFolderId={selectedFolderId || undefined}
        onSuccess={() => {
          loadData();
          toast.success('Đã nạp bộ thẻ từ TSV!');
        }}
      />

      {/* Move / Add Study Set to Folder Modal */}
      <MoveSetToFolderModal
        open={!!setToMove}
        onOpenChange={(open) => !open && setSetToMove(null)}
        studySet={setToMove}
        folders={folders}
        onSuccess={() => {
          setSetToMove(null);
          loadData();
        }}
      />

      {/* Add Existing Sets to Folder Modal */}
      <AddExistingSetsToFolderModal
        open={isAddExistingModalOpen}
        onOpenChange={setIsAddExistingModalOpen}
        folder={folders.find((f) => f.id === selectedFolderId) || null}
        allSets={sets}
        folders={folders}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Delete Folder Dialog (Safe Detach) */}
      <DeleteFolderDialog
        folder={folderToDelete}
        isOpen={!!folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onDeleted={(deletedFolderId) => {
          if (selectedFolderId === deletedFolderId) {
            setSelectedFolderId(null);
          }
          loadData();
          toast.success('Đã xóa thư mục (bảo toàn các bộ thẻ)!');
        }}
      />

      {/* Delete Study Set Dialog (Cascade Clean) */}
      <DeleteStudySetDialog
        studySet={setToDelete}
        isOpen={!!setToDelete}
        onClose={() => setSetToDelete(null)}
        onDeleted={() => {
          loadData();
          toast.success('Đã xóa bộ thẻ!');
        }}
      />
    </div>
  );
};
