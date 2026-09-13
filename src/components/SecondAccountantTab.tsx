import React, { useState, useEffect } from "react";
import { DailyEntry, Settings } from "../types";
import { 
  Building2, Calendar, DollarSign, CreditCard, ShoppingCart, 
  Truck, Save, CheckCircle2, Clock, AlertCircle, Plus, Trash2, 
  RefreshCw, FileText, Check, ChevronRight, Layers, Sparkles, Languages,
  Lock, Edit3, ShieldCheck
} from "lucide-react";

interface SecondAccountantTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
  userBranch?: "الكل" | "القادسية" | "المروج";
  userName?: string;
}

export default function SecondAccountantTab({
  onShowToast,
  userRole,
  userBranch,
  userName = "محاسب ثان"
}: SecondAccountantTabProps) {
  // Language mode toggle: "both" (Bilingual AR + EN) | "ar" | "en" | "hi"
  const [langMode, setLangMode] = useState<"both" | "ar" | "en" | "hi">("both");
  const isLtr = langMode === "en" || langMode === "hi";

  // Translation helper: returns Arabic in "ar", English in "en", Hindi in "hi", and bilingual in "both"
  const t = (ar: string, en: string, hiOrSep?: string, maybeSep = " / ") => {
    const isSep = hiOrSep === " • " || hiOrSep === " / " || hiOrSep === " - ";
    const hi = isSep ? undefined : hiOrSep;
    const sep = isSep ? hiOrSep : maybeSep;

    if (langMode === "ar") return ar;
    if (langMode === "en") return en;
    if (langMode === "hi") return hi || en;
    return `${ar}${sep}${en}`;
  };

  const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayStr = () => getDaysAgoStr(0);
  const getYesterdayStr = () => getDaysAgoStr(1);
  const getTwoDaysAgoStr = () => getDaysAgoStr(2);

  // Branch state
  const [branch, setBranch] = useState<"القادسية" | "المروج">(() => {
    if (userBranch && userBranch !== "الكل") {
      return userBranch as "القادسية" | "المروج";
    }
    return "القادسية";
  });

  // Date state - defaults to yesterday (the previous day that ended)
  const [date, setDate] = useState<string>(getYesterdayStr());
  const isToday = date === getTodayStr();
  const isYesterday = date === getYesterdayStr();
  const isTwoDaysAgo = date === getTwoDaysAgoStr();
  // Flexible entry: editable for today and the past 2 days
  const isEditable = isToday || isYesterday || isTwoDaysAgo;

  const getDateLabel = () => {
    if (isToday) return t("اليوم الحالي", "Today", "आज (Today)");
    if (isYesterday) return t("أمس (اليوم السابق)", "Yesterday", "कल (Yesterday)");
    if (isTwoDaysAgo) return t("قبل يومين", "2 Days Ago", "2 दिन पहले (2 Days Ago)");
    return date;
  };

  // Existing entry state & review status
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingEntry, setExistingEntry] = useState<DailyEntry | null>(null);

  // Form Fields:
  // 1. Cash in Drawer (الدرج الفعلي - كاش)
  const [cashBox, setCashBox] = useState<number | "">("");

  // 2. POS Devices (نقاط البيع والشبكة)
  const [mada1, setMada1] = useState<number | "">("");
  const [visa1, setVisa1] = useState<number | "">("");
  const [mada2, setMada2] = useState<number | "">("");
  const [visa2, setVisa2] = useState<number | "">("");
  // Additional POS devices list
  const [extraDevices, setExtraDevices] = useState<{ name: string; mada: number | ""; visa: number | "" }[]>([]);

  // 3. Urgent Cash Purchases paid from Drawer (مشتريات نقدية عاجلة تم دفعها من الدرج)
  const [purGas, setPurGas] = useState<number | "">("");
  const [purBread, setPurBread] = useState<number | "">("");
  const [purVeg, setPurVeg] = useState<number | "">("");
  const [purGroc, setPurGroc] = useState<number | "">("");

  // 4. Warehouse (مؤسسة حبة الأخضر) -> makhzan
  const [makhzan, setMakhzan] = useState<number | "">("");

  // 5. Pepsi & Beverages (بيبسي ومشروبات) -> pepsi_paid
  const [pepsiPaid, setPepsiPaid] = useState<number | "">("");

  // 6. Saqr Packaging (صقر للتغليف) -> plastic_paid
  const [plasticPaid, setPlasticPaid] = useState<number | "">("");

  // 7. Amal Al-Romaih Sauces & Raw Materials (الصلصات والمواد الأولية - أمل الرميح) -> sauces_paid
  const [saucesPaid, setSaucesPaid] = useState<number | "">("");

  // 8. Diesel (الديزل) -> diesel_paid
  const [dieselPaid, setDieselPaid] = useState<number | "">("");

  // Supplier installment entry types: 'payment' (دفع قسط مالي) | 'invoice' (فاتورة جديدة كاملة)
  const [pepsiType, setPepsiType] = useState<'payment' | 'invoice'>('invoice');
  const [plasticType, setPlasticType] = useState<'payment' | 'invoice'>('invoice');
  const [saucesType, setSaucesType] = useState<'payment' | 'invoice'>('invoice');
  const [dieselType, setDieselType] = useState<'payment' | 'invoice'>('invoice');

  // Active carryovers & system settings for dynamic installment calculations
  const [carryovers, setCarryovers] = useState<any[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // 9. Delivery Count (عدد التوصيل)
  // For Qadisiyah: count multiplied by 6 SAR
  // For Murooj: entered directly as an amount
  const [deliveryCount, setDeliveryCount] = useState<number | "">("");
  const [deliveryRate, setDeliveryRate] = useState<number>(6); // Default 6 for Qadisiyah

  // 10. Notes
  const [notes, setNotes] = useState<string>("");

  // Fetch entry for the selected branch & date
  const fetchDayData = async (selectedBranch: "القادسية" | "المروج", selectedDate: string) => {
    setLoading(true);
    try {
      // Fetch carryovers for this branch and date concurrently with day data
      let carryList: any[] = [];
      try {
        const carryRes = await fetch(`/api/carryover?branch=${encodeURIComponent(selectedBranch)}&date=${selectedDate}`);
        if (carryRes.ok) {
          carryList = await carryRes.json();
          setCarryovers(carryList);
        }
      } catch (carryErr) {
        console.error("Error fetching carryovers for second accountant:", carryErr);
      }

      // Fetch system settings if not yet loaded
      if (!settings) {
        try {
          const setRes = await fetch("/api/settings");
          if (setRes.ok) {
            const setJson = await setRes.json();
            setSettings(setJson);
          }
        } catch (setErr) {
          console.error("Error fetching settings for second accountant:", setErr);
        }
      }

      const res = await fetch(`/api/days?branch=${selectedBranch}&from=${selectedDate}&to=${selectedDate}`);
      if (res.ok) {
        const list: DailyEntry[] = await res.json();
        const found = list.find((d) => d.date === selectedDate && d.branch === selectedBranch);
        if (found) {
          setExistingEntry(found);
          // Populate fields
          setCashBox(found.cash_box || "");
          setMada1(found.mada1 || "");
          setVisa1(found.visa1 || "");
          setMada2(found.mada2 || "");
          setVisa2(found.visa2 || "");

          // Device 3 or extra devices
          if (found.extra_pos_devices && found.extra_pos_devices.length > 0) {
            setExtraDevices(found.extra_pos_devices.map(d => ({
              name: d.name || "جهاز إضافي",
              mada: d.mada || "",
              visa: d.visa || ""
            })));
          } else if (found.mada3 || found.visa3) {
            setExtraDevices([{
              name: "جهاز 3 / POS Device 3",
              mada: found.mada3 || "",
              visa: found.visa3 || ""
            }]);
          } else {
            setExtraDevices([]);
          }

          // Urgent cash purchases
          setPurGas(found.pur_gas || found.gas || "");
          setPurBread(found.pur_bread || found.bread || "");
          setPurVeg(found.pur_veg || found.vegetables || "");
          setPurGroc(found.pur_groc || found.grocery || "");

          // Suppliers
          setMakhzan(found.makhzan || "");
          setPepsiPaid(found.pepsi_paid || "");
          setPepsiType(found.pepsi_type || (carryList.some(c => c.key === "pepsi" && c.carry > 0) ? 'payment' : 'invoice'));

          setPlasticPaid(found.plastic_paid || "");
          setPlasticType(found.plastic_type || (carryList.some(c => c.key === "plastic" && c.carry > 0) ? 'payment' : 'invoice'));

          setSaucesPaid(found.sauces_paid || "");
          setSaucesType(found.sauces_type || (carryList.some(c => c.key === "sauces" && c.carry > 0) ? 'payment' : 'invoice'));

          setDieselPaid(found.diesel_paid || "");
          setDieselType(found.diesel_type || (carryList.some(c => c.key === "diesel" && c.carry > 0) ? 'payment' : 'invoice'));

          // Delivery
          const deliveryItem = (found.others || []).find(o => o.name === "توصيل");
          if (found.delivery_count !== undefined && found.delivery_count !== null && found.delivery_count > 0) {
            setDeliveryCount(found.delivery_count);
            setDeliveryRate(found.delivery_rate || 6);
          } else if (deliveryItem) {
            if (selectedBranch === "القادسية") {
              const rate = found.delivery_rate || 6;
              setDeliveryRate(rate);
              setDeliveryCount(Math.round(deliveryItem.amt / rate));
            } else {
              setDeliveryCount(deliveryItem.amt);
            }
          } else {
            setDeliveryCount("");
          }

          setNotes(found.notes || "");
        } else {
          setExistingEntry(null);
          // Reset form to clean defaults with installment awareness
          resetForm(carryList);
        }
      }
    } catch (err) {
      console.error("Error fetching day data for second accountant:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (currentCarries?: any[]) => {
    const list = currentCarries || carryovers;
    setCashBox("");
    setMada1("");
    setVisa1("");
    setMada2("");
    setVisa2("");
    setExtraDevices([]);
    setPurGas("");
    setPurBread("");
    setPurVeg("");
    setPurGroc("");
    setMakhzan("");
    setPepsiPaid("");
    setPlasticPaid("");
    setSaucesPaid("");
    setDieselPaid("");
    setDeliveryCount("");
    setNotes("");

    setPepsiType(list.some(c => c.key === "pepsi" && c.carry > 0) ? 'payment' : 'invoice');
    setPlasticType(list.some(c => c.key === "plastic" && c.carry > 0) ? 'payment' : 'invoice');
    setSaucesType(list.some(c => c.key === "sauces" && c.carry > 0) ? 'payment' : 'invoice');
    setDieselType(list.some(c => c.key === "diesel" && c.carry > 0) ? 'payment' : 'invoice');
  };

  // Helper and calculations for interactive live installments feedback
  const getCarryoverStats = (key: string, liveAddedAmtRaw: number | string, entryType: 'payment' | 'invoice') => {
    const item = carryovers.find(c => c.key === key);
    const liveAddedAmt = parseFloat(liveAddedAmtRaw as string) || 0;
    
    // Determine the active cap from settings or defaults
    let currentCap = 400;
    if (settings) {
      if (key === "pepsi") {
        currentCap = branch === "القادسية"
          ? (settings.سقف_بيبسي_قادسية || settings.سقف_بيبسي || 400)
          : (settings.سقف_بيبسي_مروج || settings.سقف_بيبسي || 400);
      } else if (key === "plastic") {
        currentCap = branch === "القادسية"
          ? (settings.سقف_بلاستيك_قادسية || settings.سقف_بلاستيك || 100)
          : (settings.سقف_بلاستيك_مروج || settings.سقف_بلاستيك || 100);
      } else if (key === "sauces") {
        currentCap = branch === "القادسية"
          ? (settings.سقف_صلصات_قادسية || settings.سقف_صلصات || 150)
          : (settings.سقف_صلصات_مروج || settings.سقف_صلصات || 150);
      } else if (key === "diesel") {
        currentCap = branch === "القادسية" ? (settings.سقف_ديزل_قادسية || 50) : (settings.سقف_ديزل_مروج || 30);
      }
    }

    if (!item) {
      // No active carryover from yesterday (fresh starts or currently clear)
      if (liveAddedAmt > 0) {
        const deduct = Math.min(liveAddedAmt, currentCap);
        const remaining = Math.max(0, liveAddedAmt - deduct);
        const daysLeft = currentCap > 0 ? Math.ceil(remaining / currentCap) : 0;
        return {
          hasPrev: false,
          prevCarry: 0,
          cap: currentCap,
          deduct,
          remaining,
          totalOriginal: liveAddedAmt,
          daysPassed: deduct > 0 ? 1 : 0,
          daysLeft,
          exceedsCap: liveAddedAmt > currentCap
        };
      }
      return null;
    }

    // There is an active carryover in progress
    const prevCarry = item.carry || 0;

    let deduct = 0;
    let remaining = prevCarry;
    let totalOriginal = item.totalOriginal || prevCarry;
    let daysPassed = item.daysPassed || 0;

    if (entryType === 'invoice') {
      // New invoice being added
      if (liveAddedAmt > 0) {
        totalOriginal = Number(((item.totalOriginal || 0) + liveAddedAmt).toFixed(2));
        const totalBalance = Number((prevCarry + liveAddedAmt).toFixed(2));
        deduct = Math.min(totalBalance, currentCap);
        remaining = Number((totalBalance - deduct).toFixed(2));
      } else {
        // empty invoice entered - fallback to auto-deducting previous carryover
        deduct = Math.min(prevCarry, currentCap);
        remaining = Number((prevCarry - deduct).toFixed(2));
      }
    } else {
      // payment mode represent payments or automatic deduction
      if (liveAddedAmt > 0) {
        // Manual payment specified
        deduct = Math.min(liveAddedAmt, prevCarry);
        remaining = Number((prevCarry - deduct).toFixed(2));
      } else {
        // No input: automatic deduction up to current cap
        deduct = Math.min(prevCarry, currentCap);
        remaining = Number((prevCarry - deduct).toFixed(2));
      }
    }

    // Number of days left of installments
    const daysLeft = currentCap > 0 ? Math.ceil(remaining / currentCap) : 0;

    return {
      hasPrev: true,
      prevCarry,
      cap: currentCap,
      deduct,
      remaining,
      totalOriginal,
      daysPassed: deduct > 0 ? daysPassed + 1 : daysPassed,
      daysLeft,
      exceedsCap: entryType === 'invoice' && liveAddedAmt > currentCap
    };
  };

  const renderSupplierInstallmentCard = (
    key: "pepsi" | "plastic" | "sauces" | "diesel",
    title: string,
    badgeText: string,
    badgeColor: string,
    paid: number | "",
    setPaid: (val: number | "") => void,
    entryType: "payment" | "invoice",
    setEntryType: (val: "payment" | "invoice") => void
  ) => {
    const carryItem = carryovers.find(c => c.key === key);
    const hasActiveInstallment = Boolean(carryItem && carryItem.carry > 0);
    const stats = getCarryoverStats(key, paid, entryType);
    const quickCapAmt = carryItem ? Math.min(carryItem.carry, carryItem.cap) : (stats?.cap || 0);

    return (
      <div className="space-y-2.5 bg-slate-50/80 p-4 rounded-xl border border-slate-200/80 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <label className="block text-xs font-black text-slate-800">
                <span>{title}</span>
              </label>
              <span className={`text-[9px] ${badgeColor} font-bold px-1.5 py-0.5 rounded`}>
                {badgeText}
              </span>
            </div>

            {/* Installment Status Pill */}
            {hasActiveInstallment ? (
              <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>{t("قسط نشط", "Active", "किश्त चालू")}</span>
                <span className="font-mono font-black">{carryItem?.carry.toFixed(0)}</span>
                <span className="text-[8px] opacity-80">{t("ر", "SAR", "रियाल")}</span>
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>{t("تم السداد", "Cleared", "कोई किश्त नहीं")}</span>
              </span>
            )}
          </div>

          {/* Mode Selector (Pay Installment vs Full New Invoice) */}
          {hasActiveInstallment ? (
            <div className="bg-white p-1 rounded-lg border border-slate-200 grid grid-cols-2 gap-1 text-[11px] font-bold">
              <button
                type="button"
                disabled={!isEditable}
                onClick={() => setEntryType("payment")}
                className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  entryType === "payment"
                    ? "bg-emerald-600 text-white shadow-xs font-black"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>🟢</span>
                <span>{t("دفع قسط مالي", "Pay Installment", "किश्त भरें")}</span>
              </button>
              <button
                type="button"
                disabled={!isEditable}
                onClick={() => setEntryType("invoice")}
                className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  entryType === "invoice"
                    ? "bg-blue-600 text-white shadow-xs font-black"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>🔵</span>
                <span>{t("فاتورة كاملة", "Full Invoice", "नया पूरा बिल")}</span>
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50/60 border border-emerald-100 px-2.5 py-1 rounded-lg text-[10px] text-emerald-800 flex items-center justify-between">
              <span>{t("الرصيد مصفّر بالكامل", "Zero Balance", "पिछला पूरा बकाया चुकता है")}</span>
              <span className="font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                {t("مسموح فاتورة جديدة", "New Invoice Only", "केवल नया बिल")}
              </span>
            </div>
          )}

          {/* Amount input with Quick Cap Button */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-700">
                {entryType === "payment" && hasActiveInstallment
                  ? t("مبلغ القسط المسدد لليوم", "Today's installment payment", "आज की भरी जाने वाली किश्त")
                  : t("مبلغ الفاتورة الإجمالي الجديد", "Total new invoice amount", "नया कुल बिल राशि")}
              </span>
              {hasActiveInstallment && entryType === "payment" && isEditable && quickCapAmt > 0 && (
                <button
                  type="button"
                  onClick={() => setPaid(quickCapAmt)}
                  className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold px-2 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
                >
                  {t("قسط اليوم", "Today's Cap", "आज की किश्त")} ({quickCapAmt} {t("ر", "SAR", "रियाल")})
                </button>
              )}
            </div>

            <input
              type="number"
              step="0.01"
              placeholder={
                entryType === "payment" && hasActiveInstallment
                  ? t("أدخل قيمة قسط اليوم أو اتركها تلقائية", "Enter installment amount or leave auto", "किश्त राशि लिखें या खाली छोड़ें")
                  : t("أدخل قيمة الفاتورة الكاملة", "Enter full invoice amount", "पूरे बिल की राशि दर्ज करें")
              }
              disabled={!isEditable}
              value={paid}
              onChange={(e) => setPaid(e.target.value === "" ? "" : parseFloat(e.target.value))}
              className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                !isEditable 
                  ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                  : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
              }`}
              style={{ color: "#000000" }}
            />
          </div>
        </div>

        {/* Live installment breakdown and queue alert */}
        {stats && (
          <div className="bg-white/95 rounded-lg border border-slate-200 p-2.5 space-y-2 text-[10px] mt-2">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-slate-600 font-mono">
              <div className="flex justify-between border-b border-slate-100 pb-0.5">
                <span className="text-slate-500 font-sans">{t("الفاتورة الإجمالية:", "Total Invoice:", "कुल बिल:")}</span>
                <span className="font-bold text-slate-800">{stats.totalOriginal.toFixed(1)} {t("ر", "SAR", "रियाल")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-0.5">
                <span className="text-slate-500 font-sans">{t("السقف اليومي:", "Daily Cap:", "दैनिक सीमा:")}</span>
                <span className="font-bold text-slate-800">{stats.cap} {t("ر/يوم", "SAR/day", "रियाल/दिन")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-0.5">
                <span className="text-slate-500 font-sans">{t("مصروف اليوم الفعلي:", "Today's Deduct:", "आज का ख़र्च:")}</span>
                <span className="font-bold text-blue-700">{stats.deduct.toFixed(1)} {t("ر", "SAR", "रियाل")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-0.5">
                <span className="text-slate-500 font-sans">{t("المتبقي للغد:", "Remaining:", "बकाया:")}</span>
                <span className={`font-bold ${stats.remaining > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                  {stats.remaining.toFixed(1)} {t("ر", "SAR", "रियाल")}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
              <span>{t("الأيام المتبقية:", "Days Left:", "बाकी दिन:")}</span>
              <span className="font-bold font-mono text-slate-700">{stats.daysLeft} {t("يوم", "days", "दिन")}</span>
            </div>

            {/* Warning if invoice exceeds cap */}
            {stats.exceedsCap && (
              <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded p-1.5 text-[9px] leading-relaxed">
                ⚠️ {t(
                  `الفاتورة أكبر من السقف اليومي (${stats.cap} ر). سيقوم النظام بجدولتها وصرفها بالتقسيط المجدول تلقائياً.`,
                  `Invoice exceeds daily cap (${stats.cap} SAR). Scheduled auto-installments will be applied.`,
                  `बिल दैनिक सीमा (${stats.cap} रियाल) से अधिक है। सिस्टम इसे किश्तों में बाँटेगा।`
                )}
              </div>
            )}

            {/* Alert if new invoice queued before previous installment finishes */}
            {hasActiveInstallment && entryType === "invoice" && (
              <div className="bg-blue-50 text-blue-900 border border-blue-200 rounded p-1.5 text-[9px] leading-relaxed">
                🚨 {t(
                  "تنبيه: لم ينتهِ القسط السابق! سيتم إدراج هذه الفاتورة الجديدة تلقائياً بعد استهلاك الأقساط الحالية وفق القواعد وحد القسط.",
                  "Alert: Previous installment not finished! New invoice will queue automatically after current installments.",
                  "सूचना: पिछली किश्त समाप्त नहीं हुई है! वर्तमान किश्तों के बाद यह नया बिल कतार में जुड़ेगा।"
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    fetchDayData(branch, date);
  }, [branch, date]);

  // Calculations for live summary
  const valCashBox = typeof cashBox === "number" ? cashBox : 0;
  const valPurGas = typeof purGas === "number" ? purGas : 0;
  const valPurBread = typeof purBread === "number" ? purBread : 0;
  const valPurVeg = typeof purVeg === "number" ? purVeg : 0;
  const valPurGroc = typeof purGroc === "number" ? purGroc : 0;
  const totalUrgentPurchases = valPurGas + valPurBread + valPurVeg + valPurGroc;

  const valMada1 = typeof mada1 === "number" ? mada1 : 0;
  const valVisa1 = typeof visa1 === "number" ? visa1 : 0;
  const valMada2 = typeof mada2 === "number" ? mada2 : 0;
  const valVisa2 = typeof visa2 === "number" ? visa2 : 0;

  const extraMadaTotal = extraDevices.reduce((sum, d) => sum + (typeof d.mada === "number" ? d.mada : 0), 0);
  const extraVisaTotal = extraDevices.reduce((sum, d) => sum + (typeof d.visa === "number" ? d.visa : 0), 0);

  const totalMada = valMada1 + valMada2 + extraMadaTotal;
  const totalVisa = valVisa1 + valVisa2 + extraVisaTotal;
  const totalPos = totalMada + totalVisa;

  const valMakhzan = typeof makhzan === "number" ? makhzan : 0;
  const valPepsi = typeof pepsiPaid === "number" ? pepsiPaid : 0;
  const valPlastic = typeof plasticPaid === "number" ? plasticPaid : 0;
  const valSauces = typeof saucesPaid === "number" ? saucesPaid : 0;
  const valDiesel = typeof dieselPaid === "number" ? dieselPaid : 0;
  const totalSuppliers = valMakhzan + valPepsi + valPlastic + valSauces + valDiesel;

  // Delivery count
  const rawDeliveryCount = typeof deliveryCount === "number" ? deliveryCount : 0;

  // Device management
  const handleAddDevice = () => {
    const nextNum = extraDevices.length + 3;
    setExtraDevices([
      ...extraDevices,
      {
        name: `جهاز ${nextNum} / Device ${nextNum}`,
        mada: "",
        visa: ""
      }
    ]);
  };

  const handleRemoveDevice = (idx: number) => {
    setExtraDevices(extraDevices.filter((_, i) => i !== idx));
  };

  const handleUpdateDevice = (idx: number, field: "mada" | "visa", val: string) => {
    const updated = [...extraDevices];
    updated[idx] = {
      ...updated[idx],
      [field]: val === "" ? "" : parseFloat(val)
    };
    setExtraDevices(updated);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if the entry date is editable (today or past two days)
    if (!isEditable) {
      onShowToast(
        langMode === "en" 
          ? "🔒 Modification is not allowed for older dates. Entry is available for today and the past 2 days."
          : langMode === "hi"
          ? "🔒 पुराने दिनों का रिकॉर्ड बदला नहीं जा सकता। एंट्री केवल आज और पिछले 2 दिनों के लिए उपलब्ध है।"
          : "🔒 لا يمكن تعديل مدخلات الأيام السابقة البعيدة. الإدخال متاح لليوم الحالي وآخر يومين سابقين."
      );
      return;
    }

    if (cashBox === "" && totalPos === 0 && totalUrgentPurchases === 0 && totalSuppliers === 0) {
      onShowToast(
        langMode === "en" 
          ? "⚠️ Please enter at least cash in drawer or POS collections." 
          : langMode === "hi"
          ? "⚠️ कृपया कम से कम गल्ले का नकद (कैश) या कार्ड मशीन (POS) की बिक्री दर्ज करें।"
          : "⚠️ يرجى إدخال مبلغ الصندوق الفعلي أو مبيعات الشبكة على الأقل."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Aggregate all extra POS devices beyond device 2 into mada3/visa3 for complete calculation
      const dev3Mada = extraDevices.reduce((sum, d) => sum + (typeof d.mada === "number" ? d.mada : 0), 0);
      const dev3Visa = extraDevices.reduce((sum, d) => sum + (typeof d.visa === "number" ? d.visa : 0), 0);

      // Other additional devices beyond device 3 are summed into device 3 or stored in extra_pos_devices
      const extraDevicesClean = extraDevices.map(d => ({
        name: d.name,
        mada: typeof d.mada === "number" ? d.mada : 0,
        visa: typeof d.visa === "number" ? d.visa : 0
      }));

      // Other expenses: preserve existing non-delivery items
      const othersList = existingEntry?.others ? [...existingEntry.others] : [];
      const filteredOthers = othersList.filter(o => o.name !== "توصيل");

      const payload: Partial<DailyEntry> & { branch: "القادسية" | "المروج"; date: string } = {
        id: `${branch}-${date}`,
        branch,
        date,
        sarf: existingEntry?.sarf ?? 350,
        cash_box: valCashBox,
        cash_purchases: totalUrgentPurchases,
        // Urgent cash purchases (reflects in pur_* and in standard expenses per user mandate)
        pur_gas: valPurGas,
        gas: valPurGas,
        pur_bread: valPurBread,
        bread: valPurBread,
        pur_veg: valPurVeg,
        vegetables: valPurVeg,
        pur_groc: valPurGroc,
        grocery: valPurGroc,
        pur_extras: existingEntry?.pur_extras ?? [],
        // POS
        mada1: valMada1,
        visa1: valVisa1,
        mada2: valMada2,
        visa2: valVisa2,
        mada3: dev3Mada,
        visa3: dev3Visa,
        extra_pos_devices: extraDevicesClean,
        // Suppliers - Properly tag as payment (installment deduction) or invoice (new bill with auto-scheduling)
        makhzan: valMakhzan,
        pepsi_paid: valPepsi,
        pepsi_type: carryovers.some(c => c.key === "pepsi" && c.carry > 0) ? pepsiType : "invoice",
        plastic_paid: valPlastic,
        plastic_type: carryovers.some(c => c.key === "plastic" && c.carry > 0) ? plasticType : "invoice",
        sauces_paid: valSauces,
        sauces_type: carryovers.some(c => c.key === "sauces" && c.carry > 0) ? saucesType : "invoice",
        diesel_paid: valDiesel,
        diesel_type: carryovers.some(c => c.key === "diesel" && c.carry > 0) ? dieselType : "invoice",
        // Delivery
        delivery_count: rawDeliveryCount,
        delivery_rate: deliveryRate,
        others: filteredOthers,
        fixed_deduct: existingEntry?.fixed_deduct ?? (branch === "القادسية" ? 650 : 575),
        fixed_note: existingEntry?.fixed_note ?? "مصاريف دائمة",
        notes: notes.trim(),
        entered_by: "محاسب ثان",
        review_status: "pending_review"
      };

      const res = await fetch("/api/days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onShowToast(
          langMode === "en"
            ? (existingEntry 
                ? `✅ Successfully updated and re-saved data for ${branch} (${date}) in Manager account!` 
                : `✅ Successfully submitted data for ${branch} (${date}) to Manager!`)
            : langMode === "hi"
            ? (existingEntry
                ? `✅ शाखा ${branch === "القادسية" ? "अल-कादिसिया" : "अल-मुरूज"} (${date}) का डेटा सफलतापूर्वक अपडेट होकर मैनेजर को भेज दिया गया!`
                : `✅ शाखा ${branch === "القادسية" ? "अल-कादिसिया" : "अल-मुरूज"} (${date}) का डेटा सफलतापूर्वक सेव होकर मैनेजर को भेज दिया गया!`)
            : (existingEntry
                ? `✅ تم تعديل مدخلات فرع ${branch} لتاريخ اليوم وتحديثها بحساب المدير بنجاح!`
                : `✅ تم حفظ وإرسال مدخلات فرع ${branch} لتاريخ ${date} لحساب المدير بنجاح!`)
        );
        
        // Notify other tabs/components of the update immediately
        window.dispatchEvent(new CustomEvent("daily_entry_saved", { detail: { branch, date } }));

        // Refresh local data
        await fetchDayData(branch, date);
      } else {
        onShowToast(
          langMode === "en" 
            ? "❌ Failed to save entry." 
            : langMode === "hi" 
            ? "❌ डेटा सेव करने में विफलता आई।" 
            : "❌ فشل حفظ بيانات اليومية."
        );
      }
    } catch (err) {
      console.error(err);
      onShowToast(
        langMode === "en" 
          ? "❌ Network error during save." 
          : langMode === "hi" 
          ? "❌ इंटरनेट या नेटवर्क की समस्या।" 
          : "❌ خطأ بالشبكة أثناء حفظ البيانات."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`space-y-6 select-none ${isLtr ? "text-left" : "text-right"}`}
      dir={isLtr ? "ltr" : "rtl"}
    >
      
      {/* Top Header & Bilingual Controls Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">
                {langMode === "en"
                  ? "Second Accountant Portal • Branch Daily Entry"
                  : langMode === "hi"
                  ? "सेकंड अकाउंटेंट पोर्टल • दैनिक शाखा प्रविष्टि (Daily Entry)"
                  : "بوابة المحاسب الثاني • إدخال يومية الفرع"}
              </h2>
              {langMode === "both" && (
                <span className="text-[10px] bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded-full">
                  Second Accountant Portal
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {langMode === "en"
                ? "Enter and reconcile drawer cash, POS terminals, urgent purchases, and supplier invoices to submit to the manager for review and approval."
                : langMode === "hi"
                ? "गल्ले का नकद, कार्ड मशीन (POS), ज़रूरी खरीदारी और सप्लायर बिल दर्ज करके मैनेजर को भेजें।"
                : langMode === "ar"
                ? "إدخال ومطابقة كاش الصندوق، أجهزة الشبكة، المشتريات العاجلة والموردين لترحيلها للمدير للمراجعة والاعتماد."
                : "إدخال ومطابقة كاش الصندوق، أجهزة الشبكة، المشتريات العاجلة والموردين لترحيلها للمدير للمراجعة والاعتماد • Enter and reconcile drawer cash, POS terminals, and purchases."}
            </p>
          </div>
        </div>

        {/* Language mode selector */}
        <div className="flex items-center gap-1.5 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700/60 self-stretch md:self-auto justify-center flex-wrap">
          <Languages className="w-4 h-4 text-amber-400 mx-1" />
          <button
            type="button"
            onClick={() => setLangMode("both")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              langMode === "both" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            عربي + EN (ثنائي اللغة)
          </button>
          <button
            type="button"
            onClick={() => setLangMode("ar")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              langMode === "ar" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            العربية
          </button>
          <button
            type="button"
            onClick={() => setLangMode("en")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              langMode === "en" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLangMode("hi")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              langMode === "hi" ? "bg-amber-500 text-slate-950 shadow-sm" : "text-slate-300 hover:text-white"
            }`}
          >
            हिन्दी (Hindi)
          </button>
        </div>
      </div>

      {/* Branch & Date Selector Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5">
        
        {/* Branch selection */}
        <div className="space-y-1.5">
          <label className="block text-xs font-extrabold text-slate-700">
            {t("الفرع المستهدف", "Target Branch", "शाखा (Branch)")}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={userBranch !== undefined && userBranch !== "الكل" && userBranch !== "القادسية"}
              onClick={() => setBranch("القادسية")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                branch === "القادسية"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              } ${userBranch && userBranch !== "الكل" && userBranch !== "القادسية" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {langMode === "en" ? "🏢 Al-Qadisiyah Branch" : langMode === "hi" ? "🏢 अल-कादिसिया शाखा (Al-Qadisiyah)" : langMode === "ar" ? "🏢 فرع القادسية" : "🏢 فرع القادسية (Al-Qadisiyah)"}
            </button>
            <button
              type="button"
              disabled={userBranch !== undefined && userBranch !== "الكل" && userBranch !== "المروج"}
              onClick={() => setBranch("المروج")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                branch === "المروج"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              } ${userBranch && userBranch !== "الكل" && userBranch !== "المروج" ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {langMode === "en" ? "🏢 Al-Murooj Branch" : langMode === "hi" ? "🏢 अल-मुरूज शाखा (Al-Murooj)" : langMode === "ar" ? "🏢 فرع المروج" : "🏢 فرع المروج (Al-Murooj)"}
            </button>
          </div>
        </div>

        {/* Date Selection */}
        <div className="space-y-1.5 flex-1 max-w-md">
          <label className="block text-xs font-extrabold text-slate-700">
            {t("تاريخ اليومية", "Entry Date", "तारीख (Date)")}
          </label>
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="relative min-w-[130px] flex-1">
              <input
                type="date"
                value={date}
                max={getTodayStr()}
                onChange={(e) => setDate(e.target.value)}
                className={`w-full ${isLtr ? "pl-2.5 pr-8" : "pr-8 pl-2.5"} py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-black`}
                style={{ color: "#000000" }}
              />
              <Calendar className={`w-3.5 h-3.5 text-slate-400 absolute ${isLtr ? "right-2.5" : "left-2.5"} top-2.5 pointer-events-none`} />
            </div>
            <button
              type="button"
              onClick={() => setDate(getTwoDaysAgoStr())}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                isTwoDaysAgo 
                  ? "bg-amber-500 text-slate-950 border-amber-600 shadow-xs" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
            >
              {t("قبل يومين", "2 Days Ago", "2 दिन पहले")}
            </button>
            <button
              type="button"
              onClick={() => setDate(getYesterdayStr())}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                isYesterday 
                  ? "bg-amber-500 text-slate-950 border-amber-600 shadow-xs" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
            >
              {t("أمس", "Yesterday", "कल (Yesterday)")}
            </button>
            <button
              type="button"
              onClick={() => setDate(getTodayStr())}
              className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap ${
                isToday 
                  ? "bg-amber-500 text-slate-950 border-amber-600 shadow-xs" 
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
              }`}
            >
              {t("اليوم الحالي", "Today", "आज (Today)")}
            </button>
          </div>
        </div>

        {/* Status Indicator */}
        <div className={`flex flex-col ${isLtr ? "items-start md:items-start" : "items-start md:items-end"} justify-center`}>
          <span className="text-[11px] font-bold text-slate-500">
            {t("حالة اعتماد القيد", "Approval Status", "मंज़ूरी स्थिति (Status)")}
          </span>
          {loading ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mt-1">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>{t("جاري الاستعلام...", "Loading...", "जाँच हो रही है...")}</span>
            </div>
          ) : existingEntry ? (
            existingEntry.review_status === "approved" ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full mt-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{t("معتمد رسمياً من المدير", "Approved by Manager", "मैनेजर द्वारा स्वीकृत (Approved)")}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mt-1">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>{t("تم الإرسال - بانتظار اعتماد المدير", "Submitted - Pending Manager Review", "भेजा गया - मैनेजर की मंज़ूरी बाकी")}</span>
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full mt-1">
              <span>{t("سجل جديد غير مدخل بعد", "New Entry (Not Submitted)", "नया रिकॉर्ड (अभी दर्ज नहीं)")}</span>
            </span>
          )}
        </div>
      </div>

      {/* Date Permission & Lock Notice */}
      {!isEditable ? (
        <div className="bg-slate-100 border border-slate-300 rounded-2xl p-4 flex items-center gap-3.5 text-slate-800 shadow-xs">
          <div className="p-2.5 bg-slate-200 text-slate-600 rounded-xl shrink-0">
            <Lock className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">
              {t(`🔒 مقفل للتعديل • تاريخ سابق (${date})`, `🔒 Locked for editing • Past date (${date})`, `🔒 लॉक है • पुरानी तारीख (${date})`)}
            </h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              {t(
                `لا يمكن تعديل مدخلات التواريخ السابقة البعيدة. الإدخال والتعديل متاحان لآخر يومين سابقين (${getTwoDaysAgoStr()} و ${getYesterdayStr()}) واليوم الحالي (${getTodayStr()}).`,
                `Older past dates cannot be edited. Entry and editing are allowed for the past two days (${getTwoDaysAgoStr()} & ${getYesterdayStr()}) and today (${getTodayStr()}).`,
                `पुरानी तारीखों का डेटा बदला नहीं जा सकता। केवल पिछले दो दिन (${getTwoDaysAgoStr()} व ${getYesterdayStr()}) और आज (${getTodayStr()}) का रिकॉर्ड दर्ज या बदला जा सकता है।`
              )}
            </p>
          </div>
        </div>
      ) : existingEntry ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-950 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-emerald-950">
                {t(
                  `سجل يومية ${getDateLabel()} محفوظ مسبقاً — التعديل متاح بالكامل`,
                  `Entry for ${getDateLabel()} is saved — Full editing available`,
                  `${getDateLabel()} का रिकॉर्ड पहले से सेव है — आप बदलाव कर सकते हैं`
                )}
              </h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                {t(
                  "يمكنك تعديل أي مبالغ أو أجهزة وإعادة الحفظ، وسينعكس التعديل فوراً وبشكل تلقائي في حساب المدير.",
                  "You can modify any amounts or devices and resubmit, updates will automatically reflect in the manager's account.",
                  "आप कोई भी रकम या मशीन बदलकर दोबारा सेव कर सकते हैं, मैनेजर के खाते में तुरंत अपडेट हो जाएगा।"
                )}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-3 py-1 rounded-lg shrink-0">
            {t("مفتوح للتعديل", "Open for editing", "बदलाव खुला है")}
          </span>
        </div>
      ) : null}

      {/* Main Data Entry Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: ما في الصندوق (الدرج الفعلي الآن - كاش) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {t("1- ما في الصندوق (الدرج الفعلي الآن)", "1. Cash in Drawer (Current Physical Cash)", "1- गल्ले का नकद (दराज़ में असली कैश)")}
                </h3>
                {langMode === "both" && (
                  <p className="text-xs text-slate-400 font-medium">
                    Cash in Drawer (Cash)
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-lg border border-emerald-100 font-mono">
              {t("كاش", "Cash", "नकद (Cash)")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                {t("المبلغ الفعلي الموجود في درج الكاش الآن (ريال)", "Physical cash amount currently in drawer (SAR)", "गल्ले में अभी मौजूद कुल नकद रकम (रियाल)")}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  disabled={!isEditable}
                  value={cashBox}
                  onChange={(e) => setCashBox(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className={`w-full ${isLtr ? "pr-14 pl-3" : "px-3"} py-2.5 text-sm border rounded-xl font-mono font-bold ${
                    !isEditable 
                      ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                      : "bg-slate-50 focus:bg-white text-black border-slate-200 focus:ring-2 focus:ring-emerald-500"
                  }`}
                  style={{ color: "#000000" }}
                />
                <span className={`absolute ${isLtr ? "right-3" : "left-3"} top-3 text-xs font-bold text-slate-400`}>
                  {t("ريال", "SAR", "रियाल")}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                {t(
                  "هذا هو النقد الفعلي الحقيقي الموجود داخل الدرج حالياً وسيتم احتسابه تلقائياً ضمن مبيعات الكاش عند المدير.",
                  "This is the actual physical cash currently in the drawer and will be counted automatically in cash sales by the manager.",
                  "यह गल्ले में मौजूद असली नकद रकम है जो मैनेजर के पास नकद बिक्री में अपने आप जुड़ेगी।"
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: نقاط البيع وتحصيل الشبكة */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {t("2- نقاط البيع وتحصيل الشبكة", "2. POS Terminals & Card Collections", "2- पीओएस कार्ड मशीन और नेटवर्क वसूली (POS)")}
                </h3>
                {langMode === "both" && (
                  <p className="text-xs text-slate-400 font-medium">
                    POS & Network Collections (Mada & Visa)
                  </p>
                )}
              </div>
            </div>
            <div className="text-xs text-indigo-700 bg-indigo-50 font-bold px-3 py-1 rounded-lg border border-indigo-100">
              {t("نقاط البيع", "POS Terminals", "पीओएस मशीन (POS)", " • ")}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Device 1 */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">
                  {t("جهاز 1", "POS Device 1", "मशीन 1 (Device 1)", " • ")}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {t("جهاز الشبكة الأساسي", "Primary POS Device", "मुख्य कार्ड मशीन")}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    {t("مدى (جهاز 1)", "Mada (Device 1)", "मादा (मशीन 1)")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={!isEditable}
                    value={mada1}
                    onChange={(e) => setMada1(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                      !isEditable 
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                        : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    }`}
                    style={{ color: "#000000" }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    {t("فيزا (جهاز 1)", "Visa (Device 1)", "वीज़ा (मशीन 1)")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={!isEditable}
                    value={visa1}
                    onChange={(e) => setVisa1(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                      !isEditable 
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                        : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    }`}
                    style={{ color: "#000000" }}
                  />
                </div>
              </div>
            </div>

            {/* Device 2 */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">
                  {t("جهاز 2", "POS Device 2", "मशीन 2 (Device 2)", " • ")}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {t("جهاز الشبكة الثاني", "Secondary POS Device", "दूसरी कार्ड मशीन")}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    {t("مدى (جهاز 2)", "Mada (Device 2)", "मादा (मशीन 2)")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={!isEditable}
                    value={mada2}
                    onChange={(e) => setMada2(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                      !isEditable 
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                        : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    }`}
                    style={{ color: "#000000" }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    {t("فيزا (جهاز 2)", "Visa (Device 2)", "वीज़ा (मशीन 2)")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    disabled={!isEditable}
                    value={visa2}
                    onChange={(e) => setVisa2(e.target.value === "" ? "" : parseFloat(e.target.value))}
                    className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                      !isEditable 
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                        : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    }`}
                    style={{ color: "#000000" }}
                  />
                </div>
              </div>
            </div>

            {/* Extra Devices (if added) */}
            {extraDevices.map((dev, idx) => (
              <div key={idx} className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950">
                    {langMode === "en"
                      ? (dev.name.includes("جهاز") ? dev.name.replace(/جهاز\s*(\d+).*/, "POS Device $1") : dev.name)
                      : langMode === "hi"
                      ? (dev.name.includes("جهاز") ? dev.name.replace(/جهاز\s*(\d+).*/, "मशीन $1 (Device $1)") : dev.name)
                      : langMode === "ar"
                      ? (dev.name.includes("Device") ? dev.name.replace(/.*Device\s*(\d+)/, "جهاز $1") : dev.name)
                      : dev.name}
                  </span>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDevice(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-md transition-colors cursor-pointer"
                      title={t("حذف هذا الجهاز", "Remove this device", "यह मशीन हटाएं")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">{t("مدى", "Mada", "मादा (Mada)")}</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      disabled={!isEditable}
                      value={dev.mada}
                      onChange={(e) => handleUpdateDevice(idx, "mada", e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                        !isEditable 
                          ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                          : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      }`}
                      style={{ color: "#000000" }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">{t("فيزا", "Visa", "वीज़ा (Visa)")}</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      disabled={!isEditable}
                      value={dev.visa}
                      onChange={(e) => handleUpdateDevice(idx, "visa", e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                        !isEditable 
                          ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                          : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      }`}
                      style={{ color: "#000000" }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Device Button */}
          {isEditable && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleAddDevice}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t("إضافة جهاز شبكة آخر", "Add Another POS Device", "+ एक और कार्ड मशीन जोड़ें")}</span>
              </button>
            </div>
          )}
        </div>

        {/* Section 3: مشتريات نقدية عاجلة تم دفعها من الدرج */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {t("3- مشتريات نقدية عاجلة تم دفعها من الدرج", "3. Urgent Cash Purchases Paid From Drawer", "3- दुकान की ज़रूरी खरीदारी (गल्ले के कैश से भुगतान)")}
                </h3>
                {langMode === "both" && (
                  <p className="text-xs text-slate-400 font-medium">
                    Urgent Cash Purchases Paid From Drawer
                  </p>
                )}
              </div>
            </div>
            <div className="text-xs text-amber-800 bg-amber-50 font-bold px-3 py-1 rounded-lg border border-amber-100">
              {t("مشتريات نقدية", "Cash Purchases", "नकद खरीदारी", " • ")}
            </div>
          </div>

          <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-150">
            {t(
              "ℹ️ هذه المشتريات تنعكس تلقائياً على مدخلات المدير في قسم \"مشتريات نقدية عاجلة\" وكذلك في قسم \"المصروفات وفواتير التقسيط\".",
              "ℹ️ These purchases automatically reflect in the manager's \"Urgent Cash Purchases\" and \"Expenses & Installments\" sections.",
              "ℹ️ ये ख़र्चे सीधे मैनेजर के खाते में ज़रूरी ख़र्चों और किश्तों में अपने आप जुड़ जाएंगे।"
            )}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Gas */}
            <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
              <label className="block text-xs font-extrabold text-slate-700">
                {t("غاز نقدي", "Cash Gas", "गैस का ख़र्च (Gas)")}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                disabled={!isEditable}
                value={purGas}
                onChange={(e) => setPurGas(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                  !isEditable 
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                    : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                }`}
                style={{ color: "#000000" }}
              />
            </div>

            {/* Bread */}
            <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
              <label className="block text-xs font-extrabold text-slate-700">
                {t("خبز نقدي", "Cash Bread", "रोटी / ब्रेड (Bread)")}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                disabled={!isEditable}
                value={purBread}
                onChange={(e) => setPurBread(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                  !isEditable 
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                    : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                }`}
                style={{ color: "#000000" }}
              />
            </div>

            {/* Vegetables */}
            <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
              <label className="block text-xs font-extrabold text-slate-700">
                {t("خضار نقدي", "Cash Vegetables", "सब्ज़ी (Vegetables)")}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                disabled={!isEditable}
                value={purVeg}
                onChange={(e) => setPurVeg(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                  !isEditable 
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                    : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                }`}
                style={{ color: "#000000" }}
              />
            </div>

            {/* Grocery */}
            <div className="space-y-1.5 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
              <label className="block text-xs font-extrabold text-slate-700">
                {t("بقالة نقدي", "Cash Grocery", "किराना / बक़ाला (Grocery)")}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                disabled={!isEditable}
                value={purGroc}
                onChange={(e) => setPurGroc(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                  !isEditable 
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                    : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                }`}
                style={{ color: "#000000" }}
              />
            </div>
          </div>
        </div>

        {/* Section 4: الموردين والمشتريات (المستودع، بيبسي، صقر للتغليف، أمل الرميح، الديزل) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {t("4- الموردين ومشتريات المواد الأولية", "4. Suppliers & Raw Materials Purchases", "4- सप्लायर और कच्चा माल (Suppliers & Invoices)")}
                </h3>
                {langMode === "both" && (
                  <p className="text-xs text-slate-400 font-medium">
                    Suppliers & Raw Materials Purchases
                  </p>
                )}
              </div>
            </div>
            <div className="text-xs text-blue-800 bg-blue-50 font-bold px-3 py-1 rounded-lg border border-blue-100">
              {t("فواتير الموردين", "Suppliers Invoices", "सप्लायर बिल", " • ")}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* 4. Warehouse: مؤسسة حبة الأخضر (تنعكس في خانة المستودع عند المدير) */}
            <div className="space-y-1.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-800">
                  <span>{t("مؤسسة حبة الأخضر", "Green Grain Est.", "हब्बा अल-अख़्ज़र (Green Grain)")}</span>
                </label>
                <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                  {t("المستودع", "Warehouse", "गोदाम")}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                disabled={!isEditable}
                value={makhzan}
                onChange={(e) => setMakhzan(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className={`w-full px-3 py-2 text-xs border rounded-lg font-mono font-bold ${
                  !isEditable 
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                    : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                }`}
                style={{ color: "#000000" }}
              />
              <p className="text-[9px] text-slate-500">
                {t(
                  "تُنقل كفاتورة مستودع بحساب المدير كمصروف مباشر.",
                  "Transferred as warehouse invoice to manager account as direct expense.",
                  "गोदाम के सीधे ख़र्च के रूप में मैनेजर के खाते में जुड़ेगा।"
                )}
              </p>
            </div>

            {/* 5. Pepsi: بيبسي ومشروبات */}
            {renderSupplierInstallmentCard(
              "pepsi",
              t("بيبسي ومشروبات", "Pepsi & Beverages", "पेप्सी और पेय पदार्थ (Pepsi)"),
              t("مشروبات", "Beverages", "कोल्ड ड्रिंक्स"),
              "bg-blue-100 text-blue-800",
              pepsiPaid,
              setPepsiPaid,
              pepsiType,
              setPepsiType
            )}

            {/* 6. Packaging: صقر للتغليف */}
            {renderSupplierInstallmentCard(
              "plastic",
              t("صقر للتغليف", "Saqr Packaging", "सक्र पैकेजिंग (Saqr Packaging)"),
              t("بلاستيكات", "Packaging", "प्लास्टिक/डिब्बे"),
              "bg-amber-100 text-amber-800",
              plasticPaid,
              setPlasticPaid,
              plasticType,
              setPlasticType
            )}

            {/* 7. Sauces: الصلصات والمواد الأولية (أمل الرميح) */}
            {renderSupplierInstallmentCard(
              "sauces",
              t("الصلصات والمواد الأولية (أمل الرميح)", "Sauces & Raw Materials (Amal Al-Romaih)", "सॉस और कच्चा माल - अमल अल-रुमैह (Sauces)"),
              t("صلصات", "Sauces", "सॉस"),
              "bg-rose-100 text-rose-800",
              saucesPaid,
              setSaucesPaid,
              saucesType,
              setSaucesType
            )}

            {/* 8. Diesel: الديزل */}
            {renderSupplierInstallmentCard(
              "diesel",
              t("الديزل", "Diesel Fuel", "डीज़ल (Diesel Fuel)"),
              t("ديزل", "Diesel", "डीज़ल"),
              "bg-slate-200 text-slate-700",
              dieselPaid,
              setDieselPaid,
              dieselType,
              setDieselType
            )}
          </div>
        </div>

        {/* Section 5: عدد التوصيل */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">
                  {t("5- عدد طلبات التوصيل", "5. Delivery Orders Count", "5- डिलीवरी ऑर्डर की संख्या (Delivery Orders)")}
                </h3>
                {langMode === "both" && (
                  <p className="text-xs text-slate-400 font-medium">
                    Delivery Orders Count
                  </p>
                )}
              </div>
            </div>
            <div className="text-xs text-amber-800 bg-amber-50 font-bold px-3 py-1 rounded-lg border border-amber-100">
              {t("توصيل الطلبات", "Delivery Orders", "डिलीवरी", " • ")}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2 bg-amber-50/40 p-4 rounded-xl border border-amber-150/70">
              <label className="block text-xs font-extrabold text-slate-800">
                <span>
                  {t(
                    `عدد طلبات التوصيل لفرع ${branch}`,
                    `Delivery Orders Count for ${branch === "القادسية" ? "Al-Qadisiyah Branch" : "Al-Murooj Branch"}`,
                    `डिलीवरी ऑर्डर की संख्या (${branch === "القادسية" ? "अल-कादिसिया" : "अल-मुरूज"})`
                  )}
                </span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  disabled={!isEditable}
                  value={deliveryCount}
                  onChange={(e) => setDeliveryCount(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                  className={`w-full ${isLtr ? "pr-16 pl-3" : "px-3"} py-2 text-xs border rounded-lg font-mono font-bold ${
                    !isEditable 
                      ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                      : "bg-white text-black border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-600"
                  }`}
                  style={{ color: "#000000" }}
                />
                <span className={`absolute ${isLtr ? "right-3" : "left-3"} top-2 text-xs text-slate-400 font-bold`}>
                  {t("طلب", "Orders", "ऑर्डर")}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                {t(
                  "* يتم إدخال عدد الطلبات هنا فقط، واحتساب مبلغ التوصيل ومعامل الضرب يكون في حساب المدير فقط.",
                  "* Only order count is entered here; delivery calculation is handled exclusively in the manager account.",
                  "* यहाँ केवल ऑर्डर की संख्या दर्ज करें, डिलीवरी की कुल रकम की गणना मैनेजर के खाते में होगी।"
                )}
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-1.5 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
              <label className="block text-xs font-extrabold text-slate-700">
                {t("ملاحظات إضافية للمدير", "Additional Notes for Manager", "मैनेजर के लिए ज़रूरी नोट (Notes)")}
              </label>
              <textarea
                rows={3}
                placeholder={t(
                  "أية ملاحظات أو توضيحات تود إرفاقها مع اليومية للمدير...",
                  "Any notes or clarifications to attach for the manager...",
                  "मैनेजर के लिए कोई ज़रूरी बात या नोट यहाँ लिखें..."
                )}
                disabled={!isEditable}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`w-full px-3 py-2 text-xs border rounded-lg text-black font-medium ${
                  !isEditable 
                    ? "bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200" 
                    : "bg-white border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                }`}
                style={{ color: "#000000" }}
              />
            </div>
          </div>
        </div>

        {/* Action & Submit Bar (Clean - no summary calculations) */}
        <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
              {isEditable ? <ShieldCheck className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-xs font-black text-white">
                {isEditable 
                  ? (existingEntry 
                      ? t(
                          `تعديل وإعادة حفظ مدخلات يومية ${getDateLabel()}`,
                          `Edit & Update Daily Entries for ${getDateLabel()}`,
                          `${getDateLabel()} का रिकॉर्ड बदलें और दोबारा सेव करें`
                        )
                      : t(
                          `حفظ مدخلات يومية ${getDateLabel()} وإرسالها للمدير`,
                          `Save & Submit Daily Entries for ${getDateLabel()} to Manager`,
                          `${getDateLabel()} का डेटा सेव करें और मैनेजर को भेजें`
                        ))
                  : t(
                      `سجل اليومية لتاريخ سابق (${date}) • مقفل للتعديل`,
                      `Daily entry for past date (${date}) • Locked for editing`,
                      `पुरानी तारीख (${date}) का रिकॉर्ड • लॉक है`
                    )}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isEditable
                  ? (existingEntry 
                      ? t(
                          "يمكنك تعديل أي بيانات وإعادة الحفظ، وسينعكس التعديل فوراً وبشكل تلقائي في حساب المدير.",
                          "You can modify any data and save; updates reflect immediately and automatically in the manager's account.",
                          "आप कोई भी डेटा बदलकर दोबारा सेव कर सकते हैं, मैनेजर के पास तुरंत अपडेट हो जाएगा।"
                        ) 
                      : t(
                          "يتم إرسال كافة المدخلات إلى حساب المدير للمراجعة والاعتماد.",
                          "All entered data is submitted to the manager's account for review and approval.",
                          "सारा डेटा मैनेजर के खाते में मंज़ूरी के लिए भेजा जाएगा।"
                        ))
                  : t(
                      "لا يمكن تعديل الأيام السابقة البعيدة؛ الإدخال والتعديل متاحان لليومين السابقين واليوم الحالي.",
                      "Older past days cannot be edited; entry and editing are available for the past 2 days and today.",
                      "पुरानी तारीखें नहीं बदली जा सकतीं; केवल पिछले दो दिन और आज का डेटा दर्ज या बदला जा सकता है।"
                    )}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            {isEditable ? (
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-8 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t("جاري الحفظ للمدير...", "Submitting to manager...", "मैनेजर को भेजा जा रहा है...")}</span>
                  </>
                ) : existingEntry ? (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      {t(
                        `تعديل وحفظ مدخلات ${getDateLabel()}`,
                        `Update & Save Entries for ${getDateLabel()}`,
                        `${getDateLabel()} का डेटा अपडेट करें`,
                        " • "
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      {t(
                        `حفظ وإرسال مدخلات ${getDateLabel()} للمدير`,
                        `Save & Submit Entries for ${getDateLabel()} to Manager`,
                        `${getDateLabel()} का डेटा सेव करके भेजें`,
                        " • "
                      )}
                    </span>
                  </>
                )}
              </button>
            ) : (
              <div className="text-xs font-bold text-slate-400 bg-slate-800 px-5 py-3 rounded-xl border border-slate-700 flex items-center justify-center gap-2 whitespace-nowrap">
                <Lock className="w-4 h-4 text-slate-500" />
                <span>{t("التعديل مقفل للأيام السابقة", "Locked for past days", "पुरानी तारीखें लॉक हैं")}</span>
              </div>
            )}
          </div>
        </div>

      </form>
    </div>
  );
}
