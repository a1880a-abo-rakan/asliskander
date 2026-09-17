import React, { useState, useEffect } from "react";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";

interface AiExtractionProgressBarProps {
  isExtracting: boolean;
  estimatedSeconds?: number;
}

export const AiExtractionProgressBar: React.FC<AiExtractionProgressBarProps> = ({
  isExtracting,
  estimatedSeconds = 5,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(estimatedSeconds);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isExtracting) {
      setSecondsLeft(estimatedSeconds);
      setProgress(0);
      return;
    }

    setSecondsLeft(estimatedSeconds);
    setProgress(5);

    const startTime = Date.now();
    const durationMs = estimatedSeconds * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(95, Math.round((elapsed / durationMs) * 90) + 5);
      setProgress(pct);

      const remaining = Math.max(1, Math.ceil((durationMs - elapsed) / 1000));
      setSecondsLeft(remaining);
    }, 150);

    return () => clearInterval(interval);
  }, [isExtracting, estimatedSeconds]);

  if (!isExtracting) return null;

  return (
    <div className="w-full bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-4 my-3 text-white shadow-xl shadow-indigo-950/40 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      {/* Top Header info */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">
                جاري مسح وقراءة الفاتورة بالذكاء الاصطناعي
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              يتم استخراج اسم المورد، رقم الفاتورة، والمبالغ تلقائياً...
            </p>
          </div>
        </div>

        {/* Big Live Countdown Badge */}
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-baseline gap-1 px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/40 rounded-xl shadow-inner">
            <span className="text-lg font-black text-amber-300 font-mono tracking-tight">
              {secondsLeft}
            </span>
            <span className="text-[11px] font-bold text-indigo-200">ثوانٍ</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold mt-1">الوقت المتوقع</span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="relative w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700/80 p-0.5">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-200 ease-out relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-[shimmer_1.5s_infinite] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)]" />
        </div>
      </div>

      {/* Mini Steps status footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1 font-medium">
        <span className="text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> تم ضغط الصورة بنجاح
        </span>
        <span className="text-amber-300 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 animate-spin" /> قراءة الأرقام والبيانات... ({progress}%)
        </span>
      </div>
    </div>
  );
};
