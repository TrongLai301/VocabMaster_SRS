import React from 'react';
import { MemoryStageStats } from '@/services/api/srsService';
import { getBoxLevelInfo } from '@/services/srs/sm2';
import { Progress } from '@/components/ui/progress';
import { Brain, Sparkles, Layers } from 'lucide-react';

interface MemoryBoxDistributionProps {
  stats: MemoryStageStats;
  compact?: boolean;
}

export const MemoryBoxDistribution: React.FC<MemoryBoxDistributionProps> = ({
  stats,
  compact = false,
}) => {
  const total = stats.totalCards || 0;

  const boxes = [
    { level: 1, count: stats.box1 },
    { level: 2, count: stats.box2 },
    { level: 3, count: stats.box3 },
    { level: 4, count: stats.box4 },
    { level: 5, count: stats.box5 },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        {boxes.map(({ level, count }) => {
          const info = getBoxLevelInfo(level);
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div
              key={level}
              className="flex-1 flex flex-col items-center gap-1 p-2 rounded-xl border bg-card/60 hover:bg-card transition-colors text-center"
              title={`${info.name}: ${count} từ (${pct.toFixed(0)}%)`}
            >
              <div className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${info.badge}`} />
                <span className="text-[10px] font-bold text-muted-foreground font-mono">
                  B{level}
                </span>
              </div>
              <span className="text-sm font-extrabold text-foreground">{count}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground font-sans">
              Mô hình 5 Cấp Độ Trí Nhớ (MochiMochi SRS)
            </h3>
            <p className="text-xs text-muted-foreground">
              Phân loại từ vựng theo chu kỳ ghi nhớ dài hạn SuperMemo SM-2
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-muted-foreground block font-medium">Tổng từ đang học</span>
          <span className="text-lg font-black text-primary font-mono">{total} từ</span>
        </div>
      </div>

      {/* 5 Box Level Bars */}
      <div className="space-y-3">
        {boxes.map(({ level, count }) => {
          const info = getBoxLevelInfo(level);
          const percent = total > 0 ? (count / total) * 100 : 0;

          return (
            <div
              key={level}
              className={`p-3.5 rounded-2xl border transition-all hover:shadow-sm ${info.bg}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${info.badge}`}>
                    Hộp {level}
                  </span>
                  <div>
                    <span className={`text-xs font-bold ${info.color}`}>
                      {info.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground block sm:inline sm:ml-2">
                      ({info.description})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-right">
                  <span className="text-sm font-black text-foreground font-mono">
                    {count}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    ({percent.toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Progress visualizer */}
              <Progress
                value={percent}
                className="h-2 bg-black/5 dark:bg-white/5"
              />
            </div>
          );
        })}
      </div>

      {/* Memory Quality Summary */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-emerald-700 dark:text-emerald-300 font-bold block">
              Trí nhớ bền vững (Hộp 4 - 5)
            </span>
            <span className="text-base font-extrabold text-foreground">
              {stats.box4 + stats.box5} từ ({total > 0 ? (((stats.box4 + stats.box5) / total) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-amber-700 dark:text-amber-300 font-bold block">
              Đang củng cố (Hộp 1 - 3)
            </span>
            <span className="text-base font-extrabold text-foreground">
              {stats.box1 + stats.box2 + stats.box3} từ ({total > 0 ? (((stats.box1 + stats.box2 + stats.box3) / total) * 100).toFixed(0) : 0}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
