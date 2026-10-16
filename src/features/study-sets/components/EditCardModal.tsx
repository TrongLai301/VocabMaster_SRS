import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Check } from 'lucide-react';
import { updateCard } from '@/services/api/studySetService';
import { Card } from '@/types/database.types';
import { toast } from 'sonner';
import { soundFX } from '@/lib/audioFX';
import { CustomSelect, SelectOption } from '@/components/ui/custom-select';

const PART_OF_SPEECH_OPTIONS: SelectOption[] = [
  { value: 'noun', label: 'Danh từ (Noun)' },
  { value: 'verb', label: 'Động từ (Verb)' },
  { value: 'adjective', label: 'Tính từ (Adjective)' },
  { value: 'adverb', label: 'Trạng từ (Adverb)' },
  { value: 'phrase', label: 'Cụm từ (Phrase)' },
  { value: 'idiom', label: 'Thành ngữ (Idiom)' },
  { value: 'phrasal verb', label: 'Cụm động từ (Phrasal Verb)' },
  { value: 'preposition', label: 'Giới từ (Preposition)' },
];

interface EditCardModalProps {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updatedCard: Card) => void;
}

export const EditCardModal: React.FC<EditCardModalProps> = ({
  card,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [term, setTerm] = useState('');
  const [ipa, setIpa] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('noun');
  const [definition, setDefinition] = useState('');
  const [example, setExample] = useState('');
  const [synonymsInput, setSynonymsInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (card) {
      setTerm(card.term || '');
      setIpa(card.ipa || '');
      setPartOfSpeech(card.part_of_speech || 'noun');
      setDefinition(card.definition || '');
      setExample(card.example || '');
      setSynonymsInput(card.synonyms ? card.synonyms.join(', ') : '');
    }
  }, [card]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card || !term.trim() || !definition.trim()) return;

    setLoading(true);
    try {
      let formattedIpa = ipa.trim();
      if (formattedIpa && !formattedIpa.startsWith('/')) {
        formattedIpa = `/${formattedIpa}/`;
      }

      const synonyms = synonymsInput
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const updated = await updateCard(card.id, {
        term: term.trim(),
        ipa: formattedIpa || null,
        part_of_speech: partOfSpeech.toLowerCase(),
        definition: definition.trim(),
        example: example.trim() || null,
        synonyms,
      });

      soundFX.playSuccess();
      toast.success(`Đã cập nhật từ vựng "${updated.term}" thành công!`);
      onSuccess(updated);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Lỗi cập nhật: ${err.message || 'Không thể lưu thay đổi'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Pencil className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Chỉnh Sửa Thẻ Từ Vựng</DialogTitle>
              <DialogDescription>Cập nhật lại từ vựng, phiên âm IPA hoặc câu ví dụ</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Từ vựng (Word) *</label>
              <Input
                placeholder="VD: ubiquitous"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Phiên âm (IPA)</label>
              <Input
                placeholder="VD: /juːˈbɪk.wə.təs/"
                value={ipa}
                onChange={(e) => setIpa(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Loại từ (Part of Speech)</label>
              <CustomSelect
                value={partOfSpeech}
                onChange={(val) => setPartOfSpeech(val)}
                options={PART_OF_SPEECH_OPTIONS}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Từ đồng nghĩa (Synonyms)</label>
              <Input
                placeholder="cách nhau bởi dấu phẩy"
                value={synonymsInput}
                onChange={(e) => setSynonymsInput(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Định nghĩa tiếng Việt *</label>
            <Textarea
              placeholder="VD: Có mặt ở khắp mọi nơi, phổ biến rộng rãi"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              rows={2}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Câu ví dụ (Example)</label>
            <Textarea
              placeholder="VD: Smartphones have become ubiquitous in daily modern life."
              value={example}
              onChange={(e) => setExample(e.target.value)}
              rows={2}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !term.trim() || !definition.trim()} className="gap-2">
              <Check className="w-4 h-4" />
              <span>{loading ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
