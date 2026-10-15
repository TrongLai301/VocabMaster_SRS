import React, { useState, useMemo } from 'react';
import { Card as CardType } from '@/types/database.types';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Volume2, 
  Trash2, 
  Filter, 
  Plus, 
  Sparkles,
  BookOpen,
  Pencil
} from 'lucide-react';

import { useSpeechTTS } from '@/hooks/useSpeechTTS';

interface CardFlatListTableProps {
  cards: CardType[];
  onDeleteCard?: (cardId: string) => void;
  onEditCard?: (card: CardType) => void;
  onAddCardClick?: () => void;
}

export const CardFlatListTable: React.FC<CardFlatListTableProps> = ({
  cards,
  onDeleteCard,
  onEditCard,
  onAddCardClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPos, setSelectedPos] = useState<string>('all');
  const { speak } = useSpeechTTS();

  const speakTerm = (text: string) => {
    speak(text);
  };

  // Lấy danh sách các loại từ có trong bộ thẻ
  const availablePos = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => {
      if (c.part_of_speech) set.add(c.part_of_speech.toLowerCase());
    });
    return Array.from(set);
  }, [cards]);

  // Lọc thẻ theo Search Query & Part of Speech
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        card.term.toLowerCase().includes(q) ||
        card.definition.toLowerCase().includes(q) ||
        (card.ipa && card.ipa.toLowerCase().includes(q)) ||
        (card.example && card.example.toLowerCase().includes(q));

      const matchPos =
        selectedPos === 'all' ||
        card.part_of_speech?.toLowerCase() === selectedPos.toLowerCase();

      return matchSearch && matchPos;
    });
  }, [cards, searchQuery, selectedPos]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm từ vựng, định nghĩa hoặc câu ví dụ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1 shrink-0" />
          <button
            onClick={() => setSelectedPos('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              selectedPos === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Tất cả ({cards.length})
          </button>
          {availablePos.map((pos) => (
            <button
              key={pos}
              onClick={() => setSelectedPos(pos)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase transition-colors cursor-pointer whitespace-nowrap ${
                selectedPos === pos
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {pos}
            </button>
          ))}

          {onAddCardClick && (
            <Button size="sm" variant="outline" onClick={onAddCardClick} className="gap-1.5 h-8 ml-2 text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm thẻ</span>
            </Button>
          )}
        </div>
      </div>

      {/* Flat List Table */}
      {filteredCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/60" />
          <p className="font-semibold text-sm">Không tìm thấy từ vựng phù hợp</p>
          <p className="text-xs">Hãy thử đổi từ khóa tìm kiếm hoặc bấm nút "Nạp từ vựng TSV" phía trên.</p>
        </div>
      ) : (
        <>
          {/* Mobile Card List View (< 640px) */}
          <div className="block sm:hidden space-y-3">
            {filteredCards.map((card, idx) => (
              <div 
                key={card.id} 
                className="p-4 rounded-2xl border bg-card shadow-sm space-y-2.5 transition-all hover:border-primary/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <h4 className="font-extrabold text-lg text-foreground tracking-tight">
                        {card.term}
                      </h4>
                      {card.part_of_speech && (
                        <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                          {card.part_of_speech}
                        </Badge>
                      )}
                    </div>
                    {card.ipa && (
                      <p className="text-xs text-muted-foreground font-mono">{card.ipa}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full text-primary hover:bg-primary/10"
                      onClick={() => speakTerm(card.term)}
                      title="Nghe phát âm"
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>
                    {onEditCard && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                        onClick={() => onEditCard(card)}
                        title="Chỉnh sửa thẻ"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {onDeleteCard && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        onClick={() => onDeleteCard(card.id)}
                        title="Xóa thẻ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Definition */}
                <div className="pt-1 border-t">
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {card.definition}
                  </p>
                </div>

                {/* Example & Synonyms */}
                {card.example && (
                  <p className="text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2 leading-relaxed">
                    "{card.example}"
                  </p>
                )}

                {card.synonyms && card.synonyms.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] text-muted-foreground font-semibold">Đồng nghĩa:</span>
                    {card.synonyms.map((syn, sIdx) => (
                      <Badge key={sIdx} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                        {syn}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= 640px) */}
          <div className="hidden sm:block rounded-2xl border bg-card shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="w-48">Từ vựng & Phát âm</TableHead>
                  <TableHead className="w-28">Loại từ</TableHead>
                  <TableHead className="min-w-[280px]">Định nghĩa (Nghĩa chính)</TableHead>
                  <TableHead className="min-w-[300px]">Câu ví dụ ngữ cảnh & Đồng nghĩa</TableHead>
                  <TableHead className="w-20 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCards.map((card, idx) => (
                  <TableRow key={card.id} className="group hover:bg-muted/40 transition-colors">
                    {/* Stt */}
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {idx + 1}
                    </TableCell>

                    {/* Term + IPA + Speaker */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-extrabold text-base text-foreground font-sans tracking-tight">
                            {card.term}
                          </span>
                          {card.ipa && (
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">
                              {card.ipa}
                            </p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          onClick={() => speakTerm(card.term)}
                          title="Nghe phát âm bản xứ"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>

                    {/* Part of Speech */}
                    <TableCell>
                      <Badge variant="outline" className="uppercase text-[10px] tracking-wider font-mono">
                        {card.part_of_speech || 'vocab'}
                      </Badge>
                    </TableCell>

                    {/* Definition */}
                    <TableCell>
                      <p className="text-sm font-medium text-foreground leading-relaxed">
                        {card.definition}
                      </p>
                    </TableCell>

                    {/* Example & Synonyms */}
                    <TableCell>
                      <div className="space-y-1.5">
                        {card.example && (
                          <p className="text-xs italic text-muted-foreground border-l-2 border-primary/40 pl-2 leading-relaxed">
                            "{card.example}"
                          </p>
                        )}
                        {card.synonyms && card.synonyms.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[10px] font-semibold text-muted-foreground mr-0.5">Đồng nghĩa:</span>
                            {card.synonyms.map((syn, sIdx) => (
                              <Badge key={sIdx} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                {syn}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {onEditCard && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            onClick={() => onEditCard(card)}
                            title="Chỉnh sửa thẻ"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {onDeleteCard && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            onClick={() => onDeleteCard(card.id)}
                            title="Xóa thẻ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};
