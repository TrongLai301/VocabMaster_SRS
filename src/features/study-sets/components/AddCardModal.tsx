import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle } from 'lucide-react';
import { createCard } from '@/services/api/studySetService';
import { Card } from '@/types/database.types';
import { CustomSelect, SelectOption } from '@/components/ui/custom-select';

const PART_OF_SPEECH_OPTIONS: SelectOption[] = [
  { value: 'noun', label: 'Danh từ (Noun)' },
  { value: 'verb', label: 'Động từ (Verb)' },
  { value: 'adjective', label: 'Tính từ (Adjective)' },
  { value: 'adverb', label: 'Trạng từ (Adverb)' },
  { value: 'phrase', label: 'Cụm từ (Phrase)' },
  { value: 'idiom', label: 'Thành ngữ (Idiom)' },
  { value: 'phrasal verb', label: 'Cụm động từ (Phrasal Verb)' },
];

interface AddCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  nextOrderIndex: number;
  onSuccess: (newCard: Card) => void;
}

export const AddCardModal: React.FC<AddCardModalProps> = ({
  open,
  onOpenChange,
  setId,
  nextOrderIndex,
  onSuccess,
}) => {
  const [term, setTerm] = useState('');
  const [ipa, setIpa] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('noun');
  const [definition, setDefinition] = useState('');
  const [example, setExample] = useState('');
  const [synonymsInput, setSynonymsInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !definition.trim()) return;

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

      const card = await createCard(setId, {
        term: term.trim(),
        ipa: formattedIpa || null,
        part_of_speech: partOfSpeech.toLowerCase(),
        definition: definition.trim(),
        example: example.trim() || null,
        synonyms,
        audio_url: null,
        image_url: null,
        order_index: nextOrderIndex,
      });

      onSuccess(card);
      onOpenChange(false);
      setTerm('');
      setIpa('');
      setDefinition('');
      setExample('');
      setSynonymsInput('');
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể thêm thẻ'}`);
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
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Thêm Thẻ Từ Vựng Mới</DialogTitle>
              <DialogDescription>Nhập chi tiết từ vựng và câu ví dụ thực tế</DialogDescription>
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
                placeholder="VD: /juːˈbɪk.wə.t̬əs/"
                value={ipa}
                onChange={(e) => setIpa(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Loại từ</label>
              <CustomSelect
                value={partOfSpeech}
                onChange={(val) => setPartOfSpeech(val)}
                options={PART_OF_SPEECH_OPTIONS}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Từ đồng nghĩa</label>
              <Input
                placeholder="omnipresent, pervasive"
                value={synonymsInput}
                onChange={(e) => setSynonymsInput(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Định nghĩa (Definition) *</label>
            <Textarea
              placeholder="Present, appearing, or found everywhere at the same time."
              rows={2}
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Câu ví dụ trong ngữ cảnh</label>
            <Textarea
              placeholder="Smartphones have become ubiquitous in daily modern life."
              rows={2}
              value={example}
              onChange={(e) => setExample(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !term.trim() || !definition.trim()} className="font-semibold shadow-md">
              {loading ? 'Đang thêm...' : 'Lưu thẻ vào bộ'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
