import React, { useState, useEffect, useRef } from "react";
import { InstallmentInvoice } from "../types";
import { 
  Clock, CheckCircle2, AlertCircle, ChevronDown, 
  Calendar, RefreshCw, User, FileText, X, History,
  Hourglass, AlertTriangle, ArrowDownRight, Layers
} from "lucide-react";

interface CategoryInstallmentInvoicesDropdownProps {
  branch: "القادسية" | "المروج";
  category: "pepsi" | "plastic" | "sauces" | "diesel";
  categoryName: string;
  userRole?: string;
}

export default function CategoryInstallmentInvoicesDropdown({
  branch,
  category,
  categoryName,
  userRole
}: CategoryInstallmentInvoicesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [invoices, setInvoices] = useState<InstallmentInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "queued" | "completed" | "delayed">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/installment-invoices?branch=${encodeURIComponent(branch)}&category=${encodeURIComponent(category)}&limit=30`
      );
      if (res.ok) {
        const data: InstallmentInvoice[] = await res.json();
        setInvoices(data);
      }
    } catch (err) {
      console.error(`Failed to load ${category} invoices:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen, branch, category]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "delayed") return !!inv.wasDelayed;
    return inv.status === statusFilter;
  });

  const activeCount = invoices.filter(i => i.status === "active").length;
  const queuedCount = invoices.filter(i => i.status === "queued").length;
  const completedCount = invoices.filter(i => i.status === "completed").length;
  const delayedCount = invoices.filter(i => i.wasDelayed).length;

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
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button beside "فاتورة جديدة" */}
      <button
        type="button"
        id={`btn-invoices-history-${category}`}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all shadow-xs ${
          isOpen
            ? "bg-indigo-700 text-white border-indigo-800 ring-2 ring-indigo-200"
            : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50/80 hover:border-indigo-300"
        }`}
        title={`عرض آخر 30 فاتورة لقسم ${categoryName}`}
      >
        <History className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap">آخر 30 فاتورة</span>
        {invoices.length > 0 && (
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
            isOpen ? "bg-indigo-900 text-indigo-100" : "bg-indigo-100 text-indigo-800"
          }`}>
            {invoices.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && (
        <div 
          className="absolute z-50 left-0 sm:right-0 sm:left-auto mt-2 w-[340px] sm:w-[480px] md:w-[560px] bg-white rounded-2xl shadow-2xl border border-indigo-100 p-3.5 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[85vh] flex flex-col text-right"
          style={{ direction: "rtl" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="font-extrabold text-xs text-slate-800">
                    آخر 30 فاتورة - {categoryName}
                  </h4>
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold border border-indigo-100">
                    فرع {branch}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  تاريخ الإدخال، انتهاء الأقساط، وبيان التأخير لوجود فواتير سابقة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchInvoices}
                disabled={loading}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex flex-wrap items-center gap-1 py-2 border-b border-slate-100 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2 py-0.5 rounded-md transition-all ${
                statusFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              الكل ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-2 py-0.5 rounded-md transition-all ${
                statusFilter === "active" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              🟢 نشطة ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("queued")}
              className={`px-2 py-0.5 rounded-md transition-all ${
                statusFilter === "queued" ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              ⏳ بالانتظار ({queuedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("completed")}
              className={`px-2 py-0.5 rounded-md transition-all ${
                statusFilter === "completed" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
            >
              ✅ مسددة ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("delayed")}
              className={`px-2 py-0.5 rounded-md transition-all ${
                statusFilter === "delayed" ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              ⚠️ تأخر بدؤها ({delayedCount})
            </button>
          </div>

          {/* Invoices Scroll Area */}
          <div className="overflow-y-auto flex-1 space-y-2.5 pt-2 pr-0.5 pl-0.5">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                جاري جلب الفواتير...
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                لا توجد فواتير مسجلة مطابقة في قسم {categoryName}.
              </div>
            ) : (
              filteredInvoices.map((inv, idx) => {
                const pct = inv.originalAmount > 0 
                  ? Math.min(100, Math.round((inv.paidAmount / inv.originalAmount) * 100)) 
                  : 0;

                return (
                  <div
                    key={inv.id || idx}
                    className="p-3 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all shadow-xs"
                  >
                    {/* Top Row: Status, Amounts */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          #{filteredInvoices.length - idx}
                        </span>

                        {inv.status === "active" && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            جاري السداد والخصم
                          </span>
                        )}
                        {inv.status === "queued" && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <Hourglass className="w-3 h-3" />
                            في قائمة الانتظار
                          </span>
                        )}
                        {inv.status === "completed" && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            مسددة بالكامل
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400 text-[10px] ml-1">القيمة:</span>
                          <span className="font-extrabold text-slate-800">{inv.originalAmount.toFixed(2)} ر</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] ml-1">المتبقي:</span>
                          <span className={`font-extrabold ${inv.remainingAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {inv.remainingAmount.toFixed(2)} ر
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mb-2">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          inv.status === "completed" 
                            ? "bg-emerald-500" 
                            : inv.status === "active" 
                            ? "bg-indigo-600" 
                            : "bg-amber-400"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    {/* Meta Info Grid: Dates & Timestamps */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-slate-600 bg-white p-2 rounded-lg border border-slate-150 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-slate-500">تاريخ الفاتورة:</span>
                        <span className="font-bold text-slate-800 font-mono">{inv.date}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-slate-500">أُدخلت في:</span>
                        <span className="font-bold text-slate-700">{formatDateTime(inv.enteredAt)}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-slate-500">بواسطة:</span>
                        <span className="font-bold text-slate-700">{inv.enteredBy || "محاسب ثان"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-slate-500">
                          {inv.status === "completed" ? "تاريخ الانتهاء الفعلي:" : "الانتهاء المتوقع:"}
                        </span>
                        <span className="font-extrabold text-indigo-700 font-mono">
                          {inv.completedDate || inv.estimatedCompletionDate || "قيد الجدولة"}
                        </span>
                      </div>
                    </div>

                    {/* KEY USER REQUIREMENT: هل تم تأخير بدأها لوجود فاتورة سابقة؟ */}
                    <div className={`p-2 rounded-lg text-[10px] flex items-start gap-1.5 leading-relaxed ${
                      inv.wasDelayed 
                        ? "bg-amber-50/90 text-amber-900 border border-amber-200" 
                        : "bg-emerald-50/70 text-emerald-900 border border-emerald-200"
                    }`}>
                      {inv.wasDelayed ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-extrabold">
                          {inv.wasDelayed ? "تأخير البدء لوجود فاتورة سابقة:" : "بدء السداد المالي:"}{" "}
                        </span>
                        <span>
                          {inv.delayReason || (
                            inv.wasDelayed 
                              ? "نعم، تم تأخير البدء لعدم انتهاء أقساط الفاتورة السابقة." 
                              : "لا، بدأ سداد الأقساط مباشرة من تاريخ الفاتورة."
                          )}
                        </span>
                        {inv.actualStartDate && inv.actualStartDate !== inv.date && (
                          <div className="font-mono text-[9px] text-amber-800 font-bold mt-0.5">
                            (تاريخ بدء الخصم الفعلي: {inv.actualStartDate})
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Note */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span>نظام الأقساط التتابعي (FIFO) المقيد بالسقف اليومي للفرع</span>
            <span className="font-mono font-bold text-indigo-600">فرع {branch}</span>
          </div>
        </div>
      )}
    </div>
  );
}
