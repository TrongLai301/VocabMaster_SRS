import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { parseTsvVocabulary, ParseResult, SAMPLE_TSV_DATA } from '@/services/parser/tsvParser';
import { createStudySet, bulkInsertCards } from '@/services/api/studySetService';
import { Folder, StudySet } from '@/types/database.types';
import { 
  FileSpreadsheet, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Copy,
  Plus
} from 'lucide-react';

interface CreateSetFromTsvModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  initialFolderId?: string;
  onSuccess: (newSet: StudySet) => void;
}

export const CreateSetFromTsvModal: React.FC<CreateSetFromTsvModalProps> = ({
  open,
  onOpenChange,
  folders,
  initialFolderId,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState(initialFolderId || '');
  const [tagsInput, setTagsInput] = useState('TSV Import');
  const [tsvInput, setTsvInput] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('paste');

  const handleParse = (rawText: string) => {
    setTsvInput(rawText);
    if (!rawText.trim()) {
      setParseResult(null);
      return;
    }
    const result = parseTsvVocabulary(rawText);
    setParseResult(result);
  };

  const handleLoadSample = () => {
    if (!title) setTitle('Bộ Từ Vựng Học Thuật Cốt Lõi (Mẫu)');
    handleParse(SAMPLE_TSV_DATA);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParse(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !parseResult || parseResult.validCount === 0) return;

    setLoading(true);
    try {
      const tags = tagsInput
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean);

      // 1. Tạo bộ thẻ mới
      const newSet = await createStudySet({
        title: title.trim(),
        description: description.trim() || undefined,
        folder_id: folderId || null,
        tags,
      });

      // 2. Chèn toàn bộ từ vựng đã parse vào bộ thẻ mới
      await bulkInsertCards(newSet.id, parseResult.items);

      onSuccess(newSet);
      onOpenChange(false);
      setTitle('');
      setDescription('');
      setTsvInput('');
      setParseResult(null);
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể tạo và nạp bộ thẻ'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Tạo Bộ Thẻ Mới Trực Tiếp Từ File TSV</DialogTitle>
              <DialogDescription>
                Tự động tạo bộ thẻ và import toàn bộ từ vựng chỉ trong 1 bước
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1">
          {/* Thông tin bộ thẻ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-muted/30 border">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Tên bộ thẻ mới *</label>
              <Input
                placeholder="VD: 100 Từ vựng IELTS Writing Task 2..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Thư mục phân loại</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">-- Đứng độc lập (Không xếp thư mục) --</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Thẻ phân loại (Tags)</label>
              <Input
                placeholder="IELTS, C1, Technology..."
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>
          </div>

          {/* TSV Input Area */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="paste" className="gap-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  <span>Dán TSV Clipboard</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải file .TSV / .TXT</span>
                </TabsTrigger>
              </TabsList>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs rounded-lg"
                onClick={handleLoadSample}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Nạp dữ liệu mẫu</span>
              </Button>
            </div>

            <TabsContent value="paste" className="mt-3">
              <Textarea
                placeholder="Dán các dòng TSV từ Google Sheets hoặc Excel vào đây... (Định dạng: Word \t Synonyms \t IPA \t PartOfSpeech \t Example \t Definition)"
                rows={5}
                value={tsvInput}
                onChange={(e) => handleParse(e.target.value)}
                className="font-mono text-xs leading-relaxed"
                required
              />
            </TabsContent>

            <TabsContent value="upload" className="mt-3">
              <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer hover:bg-muted/40 transition-colors">
                <FileText className="w-8 h-8 text-muted-foreground/60 mb-2" />
                <span className="text-xs font-semibold">Bấm để chọn file .tsv hoặc .txt từ máy tính</span>
                <input
                  type="file"
                  accept=".tsv,.txt,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </TabsContent>
          </Tabs>

          {/* Validation Summary */}
          {parseResult && (
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">
                  Phát hiện: <strong>{parseResult.totalParsed}</strong> từ
                </span>
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{parseResult.validCount} hợp lệ</span>
                </span>
                {parseResult.invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-rose-600 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{parseResult.invalidCount} lỗi</span>
                  </span>
                )}
              </div>
              <span className="text-muted-foreground font-mono">Đủ điều kiện tạo bộ</span>
            </div>
          )}

          {/* Preview Table */}
          {parseResult && parseResult.items.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-32">Từ vựng</TableHead>
                    <TableHead className="w-28">IPA</TableHead>
                    <TableHead className="w-20">Loại</TableHead>
                    <TableHead>Định nghĩa</TableHead>
                    <TableHead className="w-24 text-right">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-bold text-foreground">{item.term}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.ipa || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {item.partOfSpeech}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-xs" title={item.definition}>
                        {item.definition}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.isValid ? (
                          <Badge variant="success" className="text-[10px]">Hợp lệ</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">Lỗi</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim() || !parseResult || parseResult.validCount === 0}
              className="gap-2 font-semibold shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>
                {loading ? 'Đang tạo bộ thẻ...' : `Tạo bộ thẻ và nạp ${parseResult?.validCount || 0} từ`}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
