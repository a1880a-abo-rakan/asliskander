import React, { useState, useEffect } from "react";
import { TaxInvoice, TaxInvoiceItem } from "../types";
import { 
  Receipt, 
  Calendar, 
  Plus, 
  Trash, 
  Library, 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  FileText,
  Sparkles,
  UploadCloud,
  Camera,
  Loader2,
  CheckCircle2,
  ArrowDownToLine,
  Edit,
  Pen
} from "lucide-react";

interface TaxTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
  userBranch?: "الكل" | "القادسية" | "المروج";
}

interface InvoiceInput {
  company: string;
  invoice_no: string;
  invoice_date: string;
  amount: number | "";
  items?: TaxInvoiceItem[];
}

export default function TaxTab({ onShowToast, userRole, userBranch }: TaxTabProps) {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [branch, setBranch] = useState<"القادسية" | "المروج">(() => {
    if (userBranch && userBranch !== "الكل") {
      return userBranch as "القادسية" | "المروج";
    }
    return "القادسية";
  });

  useEffect(() => {
    if (userBranch && userBranch !== "الكل") {
      setBranch(userBranch as "القادسية" | "المروج");
    }
  }, [userBranch]);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Invoice edit states for مدیر (Admin)
  const [editModal, setEditModal] = useState<{
    show: boolean;
    invoice: TaxInvoice | null;
  }>({
    show: false,
    invoice: null
  });
  const [editCompany, setEditCompany] = useState("");
  const [editInvoiceNo, setEditInvoiceNo] = useState("");
  const [editInvoiceDate, setEditInvoiceDate] = useState("");
  const [editAmount, setEditAmount] = useState<number | "">("");
  const [editBranch, setEditBranch] = useState<"القادسية" | "المروج">("القادسية");
  const [editDate, setEditDate] = useState("");
  
  // Multiple incoming invoice submissions
  const [rows, setRows] = useState<InvoiceInput[]>([
    { company: "", invoice_no: "", invoice_date: "", amount: "" }
  ]);

  // AI OCR States
  const [ocrLoading, setOcrLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedInvoices, setParsedInvoices] = useState<Array<{
    company: string;
    invoice_no: string;
    invoice_date: string;
    amount: number | "";
    tempId: string;
    success: boolean;
    error?: string;
    rawImage?: string;
    isRetrying?: boolean;
    items?: TaxInvoiceItem[];
  }>>([]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  };

  // Helper to compress images on client-side before sending to server for OCR
  const compressImage = (file: File, maxWidth = 700, maxHeight = 700): Promise<string> => {
    return new Promise((resolve, reject) => {
      // If it's not an image file (e.g. PDF), fall back to standard reader
      if (!file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // fallback to original file if canvas fails
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG format with 0.50 quality for ultra-rapid upload and perfect OCR clarity at tiny file sizes
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.50);
        resolve(compressedBase64);
      };
      img.onerror = (err) => {
        reject(err);
      };
    });
  };

  const processFiles = async (files: File[]) => {
    // Check if any PDF file is over 5MB and warn the user
    const tooLarge = files.some((f) => f.type === "application/pdf" && f.size > 5 * 1024 * 1024);
    if (tooLarge) {
      onShowToast("⚠️ تنبيه: أحد ملفات الـ PDF حجمه كبير، قد يستغرق الرفع والتحليل بعض الوقت الإضافي.");
    }

    setOcrLoading(true);
    try {
      const base64Promises = files.map((file) => compressImage(file));
      const base64Images = await Promise.all(base64Promises);
      
      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          const newParsed = data.results.map((r: any, rIdx: number) => ({
            company: r.company || "",
            invoice_no: r.invoice_no || "",
            invoice_date: r.invoice_date || date,
            amount: r.amount === 0 ? "" : r.amount,
            tempId: r.tempId || `temp-${Date.now()}-${Math.random()}`,
            success: r.success !== false,
            error: r.error,
            rawImage: base64Images[rIdx],
            isRetrying: false,
            items: r.items || []
          }));
          setParsedInvoices((prev) => [...prev, ...newParsed]);
          onShowToast(`✨ تم مسح وقراءة ${newParsed.length} فواتير ضريبية عبر الذكاء الاصطناعي بنجاح!`);
        } else {
          onShowToast("⚠️ حصلت مشكلة أثناء استلام النتيجة من الخادم");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        onShowToast(`❌ فشل قراءة الفاتورة: ${errData.error || "خطأ غير معروف في الخادم"}`);
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء محاولة مسح الفواتير بالذكاء الاصطناعي");
    } finally {
      setOcrLoading(false);
      const fileInput = document.getElementById("ai-invoice-input") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    }
  };

  const retryInvoice = async (idx: number) => {
    const item = parsedInvoices[idx];
    if (!item.rawImage) return;

    const updated = [...parsedInvoices];
    updated[idx] = { 
      ...item, 
      isRetrying: true,
      error: undefined,
      company: "جاري المحاولة...",
    };
    setParsedInvoices(updated);

    try {
      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [item.rawImage] }),
      });

      if (res.ok) {
        const data = await res.json();
        const r = data.results?.[0];
        if (r) {
          const fresh = [...parsedInvoices];
          fresh[idx] = {
            ...item,
            company: r.company || "",
            invoice_no: r.invoice_no || "",
            invoice_date: r.invoice_date || date,
            amount: r.amount === 0 ? "" : r.amount,
            success: r.success !== false,
            error: r.error,
            items: r.items || [],
            isRetrying: false
          };
          setParsedInvoices(fresh);
          if (r.success !== false) {
            onShowToast("✨ تمت إعادة المحاولة والتشخيص بنجاح!");
          } else {
            onShowToast(`⚠️ فشل التحليل: ${r.error || "خطأ في القراءة"}`);
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const fresh = [...parsedInvoices];
        fresh[idx] = {
          ...item,
          success: false,
          error: errData.error || "خطأ غير معروف في الخادم",
          isRetrying: false
        };
        setParsedInvoices(fresh);
        onShowToast(`❌ فشل: ${errData.error || "خطأ في الخادم"}`);
      }
    } catch (err) {
      console.error(err);
      const fresh = [...parsedInvoices];
      fresh[idx] = {
        ...item,
        success: false,
        error: "فشل الاتصال بالشبكة",
        isRetrying: false
      };
      setParsedInvoices(fresh);
      onShowToast("❌ خطأ بالشبكة أثناء المحاولة");
    }
  };

  // Report filters
  const [from, setFrom] = useState(() => new Date().toISOString().split("T")[0]);
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [reportMode, setReportMode] = useState<"day" | "period" | "period_detailed">("day");
  const [reportRawData, setReportRawData] = useState<any>(null);
  const [dailyCashKeyTrigger, setDailyCashKeyTrigger] = useState<number>(0);

  const getDailyCash = (dateStr: string) => {
    if (!isTaxCalculated) return 0;
    const saved = localStorage.getItem(`tax_cash_${branch}_${dateStr}_${dateStr}`);
    if (saved !== null) return parseFloat(saved) || 0;

    // Fallback to period cashInput distributed to days with invoices
    const invoiceDates = filteredInvoices.map((inv) => inv.invoice_date || inv.date);
    const uniqueInvoiceDates = Array.from(new Set(invoiceDates)).filter((d) => d >= from && d <= to);

    if (uniqueInvoiceDates.includes(dateStr)) {
      if (uniqueInvoiceDates.length === 1) {
        return cashInput;
      } else {
        return cashInput / uniqueInvoiceDates.length;
      }
    }
    return 0;
  };

  const getDailyCashDisplayValue = (dateStr: string) => {
    if (!isTaxCalculated) return "";
    const saved = localStorage.getItem(`tax_cash_${branch}_${dateStr}_${dateStr}`);
    if (saved !== null) return saved;

    const invoiceDates = filteredInvoices.map((inv) => inv.invoice_date || inv.date);
    const uniqueInvoiceDates = Array.from(new Set(invoiceDates)).filter((d) => d >= from && d <= to);

    if (uniqueInvoiceDates.includes(dateStr)) {
      if (uniqueInvoiceDates.length === 1) {
        return String(cashInput);
      } else {
        return (cashInput / uniqueInvoiceDates.length).toFixed(2);
      }
    }
    return "";
  };

  const getArabicDayName = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("ar-SA", { weekday: "long" });
    } catch (err) {
      return "";
    }
  };

  const [invoices, setInvoices] = useState<TaxInvoice[]>([]);
  const [stats, setStats] = useState<{ qPos: number; mPos: number; totalPos: number } | null>(null);
  const [cashInput, setCashInput] = useState<number>(0);
  const [tempCashInput, setTempCashInput] = useState<string>("");
  const [isTaxCalculated, setIsTaxCalculated] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedInvoiceIds([]);
  }, [from, to, branch, reportMode]);

  // Dynamic values
  const addRow = () => {
    setRows([...rows, { company: "", invoice_no: "", invoice_date: "", amount: "" }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof InvoiceInput, value: string | number) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value } as InvoiceInput;
    setRows(updated);
  };

  const sumInvoicesInput = rows.reduce((s, r) => s + (parseFloat(r.amount as string) || 0), 0);

  const handleSaveInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    const validInvoices = rows.filter((r) => r.company && (parseFloat(r.amount as string) || 0) > 0);
    if (validInvoices.length === 0) {
      onShowToast("⚠️ يرجى تعبئة مؤسسة واحدة على الأقل وبقيمة أكبر من الصفر");
      return;
    }

    setLoading(true);
    try {
      const payloads = validInvoices.map((v) => ({
        date,
         branch,
        company: v.company,
        invoice_no: v.invoice_no,
        invoice_date: v.invoice_date || date,
        amount: parseFloat(v.amount as string) || 0,
        items: v.items || [],
      }));

      const res = await fetch("/api/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloads),
      });

      if (res.ok) {
        onShowToast(`🧾 تم حفظ ${payloads.length} فواتير ضريبية بنجاح!`);
        setRows([{ company: "", invoice_no: "", invoice_date: "", amount: "" }]);
        // Refresh period report automatically
        loadTaxReport();
      } else {
        onShowToast("❌ فشل حفظ الفواتير");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ شبكة أثناء حفظ الفواتير");
    } finally {
      setLoading(false);
    }
  };

  const loadTaxReport = async () => {
    if (!from || !to) {
      onShowToast("⚠️ يرجى تحديد نطاق التاريخ المطلوب");
      return;
    }
    setLoading(true);
    try {
      // 1. Get tax invoices in range
      const resInvs = await fetch(`/api/tax-invoices?from=${from}&to=${to}`);
      const invData = await resInvs.ok ? await resInvs.json() : [];
      setInvoices(invData);

      // 2. Get branch POS revenue in range from reports API
      const resReport = await fetch(`/api/reports?from=${from}&to=${to}`);
      if (resReport.ok) {
        const rep = await resReport.json();
        setReportRawData(rep);
        const qPos = rep.qStats.pos || 0;
        const mPos = rep.mStats.pos || 0;
        setStats({
          qPos,
          mPos,
          totalPos: qPos + mPos
        });
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ فشل تحميل بيانات التقرير الضريبي");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateTax = () => {
    const cashVal = parseFloat(tempCashInput) || 0;
    setCashInput(cashVal);
    setIsTaxCalculated(true);
    
    // Save to localStorage so it stays verified on refresh
    const savedCashKey = `tax_cash_${branch}_${from}_${to}`;
    localStorage.setItem(savedCashKey, tempCashInput);
    onShowToast("💾 تم اعتماد دخل الكاش، وحساب الضريبة للفترة بنجاح!");
  };

  const deleteInvoice = (id: string) => {
    if (userRole !== "مدير") {
      onShowToast("⚠️ صلاحيات المدير فقط لطلب الحذف!");
      return;
    }
    setConfirmModal({
      show: true,
      title: "تأكيد حذف الفاتورة الضريبية",
      message: "هل أنت متأكد من رغبتك في حذف هذه الفاتورة الضريبية نهائياً من سجلات الفترة؟",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tax-invoices/${encodeURIComponent(id)}`, { method: "DELETE" });
          if (res.ok) {
            onShowToast("✅ تم حذف الفاتورة الضريبية وجاري التحديث");
            loadTaxReport();
          } else {
            onShowToast("❌ فشل حذف الفاتورة الضريبية");
          }
        } catch (err) {
          console.error(err);
          onShowToast("❌ خطأ بالشبكة أثناء حذف الفاتورة");
        }
      }
    });
  };

  const handleBulkDeleteInvoices = async () => {
    if (selectedInvoiceIds.length === 0) {
      onShowToast("⚠️ يرجى تحديد بعض الفواتير أولاً لحذفها");
      return;
    }
    if (userRole !== "مدير") {
      onShowToast("⚠️ صلاحيات المدير فقط لطلب الحذف!");
      return;
    }
    setConfirmModal({
      show: true,
      title: "تأكيد حذف الفواتير الرقمية المحددة",
      message: `هل أنت متأكد من رغبتك في حذف الفواتير المحددة (${selectedInvoiceIds.length}) نهائياً من سجل النظام؟ سيتم التخلص من المشتريات المرتبطة تلقائياً.`,
      onConfirm: async () => {
        try {
          const res = await fetch("/api/tax-invoices/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: selectedInvoiceIds })
          });
          if (res.ok) {
            const data = await res.json();
            onShowToast(`🗑️ ${data.message || "تم حذف الفواتير بنجاح"}`);
            setSelectedInvoiceIds([]);
            loadTaxReport();
          } else {
            onShowToast("❌ فشل حذف الفواتير الضريبية المحددة");
          }
        } catch (err) {
          console.error(err);
          onShowToast("❌ خطأ بالشبكة أثناء حذف الفواتير المحددة");
        }
      }
    });
  };

  const handleClearAllInvoices = async () => {
    if (filteredInvoices.length === 0) {
      onShowToast("⚠️ لا توجد فواتير ضريبية حالية لحذفها");
      return;
    }
    if (userRole !== "مدير") {
      onShowToast("⚠️ صلاحيات المدير فقط لطلب الحذف!");
      return;
    }
    setConfirmModal({
      show: true,
      title: "⚠️ تحذير تدميري: حذف كلي للفواتير",
      message: `هل أنت متأكد تماماً من رغبتك في حذف جميع الفواتير الضريبية المعروضة حالياً (${filteredInvoices.length}) لفرع ${branch} في النطاق الزمني المحدد؟ لا يمكن استعادة البيانات المحذوفة وسيتم تحديث الحسابات!`,
      onConfirm: async () => {
        try {
          const res = await fetch("/api/tax-invoices/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              all: true,
              branch,
              from,
              to
            })
          });
          if (res.ok) {
            const data = await res.json();
            onShowToast(`🗑️ ${data.message || "تم تفريغ كافة الفواتير بنجاح"}`);
            setSelectedInvoiceIds([]);
            loadTaxReport();
          } else {
            onShowToast("❌ فشل حذف وتفريغ فواتير هذه الفترة");
          }
        } catch (err) {
          console.error(err);
          onShowToast("❌ خطأ بالشبكة أثناء تفريغ الفواتير");
        }
      }
    });
  };

  const startEditInvoice = (inv: TaxInvoice) => {
    if (userRole !== "مدير") {
      onShowToast("⚠️ صلاحيات المدير فقط لتعديل الفواتير الضريبية!");
      return;
    }
    setEditCompany(inv.company || "");
    setEditInvoiceNo(inv.invoice_no || "");
    setEditInvoiceDate(inv.invoice_date || "");
    setEditAmount(inv.amount);
    setEditBranch(inv.branch as "القادسية" | "المروج" || "القادسية");
    setEditDate(inv.date || "");
    setEditModal({
      show: true,
      invoice: inv
    });
  };

  const saveEditedInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.invoice) return;
    if (!editCompany.trim() || editAmount === "") {
      onShowToast("⚠️ يرجى ملء الحقول المطلوبة (المورد والمبلغ)");
      return;
    }

    try {
      const updatedData = {
        date: editDate || editModal.invoice.date,
        branch: editBranch,
        company: editCompany.trim(),
        invoice_no: editInvoiceNo.trim(),
        invoice_date: editInvoiceDate,
        amount: parseFloat(editAmount.toString()),
        items: editModal.invoice.items || []
      };

      const res = await fetch(`/api/tax-invoices/${encodeURIComponent(editModal.invoice.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });

      if (res.ok) {
        onShowToast("✅ تم تعديل الفاتورة الضريبية وتحديث التقارير بنجاح");
        setEditModal({ show: false, invoice: null });
        loadTaxReport();
      } else {
        const err = await res.json();
        onShowToast(`❌ فشل تعديل الفاتورة: ${err.error || ""}`);
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء تعديل الفاتورة");
    }
  };

  // Keep 'to' date in sync with 'from' date if reportMode is "day"
  useEffect(() => {
    if (reportMode === "day") {
      setTo(from);
    }
  }, [from, reportMode]);

  useEffect(() => {
    loadTaxReport();
  }, [from, to]);

  // Sync cash input memory for this branch and date range
  useEffect(() => {
    const savedCashKey = `tax_cash_${branch}_${from}_${to}`;
    const saved = localStorage.getItem(savedCashKey);
    if (saved !== null) {
      setTempCashInput(saved);
      setCashInput(parseFloat(saved) || 0);
      setIsTaxCalculated(true);
    } else {
      setTempCashInput("");
      setCashInput(0);
      setIsTaxCalculated(false);
    }
  }, [branch, from, to]);

  // Filter invoices to only show/count the ones matching the selected active branch
  const filteredInvoices = invoices.filter((i) => i.branch === branch);
  const totalInvoicesAmount = filteredInvoices.reduce((s, i) => s + (i.amount || 0), 0);
  
  // Get ONLY the POS income for the currently selected branch
  const totalPosValue = stats 
    ? (branch === "القادسية" ? stats.qPos : stats.mPos)
    : 0;
    
  const grandTotalWithInjectedCash = totalPosValue + cashInput;
  const grandDifference = grandTotalWithInjectedCash - totalInvoicesAmount;
  
  // Calculation of the 15% VAT from the vat-inclusive difference: amount * (15/115)
  const grandVat = grandDifference * (15 / 115);

  return (
    <div className="space-y-8 RTL">
      {/* Segmented control at the very top of the Tax Tab */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="text-right">
          <h2 className="text-md font-extrabold text-slate-800">اختر فرع العمليات النشط والتحليل الممنهج للضريبة</h2>
          <p className="text-[11px] text-slate-500 font-medium">سيقوم النظام بفلترة كافة البيانات، الإدخالات، الكشوفات، والحسابات بناءً على الفرع المحدد مباشرةً.</p>
        </div>
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          {(!userBranch || userBranch === "الكل" || userBranch === "القادسية") && (
            <button
              type="button"
              onClick={() => {
                setBranch("القادسية");
                onShowToast("📍 تم الانتقال لعرض وبيانات فرع القادسية");
              }}
              disabled={userBranch !== undefined && userBranch !== "الكل" && userBranch !== "القادسية"}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                branch === "القادسية"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              } ${userBranch && userBranch !== "الكل" ? "cursor-default" : "cursor-pointer"}`}
            >
              فرع القادسية {userBranch && userBranch === "القادسية" && "🔒 (مخصص لك)"}
            </button>
          )}
          {(!userBranch || userBranch === "الكل" || userBranch === "المروج") && (
            <button
              type="button"
              onClick={() => {
                setBranch("المروج");
                onShowToast("📍 تم الانتقال لعرض وبيانات فرع المروج");
              }}
              disabled={userBranch !== undefined && userBranch !== "الكل" && userBranch !== "المروج"}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                branch === "المروج"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              } ${userBranch && userBranch !== "الكل" ? "cursor-default" : "cursor-pointer"}`}
            >
              فرع المروج {userBranch && userBranch === "المروج" && "🔒 (مخصص لك)"}
            </button>
          )}
        </div>
      </div>

      {/* 1. Invoices Form */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6 print:hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
          <Receipt className="w-5 h-5 text-indigo-700" />
          <h2 className="text-lg font-bold text-slate-800">إدخال فواتير ضريبية للمصروفات</h2>
        </div>

        {/* AI Scanner Section */}
        <div 
          className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 text-center ${
            dragActive 
              ? "border-indigo-600 bg-indigo-50/70 scale-[0.99] shadow-inner" 
              : "border-indigo-150 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300"
          } mb-8`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          <input
            id="ai-invoice-input"
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-indigo-100/80 rounded-full text-indigo-700 shadow-xs">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-slate-800">المسح التلقائي بالذكاء الاصطناعي للفواتير الضريبية</h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                اسحب وأفلت صورة الفاتورة أو ملف PDF هنا، أو قم بتصويرها من جوالك، وسيتكفل النظام بقراءة البيانات وتعبئتها آلياً وبدقة متناهية. يمكنك رفع مجموعة فواتير أو مستندات معاً!
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-[11px] text-amber-700 font-bold">
                  💡 تلميح: قراءة ملفات الـ PDF قد تستغرق بضع ثوانٍ إضافية للتحليل الشامل. لتحقيق قراءة فائقة السرعة، اختر الصفحة الأولى فقط أو استخدم صور كاميرا الهاتف.
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => document.getElementById("ai-invoice-input")?.click()}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" /> رفع فواتير (صور / PDF)
              </button>
              
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById("ai-invoice-input");
                  if (input) {
                    input.removeAttribute("capture");
                    input.setAttribute("capture", "environment");
                    input.click();
                  }
                }}
                className="px-5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200"
              >
                <Camera className="w-4 h-4" /> تصوير الفاتورة بالجوال
              </button>
            </div>
          </div>

          {/* AI Loader Overlay */}
          {ocrLoading && (
            <div className="absolute inset-x-0 inset-y-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center gap-3 rounded-2xl z-10 animate-pulse">
              <Loader2 className="w-8 h-8 text-indigo-700 animate-spin" />
              <div className="space-y-1 text-center px-4">
                <span className="font-extrabold text-sm text-indigo-900 block">جاري مسح وقراءة الفاتورة بالذكاء الاصطناعي...</span>
                <span className="text-xs text-indigo-600 block font-semibold">تأخذ ملفات الـ PDF وقتاً أطول في الرفع والتحليل - يتم عمل موازنة سريعة حالياً</span>
                <span className="text-[11px] text-slate-400 block font-medium">نظام قراءة مستندي ذكي مدعوم بـ Gemini 3.5 Flash</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Parsed Results Review Dashboard */}
        {parsedInvoices.length > 0 && (
          <div className="bg-indigo-50/40 rounded-2xl p-6 border border-indigo-100/60 mb-8 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-700" />
                <h3 className="font-bold text-sm text-slate-800">الفواتير المستخرجة بالذكاء الاصطناعي قيد المراجعة والاعتماد ({parsedInvoices.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setParsedInvoices([])}
                className="text-xs text-slate-500 hover:text-rose-600 transition-all font-bold cursor-pointer"
              >
                مسح القائمة بالكامل
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parsedInvoices.map((pinv, idx) => (
                <div 
                  key={pinv.tempId} 
                  className={`p-4 rounded-xl border bg-white shadow-xs relative space-y-3 transition-all overflow-hidden ${
                    pinv.success ? "border-indigo-100/80 hover:border-indigo-300" : "border-rose-100 bg-rose-50/10 hover:border-rose-300"
                  }`}
                >
                  {/* Local Card Retrying Overlay */}
                  {pinv.isRetrying && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-xl z-10 transition-all">
                      <Loader2 className="w-6 h-6 text-indigo-700 animate-spin" />
                      <span className="text-[11px] font-bold text-indigo-900 leading-none">جاري المحاولة مجدداً...</span>
                    </div>
                  )}

                  {/* Delete/Discard button */}
                  <button
                    type="button"
                    onClick={() => {
                      setParsedInvoices(parsedInvoices.filter((p) => p.tempId !== pinv.tempId));
                    }}
                    className="absolute left-3 top-3 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                    title="استبعاد الفاتورة"
                  >
                    <Trash className="w-4 h-4" />
                  </button>

                  <div className="space-y-2">
                    {/* Error Warning badge */}
                    {!pinv.success && (
                      <div className="space-y-2 mb-2">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>فشلت القراءة الآلية تلقائياً: {pinv.error || "يرجى تعبئة الحقول يدوياً"}</span>
                        </div>
                        {pinv.rawImage && (
                          <button
                            type="button"
                            disabled={pinv.isRetrying}
                            onClick={() => retryInvoice(idx)}
                            className="w-full py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-250 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-xs transition-all disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            <span>إعادة محاولة اللقراءة الذكية 🔄</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">اسم المورد / المؤسسة</label>
                        <input
                           type="text"
                          value={pinv.company}
                          onChange={(e) => {
                            const updated = [...parsedInvoices];
                            updated[idx].company = e.target.value;
                            setParsedInvoices(updated);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:border-indigo-500 bg-slate-50/30 focus:bg-white focus:outline-none font-bold text-slate-800"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">رقم الفاتورة الأصيل</label>
                        <input
                          type="text"
                          value={pinv.invoice_no}
                          onChange={(e) => {
                            const updated = [...parsedInvoices];
                            updated[idx].invoice_no = e.target.value;
                            setParsedInvoices(updated);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:border-indigo-500 bg-slate-50/30 focus:bg-white focus:outline-none text-slate-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">تاريخ الفاتورة</label>
                        <input
                          type="date"
                          value={pinv.invoice_date}
                          onChange={(e) => {
                            const updated = [...parsedInvoices];
                            updated[idx].invoice_date = e.target.value;
                            setParsedInvoices(updated);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:border-indigo-500 bg-slate-50/30 focus:bg-white focus:outline-none text-slate-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-900 block">المبلغ الإجمالي</label>
                        <input
                          type="number"
                          step="0.01"
                          value={pinv.amount}
                          onChange={(e) => {
                            const updated = [...parsedInvoices];
                            updated[idx].amount = e.target.value === "" ? "" : parseFloat(e.target.value);
                            setParsedInvoices(updated);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-indigo-200 focus:border-indigo-500 rounded-md bg-slate-50/30 focus:bg-white focus:outline-none font-bold text-indigo-700"
                        />
                      </div>
                    </div>

                    {/* Extracted items checklist/viewer - FULLY EDITABLE FOR MANAGER AND INVOICE ENTRIES USER */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 bg-slate-50/50 p-3 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-indigo-700 font-extrabold select-none">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                          <span>المشتريات والسلع للتتبع ({pinv.items?.length || 0})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...parsedInvoices];
                            if (!updated[idx].items) {
                              updated[idx].items = [];
                            }
                            updated[idx].items.push({
                              name: "",
                              qty: "1 حبة",
                              price_with_tax: 0,
                              category: ""
                            });
                            setParsedInvoices(updated);
                          }}
                          className="px-2 py-0.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md flex items-center gap-0.5 cursor-pointer transition-all"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>إضافة سلعة +</span>
                        </button>
                      </div>

                      {/* Items List */}
                      {(!pinv.items || pinv.items.length === 0) ? (
                        <div className="p-3 text-center text-slate-400 text-[10px] border border-dashed border-slate-200 rounded-lg">
                          لا توجد سلع مضافة لهذه الفاتورة. انقر فوق "إضافة سلعة" لإضافة مواد.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {pinv.items.map((item, itemIdx) => (
                            <div 
                              key={itemIdx} 
                              className="flex items-center gap-2 text-[10px] bg-white p-1.5 rounded-lg border border-slate-150/80 shadow-3xs hover:border-indigo-150 transition-all"
                            >
                              {/* Item Name Input */}
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={item.name}
                                  placeholder="المادة (مثال: طماطم)"
                                  title="اسم المادة/السلعة لنظام التتبع"
                                  onChange={(e) => {
                                    const updated = [...parsedInvoices];
                                    if (updated[idx].items) {
                                      updated[idx].items[itemIdx].name = e.target.value;
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-[11px] border border-slate-205 rounded-md focus:border-indigo-500 bg-slate-50/20 text-slate-800 font-extrabold focus:bg-white focus:outline-none placeholder-slate-300"
                                />
                              </div>

                              {/* Item Category Input (نوع السلعة) */}
                              <div className="w-[100px]">
                                <input
                                  type="text"
                                  value={item.category || ""}
                                  placeholder="نوع السلعة"
                                  title="نوع السلعة (مثال: خضار، بيبسي، غاز...)"
                                  onChange={(e) => {
                                    const updated = [...parsedInvoices];
                                    if (updated[idx].items) {
                                      updated[idx].items[itemIdx].category = e.target.value;
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-[11px] border border-pink-200 focus:border-pink-500 bg-pink-50/20 text-pink-700 font-bold focus:bg-white focus:outline-none placeholder-pink-300"
                                />
                              </div>

                              {/* Item Qty Input */}
                              <div className="w-[60px]">
                                <input
                                  type="text"
                                  value={item.qty}
                                  placeholder="الكمية"
                                  title="الحجم / الكمية"
                                  onChange={(e) => {
                                    const updated = [...parsedInvoices];
                                    if (updated[idx].items) {
                                      updated[idx].items[itemIdx].qty = e.target.value;
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-1.5 py-1 text-[10px] border border-slate-205 rounded-md focus:border-indigo-450 bg-slate-50/20 text-center text-slate-600 font-mono font-bold focus:bg-white focus:outline-none placeholder-slate-300"
                                />
                              </div>

                              {/* Item Price incl. tax Input */}
                              <div className="w-[75px]">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.price_with_tax || ""}
                                  placeholder="السعر"
                                  title="سعر السلعة الإجمالي شامل الضريبة"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = [...parsedInvoices];
                                    if (updated[idx].items) {
                                      updated[idx].items[itemIdx].price_with_tax = val === "" ? 0 : parseFloat(val);
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-1.5 py-1 text-[11px] border border-slate-205 rounded-md focus:border-indigo-400 bg-slate-50/20 text-left font-mono font-black text-indigo-700 focus:bg-white focus:outline-none placeholder-0"
                                />
                              </div>

                              {/* Delete Item action */}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...parsedInvoices];
                                  if (updated[idx].items) {
                                    updated[idx].items.splice(itemIdx, 1);
                                    setParsedInvoices(updated);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 rounded-md transition-all cursor-pointer flex-shrink-0"
                                title="حذف هذه السلعة"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Review Panel Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-indigo-100/80">
              <div className="text-xs text-indigo-950 font-bold text-right w-full sm:w-auto">
                إجمالي قيمة الفواتير المكتشفة: <strong className="text-indigo-700 text-sm font-extrabold">
                  {parsedInvoices.reduce((sum, p) => sum + (parseFloat(p.amount as string) || 0), 0).toFixed(2)} ريال
                </strong>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const activeValid = parsedInvoices.filter(p => p.company && (parseFloat(p.amount as string) || 0) > 0);
                    if (activeValid.length === 0) {
                      onShowToast("⚠️ لا توجد فواتير صالحة لنقلها (يجب ملء حقل المورد والمبلغ).");
                      return;
                    }
                    
                    const cleanedManual = rows.filter(r => r.company || r.amount);
                    const newlyMerged = [...cleanedManual, ...activeValid.map(v => ({
                      company: v.company,
                      invoice_no: v.invoice_no,
                      invoice_date: v.invoice_date,
                      amount: v.amount,
                      items: v.items || [],
                    }))];

                    setRows(newlyMerged);
                    setParsedInvoices([]);
                    onShowToast("📥 تم دمج ونقل الفواتير بنجاح لجدول الإدخال بالأسفل!");
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowDownToLine className="w-4 h-4" /> نقل إلى جدول الإدخال اليدوي بالأسفل
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    const activeValid = parsedInvoices.filter(p => p.company && (parseFloat(p.amount as string) || 0) > 0);
                    if (activeValid.length === 0) {
                      onShowToast("⚠️ يرجى تعبئة مورد واحد على الأقل وقيمة أكبر من الصفر للحفظ مباشرة.");
                      return;
                    }

                    setLoading(true);
                    try {
                      const payloads = activeValid.map((v) => ({
                        date,
                        branch,
                        company: v.company,
                        invoice_no: v.invoice_no,
                        invoice_date: v.invoice_date || date,
                        amount: parseFloat(v.amount as string) || 0,
                        items: v.items || [],
                      }));

                      const res = await fetch("/api/tax-invoices", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payloads),
                      });

                      if (res.ok) {
                        onShowToast(`🧾 تم حفظ ${payloads.length} فواتير مدعومة بالذكاء الاصطناعي بنجاح!`);
                        setParsedInvoices([]);
                        loadTaxReport();
                      } else {
                        onShowToast("❌ فشل حفظ الفواتير");
                      }
                    } catch (err) {
                      console.error(err);
                      onShowToast("❌ خطأ شبكة أثناء مباشرة الحفظ");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> اعتماد وحفظ الفواتير فوراً 🛡️
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveInvoices} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">تاريخ الإدخال العام</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">فرع التحصيل النشط</label>
              <div className="w-full px-3 py-2 text-sm border border-indigo-100 rounded-lg bg-indigo-50/50 text-indigo-900 font-extrabold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>فرع {branch}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">بنود الفواتير المكتوبة:</h3>
            </div>
            
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100 relative">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">اسم المورد / المؤسسة</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: المراعي"
                      value={row.company}
                      onChange={(e) => updateRow(index, "company", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">رقم الفاتورة المكتوب</label>
                    <input
                      type="text"
                      placeholder="رقم الفاتورة"
                      value={row.invoice_no}
                      onChange={(e) => updateRow(index, "invoice_no", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">تاريخ الفاتورة</label>
                    <input
                      type="date"
                      value={row.invoice_date}
                      onChange={(e) => updateRow(index, "invoice_date", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="grid grid-cols-6 gap-2 items-center">
                    <div className="col-span-4 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">المبلغ الإجمالي</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) => updateRow(index, "amount", e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                      />
                    </div>
                    <div className="col-span-2 text-left pt-5">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        disabled={rows.length === 1}
                        className="text-rose-600 hover:text-rose-800 p-2 disabled:opacity-30 cursor-pointer"
                        title="حذف هذا السطر"
                      >
                        <Trash className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>

                  {/* Manual Row Items Editor */}
                  {(!row.items || row.items.length === 0) ? (
                    <div className="col-span-1 md:col-span-4 mt-2 flex justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...rows];
                          updated[index].items = [{ name: "", qty: "1 حبة", price_with_tax: 0, category: "" }];
                          setRows(updated);
                        }}
                        className="text-[10px] font-bold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-150/80 px-2.5 py-1 rounded-lg border border-indigo-100 flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة سلع/بضائع تفصيلية لتتبع المشتريات والمخزون الذكي</span>
                      </button>
                    </div>
                  ) : (
                    <div className="col-span-1 md:col-span-4 mt-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-indigo-700 font-extrabold px-1">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          <span>المشتريات السلعية المدرجة للمخزون والتتبع ({row.items.length}):</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...rows];
                            if (!updated[index].items) {
                              updated[index].items = [];
                            }
                            updated[index].items.push({
                              name: "",
                              qty: "1 حبة",
                              price_with_tax: 0,
                              category: ""
                            });
                            setRows(updated);
                          }}
                          className="text-[9px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-0.5 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-indigo-200 animate-pulse"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>إضافة سلعة +</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {row.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex flex-col gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-3xs">
                            <div className="flex items-center gap-1.5">
                              {/* Item Name */}
                              <input
                                type="text"
                                value={item.name}
                                placeholder="اسم السلعة"
                                title="اسم المادة/السلعة للتتبع"
                                onChange={(e) => {
                                  const updated = [...rows];
                                  if (updated[index].items) {
                                    updated[index].items[itemIdx].name = e.target.value;
                                    setRows(updated);
                                  }
                                }}
                                className="flex-1 bg-slate-50/30 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-0.5 min-w-0 text-[11px]"
                              />
                              {/* Remove Item */}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...rows];
                                  if (updated[index].items) {
                                    updated[index].items.splice(itemIdx, 1);
                                    setRows(updated);
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-1.5 py-0.5 rounded transition-all font-bold cursor-pointer text-[11px]"
                                title="حذف المادة"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {/* Category (نوع السلعة) */}
                              <input
                                type="text"
                                value={item.category || ""}
                                placeholder="نوع السلعة"
                                title="تصنيف السلعة (خضار، بيبسي، ديزل...)"
                                onChange={(e) => {
                                  const updated = [...rows];
                                  if (updated[index].items) {
                                    updated[index].items[itemIdx].category = e.target.value;
                                    setRows(updated);
                                  }
                                }}
                                className="col-span-1 bg-pink-50/25 border border-pink-100 text-pink-700 text-center font-bold focus:outline-none focus:ring-1 focus:ring-pink-300 rounded px-1 py-0.5 text-[10px]"
                              />
                              {/* Quantity */}
                              <input
                                type="text"
                                value={item.qty}
                                placeholder="الكمية"
                                onChange={(e) => {
                                  const updated = [...rows];
                                  if (updated[index].items) {
                                    updated[index].items[itemIdx].qty = e.target.value;
                                    setRows(updated);
                                  }
                                }}
                                className="col-span-1 bg-slate-50/30 border border-slate-200 text-center font-mono text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 text-[10px]"
                              />
                              {/* Price */}
                              <input
                                type="number"
                                step="0.01"
                                value={item.price_with_tax || ""}
                                placeholder="السعر"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = [...rows];
                                  if (updated[index].items) {
                                    updated[index].items[itemIdx].price_with_tax = val === "" ? 0 : parseFloat(val);
                                    setRows(updated);
                                  }
                                }}
                                className="col-span-1 bg-slate-50/30 border border-slate-200 text-left font-mono font-bold text-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 text-[11px]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addRow}
                className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> إضافة مورد وفاتورة أخرى
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-600">
              إجمالي فواتير الإدخال المؤقتة: <strong className="text-indigo-700 font-extrabold text-base">{sumInvoicesInput.toFixed(2)} ر</strong>
            </span>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-bold py-2.5 px-6 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Receipt className="w-4 h-4" />
              حفظ وتثبيت قائمة الفواتير
            </button>
          </div>
        </form>
      </div>

      {/* For Invoice clerks show a neat simple list of entered branch invoices to avoid confusion and double-entries */}
      {userRole === "مدخل فواتير" && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-150 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-700 font-extrabold animate-pulse" />
              <h2 className="text-sm font-bold text-slate-800">الفواتير المستلمة والمثبتة لفرع {branch} في النظام</h2>
            </div>
            <button
              type="button"
              onClick={loadTaxReport}
              disabled={loading}
              className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg p-2 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 font-bold text-xs gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              تحديث القائمة
            </button>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-right">
              <label className="block text-xs font-extrabold text-slate-705 mb-1">تحديد نطاق مراجعة الفواتير:</label>
              <p className="text-[10px] text-slate-500 font-medium">راجع الفواتير المسجلة لتتجنب التكرار والالتباس عند إدخال الفواتير اليدوية.</p>
            </div>
            <div className="flex bg-slate-200 p-1 rounded-lg flex-wrap gap-1">
              <button
                type="button"
                onClick={() => {
                  setReportMode("day");
                  setTo(from);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  reportMode === "day"
                    ? "bg-white text-slate-900 shadow-3xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📅 يوم واحد
              </button>
              <button
                type="button"
                onClick={() => setReportMode("period")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  reportMode === "period"
                    ? "bg-white text-slate-900 shadow-3xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                🗓️ مدى زمني (المجموع الكامل)
              </button>
              <button
                type="button"
                onClick={() => setReportMode("period_detailed")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  reportMode === "period_detailed"
                    ? "bg-white text-slate-900 shadow-3xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                📊 مدى زمني (تفصيلي يومي)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            {reportMode === "day" ? (
              <div className="space-y-2 col-span-2">
                <label className="block text-xs font-bold text-slate-700">تاريخ مراجعة الفواتير</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFrom(val);
                    setTo(val);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">من تاريخ</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">إلى تاريخ</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </>
            )}
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-500 font-medium text-xs">
              لا توجد فواتير ضريبية مدخلة أو محفوظة لفرع {branch} في الفترة المحددة ({from} {reportMode === "period" && `إلى ${to}`}).
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-3xs">
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 shadow-3xs">
                    <th className="p-3 text-right">مورد الفاتورة (اسم المؤسسة)</th>
                    <th className="p-3 text-center">رقم الفاتورة</th>
                    <th className="p-3 text-center">تاريخ الفاتورة</th>
                    <th className="p-3 text-left">مبلـغ الفاتورة</th>
                    <th className="p-3 text-center">خيارات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-extrabold text-slate-800">{inv.company}</td>
                      <td className="p-3 text-center font-mono text-slate-500">{inv.invoice_no || "—"}</td>
                      <td className="p-3 text-center font-mono text-slate-600">{inv.invoice_date || inv.date}</td>
                      <td className="p-3 text-left font-extrabold text-indigo-950 font-mono">
                        {inv.amount.toFixed(2)} ر.س
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                          🔒 محفوظ بالنظام
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 text-slate-800 font-extrabold border-t border-slate-200">
                    <td colSpan={3} className="p-3 text-right">إجمالي الفواتير المحفوظة للفترة المحددة:</td>
                    <td className="p-3 text-left font-extrabold text-indigo-700 font-mono">
                      {totalInvoicesAmount.toFixed(2)} ر.س
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 2. Comprehensive Tax Report (Print Friendly & Ink Saving) */}
      {userRole !== "مدخل فواتير" && (
        <div id="printable-tax-report-area" className="bg-white rounded-xl shadow-sm border border-slate-150 p-6 print:p-0 print:border-none print:shadow-none">
        
        {/* Dynamic style injection specifically optimized for clean print outputs of this report */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            header, nav, form, button, .print\\:hidden, #toast-container, [role="alert"], aside, footer {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            body, html {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
            }
            @page {
              size: A4 portrait;
              margin: 8mm 6mm 8mm 6mm;
            }
            #printable-tax-report-area {
              display: block !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              visibility: visible !important;
            }
            #printable-tax-report-area * {
              visibility: visible !important;
            }
            #printable-tax-report-area table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 8px !important;
            }
            #printable-tax-report-area th, 
            #printable-tax-report-area td {
              padding: 3px 4px !important;
              font-size: 8px !important;
              line-height: 1.15 !important;
              border-color: #475569 !important; /* darker borders for maximum legibility */
            }
            #printable-tax-report-area th {
              background-color: #f1f5f9 !important;
              color: #000000 !important;
              font-weight: 850 !important;
            }
            #printable-tax-report-area .bg-slate-50,
            #printable-tax-report-area .bg-slate-100,
            #printable-tax-report-area .bg-indigo-50\\/20,
            #printable-tax-report-area .bg-emerald-50\\/10 {
              background-color: transparent !important;
            }
            #printable-tax-report-area h3 {
              font-size: 11px !important;
              margin-bottom: 2px !important;
            }
            #printable-tax-report-area p {
              font-size: 8.5px !important;
            }
            #printable-tax-report-area .text-xs,
            #printable-tax-report-area .text-sm {
              font-size: 8px !important;
            }
            #printable-tax-report-area input {
              display: none !important; /* hide inputs on print completely */
            }
          }
        `}} />

        {/* Advisory banner for iframe print contexts */}
        {typeof window !== "undefined" && window.self !== window.top && (
          <div className="mb-4 p-3.5 bg-amber-50/85 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold flex items-start gap-2.5 print:hidden leading-relaxed">
            <span className="text-sm">💡</span>
            <div>
              <span><strong>تنبيه المتصفح للمعاينة:</strong> واجهات الحماية داخل المنصة تمنع الطباعة التلقائية (window.print). للطباعة والحفظ الفعلي بصيغة PDF أو ورقياً، يرجى فتح التطبيق في علامة تبويب كاملة ومستقلة بالنقر على زر التبويب أعلى المتصفح.</span>
            </div>
          </div>
        )}

        {/* Header containing Title & Print Button (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-700" />
            <h2 className="text-lg font-bold text-slate-800">التقرير الضريبي الموحد الشامل للفرع</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                window.print();
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
          >
            <span>🖨️</span>
            <span>طباعة التقرير الشامل (بديل مالي موفر للحبر)</span>
          </button>
        </div>

        {/* Switch Selector of Single Day vs period (Hidden in Print) */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="text-right">
            <label className="block text-xs font-extrabold text-slate-700 mb-1">تحديد المدى والوعاء الضريبي للتقرير:</label>
            <p className="text-[10px] text-slate-500 font-medium">اختر ما إذا كنت ترغب في مراجعة وتصفية مبيعات يوم واحد نشط بدقة أو مراجعة فترة مجمعة بالكامل.</p>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-lg flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                setReportMode("day");
                setTo(from);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                reportMode === "day"
                  ? "bg-white text-slate-900 shadow-3xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📅 يوم واحد
            </button>
            <button
              type="button"
              onClick={() => setReportMode("period")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                reportMode === "period"
                  ? "bg-white text-slate-900 shadow-3xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🗓️ مدى زمني (المجموع الكامل)
            </button>
            <button
              type="button"
              onClick={() => setReportMode("period_detailed")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                reportMode === "period_detailed"
                  ? "bg-white text-slate-900 shadow-3xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📊 مدى زمني (تفصيلي يومي)
            </button>
          </div>
        </div>

        {/* Date parameters inputs (Hidden in Print) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-6 print:hidden">
          {reportMode === "day" ? (
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-700">تاريخ اليوم المراد مراجعته</label>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  const val = e.target.value;
                  setFrom(val);
                  setTo(val);
                }}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">تاريخ بدء الفترة</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">تاريخ نهاية الفترة</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </>
          )}

          <button
            type="button"
            onClick={loadTaxReport}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <Search className="w-4 h-4" /> 
            <span>{reportMode === "day" ? "عرض ومطابقة مبيعات اليوم" : "عرض ومطابقة مبيعات الفترة"}</span>
          </button>
        </div>

        {stats && (
          <div className="space-y-6">
            
            {/* 1. Cash Input configuration panel (Hidden in Print) */}
            <div className="bg-indigo-50/15 p-5 rounded-2xl border border-indigo-100/50 space-y-4 print:hidden">
              <div className="border-b border-indigo-100/50 pb-2">
                <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-600 rounded-xs" />
                  إدخال وتثبيت الدخل والوعاء لتنفيذ احتساب الضريبة
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">خطوة إدخال ومراجعة الكاش وتأكيد الوعاء للحسبة الضريبية وعرض الفروقات.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* POS daily sum field (Readonly) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600">الدخل التلقائي لنقاط البيع (الشبكة خلال الفترة)</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={`${totalPosValue.toFixed(2)} ريال`}
                      className="w-full pl-3 pr-10 py-2.5 text-sm border border-slate-200 bg-slate-100 text-slate-600 rounded-xl font-extrabold focus:outline-none"
                    />
                    <TrendingUp className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3.5" />
                  </div>
                </div>

                {/* Empty/Editable manual Cash field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1">
                    مبلغ دخل الكاش للفترة <span className="text-indigo-600 font-normal opacity-80">(خانة إدخال)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="أدخل مبلغ الكاش يدوياً هنا..."
                      value={tempCashInput}
                      onChange={(e) => setTempCashInput(e.target.value)}
                      className="w-full pl-12 pr-3 py-2.5 text-sm border-2 border-indigo-200 focus:border-indigo-600 rounded-xl bg-white focus:outline-none font-bold text-indigo-950"
                    />
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1 rounded-lg absolute left-2.5 top-2.5 border border-indigo-150">ريال</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-indigo-100/55">
                <span className="text-[10px] text-slate-500 font-medium">سيتولى النظام خصم الفواتير من إجمالي مجموع (الشبكة والمنصرف النقدي للفرع).</span>
                <button
                  type="button"
                  onClick={handleCalculateTax}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>💾</span>
                  <span>حفظ واعتماد الحساب المالي للفترة</span>
                </button>
              </div>
            </div>

            {/* 2. Official Ink-saving Printable Comprehensive Tax Ledger Table (أعمدة وصفوف للطباعة على ورقة واحدة) */}
            <div className="bg-white border border-slate-350 rounded-xl overflow-hidden shadow-2xs mt-4 print:border-slate-400">
              
              {/* Header block optimized for light-ink print outputs */}
              <div className="p-4 bg-slate-50/50 border-b border-slate-300 text-center space-y-1 print:bg-white print:border-b-2">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  تقرير ضريبة القيمة المضافة الموحد الشامل - منشأة فرع {branch}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold">
                  {reportMode === "day" ? `كشف حركة اليوم المالي: ${from}` : `كشف حركة الفترة الزمنية المعتمدة: من ${from} إلى ${to}`}
                </p>
                <div className="text-[9px] text-slate-400 font-semibold font-mono flex items-center justify-center gap-2 mt-1">
                  <span>تاريخ استخراج النشرة: {new Date().toLocaleDateString('ar-EG')}</span>
                  <span>|</span>
                  <span>العملة الرسمية المعبر عنها: ريال سعودي (SAR)</span>
                </div>
              </div>

              <div className="p-4 overflow-x-auto print:overflow-visible scrollbar-thin">
                {reportMode === "period_detailed" ? (
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-800 font-extrabold print:bg-slate-50 print:border-b-2">
                        <th className="p-3 border-l border-slate-300 text-center w-32">التاريخ واليوم</th>
                        <th className="p-3 border-l border-slate-300 text-left w-24">دخل الشبكة (نقاط البيع)</th>
                        <th className="p-3 border-l border-slate-300 text-center w-28 print:p-1">دخل الكاش</th>
                        <th className="p-3 border-l border-slate-300 text-left w-28 bg-slate-50/40">مجموع الدخل الكلي (1)</th>
                        <th className="p-3 border-l border-slate-300 text-right">اسم المؤسسة / المورد</th>
                        <th className="p-3 border-l border-slate-300 text-center w-24">رقم الفاتورة</th>
                        <th className="p-3 border-l border-slate-300 text-center w-24">تاريخ الفاتورة</th>
                        <th className="p-3 border-l border-slate-300 text-left w-24">مبلغ الفاتورة (2)</th>
                        <th className="p-3 border-l border-slate-300 text-left w-28 bg-slate-50/20">صافي الفرق الخاضع (1-2)</th>
                        <th className="p-3 text-left w-28 bg-emerald-50/10 text-emerald-950 font-black">الضريبة 15%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const branchDays = (branch === "القادسية" ? reportRawData?.qData : reportRawData?.mData) || [];
                        
                        // Generate all sequential dates from the start range (from) to the end range (to)
                        const getDatesInRange = (startStr: string, endStr: string): string[] => {
                          if (!startStr || !endStr) return [];
                          const dates: string[] = [];
                          const start = new Date(startStr);
                          const end = new Date(endStr);
                          const curr = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
                          const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
                          
                          while (curr <= last) {
                            const yr = curr.getUTCFullYear();
                            const mo = String(curr.getUTCMonth() + 1).padStart(2, '0');
                            const dy = String(curr.getUTCDate()).padStart(2, '0');
                            dates.push(`${yr}-${mo}-${dy}`);
                            curr.setUTCDate(curr.getUTCDate() + 1);
                          }
                          return dates;
                        };

                        const invoiceDatesSet = new Set<string>(filteredInvoices.map((inv) => inv.invoice_date || inv.date));
                        const allUniqueDates = getDatesInRange(from, to).filter(dateStr => invoiceDatesSet.has(dateStr));

                        if (allUniqueDates.length === 0) {
                          return (
                            <tr>
                              <td colSpan={10} className="p-8 text-center text-slate-400 font-medium border-b border-slate-200">
                                لا توجد سجلات يومية أو فواتير ضريبية مسجلة للفترة الزمنية المحددة.
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <>
                            {allUniqueDates.flatMap((dateStr) => {
                              // Find actual entry if it exists in branchDays
                              const realD = branchDays.find((b: any) => b.date === dateStr);
                              const d = realD || {
                                date: dateStr,
                                pos_net: 0,
                                total_sales: 0,
                                cash_net: 0
                              };

                              const dayInvoices = filteredInvoices.filter(
                                (inv) => (inv.invoice_date || inv.date) === dateStr
                              );
                              const dayInvoicesTotal = dayInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
                              const dayCash = getDailyCash(dateStr);
                              const dayTotalSales = (d.pos_net || 0) + dayCash;
                              const dayNetDifference = dayTotalSales - dayInvoicesTotal;
                              const dayVat = dayNetDifference * (15 / 115);
                              const maxSpan = dayInvoices.length === 0 ? 1 : dayInvoices.length;

                              if (dayInvoices.length === 0) {
                                return [
                                  <tr 
                                    key={d.id || d.date} 
                                    className="border-b border-slate-300 font-medium hover:bg-slate-50/20 bg-white"
                                  >
                                    {/* 1. Date & Day */}
                                    <td className="p-3 text-center border-l border-slate-300 font-bold bg-slate-50/60 font-mono text-slate-800">
                                      <div>{d.date}</div>
                                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">{getArabicDayName(d.date)}</div>
                                    </td>
                                    
                                    {/* 2. POS Net */}
                                    <td className="p-3 text-left border-l border-slate-300 font-bold text-slate-900">
                                      {(d.pos_net || 0).toFixed(2)} ر
                                    </td>
                                    
                                    {/* 3. Daily Cash Input */}
                                    <td className="p-3 text-center border-l border-slate-300 print:p-1">
                                      <div className="flex items-center justify-center gap-1.5 print:hidden">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={getDailyCashDisplayValue(d.date)}
                                          placeholder="0.00"
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "") {
                                              localStorage.removeItem(`tax_cash_${branch}_${d.date}_${d.date}`);
                                            } else {
                                              localStorage.setItem(`tax_cash_${branch}_${d.date}_${d.date}`, val);
                                            }
                                            setDailyCashKeyTrigger(prev => prev + 1);
                                          }}
                                          className="w-24 px-2 py-1 text-center border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-lg text-slate-800 font-extrabold focus:outline-none text-xs bg-slate-50/30 font-mono placeholder-slate-300"
                                        />
                                        <span className="text-[9px] text-slate-400 font-bold">ر</span>
                                      </div>
                                      <span className="hidden print:inline font-bold font-mono text-slate-700">
                                        {dayCash.toFixed(2)} ر
                                      </span>
                                    </td>
                                    
                                    {/* 4. Total Sales */}
                                    <td className="p-3 text-left border-l border-slate-300 font-extrabold text-slate-950 bg-slate-50/30">
                                      {dayTotalSales.toFixed(2)} ر
                                    </td>
                                    
                                    {/* 5. Company Name (Supplier) */}
                                    <td className="p-3 text-center border-l border-slate-300 text-slate-400 font-medium">
                                      لا توجد فواتير
                                    </td>
                                    
                                    {/* 6. Invoice No */}
                                    <td className="p-3 text-center border-l border-slate-300 text-slate-400">
                                      —
                                    </td>
                                    
                                    {/* 7. Invoice Date */}
                                    <td className="p-3 text-center border-l border-slate-300 text-slate-400 font-mono">
                                      —
                                    </td>
                                    
                                    {/* 8. Invoice Amount */}
                                    <td className="p-3 text-left border-l border-slate-300 text-slate-400">
                                      0.00 ر
                                    </td>
                                    
                                    {/* 9. Difference */}
                                    <td className="p-3 text-left border-l border-slate-300 font-extrabold bg-slate-50/10">
                                      <span className={dayNetDifference >= 0 ? "text-emerald-700" : "text-rose-600"}>
                                        {dayNetDifference.toFixed(2)} ر
                                      </span>
                                    </td>
                                    
                                    {/* 10. Daily VAT */}
                                    <td className="p-3 text-left font-black bg-emerald-50/10 text-emerald-800">
                                      {dayVat.toFixed(2)} ر
                                    </td>
                                  </tr>
                                ];
                              }

                              return dayInvoices.map((inv, idx) => {
                                const isFirst = idx === 0;
                                return (
                                  <tr 
                                    key={inv.id} 
                                    className={`border-b border-slate-300 font-medium hover:bg-slate-50/20 ${
                                      idx % 2 === 1 ? 'bg-slate-50/10' : 'bg-white'
                                    }`}
                                  >
                                    {/* 1-4. Daily metrics merged for this day */}
                                    {isFirst && (
                                      <>
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-center border-l border-slate-300 font-bold bg-slate-50/60 font-mono text-slate-800 align-middle"
                                        >
                                          <div>{d.date}</div>
                                          <div className="text-[10px] text-slate-500 font-bold mt-0.5">{getArabicDayName(d.date)}</div>
                                        </td>
                                        
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-left border-l border-slate-300 font-bold text-slate-900 align-middle"
                                        >
                                          {(d.pos_net || 0).toFixed(2)} ر
                                        </td>
                                        
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-center border-l border-slate-300 print:p-1 align-middle"
                                        >
                                          <div className="flex items-center justify-center gap-1.5 print:hidden">
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={getDailyCashDisplayValue(d.date)}
                                              placeholder="0.00"
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "") {
                                                  localStorage.removeItem(`tax_cash_${branch}_${d.date}_${d.date}`);
                                                } else {
                                                  localStorage.setItem(`tax_cash_${branch}_${d.date}_${d.date}`, val);
                                                }
                                                setDailyCashKeyTrigger(prev => prev + 1);
                                              }}
                                              className="w-24 px-2 py-1 text-center border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-lg text-slate-800 font-extrabold focus:outline-none text-xs bg-slate-50/30 font-mono placeholder-slate-300"
                                            />
                                            <span className="text-[9px] text-slate-400 font-bold">ر</span>
                                          </div>
                                          <span className="hidden print:inline font-bold font-mono text-slate-700">
                                            {dayCash.toFixed(2)} ر
                                          </span>
                                        </td>
                                        
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-left border-l border-slate-300 font-extrabold text-slate-950 bg-slate-50/30 align-middle"
                                        >
                                          {dayTotalSales.toFixed(2)} ر
                                        </td>
                                      </>
                                    )}
                                    
                                    {/* 5-8. Individual Invoice columns */}
                                    <td className="p-3 text-right border-l border-slate-300 text-slate-800 font-bold">
                                      {inv.company}
                                    </td>
                                    
                                    <td className="p-3 text-center border-l border-slate-300 font-mono text-slate-550">
                                      {inv.invoice_no || "—"}
                                    </td>
                                    
                                    <td className="p-3 text-center border-l border-slate-300 font-mono text-slate-500">
                                      {inv.invoice_date || inv.date}
                                    </td>
                                    
                                    <td className="p-3 text-left border-l border-slate-300 font-bold text-slate-750 font-mono">
                                      {inv.amount.toFixed(2)} ر
                                    </td>
                                    
                                    {/* 9-10. Daily difference and VAT merged for this day */}
                                    {isFirst && (
                                      <>
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-left border-l border-slate-300 font-extrabold align-middle"
                                        >
                                          <span className={dayNetDifference >= 0 ? "text-emerald-700 font-extrabold" : "text-rose-600 font-extrabold"}>
                                            {dayNetDifference.toFixed(2)} ر
                                          </span>
                                        </td>
                                        
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-left font-black bg-emerald-50/10 text-emerald-800 align-middle"
                                        >
                                          {dayVat.toFixed(2)} ر
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              });
                            })}

                            {/* Totals Row for Detailed Period */}
                            {(() => {
                              let totalPos = 0;
                              let totalCash = 0;
                              let totalInvs = 0;

                              allUniqueDates.forEach((dateStr) => {
                                const realD = branchDays.find((b: any) => b.date === dateStr);
                                const d = realD || { pos_net: 0 };
                                totalPos += d.pos_net || 0;
                                totalCash += getDailyCash(dateStr);
                                const dayInvs = filteredInvoices.filter(
                                  (inv) => (inv.invoice_date || inv.date) === dateStr
                                );
                                totalInvs += dayInvs.reduce((sum, inv) => sum + (inv.amount || 0), 0);
                              });

                              const totalSalesCombined = totalPos + totalCash;
                              const netDiffCombined = totalSalesCombined - totalInvs;
                              const vatCombined = netDiffCombined * (15 / 115);

                              return (
                                <tr className="bg-slate-100 border-t-2 border-b-2 border-slate-300 font-bold text-slate-800 text-xs">
                                  <td className="p-3 text-center border-l border-slate-300 font-extrabold bg-slate-150">الـمـجـمـوع الـكـلـي لـفـتـرة {allUniqueDates.length} أيام في الكشف</td>
                                  <td className="p-3 text-left border-l border-slate-300 text-slate-900 font-extrabold font-mono">{totalPos.toFixed(2)} ر</td>
                                  <td className="p-3 text-left border-l border-slate-300 text-slate-700 font-extrabold bg-slate-50 font-mono">{totalCash.toFixed(2)} ر</td>
                                  <td className="p-3 text-left border-l border-slate-300 text-indigo-950 font-black bg-indigo-50/20 font-mono">{totalSalesCombined.toFixed(2)} ر</td>
                                  <td colSpan={3} className="p-3 text-center border-l border-slate-300 text-slate-400 bg-slate-50">—</td>
                                  <td className="p-3 text-left border-l border-slate-300 text-rose-700 font-extrabold font-mono">{totalInvs.toFixed(2)} ر</td>
                                  <td className="p-3 text-left border-l border-slate-300 font-black text-slate-900 bg-slate-50 font-mono">
                                    <span className={netDiffCombined >= 0 ? "text-emerald-700 font-black" : "text-rose-600 font-black"}>
                                      {netDiffCombined.toFixed(2)} ر
                                    </span>
                                  </td>
                                  <td className="p-3 text-left font-black bg-emerald-50 text-emerald-950 text-sm font-mono">
                                    {vatCombined.toFixed(2)} ر
                                  </td>
                                </tr>
                              );
                            })()}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-800 font-extrabold print:bg-slate-50 print:border-b-2">
                        <th className="p-2 border-l border-slate-300 text-center w-28">تاريخ / فترة الضريبة</th>
                        <th className="p-2 border-l border-slate-300 text-left w-28">مجموع دخل نقاط البيع</th>
                        <th className="p-2 border-l border-slate-300 text-left w-24">دخل الكاش المدرج</th>
                        <th className="p-2 border-l border-slate-300 text-left w-32 bg-slate-50/30">مجموع دخل الدورة (1)</th>
                        {userRole === "مدير" && (
                          <th className="p-2 border-l border-slate-300 text-center w-12 print:hidden">
                            <input
                              type="checkbox"
                              checked={filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoiceIds.includes(inv.id))}
                              onChange={() => {
                                const allSelected = filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoiceIds.includes(inv.id));
                                if (allSelected) {
                                  setSelectedInvoiceIds([]);
                                } else {
                                  setSelectedInvoiceIds(filteredInvoices.map(inv => inv.id));
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-slate-500 cursor-pointer h-3.5 w-3.5"
                            />
                          </th>
                        )}
                        <th className="p-2 border-l border-slate-300 text-center w-28">تاريخ الفاتورة</th>
                        <th className="p-2 border-l border-slate-300 text-right">مورد الفاتورة (اسم المؤسسة)</th>
                        <th className="p-2 border-l border-slate-300 text-center w-24">رقم الفاتورة</th>
                        <th className="p-2 border-l border-slate-200 text-left w-24 bg-slate-50/20">مبلـغ الفاتورة (2)</th>
                        <th className="p-2 text-center w-12 print:hidden">تعديل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.length === 0 ? (
                        <tr className="border-b border-slate-300 font-medium">
                          <td className="p-2 text-center border-l border-slate-300 font-bold bg-slate-100/20">
                            {reportMode === "day" ? (
                              <span className="font-mono">{from}</span>
                            ) : (
                              <>
                                <span className="font-mono">{from}</span> <br /> 
                                <span className="font-mono">{to}</span>
                              </>
                            )}
                          </td>
                          <td className="p-2 text-left border-l border-slate-300 font-bold text-slate-900">
                            {totalPosValue.toFixed(2)} ر
                          </td>
                          <td className="p-2 text-left border-l border-slate-300 font-bold text-slate-600">
                            {cashInput.toFixed(2)} ر
                          </td>
                          <td className="p-2 text-left border-l border-slate-300 font-extrabold text-slate-900 bg-slate-50/60">
                            {grandTotalWithInjectedCash.toFixed(2)} ر
                          </td>
                          
                          {/* Empty indicators for invoices */}
                          <td colSpan={userRole === "مدير" ? 5 : 4} className="p-4 text-center text-slate-400 border-l border-slate-300 font-medium">
                            لا توجد فواتير ضريبية مستلمة أو مثبتة للفترة المحددة.
                          </td>
                          <td className="p-2 text-center print:hidden">—</td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv, idx) => {
                          const isFirst = idx === 0;
                          return (
                            <tr 
                              key={inv.id} 
                              className={`border-b border-slate-300 hover:bg-slate-50/10 font-medium ${
                                idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                              }`}
                            >
                              {/* Grouping aggregated revenue parameters onto the first row utilizing rowSpan */}
                              {isFirst && (
                                <>
                                  <td 
                                    rowSpan={filteredInvoices.length} 
                                    className="p-2 text-center border-l border-slate-300 bg-slate-50/50 align-middle font-bold text-slate-800"
                                  >
                                    {reportMode === "day" ? (
                                      <div className="font-mono">{from}</div>
                                    ) : (
                                      <>
                                        <div>من: {from}</div>
                                        <div className="my-1.5 text-slate-400 font-normal">إلى:</div>
                                        <div>{to}</div>
                                      </>
                                    )}
                                  </td>
                                  <td 
                                    rowSpan={filteredInvoices.length} 
                                    className="p-2 text-left border-l border-slate-300 align-middle font-bold text-slate-900"
                                  >
                                    {totalPosValue.toFixed(2)} ر
                                  </td>
                                  <td 
                                    rowSpan={filteredInvoices.length} 
                                    className="p-2 text-left border-l border-slate-300 align-middle font-bold text-slate-600"
                                  >
                                    {cashInput.toFixed(2)} ر
                                  </td>
                                  <td 
                                    rowSpan={filteredInvoices.length} 
                                    className="p-2 text-left border-l border-slate-300 align-middle font-extrabold text-indigo-950 bg-indigo-50/20"
                                  >
                                    {grandTotalWithInjectedCash.toFixed(2)} ر
                                  </td>
                                </>
                              )}

                              {/* Row specific invoice data */}
                              {userRole === "مدير" && (
                                <td className="p-2 text-center border-l border-slate-300 print:hidden">
                                  <input
                                    type="checkbox"
                                    checked={selectedInvoiceIds.includes(inv.id)}
                                    onChange={() => {
                                      if (selectedInvoiceIds.includes(inv.id)) {
                                        setSelectedInvoiceIds(selectedInvoiceIds.filter(id => id !== inv.id));
                                      } else {
                                        setSelectedInvoiceIds([...selectedInvoiceIds, inv.id]);
                                      }
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-slate-500 cursor-pointer h-3.5 w-3.5"
                                  />
                                </td>
                              )}
                              <td className="p-2 text-center border-l border-slate-300 text-slate-500 font-mono">
                                {inv.invoice_date || inv.date}
                              </td>
                              <td className="p-2 text-right border-l border-slate-300 text-slate-800 font-bold">
                                {inv.company}
                              </td>
                              <td className="p-2 text-center border-l border-slate-300 font-mono text-slate-550">
                                {inv.invoice_no || "—"}
                              </td>
                              <td className="p-2 text-left border-l border-slate-300 font-bold text-slate-700 bg-slate-50/10">
                                {inv.amount.toFixed(2)} ر
                              </td>
                              <td className="p-2 text-center print:hidden">
                                {userRole === "مدير" ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditInvoice(inv)}
                                      className="text-indigo-600 hover:text-indigo-800 p-0.5 cursor-pointer transform hover:scale-110 transition-transform"
                                      title="تعديل الفاتورة الضريبية"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteInvoice(inv.id)}
                                      className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer transform hover:scale-110 transition-transform"
                                      title="حذف الفاتورة الضريبية"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                                    🔒 مؤمنة
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}

                      {/* Column totals and formulas according to bookkeeping guidelines */}
                      <tr className="bg-slate-50/75 border-b border-slate-300 font-bold">
                        <td colSpan={4} className="p-2 text-center border-l border-slate-300 text-slate-400 text-[10px] font-normal">نظام تجميع الوعاء الشامل</td>
                        <td colSpan={userRole === "مدير" ? 4 : 3} className="p-2 text-right border-l border-slate-300 text-slate-700 bg-slate-100/50">
                          إجمالي فواتير ومشتريات الدورة المعتمدة (مجموع الفواتير) (2)
                        </td>
                        <td className="p-2 text-left font-extrabold text-rose-700 border-l border-slate-300 bg-rose-50/10">
                          {totalInvoicesAmount.toFixed(2)} ر
                        </td>
                        <td className="print:hidden"></td>
                      </tr>

                      {/* NET difference after deducting the aggregated income from the expenses */}
                      <tr className="bg-slate-100/40 border-b border-slate-300 font-bold">
                        <td colSpan={4} className="p-2 border-l border-slate-300"></td>
                        <td colSpan={userRole === "مدير" ? 4 : 3} className="p-2 text-right border-l border-slate-300 text-slate-700">
                          الفرق الصافي الخاضع للضريبة (خصم الفواتير من مجموع الدخل الموحد = الوعاء 1 - المصروف 2)
                        </td>
                        <td className="p-2 text-left font-extrabold text-slate-900 border-l border-slate-300 bg-slate-50">
                          <span className={grandDifference >= 0 ? "text-emerald-700" : "text-rose-600"}>
                            {grandDifference.toFixed(2)} ر
                          </span>
                        </td>
                        <td className="print:hidden"></td>
                      </tr>

                      {/* VAT Computation Row */}
                      <tr className="bg-slate-50 border-b-2 border-slate-300">
                        <td colSpan={4} className="p-2 border-l border-slate-300 text-slate-400 text-[10px] font-normal print:text-[8px]">الضريبة 15% على الوعاء الصافي للفرق</td>
                        <td colSpan={userRole === "مدير" ? 4 : 3} className="p-2 text-right border-l border-slate-300 text-slate-800 font-bold text-sm">
                          مبلغ ضريبة القيمة المضافة المستحقة المقررة على الفرق
                        </td>
                        <td className="p-2 text-left font-extrabold text-sm text-emerald-800 border-l border-slate-300 bg-emerald-50/20 border-2 border-emerald-500/20">
                          {grandVat.toFixed(2)} ر
                        </td>
                        <td className="print:hidden"></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Informative, ink-saving accounting footer and sign off fields for business legitimacy */}
              <div className="p-4 bg-white text-[9px] text-slate-500 leading-relaxed text-right font-medium">
                <p>
                  * <strong>ملاحظة محاسبية وإدارية:</strong> يصدر هذا الكشف بشكل مالي شامل لأغراض تصفية الفاقد الضريبي والمطابقة مع الهيئة العامة للزكاة والضريبة والجمارك. كافة البنود الواردة تم تجميعها من خلال ربط مباشر لأجهزة الدفع (نقاط بيع سلة/مدى) للفترة المحددة مع المنصرف اليدوي المسجل، وخصم مطالبات المشتريات ومصروفات المواد الأولية والخدمات للفرع بشكل دقيق.
                </p>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-205">
                  <span>إمضاء مراجع الحسابات للفرع: _____________________</span>
                  <span>اعتماد الإدارة الضريبية للشركة: _____________________</span>
                  <span className="font-mono text-slate-400">الفرع النشط: {branch} (A4 LANDSCAPE)</span>
                </div>
              </div>
            </div>

            {/* Print Friendly configuration instructions (Hidden in Print) */}
            <p className="text-[10px] text-slate-400 font-semibold text-center flex items-center justify-center gap-1 print:hidden">
              <span>💡</span>
              <span><strong>نصيحة الطباعة والتوفير:</strong> تم تحسين هذا التقرير ليركز على اللونين الأبيض والرمادي لعدم استهلاك حبر الطابعة. يمكنك طباعة الشهر بالكامل في ورقة واحدة عن طريق تقليل النطاق الزمني أو ضبط خيارات الطباعة متبوعاً باختيار الاتجاه الأفقي (Landscape) عبر المتصفح.</span>
            </p>

          </div>
        )}
      </div>
      )}

      {/* Reusable Polish Safe Custom Confirm Dialog Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="rtl" text-right="true">
            {/* Modal Header */}
            <div className="p-5 flex items-start gap-4 bg-rose-50 border-b border-rose-100">
              <div className="p-2.5 rounded-full flex-shrink-0 bg-rose-100 text-rose-700">
                <Trash className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-base font-bold text-slate-900">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500">منظومة الإدارة المحاسبية الضريبية</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-sm text-slate-700 font-medium leading-relaxed text-right space-y-3">
              <p>{confirmModal.message}</p>
              <div className="bg-amber-50 p-3 rounded-lg text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-1.5 border border-amber-100">
                <span>⚠️</span>
                <span>تنبيه: لا يمكن التراجع عن حذف الفاتورة الضريبية، وسيتم تحديث كشوفات الأرصدة والبيانات تلقائياً لضمان دقة التقارير.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-2 border-t border-slate-100">
              <button
                type="button"
                className="w-full sm:w-auto px-5 py-2.5 font-bold text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(prev => ({ ...prev, show: false }));
                }}
              >
                <span>تأكيد الحذف النهائي</span>
              </button>
              <button
                type="button"
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center cursor-pointer"
                onClick={() => {
                  setConfirmModal(prev => ({ ...prev, show: false }));
                }}
              >
                <span>تراجع وإلغاء</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Pop-up Edit Invoice Modal for "مدير" */}
      {editModal.show && editModal.invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-right" dir="rtl">
            {/* Modal Header */}
            <div className="p-5 flex items-start gap-4 bg-indigo-50 border-b border-indigo-100">
              <div className="p-2.5 rounded-full flex-shrink-0 bg-indigo-100 text-indigo-700">
                <Pen className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-base font-bold text-slate-900">
                  تعديل بيانات هذه الفاتورة الضريبية
                </h3>
                <p className="text-xs text-slate-500 font-medium">تعديل المشتريات والمنعكس بشكل فوري على كشوفات ضريبة القيمة المضافة والشامل</p>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={saveEditedInvoice}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Company Item Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">مورد الفاتورة (اسم المؤسسة / الشركة): <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                    placeholder="مثال: شركة المراعي للصناعات الغذائية"
                  />
                </div>

                {/* Two-Column: Invoice Number & System date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">رقم الفاتورة الضريبية:</label>
                    <input
                      type="text"
                      value={editInvoiceNo}
                      onChange={(e) => setEditInvoiceNo(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                      placeholder="مثال: VAT-492931"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">تاريخ إصدار الفاتورة المكتوب ورقيّاً:</label>
                    <input
                      type="date"
                      value={editInvoiceDate}
                      onChange={(e) => setEditInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                    />
                  </div>
                </div>

                {/* Date of registration on system (for filtering list in range) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">تاريخ التسجيل وقيد النظام للفترة: <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono font-bold text-indigo-900"
                  />
                </div>

                {/* Two-Column: Amount & Branch designation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">المبلغ الإجمالي شامل الضريبة (ر.س): <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-left font-mono font-extrabold text-blue-900"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">تقييد الفرع المستفيد من الفاتورة:</label>
                    <select
                      value={editBranch}
                      onChange={(e) => setEditBranch(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold text-slate-700"
                    >
                      <option value="القادسية">📍 فرع القادسية</option>
                      <option value="المروج">📍 فرع المروج</option>
                    </select>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg text-amber-900 text-[11px] font-bold leading-relaxed flex items-start gap-1.5 border border-amber-100">
                  <span>ℹ️</span>
                  <span>تنبيه المراجعة: سوف يتم تحديث كافّة المجاميع، والوعاء الضريبي، وتقرير القيمة المضافة الموحد الشامل بشكل تلقائي فور تأكيد الحفظ.</span>
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 font-bold text-xs rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <span>💾 حفظ وتعديل الفاتورة</span>
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center cursor-pointer"
                  onClick={() => {
                    setEditModal({ show: false, invoice: null });
                  }}
                >
                  <span>إلغاء والتراجع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
