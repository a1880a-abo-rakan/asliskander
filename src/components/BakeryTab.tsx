import React, { useState, useEffect } from "react";
import { BakeryEntry } from "../types";
import { 
  Save, RefreshCw, ChefHat, ClipboardList, TrendingUp, AlertTriangle, 
  CheckCircle2, AlertCircle, Trash2, Info, ChevronDown, ChevronUp, History,
  FileSpreadsheet, HelpCircle, AlertOctagon, Printer, FileText, Calendar, Clock
} from "lucide-react";

interface BakeryTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
  userBranch?: string;
}

const BREAD_TYPES = [
  { id: "turkish_large", name: "خبز تركي كبير", label: "خبز تركي كبير", color: "border-emerald-200 bg-emerald-50/30 text-emerald-800" },
  { id: "turkish_small", name: "خبز تركي صغير", label: "خبز تركي صغير", color: "border-sky-200 bg-sky-50/30 text-sky-800" },
  { id: "italian", name: "خبز ايطالي", label: "خبز إيطالي", color: "border-amber-200 bg-amber-50/30 text-amber-800" },
  { id: "samouli", name: "صامولي", label: "صامولي", color: "border-purple-200 bg-purple-50/30 text-purple-800" },
  { id: "samoon_small", name: "صمون عراقي صغير", label: "صمون عراقي صغير", color: "border-blue-200 bg-blue-50/30 text-blue-800" },
  { id: "samoon_large", name: "صمون عراقي كبير", label: "صمون عراقي كبير", color: "border-indigo-200 bg-indigo-50/30 text-indigo-800" }
] as const;

const PRODUCTS = [
  { id: "sandwich_small", name: "ساندويش صغير", price: 5, use: { turkish_small: 1 } },
  { id: "sarokh_turkish", name: "صاروخ تركي", price: 10, use: { turkish_large: 1 } },
  { id: "sarokh_double", name: "صاروخ تركي دبل", price: 13, use: { turkish_large: 2 } },
  { id: "sarokh_samouli", name: "صاروخ صامولي", price: 10, use: { samouli: 1 } },
  { id: "iskander_italian", name: "اسكندر ايطالي", price: 18, use: { italian: 1 } },
  { id: "shawarma_iraqi_small", name: "شاورما عراقي صغير", price: 5, use: { samoon_small: 1 } },
  { id: "shawarma_iraqi_large", name: "شاورما عراقي كبير", price: 10, use: { samoon_large: 1 } },
  { id: "shawarma_arabic_small", name: "شاورما عربي صغير", price: 13, use: { turkish_large: 1 } },
  { id: "shawarma_arabic_medium", name: "شاورما عربي وسط", price: 18, use: { turkish_large: 1, turkish_small: 1 } },
  { id: "shawarma_arabic_large", name: "شاورما عربي كبير", price: 23, use: { turkish_large: 2 } },
  { id: "iskander_small", name: "صحن اسكندر صغير", price: 28, use: { turkish_large: 4 } },
  { id: "iskander_medium", name: "صحن اسكندر وسط", price: 43, use: { turkish_large: 6 } },
  { id: "iskander_large", name: "صحن اسكندر كبير", price: 53, use: { turkish_large: 8 } }
] as const;

const initialFormState = {
  date: new Date().toISOString().split("T")[0],
  branch: "القادسية" as "القادسية" | "المروج",
  
  arrived_turkish_large: 0,
  arrived_turkish_small: 0,
  arrived_italian: 0,
  arrived_samouli: 0,
  arrived_samoon_small: 0,
  arrived_samoon_large: 0,

  sold_sarokh_turkish: 0,
  sold_sandwich_small: 0,
  sold_sarokh_double: 0,
  sold_shawarma_arabic_small: 0,
  sold_shawarma_arabic_medium: 0,
  sold_shawarma_arabic_large: 0,
  sold_iskander_small: 0,
  sold_iskander_medium: 0,
  sold_iskander_large: 0,
  sold_iskander_italian: 0,
  sold_sarokh_samouli: 0,
  sold_shawarma_iraqi_small: 0,
  sold_shawarma_iraqi_large: 0,

  wasted_turkish_large: 0,
  wasted_turkish_small: 0,
  wasted_italian: 0,
  wasted_samouli: 0,
  wasted_samoon_small: 0,
  wasted_samoon_large: 0,

  staff_turkish_large: 0,
  staff_turkish_small: 0,
  staff_italian: 0,
  staff_samouli: 0,
  staff_samoon_small: 0,
  staff_samoon_large: 0,

  shared_turkish_large: 0,
  shared_turkish_small: 0,
  shared_italian: 0,
  shared_samouli: 0,
  shared_samoon_small: 0,
  shared_shared_turkish_large: 0, // safe fallback
  shared_samoon_large: 0,

  actual_sales: 0,
  notes: ""
};

export default function BakeryTab({ onShowToast, userRole, userBranch }: BakeryTabProps) {
  const [form, setForm] = useState(initialFormState);
  const [history, setHistory] = useState<BakeryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"form" | "history" | "report">("form");
  const [historyFilterBranch, setHistoryFilterBranch] = useState<string>("الكل");
  const [isCalculationsOpen, setIsCalculationsOpen] = useState(true);

  // Report Filter States
  const [reportBranch, setReportBranch] = useState<"القادسية" | "المروج">("القادسية");
  const [reportType, setReportType] = useState<"day" | "range">("day");
  const [reportSingleDate, setReportSingleDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split("T")[0]);

  // Set initial branch based on user branch restrictions
  useEffect(() => {
    if (userBranch && userBranch !== "الكل") {
      setForm((prev) => ({ ...prev, branch: userBranch as "القادسية" | "المروج" }));
      setReportBranch(userBranch as "القادسية" | "المروج");
    }
  }, [userBranch]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bakery");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      } else {
        onShowToast("❌ فشل تحميل سجل المخبز");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء تحميل سجل المخبز");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleInputChange = (field: keyof typeof initialFormState, val: string | number) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleNumberInput = (field: keyof typeof initialFormState, val: string) => {
    const num = parseInt(val) || 0;
    handleInputChange(field, num >= 0 ? num : 0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === "مدخل فواتير") {
      onShowToast("⚠️ عذراً! صلاحيات مدخل الفواتير لا تسمح بتعديل ضبط المخبز");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bakery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        onShowToast("✅ تم حفظ سجل ضبط المخبز بنجاح");
        loadHistory();
        // Clear form except date and branch
        setForm((prev) => ({
          ...initialFormState,
          date: prev.date,
          branch: prev.branch
        }));
      } else {
        const errData = await res.json().catch(() => ({ error: "خطأ غير معروف في الخادم" }));
        onShowToast(`❌ فشل في الحفظ: ${errData.error || "خطأ غير معروف"}`);
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء حفظ السجل");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (userRole !== "مدير") {
      onShowToast("⚠️ عذراً! هذه الصلاحية للمدير فقط");
      return;
    }

    if (!confirm("هل أنت متأكد من رغبتك في حذف هذا السجل؟")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/bakery/${id}`, { method: "DELETE" });
      if (res.ok) {
        onShowToast("🗑️ تم حذف السجل بنجاح");
        loadHistory();
      } else {
        onShowToast("❌ فشل في حذف السجل");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء حذف السجل");
    } finally {
      setLoading(false);
    }
  };

  const loadRecordIntoForm = (record: BakeryEntry) => {
    setForm({
      date: record.date,
      branch: record.branch,
      arrived_turkish_large: record.arrived_turkish_large || 0,
      arrived_turkish_small: record.arrived_turkish_small || 0,
      arrived_italian: record.arrived_italian || 0,
      arrived_samouli: record.arrived_samouli || 0,
      arrived_samoon_small: record.arrived_samoon_small || 0,
      arrived_samoon_large: record.arrived_samoon_large || 0,

      sold_sarokh_turkish: record.sold_sarokh_turkish || 0,
      sold_sandwich_small: record.sold_sandwich_small || 0,
      sold_sarokh_double: record.sold_sarokh_double || 0,
      sold_shawarma_arabic_small: record.sold_shawarma_arabic_small || 0,
      sold_shawarma_arabic_medium: record.sold_shawarma_arabic_medium || 0,
      sold_shawarma_arabic_large: record.sold_shawarma_arabic_large || 0,
      sold_iskander_small: record.sold_iskander_small || 0,
      sold_iskander_medium: record.sold_iskander_medium || 0,
      sold_iskander_large: record.sold_iskander_large || 0,
      sold_iskander_italian: record.sold_iskander_italian || 0,
      sold_sarokh_samouli: record.sold_sarokh_samouli || 0,
      sold_shawarma_iraqi_small: record.sold_shawarma_iraqi_small || 0,
      sold_shawarma_iraqi_large: record.sold_shawarma_iraqi_large || 0,

      wasted_turkish_large: record.wasted_turkish_large || 0,
      wasted_turkish_small: record.wasted_turkish_small || 0,
      wasted_italian: record.wasted_italian || 0,
      wasted_samouli: record.wasted_samouli || 0,
      wasted_samoon_small: record.wasted_samoon_small || 0,
      wasted_samoon_large: record.wasted_samoon_large || 0,

      staff_turkish_large: record.staff_turkish_large || 0,
      staff_turkish_small: record.staff_turkish_small || 0,
      staff_italian: record.staff_italian || 0,
      staff_samouli: record.staff_samouli || 0,
      staff_samoon_small: record.staff_samoon_small || 0,
      staff_samoon_large: record.staff_samoon_large || 0,

      shared_turkish_large: record.shared_turkish_large || 0,
      shared_turkish_small: record.shared_turkish_small || 0,
      shared_italian: record.shared_italian || 0,
      shared_samouli: record.shared_samouli || 0,
      shared_samoon_small: record.shared_samoon_small || 0,
      shared_shared_turkish_large: record.shared_turkish_large || 0,
      shared_samoon_large: record.shared_samoon_large || 0,

      actual_sales: record.actual_sales || 0,
      notes: record.notes || ""
    });
    setActiveSubTab("form");
    onShowToast(`📂 تم تحميل السجل لفرع ${record.branch} بتاريخ ${record.date}`);
  };

  // --- CALCULATIONS ENGINE ---
  const calculateMetrics = (inputForm: typeof form) => {
    // 1. Compute total bread arrived
    const arrived = {
      turkish_large: inputForm.arrived_turkish_large,
      turkish_small: inputForm.arrived_turkish_small,
      italian: inputForm.arrived_italian,
      samouli: inputForm.arrived_samouli,
      samoon_small: inputForm.arrived_samoon_small,
      samoon_large: inputForm.arrived_samoon_large
    };

    // 2. Compute sold product values and theoretical sales
    let theoreticalSales = 0;
    const sold = {
      sarokh_turkish: inputForm.sold_sarokh_turkish,
      sandwich_small: inputForm.sold_sandwich_small,
      sarokh_double: inputForm.sold_sarokh_double,
      shawarma_arabic_small: inputForm.sold_shawarma_arabic_small,
      shawarma_arabic_medium: inputForm.sold_shawarma_arabic_medium,
      shawarma_arabic_large: inputForm.sold_shawarma_arabic_large,
      iskander_small: inputForm.sold_iskander_small,
      iskander_medium: inputForm.sold_iskander_medium,
      iskander_large: inputForm.sold_iskander_large,
      iskander_italian: inputForm.sold_iskander_italian,
      sarokh_samouli: inputForm.sold_sarokh_samouli,
      shawarma_iraqi_small: inputForm.sold_shawarma_iraqi_small,
      shawarma_iraqi_large: inputForm.sold_shawarma_iraqi_large
    };

    PRODUCTS.forEach((p) => {
      const qty = sold[p.id as keyof typeof sold] || 0;
      theoreticalSales += qty * p.price;
    });

    // 3. Compute consumed bread per type from products
    const consumed = {
      turkish_large: 0,
      turkish_small: 0,
      italian: 0,
      samouli: 0,
      samoon_small: 0,
      samoon_large: 0
    };

    PRODUCTS.forEach((p) => {
      const qty = sold[p.id as keyof typeof sold] || 0;
      Object.entries(p.use).forEach(([breadId, count]) => {
        if (breadId in consumed) {
          consumed[breadId as keyof typeof consumed] += count * qty;
        }
      });
    });

    // 4. Compute losses (wasted, staff, shared)
    const wasted = {
      turkish_large: inputForm.wasted_turkish_large,
      turkish_small: inputForm.wasted_turkish_small,
      italian: inputForm.wasted_italian,
      samouli: inputForm.wasted_samouli,
      samoon_small: inputForm.wasted_samoon_small,
      samoon_large: inputForm.wasted_samoon_large
    };

    const staff = {
      turkish_large: inputForm.staff_turkish_large,
      turkish_small: inputForm.staff_turkish_small,
      italian: inputForm.staff_italian,
      samouli: inputForm.staff_samouli,
      samoon_small: inputForm.staff_samoon_small,
      samoon_large: inputForm.staff_samoon_large
    };

    const shared = {
      turkish_large: inputForm.shared_turkish_large,
      turkish_small: inputForm.shared_turkish_small,
      italian: inputForm.shared_italian,
      samouli: inputForm.shared_samouli,
      samoon_small: inputForm.shared_samoon_small,
      samoon_large: inputForm.shared_samoon_large
    };

    // 5. Build reconciliation summary per bread type
    const breadDetails = BREAD_TYPES.map((b) => {
      const arr = arrived[b.id] || 0;
      const cons = consumed[b.id] || 0;
      const wast = wasted[b.id] || 0;
      const stf = staff[b.id] || 0;
      const shd = shared[b.id] || 0;
      const totalAccounted = cons + wast + stf + shd;
      const variance = arr - totalAccounted; // positive = surplus, negative = deficit

      let status: "perfect" | "deficit" | "surplus" = "perfect";
      if (variance < 0) status = "deficit";
      else if (variance > 0) status = "surplus";

      return {
        ...b,
        arrived: arr,
        consumed: cons,
        wasted: wast,
        staff: stf,
        shared: shd,
        totalAccounted,
        variance,
        status
      };
    });

    // Financial reconciliation
    const cashVariance = inputForm.actual_sales - theoreticalSales;

    // AI Prediction/Advisory logic
    const alerts: { text: string; type: "error" | "warning" | "success" }[] = [];

    // Check bread variances
    const hasMajorBreadDeficit = breadDetails.some((b) => b.variance < -10);
    const hasMajorBreadSurplus = breadDetails.some((b) => b.variance > 10);

    if (hasMajorBreadDeficit) {
      alerts.push({
        text: "ثمة عجز ملحوظ في بعض أنواع الخبز! قد يشير هذا إلى وجود مبيعات غير مسجلة بالكامل، أو هدر لم يتم تدوينه في قسم التالف أو طعام العمال.",
        type: "error"
      });
    }

    if (hasMajorBreadSurplus) {
      alerts.push({
        text: "ثمة فائض خبز مسجل في المطابقة! يعني ذلك أن الخبز الفعلي الوارد أكبر بكثير من المباع والتالف، قد يعود ذلك لخطأ في عد الخبز المستلم أو عدم تسجيل هدر فعلي.",
        type: "warning"
      });
    }

    // Check cash variance
    if (inputForm.actual_sales > 0) {
      if (cashVariance < -20) {
        alerts.push({
          text: `يوجد نقص مالي قدره (${Math.abs(cashVariance)} ريال) بين المبيعات الفعلية والمبيعات النظرية للطلبات المدخلة. ينصح بمطابقة الصندوق وإيصالات مدى فوراً.`,
          type: "error"
        });
      } else if (cashVariance > 20) {
        alerts.push({
          text: `يوجد فائض مالي قدره (${cashVariance} ريال) مقارنة بالاستهلاك النظري للخبز. قد يشير هذا إلى مبيعات إضافية غير مدعومة باستهلاك خبز أو خطأ إدخال الكميات.`,
          type: "warning"
        });
      } else {
        alerts.push({
          text: "المطابقة المالية ممتازة! الفارق بين المبيعات الفعلية والنظرية يقع في النطاق الآمن المقبول.",
          type: "success"
        });
      }
    }

    if (alerts.length === 0) {
      alerts.push({
        text: "كل المؤشرات سليمة وضمن النطاق الطبيعي للتشغيل اليومي للمخبز والصندوق.",
        type: "success"
      });
    }

    return {
      theoreticalSales,
      cashVariance,
      breadDetails,
      alerts
    };
  };

  const metrics = calculateMetrics(form);

  const filteredHistory = history.filter((h) => {
    if (historyFilterBranch === "الكل") return true;
    return h.branch === historyFilterBranch;
  });

  // --- AGGREGATED REPORT CALCULATIONS ---
  const getReportRecords = () => {
    const branchRecords = history.filter((h) => h.branch === reportBranch);
    if (reportType === "day") {
      return branchRecords.filter((h) => h.date === reportSingleDate);
    } else {
      return branchRecords.filter((h) => h.date >= reportStartDate && h.date <= reportEndDate);
    }
  };

  const reportRecords = getReportRecords();

  const calculateAggregatedMetrics = (records: BakeryEntry[]) => {
    const aggregatedForm = {
      date: "",
      branch: reportBranch,
      arrived_turkish_large: 0,
      arrived_turkish_small: 0,
      arrived_italian: 0,
      arrived_samouli: 0,
      arrived_samoon_small: 0,
      arrived_samoon_large: 0,
      sold_sarokh_turkish: 0,
      sold_sandwich_small: 0,
      sold_sarokh_double: 0,
      sold_shawarma_arabic_small: 0,
      sold_shawarma_arabic_medium: 0,
      sold_shawarma_arabic_large: 0,
      sold_iskander_small: 0,
      sold_iskander_medium: 0,
      sold_iskander_large: 0,
      sold_iskander_italian: 0,
      sold_sarokh_samouli: 0,
      sold_shawarma_iraqi_small: 0,
      sold_shawarma_iraqi_large: 0,
      wasted_turkish_large: 0,
      wasted_turkish_small: 0,
      wasted_italian: 0,
      wasted_samouli: 0,
      wasted_samoon_small: 0,
      wasted_samoon_large: 0,
      staff_turkish_large: 0,
      staff_turkish_small: 0,
      staff_italian: 0,
      staff_samouli: 0,
      staff_samoon_small: 0,
      staff_samoon_large: 0,
      shared_turkish_large: 0,
      shared_turkish_small: 0,
      shared_italian: 0,
      shared_samouli: 0,
      shared_samoon_small: 0,
      shared_shared_turkish_large: 0,
      shared_samoon_large: 0,
      actual_sales: 0,
      notes: ""
    };

    records.forEach((r) => {
      aggregatedForm.arrived_turkish_large += r.arrived_turkish_large || 0;
      aggregatedForm.arrived_turkish_small += r.arrived_turkish_small || 0;
      aggregatedForm.arrived_italian += r.arrived_italian || 0;
      aggregatedForm.arrived_samouli += r.arrived_samouli || 0;
      aggregatedForm.arrived_samoon_small += r.arrived_samoon_small || 0;
      aggregatedForm.arrived_samoon_large += r.arrived_samoon_large || 0;

      aggregatedForm.sold_sarokh_turkish += r.sold_sarokh_turkish || 0;
      aggregatedForm.sold_sandwich_small += r.sold_sandwich_small || 0;
      aggregatedForm.sold_sarokh_double += r.sold_sarokh_double || 0;
      aggregatedForm.sold_shawarma_arabic_small += r.sold_shawarma_arabic_small || 0;
      aggregatedForm.sold_shawarma_arabic_medium += r.sold_shawarma_arabic_medium || 0;
      aggregatedForm.sold_shawarma_arabic_large += r.sold_shawarma_arabic_large || 0;
      aggregatedForm.sold_iskander_small += r.sold_iskander_small || 0;
      aggregatedForm.sold_iskander_medium += r.sold_iskander_medium || 0;
      aggregatedForm.sold_iskander_large += r.sold_iskander_large || 0;
      aggregatedForm.sold_iskander_italian += r.sold_iskander_italian || 0;
      aggregatedForm.sold_sarokh_samouli += r.sold_sarokh_samouli || 0;
      aggregatedForm.sold_shawarma_iraqi_small += r.sold_shawarma_iraqi_small || 0;
      aggregatedForm.sold_shawarma_iraqi_large += r.sold_shawarma_iraqi_large || 0;

      aggregatedForm.wasted_turkish_large += r.wasted_turkish_large || 0;
      aggregatedForm.wasted_turkish_small += r.wasted_turkish_small || 0;
      aggregatedForm.wasted_italian += r.wasted_italian || 0;
      aggregatedForm.wasted_samouli += r.wasted_samouli || 0;
      aggregatedForm.wasted_samoon_small += r.wasted_samoon_small || 0;
      aggregatedForm.wasted_samoon_large += r.wasted_samoon_large || 0;

      aggregatedForm.staff_turkish_large += r.staff_turkish_large || 0;
      aggregatedForm.staff_turkish_small += r.staff_turkish_small || 0;
      aggregatedForm.staff_italian += r.staff_italian || 0;
      aggregatedForm.staff_samouli += r.staff_samouli || 0;
      aggregatedForm.staff_samoon_small += r.staff_samoon_small || 0;
      aggregatedForm.staff_samoon_large += r.staff_samoon_large || 0;

      aggregatedForm.shared_turkish_large += r.shared_turkish_large || 0;
      aggregatedForm.shared_turkish_small += r.shared_turkish_small || 0;
      aggregatedForm.shared_italian += r.shared_italian || 0;
      aggregatedForm.shared_samouli += r.shared_samouli || 0;
      aggregatedForm.shared_samoon_small += r.shared_samoon_small || 0;
      aggregatedForm.shared_shared_turkish_large += r.shared_turkish_large || 0;
      aggregatedForm.shared_samoon_large += r.shared_samoon_large || 0;

      aggregatedForm.actual_sales += r.actual_sales || 0;
    });

    return calculateMetrics(aggregatedForm);
  };

  const reportMetrics = calculateAggregatedMetrics(reportRecords);

  return (
    <div className="space-y-6 RTL text-right" dir="rtl">
      {/* Tab Selector */}
      <div className="flex border-b border-slate-100 pb-3 gap-2 print:hidden">
        <button
          onClick={() => setActiveSubTab("form")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeSubTab === "form"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-100"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <ChefHat className="w-4 h-4" />
          نموذج الضبط والمطابقة
        </button>
        <button
          onClick={() => setActiveSubTab("report")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeSubTab === "report"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-100"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FileText className="w-4 h-4" />
          تقرير مطابقة وجرد المخبز للطباعة 📊
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            activeSubTab === "history"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-100"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <History className="w-4 h-4" />
          سجل التسويات والتقارير ({history.length})
        </button>
      </div>

      {activeSubTab === "form" && (
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* TOP CONTROLS & BRANCH/DATE CARD */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-emerald-500" />
              تحديد الفرع وتاريخ المطابقة
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">الفرع</label>
                <select
                  value={form.branch}
                  onChange={(e) => handleInputChange("branch", e.target.value as any)}
                  disabled={!!userBranch && userBranch !== "الكل"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400 font-medium"
                >
                  <option value="القادسية">فرع القادسية</option>
                  <option value="المروج">فرع المروج</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">التاريخ</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none font-mono font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">المبيعات الفعلية (ريال) <span className="text-slate-300 font-normal">(اختياري للمطابقة المالية)</span></label>
                <input
                  type="number"
                  placeholder="مثال: 1250"
                  value={form.actual_sales || ""}
                  onChange={(e) => handleInputChange("actual_sales", parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none font-mono font-medium"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* INPUTS COLUMN: 7 SPAN */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* ARRIVED BREAD CARD */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <ChefHat className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">1. الخبز الوارد إلى المحل</h3>
                    <p className="text-xs text-slate-400">إجمالي كميات الخبز المستلمة من الموردين اليوم</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {BREAD_TYPES.map((b) => (
                    <div key={b.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                      <label className="block text-xs font-bold text-slate-600 mb-1.5">{b.name}</label>
                      <input
                        type="number"
                        min="0"
                        value={form[`arrived_${b.id}` as keyof typeof form] || ""}
                        onChange={(e) => handleNumberInput(`arrived_${b.id}` as any, e.target.value)}
                        placeholder="0"
                        className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-center text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* PRODUCTS SOLD CARD */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6">
                <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
                  <span className="p-2 bg-sky-50 rounded-lg text-sky-600">
                    <TrendingUp className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">2. عدد الطلبات والمبيعات للمنتجات</h3>
                    <p className="text-xs text-slate-400">أدخل أعداد الوجبات المباعة ليقوم المحرك باحتساب استهلاك الخبز تلقائياً</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {PRODUCTS.map((p) => (
                    <div key={p.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/20">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-700">{p.name}</label>
                        <span className="text-[10px] text-slate-400 font-mono">{p.price} ريال</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={form[`sold_${p.id}` as keyof typeof form] || ""}
                        onChange={(e) => handleNumberInput(`sold_${p.id}` as any, e.target.value)}
                        placeholder="0"
                        className="w-full bg-white border border-slate-200 rounded-md p-1.5 text-center text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                      />
                      <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-1">
                        {Object.entries(p.use).map(([breadId, count]) => {
                          const breadLabel = BREAD_TYPES.find(b => b.id === breadId)?.name || breadId;
                          return (
                            <span key={breadId} className="bg-slate-100 px-1 rounded">
                              {count} {breadLabel}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WASTAGE AND INTERNAL CONSUMPTION ACCORDION */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6">
                <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-amber-50 rounded-lg text-amber-600">
                      <AlertTriangle className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">3. الهدر والاستهلاك الداخلي (الفقد والتسويات)</h3>
                      <p className="text-xs text-slate-400">سجل الخبز التالف، أكل العمال، أو ما تم تبادله كمنفعة مع المحلات المجاورة</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* WASTED BREAD */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      الخبز التالف / المهدور (المنتهي)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                      {BREAD_TYPES.map((b) => (
                        <div key={b.id} className="p-2 rounded-lg border border-slate-50 bg-slate-50/20">
                          <label className="block text-[10px] font-semibold text-slate-500 text-center mb-1 truncate">{b.name}</label>
                          <input
                            type="number"
                            min="0"
                            value={form[`wasted_${b.id}` as keyof typeof form] || ""}
                            onChange={(e) => handleNumberInput(`wasted_${b.id}` as any, e.target.value)}
                            placeholder="0"
                            className="w-full bg-white border border-slate-200 rounded p-1 text-center text-xs font-semibold font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* STAFF BREAD */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                      أكل العمال (وجبات الكادر الداخلي)
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                      {BREAD_TYPES.map((b) => (
                        <div key={b.id} className="p-2 rounded-lg border border-slate-50 bg-slate-50/20">
                          <label className="block text-[10px] font-semibold text-slate-500 text-center mb-1 truncate">{b.name}</label>
                          <input
                            type="number"
                            min="0"
                            value={form[`staff_${b.id}` as keyof typeof form] || ""}
                            onChange={(e) => handleNumberInput(`staff_${b.id}` as any, e.target.value)}
                            placeholder="0"
                            className="w-full bg-white border border-slate-200 rounded p-1 text-center text-xs font-semibold font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SHARED BREAD */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      تبادل المنافع مع المحلات المجاورة
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                      {BREAD_TYPES.map((b) => (
                        <div key={b.id} className="p-2 rounded-lg border border-slate-50 bg-slate-50/20">
                          <label className="block text-[10px] font-semibold text-slate-500 text-center mb-1 truncate">{b.name}</label>
                          <input
                            type="number"
                            min="0"
                            value={form[`shared_${b.id}` as keyof typeof form] || ""}
                            onChange={(e) => handleNumberInput(`shared_${b.id}` as any, e.target.value)}
                            placeholder="0"
                            className="w-full bg-white border border-slate-200 rounded p-1 text-center text-xs font-semibold font-mono"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* NOTES CARD */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6">
                <label className="block text-sm font-bold text-slate-800 mb-1.5">ملاحظات تسوية المخبز</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="أدخل أي ملاحظات حول جودة الخبز اليوم، نقص من المورد، أو هدر طارئ..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                />
              </div>

              {/* SAVE BUTTON */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  حفظ وتسجيل مطابقة المخبز اليومية
                </button>
              </div>

            </div>

            {/* DASHBOARD & REALTIME CALCULATIONS: 5 SPAN */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* REAL-TIME METRICS WIDGET */}
              <div className="bg-white rounded-xl shadow-md border border-slate-100 p-6 sticky top-6 space-y-6">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                      <TrendingUp className="w-5 h-5" />
                    </span>
                    <h3 className="font-bold text-slate-800 text-sm">لوحة المؤشرات والتحليل المباشر</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCalculationsOpen(!isCalculationsOpen)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {isCalculationsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isCalculationsOpen && (
                  <>
                    {/* FINANCIAL METRICS SUMMARY */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">المبيعات النظرية المتوقعة</span>
                        <span className="text-xl font-bold text-slate-800 font-mono">{metrics.theoreticalSales}</span>
                        <span className="text-[10px] text-slate-400 block">ريال</span>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
                        <span className="text-[10px] font-semibold text-slate-400 block mb-1">الفارق المالي الحالي</span>
                        <span className={`text-xl font-bold font-mono block ${
                          metrics.cashVariance < 0 ? "text-red-500" : metrics.cashVariance > 0 ? "text-amber-500" : "text-emerald-500"
                        }`}>
                          {metrics.cashVariance > 0 ? `+${metrics.cashVariance}` : metrics.cashVariance}
                        </span>
                        <span className="text-[10px] text-slate-400 block">ريال</span>
                      </div>
                    </div>

                    {/* AI DIAGNOSTICS & ADVISORY BOX */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">تشخيص محرك المخبز الذكي:</span>
                      <div className="space-y-2">
                        {metrics.alerts.map((alert, idx) => (
                          <div 
                            key={idx} 
                            className={`p-3 rounded-lg border text-xs flex gap-2 items-start ${
                              alert.type === "error" 
                                ? "bg-red-50 border-red-100 text-red-800" 
                                : alert.type === "warning" 
                                ? "bg-amber-50 border-amber-100 text-amber-800" 
                                : "bg-emerald-50 border-emerald-100 text-emerald-800"
                            }`}
                          >
                            {alert.type === "error" && <AlertOctagon className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />}
                            {alert.type === "warning" && <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />}
                            {alert.type === "success" && <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />}
                            <span>{alert.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BREAD QUANTITY MATCHING TABLE */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">مطابقة حبات الخبز (تفصيلي):</span>
                      <div className="border border-slate-100 rounded-lg overflow-hidden text-xs">
                        <div className="bg-slate-50 p-2.5 grid grid-cols-12 gap-1 font-bold text-slate-600 border-b border-slate-100">
                          <span className="col-span-4">النوع</span>
                          <span className="col-span-2 text-center">الوارد</span>
                          <span className="col-span-2 text-center">المباع</span>
                          <span className="col-span-2 text-center">الفقد</span>
                          <span className="col-span-2 text-center">الفارق</span>
                        </div>
                        <div className="divide-y divide-slate-50">
                          {metrics.breadDetails.map((b) => (
                            <div key={b.id} className="p-2.5 grid grid-cols-12 gap-1 items-center hover:bg-slate-50/50">
                              <span className="col-span-4 font-semibold text-slate-700">{b.name}</span>
                              <span className="col-span-2 text-center font-mono font-bold">{b.arrived}</span>
                              <span className="col-span-2 text-center font-mono text-slate-500">{b.consumed}</span>
                              <span className="col-span-2 text-center font-mono text-slate-400">
                                {b.wasted + b.staff + b.shared}
                              </span>
                              <span className={`col-span-2 text-center font-mono font-bold ${
                                b.variance < 0 ? "text-red-500" : b.variance > 0 ? "text-amber-500" : "text-emerald-500"
                              }`}>
                                {b.variance > 0 ? `+${b.variance}` : b.variance}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* GRAPHICAL SUMMARY */}
                    <div className="bg-emerald-50/30 rounded-lg border border-emerald-100 p-4 text-xs space-y-2">
                      <h4 className="font-bold text-emerald-900 flex items-center gap-1">
                        <Info className="w-4 h-4 text-emerald-600" />
                        دليل ضبط المخبز المعتمد:
                      </h4>
                      <p className="text-emerald-800 leading-relaxed">
                        يقارن النظام كميات الخبز المستلمة بطلبيات الكاشير لضمان عدم وجود هدر غير مسجل أو اختلالات مالية. يتم حساب الهدر كالتالي:
                        <br />
                        <span className="font-semibold">الوارد - (المباع + التالف + العمال + تبادل المنافع) = الفارق المتبقي</span>.
                      </p>
                    </div>

                  </>
                )}
              </div>

            </div>

          </div>

        </form>
      )}

      {activeSubTab === "history" && (
        /* HISTORY TAB */
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">سجلات تسويات المخبز السابقة</h3>
              <p className="text-xs text-slate-400">تصفح العمليات التاريخية، العجوزات المكتشفة، والتعديلات السابقة</p>
            </div>

            {/* FILTERS */}
            <div className="flex gap-2">
              <select
                value={historyFilterBranch}
                onChange={(e) => setHistoryFilterBranch(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
              >
                <option value="الكل">جميع الفروع</option>
                <option value="القادسية">فرع القادسية</option>
                <option value="المروج">فرع المروج</option>
              </select>
              <button
                onClick={loadHistory}
                disabled={loading}
                className="bg-slate-100 hover:bg-slate-200 p-2 rounded-lg text-slate-600 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">لا يوجد سجلات ضبط مخبز مدخلة حالياً للفرع المحدد</p>
              <p className="text-xs text-slate-400 mt-1">ابدأ بملء نموذج الضبط اليومي وحفظه لإظهاره هنا</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-600">
                <thead className="text-xs text-slate-700 bg-slate-50 rounded-lg">
                  <tr>
                    <th className="px-4 py-3">التاريخ</th>
                    <th className="px-4 py-3">الفرع</th>
                    <th className="px-4 py-3 text-center">المباع نظرياً (ريال)</th>
                    <th className="px-4 py-3 text-center">المبيعات الفعلية (ريال)</th>
                    <th className="px-4 py-3 text-center">الفارق المالي</th>
                    <th className="px-4 py-3 text-center">حالة المطابقة</th>
                    <th className="px-4 py-3">ملاحظات</th>
                    <th className="px-4 py-3 text-left">التحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((h) => {
                    const recMetrics = calculateMetrics(h as any);
                    const isPerfect = Math.abs(recMetrics.cashVariance) <= 20 && recMetrics.breadDetails.every(b => Math.abs(b.variance) <= 5);
                    const hasSevereError = recMetrics.cashVariance < -100 || recMetrics.breadDetails.some(b => b.variance < -25);

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-900">{h.date}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            h.branch === "القادسية" ? "bg-indigo-50 text-indigo-700" : "bg-purple-50 text-purple-700"
                          }`}>
                            {h.branch}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold">{recMetrics.theoreticalSales}</td>
                        <td className="px-4 py-3 text-center font-mono font-semibold">{h.actual_sales || 0}</td>
                        <td className={`px-4 py-3 text-center font-mono font-bold ${
                          recMetrics.cashVariance < 0 ? "text-red-500" : recMetrics.cashVariance > 0 ? "text-amber-500" : "text-emerald-500"
                        }`}>
                          {recMetrics.cashVariance > 0 ? `+${recMetrics.cashVariance}` : recMetrics.cashVariance}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isPerfect 
                              ? "bg-emerald-50 text-emerald-700" 
                              : hasSevereError 
                              ? "bg-red-50 text-red-700 animate-pulse" 
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {isPerfect ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                مطابقة تامة
                              </>
                            ) : hasSevereError ? (
                              <>
                                <AlertOctagon className="w-3.5 h-3.5" />
                                عجز حرج
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5" />
                                فروقات طفيفة
                              </>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate" title={h.notes || ""}>
                          {h.notes || <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => loadRecordIntoForm(h)}
                              className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded transition-all cursor-pointer"
                              title="تعديل السجل"
                            >
                              📂 عرض وتعديل
                            </button>
                            {userRole === "مدير" && (
                              <button
                                onClick={() => handleDelete(h.id)}
                                className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-all cursor-pointer"
                                title="حذف السجل"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeSubTab === "report" && (
        <div className="space-y-6">
          {/* REPORT CONTROLS (print:hidden) */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6 print:hidden space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                خيارات توليد تقرير مطابقة المخبز
              </h3>
              <p className="text-xs text-slate-400">توليد تقارير جرد رسمية قابلة للطباعة والتصدير</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">الفرع</label>
                <select
                  value={reportBranch}
                  onChange={(e) => setReportBranch(e.target.value as any)}
                  disabled={!!userBranch && userBranch !== "الكل"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none disabled:bg-slate-100"
                >
                  <option value="القادسية">فرع القادسية</option>
                  <option value="المروج">فرع المروج</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">نطاق التقرير</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="day">ليوم محدد (يومي)</option>
                  <option value="range">لمدى زمني (فترة)</option>
                </select>
              </div>

              {reportType === "day" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">تاريخ اليوم</label>
                  <input
                    type="date"
                    value={reportSingleDate}
                    onChange={(e) => setReportSingleDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">من تاريخ</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">إلى تاريخ</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-mono font-semibold focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-50">
              <span className="text-xs text-slate-400">
                تم العثور على <span className="font-bold text-slate-700">{reportRecords.length}</span> سجلات مطابقة لهذه الفترة والفرع.
              </span>
              <button
                onClick={() => window.print()}
                disabled={reportRecords.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                تحميل وطباعة التقرير (موفر للحبر)
              </button>
            </div>
          </div>

          {reportRecords.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 print:bg-white print:border-none">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3 print:hidden" />
              <p className="text-sm font-bold text-slate-500">لا توجد سجلات مطابقة مخزنة للفترة المحددة</p>
              <p className="text-xs text-slate-400 mt-1">يرجى تغيير نطاق التواريخ أو الفرع، أو إضافة تسوية جديدة في نموذج المخبز.</p>
            </div>
          ) : (
            /* PRINTABLE REPORT CARD */
            <div id="printable-bakery-report-area" className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-8 print:space-y-4 print:shadow-none print:border-none print:p-0 print-report-area animate-fade-in">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  header, nav, aside, footer, .print\\:hidden, button, [role="alert"], .no-print {
                    display: none !important;
                  }
                  @page {
                    size: A4 portrait;
                    margin: 15mm 15mm 15mm 15mm;
                  }
                  body {
                    background: #ffffff !important;
                    color: #0f172a !important;
                    font-size: 10px !important;
                    line-height: 1.25 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                  }
                  .print-report-area {
                    padding: 10mm 12mm !important;
                    margin: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    width: 100% !important;
                    max-width: 100% !important;
                  }
                  .print-report-area > div {
                    margin-bottom: 8px !important;
                    margin-top: 0 !important;
                  }
                  .print-space-y-compact > :not([hidden]) ~ :not([hidden]) {
                    margin-top: 6px !important;
                    margin-bottom: 0 !important;
                  }
                  .print-grid {
                    display: grid !important;
                    grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
                    gap: 8px !important;
                  }
                  .print-col-span-8 {
                    grid-column: span 8 / span 8 !important;
                  }
                  .print-col-span-4 {
                    grid-column: span 4 / span 4 !important;
                  }
                  table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                  }
                  th, td {
                    padding: 3px 5px !important;
                    font-size: 9px !important;
                    border: 1px solid #cbd5e1 !important;
                    line-height: 1.2 !important;
                  }
                  th {
                    font-weight: bold !important;
                    background-color: #f1f5f9 !important;
                    color: #1e293b !important;
                  }
                  .print-avoid-break {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                  .print-bg-emerald {
                    background-color: #f0fdf4 !important;
                    border-color: #cbd5e1 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .print-bg-sky {
                    background-color: #f0f9ff !important;
                    border-color: #cbd5e1 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .print-bg-amber {
                    background-color: #fffbeb !important;
                    border-color: #cbd5e1 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .print-bg-red {
                    background-color: #fef2f2 !important;
                    border-color: #fca5a5 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .print-bg-purple {
                    background-color: #faf5ff !important;
                    border-color: #cbd5e1 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  .print-bg-slate {
                    background-color: #f8fafc !important;
                    border-color: #cbd5e1 !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                }
              ` }} />
              
              {/* REPORT HEADER */}
              <div className="border-b-2 border-slate-200 pb-3 print:pb-1.5">
                <div className="flex flex-row justify-between items-center">
                  <div className="text-right space-y-0.5">
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">مطاعم أصل الإسكندر</h1>
                    <p className="text-[10px] text-slate-500 font-semibold">إدارة المراقبة والجودة والمطابقات الميدانية</p>
                  </div>
                  <div className="text-center space-y-1">
                    <h2 className="text-base font-bold text-emerald-700 print:text-sm">تقرير مطابقة وجرد عجز المخبز</h2>
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-full text-[9px] font-bold border border-emerald-100 print:bg-emerald-50">مستند رسمي معتمد</span>
                  </div>
                  <div className="text-left space-y-0.5 font-mono text-[9px] text-slate-400">
                    <p className="text-slate-500 font-bold">تاريخ الطباعة: {new Date().toLocaleDateString("ar-SA")}</p>
                    <p>وقت الطباعة: {new Date().toLocaleTimeString("ar-SA")}</p>
                  </div>
                </div>
              </div>

              {/* REPORT METADATA */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100 print:bg-white print-bg-slate print:border-slate-300 print:rounded-none print:p-2">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold print:text-[8px]">الفرع المستهدف:</span>
                  <span className="text-xs font-bold text-slate-800">فرع {reportBranch}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold print:text-[8px]">الفترة الزمنية:</span>
                  <span className="text-xs font-bold text-slate-800 font-mono">
                    {reportType === "day" ? reportSingleDate : `${reportStartDate} إلى ${reportEndDate}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold print:text-[8px]">عدد أيام التسوية:</span>
                  <span className="text-xs font-bold text-slate-800">{reportRecords.length} يوم عمل</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold print:text-[8px]">نوع التقرير:</span>
                  <span className="text-xs font-bold text-slate-800">
                    {reportType === "day" ? "مطابقة يومية مفصلة" : "تقرير جرد وتراكمي للفترة"}
                  </span>
                </div>
              </div>

              {/* KEY STATS BAR */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:gap-2">
                <div className="p-3 rounded-xl border border-slate-150 bg-slate-50/40 text-center print:bg-white print-bg-slate print:border-slate-300 print:rounded-none print:p-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold block mb-0.5 print:text-[8px]">المبيعات المتوقعة (نظرياً)</span>
                  <span className="text-base font-black text-slate-800 font-mono">{reportMetrics.theoreticalSales.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 block print:text-[8px]">ريال</span>
                </div>

                <div className="p-3 rounded-xl border border-sky-100 bg-sky-50/10 text-center print:bg-white print-bg-sky print:border-slate-300 print:rounded-none print:p-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold block mb-0.5 print:text-[8px]">المبيعات المسجلة فعلياً</span>
                  <span className="text-base font-black text-slate-800 font-mono">
                    {reportRecords.reduce((sum, r) => sum + (r.actual_sales || 0), 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block print:text-[8px]">ريال</span>
                </div>

                <div className={`p-3 rounded-xl border text-center print:bg-white print:border-slate-300 print:rounded-none print:p-1.5 ${
                  reportMetrics.cashVariance < 0 
                    ? "border-red-100 bg-red-50/10 print-bg-red" 
                    : reportMetrics.cashVariance > 0 
                    ? "border-amber-100 bg-amber-50/10 print-bg-amber" 
                    : "border-emerald-100 bg-emerald-50/10 print-bg-emerald"
                }`}>
                  <span className="text-[10px] text-slate-400 font-semibold block mb-0.5 print:text-[8px]">الفارق المالي (العجز/الفائض)</span>
                  <span className={`text-base font-black font-mono block ${
                    reportMetrics.cashVariance < 0 ? "text-red-600" : reportMetrics.cashVariance > 0 ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {reportMetrics.cashVariance > 0 ? `+${reportMetrics.cashVariance.toLocaleString()}` : reportMetrics.cashVariance.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block print:text-[8px]">ريال</span>
                </div>

                <div className="p-3 rounded-xl border border-purple-100 bg-purple-50/10 text-center print:bg-white print-bg-purple print:border-slate-300 print:rounded-none print:p-1.5">
                  <span className="text-[10px] text-slate-400 font-semibold block mb-0.5 print:text-[8px]">الخبز الوارد الإجمالي</span>
                  <span className="text-base font-black text-slate-800 font-mono">
                    {reportMetrics.breadDetails.reduce((sum, b) => sum + b.arrived, 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 block print:text-[8px]">حبة خبز</span>
                </div>
              </div>

              {/* TABLE 1: BREAD QUANTITIES MATCHING */}
              <div className="space-y-2 print:space-y-1 print-avoid-break">
                <h3 className="text-xs font-bold text-slate-800 border-r-4 border-emerald-500 pr-2">أولاً: مطابقة كميات حبات الخبز وجرد الفروقات بالتفصيل</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:rounded-none">
                  <table className="w-full text-xs text-right text-slate-600">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 print:bg-slate-100">
                      <tr>
                        <th className="px-3 py-2">نوع الخبز</th>
                        <th className="px-3 py-2 text-center">الوارد</th>
                        <th className="px-3 py-2 text-center">المباع (المستهلك)</th>
                        <th className="px-3 py-2 text-center">التالف (الهدر)</th>
                        <th className="px-3 py-2 text-center">أكل العمال</th>
                        <th className="px-3 py-2 text-center">تبادل المنافع</th>
                        <th className="px-3 py-2 text-center">إجمالي المسجل</th>
                        <th className="px-3 py-2 text-center">الفارق</th>
                        <th className="px-3 py-2 text-left">حالة الجرد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                      {reportMetrics.breadDetails.map((b) => {
                        const hasDeficit = b.variance < 0;
                        const hasSurplus = b.variance > 0;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/30 print:hover:bg-transparent">
                            <td className="px-3 py-2 font-semibold text-slate-800">{b.name}</td>
                            <td className="px-3 py-2 text-center font-mono font-bold text-slate-700">{b.arrived}</td>
                            <td className="px-3 py-2 text-center font-mono text-slate-500">{b.consumed}</td>
                            <td className="px-3 py-2 text-center font-mono text-slate-400">{b.wasted}</td>
                            <td className="px-3 py-2 text-center font-mono text-slate-400">{b.staff}</td>
                            <td className="px-3 py-2 text-center font-mono text-slate-400">{b.shared}</td>
                            <td className="px-3 py-2 text-center font-mono font-semibold text-slate-600">{b.totalAccounted}</td>
                            <td className={`px-3 py-2 text-center font-mono font-black ${
                              hasDeficit ? "text-red-600 print-bg-red" : hasSurplus ? "text-amber-600 print-bg-amber" : "text-emerald-600 print-bg-emerald"
                            }`}>
                              {hasSurplus ? `+${b.variance}` : b.variance}
                            </td>
                            <td className={`px-3 py-2 text-left font-semibold ${
                              b.variance === 0 ? "text-emerald-600 print-bg-emerald" : hasDeficit ? "text-red-600 print-bg-red" : "text-amber-600 print-bg-amber"
                            }`}>
                              {b.variance === 0 ? (
                                <span>✅ مطابق تماماً</span>
                              ) : hasDeficit ? (
                                <span>⚠️ عجز ({Math.abs(b.variance)}-)</span>
                              ) : (
                                <span>➕ فائض (+{b.variance})</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLE 2: PRODUCT SALES DETAILS & DIAGNOSTICS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start print-grid print:gap-2 print-avoid-break">
                
                {/* Product Sales table */}
                <div className="lg:col-span-8 space-y-2 print-col-span-8">
                  <h3 className="text-xs font-bold text-slate-800 border-r-4 border-emerald-500 pr-2">ثانياً: تفاصيل مبيعات الوجبات والخبز المستهلك بها</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden print:border-slate-300 print:rounded-none">
                    <table className="w-full text-[10px] text-right text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 print:bg-slate-100">
                        <tr>
                          <th className="px-2.5 py-1.5">اسم الوجبة</th>
                          <th className="px-2.5 py-1.5 text-center">السعر</th>
                          <th className="px-2.5 py-1.5 text-center">الكمية المباعة</th>
                          <th className="px-2.5 py-1.5 text-center">القيمة الإجمالية</th>
                          <th className="px-2.5 py-1.5 text-left">معدل استهلاك الخبز</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                        {PRODUCTS.map((p) => {
                          // Find total sold in records
                          const totalSold = reportRecords.reduce((sum, r) => {
                            return sum + (r[`sold_${p.id}` as keyof typeof r] as number || 0);
                          }, 0);

                          if (totalSold === 0) return null;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/20 print:hover:bg-transparent">
                              <td className="px-2.5 py-1.5 font-semibold text-slate-800">{p.name}</td>
                              <td className="px-2.5 py-1.5 text-center font-mono">{p.price} ريال</td>
                              <td className="px-2.5 py-1.5 text-center font-mono font-bold text-slate-900">{totalSold}</td>
                              <td className="px-2.5 py-1.5 text-center font-mono font-bold text-slate-700">{(totalSold * p.price).toLocaleString()} ريال</td>
                              <td className="px-2.5 py-1.5 text-left text-[9px] text-slate-500 font-medium">
                                {Object.entries(p.use).map(([breadId, count]) => {
                                  const breadLabel = BREAD_TYPES.find(b => b.id === breadId)?.name || breadId;
                                  return (
                                    <span key={breadId} className="bg-slate-100 px-1 py-0.5 rounded ml-1 print:bg-slate-50 print:border print:border-slate-200">
                                      {count}x {breadLabel}
                                    </span>
                                  );
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DIAGNOSTICS & ALERTS */}
                <div className="lg:col-span-4 space-y-2 print-col-span-4">
                  <h3 className="text-xs font-bold text-slate-800 border-r-4 border-emerald-500 pr-2">ثالثاً: التحليل التلقائي والتشخيص الآلي</h3>
                  <div className="border border-slate-150 rounded-xl p-3 bg-slate-50/50 space-y-2 print:bg-white print-bg-slate print:border-slate-300 print:rounded-none print:p-2">
                    <span className="text-[9px] font-bold text-slate-400 block print:text-[8px]">التقييم الفني المباشر:</span>
                    <div className="space-y-1.5">
                      {reportMetrics.alerts.map((alert, idx) => (
                        <div 
                          key={idx} 
                          className={`p-2 rounded-lg border text-[10px] flex gap-1.5 items-start print:p-1.5 print:bg-white ${
                            alert.type === "error" 
                              ? "bg-red-50 border-red-100 text-red-800 print-bg-red" 
                              : alert.type === "warning" 
                              ? "bg-amber-50 border-amber-100 text-amber-800 print-bg-amber" 
                              : "bg-emerald-50 border-emerald-100 text-emerald-800 print-bg-emerald"
                          }`}
                        >
                          {alert.type === "error" && <AlertOctagon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-red-500 print:text-red-700" />}
                          {alert.type === "warning" && <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500 print:text-amber-700" />}
                          {alert.type === "success" && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-500 print:text-emerald-700" />}
                          <span className="leading-relaxed font-medium">{alert.text}</span>
                        </div>
                      ))}
                    </div>

                    {/* Aggregate Notes */}
                    {reportRecords.some(r => r.notes) && (
                      <div className="pt-1.5 border-t border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 block mb-0.5 print:text-[8px]">ملاحظات مدونة بالفترة:</span>
                        <div className="max-h-24 overflow-y-auto text-[9px] text-slate-600 space-y-1 divide-y divide-slate-100 pr-1">
                          {reportRecords.map((r, idx) => {
                            if (!r.notes) return null;
                            return (
                              <div key={idx} className="pt-1 first:pt-0">
                                <span className="font-mono text-[8px] text-slate-400 font-bold">{r.date}: </span>
                                <span>{r.notes}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* REPORT VERIFICATION & SIGN-OFF */}
              <div className="pt-4 border-t-2 border-slate-200 space-y-3 print:pt-2 print-avoid-break print-signature-box">
                <span className="text-xs font-bold text-slate-700 block print:text-[9px]">قسم الاعتمادات والتوقيعات الرسمية والمطابقة:</span>
                <div className="grid grid-cols-3 gap-6 text-center text-xs pt-1.5 print:gap-4 print:pt-0">
                  <div className="space-y-7 print:space-y-4">
                    <span className="block font-bold text-slate-700 print:text-[9px]">توقيع المحاسب</span>
                    <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
                    <span className="block text-[9px] text-slate-400 font-medium">الاسم والتوقيع: ..........................</span>
                  </div>
                  <div className="space-y-7 print:space-y-4">
                    <span className="block font-bold text-slate-700 print:text-[9px]">توقيع الكاشير</span>
                    <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
                    <span className="block text-[9px] text-slate-400 font-medium">الاسم والتوقيع: ..........................</span>
                  </div>
                  <div className="space-y-7 print:space-y-4">
                    <span className="block font-bold text-slate-700 print:text-[9px]">مدير عام المؤسسة</span>
                    <div className="border-b border-dashed border-slate-300 w-3/4 mx-auto"></div>
                    <span className="block text-[9px] text-slate-400 font-medium">الاعتماد والتوقيع: ..........................</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
