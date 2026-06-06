import React, { useState, useEffect } from "react";
import { Purchase } from "../types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";
import { 
  ShoppingBag, 
  Layers, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Trash, 
  Search, 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  Clock, 
  TrendingUp, 
  Building2,
  Pencil
} from "lucide-react";

interface PurchasesTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
  userBranch?: "الكل" | "القادسية" | "المروج";
}

function parseQtyVal(q: string | number | undefined): number {
  if (q === undefined || q === null) return 1;
  if (typeof q === "number") return q;
  const match = String(q).replace(/,/g, "").match(/[+-]?([0-9]*[.])?[0-9]+/);
  if (match) {
    return parseFloat(match[0]) || 1;
  }
  return 1;
}

function getConsolidatedProductName(name: string): string {
  if (!name) return "";
  
  let clean = name.trim();
  
  // Split on common specification dividers like /, \, |, (, [ or " - "
  const dividers = ["/", "\\", "|", "(", "[", " - "];
  for (const div of dividers) {
    if (clean.includes(div)) {
      clean = clean.split(div)[0].trim();
    }
  }

  const norm = normalizeArabicString(clean);
  if (norm.includes("غاز") || norm.includes("gas")) return "غاز";
  if (norm.includes("خضار") || norm.includes("خضروات") || norm.includes("vegetable")) return "خضار";
  if (norm.includes("خبز") || norm.includes("عجين") || norm.includes("bread")) return "خبز";
  if (norm.includes("بقاله") || norm.includes("سوبرماركت") || norm.includes("grocery")) return "بقالة";
  if (norm.includes("ديزل") || norm.includes("diesel")) return "ديزل";
  return clean;
}

function normalizeArabicString(str: string): string {
  if (!str) return "";
  let s = str.trim().toLowerCase();
  
  // 1. Remove Harakat (diacritics)
  s = s.replace(/[\u064B-\u0652]/g, "");
  
  // 2. Normalize Hamzas to Alif
  s = s.replace(/[أإآ]/g, "ا");
  
  // 3. Normalize other characters
  s = s.replace(/ة/g, "ه");
  s = s.replace(/ى/g, "ي");
  s = s.replace(/ؤ/g, "ء");
  s = s.replace(/ئ/g, "ء");
  
  // 4. Remove Al- prefix at boundaries safely (only if word length > 3 to not ruin words like ال)
  s = s.replace(/\bال([\u0600-\u06FF]{3,})/g, "$1");
  s = s.replace(/^ال([\u0600-\u06FF]{3,})/g, "$1");
  
  // 5. Remove non-alphanumeric characters but keep spaces and Arabic letters/numbers
  s = s.replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, "");
  
  // 6. Collapse multiple spaces
  s = s.replace(/\s+/g, " ");
  
  return s.trim();
}

function getItemUnitPrice(p: Purchase): number {
  if (!p) return 0;
  if (p.source === "invoice") {
    return p.price;
  }
  const qtyVal = parseQtyVal(p.qty);
  if (qtyVal > 0) {
    return Number((p.price / qtyVal).toFixed(2));
  }
  return p.price;
}

export default function PurchasesTab({ onShowToast, userRole, userBranch }: PurchasesTabProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedBranch, setSelectedBranch] = useState<"الكل" | "القادسية" | "المروج">(() => {
    if (userBranch && userBranch !== "الكل") return userBranch;
    return "الكل";
  });
  const [statusFilter, setStatusFilter] = useState<"الكل" | "active" | "depleted">("الكل");
  const [sourceFilter, setSourceFilter] = useState<"الكل" | "manual" | "invoice">("الكل");
  const [searchQuery, setSearchQuery] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formBranch, setFormBranch] = useState<"القادسية" | "المروج">(() => {
    if (userBranch && userBranch !== "الكل") return userBranch as "القادسية" | "المروج";
    return "القادسية";
  });
  const [formPrice, setFormPrice] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formType, setFormType] = useState<"direct" | "split">("direct");
  const [formStatus, setFormStatus] = useState<"active" | "depleted">("active");
  const [formCategory, setFormCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedChartProduct, setSelectedChartProduct] = useState("ديزل");
  const [chartMode, setChartMode] = useState<"price" | "lifespan">("price");

  useEffect(() => {
    if (userBranch && userBranch !== "الكل") {
      setSelectedBranch(userBranch);
      setFormBranch(userBranch as "القادسية" | "المروج");
    }
  }, [userBranch]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/purchases");
      if (res.ok) {
        const data = await res.json();
        setPurchases(data);
      } else {
        onShowToast("⚠️ فشل جلب سجلات المشتريات");
      }
    } catch (err) {
      console.error(err);
      onShowToast("⚠️ خطأ شبكة أثناء استيراد البيانات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice || !formQty) {
      onShowToast("⚠️ الرجاء ملء كافة الحقول الأساسية");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        date: formDate,
        branch: formBranch,
        price: parseFloat(formPrice) || 0,
        qty: formQty,
        type: formType,
        status: formStatus,
        source: "manual" as const,
        depletedDate: formStatus === "depleted" ? formDate : undefined,
        category: formCategory
      };

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onShowToast("✨ تم تسجيل الشراء والمخزون بنجاح");
        setFormName("");
        setFormPrice("");
        setFormQty("");
        setFormCategory("");
        setShowAddForm(false);
        fetchPurchases();
      } else {
        const errData = await res.json();
        onShowToast(`⚠️ فشل التثبيت: ${errData.error || "خطأ غير معروف"}`);
      }
    } catch (err) {
      console.error(err);
      onShowToast("⚠️ خطأ غير متوقع أثناء إرسال البيانات");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: Purchase) => {
    const newStatus: "active" | "depleted" = item.status === "active" ? "depleted" : "active";
    const newDepletedDate = newStatus === "depleted" ? new Date().toISOString().split("T")[0] : undefined;

    try {
      const res = await fetch(`/api/purchases/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...item,
          status: newStatus,
          depletedDate: newDepletedDate
        })
      });

      if (res.ok) {
        onShowToast(
          newStatus === "depleted" 
            ? "🛑 تم وسم السلعة بنفاذ المخزون وتحديث المستويات" 
            : "🟢 تم إعادة تنشيط المخزون وبقاء السلعة متاحة"
        );
        fetchPurchases();
      } else {
        onShowToast("⚠️ فشل تحديث حالة السلعة");
      }
    } catch (err) {
      console.error(err);
      onShowToast("⚠️ خطأ اتصال بالخادم");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) return;

    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: "DELETE"
      });

      if (res.ok) {
        onShowToast("🗑️ تم حذف سجل الشراء من قاعدة البيانات");
        fetchPurchases();
      } else {
        onShowToast("⚠️ فشل حذف السجل");
      }
    } catch (err) {
      console.error(err);
      onShowToast("⚠️ خطأ في الاتصال بالخادم");
    }
  };

  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Editing state
  const [editingItem, setEditingItem] = useState<Purchase | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editBranch, setEditBranch] = useState<"القادسية" | "المروج">("القادسية");
  const [editPrice, setEditPrice] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "depleted">("active");
  const [editDepletedDate, setEditDepletedDate] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      onShowToast("⚠️ يرجى تحديد بعض المنتجات أولاً لحذفها");
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedIds.length} من المنتجات المحددة نهائياً؟`)) return;

    try {
      const res = await fetch("/api/purchases/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (res.ok) {
        const data = await res.json();
        onShowToast(`🗑️ ${data.message || "تم حذف المنتجات المحددة بنجاح"}`);
        setSelectedIds([]);
        fetchPurchases();
      } else {
        onShowToast("⚠️ فشل حذف المنتجات المحددة");
      }
    } catch (err) {
      console.error(err);
      onShowToast("⚠️ خطأ في الاتصال بالخادم");
    }
  };

  const handleClearAllPurchases = async () => {
    if (filteredPurchases.length === 0) {
      onShowToast("⚠️ لا توجد منتجات حالية لحذفها");
      return;
    }

    const countInfo = selectedBranch === "الكل" ? "جميع المنتجات" : `جميع منتجات فرع ${selectedBranch}`;
    if (!window.confirm(`⚠️ تحذير خطير: هل أنت متأكد من حذف ${countInfo} نهائياً؟ هذا الإجراء لا يمكن التراجع عنه!`)) return;

    try {
      const res = await fetch("/api/purchases/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, branch: selectedBranch })
      });

      if (res.ok) {
        const data = await res.json();
        onShowToast(`🗑️ ${data.message || "تم تفريغ كافة المنتجات بنجاح"}`);
        setSelectedIds([]);
        fetchPurchases();
      } else {
        onShowToast("⚠️ فشل تفريغ المنتجات");
      }
    } catch (err) {
      console.error(err);
      onShowToast("⚠️ خطأ في الاتصال بالخادم");
    }
  };

  const handleStartEdit = (item: Purchase) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDate(item.date);
    setEditBranch(item.branch);
    setEditPrice(item.price.toString());
    setEditQty(item.qty || "");
    setEditStatus(item.status);
    setEditDepletedDate(item.depletedDate || "");
    setEditCategory(item.category || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editName.trim() || !editPrice || !editQty) {
      onShowToast("⚠️ الرجاء ملء كافة الحقول الأساسية للتعديل");
      return;
    }

    try {
      const payload = {
        ...editingItem,
        name: editName.trim(),
        date: editDate,
        branch: editBranch,
        price: parseFloat(editPrice) || 0,
        qty: editQty,
        status: editStatus,
        depletedDate: editStatus === "depleted" ? (editDepletedDate || new Date().toISOString().split("T")[0]) : undefined,
        category: editCategory
      };

      const res = await fetch(`/api/purchases/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onShowToast("✨ تم تعديل بيانات المنتج وحفظها بنجاح");
        setEditingItem(null);
        fetchPurchases();
      } else {
        onShowToast("⚠️ فشل تعديل المنتج");
      }
    } catch (err) {
      console.error(err);
      onShowToast("⚠️ خطأ في الاتصال بالخادم");
    }
  };

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    const allFilteredIds = filteredPurchases.map((p) => p.id);
    const allSelectedAlready = allFilteredIds.every((id) => selectedIds.includes(id));

    if (allSelectedAlready) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const union = new Set([...prev, ...allFilteredIds]);
        return Array.from(union);
      });
    }
  };

  // Filtered logic
  const filteredPurchases = purchases.filter((p) => {
    if (selectedBranch !== "الكل" && p.branch !== selectedBranch) return false;
    if (statusFilter !== "الكل" && p.status !== statusFilter) return false;
    if (sourceFilter !== "الكل" && p.source !== sourceFilter) return false;
    if (fromDate && p.date < fromDate) return false;
    if (toDate && p.date > toDate) return false;
    if (searchQuery.trim() !== "") {
      const q = normalizeArabicString(searchQuery);
      const nameMatch = normalizeArabicString(p.name).includes(q);
      const invoiceMatch = p.invoiceId?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
      return nameMatch || invoiceMatch;
    }
    return true;
  });

  // Calculate statistics metrics
  const totalCost = filteredPurchases.reduce((sum, p) => sum + (p.price || 0), 0);
  const activeCount = filteredPurchases.filter((p) => p.status === "active").length;
  const depletedCount = filteredPurchases.filter((p) => p.status === "depleted").length;
  
  const manualCount = filteredPurchases.filter((p) => p.source === "manual").length;
  const scannedCount = filteredPurchases.filter((p) => p.source === "invoice").length;
  const totalCount = filteredPurchases.length;

  // Smart analysis calculations for average lifespan
  const calculatedLifespans = filteredPurchases
    .filter((p) => p.status === "depleted" && p.depletedDate && p.depletedDate >= p.date)
    .map((p) => {
      const start = new Date(p.date).getTime();
      const end = new Date(p.depletedDate!).getTime();
      return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    });

  const avgLifespan = calculatedLifespans.length > 0 
    ? (calculatedLifespans.reduce((sum, val) => sum + val, 0) / calculatedLifespans.length).toFixed(1) 
    : "غير متوفر";

  // Group items by name (consolidated) and calculate average lifespans of previous batches
  const lifespanByItemName: Record<string, { totalDays: number; count: number; displayName: string; branch: 'القادسية' | 'المروج' | 'الكل' }> = {};
  
  // To do this accurately, let's group all purchases by their consolidated name and branch
  const groupedPurchases: Record<string, Purchase[]> = {};
  purchases.forEach((p) => {
    const key = `${normalizeArabicString(getConsolidatedProductName(p.name))}-${p.branch}`;
    if (!groupedPurchases[key]) {
      groupedPurchases[key] = [];
    }
    groupedPurchases[key].push(p);
  });

  // For each group, sort by date ascending and calculate lifespan of each item (except the last one in group, which is currently active)
  Object.entries(groupedPurchases).forEach(([groupKey, list]) => {
    if (list.length === 0) return;
    const sorted = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const normName = normalizeArabicString(getConsolidatedProductName(sorted[0].name));
    const displayName = getConsolidatedProductName(sorted[0].name);
    const branch = sorted[0].branch as 'القادسية' | 'المروج' | 'الكل';

    // Filter by branch choice in the UI
    if (selectedBranch !== "الكل" && branch !== selectedBranch) return;

    const mapKey = `${normName}_${branch}`;

    for (let i = 0; i < sorted.length - 1; i++) {
      const curr = sorted[i];
      const next = sorted[i + 1];
      const start = new Date(curr.date).getTime();
      const end = new Date(next.date).getTime();
      if (start && end && end >= start) {
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        if (!lifespanByItemName[mapKey]) {
          lifespanByItemName[mapKey] = { totalDays: 0, count: 0, displayName, branch };
        }
        lifespanByItemName[mapKey].totalDays += diffDays;
        lifespanByItemName[mapKey].count += 1;
      }
    }
  });

  const itemAverages = Object.entries(lifespanByItemName)
    .map(([key, stats]) => ({
      name: stats.displayName,
      branch: stats.branch,
      avg: (stats.totalDays / stats.count).toFixed(1),
      count: stats.count,
    }))
    .sort((a, b) => b.count - a.count);

  const getDaysSince = (dateStr: string) => {
    try {
      const start = new Date(dateStr).getTime();
      const today = new Date().getTime();
      const diffTime = today - start;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch {
      return 0;
    }
  };

  const getAnalysis = (item: Purchase) => {
    const normName = normalizeArabicString(getConsolidatedProductName(item.name));
    const branch = item.branch;

    // Get all purchases of this consolidated name in this branch, sorted by date ascending with safe timestamp logic
    const historyList = purchases
      .filter((p) => normalizeArabicString(getConsolidatedProductName(p.name)) === normName && p.branch === branch)
      .sort((a, b) => {
        const dA = new Date(a.date).getTime() || 0;
        const dB = new Date(b.date).getTime() || 0;
        return dA - dB;
      });

    // Find the position index of this specific item
    const index = historyList.findIndex((p) => p.id === item.id);

    // Price Trend
    let priceTrend: "up" | "down" | "stable" | "none" = "none";
    let priceDiff = 0;
    let pricePct = 0;
    let prevPrice = 0;
    const currentUnitPrice = getItemUnitPrice(item);

    if (index > 0) {
      const prevItem = historyList[index - 1];
      prevPrice = getItemUnitPrice(prevItem);
      if (prevPrice > 0) {
        priceDiff = currentUnitPrice - prevPrice;
        pricePct = (priceDiff / prevPrice) * 100;
        if (priceDiff > 0.05) {
          priceTrend = "up";
        } else if (priceDiff < -0.05) {
          priceTrend = "down";
        } else {
          priceTrend = "stable";
        }
      }
    }

    // Quantity Trend
    let qtyTrend: "up" | "down" | "stable" | "none" = "none";
    let qtyDiff = 0;
    let qtyPct = 0;
    let prevQty = "0";

    if (index > 0) {
      const prevItem = historyList[index - 1];
      prevQty = String(prevItem.qty || "");
      const nPrev = parseQtyVal(prevItem.qty);
      const nCurr = parseQtyVal(item.qty);
      if (nPrev > 0) {
        qtyDiff = nCurr - nPrev;
        qtyPct = (qtyDiff / nPrev) * 100;
        if (qtyDiff > 0.05) {
          qtyTrend = "up";
        } else if (qtyDiff < -0.05) {
          qtyTrend = "down";
        } else {
          qtyTrend = "stable";
        }
      }
    }

    // Determine current duration based on Next Order Date if it exists
    let currentDuration = 0;
    let depletionDate: string | undefined = undefined;

    if (index < historyList.length - 1) {
      const nextItem = historyList[index + 1];
      depletionDate = nextItem.date;
      const start = new Date(item.date).getTime();
      const end = new Date(nextItem.date).getTime();
      currentDuration = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
    } else {
      currentDuration = getDaysSince(item.date);
    }

    // Calculate item average lifespan specifically for this consolidated item in this branch
    let itemAvgLifespan = 0;
    let totalBatchDays = 0;
    let batchCount = 0;
    for (let i = 0; i < historyList.length - 1; i++) {
      const curr = historyList[i];
      const next = historyList[i + 1];
      const start = new Date(curr.date).getTime();
      const end = new Date(next.date).getTime();
      if (start && end && end >= start) {
        totalBatchDays += Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
        batchCount++;
      }
    }
    if (batchCount > 0) {
      itemAvgLifespan = totalBatchDays / batchCount;
    }

    // Duration Trend (longer/shorter than average of this item name)
    let durationTrend: "longer" | "shorter" | "typical" | "none" = "none";
    let durationDiff = 0;
    let durationPct = 0;

    if (itemAvgLifespan > 0) {
      durationDiff = currentDuration - itemAvgLifespan;
      durationPct = (durationDiff / itemAvgLifespan) * 100;

      // require at least 1 day difference and 10% difference
      if (Math.abs(durationDiff) >= 1 && Math.abs(durationPct) >= 10) {
        if (durationDiff > 0) {
          durationTrend = "longer";
        } else {
          durationTrend = "shorter";
        }
      } else {
        durationTrend = "typical";
      }
    }

    return {
      priceTrend,
      priceDiff,
      pricePct,
      qtyTrend,
      qtyDiff,
      qtyPct,
      durationTrend,
      durationDiff,
      durationPct,
      itemAvgLifespan,
      currentDuration,
      prevPrice,
      prevQty,
      depletionDate,
      identicalCount: historyList.length
    };
  };

  // Compile active alerts
  const activeAlerts = purchases
    .filter((p) => {
      // Find matches in user's branch filter
      if (selectedBranch !== "الكل" && p.branch !== selectedBranch) return false;
      const daysOld = getDaysSince(p.date);
      // Alerts for active items or items in the last 60 days
      return p.status === "active" || daysOld <= 60;
    })
    .map((p) => {
      const analysis = getAnalysis(p);
      return { item: p, ...analysis };
    })
    .filter(
      (a) =>
        a.priceTrend === "up" ||
        a.priceTrend === "down" ||
        a.durationTrend === "longer" ||
        a.durationTrend === "shorter"
    )
    .sort((a, b) => b.item.date.localeCompare(a.item.date))
    .slice(0, 6);

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Smart purchase banner concept header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              <span>📦 نظام تتبع المشتريات والمخزون الذكي</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-3xl">
              يرتكز المبدأ الذكي لدورة حياة المخزون على أتمتة التعاقب: <strong>عند تسجيل أو مسح طلب جديد لنفس السلعة، يتم وسم الطلب/المخزون السابق تلقائياً كـ (مستهلك/نافذ)</strong> ويقوم النظام بحساب دقيق لفترة بقائه بالمستودع بدلالة الأيام. وبالمقابل، يعتبر الطلب الجديد بمثابة <strong>"المخزون النشط والمتاح حالياً"</strong> ويبدأ عداد تعقبه فوراً.
            </p>
          </div>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-3 rounded-2xl transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? "إغلاق النموذج" : "إضافة شراء يدوي للمستودع"}</span>
          </button>
        </div>

        {/* Dynamic collapsible hand entry form */}
        {showAddForm && (
          <form 
            onSubmit={handleAddPurchase} 
            className="p-5 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">اسم السلعة / المنتج في المستودع</label>
              <input
                type="text"
                required
                placeholder="مثال: غاز، خبز برجر، طاقة طماطم، ديزل"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full text-right px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">تاريخ الشراء / التسليم</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full text-right px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">المستودع أو الفرع الموجه إليه</label>
              <select
                value={formBranch}
                onChange={(e) => setFormBranch(e.target.value as any)}
                disabled={userBranch !== "الكل"}
                className="w-full px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              >
                <option value="القادسية">فرع القادسية</option>
                <option value="المروج">فرع المروج</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-pink-700">نوع السلعة / تصنيف المخزون</label>
              <input
                type="text"
                placeholder="مثال: خضار، بيبسي، ديزل، غاز..."
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full text-right px-4 py-2.5 text-xs bg-pink-50/10 border border-pink-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 font-bold text-pink-700 placeholder-pink-300"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">التكلفة الإجمالية للشراء (SAR)</label>
              <input
                type="number"
                step="any"
                required
                placeholder="التكلفة الفعلية بالريال"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                className="w-full text-right px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">الكمية المشحونة والتعبئة</label>
              <input
                type="text"
                required
                placeholder="مثال: 5 أسطوانات، 12 كرتون"
                value={formQty}
                onChange={(e) => setFormQty(e.target.value)}
                className="w-full text-right px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:border-indigo-600"
              />
            </div>

            <div className="space-y-1.5 col-span-1 md:col-span-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/50">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="status"
                    checked={formStatus === "active"}
                    onChange={() => setFormStatus("active")}
                    className="accent-indigo-600"
                  />
                  <span>متاحة بالمستودع (نشطة)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="radio"
                    name="status"
                    checked={formStatus === "depleted"}
                    onChange={() => setFormStatus("depleted")}
                    className="accent-indigo-600"
                  />
                  <span>مستهلكة بالكامل (نافذة)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl cursor-pointer transition-all"
              >
                {submitting ? "تأكيد الطلب..." : "تأكيد تسجيل السلعة يدويًا"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Analytics Scorecards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Price */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold tracking-wider">إجمالي تكلفة المشتريات المفلترة</p>
            <h3 className="text-xl font-black text-slate-900 font-mono tracking-tight">
              {totalCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-[10px] text-slate-400 font-sans font-bold mr-1">SAR</span>
            </h3>
          </div>
          <div className="bg-green-500/10 text-green-700 p-3 rounded-xl">
            <TrendingUp className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Life cycle */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold tracking-wider">متوسط بقاء السلعة للتفريغ</p>
            <h3 className="text-xl font-black text-slate-900 font-mono tracking-tight">
              {avgLifespan}
              {avgLifespan !== "غير متوفر" && <span className="text-[10px] text-slate-400 font-sans font-bold mr-1">يوم</span>}
            </h3>
          </div>
          <div className="bg-indigo-500/10 text-indigo-700 p-3 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Active stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold tracking-wider">مستويات السلع النشطة</p>
            <h3 className="text-xl font-black text-indigo-600 font-mono tracking-tight">
              {activeCount} <span className="text-xs text-slate-400 font-sans font-bold">نشطة</span>
            </h3>
          </div>
          <div className="bg-indigo-50/80 text-indigo-600 p-3 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Source mapping ratio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-extrabold tracking-wider">نسب الفرز والتتبع الذكي</p>
            <h3 className="text-xs font-extrabold text-slate-800 space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></span>
                <span>فواتير ممسوحة: <span className="font-mono text-xs">{scannedCount}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-900 rounded-full"></span>
                <span>كشوفات اليومية: <span className="font-mono text-xs">{manualCount}</span></span>
              </div>
            </h3>
          </div>
          <div className="bg-yellow-500/10 text-yellow-700 p-3 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Dynamic Item Stay Leaderboard Section */}
      {itemAverages.length > 0 && (
        <div className="bg-gradient-to-l from-indigo-50/40 to-white p-5 rounded-3xl border border-indigo-100/40 shadow-xs space-y-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
            <h3 className="text-xs font-black text-slate-800">📊 تفاصيل متوسط فترات الاستهلاك (العمر الفعلي لبقاء المواد في المستودع)</h3>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">يُظهر هذا التقرير متوسط عدد الأيام المستغرقة لكل سلعة منذ دخولها المستودع كخيار نشط حتى إعلان نفاذها واستبدالها بالطلب التالي لكل فرع بشكل مستقل:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {itemAverages.map((item, idx) => (
              <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)] flex flex-col justify-between gap-1 hover:border-indigo-200 transition-all">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="text-xs font-extrabold text-slate-800 truncate" title={item.name}>{item.name}</div>
                  <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black shrink-0 ${
                    item.branch === "القادسية" 
                      ? "bg-amber-50 text-amber-600 border border-amber-100/50" 
                      : "bg-teal-50 text-teal-600 border border-teal-100/50"
                  }`}>
                    {item.branch === "القادسية" ? "القادسية" : "المروج"}
                  </span>
                </div>
                <div className="flex items-end justify-between mt-1">
                  <span className="text-[10px] text-slate-400 font-medium font-mono">طُلبت {item.count} مرّات</span>
                  <span className="text-xs font-black text-indigo-600 font-sans bg-indigo-50 px-2 py-0.5 rounded-md">
                    {item.avg} <span className="text-[9px] font-bold text-indigo-400">أيّام</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Item Stay & Price Alerts Panel */}
      {activeAlerts.length > 0 && (
        <div className="bg-amber-50/30 p-5 rounded-3xl border border-amber-100/70 shadow-xs space-y-3 animate-fade-in">
          <div className="flex items-center gap-1.5 text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-black">🔔 نظام التنبيهات الذكي لرصد تقلبات الأسعار وانحراف مدد بقاء السلع بالمستودع ({activeAlerts.length})</h3>
          </div>
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">يقارن المحرك الرياضي دفعة الشراء الحالية تلقائياً بالسابقة لنفس المنتج والفرع؛ فيوضح لك انخفاض التكلفة أو ينبهك من زيادة الأسعار والتضخم، كما يقيس انحراف مدة بقاء الدفعة حالياً عن متوسطاتها التاريخية لكشف التباطؤ أو التسارع في دورة الاستهلاك:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeAlerts.map((alert, idx) => {
              const { item, priceTrend, priceDiff, pricePct, durationTrend, durationDiff, durationPct, itemAvgLifespan, currentDuration } = alert;
              return (
                <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between gap-2.5 transition-all hover:border-amber-200 hover:shadow-[0_4px_12px_rgba(180,83,9,0.04)]">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                    <span className="text-xs font-extrabold text-slate-900 truncate">{item.name}</span>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">{item.branch}</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    {/* Price notification */}
                    {(priceTrend === "up" || priceTrend === "down") && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 select-none font-bold">تذبذب السعر:</span>
                        {priceTrend === "up" ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-600 font-black">
                            📈 ارتفع بنسبة {pricePct.toFixed(1)}% (+{priceDiff.toFixed(1)} ريال)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-emerald-600 font-black">
                            📉 انخفض بنسبة {Math.abs(pricePct).toFixed(1)}% ({priceDiff.toFixed(1)} ريال)
                          </span>
                        )}
                      </div>
                    )}

                    {/* Duration notification */}
                    {(durationTrend === "longer" || durationTrend === "shorter") && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 select-none font-bold font-sans">بقاء السلعة:</span>
                        {durationTrend === "longer" ? (
                          <span className="inline-flex items-center gap-0.5 text-indigo-600 font-black">
                            ⚠️ أطول بـ {durationDiff.toFixed(1)} يوم (المعتاد: {itemAvgLifespan.toFixed(1)} يوم)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-amber-600 font-black">
                            ⚡ نفاد أسرع بـ {Math.abs(durationDiff).toFixed(1)} يوم (المعتاد: {itemAvgLifespan.toFixed(1)} يوم)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-50 pt-1.5 font-mono">
                    <span>تاريخ الشراء: {item.date}</span>
                    <span className="font-extrabold text-indigo-600 font-sans">{item.price} ريال</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interactive Price Fluctuation & Stock Durations Trend Chart Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-50 pb-4">
          <div className="space-y-1.5">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
              📈 مركز التحليلات المتقدمة وتتبع حركة الدفعات والمخزون
            </h3>
            <p className="text-[11px] text-slate-400 font-medium font-sans">
              تتبع تقلبات الأسعار الفعلية للوحدة وفترات بقاء الدفعات في المستودع لكل فترة شراء
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5" dir="rtl">
            {/* Segmented Chart Type Selector */}
            <div className="flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50">
              <button
                type="button"
                onClick={() => setChartMode("price")}
                className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                  chartMode === "price"
                    ? "bg-white text-indigo-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                📊 أسعار الشراء والوحدة
              </button>
              <button
                type="button"
                onClick={() => setChartMode("lifespan")}
                className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all ${
                  chartMode === "lifespan"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                ⏱️ فترات البقاء بالملف والكمية
              </button>
            </div>

            {/* Product Selector */}
            {(() => {
              const uniqueProductsMap = new Map<string, string>();
              
              // Prepopulate basic products so they map to their neat Arabic names
              const defaultProducts = ["ديزل", "خبز", "خضار", "غاز", "بقالة"];
              defaultProducts.forEach(p => {
                uniqueProductsMap.set(normalizeArabicString(p), p);
              });
              
              // Map all products to their unique consolidated and normalized names
              purchases.forEach(p => {
                const consolidated = getConsolidatedProductName(p.name);
                if (!consolidated) return;
                const norm = normalizeArabicString(consolidated);
                if (!uniqueProductsMap.has(norm)) {
                  uniqueProductsMap.set(norm, consolidated);
                }
              });

              const uniqueProductNames = Array.from(uniqueProductsMap.values()).filter(Boolean);

              return (
                <select
                  value={selectedChartProduct}
                  onChange={(e) => setSelectedChartProduct(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 font-extrabold text-indigo-700 cursor-pointer"
                >
                  {uniqueProductNames.map((prodOpt, prodIdx) => (
                    <option key={prodIdx} value={prodOpt}>{prodOpt}</option>
                  ))}
                </select>
              );
            })()}
          </div>
        </div>

        {(() => {
          const chartData = purchases
            .filter(p => {
              const matchName = normalizeArabicString(getConsolidatedProductName(p.name)) === normalizeArabicString(selectedChartProduct);
              const matchBranch = selectedBranch === "الكل" || p.branch === selectedBranch;
              return matchName && matchBranch;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(p => {
              const qtyNum = parseQtyVal(p.qty);
              const unitPrice = getItemUnitPrice(p);
              const analysis = getAnalysis(p);
              return {
                date: p.date,
                price: unitPrice,
                price_qadsia: p.branch === "القادسية" ? unitPrice : undefined,
                price_murooj: p.branch === "المروج" ? unitPrice : undefined,
                qty: qtyNum,
                qty_qadsia: p.branch === "القادسية" ? qtyNum : undefined,
                qty_murooj: p.branch === "المروج" ? qtyNum : undefined,
                lifespan: analysis.currentDuration,
                lifespan_qadsia: p.branch === "القادسية" ? analysis.currentDuration : undefined,
                lifespan_murooj: p.branch === "المروج" ? analysis.currentDuration : undefined,
                qtyRaw: p.qty,
                depletionDate: analysis.depletionDate,
                name: p.name,
                branch: p.branch,
                isDepleted: p.status === "depleted"
              };
            });

          if (chartData.length === 0) {
            return (
              <div className="h-60 flex items-center justify-center text-xs font-medium text-slate-400 font-sans" dir="rtl">
                لا توجد بيانات متوفرة لهذا المنتج في الفرع المحدد حالياً.
              </div>
            );
          }

          if (chartMode === "price") {
            return (
              <div className="h-72 w-full pr-4 text-xs font-bold pointer-events-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false}
                      axisLine={false}
                      orientation="right"
                      dx={8}
                      unit=" ريال"
                    />
                     <Tooltip 
                      contentStyle={{ 
                        direction: 'rtl', 
                        textAlign: 'right', 
                        borderRadius: '16px', 
                        border: '1px solid #f1f5f9',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }} 
                      labelFormatter={(lbl) => `تاريخ الشراء: ${lbl}`}
                      formatter={(val, name, props) => {
                        const bName = props.payload?.branch ? ` (${props.payload.branch})` : "";
                        return [
                          `${Number(val).toFixed(2)} ريال سعودي`,
                          `${name}${bName}: `
                        ];
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} 
                    />
                    {selectedBranch !== "الكل" ? (
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        name="سعر الوحدة"
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        activeDot={{ r: 6, strokeWidth: 0 }} 
                        dot={{ r: 3, strokeWidth: 0, stroke: "#4f46e5", fill: "#4f46e5" }}
                      />
                    ) : (
                      <>
                        <Line 
                          type="monotone" 
                          dataKey="price_qadsia" 
                          name="سعر فرع القادسية"
                          stroke="#d97706" 
                          strokeWidth={3} 
                          connectNulls
                          activeDot={{ r: 6, strokeWidth: 0 }} 
                          dot={{ r: 3, strokeWidth: 0, stroke: "#d97706", fill: "#d97706" }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="price_murooj" 
                          name="سعر فرع المروج"
                          stroke="#0d9488" 
                          strokeWidth={3} 
                          connectNulls
                          activeDot={{ r: 6, strokeWidth: 0 }} 
                          dot={{ r: 3, strokeWidth: 0, stroke: "#0d9488", fill: "#0d9488" }}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          } else {
            return (
              <div className="h-72 w-full pr-4 text-xs font-bold pointer-events-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#94a3b8" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#3b82f6" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false}
                      axisLine={false}
                      orientation="left"
                      dx={12}
                    />
                    <YAxis 
                      yAxisId="right"
                      stroke="#10b981" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false}
                      axisLine={false}
                      orientation="right"
                      dx={12}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        direction: 'rtl', 
                        textAlign: 'right', 
                        borderRadius: '16px', 
                        border: '1px solid #f1f5f9',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }} 
                      labelFormatter={(lbl) => `تاريخ الشراء: ${lbl}`}
                      formatter={(value, name, props) => {
                        const bName = props.payload?.branch ? ` (${props.payload.branch})` : "";
                        if (String(name).toLowerCase().includes("lifespan") || String(name).includes("بقاء")) {
                          const depletionMsg = props.payload?.depletionDate 
                            ? ` (حتى الشراء التالي في ${props.payload.depletionDate})`
                            : " (الدفعة الأحدث حالياً بمستودع الفرع)";
                          return [`${value} يوم${depletionMsg}`, `${name}${bName}`];
                        }
                        return [`${value} (${props.payload?.qtyRaw || props.payload?.qty || ""})`, `${name}${bName}`];
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36} 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} 
                    />
                    {selectedBranch !== "الكل" ? (
                      <>
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="lifespan" 
                          name="فترة بقاء الدفعة بالمستودع (بالأيام)"
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          activeDot={{ r: 6, strokeWidth: 0 }} 
                          dot={{ r: 3.5, strokeWidth: 0, stroke: "#3b82f6", fill: "#3b82f6" }}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="qty" 
                          name="الكمية المشتراة بالدفعة"
                          stroke="#10b981" 
                          strokeWidth={2} 
                          strokeDasharray="4 4"
                          activeDot={{ r: 5, strokeWidth: 0 }} 
                          dot={{ r: 3, strokeWidth: 0, stroke: "#10b981", fill: "#10b981" }}
                        />
                      </>
                    ) : (
                      <>
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="lifespan_qadsia" 
                          name="بقاء القادسية (يوم)"
                          stroke="#d97706" 
                          strokeWidth={3} 
                          connectNulls
                          activeDot={{ r: 6, strokeWidth: 0 }} 
                          dot={{ r: 3, strokeWidth: 0, stroke: "#d97706", fill: "#d97706" }}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="qty_qadsia" 
                          name="كمية القادسية"
                          stroke="#b45309" 
                          strokeWidth={1.5} 
                          strokeDasharray="2 2"
                          connectNulls
                          activeDot={{ r: 4, strokeWidth: 0 }} 
                          dot={{ r: 2, strokeWidth: 0, stroke: "#b45309", fill: "#b45309" }}
                        />
                        <Line 
                          yAxisId="left"
                          type="monotone" 
                          dataKey="lifespan_murooj" 
                          name="بقاء المروج (يوم)"
                          stroke="#0d9488" 
                          strokeWidth={3} 
                          connectNulls
                          activeDot={{ r: 6, strokeWidth: 0 }} 
                          dot={{ r: 3, strokeWidth: 0, stroke: "#0d9488", fill: "#0d9488" }}
                        />
                        <Line 
                          yAxisId="right"
                          type="monotone" 
                          dataKey="qty_murooj" 
                          name="كمية المروج"
                          stroke="#0f766e" 
                          strokeWidth={1.5} 
                          strokeDasharray="2 2"
                          connectNulls
                          activeDot={{ r: 4, strokeWidth: 0 }} 
                          dot={{ r: 2, strokeWidth: 0, stroke: "#0f766e", fill: "#0f766e" }}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          }
        })()}
      </div>

      {/* Main Filter Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
        
        {/* Row 1: Direct options */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500">حسب الفرع</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value as any)}
              disabled={userBranch !== "الكل"}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="الكل">جميع الفروع المتاحة</option>
              <option value="القادسية">فرع القادسية</option>
              <option value="المروج">فرع المروج</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500">حالة الإستهلاك</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="الكل">كافة الحالات</option>
              <option value="active">مخزون نشط ومتاح</option>
              <option value="depleted">مستهلك ونافذ بالكامل</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500">فلترة المصدر</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="الكل">كل المصادر</option>
              <option value="manual">كشوفات اليومية / مضاف يدوياً</option>
              <option value="invoice">مستخلص تلقائياً من الفواتير مسبقاً</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500">من تاريخ</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-extrabold text-slate-500">إلى تاريخ</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="البحث السريع عن سلعة معينة أو رقم فاتورة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-right pl-4 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </div>

      </div>

      {/* Database Inventory Log Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-right w-full md:w-auto">
            <h3 className="text-xs font-extrabold text-slate-900">🗂️ كشف حصر السلع والمخزون المالح ببراعة</h3>
            <p className="text-[10px] text-slate-400">حدد بعض المنتجات لحذفها، أو قم بتفريغ المخزون بالكامل بكبسة زر</p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 bg-indigo-50/80 px-3 py-1.5 rounded-xl border border-indigo-100 animate-fade-in text-[10px] text-indigo-700 font-extrabold">
                <span>تم تحديد {selectedIds.length}</span>
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-500 hover:bg-red-600 text-white px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer font-bold font-sans"
                >
                  <Trash className="w-3 h-3" />
                  <span>حذف المحدد</span>
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-lg transition-colors cursor-pointer font-bold font-sans"
                >
                  <span>إلغاء</span>
                </button>
              </div>
            )}

            <button
              onClick={handleClearAllPurchases}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
              title="تدمير وحذف كافة السلع المعروضة"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>حذف كافة سلع ({selectedBranch === "الكل" ? "الكل" : selectedBranch})</span>
            </button>

            <button 
              onClick={fetchPurchases}
              className="text-slate-500 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-slate-100 bg-white"
              title="إنعاش البيانات من التخزين"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs font-medium text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            <span>جاري قراءة سجلات المشتريات والذكاء الاصطناعي...</span>
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="py-20 text-center text-xs font-medium text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <span>لا توجد مشتريات مطابقة لمعايير البحث الحالية.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 font-extrabold">
                  <th className="p-4 w-10 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      checked={filteredPurchases.length > 0 && filteredPurchases.every((p) => selectedIds.includes(p.id))}
                      onChange={handleSelectAllToggle}
                    />
                  </th>
                  <th className="p-4">اسم السلعة / المنتج</th>
                  <th className="p-4">نوع السلعة</th>
                  <th className="p-4">تاريخ التسلّم</th>
                  <th className="p-4">فترة البقاء بالمخزون</th>
                  <th className="p-4">الفرع</th>
                  <th className="p-4">التكلفة (SAR)</th>
                  <th className="p-4">الكمية المشحونة</th>
                  <th className="p-4">مصدر الإدخال</th>
                  <th className="p-4 text-center">حالة نفاذ المخزون</th>
                  <th className="p-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((item) => {
                  const analysis = getAnalysis(item);
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-50 text-xs font-bold text-slate-800 transition-colors ${isSelected ? "bg-indigo-50/30" : ""}`}
                    >
                      <td className="p-4 text-center">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          checked={isSelected}
                          onChange={() => handleSelectToggle(item.id)}
                        />
                      </td>
                      <td className="p-4 text-slate-900 font-extrabold max-w-[200px]">
                        <div className="truncate" title={item.name}>{item.name}</div>
                        {item.status === 'depleted' && (
                          <span className="inline-block text-[9px] text-indigo-500 bg-indigo-50/50 px-1.5 py-0.5 rounded-md font-extrabold mt-1">
                            استُبدل تلقائيًا بطلب أحدث
                          </span>
                        )}
                        {/* Inline Intelligence Price Badges */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysis.priceTrend === "up" && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] bg-rose-50 text-rose-700 border border-rose-100 font-black">
                              📈 زاد السعر (+{analysis.pricePct.toFixed(0)}%)
                            </span>
                          )}
                          {analysis.priceTrend === "down" && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-black">
                              📉 انخفض السعر (-{Math.abs(analysis.pricePct).toFixed(0)}%)
                            </span>
                          )}
                          {analysis.qtyTrend === "up" && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] bg-sky-50 text-sky-700 border border-sky-100 font-black">
                              📦 زادت الكمية (+{analysis.qtyPct.toFixed(0)}%)
                            </span>
                          )}
                          {analysis.qtyTrend === "down" && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] bg-violet-50 text-violet-700 border border-violet-100 font-black">
                              📦 نقصت الكمية (-{Math.abs(analysis.qtyPct).toFixed(0)}%)
                            </span>
                          )}
                          {analysis.qtyTrend === "stable" && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] bg-slate-100 text-slate-700 border border-slate-200 font-black">
                              📦 كمية مستقرة
                            </span>
                          )}
                          {analysis.durationTrend === "longer" && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-black">
                              ⏱️ عمر أطول (+{analysis.durationDiff.toFixed(0)} يوم)
                            </span>
                          )}
                          {analysis.durationTrend === "shorter" && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] bg-amber-50 text-amber-700 border border-amber-100 font-black">
                              ⚡ استهلاك أسرع (-{Math.abs(analysis.durationDiff).toFixed(0)} يوم)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {item.category ? (
                          <span className="inline-flex items-center gap-1 bg-pink-50 text-pink-700 border border-pink-100 text-[10px] px-2.5 py-1 rounded-lg font-black shadow-3xs">
                            {item.category}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] font-medium italic">غير مصنف</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-500">{item.date}</td>
                      <td className="p-4">
                        {item.status === "active" ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-100 font-black">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              <span>مخزون نشط ومتاح</span>
                            </span>
                            <div className="text-[10px] text-indigo-600 font-extrabold">
                              متاح منذ: <strong className="font-mono text-xs">{getDaysSince(item.date)}</strong> يوم
                              {analysis.itemAvgLifespan > 0 && (
                                <span className="text-[9px] text-slate-400 block font-normal">المعدل العام للسلعة: {analysis.itemAvgLifespan.toFixed(1)} أيام</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-100">
                              <span>مستهلك بالكامل</span>
                            </span>
                            <div className="text-[10px] text-slate-500 font-bold">
                              طول البقاء: <strong className="font-mono text-xs text-slate-700">{analysis.currentDuration}</strong> يوم
                              {analysis.itemAvgLifespan > 0 && (
                                <span className="text-[9px] text-slate-400 block font-normal">المعدل العام للسلعة: {analysis.itemAvgLifespan.toFixed(1)} أيام</span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] ${
                          item.branch === "القادسية" 
                            ? "bg-amber-50 text-amber-700 border border-amber-100" 
                            : "bg-teal-50 text-teal-700 border border-teal-100"
                        }`}>
                          {item.branch}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-indigo-600">
                        <div>{item.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        {item.source === "invoice" ? (
                          <span className="block text-[9px] text-amber-600/90 font-extrabold mt-0.5">
                            (سعر حدّي للوحدة)
                          </span>
                        ) : parseQtyVal(item.qty) > 1 ? (
                          <span className="block text-[9px] text-slate-400 font-medium mt-0.5" dir="rtl">
                            ({getItemUnitPrice(item).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} للوحدة)
                          </span>
                        ) : null}
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                        {item.qty || "غير مجدول"}
                      </td>
                      <td className="p-4">
                        {item.source === "invoice" ? (
                          <span className="flex items-center gap-1 text-[10px] text-yellow-600 font-extrabold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>فاتورة ضريبية {item.invoiceId ? `#${item.invoiceId.split('-').slice(-1)}` : ""}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            كشف يومية {item.invoiceId ? `#${item.invoiceId.split('-').slice(-1)}` : "يدوي"}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                            item.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 line-through hover:bg-slate-200"
                          }`}
                          title="انقر لتغيير الحالة يدويًا"
                        >
                          {item.status === "active" ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                              <span>نشط ومتاح</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>نافذ ({item.depletedDate || "مستهلك"})</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleStartEdit(item)}
                            className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="تعديل تفاصيل السلعة"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                            title="حذف نهائي"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
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

      {/* Edit Modal / نافذة التعديل لمنتج معين */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" dir="rtl">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-100 shadow-2xl overflow-hidden text-right">
            
            {/* Modal Header */}
            <div className="bg-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-black flex items-center gap-1.5">
                  <Pencil className="w-4 h-4 text-indigo-300" />
                  <span>تعديل سجل منتج: {editingItem.name}</span>
                </h3>
                <p className="text-[10px] text-indigo-200">تحديث تفاصيل مخزون أو تكلّفة المادة في نظام التتبع</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-indigo-200 hover:text-white p-1 rounded-xl hover:bg-indigo-800 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              
              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 block">اسم السلعة / المنتج</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-right px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                  placeholder="مثال: غاز، خبز، كرتون صلصة، بيبسي..."
                  required
                />
              </div>

              {/* Product Category (نوع السلعة) */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-pink-700 block">نوع السلعة / تصنيف المخزون</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full text-right px-3.5 py-2.5 text-xs bg-pink-50/10 border border-pink-200 rounded-xl focus:outline-none focus:border-pink-500 font-bold text-pink-700"
                  placeholder="مثال: خضار، غاز، بيبسي، ديزل..."
                />
              </div>

              {/* Date & Branch Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 block">تاريخ التسلّم</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-right px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 block">الفرع المخصص</label>
                  <select
                    value={editBranch}
                    onChange={(e) => setEditBranch(e.target.value as any)}
                    className="w-full text-right px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="القادسية">فرع القادسية</option>
                    <option value="المروج">فرع المروج</option>
                  </select>
                </div>
              </div>

              {/* Price & Quantity Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 block">التكلفة الإجمالية (SAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="w-full text-right px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold font-mono font-sans"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 block">الكمية / الحجم</label>
                  <input
                    type="text"
                    placeholder="مثال: 5 كراتين، 2 حبة..."
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value)}
                    className="w-full text-right px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                    required
                  />
                </div>
              </div>

              {/* Status & Depleted Date */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-50 pt-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 block">حالة نفاذ المخزون</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full text-right px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="active">🟢 مخزون نشط ومتاح</option>
                    <option value="depleted">🛑 مستهلك ونافذ بالكامل</option>
                  </select>
                </div>

                {editStatus === "depleted" && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-black text-slate-500 block">تاريخ الاستهلاك / النفاذ</label>
                    <input
                      type="date"
                      value={editDepletedDate}
                      onChange={(e) => setEditDepletedDate(e.target.value)}
                      className="w-full text-right px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 font-bold font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-5 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>حفظ التعديلات والتحديث</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
