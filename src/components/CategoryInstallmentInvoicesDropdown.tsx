import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { InstallmentInvoice } from "../types";
import { 
  Clock, CheckCircle2, ChevronDown, 
  Calendar, RefreshCw, User, FileText, X, History,
  Hourglass, AlertTriangle, Maximize2, Minimize2, Table, LayoutGrid,
  Check, Info, ChevronUp, AlertCircle, Plus, Edit3, Trash2, Save, RotateCcw, ShieldCheck
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
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [invoices, setInvoices] = useState<InstallmentInvoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "queued" | "completed" | "delayed">("all");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Manager-specific state for adding new invoices
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBranch, setNewBranch] = useState<"القادسية" | "المروج">(branch);
  const [newDate, setNewDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [newAmount, setNewAmount] = useState<number | "">("");
  const [newNotes, setNewNotes] = useState<string>("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);

  // Inline editing state
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>("");
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Feedback notification
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmount || Number(newAmount) <= 0) {
      setFeedback({ type: "error", msg: "يرجى كتابة مبلغ صحيح للفاتورة" });
      return;
    }
    setIsSubmittingNew(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/installment-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          branch: newBranch,
          date: newDate,
          originalAmount: Number(newAmount),
          enteredBy: "المدير العام",
          notes: newNotes.trim()
        })
      });
      if (res.ok) {
        setFeedback({ type: "success", msg: "✅ تم إدراج الفاتورة وحفظها بالمنظومة وإعادة جدولة الأقساط للأيام القادمة بنجاح!" });
        setNewAmount("");
        setNewNotes("");
        setShowAddForm(false);
        await fetchInvoices();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: "error", msg: err.error || "فشل في حفظ الفاتورة" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", msg: err?.message || "حدث خطأ في الاتصال بالخادم" });
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const handleStartEdit = (inv: InstallmentInvoice) => {
    setEditingInvoiceId(inv.id);
    setEditDate(inv.date);
    setEditAmount(inv.originalAmount);
    setEditNotes(inv.notes || "");
    setFeedback(null);
  };

  const handleSaveEdit = async (invId: string) => {
    if (!editAmount || Number(editAmount) <= 0) {
      setFeedback({ type: "error", msg: "يرجى كتابة مبلغ صحيح للفاتورة" });
      return;
    }
    setIsSavingEdit(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/installment-invoices/${invId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          branch,
          date: editDate,
          originalAmount: Number(editAmount),
          enteredBy: "المدير العام",
          notes: editNotes.trim()
        })
      });
      if (res.ok) {
        setFeedback({ type: "success", msg: "✅ تم تحديث بيانات الفاتورة وإعادة جدولة الأقساط بنجاح!" });
        setEditingInvoiceId(null);
        await fetchInvoices();
      } else {
        const err = await res.json().catch(() => ({}));
        setFeedback({ type: "error", msg: err.error || "فشل في تحديث الفاتورة" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", msg: err?.message || "حدث خطأ في الاتصال بالخادم" });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteInvoice = async (inv: InstallmentInvoice) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك كمدير عام في حذف فاتورة بقيمة ${inv.originalAmount} ر بتاريخ ${inv.date}؟\nسيتم إعادة جدولة الأقساط فوراً للأيام التالية.`)) {
      return;
    }
    setFeedback(null);
    try {
      const res = await fetch(`/api/installment-invoices/${inv.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setFeedback({ type: "success", msg: "✅ تم حذف الفاتورة وإعادة جدولة الأقساط بنجاح!" });
        await fetchInvoices();
      } else {
        setFeedback({ type: "error", msg: "فشل حذف الفاتورة" });
      }
    } catch (err: any) {
      setFeedback({ type: "error", msg: err?.message || "حدث خطأ في الاتصال بالخادم" });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvoices();
    }
  }, [isOpen, branch, category]);

  // Lock scroll and handle Escape key for centered modal
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "delayed") return !!inv.wasDelayed;
    return inv.status === statusFilter;
  });

  // Calculate KPIs
  const totalInvoicesCount = invoices.length;
  const activeCount = invoices.filter(i => i.status === "active").length;
  const queuedCount = invoices.filter(i => i.status === "queued").length;
  const completedCount = invoices.filter(i => i.status === "completed").length;
  const delayedCount = invoices.filter(i => i.wasDelayed).length;

  const totalSum = invoices.reduce((sum, i) => sum + (i.originalAmount || 0), 0);
  const paidSum = invoices.reduce((sum, i) => sum + (i.paidAmount || 0), 0);
  const remainingSum = invoices.reduce((sum, i) => sum + (i.remainingAmount || 0), 0);

  const formatDateTime = (isoStr?: string) => {
    if (!isoStr) return "غير محدد";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  // Calculate day difference between two YYYY-MM-DD dates
  const getDaysDiff = (start?: string | null, end?: string | null) => {
    if (!start || !end) return null;
    try {
      const d1 = new Date(start).getTime();
      const d2 = new Date(end).getTime();
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      return diff >= 0 ? diff + 1 : 0; // inclusive of start day
    } catch {
      return null;
    }
  };

  // Helper for entry status
  const getEntryState = (inv: InstallmentInvoice) => {
    const isQueuedAtEntry = inv.wasDelayed || (inv.actualStartDate && inv.actualStartDate > inv.date);
    if (isQueuedAtEntry) {
      return {
        label: "على الدور",
        badge: "bg-amber-100 text-amber-900 border-amber-300",
        icon: Hourglass,
        desc: "دخلت أثناء سريان تقسيط فاتورة سابقة"
      };
    }
    return {
      label: "نشطة مباشرة",
      badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
      icon: CheckCircle2,
      desc: "بدأ السداد فوراً لعدم وجود فواتير سابقة"
    };
  };

  return (
    <div className="relative inline-block">
      {/* Trigger Button */}
      <button
        type="button"
        id={`btn-invoices-history-${category}`}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all shadow-2xs cursor-pointer ${
          isOpen
            ? "bg-indigo-700 text-white border-indigo-800 ring-2 ring-indigo-200"
            : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50/90 hover:border-indigo-300"
        }`}
        title={`عرض جدول وتفاصيل آخر 30 فاتورة لقسم ${categoryName}`}
      >
        <History className="w-3.5 h-3.5 shrink-0" />
        <span className="whitespace-nowrap">آخر 30 فاتورة</span>
        {invoices.length > 0 && (
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
            isOpen ? "bg-indigo-900 text-indigo-100" : "bg-indigo-100 text-indigo-800"
          }`}>
            {invoices.length}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Centered Modal: Rendered via Portal directly into document.body to ensure it displays right in front of user and is never cut off by parent containers or motion divs */}
      {isOpen && typeof document !== "undefined" && createPortal(
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-5 md:p-8 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div 
            ref={modalRef}
            className={`bg-white rounded-2xl shadow-2xl border border-indigo-200/80 flex flex-col text-right w-full transition-all duration-200 overflow-hidden ${
              isExpanded
                ? "max-w-[98vw] h-[96vh]"
                : "max-w-5xl max-h-[90vh] h-auto"
            }`}
            style={{ direction: "rtl" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-linear-to-r from-indigo-50/50 to-white rounded-t-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <FileText className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-sm text-slate-850">
                      جدول تفنيد آخر 30 فاتورة - {categoryName}
                    </h3>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-extrabold border border-indigo-200">
                      فرع {branch}
                    </span>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                      نظام الأسبقية FIFO
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    تفاصيل تاريخ الإدخال، حالة الدخول (على الدور / نشطة)، بداية ونهاية السداد الفعلي، والمدة المستغرقة
                  </p>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center gap-1">
                {/* View Mode Toggle */}
                <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold mr-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      viewMode === "table" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Table className="w-3 h-3" />
                    <span>جدول منظم</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("cards")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                      viewMode === "cards" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <LayoutGrid className="w-3 h-3" />
                    <span>بطاقات</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchInvoices}
                  disabled={loading}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title={isExpanded ? "تصغير النافذة" : "تكبير الشاشة"}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* General Manager Full Control Bar & Form */}
            {userRole === "مدير" && (
              <div className="bg-amber-50/90 border-b border-amber-200/80 p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-amber-200 text-amber-900 rounded-md font-bold text-xs">👑</span>
                    <div>
                      <h4 className="text-xs font-black text-amber-950">صلاحية المدير العام المطلقة في تقسيط وإدراج الفواتير</h4>
                      <p className="text-[10px] text-amber-850">
                        إذا نسي المحاسب إدخال أي فاتورة، يمكنك إضافتها أو تعديلها هنا مباشرة لتُقسّط تلقائياً وتأخذ دورها الطبيعي بنظام الأسبقية FIFO.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(!showAddForm);
                      setFeedback(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer ${
                      showAddForm
                        ? "bg-slate-800 text-white hover:bg-slate-900"
                        : "bg-indigo-700 hover:bg-indigo-800 text-white"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showAddForm ? "إلغاء الإدخال" : "➕ إضافة فاتورة مقسطة جديدة"}</span>
                  </button>
                </div>

                {/* Feedback Notification Banner */}
                {feedback && (
                  <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 ${
                    feedback.type === "success" 
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300" 
                      : "bg-rose-100 text-rose-900 border border-rose-300"
                  }`}>
                    <span>{feedback.msg}</span>
                    <button 
                      type="button" 
                      onClick={() => setFeedback(null)} 
                      className="text-slate-500 hover:text-slate-800 font-bold text-sm px-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Collapsible Add Invoice Form */}
                {showAddForm && (
                  <form onSubmit={handleCreateInvoice} className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                      <span className="font-extrabold text-xs text-indigo-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        إدراج فاتورة جديدة لقسم: {categoryName}
                      </span>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">
                        تُقسّط تلقائياً حسب إعدادات الفرع
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-[11px]">
                      {/* Branch Selection */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">الفرع:</label>
                        <select
                          value={newBranch}
                          onChange={(e) => setNewBranch(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-bold text-slate-850 text-xs focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="القادسية">فرع القادسية</option>
                          <option value="المروج">فرع المروج</option>
                        </select>
                      </div>

                      {/* Invoice Date */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">تاريخ الفاتورة:</label>
                        <input
                          type="date"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-bold text-slate-850 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      {/* Original Amount */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">قيمة الفاتورة الأصلية (ر.س):</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="مثال: 3500"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-xs font-mono focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>

                      {/* Notes / Invoice Ref */}
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">ملاحظات / رقم الفاتورة:</label>
                        <input
                          type="text"
                          placeholder="رقم الفاتورة أو المورد (اختياري)"
                          value={newNotes}
                          onChange={(e) => setNewNotes(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingNew}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSubmittingNew ? "جاري الحفظ والجدولة..." : "💾 حفظ الفاتورة وإدراجها بنظام الأقساط"}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* KPI Summary Banner (ملونة ومنظمة) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50/90 border-b border-slate-150 text-[10px]">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-slate-500 font-bold flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  إجمالي الفواتير
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs font-black text-slate-800 font-mono">{totalSum.toFixed(2)} ر</span>
                  <span className="text-[10px] font-bold text-slate-400">{totalInvoicesCount} فاتورة</span>
                </div>
              </div>

              <div className="bg-emerald-50/70 p-2 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                <span className="text-emerald-850 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  مسددة بالكامل
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs font-black text-emerald-800 font-mono">{paidSum.toFixed(2)} ر</span>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                    {completedCount} فاتورة
                  </span>
                </div>
              </div>

              <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-200 shadow-2xs flex flex-col justify-between">
                <span className="text-blue-850 font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  نشطة جارية السداد
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs font-black text-blue-800 font-mono">
                    {invoices.find(i => i.status === "active")?.remainingAmount.toFixed(2) || "0.00"} ر
                  </span>
                  <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded-full">
                    {activeCount} فاتورة
                  </span>
                </div>
              </div>

              <div className="bg-amber-50/70 p-2 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between">
                <span className="text-amber-900 font-bold flex items-center gap-1">
                  <Hourglass className="w-3 h-3 text-amber-600" />
                  على الدور (بالانتظار)
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xs font-black text-amber-900 font-mono">
                    {invoices.filter(i => i.status === "queued").reduce((s, i) => s + i.originalAmount, 0).toFixed(2)} ر
                  </span>
                  <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-full">
                    {queuedCount} فواتير
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Tabs Bar */}
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-150 bg-white text-[10px] font-bold overflow-x-auto gap-2">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === "all" ? "bg-slate-800 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  الكل ({invoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === "active" ? "bg-blue-600 text-white shadow-2xs" : "bg-blue-50 text-blue-800 hover:bg-blue-100"
                  }`}
                >
                  🟢 نشطة ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("queued")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === "queued" ? "bg-amber-600 text-white shadow-2xs" : "bg-amber-50 text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  ⏳ على الدور ({queuedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("completed")}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    statusFilter === "completed" ? "bg-emerald-600 text-white shadow-2xs" : "bg-emerald-50 text-emerald-850 hover:bg-emerald-100"
                  }`}
                >
                  ✅ مسددة بالكامل ({completedCount})
                </button>
                {delayedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter("delayed")}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      statusFilter === "delayed" ? "bg-rose-600 text-white shadow-2xs" : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                    }`}
                  >
                    ⚠️ تأخر بدؤها ({delayedCount})
                  </button>
                )}
              </div>

              {/* Mobile View Toggle */}
              <div className="flex sm:hidden items-center bg-slate-100 p-0.5 rounded-lg text-[9px] font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-2 py-0.5 rounded ${viewMode === "table" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500"}`}
                >
                  جدول
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  className={`px-2 py-0.5 rounded ${viewMode === "cards" ? "bg-white text-indigo-700 shadow-2xs" : "text-slate-500"}`}
                >
                  بطاقات
                </button>
              </div>
            </div>

            {/* Invoices Content Area */}
            <div className="overflow-y-auto flex-1 p-3">
              {loading ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-600" />
                  جاري جلب تفاصيل الفواتير المسجلة...
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  لا توجد فواتير مطابقة لخيارات التصفية الحالية في قسم {categoryName}.
                </div>
              ) : viewMode === "table" ? (
                /* ======================== 1. STRUCTURED COLOR-CODED TABLE ======================== */
                <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-right text-[10px] border-collapse bg-white">
                    <thead>
                      <tr className="sticky top-0 z-10 bg-slate-100 text-slate-800 font-black border-b border-slate-200 shadow-2xs select-none">
                        <th className="py-2.5 px-2 text-center w-8">#</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap">تاريخ الفاتورة</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap">قيمة الفاتورة</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap text-center">حالة الدخول</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap">بداية السداد الفعلي</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap">نهاية السداد</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap text-center">المدة والأيام</th>
                        <th className="py-2.5 px-2.5 whitespace-nowrap text-center">حالة الفاتورة الآن</th>
                        {userRole === "مدير" && (
                          <th className="py-2.5 px-2 text-center whitespace-nowrap bg-amber-50 text-amber-900 border-l border-amber-200">
                            صلاحيات المدير
                          </th>
                        )}
                        <th className="py-2.5 px-2 text-center w-8">تفاصيل</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredInvoices.map((inv, idx) => {
                        const entryState = getEntryState(inv);
                        const isExpandedRow = expandedInvoiceId === inv.id;
                        const pct = inv.originalAmount > 0 
                          ? Math.min(100, Math.round((inv.paidAmount / inv.originalAmount) * 100)) 
                          : 0;

                        // Row background color based on status
                        let rowBgClass = "hover:bg-slate-50/90";
                        if (inv.status === "active") {
                          rowBgClass = "bg-blue-50/30 hover:bg-blue-50/60 border-l-4 border-l-blue-600";
                        } else if (inv.status === "queued") {
                          rowBgClass = "bg-amber-50/20 hover:bg-amber-50/50 border-l-4 border-l-amber-500";
                        } else if (idx % 2 === 1) {
                          rowBgClass = "bg-slate-50/40 hover:bg-slate-100/70";
                        }

                        // Days calculation
                        const daysSpent = inv.status === "completed" 
                          ? getDaysDiff(inv.actualStartDate, inv.completedDate)
                          : null;

                        return (
                          <React.Fragment key={inv.id || idx}>
                            <tr 
                              className={`transition-colors cursor-pointer ${rowBgClass}`}
                              onClick={() => setExpandedInvoiceId(isExpandedRow ? null : inv.id)}
                            >
                              {/* Index */}
                              <td className="py-2 px-2 text-center font-mono font-bold text-slate-400">
                                {filteredInvoices.length - idx}
                              </td>

                              {/* Invoice Date */}
                              <td className="py-2 px-2.5 whitespace-nowrap" onClick={(e) => editingInvoiceId === inv.id && e.stopPropagation()}>
                                {editingInvoiceId === inv.id ? (
                                  <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="bg-white border-2 border-indigo-500 rounded px-1.5 py-0.5 text-xs font-mono font-bold"
                                  />
                                ) : (
                                  <>
                                    <div className="font-extrabold text-slate-850 font-mono flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>{inv.date}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 block font-sans">
                                      {inv.enteredBy || "محاسب ثان"}
                                    </span>
                                  </>
                                )}
                              </td>

                              {/* Invoice Original Amount */}
                              <td className="py-2 px-2.5 whitespace-nowrap" onClick={(e) => editingInvoiceId === inv.id && e.stopPropagation()}>
                                {editingInvoiceId === inv.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      step="any"
                                      value={editAmount}
                                      onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                      className="w-20 bg-white border-2 border-indigo-500 rounded px-1.5 py-0.5 text-xs font-mono font-black"
                                    />
                                    <span className="text-[10px] font-bold text-slate-500">ر</span>
                                  </div>
                                ) : (
                                  <>
                                    <span className="font-black text-slate-850 font-mono text-[11px]">
                                      {inv.originalAmount.toFixed(2)}
                                    </span>
                                    <span className="text-[9px] text-slate-500 mr-1">ر</span>
                                  </>
                                )}
                              </td>

                              {/* Entry Status (نشطة مباشرة أو على الدور) */}
                              <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[9px] border ${entryState.badge}`}>
                                  <entryState.icon className="w-2.5 h-2.5" />
                                  <span>{entryState.label}</span>
                                </span>
                              </td>

                              {/* Actual Start Date */}
                              <td className="py-2 px-2.5 whitespace-nowrap font-mono">
                                {inv.actualStartDate ? (
                                  <div className="flex items-center gap-1 font-bold text-slate-755">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span>{inv.actualStartDate}</span>
                                  </div>
                                ) : inv.status === "queued" ? (
                                  <span className="text-amber-700 font-bold text-[9px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                    بانتظار دورها
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-mono text-[9px]">مع القسط القادم</span>
                                )}
                              </td>

                              {/* Completion Date (Actual vs Expected) */}
                              <td className="py-2 px-2.5 whitespace-nowrap font-mono">
                                {inv.status === "completed" ? (
                                  <div className="font-extrabold text-emerald-800 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{inv.completedDate || inv.estimatedCompletionDate}</span>
                                    <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded font-sans">
                                      فعلي
                                    </span>
                                  </div>
                                ) : (
                                  <div className="font-bold text-indigo-700 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-indigo-400 shrink-0" />
                                    <span>{inv.estimatedCompletionDate || "قيد الجدولة"}</span>
                                    <span className="text-[8px] bg-indigo-50 text-indigo-600 px-1 rounded font-sans">
                                      متوقع
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Duration / Days */}
                              <td className="py-2 px-2.5 text-center whitespace-nowrap font-sans">
                                {inv.status === "completed" ? (
                                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                                    {daysSpent ? `${daysSpent} أيام سداد` : "مكتملة"}
                                  </span>
                                ) : inv.status === "active" ? (
                                  <span className="font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full">
                                    جارية ({pct}%)
                                  </span>
                                ) : (
                                  <span className="font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                                    على الدور
                                  </span>
                                )}
                              </td>

                              {/* Current Invoice Status Badge */}
                              <td className="py-2 px-2.5 text-center whitespace-nowrap">
                                {inv.status === "completed" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>مسددة بالكامل (100%)</span>
                                  </span>
                                )}
                                {inv.status === "active" && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                                    <span>نشطة حالياً ({pct}%)</span>
                                  </span>
                                )}
                                {inv.status === "queued" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                                    <Hourglass className="w-3 h-3 text-amber-700" />
                                    <span>على الدور (بالانتظار)</span>
                                  </span>
                                )}
                              </td>

                              {/* Manager Actions Column */}
                              {userRole === "مدير" && (
                                <td 
                                  className="py-2 px-2 text-center whitespace-nowrap bg-amber-50/50 border-l border-amber-100"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {editingInvoiceId === inv.id ? (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleSaveEdit(inv.id)}
                                        disabled={isSavingEdit}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer"
                                        title="حفظ التعديل"
                                      >
                                        <Save className="w-3 h-3" />
                                        <span>حفظ</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingInvoiceId(null)}
                                        className="px-1.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-bold text-[10px] cursor-pointer"
                                        title="إلغاء التعديل"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleStartEdit(inv)}
                                        className="p-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 shadow-2xs cursor-pointer"
                                        title="تعديل تاريخ أو قيمة الفاتورة كمدير عام"
                                      >
                                        <Edit3 className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteInvoice(inv)}
                                        className="p-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200 shadow-2xs cursor-pointer"
                                        title="حذف الفاتورة كمدير عام وإعادة الجدولة"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              )}

                              {/* Toggle Details Chevron */}
                              <td className="py-2 px-2 text-center text-slate-400 hover:text-indigo-600">
                                {isExpandedRow ? (
                                  <ChevronUp className="w-3.5 h-3.5 mx-auto text-indigo-600" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 mx-auto" />
                                )}
                              </td>
                            </tr>

                            {/* Expanded Detail Accordion Row */}
                            {isExpandedRow && (
                              <tr className="bg-slate-50/90 border-b border-indigo-100">
                                <td colSpan={userRole === "مدير" ? 10 : 9} className="p-3 text-slate-700 text-[10px]">
                                  <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-2 shadow-2xs">
                                    {/* Progress */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center font-mono">
                                        <span className="font-bold text-slate-600">نسبة الإنجاز والسداد:</span>
                                        <div className="space-x-2 space-x-reverse">
                                          <span className="text-emerald-700 font-bold">المسدد: {inv.paidAmount.toFixed(2)} ر</span>
                                          <span className="text-slate-300">|</span>
                                          <span className={`${inv.remainingAmount > 0 ? "text-rose-600 font-bold" : "text-emerald-600"}`}>
                                            المتبقي: {inv.remainingAmount.toFixed(2)} ر
                                          </span>
                                          <span className="font-black text-indigo-700">({pct}%)</span>
                                        </div>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                          className={`h-full transition-all duration-300 ${
                                            inv.status === "completed" 
                                              ? "bg-emerald-500" 
                                              : inv.status === "active" 
                                              ? "bg-blue-600" 
                                              : "bg-amber-400"
                                          }`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Audit Meta Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-slate-600">
                                      <div className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>وقت التسجيل الدقيق:</span>
                                        <span className="font-bold font-mono text-slate-800">{formatDateTime(inv.enteredAt)}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>أُدخلت بواسطة:</span>
                                        <span className="font-bold text-slate-800">{inv.enteredBy || "محاسب ثان"}</span>
                                      </div>
                                      <div className="flex items-center gap-1.5">
                                        <Info className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>معرف الفاتورة:</span>
                                        <span className="font-mono text-slate-500 text-[9px]">{inv.id}</span>
                                      </div>
                                    </div>

                                    {/* Explanation for FIFO Queue & Delay */}
                                    <div className={`p-2 rounded-lg text-[10px] flex items-start gap-1.5 leading-relaxed ${
                                      inv.wasDelayed 
                                        ? "bg-amber-50 text-amber-900 border border-amber-200" 
                                        : "bg-emerald-50 text-emerald-900 border border-emerald-200"
                                    }`}>
                                      {inv.wasDelayed ? (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                      ) : (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                      )}
                                      <div>
                                        <span className="font-black">
                                          {inv.wasDelayed ? "بيان الدخول على الدور وتأخير السداد:" : "بدء السداد المباشر:"}{" "}
                                        </span>
                                        <span>
                                          {inv.delayReason || (
                                            inv.wasDelayed 
                                              ? `دخلت الفاتورة بتاريخ ${inv.date} أثناء وجود رصيد متبقٍ لفاتورة سابقة، فظلت على الدور حتى ${inv.actualStartDate || "اكتمال السابقة"}.` 
                                              : `بدأ السداد المالي فوراً من تاريخ الفاتورة (${inv.date}) بدون أي تأخير لعدم وجود فواتير معلقة.`
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Manager Inline Edit Notes or View Notes */}
                                    {editingInvoiceId === inv.id ? (
                                      <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
                                        <label className="block text-[10px] font-bold text-amber-900">ملاحظات الفاتورة:</label>
                                        <input
                                          type="text"
                                          value={editNotes}
                                          onChange={(e) => setEditNotes(e.target.value)}
                                          className="w-full bg-white border border-amber-300 rounded px-2 py-1 text-xs font-semibold"
                                          placeholder="رقم الفاتورة أو ملاحظات..."
                                        />
                                      </div>
                                    ) : inv.notes ? (
                                      <div className="text-[9px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-200">
                                        <span className="font-bold text-slate-600">ملاحظات:</span> {inv.notes}
                                      </div>
                                    ) : null}

                                    {/* Manager Action Buttons inside accordion */}
                                    {userRole === "مدير" && (
                                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-150">
                                        {editingInvoiceId === inv.id ? (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleSaveEdit(inv.id)}
                                              disabled={isSavingEdit}
                                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                                            >
                                              <Save className="w-3.5 h-3.5" />
                                              <span>حفظ كافة تعديلات الفاتورة</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingInvoiceId(null)}
                                              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                            >
                                              إلغاء التعديل
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleStartEdit(inv)}
                                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-indigo-200 cursor-pointer"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                              <span>تعديل الفاتورة</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteInvoice(inv)}
                                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              <span>حذف الفاتورة</span>
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* ======================== 2. COLOR-CODED CARDS VIEW ======================== */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredInvoices.map((inv, idx) => {
                    const entryState = getEntryState(inv);
                    const pct = inv.originalAmount > 0 
                      ? Math.min(100, Math.round((inv.paidAmount / inv.originalAmount) * 100)) 
                      : 0;
                    const daysSpent = inv.status === "completed" 
                      ? getDaysDiff(inv.actualStartDate, inv.completedDate)
                      : null;

                    return (
                      <div
                        key={inv.id || idx}
                        className={`p-3 rounded-xl border transition-all shadow-2xs space-y-2 text-[10px] ${
                          inv.status === "active" 
                            ? "bg-blue-50/30 border-blue-300 ring-1 ring-blue-200" 
                            : inv.status === "queued"
                            ? "bg-amber-50/30 border-amber-300"
                            : "bg-white border-slate-200 hover:border-indigo-200"
                        }`}
                      >
                        {/* Top Info */}
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              #{filteredInvoices.length - idx}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[9px] border ${entryState.badge}`}>
                              <entryState.icon className="w-2.5 h-2.5" />
                              <span>{entryState.label}</span>
                            </span>
                          </div>

                          {inv.status === "completed" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[9px] bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <Check className="w-2.5 h-2.5 text-emerald-600" />
                              <span>مسددة (100%)</span>
                            </span>
                          )}
                          {inv.status === "active" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[9px] bg-blue-100 text-blue-950 border border-blue-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                              <span>نشطة حالياً</span>
                            </span>
                          )}
                          {inv.status === "queued" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[9px] bg-amber-100 text-amber-950 border border-amber-300">
                              <Hourglass className="w-2.5 h-2.5 text-amber-700" />
                              <span>على الدور</span>
                            </span>
                          )}
                        </div>

                        {/* Amounts Grid */}
                        <div className="grid grid-cols-2 gap-1.5 bg-white p-2 rounded-lg border border-slate-150 font-mono">
                          <div>
                            <span className="text-slate-400 text-[9px] block">قيمة الفاتورة:</span>
                            <span className="font-black text-slate-800 text-xs">{inv.originalAmount.toFixed(2)} ر</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9px] block">المتبقي:</span>
                            <span className={`font-black text-xs ${inv.remainingAmount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
                              {inv.remainingAmount.toFixed(2)} ر
                            </span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              inv.status === "completed" 
                                ? "bg-emerald-500" 
                                : inv.status === "active" 
                                ? "bg-blue-600" 
                                : "bg-amber-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Dates Grid */}
                        <div className="space-y-1 bg-white/80 p-2 rounded-lg border border-slate-150 text-[10px]">
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-slate-400">تاريخ الفاتورة:</span>
                            <span className="font-bold font-mono text-slate-800">{inv.date}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-slate-400">بداية السداد الفعلي:</span>
                            <span className="font-bold font-mono text-slate-800">{inv.actualStartDate || "بانتظار دورها"}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-600">
                            <span className="text-slate-400">
                              {inv.status === "completed" ? "نهاية السداد الفعلي:" : "الانتهاء المتوقع:"}
                            </span>
                            <span className="font-extrabold font-mono text-indigo-700">
                              {inv.completedDate || inv.estimatedCompletionDate || "قيد الجدولة"}
                            </span>
                          </div>
                          {daysSpent && (
                            <div className="flex justify-between items-center text-slate-600 pt-0.5 border-t border-slate-100">
                              <span className="text-slate-400">الأيام المستغرقة:</span>
                              <span className="font-bold text-emerald-700">{daysSpent} أيام سداد</span>
                            </div>
                          )}
                        </div>

                        {/* Reason / Delay alert */}
                        <div className={`p-1.5 rounded-lg text-[9px] leading-relaxed flex items-start gap-1 ${
                          inv.wasDelayed 
                            ? "bg-amber-50 text-amber-900 border border-amber-200" 
                            : "bg-emerald-50 text-emerald-900 border border-emerald-200"
                        }`}>
                          {inv.wasDelayed ? (
                            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                          )}
                          <span>
                            {inv.delayReason || (
                              inv.wasDelayed 
                                ? "دخلت على الدور وتأخر بدؤها لوجود فاتورة سابقة." 
                                : "بدأ سداد الأقساط مباشرة من تاريخ الفاتورة."
                            )}
                          </span>
                        </div>

                        {/* Manager Card Actions & Inline Edit */}
                        {userRole === "مدير" && (
                          <div className="pt-2 border-t border-slate-150 bg-amber-50/50 -mx-3 -mb-3 p-2.5 rounded-b-xl space-y-2">
                            {editingInvoiceId === inv.id ? (
                              <div className="space-y-2 bg-white p-2 rounded-lg border border-amber-300">
                                <div className="flex items-center justify-between text-[10px] font-bold text-amber-900">
                                  <span>تعديل بيانات الفاتورة كمدير عام</span>
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-600">التاريخ:</label>
                                    <input
                                      type="date"
                                      value={editDate}
                                      onChange={(e) => setEditDate(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-600">القيمة الأصلية:</label>
                                    <input
                                      type="number"
                                      step="any"
                                      value={editAmount}
                                      onChange={(e) => setEditAmount(e.target.value === "" ? "" : Number(e.target.value))}
                                      className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono font-black"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[9px] font-bold text-slate-600">الملاحظات:</label>
                                  <input
                                    type="text"
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 text-xs"
                                    placeholder="ملاحظات..."
                                  />
                                </div>
                                <div className="flex items-center justify-end gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingInvoiceId(null)}
                                    className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEdit(inv.id)}
                                    disabled={isSavingEdit}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-black shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    <Save className="w-3 h-3" />
                                    <span>حفظ التعديل</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-amber-900 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3 text-amber-700" />
                                  تحكم المدير العام:
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEdit(inv)}
                                    className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-indigo-200 cursor-pointer"
                                    title="تعديل الفاتورة"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>تعديل</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteInvoice(inv)}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-rose-200 cursor-pointer"
                                    title="حذف الفاتورة"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>حذف</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Summary Bar */}
            <div className="p-3 border-t border-slate-150 bg-slate-50/80 rounded-b-2xl flex flex-wrap items-center justify-between text-[10px] text-slate-600 gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold">نظام الأسبقية الزمني FIFO</span>
                <span className="text-slate-300">•</span>
                <span>المسدد: <b className="text-emerald-700 font-mono">{paidSum.toFixed(2)} ر</b></span>
                <span className="text-slate-300">•</span>
                <span>المتبقي: <b className="text-rose-600 font-mono">{remainingSum.toFixed(2)} ر</b></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-bold text-indigo-700 font-mono">
                  {completedCount} مسددة / {activeCount} نشطة / {queuedCount} على الدور
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-[10px] transition-colors cursor-pointer mr-2 shadow-2xs"
                >
                  إغلاق النافذة
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
