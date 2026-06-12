import React, { useState, useEffect } from "react";
import { Settings, DailyEntry, ExtraPurchase, OtherExpense } from "../types";
import { 
  Building, Calendar, DollarSign, CreditCard, ChevronRight, AlertCircle, 
  Trash, Save, Info, Plus, FileText, ChevronLeft, RefreshCw, TrendingDown,
  ChevronDown, ChevronUp
} from "lucide-react";

interface DailyInputTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
  userBranch?: "الكل" | "القادسية" | "المروج";
}

export default function DailyInputTab({ onShowToast, userRole, userBranch }: DailyInputTabProps) {
  const getTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calcTotalDayExp = (row: DailyEntry) => {
    const othersSum = (row.others || []).reduce((s, o) => s + (o.amt || 0), 0);
    const purExtrasSum = (row.pur_extras || []).reduce((s, e) => s + (e.amt || 0), 0);
    return (
      (row.makhzan || 0) +
      (row.pepsi_deduct || 0) +
      (row.plastic_deduct || 0) +
      (row.sauces_deduct || 0) +
      Math.max(row.gas || 0, row.pur_gas || 0) +
      Math.max(row.vegetables || 0, row.pur_veg || 0) +
      Math.max(row.bread || 0, row.pur_bread || 0) +
      Math.max(row.grocery || 0, row.pur_groc || 0) +
      (row.diesel_deduct || 0) +
      othersSum +
      purExtrasSum +
      (row.fixed_deduct || 0)
    );
  };

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
  const [date, setDate] = useState(() => {
    const saved = sessionStorage.getItem("app_daily_input_date");
    return saved ? saved : new Date().toISOString().split("T")[0];
  });
  
  useEffect(() => {
    sessionStorage.setItem("app_daily_input_date", date);
  }, [date]);

  const [isLoadedForEdit, setIsLoadedForEdit] = useState<boolean>(false);
  
  // Settings to carry calculations
  const [settings, setSettings] = useState<Settings | null>(null);

  // Active carryovers alert
  const [carryovers, setCarryovers] = useState<any[]>([]);
  const [isCarryoversExpanded, setIsCarryoversExpanded] = useState(false);

  // Modal reminder state for transitioning to the next day
  const [nextDayReminderModal, setNextDayReminderModal] = useState<{
    show: boolean;
    newDate: string;
    carryovers: any[];
  }>({
    show: false,
    newDate: "",
    carryovers: []
  });

  // Form Fields
  const [sarf, setSarf] = useState<number>(350);
  const [cashBox, setCashBox] = useState<number | "">("");
  
  // Drawer Cash Outlays (Detail Purchases)
  const [purGas, setPurGas] = useState<number | "">("");
  const [purBread, setPurBread] = useState<number | "">("");
  const [purVeg, setPurVeg] = useState<number | "">("");
  const [purGroc, setPurGroc] = useState<number | "">("");
  const [purExtras, setPurExtras] = useState<ExtraPurchase[]>([]);

  // POS Devices
  const [mada1, setMada1] = useState<number | "">("");
  const [mada2, setMada2] = useState<number | "">("");
  const [mada3, setMada3] = useState<number | "">("");
  const [visa1, setVisa1] = useState<number | "">("");
  const [visa2, setVisa2] = useState<number | "">("");
  const [visa3, setVisa3] = useState<number | "">("");
  const [showDevice3, setShowDevice3] = useState(false);

  // Core Capped / Standard Expenses
  const [makhzan, setMakhzan] = useState<number | "">("");
  const [pepsiPaid, setPepsiPaid] = useState<number | "">("");
  const [plasticPaid, setPlasticPaid] = useState<number | "">("");
  const [gasExp, setGasExp] = useState<number | "">("");
  const [vegExp, setVegExp] = useState<number | "">("");
  const [saucesPaid, setSaucesPaid] = useState<number | "">("");
  const [breadExp, setBreadExp] = useState<number | "">("");
  const [groceryExp, setGroceryExp] = useState<number | "">("");
  const [dieselPaid, setDieselPaid] = useState<number | "">("");

  // Category entry type states (payment vs invoice)
  const [pepsiType, setPepsiType] = useState<'payment' | 'invoice'>('payment');
  const [plasticType, setPlasticType] = useState<'payment' | 'invoice'>('payment');
  const [saucesType, setSaucesType] = useState<'payment' | 'invoice'>('payment');
  const [dieselType, setDieselType] = useState<'payment' | 'invoice'>('payment');

  // Permanet/Fixed Deductions
  const [fixedDeduct, setFixedDeduct] = useState<number | "">("");
  const [fixedNote, setFixedNote] = useState("");

  // Extra customizable daily expenses items list
  const [others, setOthers] = useState<OtherExpense[]>([
    { name: "", amt: 0 }
  ]);

  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState<DailyEntry[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {},
    isDanger: false
  });
  const [loading, setLoading] = useState(false);

  // Load configuration settings
  const fetchSettingsAndReload = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json() as Settings;
        setSettings(data);
        setSarf(data.صرف_افتراضي || 350);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load previous carryovers to alert the user
  const loadCarryOverAlert = async () => {
    try {
      const res = await fetch(`/api/carryover?branch=${branch}&date=${date}`);
      if (res.ok) {
        const list = await res.json();
        setCarryovers(list);

        // Dynamically set input type modes based on active carryovers
        const hasPepsi = list.some((c: any) => c.key === "pepsi" && c.carry > 0);
        setPepsiType(hasPepsi ? 'payment' : 'invoice');

        const hasPlastic = list.some((c: any) => c.key === "plastic" && c.carry > 0);
        setPlasticType(hasPlastic ? 'payment' : 'invoice');

        const hasSauces = list.some((c: any) => c.key === "sauces" && c.carry > 0);
        setSaucesType(hasSauces ? 'payment' : 'invoice');

        const hasDiesel = list.some((c: any) => c.key === "diesel" && c.carry > 0);
        setDieselType(hasDiesel ? 'payment' : 'invoice');

        // Keep inputs at "" to represent "no new invoices/supplies added today"
        setPepsiPaid("");
        setPlasticPaid("");
        setSaucesPaid("");
        setDieselPaid("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Date changing handlers with installment reminder
  const handleDateChange = (newDate: string) => {
    // Check if moving to a future day and we have remaining installments in carryovers
    const isMovingForward = new Date(newDate) > new Date(date);
    if (isMovingForward && carryovers.length > 0) {
      setNextDayReminderModal({
        show: true,
        newDate,
        carryovers: [...carryovers]
      });
    } else {
      setDate(newDate);
    }
  };

  const incrementDate = () => {
    const current = new Date(date);
    current.setDate(current.getDate() + 1);
    const nextDateStr = current.toISOString().split("T")[0];
    handleDateChange(nextDateStr);
  };

  const decrementDate = () => {
    const current = new Date(date);
    current.setDate(current.getDate() - 1);
    const prevDateStr = current.toISOString().split("T")[0];
    setDate(prevDateStr); // Normal date setting when moving backward
  };

  const [editingCaps, setEditingCaps] = useState<Record<string, number>>({});

  const handleUpdateCap = async (settingsKey: string, newAmount: number) => {
    if (!settings) {
      onShowToast("⚠️ خطأ: الإعدادات غير محملة");
      return;
    }
    const updatedSettings = { ...settings, [settingsKey]: newAmount };
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSettings),
      });
      if (res.ok) {
        onShowToast("✅ تم حفظ السقف الجديد وإعادة جدولة كافة المتأخرات فوراً!");
        setSettings(updatedSettings);
        await loadCarryOverAlert();
        await loadBranchHistory();
      } else {
        onShowToast("❌ فشل ترحيل وتحديث قيمة السقف");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالاتصال لتحديث السقف");
    }
  };

  // Load history list for the past days
  const loadBranchHistory = async () => {
    try {
      const res = await fetch(`/api/days?branch=${branch}`);
      if (res.ok) {
        const list = await res.json();
        setHistory(list);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettingsAndReload();
  }, []);

  useEffect(() => {
    loadCarryOverAlert();
    loadBranchHistory();
    setIsLoadedForEdit(false);
  }, [branch, date]);

  useEffect(() => {
    setSelectedIds([]);
  }, [branch]);

  // Keep form in sync with database records of the selected date & branch
  useEffect(() => {
    const existing = history.find(d => d.date === date && d.branch === branch);
    if (existing && isLoadedForEdit) {
      setSarf(existing.sarf ?? 350);
      setCashBox(existing.cash_box || "");
      setPurGas(existing.pur_gas || "");
      setPurBread(existing.pur_bread || "");
      setPurVeg(existing.pur_veg || "");
      setPurGroc(existing.pur_groc || "");
      setPurExtras(existing.pur_extras || []);
      setMada1(existing.mada1 || "");
      setMada2(existing.mada2 || "");
      setMada3(existing.mada3 || "");
      setVisa1(existing.visa1 || "");
      setVisa2(existing.visa2 || "");
      setVisa3(existing.visa3 || "");
      setShowDevice3(!!(existing.mada3 || existing.visa3));
      setMakhzan(existing.makhzan || "");
      setPepsiPaid(existing.pepsi_paid || "");
      setPepsiType(existing.pepsi_type || 'payment');
      setPlasticPaid(existing.plastic_paid || "");
      setPlasticType(existing.plastic_type || 'payment');
      setSaucesPaid(existing.sauces_paid || "");
      setSaucesType(existing.sauces_type || 'payment');
      setGasExp(existing.gas || "");
      setVegExp(existing.vegetables || "");
      setBreadExp(existing.bread || "");
      setGroceryExp(existing.grocery || "");
      setDieselPaid(existing.diesel_paid || "");
      setDieselType(existing.diesel_type || 'payment');
      setFixedDeduct(existing.fixed_deduct || "");
      setFixedNote(existing.fixed_note || "");
      setOthers(existing.others && existing.others.length > 0 ? existing.others : [{ name: "", amt: 0 }]);
      setNotes(existing.notes || "");
    } else {
      // Warm reset for clean entry of a brand new day
      setCashBox("");
      setPurGas("");
      setPurBread("");
      setPurVeg("");
      setPurGroc("");
      setPurExtras([]);
      setMada1("");
      setMada2("");
      setMada3("");
      setVisa1("");
      setVisa2("");
      setVisa3("");
      setMakhzan("");
      setPepsiPaid("");
      setPlasticPaid("");
      setGasExp("");
      setVegExp("");
      setSaucesPaid("");
      setBreadExp("");
      setGroceryExp("");
      setDieselPaid("");
      setFixedDeduct("");
      setFixedNote("");
      setOthers([{ name: "", amt: 0 }]);
      setNotes("");
      setEditingCaps({});
      setPepsiType('payment');
      setPlasticType('payment');
      setSaucesType('payment');
      setDieselType('payment');
      if (settings) {
        setSarf(settings.صرف_افتراضي || 350);
      }
    }
  }, [date, branch, history, settings, isLoadedForEdit]);

  // Form calculations
  const valCashBox = parseFloat(cashBox as string) || 0;
  const valPurGas = parseFloat(purGas as string) || 0;
  const valPurBread = parseFloat(purBread as string) || 0;
  const valPurVeg = parseFloat(purVeg as string) || 0;
  const valPurGroc = parseFloat(purGroc as string) || 0;
  const valPurExtras = purExtras.reduce((sum, item) => sum + (item.amt || 0), 0);

  // Total cash layout purchases
  const cashPurchasesTotal = valPurGas + valPurBread + valPurVeg + valPurGroc + valPurExtras;

  // Real-time metrics
  const cashTotalRaw = valCashBox + cashPurchasesTotal;
  const cashNetValue = cashBox === "" ? cashPurchasesTotal : valCashBox - sarf + cashPurchasesTotal;
  const cashRemainingInDrawer = cashBox === "" ? 0 : Math.max(0, valCashBox - sarf);

  // POS Devices math
  const valMada1 = parseFloat(mada1 as string) || 0;
  const valMada2 = parseFloat(mada2 as string) || 0;
  const valMada3 = parseFloat(mada3 as string) || 0;
  const valVisa1 = parseFloat(visa1 as string) || 0;
  const valVisa2 = parseFloat(visa2 as string) || 0;
  const valVisa3 = parseFloat(visa3 as string) || 0;

  const madaFeeRate = settings ? settings.رسوم_مدى / 100 : 0.008;
  const visaFeeRate = settings ? settings.رسوم_فيزا / 100 : 0.015;

  const madaTotal = valMada1 + valMada2 + (showDevice3 ? valMada3 : 0);
  const visaTotal = valVisa1 + valVisa2 + (showDevice3 ? valVisa3 : 0);

  const posNetCalculated = madaTotal * (1 - madaFeeRate) + visaTotal * (1 - visaFeeRate);
  const posPlusRemainingInBox = posNetCalculated + cashRemainingInDrawer;

  // Core Expenses Calculations (for live pre-computation only. Caps are calculated cleanly on write back server-side!)
  const valMakhzan = parseFloat(makhzan as string) || 0;
  const valPepsiPaid = parseFloat(pepsiPaid as string) || 0;
  const valPlasticPaid = parseFloat(plasticPaid as string) || 0;
  const valGasExp = parseFloat(gasExp as string) || 0;
  const valVegExp = parseFloat(vegExp as string) || 0;
  const valSaucesPaid = parseFloat(saucesPaid as string) || 0;
  const valBreadExp = parseFloat(breadExp as string) || 0;
  const valGroceryExp = parseFloat(groceryExp as string) || 0;
  const valDieselPaid = parseFloat(dieselPaid as string) || 0;

  const valFixedDeduct = parseFloat(fixedDeduct as string) || 0;
  const valOthersTotal = others.reduce((s, o) => s + (o.amt || 0), 0);

  // Helper and calculations for interactive live installments feedback
  const getCarryoverStats = (key: string, liveAddedAmtRaw: number | string, entryType: 'payment' | 'invoice') => {
    const item = carryovers.find(c => c.key === key);
    const liveAddedAmt = parseFloat(liveAddedAmtRaw as string) || 0;
    
    // Determine the active cap from settings
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

  // Live actual deductions computation for accurate daily expenses
  const pepsiCapLive = settings
    ? (branch === "القادسية"
        ? (settings.سقف_بيبسي_قادسية || settings.سقف_بيبسي || 400)
        : (settings.سقف_بيبسي_مروج || settings.سقف_بيبسي || 400))
    : 400;
  const pepsiStats = getCarryoverStats("pepsi", valPepsiPaid, pepsiType);
  const livePepsiDeduct = pepsiStats ? pepsiStats.deduct : (valPepsiPaid > 0 ? Math.min(valPepsiPaid, pepsiCapLive) : 0);

  const plasticCapLive = settings
    ? (branch === "القادسية"
        ? (settings.سقف_بلاستيك_قادسية || settings.سقف_بلاستيك || 100)
        : (settings.سقف_بلاستيك_مروج || settings.سقف_بلاستيك || 100))
    : 100;
  const plasticStats = getCarryoverStats("plastic", valPlasticPaid, plasticType);
  const livePlasticDeduct = plasticStats ? plasticStats.deduct : (valPlasticPaid > 0 ? Math.min(valPlasticPaid, plasticCapLive) : 0);

  const saucesCapLive = settings
    ? (branch === "القادسية"
        ? (settings.سقف_صلصات_قادسية || settings.سقف_صلصات || 150)
        : (settings.سقف_صلصات_مروج || settings.سقف_صلصات || 150))
    : 150;
  const saucesStats = getCarryoverStats("sauces", valSaucesPaid, saucesType);
  const liveSaucesDeduct = saucesStats ? saucesStats.deduct : (valSaucesPaid > 0 ? Math.min(valSaucesPaid, saucesCapLive) : 0);

  const dieselCap = settings ? (branch === "القادسية" ? settings.سقف_ديزل_قادسية : settings.سقف_ديزل_مروج) : 50;
  const dieselStats = getCarryoverStats("diesel", valDieselPaid, dieselType);
  const liveDieselDeduct = dieselStats ? dieselStats.deduct : (valDieselPaid > 0 ? Math.min(valDieselPaid, dieselCap || 50) : 0);

  const totalRawDailyRevenues = cashNetValue + posNetCalculated;
  const totalStandardExpenses = 
    valMakhzan + 
    livePepsiDeduct + 
    livePlasticDeduct + 
    Math.max(valGasExp, valPurGas) + 
    Math.max(valVegExp, valPurVeg) + 
    liveSaucesDeduct + 
    Math.max(valBreadExp, valPurBread) + 
    Math.max(valGroceryExp, valPurGroc) + 
    liveDieselDeduct + 
    valFixedDeduct + 
    valOthersTotal + 
    valPurExtras;

  const liveSimulatedNetProfit = totalRawDailyRevenues - totalStandardExpenses;

  // Handles adding detail purchases items
  const addExtraPurchaseRow = () => {
    setPurExtras([...purExtras, { name: "", amt: 0 }]);
  };

  const removeExtraPurchaseRow = (index: number) => {
    setPurExtras(purExtras.filter((_, i) => i !== index));
  };

  const updateExtraPurchaseRow = (index: number, field: keyof ExtraPurchase, value: string | number) => {
    const updated = [...purExtras];
    updated[index] = { ...updated[index], [field]: value } as ExtraPurchase;
    setPurExtras(updated);
  };

  // Handles custom other expenses rows
  const addOtherExpenseRow = () => {
    setOthers([...others, { name: "", amt: 0 }]);
  };

  const removeOtherExpenseRow = (index: number) => {
    setOthers(others.filter((_, i) => i !== index));
  };

  const updateOtherExpenseRow = (index: number, field: keyof OtherExpense, value: string | number) => {
    const updated = [...others];
    updated[index] = { ...updated[index], [field]: value } as OtherExpense;
    setOthers(updated);
  };

  const clearForm = () => {
    setCashBox("");
    setPurGas("");
    setPurBread("");
    setPurVeg("");
    setPurGroc("");
    setPurExtras([]);
    setMada1("");
    setMada2("");
    setMada3("");
    setVisa1("");
    setVisa2("");
    setVisa3("");
    setMakhzan("");
    setPepsiPaid("");
    setPlasticPaid("");
    setGasExp("");
    setVegExp("");
    setSaucesPaid("");
    setBreadExp("");
    setGroceryExp("");
    setDieselPaid("");
    setFixedDeduct("");
    setFixedNote("");
    setOthers([{ name: "", amt: 0 }]);
    setNotes("");
    setEditingCaps({});
    setPepsiType('payment');
    setPlasticType('payment');
    setSaucesType('payment');
    setDieselType('payment');
  };

  const handleSaveDay = async () => {
    if (!cashBox && cashBox !== 0) {
      onShowToast("⚠️ يرجى تزويد مبلغ الدرج لحساب اليوم");
      return;
    }

    const todayDateStr = getTodayDateStr();
    const isSameDay = date === todayDateStr;
    const existing = history.find(d => d.date === date && d.branch === branch);

    if (existing && !isSameDay && userRole !== "مدير") {
      onShowToast("⚠️ عذراً! يُمنع تعديل أو حفظ القيود للتواريخ السابقة لحماية سلامة السير المالي وجدولة الأقساط.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        date,
        branch,
        sarf,
        cash_box: valCashBox,
        cash_purchases: cashPurchasesTotal,
        pur_gas: valPurGas,
        pur_bread: valPurBread,
        pur_veg: valPurVeg,
        pur_groc: valPurGroc,
        pur_extras: purExtras.filter((e) => e.name && e.amt > 0),
        mada1: valMada1,
        mada2: valMada2,
        mada3: showDevice3 ? valMada3 : 0,
        visa1: valVisa1,
        visa2: valVisa2,
        visa3: showDevice3 ? valVisa3 : 0,
        makhzan: valMakhzan,
        pepsi_paid: valPepsiPaid,
        pepsi_type: carryovers.some(c => c.key === "pepsi" && c.carry > 0) ? pepsiType : 'invoice',
        plastic_paid: valPlasticPaid,
        plastic_type: carryovers.some(c => c.key === "plastic" && c.carry > 0) ? plasticType : 'invoice',
        gas: valGasExp,
        vegetables: valVegExp,
        sauces_paid: valSaucesPaid,
        sauces_type: carryovers.some(c => c.key === "sauces" && c.carry > 0) ? saucesType : 'invoice',
        bread: valBreadExp,
        grocery: valGroceryExp,
        diesel_paid: valDieselPaid,
        diesel_type: carryovers.some(c => c.key === "diesel" && c.carry > 0) ? dieselType : 'invoice',
        others: others.filter((o) => o.name && o.amt > 0),
        fixed_deduct: valFixedDeduct,
        fixed_note: fixedNote,
        notes,
        pepsi_cap: editingCaps.pepsi !== undefined ? editingCaps.pepsi : undefined,
        plastic_cap: editingCaps.plastic !== undefined ? editingCaps.plastic : undefined,
        sauces_cap: editingCaps.sauces !== undefined ? editingCaps.sauces : undefined,
        diesel_cap: editingCaps.diesel !== undefined ? editingCaps.diesel : undefined
      };

      const res = await fetch("/api/days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const details = await res.json();
        onShowToast(`💾 تم تخزين موازنة اليوم بنجاح لفرع ${branch}!`);
        clearForm();
        
        const tomorrow = new Date(date);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];

        // Fetch carryover list for upcoming day to verify remaining installments
        try {
          const carryRes = await fetch(`/api/carryover?branch=${branch}&date=${tomorrowStr}`);
          if (carryRes.ok) {
            const activeCarries = await carryRes.json();
            setCarryovers(activeCarries);
            if (activeCarries.length > 0) {
              setNextDayReminderModal({
                show: true,
                newDate: tomorrowStr,
                carryovers: activeCarries
              });
            } else {
              setDate(tomorrowStr);
              onShowToast(`📅 تم الانتقال تلقائياً لتسجيل تاريخ ${tomorrowStr}`);
            }
          } else {
            setDate(tomorrowStr);
          }
        } catch (err) {
          console.error(err);
          setDate(tomorrowStr);
        }
        loadBranchHistory();
      } else {
        onShowToast("❌ فشل تخزين موازنة الفرع");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ شبكة أثناء تشغيل العملية");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistoryRow = (id: string) => {
    const row = history.find(r => r.id === id);
    if (!row) return;

    const todayDateStr = getTodayDateStr();
    if (row.date !== todayDateStr && userRole !== "مدير") {
      onShowToast("⚠️ عذراً! لا يمكن حذف القيود المسجلة في الأيام السابقة لحماية سلامة الأقساط والمرحلات.");
      return;
    }

    setConfirmModal({
      show: true,
      title: "تأكيد حذف الموازنة اليومية",
      message: "هل أنت متأكد من حذف هذه الموازنة بالكامل؟ سيتم إعادة تسوية المرحلات وجدولة المصروفات تلقائياً في الخلفية.",
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/days/${encodeURIComponent(id)}`, { method: "DELETE" });
          if (res.ok) {
            onShowToast("♻️ تم مسح موازنة اليوم وإعادة ترتيب قيود العهد بنجاح");
            loadCarryOverAlert();
            loadBranchHistory();
          } else {
            onShowToast("❌ فشل مسح موازنة اليوم");
          }
        } catch (err) {
          console.error(err);
          onShowToast("❌ خطأ شبكة أثناء حذف الموازنة");
        }
      }
    });
  };

  const isManager = userRole === "مدير";
  const todayRowsCount = history.filter(row => row.date === getTodayDateStr()).length;
  const selectableRows = isManager ? history : history.filter(row => row.date === getTodayDateStr());
  const isAllSelected = selectableRows.length > 0 && selectedIds.length === selectableRows.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableRows.map(row => row.id));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleDeleteSelected = () => {
    const todayDateStr = getTodayDateStr();
    const hasPastDay = history.some(row => selectedIds.includes(row.id) && row.date !== todayDateStr);
    if (hasPastDay && userRole !== "مدير") {
      onShowToast("⚠️ عذراً! يُمنع حذف أو تعديل موازنات الأيام السابقة.");
      return;
    }

    setConfirmModal({
      show: true,
      title: "تأكيد حذف الموازنات المحددة جماعياً",
      message: `هل أنت متأكد من حذف السجلات المحددة (${selectedIds.length}) نهائياً من فرع ${branch}؟ سيتم إعادة تسوية وجدولة المرحلات تلقائياً لضمان سلامة الأرقام.`,
      isDanger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/days/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: selectedIds, branch })
          });
          if (res.ok) {
            onShowToast("♻️ تم حذف الموازنات المحددة وإعادة ترتيب قيود العهد بنجاح");
            setSelectedIds([]);
            loadCarryOverAlert();
            loadBranchHistory();
          } else {
            onShowToast("❌ فشل حذف الموازنات المحددة");
          }
        } catch (err) {
          console.error(err);
          onShowToast("❌ خطأ بالاتصال أثناء حذف البيانات");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleDeleteAll = () => {
    if (userRole !== "مدير") {
      onShowToast("⚠️ عذراً! تصفير وحذف كافة السجلات التاريخية السابقة غير مسموح به لحماية سلامة السياسة المالية.");
      return;
    }
    setConfirmModal({
      show: true,
      title: "⚠️ تحذير تصفير كافة الموازنات والمرحلات",
      message: `تحذير شديد الأهمية! هل أنت متأكد تماماً من حذف كافة موازنات فرع ${branch} المخزنة بالنظام والبدء من جديد؟ لن يكون بالإمكان التراجع عن ذلك، وسيتم تصفير عهد المصروفات والجدولة مجدداً.`,
      isDanger: true,
      onConfirm: async () => {
        setLoading(true);
        try {
          const res = await fetch("/api/days/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deleteAll: true, branch })
          });
          if (res.ok) {
            onShowToast("♻️ تم حذف كافة الموازنات وتصفير المرحلات لفرع " + branch);
            setSelectedIds([]);
            loadCarryOverAlert();
            loadBranchHistory();
          } else {
            onShowToast("❌ فشل تصفير موازنات الجدولة");
          }
        } catch (err) {
          console.error(err);
          onShowToast("❌ خطأ بالاتصال أثناء تصفير البيانات");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6 RTL text-right select-none">
      {/* Branch toggle */}
      <div className="flex gap-2 mb-4 items-center">
        {(!userBranch || userBranch === "الكل" || userBranch === "القادسية") && (
          <button
            type="button"
            onClick={() => setBranch("القادسية")}
            disabled={userBranch !== undefined && userBranch !== "الكل" && userBranch !== "القادسية"}
            className={`px-6 py-2.5 rounded-full text-sm font-bold shadow-2xs border transition-all ${
              branch === "القادسية"
                ? "bg-indigo-700 text-white border-indigo-750"
                : "bg-white text-slate-700 border-slate-200"
            } ${userBranch && userBranch !== "الكل" ? "cursor-default" : "cursor-pointer"}`}
          >
            🏪 فرع القادسية {userBranch && userBranch === "القادسية" && "🔒 (حسابك مرتبط بهذا الفرع فقط)"}
          </button>
        )}
        {(!userBranch || userBranch === "الكل" || userBranch === "المروج") && (
          <button
            type="button"
            onClick={() => setBranch("المروج")}
            disabled={userBranch !== undefined && userBranch !== "الكل" && userBranch !== "المروج"}
            className={`px-6 py-2.5 rounded-full text-sm font-bold shadow-2xs border transition-all ${
              branch === "المروج"
                ? "bg-indigo-700 text-white border-indigo-750"
                : "bg-white text-slate-700 border-slate-200"
            } ${userBranch && userBranch !== "الكل" ? "cursor-default" : "cursor-pointer"}`}
          >
            🏪 فرع المروج {userBranch && userBranch === "المروج" && "🔒 (حسابك مرتبط بهذا الفرع فقط)"}
          </button>
        )}
      </div>

      {/* Carry Overs alerts */}
      {carryovers.length > 0 && userRole !== "محاسب" && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
          <div 
            onClick={() => setIsCarryoversExpanded(!isCarryoversExpanded)}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 cursor-pointer select-none group hover:bg-slate-100/40 p-2 rounded-xl transition-all"
          >
            <div>
              <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-600 animate-pulse" />
                <span>📊 نظام جدولة وتقسيط المصروفات المرحلة ذات السقف المحدد</span>
                {isCarryoversExpanded ? (
                  <ChevronUp className="w-5 h-5 text-indigo-600 transition-transform duration-200" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-indigo-600 transition-transform duration-200" />
                )}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {isCarryoversExpanded 
                  ? "انقر لضم وإخفاء قائمة الجدولة لتوفير مساحة الواجهة."
                  : "انقر هنا لتوليد تفاصيل مصروفات البيبسي، البلاستيكيات، الصلصات، والديزل التي يجري تقسيطها تلقائياً."
                }
              </p>
            </div>
            <div className="bg-indigo-50 border border-indigo-150 text-indigo-950 px-3.5 py-1.5 rounded-xl text-xs font-bold self-start md:self-auto shadow-2xs">
              ⏳ الحسابات النشطة: {carryovers.length} مصروفات
            </div>
          </div>

          {isCarryoversExpanded && (
            <div className="grid grid-cols-1 gap-4 pt-2 animate-in fade-in slide-in-from-top-1.5 duration-200">
              {carryovers.map((c, i) => {
                const currentCapInputVal = editingCaps[c.key] !== undefined ? editingCaps[c.key] : c.cap;
                const hasChanged = currentCapInputVal !== c.cap;
                
                // Dynamic/live calculations for the entry day based on local cap changes
                const todayDeduct = currentCapInputVal > 0 ? Math.min(c.carry, currentCapInputVal) : 0;
                const daysLeft = currentCapInputVal > 0 ? Math.ceil(c.carry / currentCapInputVal) : Infinity;
                
                const estEnd = new Date(date);
                if (daysLeft !== Infinity) {
                  estEnd.setDate(estEnd.getDate() + daysLeft);
                }
                const displayEndDate = daysLeft !== Infinity ? estEnd.toISOString().split("T")[0] : "∞";

                return (
                  <div 
                    key={c.key || i} 
                    className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4 hover:border-slate-300 transition-all shadow-2xs"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-dashed border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📦</span>
                        <span className="font-extrabold text-slate-800 text-sm md:text-base">مصروف {c.name}</span>
                      </div>

                      <div className="flex items-center gap-2 select-none">
                        <span className="text-xs font-bold text-slate-500">تعديل حد السقف المالي اليومي:</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={currentCapInputVal}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditingCaps(prev => ({ ...prev, [c.key]: val }));
                              
                              // Automatically update corresponding input field in the main entry form
                              const todayDeductVal = val > 0 ? Math.min(c.carry, val) : 0;
                              if (c.key === "pepsi") setPepsiPaid(todayDeductVal);
                              if (c.key === "plastic") setPlasticPaid(todayDeductVal);
                              if (c.key === "sauces") setSaucesPaid(todayDeductVal);
                              if (c.key === "diesel") setDieselPaid(todayDeductVal);
                            }}
                            className="w-20 px-2 py-1 text-xs font-bold border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-600 bg-slate-50 text-slate-800 text-center"
                            min="0"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onShowToast(`✅ تم تطبيق السقف اليومي لمصروف ${c.name} بقيمة ${currentCapInputVal} ر لليوم الحالي فقط! سيتم حفظه عند تسجيل موازنة اليوم.`);
                            }}
                            disabled={!hasChanged}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                              hasChanged 
                                ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            تعديل اليوم
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Grid Layout & Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
                      <div className="bg-slate-50/70 p-3 rounded-lg flex flex-col justify-center border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">المبلغ الإجمالي</span>
                        <span className="text-xs font-black text-slate-850">{(c.totalOriginal || 0).toFixed(2)} ر</span>
                      </div>

                      <div className="bg-slate-50/70 p-3 rounded-lg flex flex-col justify-center border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">تاريخ البداية</span>
                        <span className="text-xs font-bold text-slate-600 font-mono">{c.startDate}</span>
                      </div>

                      <div className="bg-slate-50/70 p-3 rounded-lg flex flex-col justify-center border border-slate-100">
                        <span className="text-[10px] text-slate-500 font-bold block mb-1">تاريخ النهاية المتوقع</span>
                        <span className="text-xs font-bold text-slate-600 font-mono">{displayEndDate}</span>
                      </div>

                      <div className="bg-indigo-50/40 p-3 rounded-lg flex flex-col justify-center border border-indigo-50/85">
                        <span className="text-[10px] text-indigo-750 font-bold block mb-1">كم يوم مضى</span>
                        <span className="text-xs font-black text-indigo-950">{c.daysPassed} أيام مضت</span>
                      </div>

                      <div className="bg-rose-50/50 p-3 rounded-lg flex flex-col justify-center border border-rose-100">
                        <span className="text-[10px] text-rose-705 font-bold block mb-1">مقدار خصم اليوم</span>
                        <span className="text-xs font-black text-rose-800">-{todayDeduct.toFixed(2)} ر</span>
                      </div>

                      <div className="bg-emerald-50/50 p-3 rounded-lg flex flex-col justify-center border border-emerald-100">
                        <span className="text-[10px] text-emerald-705 font-bold block mb-1">الإجمالي المتبقي</span>
                        <span className="text-xs font-black text-emerald-800">{(c.carry).toFixed(2)} ر</span>
                      </div>

                      <div className="bg-amber-50/50 p-3 rounded-lg flex flex-col justify-center border border-amber-100 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-amber-705 font-bold block mb-1 font-sans">متبقي المبالغ المجزأة</span>
                        <span className="text-xs font-black text-amber-900">{daysLeft === Infinity ? "∞" : `${daysLeft} أيام متبقية`}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6 space-y-8">
        {(() => {
          const existing = history.find(d => d.date === date && d.branch === branch);
          if (existing) {
            const todayDateStr = getTodayDateStr();
            const isSameDay = date === todayDateStr;
            const canModify = isSameDay || userRole === "مدير";
            return (
              <div className={`p-4 rounded-xl border ${canModify ? (isLoadedForEdit ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200') : 'bg-slate-50 border-slate-200'} flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-0.5">{canModify ? (isLoadedForEdit ? "✅" : "📌") : "🔒"}</span>
                  <div className="space-y-1">
                    <h4 className={`text-xs font-bold ${canModify ? (isLoadedForEdit ? 'text-emerald-950' : 'text-amber-950') : 'text-slate-800'}`}>
                      {canModify 
                        ? (isLoadedForEdit 
                            ? `وضع التعديل تفاعلي لنظام فرع ${branch} بتاريخ ${date}` 
                            : `تم تسجيل اليوم مسبقاً لفرع ${branch} بتاريخ ${date} (متاح لك التعديل بصفتك مديراً عاماً)`)
                        : `السجل مغلق ومؤمن لفرع ${branch} بتاريخ ${date}`}
                    </h4>
                    <p className={`text-[11px] leading-relaxed ${canModify ? (isLoadedForEdit ? 'text-emerald-850' : 'text-amber-850') : 'text-slate-550'}`}>
                      {canModify 
                        ? (isLoadedForEdit 
                            ? "تم تحميل الموازنة المحفوظة لليوم بالكامل في الحقول أدناه. يمكنك الآن تغيير أي قيم ثم الضغط على حفظ في الأسفل لتعديل موازنة اليوم." 
                            : "تم تحميل وعرض قيود هذا اليوم كمرجع، وبإمكانك تعديله وحفظ التغييرات مباشرة باستخدام زر الحفظ بالأسفل.")
                        : "حفاظاً على سلامة وموثوقية السجلات المالية وتطبيقاً للسياسة المحاسبية للمطعم، يُمنع تعديل أو حذف القيود التي تم إدخالها في الأيام السابقة. يمكنك مراجعة البيانات التاريخية في كشوف التقارير."}
                    </p>
                  </div>
                </div>
                {canModify && !isLoadedForEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoadedForEdit(true);
                      onShowToast("📥 تم تحميل القيود والبيانات المسجلة للموازنة لتعديلها تفاعلياً!");
                    }}
                    className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer whitespace-nowrap align-middle text-center"
                  >
                    📥 تحميل البيانات للتعديل
                  </button>
                )}
              </div>
            );
          }
          return null;
        })()}

        <div>
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
            <DollarSign className="w-5 h-5 text-indigo-700" />
            <h3 className="font-bold text-slate-800 text-base">💰 المبيعات والرسوم اليومية</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">التاريخ المستهدف الحسابي</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={decrementDate}
                  className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 flex items-center justify-center cursor-pointer"
                  title="اليوم السابق (تراجع يوماً)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                />
                <button
                  type="button"
                  onClick={incrementDate}
                  className="p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-slate-600 flex items-center justify-center cursor-pointer"
                  title="اليوم التالي (تقدم يوماً)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">الصرف والافتتاحية المبدئية</label>
              <input
                type="number"
                required
                value={sarf}
                onChange={(e) => setSarf(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Cash section */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest border-r-2 border-indigo-700 pr-2">💵 الكاش اليومي المقبوض:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">ما في الصندوق (الدرج الفعلي الآن)</label>
              <input
                type="number"
                placeholder="0.00"
                value={cashBox}
                onChange={(e) => setCashBox(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">🔵 الكاش الإجمالي الكلي المحسوب</label>
              <input
                type="text"
                readOnly
                value={`${cashTotalRaw.toFixed(2)} ريال`}
                className="w-full px-3 py-2 text-sm border border-slate-100 rounded-lg bg-indigo-50/50 font-bold text-indigo-950"
                title="الدرج + المشتريات النقدية"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">🟢 الكاش الفعلي بدون الافتتاحية</label>
              <input
                type="text"
                readOnly
                value={`${cashNetValue.toFixed(2)} ريال`}
                className="w-full px-3 py-2 text-sm border border-slate-100 rounded-lg bg-emerald-50 text-emerald-950 font-bold"
                title="الدرج - الافتتاحية المبدئية + المشتريات من الدرج"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1 col-span-1">
              <label className="text-xs font-bold text-slate-500">🟠 المتبقي الفعلي بالصندوق للتحويل</label>
              <input
                type="text"
                readOnly
                value={`${cashRemainingInDrawer.toFixed(2)} ريال`}
                className="w-full px-3 py-2 text-sm border border-slate-100 rounded-lg bg-amber-50 text-amber-950 font-bold"
                title="الدرج - الافتتاحية"
              />
            </div>
            <div className="col-span-1 md:col-span-2 text-xs font-semibold flex flex-col justify-center">
              {cashBox === "" ? (
                <div className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 text-slate-500 flex items-center gap-2">
                  <span className="text-indigo-605 font-bold text-base">ℹ️</span>
                  <span>الصرفية والافتتاحية الافتراضية محددة بـ <strong className="text-slate-800">{sarf} ريال</strong>. لن تظهر كقيمة سالبة، وسيتم تفعيل وطرح الخصم تلقائياً فور بدء إدخال المبلغ في الصندوق.</span>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border bg-emerald-50/50 border-emerald-100 text-slate-700 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-850">
                    <span className="text-emerald-600 font-bold">✔️ تم الخصم:</span>
                    <span>تم تطبيق خصم الصرفية والافتتاحية بمقدار <strong className="text-rose-600 font-extrabold">-{sarf} ريال</strong> من الكاش الإجمالي.</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono" dir="ltr">
                    ({valCashBox} [Box] - {sarf} [Sarf] + {cashPurchasesTotal} [Purchases] = {cashNetValue.toFixed(2)} [Net Cash])
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer cash purchases outlays */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-r-2 border-slate-400 pr-2">🛒 مشتريات نقدية عاجلة تم دفعها من الدرج:</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">غاز نقدي</label>
              <input
                type="number"
                placeholder="0.00"
                value={purGas}
                onChange={(e) => setPurGas(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">خبز نقدي</label>
              <input
                type="number"
                placeholder="0.00"
                value={purBread}
                onChange={(e) => setPurBread(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">خضار نقدي</label>
              <input
                type="number"
                placeholder="0.00"
                value={purVeg}
                onChange={(e) => setPurVeg(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">بقالة نقدي</label>
              <input
                type="number"
                placeholder="0.00"
                value={purGroc}
                onChange={(e) => setPurGroc(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Dynamic layout purchases extras */}
          {purExtras.length > 0 && (
            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold text-slate-600">مشتريات نقدية إضافية:</label>
              <div className="space-y-2">
                {purExtras.map((e, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                    <input
                      type="text"
                      placeholder="اسم المصروف الفرعي (مثال: مستلزمات تنظيف)"
                      required
                      value={e.name}
                      onChange={(evt) => updateExtraPurchaseRow(index, "name", evt.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-250 rounded bg-white"
                    />
                    <input
                      type="number"
                      placeholder="مبلغ المصروف"
                      required
                      value={e.amt === 0 ? "" : e.amt}
                      onChange={(evt) => updateExtraPurchaseRow(index, "amt", parseFloat(evt.target.value) || 0)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-250 rounded bg-white font-bold text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => removeExtraPurchaseRow(index)}
                      className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash className="w-4 h-4" /> حذف المصروف الفرعي
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={addExtraPurchaseRow}
              className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              ➕ إضافة مشتريات نقدية أخرى
            </button>
            <span className="text-xs text-slate-500 font-bold">
              إجمالي المصاريف المكبوبة: <strong className="text-indigo-800 text-sm font-black">{cashPurchasesTotal.toFixed(2)} ر</strong>
            </span>
          </div>
        </div>

        {/* Network section */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-widest border-r-2 border-indigo-700 pr-2">💳 نقاط البيع وتحصيل الشبكة (Mada/Visa):</h4>
            <button
              type="button"
              onClick={() => setShowDevice3(!showDevice3)}
              className="text-xs font-bold text-slate-700 hover:text-indigo-700 cursor-pointer"
            >
              {showDevice3 ? "➖ إخفاء أجهزة الدفع الثالثة" : "➕ تفعيل جهاز دفع ثالث"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">مدى - جهاز رقم 1</label>
              <input
                type="number"
                placeholder="0.00"
                value={mada1}
                onChange={(e) => setMada1(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">مدى - جهاز رقم 2</label>
              <input
                type="number"
                placeholder="0.00"
                value={mada2}
                onChange={(e) => setMada2(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            {showDevice3 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">مدى - جهاز رقم 3</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={mada3}
                  onChange={(e) => setMada3(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg animate-fade-in"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">فيزا - جهاز رقم 1</label>
              <input
                type="number"
                placeholder="0.00"
                value={visa1}
                onChange={(e) => setVisa1(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">فيزا - جهاز رقم 2</label>
              <input
                type="number"
                placeholder="0.00"
                value={visa2}
                onChange={(e) => setVisa2(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            {showDevice3 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">فيزا - جهاز رقم 3</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={visa3}
                  onChange={(e) => setVisa3(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg animate-fade-in"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center text-xs">
            <div className="space-y-1">
              <div className="text-slate-500 font-bold">💳 إجمالي صافي الشبكة (مدى + فيزا)</div>
              <div className="text-base font-extrabold text-indigo-900 mt-1">{posNetCalculated.toFixed(2)} ر</div>
              <div className="text-[10px] text-slate-400">(بعد خصم عمولة البنك النشطة)</div>
            </div>
            <div className="space-y-1 font-medium">
              <div className="text-slate-500 font-bold">🟠 المتبقي الفعلي بالصندوق عهدة</div>
              <div className="text-base font-extrabold text-slate-800 mt-1">{cashRemainingInDrawer.toFixed(2)} ر</div>
              <div className="text-[10px] text-slate-400">(بدون الكاش المشتري)</div>
            </div>
            <div className="space-y-1">
              <div className="text-emerald-700 font-bold">💰 مجموع الشبكة + العهدة النقدية</div>
              <div className="text-base font-extrabold text-emerald-850 mt-1">{posPlusRemainingInBox.toFixed(2)} ر</div>
              <div className="text-[10px] text-emerald-600">(الرصيد المتاح للتحويل الفعلي)</div>
            </div>
          </div>
        </div>

        {/* Expenses Section */}
        {userRole !== "محاسب" && (
          <>
            <div className="space-y-4 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <TrendingDown className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-800 text-base">📉 المصروفات وفواتير التقسيط</h3>
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">المستودع (إجمالي عهدة المنتجات)</label>
              <input
                type="number"
                placeholder="0.00"
                value={makhzan}
                onChange={(e) => setMakhzan(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100/80">
              <label className="text-xs font-bold text-slate-750 flex justify-between items-center gap-1">
                <span className="flex items-center gap-1">
                  بيبسي ومشروبات <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded">نظام الأقساط</span>
                </span>
                {carryovers.some(c => c.key === "pepsi") ? (
                  <span className="text-[10px] text-indigo-600 font-bold font-sans animate-pulse">
                    قسط نشط ⚡
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 font-bold font-sans">
                    تم السداد بالكامل ✅
                  </span>
                )}
              </label>

              {(() => {
                const hasItem = carryovers.some(c => c.key === "pepsi");
                if (!hasItem) {
                  return (
                    <div className="bg-emerald-50/70 text-emerald-800 p-1.5 rounded-lg text-center font-bold text-[10px] border border-emerald-100">
                      🟢 الرصيد مصفّر (مسموح فاتورة جديدة فقط)
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setPepsiType('payment');
                        const pItem = carryovers.find(c => c.key === "pepsi");
                        if (pItem) {
                          setPepsiPaid(Math.min(pItem.carry, pItem.cap));
                        }
                      }}
                      className={`py-1 rounded-md transition-all ${pepsiType === 'payment' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      🟢 دفع قسط مالي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPepsiType('invoice');
                        setPepsiPaid("");
                      }}
                      className={`py-1 rounded-md transition-all ${pepsiType === 'invoice' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      🔵 فاتورة جديدة
                    </button>
                  </div>
                );
              })()}

              <div className="relative">
                <input
                  type="number"
                  placeholder={carryovers.some(c => c.key === "pepsi") && pepsiType === 'payment' ? "أدخل قيمة قسط اليوم" : "أدخل قيمة الفاتورة الجديدة"}
                  value={pepsiPaid}
                  onChange={(e) => setPepsiPaid(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 pl-16 text-left font-mono"
                />
                {(() => {
                  const pItem = carryovers.find(c => c.key === "pepsi");
                  if (pItem && pepsiType === 'payment') {
                    const recommended = Math.min(pItem.carry, pItem.cap);
                    return (
                      <button
                        type="button"
                        onClick={() => setPepsiPaid(recommended)}
                        className="absolute left-1.5 top-1.5 px-1.5 py-1 text-[9px] font-bold bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                      >
                        قسط اليوم
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>

              {(() => {
                const stats = getCarryoverStats("pepsi", valPepsiPaid, pepsiType);
                if (!stats) {
                  return (
                    <div className="bg-emerald-50/40 border border-emerald-100/60 p-2.5 rounded-lg text-right space-y-1 text-[10px] leading-relaxed">
                      <div className="font-extrabold text-emerald-800">🎉 الرصيد خالص ومسدد بالكامل</div>
                      <p className="text-slate-500 text-[9px] leading-normal">
                        لا توجد أقساط بيبسي مستحقة للغد. لإدراج فاتورة بيبسي جديدة والبدء بتقسيطها مجدداً، أدخل قيمتها في الحقل أعلاه.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="bg-white border border-slate-150 p-2 rounded-lg text-right space-y-1 text-[10px] leading-relaxed shadow-sm">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>الفاتورة الأصلية المتراكمة:</span>
                      <span className="font-extrabold text-slate-700 font-mono">{stats.totalOriginal.toFixed(2)} ر</span>
                    </div>
                    {stats.hasPrev && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>الرصيد المتبقي المرحل سابقاً:</span>
                        <span className="font-bold text-slate-700 font-mono">{stats.prevCarry.toFixed(2)} ر</span>
                      </div>
                    )}
                    {valPepsiPaid > 0 && (
                      <div className="flex justify-between items-center text-amber-700 font-bold border-t border-dashed border-slate-100 pt-1">
                        <span>{pepsiType === 'invoice' ? 'الفاتورة الجديدة المدخلة لليوم:' : 'القسط المسدد والمدخل لليوم:'}</span>
                        <span className="font-mono">{pepsiType === 'invoice' ? '+' : '-'}{valPepsiPaid.toFixed(2)} ر</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-indigo-700 font-black border-t border-dashed border-slate-100 pt-1">
                      <span>الخصم والمصروف الفعلي لليوم:</span>
                      <span className="font-mono">{stats.deduct.toFixed(2)} ر</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700 font-black border-t border-dashed border-slate-100 pt-0.5 bg-emerald-50/40 px-1 rounded">
                      <span>المتبقي والمرحل للغد:</span>
                      <span className="font-mono">{stats.remaining.toFixed(2)} ر</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 font-extrabold pb-0.5">
                      <span>أيام الأقساط المتبقية للغد:</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">{stats.daysLeft} أيام</span>
                    </div>
                    
                    {pepsiType === 'invoice' && stats.exceedsCap && (
                      <div className="bg-amber-50 text-amber-850 p-1.5 rounded text-[9px] border border-amber-100 leading-normal animate-pulse">
                        ⚠️ الفاتورة أكبر من السقف اليومي ({stats.cap} ر). سيقوم النظام بجدولتها وصرفها بالتقسيط المجدول تلقائياً.
                      </div>
                    )}
                    {pepsiType === 'invoice' && stats.hasPrev && (
                      <div className="bg-amber-50 text-amber-805 p-1.5 rounded text-[9px] border border-amber-150 leading-normal">
                        🚨 تنبيه: لم ينتهِ القسط السابق! سيتم إدراج هذه الفاتورة الجديدة تلقائياً بعد استهلاك الأقساط الحالية.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100/80">
              <label className="text-xs font-bold text-slate-755 flex justify-between items-center gap-1">
                <span className="flex items-center gap-1">
                  بلاستيك ومغلفات <span className="text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded">نظام الأقساط</span>
                </span>
                {carryovers.some(c => c.key === "plastic") ? (
                  <span className="text-[10px] text-red-600 font-bold font-sans animate-pulse">
                    قسط نشط ⚡
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 font-bold font-sans">
                    تم السداد بالكامل ✅
                  </span>
                )}
              </label>

              {(() => {
                const hasItem = carryovers.some(c => c.key === "plastic");
                if (!hasItem) {
                  return (
                    <div className="bg-emerald-50/70 text-emerald-800 p-1.5 rounded-lg text-center font-bold text-[10px] border border-emerald-100">
                      🟢 الرصيد مصفّر (مسموح فاتورة جديدة فقط)
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setPlasticType('payment');
                        const pItem = carryovers.find(c => c.key === "plastic");
                        if (pItem) {
                          setPlasticPaid(Math.min(pItem.carry, pItem.cap));
                        }
                      }}
                      className={`py-1 rounded-md transition-all ${plasticType === 'payment' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      🟢 دفع قسط مالي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlasticType('invoice');
                        setPlasticPaid("");
                      }}
                      className={`py-1 rounded-md transition-all ${plasticType === 'invoice' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      🔵 فاتورة جديدة
                    </button>
                  </div>
                );
              })()}

              <div className="relative">
                <input
                  type="number"
                  placeholder={carryovers.some(c => c.key === "plastic") && plasticType === 'payment' ? "أدخل قيمة قسط اليوم" : "أدخل قيمة الفاتورة الجديدة"}
                  value={plasticPaid}
                  onChange={(e) => setPlasticPaid(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 pl-16 text-left font-mono"
                />
                {(() => {
                  const pItem = carryovers.find(c => c.key === "plastic");
                  if (pItem && plasticType === 'payment') {
                    const recommended = Math.min(pItem.carry, pItem.cap);
                    return (
                      <button
                        type="button"
                        onClick={() => setPlasticPaid(recommended)}
                        className="absolute left-1.5 top-1.5 px-1.5 py-1 text-[9px] font-bold bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                      >
                        قسط اليوم
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>

              {(() => {
                const stats = getCarryoverStats("plastic", valPlasticPaid, plasticType);
                if (!stats) {
                  return (
                    <div className="bg-emerald-50/40 border border-emerald-100/60 p-2.5 rounded-lg text-right space-y-1 text-[10px] leading-relaxed">
                      <div className="font-extrabold text-emerald-800">🎉 الرصيد خالص ومسدد بالكامل</div>
                      <p className="text-slate-500 text-[9px] leading-normal">
                        لا توجد أقساط بلاستيك مستحقة للغد. لإدراج فاتورة بلاستيك جديدة والبدء بتقسيطها مجدداً، أدخل قيمتها في الحقل أعلاه.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="bg-white border border-slate-150 p-2 rounded-lg text-right space-y-1 text-[10px] leading-relaxed shadow-sm">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>الفاتورة الأصلية المتراكمة:</span>
                      <span className="font-extrabold text-slate-700 font-mono">{stats.totalOriginal.toFixed(2)} ر</span>
                    </div>
                    {stats.hasPrev && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>الرصيد المتبقي المرحل سابقاً:</span>
                        <span className="font-bold text-slate-700 font-mono">{stats.prevCarry.toFixed(2)} ر</span>
                      </div>
                    )}
                    {valPlasticPaid > 0 && (
                      <div className="flex justify-between items-center text-amber-700 font-bold border-t border-dashed border-slate-100 pt-1">
                        <span>{plasticType === 'invoice' ? 'الفاتورة الجديدة المدخلة لليوم:' : 'القسط المسدد والمدخل لليوم:'}</span>
                        <span className="font-mono">{plasticType === 'invoice' ? '+' : '-'}{valPlasticPaid.toFixed(2)} ر</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-indigo-700 font-black border-t border-dashed border-slate-100 pt-1">
                      <span>الخصم والمصروف الفعلي لليوم:</span>
                      <span className="font-mono">{stats.deduct.toFixed(2)} ر</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700 font-black border-t border-dashed border-slate-100 pt-0.5 bg-emerald-50/40 px-1 rounded">
                      <span>المتبقي والمرحل للغد:</span>
                      <span className="font-mono">{stats.remaining.toFixed(2)} ر</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 font-extrabold pb-0.5">
                      <span>أيام الأقساط المتبقية للغد:</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">{stats.daysLeft} أيام</span>
                    </div>
                    
                    {plasticType === 'invoice' && stats.exceedsCap && (
                      <div className="bg-amber-50 text-amber-850 p-1.5 rounded text-[9px] border border-amber-100 leading-normal animate-pulse">
                        ⚠️ الفاتورة أكبر من السقف اليومي ({stats.cap} ر). سيقوم النظام بجدولتها وصرفها بالتقسيط المجدول تلقائياً.
                      </div>
                    )}
                    {plasticType === 'invoice' && stats.hasPrev && (
                      <div className="bg-amber-50 text-amber-805 p-1.5 rounded text-[9px] border border-amber-150 leading-normal">
                        🚨 تنبيه: لم ينتهِ القسط السابق! سيتم ضم هذه الفاتورة الجديدة تلقائياً بعد استهلاك الأقساط الحالية.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">مصروف الغاز الكلي اليوم</label>
              <input
                type="number"
                placeholder="0.00"
                value={gasExp}
                onChange={(e) => setGasExp(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">مصروف الخضار الكلي اليوم</label>
              <input
                type="number"
                placeholder="0.00"
                value={vegExp}
                onChange={(e) => setVegExp(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100/80">
              <label className="text-xs font-bold text-slate-755 flex justify-between items-center gap-1">
                <span className="flex items-center gap-1">
                  الصلصات والمواد الأولية <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded">نظام الأقساط</span>
                </span>
                {carryovers.some(c => c.key === "sauces") ? (
                  <span className="text-[10px] text-amber-600 font-bold font-sans animate-pulse">
                    قسط نشط ⚡
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 font-bold font-sans">
                    تم السداد بالكامل ✅
                  </span>
                )}
              </label>

              {(() => {
                const hasItem = carryovers.some(c => c.key === "sauces");
                if (!hasItem) {
                  return (
                    <div className="bg-emerald-50/70 text-emerald-800 p-1.5 rounded-lg text-center font-bold text-[10px] border border-emerald-100">
                      🟢 الرصيد مصفّر (مسموح فاتورة جديدة فقط)
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setSaucesType('payment');
                        const pItem = carryovers.find(c => c.key === "sauces");
                        if (pItem) {
                          setSaucesPaid(Math.min(pItem.carry, pItem.cap));
                        }
                      }}
                      className={`py-1 rounded-md transition-all ${saucesType === 'payment' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      🟢 دفع قسط مالي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSaucesType('invoice');
                        setSaucesPaid("");
                      }}
                      className={`py-1 rounded-md transition-all ${saucesType === 'invoice' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      🔵 فاتورة جديدة
                    </button>
                  </div>
                );
              })()}

              <div className="relative">
                <input
                  type="number"
                  placeholder={carryovers.some(c => c.key === "sauces") && saucesType === 'payment' ? "أدخل قيمة قسط اليوم" : "أدخل قيمة الفاتورة الجديدة"}
                  value={saucesPaid}
                  onChange={(e) => setSaucesPaid(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 pl-16 text-left font-mono"
                />
                {(() => {
                  const pItem = carryovers.find(c => c.key === "sauces");
                  if (pItem && saucesType === 'payment') {
                    const recommended = Math.min(pItem.carry, pItem.cap);
                    return (
                      <button
                        type="button"
                        onClick={() => setSaucesPaid(recommended)}
                        className="absolute left-1.5 top-1.5 px-1.5 py-1 text-[9px] font-bold bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                      >
                        قسط اليوم
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>

              {(() => {
                const stats = getCarryoverStats("sauces", valSaucesPaid, saucesType);
                if (!stats) {
                  return (
                    <div className="bg-emerald-50/40 border border-emerald-100/60 p-2.5 rounded-lg text-right space-y-1 text-[10px] leading-relaxed">
                      <div className="font-extrabold text-emerald-800">🎉 الرصيد خالص ومسدد بالكامل</div>
                      <p className="text-slate-500 text-[9px] leading-normal">
                        لا توجد أقساط صلصات مستحقة للغد. لإدراج فاتورة صلصات جديدة والبدء بتقسيطها مجدداً، أدخل قيمتها في الحقل أعلاه.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="bg-white border border-slate-150 p-2 rounded-lg text-right space-y-1 text-[10px] leading-relaxed shadow-sm">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>الفاتورة الأصلية المتراكمة:</span>
                      <span className="font-extrabold text-slate-700 font-mono">{stats.totalOriginal.toFixed(2)} ر</span>
                    </div>
                    {stats.hasPrev && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>الرصيد المتبقي المرحل سابقاً:</span>
                        <span className="font-bold text-slate-700 font-mono">{stats.prevCarry.toFixed(2)} ر</span>
                      </div>
                    )}
                    {valSaucesPaid > 0 && (
                      <div className="flex justify-between items-center text-amber-700 font-bold border-t border-dashed border-slate-100 pt-1">
                        <span>{saucesType === 'invoice' ? 'الفاتورة الجديدة المدخلة لليوم:' : 'القسط المسدد والمدخل لليوم:'}</span>
                        <span className="font-mono">{saucesType === 'invoice' ? '+' : '-'}{valSaucesPaid.toFixed(2)} ر</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-indigo-700 font-black border-t border-dashed border-slate-100 pt-1">
                      <span>الخصم والمصروف الفعلي لليوم:</span>
                      <span className="font-mono">{stats.deduct.toFixed(2)} ر</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700 font-black border-t border-dashed border-slate-100 pt-0.5 bg-emerald-50/40 px-1 rounded">
                      <span>المتبقي والمرحل للغد:</span>
                      <span className="font-mono">{stats.remaining.toFixed(2)} ر</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 font-extrabold pb-0.5">
                      <span>أيام الأقساط المتبقية للغد:</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">{stats.daysLeft} أيام</span>
                    </div>
                    
                    {saucesType === 'invoice' && stats.exceedsCap && (
                      <div className="bg-amber-50 text-amber-850 p-1.5 rounded text-[9px] border border-amber-100 leading-normal animate-pulse">
                        ⚠️ الفاتورة أكبر من السقف اليومي ({stats.cap} ر). سيقوم النظام بجدولتها وصرفها بالتقسيط المجدول تلقائياً.
                      </div>
                    )}
                    {saucesType === 'invoice' && stats.hasPrev && (
                      <div className="bg-amber-50 text-amber-805 p-1.5 rounded text-[9px] border border-amber-150 leading-normal">
                        🚨 تنبيه: لم ينتهِ القسط السابق! سيتم ضم هذه الفاتورة الجديدة تلقائياً بعد استهلاك الأقساط الحالية.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">مصروف الخبز الكلي اليوم</label>
              <input
                type="number"
                placeholder="0.00"
                value={breadExp}
                onChange={(e) => setBreadExp(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">مصروف البقالة والألبان الفعلي</label>
              <input
                type="number"
                placeholder="0.00"
                value={groceryExp}
                onChange={(e) => setGroceryExp(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100/80">
              <label className="text-xs font-bold text-slate-755 flex justify-between items-center gap-1">
                <span className="flex items-center gap-1">
                  الديزل <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-1.5 py-0.5 rounded">نظام الأقساط</span>
                </span>
                {carryovers.some(c => c.key === "diesel") ? (
                  <span className="text-[10px] text-amber-600 font-bold font-sans animate-pulse">
                    قسط نشط ⚡
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-600 font-bold font-sans">
                    تم السداد بالكامل ✅
                  </span>
                )}
              </label>

              {(() => {
                const hasItem = carryovers.some(c => c.key === "diesel");
                if (!hasItem) {
                  return (
                    <div className="bg-emerald-50/70 text-emerald-800 p-1.5 rounded-lg text-center font-bold text-[10px] border border-emerald-100">
                      🟢 الرصيد مصفّر (مسموح فاتورة جديدة فقط)
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setDieselType('payment');
                        const pItem = carryovers.find(c => c.key === "diesel");
                        if (pItem) {
                          setDieselPaid(Math.min(pItem.carry, pItem.cap));
                        }
                      }}
                      className={`py-1 rounded-md transition-all ${dieselType === 'payment' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      🟢 دفع قسط مالي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDieselType('invoice');
                        setDieselPaid("");
                      }}
                      className={`py-1 rounded-md transition-all ${dieselType === 'invoice' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      🔵 فاتورة جديدة
                    </button>
                  </div>
                );
              })()}

              <div className="relative">
                <input
                  type="number"
                  placeholder={carryovers.some(c => c.key === "diesel") && dieselType === 'payment' ? "أدخل قيمة قسط اليوم" : "أدخل قيمة الفاتورة الجديدة"}
                  value={dieselPaid}
                  onChange={(e) => setDieselPaid(e.target.value === "" ? "" : parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 pl-16 text-left font-mono"
                />
                {(() => {
                  const pItem = carryovers.find(c => c.key === "diesel");
                  if (pItem && dieselType === 'payment') {
                    const recommended = Math.min(pItem.carry, pItem.cap);
                    return (
                      <button
                        type="button"
                        onClick={() => setDieselPaid(recommended)}
                        className="absolute left-1.5 top-1.5 px-1.5 py-1 text-[9px] font-bold bg-amber-100 text-amber-800 rounded hover:bg-amber-200"
                      >
                        قسط اليوم
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>

              {(() => {
                const stats = getCarryoverStats("diesel", valDieselPaid, dieselType);
                if (!stats) {
                  return (
                    <div className="bg-emerald-50/40 border border-emerald-100/60 p-2.5 rounded-lg text-right space-y-1 text-[10px] leading-relaxed">
                      <div className="font-extrabold text-emerald-800">🎉 الرصيد خالص ومسدد بالكامل</div>
                      <p className="text-slate-500 text-[9px] leading-normal">
                        لا توجد أقساط ديزل مستحقة للغد. لإدراج فاتورة ديزل جديدة والبدء بتقسيطها مجدداً، أدخل قيمتها في الحقل أعلاه.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="bg-white border border-slate-150 p-2 rounded-lg text-right space-y-1 text-[10px] leading-relaxed shadow-sm">
                    <div className="flex justify-between items-center text-slate-500">
                      <span>الفاتورة الأصلية المتراكمة:</span>
                      <span className="font-extrabold text-slate-700 font-mono">{stats.totalOriginal.toFixed(2)} ر</span>
                    </div>
                    {stats.hasPrev && (
                      <div className="flex justify-between items-center text-slate-500">
                        <span>الرصيد المتبقي المرحل سابقاً:</span>
                        <span className="font-bold text-slate-700 font-mono">{stats.prevCarry.toFixed(2)} ر</span>
                      </div>
                    )}
                    {valDieselPaid > 0 && (
                      <div className="flex justify-between items-center text-amber-700 font-bold border-t border-dashed border-slate-100 pt-1">
                        <span>{dieselType === 'invoice' ? 'الفاتورة الجديدة المدخلة لليوم:' : 'القسط المسدد والمدخل لليوم:'}</span>
                        <span className="font-mono">{dieselType === 'invoice' ? '+' : '-'}{valDieselPaid.toFixed(2)} ر</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-indigo-700 font-black border-t border-dashed border-slate-100 pt-1">
                      <span>الخصم والمصروف الفعلي لليوم:</span>
                      <span className="font-mono">{stats.deduct.toFixed(2)} ر</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-700 font-black border-t border-dashed border-slate-100 pt-0.5 bg-emerald-50/40 px-1 rounded">
                      <span>المتبقي والمرحل للغد:</span>
                      <span className="font-mono">{stats.remaining.toFixed(2)} ر</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 font-extrabold pb-0.5">
                      <span>أيام الأقساط المتبقية للغد:</span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">{stats.daysLeft} أيام</span>
                    </div>
                    
                    {dieselType === 'invoice' && stats.exceedsCap && (
                      <div className="bg-amber-50 text-amber-850 p-1.5 rounded text-[9px] border border-amber-100 leading-normal animate-pulse">
                        ⚠️ الفاتورة أكبر من السقف اليومي ({stats.cap} ر). سيقوم النظام بجدولتها وصرفها بالتقسيط المجدول تلقائياً.
                      </div>
                    )}
                    {dieselType === 'invoice' && stats.hasPrev && (
                      <div className="bg-amber-50 text-amber-805 p-1.5 rounded text-[9px] border border-amber-150 leading-normal">
                        🚨 تنبيه: لم ينتهِ القسط السابق! سيتم ضم هذه الفاتورة الجديدة تلقائياً بعد استهلاك الأقساط الحالية.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Permanent fixed deductions */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-rose-700 uppercase tracking-widest border-r-2 border-rose-700 pr-2">📌 خصوم ثابتة شهرية أو تراكميات مبيعات موحدة:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">مبلغ التحصيل أو الخصم الثابت</label>
              <input
                type="number"
                placeholder="مثال: قطوع رواتب أو إيجار جزئي"
                value={fixedDeduct}
                onChange={(e) => setFixedDeduct(e.target.value === "" ? "" : parseFloat(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-bold text-slate-750">ملاحظة البند الثابت</label>
              <input
                type="text"
                placeholder="مثال: خصم إيجار للمحل + عهدة راتب المحاسب مضافة"
                value={fixedNote}
                onChange={(e) => setFixedNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Custom extra daily expenses list */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-r-2 border-slate-400 pr-2">➕ بنود مصروفات عادية وطوارئ أخرى:</h4>
          
          {others.map((oth, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">اسم ووصف المصروف</label>
                <input
                  type="text"
                  placeholder="مثال: صيانة غسالة مطبخ"
                  value={oth.name}
                  onChange={(e) => updateOtherExpenseRow(index, "name", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-250 rounded-lg bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">المبلغ بالريال</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={oth.amt === 0 ? "" : oth.amt}
                  onChange={(e) => updateOtherExpenseRow(index, "amt", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-250 rounded-lg bg-white font-bold text-rose-800"
                />
              </div>
              <div className="pt-4 text-left">
                <button
                  type="button"
                  onClick={() => removeOtherExpenseRow(index)}
                  className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash className="w-4 h-4" /> حذف سطر الصرف
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={addOtherExpenseRow}
              className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              ➕ إضافة بند مصروفات آخر
            </button>
            <span className="text-xs text-slate-500 font-bold">
              مجموع مصروفات الطوارئ الفرعية: <strong className="text-indigo-850 text-sm font-black">{valOthersTotal.toFixed(2)} ر</strong>
            </span>
          </div>
        </div>
        </>
        )}

        <div className="space-y-1 pt-2">
          <label className="text-xs font-bold text-slate-700">مذكرات أو ملاحظات عامة لليوم</label>
          <textarea
            placeholder="تدوين أي أحداث خاصة بصيانة الفروع، عجز بمبيعات مدى، إلخ..."
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
        </div>

        {/* Live simulations panel summary */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 border-l-4 border-indigo-500 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Info className="w-5 h-5 text-indigo-400 animate-pulse" />
            <h4 className="font-extrabold text-sm text-slate-200">📊 ملخص تقديري مبدئي فوري لليوم (قبل التسوير):</h4>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
              <div className="text-slate-400 text-xs">الكاش بدون الافتتاحية</div>
              <div className="text-md font-bold mt-1.5 text-white">{cashNetValue.toFixed(2)} ر</div>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700">
              <div className="text-slate-400 text-xs">إجمالي صافي الشبكات</div>
              <div className="text-md font-bold mt-1.5 text-white">{posNetCalculated.toFixed(2)} ر</div>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 col-span-2 md:col-span-1">
              <div className="text-slate-400 text-xs font-bold">إجمالي الإيراد الصافي</div>
              <div className="text-lg font-black mt-1 text-emerald-400">{totalRawDailyRevenues.toFixed(2)} ر</div>
            </div>
            <div className="p-3 bg-slate-850 rounded-xl border border-slate-700 col-span-2 md:col-span-1">
              <div className="text-slate-400 text-xs">المصروف المقترح تسجيله</div>
              <div className="text-md font-bold mt-1.5 text-rose-400">{totalStandardExpenses.toFixed(2)} ر</div>
              <div className="text-[9px] text-slate-500">(سيتأثر بالتقسيط والترحيل للمرحلات)</div>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800 font-medium">
            <span>* التقرير التقديري فوري لإرشاد الموظف ولا يعد ورقة محاسبية نهائية ومثبتة حتى يتم الضغط على الحفظ وحساب العهد.</span>
            <span className={`font-black text-sm px-3 py-1 rounded ${
              liveSimulatedNetProfit >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
            }`}>
              الصافي المبدئي الموجه: {liveSimulatedNetProfit.toFixed(2)} ريال
            </span>
          </div>
        </div>

        {/* Submit handle */}
        <div className="flex justify-end pt-4">
          <button
            type="button"
            disabled={loading}
            onClick={handleSaveDay}
            className="bg-indigo-700 hover:bg-indigo-800 text-white font-extrabold text-sm py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            حفظ قيود اليوم وتأكيد التقسيط المحاسبي
          </button>
        </div>
      </div>

      {/* History log list */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 flex-wrap">
            <FileText className="w-4 h-4 text-indigo-700" /> سجل وتاريخ القيود المحفوظة لفرع {branch}:
          </h3>
          <button
            type="button"
            onClick={loadBranchHistory}
            className="text-xs text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg flex items-center gap-1 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> تحديث السجل
          </button>
        </div>

        {/* Selected Items Dashboard */}
        {history.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <span>خيارات التعديل والحذف الجماعي:</span>
              <span className="text-indigo-750 font-black font-sans text-sm bg-indigo-100 px-2 py-0.5 rounded-md">تم تحديد {selectedIds.length} من {history.length} سجل</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={selectedIds.length === 0 || loading}
                onClick={handleDeleteSelected}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  selectedIds.length > 0 && !loading
                    ? "bg-rose-600 border-rose-700 text-white hover:bg-rose-700 shadow-xs"
                    : "bg-slate-100 border-slate-200 text-slate-450 cursor-not-allowed"
                }`}
              >
                <Trash className="w-3.5 h-3.5" />
                حذف المحددة ({selectedIds.length})
              </button>
              
              <button
                type="button"
                disabled={loading}
                onClick={handleDeleteAll}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Trash className="w-3.5 h-3.5" />
                حذف جميع الموازنات
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto border border-slate-100 rounded-xl text-xs">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-900 text-white font-bold select-none">
                <th className="p-3 text-center w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-indigo-650 border-slate-300 rounded focus:ring-indigo-650 cursor-pointer"
                    title="تحديد الكل / إلغاء التحديد"
                  />
                </th>
                <th className="p-3">التاريخ</th>
                <th className="p-3 text-left">إجمالي المبيعات</th>
                <th className="p-3 text-left">كاش الدرج</th>
                <th className="p-3 text-left">شبكات (بعد الرسوم)</th>
                <th className="p-3 text-left">المصروف المنكوب للفترة</th>
                <th className="p-3 text-left">الصافي الفعلي</th>
                <th className="p-3 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    لا تتوفر قيود وموازنات مسجلة لفرع {branch} في النظام حتى الآن.
                  </td>
                </tr>
              ) : (
                history.map((row) => {
                  const dayExpenses = calcTotalDayExp(row);
                  const isProfit = row.net_day >= 0;
                  const isChecked = selectedIds.includes(row.id);
                  return (
                    <tr 
                      key={row.id} 
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-all font-medium ${
                        isChecked ? "bg-indigo-50/30 hover:bg-indigo-50/50" : ""
                      }`}
                    >
                      <td className="p-3 text-center">
                        {row.date === getTodayDateStr() || userRole === "مدير" ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectRow(row.id)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-400 select-none cursor-not-allowed" title="تاريخ الأمس - محمي ومؤمن من التعديل للمحاسبين">🔒</span>
                        )}
                      </td>
                      <td className="p-3 font-bold text-slate-800">{row.date}</td>
                      <td className="p-3 text-left font-bold text-emerald-700">{row.total_sales.toFixed(2)} ر</td>
                      <td className="p-3 text-left text-slate-500">{row.cash_net.toFixed(2)} ر</td>
                      <td className="p-3 text-left text-slate-500">{row.pos_net.toFixed(2)} ر</td>
                      <td className="p-3 text-left text-rose-600">{dayExpenses.toFixed(2)} ر</td>
                      <td className={`p-3 text-left font-extrabold ${isProfit ? "text-emerald-700" : "text-rose-700"}`}>
                        {row.net_day.toFixed(2)} ر
                      </td>
                      <td className="p-3 text-center">
                        {row.date === getTodayDateStr() || userRole === "مدير" ? (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setDate(row.date);
                                setIsLoadedForEdit(true);
                                onShowToast(`📥 تم تحميل بيانات يوم ${row.date} لفرع ${row.branch} للتعديل.`);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="تعديل هذه الموازنة"
                            >
                              ✏️ تعديل
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteHistoryRow(row.id)}
                              className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer transition-colors"
                              title="مسح موازنة اليوم"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 text-slate-400 font-bold text-[10px] sm:text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded select-none cursor-not-allowed"
                            title="التعديل والحذف مقفل للأيام السابقة لضمان سلامة سير القيود المالية"
                          >
                            🔒 مغلق
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Target Day Installments Reminder Modal */}
      {nextDayReminderModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="rtl">
            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-100 p-5 flex items-start gap-4">
              <div className="p-3 bg-amber-100 text-amber-800 rounded-full flex-shrink-0">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  ⚠️ تذكير بالأقساط والمصروفات المرحلة
                </h3>
                <p className="text-xs text-slate-600">
                  أنت على وشك الانتقال لتاريخ اليوم التالي: <strong className="text-amber-850 font-mono font-bold text-sm">{nextDayReminderModal.newDate}</strong>. يرجى مراجعة الأقساط والالتزامات المرحلة التي ستطبق غداً لخصمها من الإيرادات:
                </p>
              </div>
            </div>

            {/* Content Table / List */}
            <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto">
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-100">
                      <th className="p-3">اسم المصروف المرحل</th>
                      <th className="p-3 text-left">قسط اليوم التالي</th>
                      <th className="p-3 text-left font-mono">الرصيد المتبقي الكلي</th>
                      <th className="p-3 text-center">الأيام المتبقية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextDayReminderModal.carryovers.map((c, idx) => {
                      const tomorrowDeduct = Math.min(c.carry, c.cap);
                      return (
                        <tr key={c.key || idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-all font-medium">
                          <td className="p-3 font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="text-sm">📦</span>
                            <span>{c.name}</span>
                          </td>
                          <td className="p-3 text-left font-bold text-rose-600">
                            -{tomorrowDeduct.toFixed(2)} ر
                          </td>
                          <td className="p-3 text-left font-bold text-emerald-700 font-mono">
                            {c.carry.toFixed(2)} ر
                          </td>
                          <td className="p-3 text-center font-bold text-amber-800">
                            {c.daysLeft} يوم
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-lg text-[11px] text-slate-600 flex items-start gap-1.5 leading-relaxed">
                <span className="text-indigo-650">💡</span>
                <span>
                  <strong>توضيح:</strong> هذه المبالغ تم جدولتها تلقائياً وفقاً للأسقف المالية المسجلة. عند الانتقال لليوم التالي، سيقوم النظام تلقائياً بتطبيق هذه الخصومات وتوزيعها لدقة حساب الأرباح والمبيعات اليومية.
                </span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-2 border-t border-slate-100">
              <button
                type="button"
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                onClick={() => {
                  setDate(nextDayReminderModal.newDate);
                  setNextDayReminderModal(prev => ({ ...prev, show: false }));
                  onShowToast(`📅 تم الانتقال بنجاح إلى تاريخ ${nextDayReminderModal.newDate}`);
                }}
              >
                <span>نعم، الانتقال لليوم التالي</span>
              </button>
              <button
                type="button"
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center cursor-pointer"
                onClick={() => {
                  setNextDayReminderModal(prev => ({ ...prev, show: false }));
                }}
              >
                <span>تراجع وإلغاء</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Polish Safe Custom Confirm Dialog Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="rtl text-right">
            {/* Modal Header */}
            <div className={`p-5 flex items-start gap-4 ${confirmModal.isDanger ? "bg-rose-50 border-b border-rose-100" : "bg-indigo-50 border-b border-indigo-100"}`}>
              <div className={`p-2.5 rounded-full flex-shrink-0 ${confirmModal.isDanger ? "bg-rose-100 text-rose-700" : "bg-indigo-100 text-indigo-700"}`}>
                <Trash className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-base font-bold text-slate-900">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500">منظومة الإدارة المحاسبية الذكية</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-sm text-slate-700 font-medium leading-relaxed text-right space-y-3">
              <p>{confirmModal.message}</p>
              {confirmModal.isDanger && (
                <div className="bg-amber-50 p-3 rounded-lg text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-1.5 border border-amber-100">
                  <span>⚠️</span>
                  <span>تنبيه: لا يمكن استعادة هذه البيانات بعد الحذف، وسيتم تحديث القيود لضمان تماسك التقارير السنوية واليومية ومطابقة كشوفات الأرصدة.</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-2 border-t border-slate-100">
              <button
                type="button"
                className={`w-full sm:w-auto px-5 py-2.5 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                  confirmModal.isDanger 
                    ? "bg-rose-600 hover:bg-rose-700 text-white" 
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
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
    </div>
  );
}
