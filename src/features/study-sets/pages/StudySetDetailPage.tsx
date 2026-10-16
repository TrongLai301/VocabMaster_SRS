import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStudySetById, getCardsBySetId, deleteCard } from '@/services/api/studySetService';
import { StudySet, Card as CardType } from '@/types/database.types';
import { CardFlatListTable } from '@/features/study-sets/components/CardFlatListTable';
import { ImportTsvModal } from '@/features/study-sets/components/ImportTsvModal';
import { AddCardModal } from '@/features/study-sets/components/AddCardModal';
import { EditCardModal } from '@/features/study-sets/components/EditCardModal';
import { DeleteStudySetDialog } from '@/features/study-sets/components/DeleteStudySetDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  FileSpreadsheet, 
  Plus, 
  Layers, 
  Sparkles, 
  FolderKanban,
  Table as TableIcon,
  LayoutGrid,
  HelpCircle,
  Zap,
  Pencil,
  Trash2,
  Headphones
} from 'lucide-react';
import { toast } from 'sonner';

export const StudySetDetailPage: React.FC = () => {
  const { setId } = useParams<{ setId: string }>();
  const navigate = useNavigate();
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isDeleteSetOpen, setIsDeleteSetOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [viewMode, setViewMode] = useState<'flat' | 'grid'>('flat');

  const loadData = useCallback(async () => {
    if (!setId) return;
    setLoading(true);
    try {
      const [setData, cardsData] = await Promise.all([
        getStudySetById(setId),
        getCardsBySetId(setId),
      ]);
      setStudySet(setData);
      setCards(cardsData);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu bộ thẻ:', err);
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteCard = async (cardId: string) => {
    if (!setId || !confirm('Bạn có chắc muốn xóa thẻ này?')) return;
    try {
      await deleteCard(cardId, setId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      toast.success('Đã xóa thẻ từ vựng');
    } catch (err: any) {
      toast.error(`Lỗi xóa thẻ: ${err.message}`);
    }
  };

  const handleEditCard = (card: CardType) => {
    setEditingCard(card);
  };

  const handleEditCardSuccess = (updatedCard: CardType) => {
    setCards((prev) => prev.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
  };

  const handleImportSuccess = (count: number) => {
    loadData();
  };

  const handleAddCardSuccess = (newCard: CardType) => {
    setCards((prev) => [...prev, newCard]);
    toast.success(`Đã thêm từ "${newCard.term}" vào bộ thẻ!`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium">Đang tải chi tiết bộ thẻ...</p>
        </div>
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center space-y-4">
        <h2 className="text-2xl font-bold">Không tìm thấy bộ thẻ</h2>
        <p className="text-muted-foreground">Bộ thẻ này không tồn tại hoặc đã bị xóa.</p>
        <Link to="/sets">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Trở về danh sách bộ thẻ</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/sets" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Tất cả bộ thẻ</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-lg text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setIsDeleteSetOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xóa bộ thẻ</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 rounded-lg text-xs"
            onClick={() => setIsImportOpen(true)}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
            <span>Nhập TSV</span>
          </Button>
          <Button
            size="sm"
            className="gap-1.5 rounded-lg text-xs shadow-sm"
            onClick={() => setIsAddCardOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm từ mới</span>
          </Button>
        </div>
      </div>

      {/* Set Header Hero Card */}
      <div className="rounded-3xl border bg-card p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 text-xs">
                <FolderKanban className="w-3 h-3 text-primary" />
                <span>Bộ thẻ học</span>
              </Badge>
              <Badge variant="outline" className="font-mono text-xs">
                {cards.length} từ vựng
              </Badge>
              {studySet.tags?.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="text-xs text-muted-foreground">
                  #{tag}
                </Badge>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-sans">
              {studySet.title}
            </h1>

            {studySet.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {studySet.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <Link to={`/study/${studySet.id}`}>
              <Button className="rounded-xl shadow-md gap-2 font-bold px-4 sm:px-6">
                <Layers className="w-4 h-4" />
                <span>Học Flashcards (3D)</span>
              </Button>
            </Link>
            <Link to={`/games?setId=${studySet.id}&mode=quiz`}>
              <Button variant="outline" className="rounded-xl gap-2 font-semibold px-4 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                <span>Trắc nghiệm (Quiz)</span>
              </Button>
            </Link>
            <Link to={`/games?setId=${studySet.id}&mode=match`}>
              <Button variant="outline" className="rounded-xl gap-2 font-semibold px-4 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/50">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Ghép từ (Match)</span>
              </Button>
            </Link>
            <Link to={`/games?setId=${studySet.id}&mode=dictation`}>
              <Button variant="outline" className="rounded-xl gap-2 font-semibold px-4 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
                <Headphones className="w-4 h-4 text-emerald-500" />
                <span>Nghe & Viết</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* View Switcher & Title */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold tracking-tight">Danh sách Từ vựng Trong Bộ</h2>
          <span className="text-xs text-muted-foreground font-mono">({cards.length} từ)</span>
        </div>

        <div className="flex items-center border rounded-lg p-0.5 bg-muted/40">
          <button
            onClick={() => setViewMode('flat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'flat'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flat List (OpenQuiz)</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dạng Card Grid</span>
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'flat' ? (
        <CardFlatListTable
          cards={cards}
          onDeleteCard={handleDeleteCard}
          onEditCard={handleEditCard}
          onAddCardClick={() => setIsAddCardOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, idx) => (
            <Card key={card.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="uppercase text-[10px] font-mono">
                    {card.part_of_speech || 'vocab'}
                  </Badge>
                  <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                </div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">{card.term}</h3>
                {card.ipa && <p className="text-xs font-mono text-muted-foreground">{card.ipa}</p>}
                <p className="text-xs text-foreground/90 font-medium leading-relaxed pt-1">{card.definition}</p>
                {card.example && (
                  <p className="text-[11px] italic text-muted-foreground bg-muted/40 p-2 rounded-lg">
                    "{card.example}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-1 mt-3">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-primary rounded-lg"
                  onClick={() => handleEditCard(card)}
                  title="Chỉnh sửa thẻ"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                  onClick={() => handleDeleteCard(card.id)}
                  title="Xóa thẻ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Import TSV Modal */}
      <ImportTsvModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        setId={studySet.id}
        onSuccess={handleImportSuccess}
      />

      {/* Add Card Modal */}
      <AddCardModal
        open={isAddCardOpen}
        onOpenChange={setIsAddCardOpen}
        setId={studySet.id}
        nextOrderIndex={cards.length}
        onSuccess={handleAddCardSuccess}
      />

      {/* Edit Card Modal */}
      <EditCardModal
        card={editingCard}
        open={!!editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        onSuccess={handleEditCardSuccess}
      />

      {/* Delete Study Set Dialog */}
      <DeleteStudySetDialog
        studySet={studySet}
        isOpen={isDeleteSetOpen}
        onClose={() => setIsDeleteSetOpen(false)}
        onDeleted={() => {
          navigate('/sets');
        }}
      />
    </div>
  );
};
