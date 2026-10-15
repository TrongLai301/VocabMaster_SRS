import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { parseTsvVocabulary, ParseResult, SAMPLE_TSV_DATA } from '@/services/parser/tsvParser';
import { bulkInsertCards } from '@/services/api/studySetService';
import { 
  FileSpreadsheet, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  FileText,
  Copy
} from 'lucide-react';
import { toast } from 'sonner';
import { soundFX } from '@/lib/audioFX';

interface ImportTsvModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  onSuccess: (importedCount: number) => void;
}

export const ImportTsvModal: React.FC<ImportTsvModalProps> = ({
  open,
  onOpenChange,
  setId,
  onSuccess,
}) => {
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
    handleParse(SAMPLE_TSV_DATA);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleParse(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!parseResult || parseResult.validCount === 0) return;
    setLoading(true);

    try {
      const count = await bulkInsertCards(setId, parseResult.items);
      soundFX.playSuccess();
      toast.success(`Đã nhập thành công ${count} từ vựng vào bộ thẻ! 🎉`);
      onSuccess(count);
      onOpenChange(false);
      setTsvInput('');
      setParseResult(null);
    } catch (err: any) {
      toast.error(`Lỗi import: ${err.message || 'Không thể lưu vào cơ sở dữ liệu'}`);
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
              <DialogTitle>Nhập Từ Vựng Hàng Loạt (TSV / Clipboard)</DialogTitle>
              <DialogDescription>
                Hỗ trợ định dạng chuẩn: <code>Word \t Synonyms \t IPA \t PartOfSpeech \t Example \t Definition</code>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-y-auto pr-1">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="paste" className="gap-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  <span>Dán từ Clipboard</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải file TSV / TXT</span>
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

            <TabsContent value="paste" className="space-y-2 mt-3">
              <Textarea
                placeholder="Dán các dòng TSV từ Google Sheets hoặc Excel vào đây... (Mỗi cột phân tách bằng dấu Tab)"
                rows={6}
                value={tsvInput}
                onChange={(e) => handleParse(e.target.value)}
                className="font-mono text-xs leading-relaxed"
              />
            </TabsContent>

            <TabsContent value="upload" className="mt-3">
              <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer hover:bg-muted/40 transition-colors">
                <FileText className="w-10 h-10 text-muted-foreground/60 mb-2" />
                <span className="text-sm font-semibold">Chọn file .tsv hoặc .txt từ máy tính</span>
                <span className="text-xs text-muted-foreground mt-1">Xuất từ Excel hoặc Google Sheets dạng Tab-separated values</span>
                <input
                  type="file"
                  accept=".tsv,.txt,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </TabsContent>
          </Tabs>

          {/* Statistics Summary */}
          {parseResult && (
            <div className="flex items-center justify-between rounded-xl bg-muted/50 p-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-foreground">
                  Tổng phát hiện: <strong>{parseResult.totalParsed}</strong> dòng
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
              <span className="text-muted-foreground font-mono">Xem trước bên dưới</span>
            </div>
          )}

          {/* Preview Table */}
          {parseResult && parseResult.items.length > 0 && (
            <div className="max-h-60 overflow-y-auto rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-36">Từ vựng</TableHead>
                    <TableHead className="w-32">IPA</TableHead>
                    <TableHead className="w-24">Loại từ</TableHead>
                    <TableHead>Định nghĩa</TableHead>
                    <TableHead className="w-28 text-right">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.items.map((item, index) => (
                    <TableRow key={index} className={item.isValid ? '' : 'bg-rose-50/50 dark:bg-rose-950/20'}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-bold text-foreground">{item.term || <span className="text-rose-500 italic">Trống</span>}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{item.ipa || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px]">
                          {item.partOfSpeech}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-xs" title={item.definition}>
                        {item.definition || <span className="text-rose-500 italic">Thiếu định nghĩa</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.isValid ? (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Hợp lệ</span>
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] gap-1" title={item.errors?.join(', ')}>
                            <AlertCircle className="w-3 h-3" />
                            <span>Lỗi</span>
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Hủy bỏ
          </Button>
          <Button
            type="button"
            disabled={loading || !parseResult || parseResult.validCount === 0}
            onClick={handleSubmit}
            className="gap-2 font-semibold shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {loading ? 'Đang lưu...' : `Nhập ${parseResult?.validCount || 0} từ vào bộ thẻ`}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
