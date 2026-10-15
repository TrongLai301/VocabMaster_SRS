import React, { useMemo } from 'react';
import { DailyActivityMap } from '@/services/api/analyticsService';
import { Calendar, Flame, CheckCircle2 } from 'lucide-react';

interface StreakHeatmapProps {
  data: DailyActivityMap;
  daysCount?: number;
}

interface HeatmapCell {
  dateStr: string;
  dayOfWeek: number; // 0: Sun, 1: Mon, ...
  count: number;
  formattedDate: string;
}

export const StreakHeatmap: React.FC<StreakHeatmapProps> = ({
  data,
  daysCount = 119, // 17 weeks * 7 = 119 days
}) => {
  // Tạo danh sách các ngày
  const cells = useMemo(() => {
    const list: HeatmapCell[] = [];
    const today = new Date();

    // Đi lùi từ hôm nay
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = data[dateStr] || 0;

      list.push({
        dateStr,
        dayOfWeek: d.getDay(),
        count,
        formattedDate: d.toLocaleDateString('vi-VN', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      });
    }
    return list;
  }, [data, daysCount]);

  // Phân chia theo 7 hàng (ngày trong tuần)
  const rows = useMemo(() => {
    // 7 rows: 0 (Sun), 1 (Mon), 2 (Tue), 3 (Wed), 4 (Thu), 5 (Fri), 6 (Sat)
    const result: HeatmapCell[][] = Array.from({ length: 7 }, () => []);
    cells.forEach((cell) => {
      result[cell.dayOfWeek].push(cell);
    });
    return result;
  }, [cells]);

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-muted/50 border-muted';
    if (count <= 5) return 'bg-emerald-200 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-900';
    if (count <= 15) return 'bg-emerald-400 dark:bg-emerald-700 border-emerald-500 dark:border-emerald-600';
    if (count <= 30) return 'bg-emerald-500 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-400';
    return 'bg-emerald-600 dark:bg-emerald-400 border-emerald-700 dark:border-emerald-300';
  };

  const totalReviews = useMemo(() => {
    return Object.values(data).reduce((acc, c) => acc + c, 0);
  }, [data]);

  const activeDays = useMemo(() => {
    return Object.values(data).filter((c) => c > 0).length;
  }, [data]);

  const dayLabels = ['', 'T2', '', 'T4', '', 'T6', ''];

  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground font-sans">
              Biểu Đồ Nhiệt Chuyên Cần (Activity Heatmap)
            </h3>
            <p className="text-xs text-muted-foreground">
              Tần suất ôn tập từ vựng mỗi ngày trong 17 tuần gần nhất
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Tổng lượt ôn</span>
            <span className="font-extrabold text-foreground text-sm font-mono">{totalReviews} lượt</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Ngày hoạt động</span>
            <span className="font-extrabold text-emerald-600 text-sm font-mono">{activeDays} ngày</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-2">
          {/* Day of Week Labels */}
          <div className="flex flex-col justify-between py-0.5 text-[10px] font-mono font-semibold text-muted-foreground/80 w-6">
            {dayLabels.map((lbl, idx) => (
              <span key={idx} className="h-3 flex items-center">
                {lbl}
              </span>
            ))}
          </div>

          {/* Matrix of Days */}
          <div className="grid grid-rows-7 grid-flow-col gap-1.5">
            {cells.map((cell) => (
              <div
                key={cell.dateStr}
                className={`w-3.5 h-3.5 rounded-sm border transition-transform hover:scale-125 cursor-pointer ${getColorClass(
                  cell.count
                )}`}
                title={`${cell.formattedDate}: ${cell.count} từ vựng đã ôn`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span className="text-[11px]">Hover vào từng ô vuông để xem chi tiết số từ đã học</span>

        <div className="flex items-center gap-1.5 text-[10px] font-medium font-mono">
          <span>Ít</span>
          <div className="w-3 h-3 rounded-sm bg-muted/50 border border-muted" />
          <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-950/80 border border-emerald-300" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700 border border-emerald-500" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-500 border border-emerald-600" />
          <div className="w-3 h-3 rounded-sm bg-emerald-600 dark:bg-emerald-400 border border-emerald-700" />
          <span>Nhiều</span>
        </div>
      </div>
    </div>
  );
};
