import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getFolders, getStudySets } from '@/services/api/studySetService';
import { Folder, StudySet } from '@/types/database.types';
import { CreateFolderModal } from '@/features/study-sets/components/CreateFolderModal';
import { CreateStudySetModal } from '@/features/study-sets/components/CreateStudySetModal';
import { CreateSetFromTsvModal } from '@/features/study-sets/components/CreateSetFromTsvModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FolderKanban, 
  PlusCircle, 
  BookOpen, 
  FolderPlus, 
  ArrowRight, 
  Layers, 
  Sparkles,
  Filter,
  FileSpreadsheet
} from 'lucide-react';

export const StudySetsPage: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [sets, setSets] = useState<StudySet[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isSetModalOpen, setIsSetModalOpen] = useState(false);
  const [isTsvModalOpen, setIsTsvModalOpen] = useState(false);

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

  const handleFolderCreated = (newFolder: Folder) => {
    setFolders((prev) => [newFolder, ...prev]);
  };

  const handleSetCreated = (newSet: StudySet) => {
    setSets((prev) => [newSet, ...prev]);
  };

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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs font-semibold"
            onClick={() => setIsFolderModalOpen(true)}
          >
            <FolderPlus className="w-4 h-4 text-primary" />
            <span>Tạo Thư Mục</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs font-semibold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            onClick={() => setIsTsvModalOpen(true)}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Tạo từ file TSV</span>
          </Button>

          <Button
            size="sm"
            className="gap-1.5 rounded-xl text-xs font-semibold shadow-md"
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
            <FolderKanban className="w-4 h-4 text-primary" />
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
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'bg-card hover:border-primary/40 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                    style={{ backgroundColor: folder.color_code || '#3B82F6' }}
                  >
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground line-clamp-1">{folder.name}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {folder.description || `${count} bộ thẻ`}
                    </p>
                  </div>
                </div>

                <Badge variant={isSelected ? 'default' : 'secondary'} className="text-xs font-mono ml-2 shrink-0">
                  {count} bộ
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* Study Sets Grid */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h2 className="text-base font-bold tracking-tight">
              {selectedFolderId
                ? `Bộ thẻ trong thư mục: ${folders.find((f) => f.id === selectedFolderId)?.name}`
                : 'Tất cả Bộ thẻ từ vựng'}
            </h2>
            <span className="text-xs text-muted-foreground font-mono">({filteredSets.length})</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-44 rounded-2xl border bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : filteredSets.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground space-y-3">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/60" />
            <p className="font-semibold text-base text-foreground">Chưa có bộ thẻ nào trong danh mục này</p>
            <p className="text-xs max-w-sm mx-auto">
              Hãy tạo bộ thẻ mới và nạp từ vựng bằng file TSV hoặc clipboard để bắt đầu học.
            </p>
            <Button size="sm" onClick={() => setIsSetModalOpen(true)} className="gap-1.5 mt-2">
              <PlusCircle className="w-4 h-4" />
              <span>Tạo bộ thẻ đầu tiên</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSets.map((set) => {
              const folder = folders.find((f) => f.id === set.folder_id);

              return (
                <Link key={set.id} to={`/sets/${set.id}`}>
                  <Card className="h-full flex flex-col justify-between hover:border-primary/50 hover:shadow-lg transition-all group p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        {folder ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-xs"
                            style={{ backgroundColor: folder.color_code || '#3B82F6' }}
                          >
                            <FolderKanban className="w-3 h-3" />
                            <span>{folder.name}</span>
                          </span>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            Độc lập
                          </Badge>
                        )}

                        <Badge variant="outline" className="font-mono text-xs">
                          {set.total_cards} từ
                        </Badge>
                      </div>

                      <h3 className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
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

                    <div className="flex items-center justify-between pt-4 mt-4 border-t text-xs font-semibold text-primary">
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
        onSuccess={handleFolderCreated}
      />

      <CreateStudySetModal
        open={isSetModalOpen}
        onOpenChange={setIsSetModalOpen}
        folders={folders}
        initialFolderId={selectedFolderId || undefined}
        onSuccess={handleSetCreated}
      />

      <CreateSetFromTsvModal
        open={isTsvModalOpen}
        onOpenChange={setIsTsvModalOpen}
        folders={folders}
        initialFolderId={selectedFolderId || undefined}
        onSuccess={handleSetCreated}
      />
    </div>
  );
};
