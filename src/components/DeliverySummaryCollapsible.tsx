import React, { useState, useMemo } from "react";
import { 
  Calendar, CalendarRange, ChevronDown, ChevronUp, Printer, 
  Truck, X, RotateCcw, FileText, CheckCircle2, TrendingUp,
  Hash, DollarSign
} from "lucide-react";
import { DailyEntry } from "../types";
import { AslIskanderLogoSymbol } from "./AslIskanderLogo";

interface DeliverySummaryCollapsibleProps {
  history: DailyEntry[];
  currentDate: string;
  currentDeliveryCount: number | "";
  currentDeliveryRate: number;
  currentDeliveryAmount: number;
  isOpen: boolean;
  onToggle: () => void;
}

interface DayDeliveryRecord {
  date: string;
  dayName: string;
  count: number;
  rate: number;
  amount: number;
  isCurrentEditingDay?: boolean;
}

// Helper to get Arabic day name deterministically
function getArabicDayName(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3) return "";
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  return days[d.getDay()] || "";
}

// Format numbers nicely
function formatCurrency(num: number): string {
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DeliverySummaryCollapsible({
  history,
  currentDate,
  currentDeliveryCount,
  currentDeliveryRate,
  currentDeliveryAmount,
  isOpen,
  onToggle,
}: DeliverySummaryCollapsibleProps) {
  // Period filter mode: "single" (يوم محدد) or "range" (مدى زمني)
  const [filterMode, setFilterMode] = useState<"single" | "range">("range");
  
  // Date inputs
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  
  // By default, for range, let's set from 1st of current month to today (or currentDate)
  const defaultFrom = useMemo(() => {
    const base = currentDate || todayStr;
    const parts = base.split("-");
    return `${parts[0]}-${parts[1]}-01`;
  }, [currentDate, todayStr]);

  const [singleDate, setSingleDate] = useState<string>(currentDate || todayStr);
  const [fromDate, setFromDate] = useState<string>(defaultFrom);
  const [toDate, setToDate] = useState<string>(currentDate || todayStr);
  const [onlyWithDeliveries, setOnlyWithDeliveries] = useState<boolean>(false);

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Quick preset handlers
  const handleSetPreset = (preset: "today" | "yesterday" | "thisWeek" | "thisMonth" | "lastMonth" | "all") => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === "today") {
      setFilterMode("single");
      setSingleDate(toYMD(now));
    } else if (preset === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      setFilterMode("single");
      setSingleDate(toYMD(y));
    } else if (preset === "thisWeek") {
      setFilterMode("range");
      const d = new Date(now);
      const day = d.getDay(); // 0 is Sun, 6 is Sat
      const diff = day === 6 ? 0 : (day + 1); // Sat is start of week in Saudi Arabia
      d.setDate(d.getDate() - diff);
      setFromDate(toYMD(d));
      setToDate(toYMD(now));
    } else if (preset === "thisMonth") {
      setFilterMode("range");
      setFromDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`);
      setToDate(toYMD(now));
    } else if (preset === "lastMonth") {
      setFilterMode("range");
      const prevM = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDayOfPrevM = new Date(now.getFullYear(), now.getMonth(), 0);
      setFromDate(toYMD(prevM));
      setToDate(toYMD(lastDayOfPrevM));
    } else if (preset === "all") {
      setFilterMode("range");
      // Find oldest and newest in history
      const dates = history.map(h => h.date).filter(Boolean).sort();
      if (dates.length > 0) {
        setFromDate(dates[0]);
        setToDate(dates[dates.length - 1] > todayStr ? dates[dates.length - 1] : todayStr);
      } else {
        setFromDate(`${now.getFullYear()}-01-01`);
        setToDate(todayStr);
      }
    }
  };

  // Compile full delivery list from history and current active form
  const deliveryData = useMemo(() => {
    // Map entries by date
    const map = new Map<string, DayDeliveryRecord>();

    history.forEach((d) => {
      if (!d.date) return;
      const rate = d.delivery_rate || 6;
      let count = 0;
      let amount = 0;

      const deliveryItem = (d.others || []).find(o => o.name && o.name.includes("توصيل"));
      if (typeof d.delivery_count === "number" && d.delivery_count > 0) {
        count = d.delivery_count;
        amount = deliveryItem ? deliveryItem.amt : Number((count * rate).toFixed(2));
      } else if (deliveryItem && deliveryItem.amt > 0) {
        amount = deliveryItem.amt;
        count = Math.round(amount / rate);
      }

      map.set(d.date, {
        date: d.date,
        dayName: getArabicDayName(d.date),
        count,
        rate,
        amount,
        isCurrentEditingDay: d.date === currentDate
      });
    });

    // If current editing day has unsaved changes or active edits in the form, override it
    if (currentDate) {
      const activeCount = typeof currentDeliveryCount === "number" ? currentDeliveryCount : 0;
      const activeAmount = currentDeliveryAmount > 0 
        ? currentDeliveryAmount 
        : Number((activeCount * currentDeliveryRate).toFixed(2));

      map.set(currentDate, {
        date: currentDate,
        dayName: getArabicDayName(currentDate),
        count: activeCount,
        rate: currentDeliveryRate,
        amount: activeAmount,
        isCurrentEditingDay: true
      });
    }

    // Filter by selected period
    let list: DayDeliveryRecord[] = [];
    if (filterMode === "single") {
      const rec = map.get(singleDate);
      if (rec) {
        list.push(rec);
      } else if (singleDate) {
        list.push({
          date: singleDate,
          dayName: getArabicDayName(singleDate),
          count: 0,
          rate: 6,
          amount: 0,
        });
      }
    } else {
      // Range mode
      const start = fromDate || "0000-00-00";
      const end = toDate || "9999-99-99";

      // Collect all dates in range from history map
      map.forEach((rec, dStr) => {
        if (dStr >= start && dStr <= end) {
          list.push(rec);
        }
      });

      // If no records at all in range, but start is valid, ensure empty list or sorted
      list.sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
    }

    // Apply optional filter: only days with delivery
    if (onlyWithDeliveries) {
      list = list.filter(r => r.count > 0 || r.amount > 0);
    }

    return list;
  }, [
    history, currentDate, currentDeliveryCount, currentDeliveryRate, 
    currentDeliveryAmount, filterMode, singleDate, fromDate, toDate, onlyWithDeliveries
  ]);

  // Aggregate stats
  const totals = useMemo(() => {
    let totalCount = 0;
    let totalAmount = 0;
    let daysWithDelivery = 0;

    deliveryData.forEach(item => {
      totalCount += item.count;
      totalAmount += item.amount;
      if (item.count > 0 || item.amount > 0) {
        daysWithDelivery++;
      }
    });

    const averagePerDay = deliveryData.length > 0 ? (totalCount / deliveryData.length) : 0;

    return {
      totalCount,
      totalAmount,
      daysWithDelivery,
      totalDays: deliveryData.length,
      averagePerDay
    };
  }, [deliveryData]);

  // Execution of print for A4
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Dropdown Collapsible Container */}
      {isOpen && (
        <div className="bg-gradient-to-b from-indigo-50/70 to-slate-50 p-4 sm:p-5 rounded-2xl border-2 border-indigo-200/80 shadow-md space-y-4 my-2 transition-all">
          {/* Header of Collapsible */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-150">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                  <span>كشف وبيان طلبات التوصيل (فرع القادسية)</span>
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
                    خاص بالمدير العام
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  استعلام تفصيلي لعدد ومبالغ التوصيل حسب اليوم أو الفترة الزمنية مع إمكانية الطباعة الرسمية A4
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                title="طباعة التقرير بورقة A4"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة التقرير (A4)</span>
              </button>

              <button
                type="button"
                onClick={onToggle}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                title="طي القائمة"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Period Selection Controls */}
          <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Filter Mode Radio Tabs */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterMode("single")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === "single"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  يوم محدد
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("range")}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    filterMode === "range"
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  مدى زمني (فترة)
                </button>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                <span className="text-slate-400 text-[10px] ml-1">فترات سريعة:</span>
                <button
                  type="button"
                  onClick={() => handleSetPreset("today")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md border border-slate-200 transition-colors cursor-pointer"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset("yesterday")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md border border-slate-200 transition-colors cursor-pointer"
                >
                  أمس
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset("thisWeek")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md border border-slate-200 transition-colors cursor-pointer"
                >
                  هذا الأسبوع
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset("thisMonth")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md border border-slate-200 transition-colors cursor-pointer"
                >
                  هذا الشهر
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset("lastMonth")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md border border-slate-200 transition-colors cursor-pointer"
                >
                  الشهر الماضي
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPreset("all")}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md border border-slate-200 transition-colors cursor-pointer"
                >
                  كامل السجل
                </button>
              </div>
            </div>

            {/* Inputs based on filter mode */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {filterMode === "single" ? (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>حدد اليوم:</span>
                  </label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold font-mono border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                  />
                  {singleDate && (
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      يوم {getArabicDayName(singleDate)}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <CalendarRange className="w-3.5 h-3.5 text-indigo-600" />
                      <span>من تاريخ:</span>
                    </label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold font-mono border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <span>إلى تاريخ:</span>
                    </label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="px-3 py-1.5 text-xs font-bold font-mono border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-xs"
                    />
                  </div>
                </div>
              )}

              {/* Toggle to hide zero days */}
              <label className="mr-auto flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={onlyWithDeliveries}
                  onChange={(e) => setOnlyWithDeliveries(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                />
                <span>إظهار الأيام التي بها توصيل فقط</span>
              </label>
            </div>
          </div>

          {/* Quick Aggregate Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-indigo-600" />
                إجمالي عدد التوصيل:
              </span>
              <div className="text-xl font-black font-mono text-indigo-700">
                {totals.totalCount}{" "}
                <span className="text-xs font-bold text-slate-500">طلب</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                إجمالي مبلغ التوصيل:
              </span>
              <div className="text-xl font-black font-mono text-emerald-700">
                {formatCurrency(totals.totalAmount)}{" "}
                <span className="text-xs font-bold text-slate-500">ريال</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-amber-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                متوسط التوصيل اليومي:
              </span>
              <div className="text-xl font-black font-mono text-amber-700">
                {totals.averagePerDay.toFixed(1)}{" "}
                <span className="text-xs font-bold text-slate-500">طلب/يوم</span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 block mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                عدد الأيام المشمولة:
              </span>
              <div className="text-xl font-black font-mono text-slate-800">
                {totals.totalDays}{" "}
                <span className="text-xs font-bold text-slate-500">
                  (نشط: {totals.daysWithDelivery})
                </span>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-3">اليوم</th>
                    <th className="py-2.5 px-3 font-mono">التاريخ</th>
                    <th className="py-2.5 px-3 text-center">عدد التوصيل</th>
                    <th className="py-2.5 px-3 text-center">سعر الطلب</th>
                    <th className="py-2.5 px-3 text-left font-mono">إجمالي المبلغ (ريال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">
                        لا توجد سجلات توصيل مطابقة للفترة المحددة
                      </td>
                    </tr>
                  ) : (
                    deliveryData.map((item, idx) => (
                      <tr 
                        key={item.date}
                        className={`hover:bg-indigo-50/40 transition-colors ${
                          item.isCurrentEditingDay ? "bg-amber-50/60 font-bold" : (idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {item.dayName}
                          {item.isCurrentEditingDay && (
                            <span className="mr-1.5 text-[9px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-bold">
                              اليوم المفتوح حالياً
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600 text-xs">
                          {item.date}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block font-mono font-bold px-2 py-0.5 rounded ${
                            item.count > 0 
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-150" 
                              : "text-slate-400"
                          }`}>
                            {item.count}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600 text-xs">
                          {item.rate} ر
                        </td>
                        <td className="py-2 px-3 text-left font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {/* Total Row */}
                <tfoot className="bg-slate-900 text-white font-bold text-xs sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-4 text-amber-400">
                      الإجمالي الكلي للفترة المحددة:
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-amber-300 text-sm">
                      {totals.totalCount} طلب
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400 text-[11px]">
                      -
                    </td>
                    <td className="py-2.5 px-4 text-left font-mono text-amber-300 text-sm">
                      {formatCurrency(totals.totalAmount)} ريال
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* A4 Print Preview Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-start p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          {/* Top Control Bar (Hidden when printing) */}
          <div className="no-print w-full max-w-4xl bg-slate-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between mb-4 border border-slate-700">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-bold">معاينة ورقة الطباعة الرسمية A4 - كشف التوصيل</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة المستند الآن (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="إغلاق المعاينة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Printable A4 Container */}
          <div 
            id="a4-delivery-report"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-900 p-8 sm:p-12 rounded-lg shadow-2xl border border-slate-300 flex flex-col justify-between"
            dir="rtl"
          >
            <div>
              {/* Report Header */}
              <div className="border-b-2 border-slate-900 pb-5 mb-6">
                <div className="flex items-center justify-between">
                  {/* Right Header Info */}
                  <div className="space-y-1">
                    <h1 className="text-xl font-black text-slate-900">مطعم أصل الاسكندر</h1>
                    <p className="text-xs font-bold text-slate-600">إدارة الحسابات والشؤون المالية</p>
                    <div className="inline-block bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-black px-2.5 py-0.5 rounded mt-1">
                      فرع القادسية
                    </div>
                  </div>

                  {/* Logo Center */}
                  <div className="flex flex-col items-center">
                    <AslIskanderLogoSymbol size={64} />
                    <span className="text-[10px] font-black tracking-widest text-slate-800 mt-1 uppercase">ASL ISKANDER</span>
                  </div>

                  {/* Left Header Info */}
                  <div className="text-left text-xs space-y-1 font-mono">
                    <div className="font-bold text-slate-700">
                      التاريخ: <span className="font-normal text-slate-900">{todayStr}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      الوقت: {new Date().toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      الجهة المصدرة: المدير العام
                    </div>
                  </div>
                </div>

                {/* Report Title Badge */}
                <div className="mt-5 text-center bg-slate-900 text-white py-2 rounded-lg shadow-xs">
                  <h2 className="text-base font-black tracking-wide">
                    كشف ومطابقة طلبات التوصيل
                  </h2>
                  <p className="text-[11px] text-amber-300 font-bold mt-0.5">
                    {filterMode === "single" ? (
                      <span>ليوم {getArabicDayName(singleDate)} الموافق {singleDate}</span>
                    ) : (
                      <span>الفترة الزمنية المحددة: من تاريخ ({fromDate}) إلى تاريخ ({toDate})</span>
                    )}
                  </p>
                </div>
              </div>

              {/* KPI Summary Row */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="border border-slate-300 bg-slate-50/60 p-3 rounded-lg text-center">
                  <span className="text-[11px] font-bold text-slate-500 block">إجمالي عدد الطلبات المنفذة</span>
                  <span className="text-lg font-black font-mono text-slate-900 mt-1 block">
                    {totals.totalCount} <span className="text-xs font-bold text-slate-600">طلب</span>
                  </span>
                </div>
                <div className="border border-slate-300 bg-slate-50/60 p-3 rounded-lg text-center">
                  <span className="text-[11px] font-bold text-slate-500 block">سعر التوصيل للطلب</span>
                  <span className="text-lg font-black font-mono text-slate-900 mt-1 block">
                    6.00 <span className="text-xs font-bold text-slate-600">ريال</span>
                  </span>
                </div>
                <div className="border-2 border-slate-900 bg-slate-100 p-3 rounded-lg text-center">
                  <span className="text-[11px] font-black text-slate-700 block">إجمالي المبالغ المستحقة</span>
                  <span className="text-xl font-black font-mono text-slate-900 mt-0.5 block">
                    {formatCurrency(totals.totalAmount)} <span className="text-xs font-bold">ريال</span>
                  </span>
                </div>
              </div>

              {/* A4 Detailed Data Table */}
              <div className="mb-6 overflow-hidden rounded border border-slate-300">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold border-b border-slate-800">
                      <th className="py-2 px-2 text-center w-10 border-l border-slate-700">م</th>
                      <th className="py-2 px-3 border-l border-slate-700">اليوم</th>
                      <th className="py-2 px-3 font-mono border-l border-slate-700">التاريخ</th>
                      <th className="py-2 px-3 text-center border-l border-slate-700">عدد التوصيل</th>
                      <th className="py-2 px-3 text-center border-l border-slate-700">قيمة التوصيل للطلب</th>
                      <th className="py-2 px-3 text-left font-mono border-l border-slate-700">المبلغ الإجمالي</th>
                      <th className="py-2 px-3 text-center">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {deliveryData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-400 font-bold">
                          لا توجد بيانات مسجلة في هذه الفترة
                        </td>
                      </tr>
                    ) : (
                      deliveryData.map((row, i) => (
                        <tr key={row.date} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="py-1.5 px-2 text-center font-mono text-[11px] text-slate-500 border-l border-slate-200">
                            {i + 1}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-slate-900 border-l border-slate-200">
                            {row.dayName}
                          </td>
                          <td className="py-1.5 px-3 font-mono text-slate-700 border-l border-slate-200">
                            {row.date}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono font-bold text-slate-900 border-l border-slate-200">
                            {row.count}
                          </td>
                          <td className="py-1.5 px-3 text-center font-mono text-slate-600 border-l border-slate-200">
                            {row.rate.toFixed(2)} ر
                          </td>
                          <td className="py-1.5 px-3 text-left font-mono font-bold text-slate-900 border-l border-slate-200">
                            {formatCurrency(row.amount)} ر
                          </td>
                          <td className="py-1.5 px-3 text-center text-[10px] text-slate-400">
                            {row.isCurrentEditingDay ? "مفتوح بالنموذج" : "معتمد"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Table Total Row */}
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-900">
                      <td colSpan={3} className="py-2.5 px-3 text-amber-300 text-xs">
                        الإجمالي العام للفترة:
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-amber-300 text-sm">
                        {totals.totalCount}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-400 text-xs">
                        -
                      </td>
                      <td className="py-2.5 px-3 text-left font-mono text-amber-300 text-sm">
                        {formatCurrency(totals.totalAmount)} ريال
                      </td>
                      <td className="py-2.5 px-3 text-center text-[10px] text-slate-300">
                        سجل رسمي
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount In Words (Tafqeet) */}
              <div className="bg-slate-50 border border-slate-300 p-2.5 rounded text-xs font-bold text-slate-700 mb-6 flex items-center justify-between">
                <span>المبلغ الكلي المستحق رقماً:</span>
                <span className="font-mono text-slate-950 font-black text-sm">{formatCurrency(totals.totalAmount)} ريال سعودي فقط لا غير.</span>
              </div>
            </div>

            {/* Official Signatures & Seal Section */}
            <div className="pt-6 border-t-2 border-slate-800 mt-auto">
              <div className="grid grid-cols-3 gap-6 text-center text-xs">
                <div className="space-y-12">
                  <div className="font-bold text-slate-700">المحاسب المسؤول</div>
                  <div className="text-slate-400 font-mono text-[11px]">......................................</div>
                </div>

                <div className="space-y-2 flex flex-col items-center justify-center">
                  <div className="font-bold text-slate-700">الختم الرسمي</div>
                  <div className="w-24 h-16 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center text-[10px] text-slate-400 font-bold">
                    ختم المطعم
                  </div>
                </div>

                <div className="space-y-12">
                  <div className="font-black text-slate-900">اعتماد المدير العام</div>
                  <div className="text-slate-400 font-mono text-[11px]">......................................</div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 mt-6 font-mono border-t border-slate-200 pt-2">
                نظام أصل الاسكندر المحاسبي الموحد • تم طباعة هذا الكشف بصيغة رسمية A4 • فرع القادسية
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
