import React, { useState, useEffect } from "react";
import { InstallmentInvoice } from "../types";
import { 
  Clock, CheckCircle2, AlertCircle, ChevronDown, ChevronUp, 
  Calendar, Layers, Filter, RefreshCw, User, FileText, ArrowRight
} from "lucide-react";

interface InstallmentInvoicesQueueViewProps {
  branch: "القادسية" | "المروج";
  userRole: string;
  selectedCategory?: "pepsi" | "plastic" | "sauces" | "diesel";
  compact?: boolean;
}

const CATEGORY_NAMES: Record<string, { name: string; color: string; bg: string; border: string }> = {
  pepsi: { 
    name: "بيبسي ومشروبات", 
    color: "text-blue-700", 
    bg: "bg-blue-50", 
    border: "border-blue-200" 
  },
  plastic: { 
    name: "صقر للتغليف", 
    color: "text-rose-700", 
    bg: "bg-rose-50", 
    border: "border-rose-200" 
  },
  sauces: { 
    name: "الصلصات والمواد الأولية", 
    color: "text-amber-700", 
    bg: "bg-amber-50", 
    border: "border-amber-200" 
  },
  diesel: { 
    name: "الديزل", 
    color: "text-slate-700", 
    bg: "bg-slate-100", 
    border: "border-slate-300" 
  }
};

export default function InstallmentInvoicesQueueView({
  branch,
  userRole,
  selectedCategory,
  compact = false
}: InstallmentInvoicesQueueViewProps) {
  // Visible ONLY to the manager
  if (userRole !== "مدير") {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [invoices, setInvoices] = useState<InstallmentInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>(selectedCategory || "all");
  const [timeFilter, setTimeFilter] = useState<"40days" | "all">("40days");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "queued" | "completed">("all");

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const daysQuery = timeFilter === "40days" ? 40 : 365;
      const res = await fetch(`/api/installment-invoices?branch=${encodeURIComponent(branch)}&days=${daysQuery}&all=${timeFilter === "all"}`);
      if (res.ok) {
        const data: InstallmentInvoice[] = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error("Failed to load installment invoices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [branch, timeFilter]);

  // Keep category filter in sync if passed from parent
  useEffect(() => {
    if (selectedCategory) {
      setActiveCategoryFilter(selectedCategory);
    }
  }, [selectedCategory]);

  const filteredInvoices = invoices.filter((inv) => {
    if (activeCategoryFilter !== "all" && inv.category !== activeCategoryFilter) {
      return false;
    }
    if (statusFilter !== "all" && inv.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const activeCount = invoices.filter(i => i.status === "active").length;
  const queuedCount = invoices.filter(i => i.status === "queued").length;
  const completedCount = invoices.filter(i => i.status === "completed").length;

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return "غير محدد";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className={`my-4 bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden transition-all ${compact ? "p-3" : "p-4"}`}>
      {/* Header Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between cursor-pointer select-none py-1 hover:opacity-90 transition-opacity"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-sm text-slate-800">
                قائمة وجدول فواتير الأقساط (حساب المدير)
              </h4>
              <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                {timeFilter === "40days" ? "آخر شهر و10 أيام" : "كل الفواتير"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              متابعة تسلسل وطابور الفواتير المدخلة من المحاسب الثاني وتواريخ الانتهاء من السداد
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold">
            {activeCount > 0 && (
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                نشط ({activeCount})
              </span>
            )}
            {queuedCount > 0 && (
              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                بالانتظار ({queuedCount})
              </span>
            )}
          </div>

          <button
            type="button"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            title={isOpen ? "طي القائمة" : "فتح القائمة"}
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
          {/* Controls Bar: Categories, Time Filter, Status */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter("all")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeCategoryFilter === "all"
                    ? "bg-white text-indigo-700 shadow-sm border border-slate-200 font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                جميع الأقسام ({invoices.length})
              </button>
              {Object.entries(CATEGORY_NAMES).map(([key, cat]) => {
                const count = invoices.filter(i => i.category === key).length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveCategoryFilter(key)}
                    className={`px-2 py-1 rounded-md transition-all ${
                      activeCategoryFilter === key
                        ? "bg-white text-indigo-700 shadow-sm border border-slate-200 font-extrabold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            {/* Time Filter & Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setTimeFilter("40days")}
                  className={`px-2 py-1 rounded-md transition-all ${
                    timeFilter === "40days" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  آخر شهر و10 أيام (40 يوماً)
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter("all")}
                  className={`px-2 py-1 rounded-md transition-all ${
                    timeFilter === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
                  }`}
                >
                  الكل
                </button>
              </div>

              <button
                type="button"
                onClick={fetchInvoices}
                disabled={loading}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Status Quick Filter Buttons */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">تصفية حسب الحالة:</span>
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                statusFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              الكل ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                statusFilter === "active" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              🟢 قيد السداد النشط ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("queued")}
              className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                statusFilter === "queued" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              ⏳ في الانتظار ({queuedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                statusFilter === "completed" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              ✅ مكتملة ({completedCount})
            </button>
          </div>

          {/* Queue Logic Explainer Banner */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5 text-[11px] text-indigo-900 leading-relaxed flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">نظام طابور الفواتير التتابعي (FIFO):</span> عند إدخال فاتورة جديدة من قِبل المحاسب الثاني لأي قسم وما تزال هناك فاتورة سابقة لم ينتهِ سدادها، تُوضع الفاتورة الجديدة تلقائياً في <span className="font-bold text-amber-700">قائمة الانتظار</span> ولا يتم الخصم منها إلا بعد اكتمال سداد الفاتورة السابقة بالكامل، مع التقيد بالسقف اليومي للفرع.
            </div>
          </div>

          {/* Invoices List */}
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
              جاري تحميل سجل فواتير الأقساط...
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs bg-slate-50/60 rounded-lg border border-dashed border-slate-200">
              لا توجد فواتير أقساط مطابقة للمدة أو القسم المحدد في فرع {branch}.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredInvoices.map((inv) => {
                const catInfo = CATEGORY_NAMES[inv.category] || { 
                  name: inv.category, 
                  color: "text-slate-700", 
                  bg: "bg-slate-50", 
                  border: "border-slate-200" 
                };

                const pct = inv.originalAmount > 0 
                  ? Math.min(100, Math.round((inv.paidAmount / inv.originalAmount) * 100)) 
                  : 0;

                return (
                  <div 
                    key={inv.id}
                    className="p-3 bg-white rounded-lg border border-slate-200/90 hover:border-indigo-300 transition-all shadow-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${catInfo.bg} ${catInfo.color} ${catInfo.border}`}>
                          {catInfo.name}
                        </span>

                        {inv.status === "active" && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            جاري الخصم النشط لليوم
                          </span>
                        )}
                        {inv.status === "queued" && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            في الانتظار (بعد انتهاء السابقة)
                          </span>
                        )}
                        {inv.status === "completed" && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            مسددة بالكامل
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono">
                        <div>
                          <span className="text-slate-400 ml-1">قيمة الفاتورة:</span>
                          <span className="font-extrabold text-slate-800">{inv.originalAmount.toFixed(2)} ر</span>
                        </div>
                        <div>
                          <span className="text-slate-400 ml-1">المتبقي:</span>
                          <span className={`font-extrabold ${inv.remainingAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {inv.remainingAmount.toFixed(2)} ر
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-2.5">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          inv.status === "completed" 
                            ? "bg-emerald-500" 
                            : inv.status === "active" 
                            ? "bg-indigo-600" 
                            : "bg-amber-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Meta Info Grid: Dates, Entered By, Completion */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-600 bg-slate-50/60 p-2 rounded-md">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>تاريخ الفاتورة:</span>
                        <span className="font-bold text-slate-800 font-mono">{inv.date}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>أُدخلت في:</span>
                        <span className="font-bold text-slate-700">{formatDateTime(inv.enteredAt)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>بواسطة:</span>
                        <span className="font-bold text-slate-700">{inv.enteredBy || "محاسب ثان"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {inv.status === "completed" ? "تاريخ الانتهاء الفعلي:" : "الانتهاء المتوقع:"}
                        </span>
                        <span className="font-extrabold text-indigo-700 font-mono">
                          {inv.completedDate || inv.estimatedCompletionDate || "قيد الجدولة"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
