import React, { useState, useEffect } from "react";
import { DrinksEntry, DrinkItemState } from "../types";
import { 
  Save, RefreshCw, CupSoda, ClipboardList, TrendingUp, AlertTriangle, 
  CheckCircle2, AlertCircle, Trash2, Info, ChevronDown, ChevronUp, History,
  Settings2, Info as InfoIcon, Calendar, Printer, FileText, Clock, Layers,
  Copy, Check, ArrowDownToLine, ArrowUpFromLine
} from "lucide-react";

interface DrinksTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
  userBranch?: string;
}

const DRINK_METADATA = [
  { id: "pepsi", name: "بيبسي", color: "border-blue-200 bg-blue-50/20 text-blue-800" },
  { id: "sevenup", name: "سفن", color: "border-emerald-200 bg-emerald-50/20 text-emerald-800" },
  { id: "dew", name: "ديو", color: "border-lime-200 bg-lime-50/20 text-lime-800" },
  { id: "citrus", name: "حمضيات", color: "border-orange-200 bg-orange-50/20 text-orange-800" },
  { id: "pepsi_diet", name: "بيبسي دايت", color: "border-slate-300 bg-slate-50/30 text-slate-800" },
  { id: "sevenup_diet", name: "سفن دايت", color: "border-green-200 bg-green-50/20 text-green-800" },
  { id: "dew_diet", name: "ديو دايت", color: "border-yellow-200 bg-yellow-50/20 text-yellow-800" },
  { id: "citrus_diet", name: "حمضيات دايت", color: "border-amber-300 bg-amber-50/20 text-amber-800" },
] as const;

type DrinkId = typeof DRINK_METADATA[number]["id"];

const createInitialState = (date: string, branch: "القادسية" | "المروج"): DrinksEntry => ({
  id: `${branch}-${date}`,
  date,
  branch,
  pepsi: { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 },
  sevenup: { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 },
  dew: { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 },
  citrus: { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 },
  pepsi_diet: { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 },
  sevenup_diet: { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 },
  dew_diet: { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 },
  citrus_diet: { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 },
  notes: ""
});

export default function DrinksTab({ onShowToast, userRole, userBranch }: DrinksTabProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedBranch, setSelectedBranch] = useState<"القادسية" | "المروج">("القادسية");
  
  const [form, setForm] = useState<DrinksEntry>(() => createInitialState(selectedDate, "القادسية"));
  const [history, setHistory] = useState<DrinksEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"form" | "history" | "prices" | "report">("form");
  const [historyFilterBranch, setHistoryFilterBranch] = useState<string>("الكل");
  const [isCalculationsOpen, setIsCalculationsOpen] = useState(true);

  // Day type: "normal" (sales only, no new shipment, prev_stock is automatically yesterday ending) vs "shipment" (new delivery day, count remaining BEFORE new cartons are added)
  const [dayType, setDayType] = useState<"normal" | "shipment">("normal");

  // Report Filter States
  const [reportBranch, setReportBranch] = useState<"القادسية" | "المروج">("القادسية");
  const [reportType, setReportType] = useState<"day" | "range" | "last_shipment" | "last_2_shipments" | "last_3_shipments">("last_shipment");
  const [reportSingleDate, setReportSingleDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [copiedReport, setCopiedReport] = useState(false);

  // Prices State
  const [prices, setPrices] = useState<Record<DrinkId, number>>({
    pepsi: 2.5,
    sevenup: 2.5,
    dew: 2.5,
    citrus: 2.5,
    pepsi_diet: 2.0,
    sevenup_diet: 2.0,
    dew_diet: 2.0,
    citrus_diet: 2.0
  });
  const [savingPrices, setSavingPrices] = useState(false);

  // Set initial branch based on user branch restrictions
  useEffect(() => {
    if (userBranch && userBranch !== "الكل") {
      setSelectedBranch(userBranch as "القادسية" | "المروج");
      setReportBranch(userBranch as "القادسية" | "المروج");
    }
  }, [userBranch]);

  // Load prices from server
  const fetchPrices = async () => {
    try {
      const res = await fetch("/api/drinks/prices");
      if (res.ok) {
        const data = await res.json();
        setPrices(data);
      }
    } catch (err) {
      console.error("Error loading drink prices:", err);
    }
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  // Update form structure whenever date or branch changes
  useEffect(() => {
    setForm((prev) => {
      const next = createInitialState(selectedDate, selectedBranch);
      // Keep other fields if user is switching but date remains same
      return {
        ...next,
        pepsi: prev.branch === selectedBranch && prev.date === selectedDate ? prev.pepsi : next.pepsi,
        sevenup: prev.branch === selectedBranch && prev.date === selectedDate ? prev.sevenup : next.sevenup,
        dew: prev.branch === selectedBranch && prev.date === selectedDate ? prev.dew : next.dew,
        citrus: prev.branch === selectedBranch && prev.date === selectedDate ? prev.citrus : next.citrus,
        pepsi_diet: prev.branch === selectedBranch && prev.date === selectedDate ? prev.pepsi_diet : next.pepsi_diet,
        sevenup_diet: prev.branch === selectedBranch && prev.date === selectedDate ? prev.sevenup_diet : next.sevenup_diet,
        dew_diet: prev.branch === selectedBranch && prev.date === selectedDate ? prev.dew_diet : next.dew_diet,
        citrus_diet: prev.branch === selectedBranch && prev.date === selectedDate ? prev.citrus_diet : next.citrus_diet,
        notes: prev.branch === selectedBranch && prev.date === selectedDate ? prev.notes : ""
      };
    });
  }, [selectedDate, selectedBranch]);

  // Load history records
  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/drinks");
      if (res.ok) {
        const data = await res.json();
        // Sort history by date descending
        const sorted = data.sort((a: DrinksEntry, b: DrinksEntry) => b.date.localeCompare(a.date));
        setHistory(sorted);
      } else {
        onShowToast("❌ فشل تحميل سجل المشروبات");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء تحميل سجل المشروبات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Auto-fill previous stock from previous entry (the entry with the max date strictly before selectedDate)
  const handleAutoFillPrevStock = (silent = false) => {
    if (history.length === 0) {
      if (!silent) onShowToast("ℹ️ لا يوجد سجلات سابقة للمقارنة والاستيراد");
      return;
    }

    // Filter by same branch and date before selected date
    const branchHistory = history
      .filter((h) => h.branch === selectedBranch && h.date < selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date)); // descending date order

    if (branchHistory.length === 0) {
      if (!silent) onShowToast(`ℹ️ لا يوجد سجلات سابقة لفرع ${selectedBranch} تسبق تاريخ ${selectedDate}`);
      return;
    }

    const lastEntry = branchHistory[0];
    setForm((prev) => ({
      ...prev,
      pepsi: { ...prev.pepsi, prev_stock: lastEntry.pepsi.current_stock },
      sevenup: { ...prev.sevenup, prev_stock: lastEntry.sevenup.current_stock },
      dew: { ...prev.dew, prev_stock: lastEntry.dew.current_stock },
      citrus: { ...prev.citrus, prev_stock: lastEntry.citrus.current_stock },
      pepsi_diet: { ...prev.pepsi_diet, prev_stock: lastEntry.pepsi_diet.current_stock },
      sevenup_diet: { ...prev.sevenup_diet, prev_stock: lastEntry.sevenup_diet.current_stock },
      dew_diet: { ...prev.dew_diet, prev_stock: lastEntry.dew_diet.current_stock },
      citrus_diet: { ...prev.citrus_diet, prev_stock: lastEntry.citrus_diet.current_stock },
    }));

    if (!silent) {
      onShowToast(`✅ تم جلب المتبقي الفعلي من تاريخ ${lastEntry.date} وتعبئته كمخزون سابق`);
    }
  };

  // Find yesterday's/latest ending stock for a drink
  const getExpectedBeforeShipment = (drinkId: DrinkId) => {
    if (history.length === 0) return 0;
    const branchHistory = history
      .filter((h) => h.branch === selectedBranch && h.date < selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    if (branchHistory.length === 0) return 0;
    return (branchHistory[0][drinkId] as DrinkItemState)?.current_stock || 0;
  };

  // Get stats for a drink for UI display
  const getUIStatsForDrink = (drinkId: DrinkId) => {
    const item = form[drinkId] as DrinkItemState || { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 };
    const price = prices[drinkId] || 2.5;
    const arrived_cans = (item.arrived_cartons || 0) * 24;
    const expected_before = getExpectedBeforeShipment(drinkId);

    if (dayType === "normal") {
      const total_stock = expected_before;
      const expected_stock = Math.max(0, total_stock - (item.sold_cashier || 0));
      return {
        arrived_cans: 0,
        total_stock,
        expected_stock,
        variance: 0,
        variance_money: 0,
        displayPrevStock: expected_before,
        physical_leftover: expected_before
      };
    } else {
      const physical_leftover = item.prev_stock || 0;
      const total_stock = physical_leftover + arrived_cans;
      const expected_stock = Math.max(0, total_stock - (item.sold_cashier || 0));
      const variance = physical_leftover - expected_before;
      const variance_money = variance * price;

      return {
        arrived_cans,
        total_stock,
        expected_stock,
        variance,
        variance_money,
        displayPrevStock: expected_before,
        physical_leftover
      };
    }
  };

  // Compile final form state to save to server
  const getFormForSaving = () => {
    const finalForm = { ...form };
    if (dayType === "normal") {
      DRINK_METADATA.forEach((prod) => {
        const item = finalForm[prod.id] as DrinkItemState;
        const expected_before = getExpectedBeforeShipment(prod.id);
        finalForm[prod.id] = {
          prev_stock: expected_before,
          arrived_cartons: 0,
          sold_cashier: item.sold_cashier || 0,
          current_stock: Math.max(0, expected_before - (item.sold_cashier || 0))
        };
      });
    } else {
      DRINK_METADATA.forEach((prod) => {
        const item = finalForm[prod.id] as DrinkItemState;
        const expected_before = getExpectedBeforeShipment(prod.id);
        const physical_leftover = item.prev_stock || 0;
        const arrived_cans = (item.arrived_cartons || 0) * 24;
        finalForm[prod.id] = {
          prev_stock: expected_before,
          arrived_cartons: item.arrived_cartons || 0,
          sold_cashier: item.sold_cashier || 0,
          current_stock: Math.max(0, physical_leftover + arrived_cans - (item.sold_cashier || 0))
        };
      });
    }
    return finalForm;
  };

  // Reconstruct form state when loading a record for editing
  const loadEntryIntoForm = (entry: DrinksEntry) => {
    const hasArrival = DRINK_METADATA.some(p => {
      const it = entry[p.id] as DrinkItemState;
      return it && (it.arrived_cartons || 0) > 0;
    });

    const loadedForm = { ...entry };
    if (hasArrival) {
      DRINK_METADATA.forEach((prod) => {
        const item = entry[prod.id] as DrinkItemState;
        if (item) {
          const arrived_cans = (item.arrived_cartons || 0) * 24;
          const physical_leftover = (item.current_stock || 0) - arrived_cans + (item.sold_cashier || 0);
          loadedForm[prod.id] = {
            ...item,
            prev_stock: Math.max(0, physical_leftover)
          };
        }
      });
    } else {
      DRINK_METADATA.forEach((prod) => {
        const item = entry[prod.id] as DrinkItemState;
        if (item) {
          loadedForm[prod.id] = {
            ...item,
            prev_stock: item.prev_stock || 0
          };
        }
      });
    }
    setForm(loadedForm);
    setSelectedDate(entry.date);
    setSelectedBranch(entry.branch);
    setDayType(hasArrival ? "shipment" : "normal");
    setActiveSubTab("form");
    onShowToast(`📝 تم تحميل السجل لفرع ${entry.branch} بتاريخ ${entry.date} لنموذج التعديل`);
  };

  // Trigger auto-fill on day type shift to normal, or when changing date/branch in normal day mode
  useEffect(() => {
    if (history.length > 0) {
      if (dayType === "normal") {
        setForm((prev) => {
          const updated = { ...prev };
          DRINK_METADATA.forEach((prod) => {
            updated[prod.id] = {
              ...updated[prod.id],
              prev_stock: getExpectedBeforeShipment(prod.id)
            };
          });
          return updated;
        });
      } else {
        setForm((prev) => {
          const updated = { ...prev };
          DRINK_METADATA.forEach((prod) => {
            if (updated[prod.id]?.prev_stock === 0) {
              updated[prod.id] = {
                ...updated[prod.id],
                prev_stock: getExpectedBeforeShipment(prod.id)
              };
            }
          });
          return updated;
        });
      }
    }
  }, [dayType, selectedDate, selectedBranch, history]);

  const handleInputChange = (drinkId: DrinkId, field: keyof DrinkItemState, val: number) => {
    setForm((prev) => {
      const currentItem = prev[drinkId] as DrinkItemState;
      return {
        ...prev,
        [drinkId]: {
          ...currentItem,
          [field]: isNaN(val) ? 0 : val
        }
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const finalForm = getFormForSaving();

    try {
      const res = await fetch("/api/drinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalForm)
      });

      if (res.ok) {
        onShowToast("✅ تم حفظ تقرير مطابقة المشروبات بنجاح");
        await loadHistory();
        setActiveSubTab("history");
      } else {
        const errData = await res.json().catch(() => ({ error: "خطأ غير معروف في الخادم" }));
        onShowToast(`❌ فشل الحفظ: ${errData.error || "خطأ غير معروف"}`);
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء حفظ التقرير");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (drinkId: DrinkId, val: number) => {
    setPrices((prev) => ({
      ...prev,
      [drinkId]: isNaN(val) || val <= 0 ? 0 : val
    }));
  };

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== "مدير") {
      onShowToast("⚠️ عذراً، تعديل أسعار المنتجات متاح فقط للمدير");
      return;
    }
    setSavingPrices(true);
    try {
      const res = await fetch("/api/drinks/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prices)
      });
      if (res.ok) {
        onShowToast("✅ تم تحديث أسعار المنتجات بنجاح في النظام");
        setActiveSubTab("form");
      } else {
        onShowToast("❌ فشل حفظ أسعار المشروبات الجديدة");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء حفظ الأسعار");
    } finally {
      setSavingPrices(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك بحذف هذا السجل نهائياً؟")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/drinks/${id}`, { method: "DELETE" });
      if (res.ok) {
        onShowToast("✅ تم حذف السجل بنجاح");
        loadHistory();
      } else {
        onShowToast("❌ فشل حذف السجل");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء حذف السجل");
    } finally {
      setLoading(false);
    }
  };

  // Calculations for a specific drink item
  const calcDrinkStats = (state: DrinkItemState, price: number) => {
    const arrived_cans = (state.arrived_cartons || 0) * 24;
    const total_stock = (state.prev_stock || 0) + arrived_cans;
    const expected_stock = Math.max(0, total_stock - (state.sold_cashier || 0));
    const variance = (state.current_stock || 0) - expected_stock;
    const variance_money = variance * price;

    return {
      arrived_cans,
      total_stock,
      expected_stock,
      variance,
      variance_money
    };
  };

  // Compile totals for the current form
  const totalStats = DRINK_METADATA.reduce(
    (acc, prod) => {
      const itemState = form[prod.id] as DrinkItemState || { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 };
      const stats = getUIStatsForDrink(prod.id);
      
      acc.totalArrivedCans += stats.arrived_cans;
      acc.totalSoldCashier += itemState.sold_cashier || 0;
      acc.totalSoldMoney += (itemState.sold_cashier || 0) * (prices[prod.id] || 2.5);
      acc.totalVarianceCans += stats.variance;
      acc.totalVarianceMoney += stats.variance_money;

      return acc;
    },
    {
      totalArrivedCans: 0,
      totalSoldCashier: 0,
      totalSoldMoney: 0,
      totalVarianceCans: 0,
      totalVarianceMoney: 0
    }
  );

  const filteredHistory = history.filter((h) => {
    if (historyFilterBranch === "الكل") return true;
    return h.branch === historyFilterBranch;
  });

  // ==================== REPORT LOGIC ====================
  // Helper to check if a day is a shipment day
  const isShipmentRecord = (h: DrinksEntry) => {
    return DRINK_METADATA.some(prod => {
      const state = h[prod.id] as DrinkItemState;
      return state && (state.arrived_cartons || 0) > 0;
    });
  };

  // Filter history by selected branch and sort ascending by date for range calculations
  const branchHistoryAsc = history
    .filter((h) => h.branch === reportBranch)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Get shipment records for the selected branch (newest first)
  const shipmentRecordsDesc = history
    .filter((h) => h.branch === reportBranch && isShipmentRecord(h))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Determine report range records
  let reportRecords: DrinksEntry[] = [];
  let reportSubtitle = "";

  if (reportType === "day") {
    reportRecords = branchHistoryAsc.filter(h => h.date === reportSingleDate);
    reportSubtitle = `مطابقة يوم ${reportSingleDate}`;
  } else if (reportType === "range") {
    reportRecords = branchHistoryAsc.filter(h => h.date >= reportStartDate && h.date <= reportEndDate);
    reportSubtitle = `الفترة من ${reportStartDate} إلى ${reportEndDate}`;
  } else if (reportType === "last_shipment" && shipmentRecordsDesc.length > 0) {
    const lastShipment = shipmentRecordsDesc[0];
    reportRecords = branchHistoryAsc.filter(h => h.date >= lastShipment.date);
    reportSubtitle = `منذ آخر طلبية بتاريخ ${lastShipment.date}`;
  } else if (reportType === "last_2_shipments" && shipmentRecordsDesc.length > 0) {
    const index = Math.min(1, shipmentRecordsDesc.length - 1);
    const targetShipment = shipmentRecordsDesc[index];
    reportRecords = branchHistoryAsc.filter(h => h.date >= targetShipment.date);
    reportSubtitle = `منذ آخر طلبيتين (الطلب الأقدم بتاريخ ${targetShipment.date})`;
  } else if (reportType === "last_3_shipments" && shipmentRecordsDesc.length > 0) {
    const index = Math.min(2, shipmentRecordsDesc.length - 1);
    const targetShipment = shipmentRecordsDesc[index];
    reportRecords = branchHistoryAsc.filter(h => h.date >= targetShipment.date);
    reportSubtitle = `منذ آخر 3 طلبيات (الطلب الأقدم بتاريخ ${targetShipment.date})`;
  }

  // Calculate compiled report stats for each product
  const reportCalculations = DRINK_METADATA.map((prod) => {
    const price = prices[prod.id] || 2.5;
    if (reportRecords.length === 0) {
      return {
        id: prod.id,
        name: prod.name,
        price,
        startingStock: 0,
        totalArrivedCans: 0,
        totalSold: 0,
        endingStock: 0,
        expectedEndingStock: 0,
        variance: 0,
        varianceMoney: 0,
        shipmentsList: []
      };
    }

    // Sort records in range by date ascending
    const rangeRecordsSorted = [...reportRecords].sort((a, b) => a.date.localeCompare(b.date));
    const firstRecord = rangeRecordsSorted[0];
    const lastRecord = rangeRecordsSorted[rangeRecordsSorted.length - 1];

    // Starting stock: if the first record is a shipment record, starting stock is the physical leftover before shipment.
    // Otherwise, it is just the prev_stock.
    const firstState = firstRecord[prod.id] as DrinkItemState;
    const firstArrivedCans = (firstState?.arrived_cartons || 0) * 24;
    const startingStock = firstArrivedCans > 0
      ? Math.max(0, (firstState?.current_stock || 0) - firstArrivedCans + (firstState?.sold_cashier || 0))
      : (firstState?.prev_stock || 0);

    // Sum up all arrived shipment quantities during this period
    let totalArrivedCans = 0;
    const shipmentsList: { date: string; prevBeforeShipment: number; arrivedCartons: number; arrivedCans: number }[] = [];

    rangeRecordsSorted.forEach(r => {
      const state = r[prod.id] as DrinkItemState;
      if (state && (state.arrived_cartons || 0) > 0) {
        const cans = (state.arrived_cartons || 0) * 24;
        totalArrivedCans += cans;
        // Reconstruct physical leftover before shipment
        const physical_leftover = (state.current_stock || 0) - cans + (state.sold_cashier || 0);
        shipmentsList.push({
          date: r.date,
          prevBeforeShipment: Math.max(0, physical_leftover),
          arrivedCartons: state.arrived_cartons,
          arrivedCans: cans
        });
      }
    });

    // Sum up total sold during this period
    const totalSold = rangeRecordsSorted.reduce((sum, r) => sum + ((r[prod.id] as DrinkItemState)?.sold_cashier || 0), 0);

    // Latest actual ending stock
    const endingStock = (lastRecord[prod.id] as DrinkItemState)?.current_stock || 0;

    // Expected remaining stock: Starting stock + Total arrived - Total sold
    const expectedEndingStock = Math.max(0, startingStock + totalArrivedCans - totalSold);

    // Variance: actual physical ending stock - expected stock
    const variance = endingStock - expectedEndingStock;
    const varianceMoney = variance * price;

    return {
      id: prod.id,
      name: prod.name,
      price,
      startingStock,
      totalArrivedCans,
      totalSold,
      endingStock,
      expectedEndingStock,
      variance,
      varianceMoney,
      shipmentsList
    };
  });

  // Aggregated totals for the report
  const reportTotals = reportCalculations.reduce(
    (acc, item) => {
      acc.totalSoldCans += item.totalSold;
      acc.totalSoldValue += item.totalSold * item.price;
      acc.totalArrivedCans += item.totalArrivedCans;
      acc.totalVarianceCans += item.variance;
      acc.totalVarianceValue += item.varianceMoney;
      return acc;
    },
    { totalSoldCans: 0, totalSoldValue: 0, totalArrivedCans: 0, totalVarianceCans: 0, totalVarianceValue: 0 }
  );

  // Copy report summary to clipboard for the cashier
  const handleCopyReport = () => {
    let text = `📋 *محضر مطابقة وجرد عجز المشروبات والصودا*\n`;
    text += `🏢 *الفرع:* فرع ${reportBranch}\n`;
    text += `⏱️ *نطاق التقرير:* ${reportSubtitle}\n`;
    text += `📅 *تاريخ التوليد:* ${new Date().toLocaleDateString("ar-SA")}\n`;
    text += `-------------------------------------------\n\n`;

    reportCalculations.forEach((item) => {
      if (item.totalSold > 0 || item.variance !== 0) {
        text += `🔹 *${item.name}:*\n`;
        text += `   - المخزون الابتدائي بالفترة: ${item.startingStock} حبة\n`;
        if (item.totalArrivedCans > 0) {
          text += `   - إجمالي التوريد الجديد: ${item.totalArrivedCans} حبة\n`;
        }
        text += `   - إجمالي مبيعات الكاشير: ${item.totalSold} حبة\n`;
        text += `   - المتبقي الفعلي الأخير: ${item.endingStock} حبة\n`;
        text += `   - المتبقي المتوقع دفترياً: ${item.expectedEndingStock} hبة\n`;
        
        if (item.variance === 0) {
          text += `   - الحالة: ✅ مطابق تماماً\n`;
        } else if (item.variance < 0) {
          text += `   - العجز: ⚠️ ${Math.abs(item.variance)} علبة (خسارة مادية: ${Math.abs(item.varianceMoney).toFixed(2)} ر.س)\n`;
        } else {
          text += `   - الفائض: ➕ +${item.variance} علبة (قيمة: +${item.varianceMoney.toFixed(2)} ر.س)\n`;
        }
        text += `\n`;
      }
    });

    text += `-------------------------------------------\n`;
    text += `📊 *الخلاصة الإجمالية للمطابقة:*\n`;
    text += `🔸 إجمالي مبيعات المشروبات: ${reportTotals.totalSoldCans} علبة بقيمة ${reportTotals.totalSoldValue.toFixed(2)} ر.س\n`;
    if (reportTotals.totalVarianceValue < 0) {
      text += `🚨 *عجز مالي مستحق السداد:* ${Math.abs(reportTotals.totalVarianceValue).toFixed(2)} ر.س (${Math.abs(reportTotals.totalVarianceCans)} علبة عجز)\n`;
      text += `⚠️ يرجى من الكاشير المسؤول تسوية العجز المذكور أعلاه لتجنب الخصومات.\n`;
    } else if (reportTotals.totalVarianceValue > 0) {
      text += `📈 *فائض مالي مرصود:* +${reportTotals.totalVarianceValue.toFixed(2)} ر.س\n`;
    } else {
      text += `✅ *جرد مطابق وسليم 100%*\n`;
    }

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    onShowToast("📋 تم نسخ المحضر المالي بنجاح بصيغة WhatsApp لإرساله للكاشير");
    setTimeout(() => setCopiedReport(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6" id="drinks-tab-container" dir="rtl">
      {/* Header controls Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-blue-50 rounded-xl text-blue-600">
              <CupSoda className="w-6 h-6" />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-800">ضبط وجرد مطابقة المشروبات</h2>
              <p className="text-xs text-slate-400 mt-0.5">مراقبة دقيقة لعجز المشروبات والصودا بشكل مستقل ومباشر وحساب الطلبيات</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSubTab("form")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "form"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              نموذج الضبط والمطابقة
            </button>
            <button
              onClick={() => setActiveSubTab("report")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "report"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-indigo-50/50"
              }`}
            >
              <FileText className="w-4 h-4" />
              تقرير عجز الكاشير التفصيلي 📊
            </button>
            <button
              onClick={() => {
                setActiveSubTab("history");
                loadHistory();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "history"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <History className="w-4 h-4" />
              سجل ومطابقات المشروبات السابقة ({history.length})
            </button>
            <button
              onClick={() => setActiveSubTab("prices")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "prices"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Settings2 className="w-4 h-4" />
              تعديل أسعار السلع ({DRINK_METADATA.length})
            </button>
          </div>
        </div>
      </div>

      {/* ==================== SUB-TAB: FORM ==================== */}
      {activeSubTab === "form" && (
        <form onSubmit={handleSave} className="space-y-6 no-print">
          {/* Controls bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">تاريخ المطابقة</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">الفرع المستهدف</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value as "القادسية" | "المروج")}
                  disabled={!!userBranch && userBranch !== "الكل"}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="القادسية">فرع القادسية</option>
                  <option value="المروج">فرع المروج</option>
                </select>
              </div>

              {/* Day Type Selector based on user request: normal day (only sales, no opening input) vs shipment delivery day */}
              <div className="md:col-span-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">نوع اليوم وجدول التوريد</label>
                <div className="grid grid-cols-2 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setDayType("normal")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      dayType === "normal"
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    يوم عادي (مبيعات فقط)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayType("shipment")}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                      dayType === "shipment"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    يوم وصول طلبية جديدة
                  </button>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => loadHistory()}
                  className="flex items-center justify-center p-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded-xl text-xs transition-all cursor-pointer"
                  title="تحديث البيانات"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Explanatory helper message according to user request */}
            <div className="mt-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-start gap-3">
              <InfoIcon className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-slate-300">
                {dayType === "normal" ? (
                  <span>
                    💡 <strong>يوم عمل عادي (مبيعات فقط):</strong> لا يطلب منك إدخال رصيد البداية الافتتاحي يدوياً. يتم سحبه وتوريثه تلقائياً من المتبقي الفعلي ليوم أمس لضمان دقة واستمرارية المخزن. فقط أدخل <strong>مبيعات الكاشير</strong> والمخزون يتناقص تلقائياً.
                  </span>
                ) : (
                  <span>
                    🚚 <strong>يوم توريد بضاعة جديدة (إغلاق الدورة والمطابقة):</strong> نقوم بحساب <strong>المتبقي الفعلي قبل تنزيل البضاعة</strong> (جرد الثلاجة والمستودع قبل إنزال الشحنة)، ثم ندخل <strong>الدفعة الجديدة الموردة (بالكرتون)</strong> لتحديث المخزون ومقارنته بالمخزون الدفتري لحساب العجز.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Form cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {DRINK_METADATA.map((prod) => {
              const itemState = form[prod.id] as DrinkItemState || { prev_stock: 0, arrived_cartons: 0, sold_cashier: 0, current_stock: 0 };
              const price = prices[prod.id] || 2.5;
              const stats = getUIStatsForDrink(prod.id);

              return (
                <div 
                  key={prod.id}
                  className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all flex flex-col overflow-hidden"
                >
                  {/* Card Header */}
                  <div className={`p-4 border-b border-slate-50 flex items-center justify-between ${prod.color.split(" ")[1]} ${prod.color.split(" ")[0]} border-t-4`}>
                    <span className="font-extrabold text-sm text-slate-800">{prod.name}</span>
                    <span className="text-[10px] font-black bg-white/80 backdrop-blur-xs border px-2 py-1 rounded-md text-slate-700">
                      السعر: {price.toFixed(2)} ر.س
                    </span>
                  </div>

                  {/* Input Fields based on the selected Day Type */}
                  <div className="p-4 space-y-4 flex-1">
                    {dayType === "normal" ? (
                      // Normal Day fields: Display Opening balance from yesterday as read-only
                      <div className="bg-indigo-50/30 p-3 rounded-xl border border-indigo-100/50 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-indigo-900">الرصيد الافتتاحي المنقول (حبة)</label>
                          <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">تلقائي</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-sm font-black text-indigo-950">{stats.displayPrevStock} علبة</span>
                          <button
                            type="button"
                            onClick={() => {
                              const expected = getExpectedBeforeShipment(prod.id);
                              handleInputChange(prod.id, "prev_stock", expected);
                              onShowToast(`🔄 تم تحديث الرصيد المنقول لـ ${prod.name}`);
                            }}
                            className="text-[9px] bg-indigo-600 hover:bg-indigo-750 text-white font-bold px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
                            title="سحب المتبقي الفعلي من السجلات يدوياً"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            تحديث
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Shipment Day fields (Before Shipment actual stock + Shipment cartons)
                      <div className="space-y-4">
                        <div className="bg-amber-50/20 p-2.5 rounded-lg border border-amber-100/50 space-y-3">
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-black text-amber-800">1. المتبقي الفعلي قبل الشحنة (حبة)</label>
                              <span className="text-[9px] text-amber-600 font-bold">جرد الثلاجة</span>
                            </div>
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                value={itemState.prev_stock || ""}
                                onChange={(e) => handleInputChange(prod.id, "prev_stock", parseInt(e.target.value))}
                                placeholder="0"
                                className="w-full text-center bg-white border border-amber-200 text-amber-900 rounded-lg py-1.5 text-xs font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const expected = getExpectedBeforeShipment(prod.id);
                                  handleInputChange(prod.id, "prev_stock", expected);
                                  onShowToast(`🔄 تم جلب المتبقي المتوقع لـ ${prod.name}`);
                                }}
                                className="absolute left-1.5 top-1.5 text-[8px] bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded transition-all"
                                title="جلب متبقي الأمس المتوقع وجعله القيمة الافتراضية"
                              >
                                جلب المتوقع
                              </button>
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="text-[10px] font-black text-emerald-800">2. الشحنة الجديدة الواردة (كرتون)</label>
                              <span className="text-[9px] text-emerald-600 font-bold">+{stats.arrived_cans} علبة</span>
                            </div>
                            <input
                              type="number"
                              min="0"
                              value={itemState.arrived_cartons || ""}
                              onChange={(e) => handleInputChange(prod.id, "arrived_cartons", parseInt(e.target.value))}
                              placeholder="0"
                              className="w-full text-center bg-white border border-emerald-200 text-emerald-900 rounded-lg py-1.5 text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Daily Sales (Always Required) */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-slate-700">3. المبيعات اليومية من الكاشير (حبة)</label>
                        <span className="text-[9px] text-slate-400">تقرير المبيعات</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={itemState.sold_cashier || ""}
                        onChange={(e) => handleInputChange(prod.id, "sold_cashier", parseInt(e.target.value))}
                        placeholder="0"
                        className="w-full text-center bg-slate-50 border border-slate-200 rounded-lg py-2 text-xs font-bold focus:bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Calculated Daily Ending Stock (Always Automatic) */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black text-slate-700">4. المتبقي المتوقع نهاية اليوم (حبة)</label>
                        <span className="text-[9px] text-blue-600 font-bold">محسوب تلقائياً</span>
                      </div>
                      <div className="w-full text-center bg-slate-100 text-slate-800 border border-slate-200 rounded-lg py-2 text-xs font-bold font-mono">
                        {stats.expected_stock} حبة
                      </div>
                    </div>
                  </div>

                  {/* Individual calculations */}
                  <div className="bg-slate-50 p-4 border-t border-slate-100 text-xs space-y-1.5 font-medium text-slate-600">
                    <div className="flex justify-between">
                      <span>إجمالي رصيد اليوم:</span>
                      <span className="font-bold text-slate-800">{stats.total_stock} حبة</span>
                    </div>
                    {dayType === "shipment" && (
                      <div className="flex justify-between">
                        <span>المتبقي المتوقع قبل الشحنة:</span>
                        <span className="font-bold text-slate-800">{stats.displayPrevStock} حبة</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <span className="font-bold text-slate-700">عجز/فائض الدورة:</span>
                      {dayType === "normal" ? (
                        <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">تحديث تلقائي</span>
                      ) : stats.variance === 0 ? (
                        <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">مطابق</span>
                      ) : stats.variance < 0 ? (
                        <span className="font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px]" dir="ltr">
                          {stats.variance} علبة ({stats.variance_money.toFixed(1)} ر.س)
                        </span>
                      ) : (
                        <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px]" dir="ltr">
                          +{stats.variance} علبة (+{stats.variance_money.toFixed(1)} ر.س)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Cumulative Reconciled Calculations Summary Widget */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setIsCalculationsOpen(!isCalculationsOpen)}
              className="w-full flex items-center justify-between p-5 font-black text-sm text-slate-800 bg-slate-50/50 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>ملخص المطابقات والمساءلة والتحليل المالي اليومي</span>
              </div>
              {isCalculationsOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {isCalculationsOpen && (
              <div className="p-6 border-t border-slate-100 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1: Sales */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 mb-2">مبيعات الكاشير الإجمالية</h4>
                    <p className="text-xl font-black text-slate-800">{totalStats.totalSoldCashier} <span className="text-xs font-normal text-slate-500">حبة</span></p>
                    <p className="text-xs text-blue-600 font-bold mt-1">القيمة المحصلة التقريبية: {totalStats.totalSoldMoney.toFixed(2)} ريال</p>
                  </div>

                  {/* Column 2: Total Shortage quantity */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-500 mb-2">إجمالي عجز/فائض الكمية</h4>
                    <p className={`text-xl font-black ${totalStats.totalVarianceCans < 0 ? "text-rose-600" : totalStats.totalVarianceCans > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                      {totalStats.totalVarianceCans === 0 ? "مطابق تماماً" : `${totalStats.totalVarianceCans} حبة`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">مجموع الانحرافات الفعلية عن الدفاتر للعلب</p>
                  </div>

                  {/* Column 3: Shortage Cash value */}
                  <div className={`rounded-xl p-4 border ${
                    totalStats.totalVarianceMoney < 0 
                      ? "bg-rose-50/30 border-rose-100 text-rose-900" 
                      : totalStats.totalVarianceMoney > 0 
                        ? "bg-amber-50/30 border-amber-100 text-amber-900" 
                        : "bg-emerald-50/30 border-emerald-100 text-emerald-900"
                  }`}>
                    <h4 className="text-xs font-bold text-slate-500 mb-2">إجمالي قيمة الفارق المالي للمطابقة</h4>
                    <p className="text-xl font-black">
                      {totalStats.totalVarianceMoney.toFixed(2)} ر.س
                    </p>
                    <p className="text-xs font-bold mt-1">
                      {totalStats.totalVarianceMoney < 0 
                        ? "⚠️ يوجد عجز مالي مستحق المساءلة والتحقق" 
                        : totalStats.totalVarianceMoney > 0 
                          ? "👍 يوجد فائض مالي غير متوقع" 
                          : "✅ المطابقة سليمة 100% وبدون أي عجز مالي"}
                    </p>
                  </div>
                </div>

                {/* Additional Warning / Action guidance if there is a deficit */}
                {totalStats.totalVarianceMoney < 0 && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 items-start">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-800">تنبيه وجود عجز بمخزون المشروبات</h4>
                      <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                        يوجد فارق في جرد المشروبات مساوٍ لـ <strong className="font-extrabold">{Math.abs(totalStats.totalVarianceCans)} حبة</strong> بقيمة عجز إجمالية تبلغ <strong className="font-extrabold">{Math.abs(totalStats.totalVarianceMoney).toFixed(2)} ريال سعودي</strong>. يرجى مراجعة مبيعات الكاشير ومطابقتها للتأكد من تسجيل كافة الفواتير المصروفة للزبائن.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes and Form Submit Action */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">ملاحظات إضافية حول الجرد والمطابقة</label>
              <textarea
                value={form.notes || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="اكتب أي ملاحظات كفقد كراتين أو تلفيات في المشروبات أو مشكلة في تسجيل فواتير الكاشير هنا..."
                rows={3}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setForm(createInitialState(selectedDate, selectedBranch))}
                className="px-6 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                إعادة ضبط المدخلات
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-8 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? "جاري الحفظ..." : "حفظ المطابقة والترحيل"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ==================== SUB-TAB: REPORTS (New Advanced Feature) ==================== */}
      {activeSubTab === "report" && (
        <div className="space-y-6">
          {/* Report filters card */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 space-y-4 no-print">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-800 text-sm">تخصيص وتصدير تقارير العجز والطلبيات للكاشير</h3>
              </div>
              <p className="text-xs text-slate-400">تتبع مستمر منذ نزول الطلبية الحالية والطلبيات السابقة وحساب التراكمي</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black text-slate-500 mb-2">الفرع المستهدف</label>
                <select
                  value={reportBranch}
                  onChange={(e) => setReportBranch(e.target.value as "القادسية" | "المروج")}
                  disabled={!!userBranch && userBranch !== "الكل"}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="القادسية">فرع القادسية</option>
                  <option value="المروج">فرع المروج</option>
                </select>
              </div>

              <div className="md:col-span-4">
                <label className="block text-[10px] font-black text-slate-500 mb-2">نطاق التقرير والطلبيات</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="last_shipment">🚀 منذ آخر طلبية (حتى اليوم)</option>
                  <option value="last_2_shipments">📦 منذ آخر طلبيتين</option>
                  <option value="last_3_shipments">📦 منذ آخر 3 طلبيات</option>
                  <option value="day">📅 يوم محدد</option>
                  <option value="range">🗓️ مدى زمني مخصص (تواريخ)</option>
                </select>
              </div>

              {reportType === "day" && (
                <div className="md:col-span-5">
                  <label className="block text-[10px] font-black text-slate-500 mb-2">تاريخ اليوم</label>
                  <input
                    type="date"
                    value={reportSingleDate}
                    onChange={(e) => setReportSingleDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
              )}

              {reportType === "range" && (
                <div className="md:col-span-5 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">من تاريخ</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">إلى تاريخ</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {(reportType === "last_shipment" || reportType === "last_2_shipments" || reportType === "last_3_shipments") && (
                <div className="md:col-span-5 text-xs text-slate-500 bg-indigo-50/50 p-2 border border-indigo-100 rounded-xl flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                  <span>
                    سيقوم النظام بالبحث عن التوريدات وعرض <strong>المتبقي الفعلي السابق قبل نزول الطلبية</strong> كأرصدة بداية للفترة.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Printable / Display Report Card */}
          {reportRecords.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center no-print">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">لا توجد سجلات مطابقة مشروبات مرصودة في هذا المدى للفرع المحدد</p>
              <p className="text-xs text-slate-400 mt-1">تأكد من اختيار الفرع الصحيح أو تسجيل حركات المبيعات والجرد أولاً في نموذج الضبط.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden printable-area">
              {/* Report Document Header */}
              <div className="p-6 bg-slate-950 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black bg-indigo-600 px-2 py-0.5 rounded tracking-wider">رسمي - تقرير جرد</span>
                    <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded">فرع {reportBranch}</span>
                  </div>
                  <h3 className="text-lg font-black mt-2">محضر جرد ومطابقة عجز المشروبات</h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>نطاق المطابقة: {reportSubtitle} (شامل {reportRecords.length} يوم عمل)</span>
                  </p>
                </div>

                <div className="flex gap-2 no-print">
                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    {copiedReport ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedReport ? "تم النسخ!" : "نسخ بصيغة الواتساب"}
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة المحضر
                  </button>
                </div>
              </div>

              {/* Shipment Details and Prev Stock Before Shipment (User explicit request) */}
              <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                <h4 className="text-xs font-black text-slate-800 mb-3 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>تفاصيل كشوفات الطلبيات والمخزون السابق للطلبية المكتشفة في الفترة</span>
                </h4>

                {/* Find all shipment entries in this range */}
                {(() => {
                  const rangeShipments = reportRecords.filter(isShipmentRecord).sort((a, b) => a.date.localeCompare(b.date));
                  if (rangeShipments.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic"> لم يتم رصد أي عمليات شحن/توريد بضاعة جديدة خلال هذا المدى المحدد (بيع عادي ومطابقة من الرصيد المتوفر).</p>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {rangeShipments.map((ship, idx) => (
                        <div key={ship.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-2xs space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                            <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              شحنة رقم #{idx + 1}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded">{ship.date}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-[11px]">
                            {/* Showing actual leftover before shipment was unloaded */}
                            <div>
                              <span className="block text-amber-800 font-extrabold mb-1 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">📦 المتبقي الفعلي بالفرع قبل تنزيل الشحنة:</span>
                              <div className="space-y-0.5 font-medium text-slate-600 pr-1">
                                {DRINK_METADATA.map(p => {
                                  const st = ship[p.id] as DrinkItemState;
                                  if (!st) return null;
                                  return (
                                    <div key={p.id} className="flex justify-between">
                                      <span>{p.name}:</span>
                                      <span className="font-bold text-slate-800">{st.prev_stock || 0} علبة</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Showing incoming cartons/cans */}
                            <div>
                              <span className="block text-emerald-800 font-extrabold mb-1 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">🚚 الكمية الجديدة الموردة بالشحنة:</span>
                              <div className="space-y-0.5 font-medium text-slate-600 pr-1">
                                {DRINK_METADATA.map(p => {
                                  const st = ship[p.id] as DrinkItemState;
                                  if (!st || !st.arrived_cartons) return null;
                                  return (
                                    <div key={p.id} className="flex justify-between">
                                      <span>{p.name}:</span>
                                      <span className="font-bold text-emerald-700">+{st.arrived_cartons} كرتون ({st.arrived_cartons * 24} حبة)</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Advanced Reconciliation Table */}
              <div className="p-6 overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-100 text-slate-400">
                      <th className="py-3 px-4 font-black">المنتج والمشروب</th>
                      <th className="py-3 px-4 font-black text-center bg-indigo-50/40 text-indigo-900 rounded-t-lg">الرصيد الافتتاحي للفترة</th>
                      <th className="py-3 px-4 font-black text-center text-emerald-800 bg-emerald-50/40">إجمالي الوارد (علبة)</th>
                      <th className="py-3 px-4 font-black text-center text-slate-800">إجمالي مبيعات الكاشير</th>
                      <th className="py-3 px-4 font-black text-center text-slate-500 bg-slate-50">المتبقي المتوقع</th>
                      <th className="py-3 px-4 font-black text-center text-blue-800 bg-blue-50/40">المتبقي الفعلي جرد نهاية الفترة</th>
                      <th className="py-3 px-4 font-black text-center text-slate-700">العجز/الفائض الإجمالي</th>
                      <th className="py-3 px-4 font-black text-center text-slate-400">سعر الحبة</th>
                      <th className="py-3 px-4 font-black text-left text-slate-800 rounded-t-lg">الفارق المالي المستحق</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                    {reportCalculations.map((item) => {
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-extrabold text-slate-900">{item.name}</td>
                          <td className="py-3 px-4 text-center bg-indigo-50/20 text-indigo-950 font-bold">{item.startingStock} حبة</td>
                          <td className="py-3 px-4 text-center text-emerald-800 font-bold bg-emerald-50/20">
                            {item.totalArrivedCans > 0 ? `+${item.totalArrivedCans}` : "-"}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-800">{item.totalSold} حبة</td>
                          <td className="py-3 px-4 text-center bg-slate-50 text-slate-700 font-bold">{item.expectedEndingStock} حبة</td>
                          <td className="py-3 px-4 text-center bg-blue-50/10 text-blue-900 font-bold">{item.endingStock} حبة</td>
                          <td className="py-3 px-4 text-center">
                            {item.variance === 0 ? (
                              <span className="text-emerald-600 font-black">مطابق ✅</span>
                            ) : item.variance < 0 ? (
                              <span className="text-rose-600 font-black bg-rose-50 px-2 py-0.5 rounded" dir="ltr">
                                {item.variance} علبة
                              </span>
                            ) : (
                              <span className="text-amber-600 font-black bg-amber-50 px-2 py-0.5 rounded" dir="ltr">
                                +{item.variance} علبة
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-400 font-bold">{item.price.toFixed(2)} ر.س</td>
                          <td className={`py-3 px-4 text-left font-black ${
                            item.varianceMoney < 0 ? "text-rose-600" : item.varianceMoney > 0 ? "text-amber-600" : "text-emerald-600"
                          }`}>
                            {item.varianceMoney.toFixed(2)} ر.س
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Accountant Verdict and Accountability Receipt */}
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">الذمة المالية والمطالبة المستحقة على كاشير الوردية</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">الملخص القانوني للجرد وتعديل العجز المكتشف</p>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold">حالة الوردية الإجمالية:</span>
                      <div className="mt-0.5">
                        {reportTotals.totalVarianceValue < 0 ? (
                          <span className="px-3 py-1 bg-rose-100 text-rose-800 rounded-lg text-xs font-black">🚨 عجز مالي قيد المساءلة</span>
                        ) : reportTotals.totalVarianceValue > 0 ? (
                          <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-black">📈 فائض بالمخزن</span>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-black">✅ مطابقة تامة وسليمة</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="block text-[10px] text-slate-400 font-bold">إجمالي المبيعات المحتسبة:</span>
                      <span className="text-sm font-black text-slate-800 mt-1 block">{reportTotals.totalSoldCans} حبة</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="block text-[10px] text-slate-400 font-bold">القيمة المالية للمبيعات:</span>
                      <span className="text-sm font-black text-slate-800 mt-1 block">{reportTotals.totalSoldValue.toFixed(2)} ر.س</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="block text-[10px] text-slate-400 font-bold">العجز الإجمالي المكتشف:</span>
                      <span className={`text-sm font-black mt-1 block ${reportTotals.totalVarianceCans < 0 ? "text-rose-600" : "text-slate-800"}`}>
                        {reportTotals.totalVarianceCans === 0 ? "لا يوجد عجز" : `${Math.abs(reportTotals.totalVarianceCans)} علبة`}
                      </span>
                    </div>

                    <div className={`p-3 rounded-lg border ${
                      reportTotals.totalVarianceValue < 0 ? "bg-rose-50 border-rose-100 text-rose-900" : "bg-emerald-50 border-emerald-100 text-emerald-900"
                    }`}>
                      <span className="block text-[10px] text-slate-500 font-bold">قيمة فارق الجرد والتعويض:</span>
                      <span className="text-sm font-black mt-1 block">
                        {reportTotals.totalVarianceValue.toFixed(2)} ر.س
                      </span>
                    </div>
                  </div>

                  {/* Cashier signature box for paper printing */}
                  <div className="pt-6 border-t border-slate-100 grid grid-cols-2 gap-8 text-center text-xs">
                    <div>
                      <p className="font-bold text-slate-400">إمضاء الكاشير المسؤول والمطابق</p>
                      <div className="mt-8 border-b border-dashed border-slate-300 w-48 mx-auto py-2"></div>
                    </div>
                    <div>
                      <p className="font-bold text-slate-400">اعتماد إدارة الفرع والمدقق</p>
                      <div className="mt-8 border-b border-dashed border-slate-300 w-48 mx-auto py-2"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== SUB-TAB: HISTORY ==================== */}
      {activeSubTab === "history" && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 space-y-6 no-print">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-black text-slate-800 text-sm">سجلات الضبط والمطابقات المخزنة</h3>
              <p className="text-xs text-slate-400 mt-1">تصفح ومراجعة ومتابعة عجز المشروبات حسب الفرع والتواريخ</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">تصفية حسب الفرع:</span>
              <select
                value={historyFilterBranch}
                onChange={(e) => setHistoryFilterBranch(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
              >
                <option value="الكل">جميع الفروع</option>
                <option value="القادسية">فرع القادسية</option>
                <option value="المروج">فرع المروج</option>
              </select>
            </div>
          </div>

          {/* Loading spinner */}
          {loading && history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs text-slate-400 font-bold">جاري تحميل سجل مطابقة المشروبات...</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <CupSoda className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-500">لا يوجد سجلات ضبط مشروبات مسجلة حالياً</p>
              <p className="text-xs text-slate-400 mt-1">ابدأ بملء نموذج مطابقة الصودا اليومي وحفظه لإظهاره هنا</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="py-3 px-4 font-black">التاريخ</th>
                    <th className="py-3 px-4 font-black">الفرع</th>
                    <th className="py-3 px-4 font-black">حالة التوريد</th>
                    <th className="py-3 px-4 font-black">السلع الخاضعة للضبط</th>
                    <th className="py-3 px-4 font-black text-center">إجمالي المبيعات</th>
                    <th className="py-3 px-4 font-black text-center">العجز الإجمالي (علب)</th>
                    <th className="py-3 px-4 font-black text-center">العجز الإجمالي (مالي)</th>
                    <th className="py-3 px-4 font-black text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium text-slate-700">
                  {filteredHistory.map((h) => {
                    const hasArrival = DRINK_METADATA.some(p => {
                      const it = h[p.id] as DrinkItemState;
                      return it && (it.arrived_cartons || 0) > 0;
                    });

                    // Compute combined metrics for this history row
                    const metrics = DRINK_METADATA.reduce(
                      (acc, prod) => {
                        const itemState = h[prod.id] as DrinkItemState;
                        if (!itemState) return acc;
                        const price = prices[prod.id] || 2.5;
                        const stats = calcDrinkStats(itemState, price);
                        
                        acc.soldCashier += itemState.sold_cashier || 0;
                        acc.varianceCans += stats.variance;
                        acc.varianceMoney += stats.variance_money;

                        return acc;
                      },
                      { soldCashier: 0, varianceCans: 0, varianceMoney: 0 }
                    );

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{h.date}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                            h.branch === "القادسية" 
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100" 
                              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          }`}>
                            {h.branch}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {hasArrival ? (
                            <span className="inline-block px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 rounded text-[10px] font-bold">
                              🚚 شحنة جديدة
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[10px]">
                              بيع عادي
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[10px] text-slate-500 max-w-xs truncate">
                          {DRINK_METADATA.map((p) => {
                            const it = h[p.id] as DrinkItemState;
                            if (!it || !it.sold_cashier) return null;
                            return `${p.name} (${it.sold_cashier})`;
                          }).filter(Boolean).join(" • ")}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">{metrics.soldCashier} علبة</td>
                        <td className={`py-3.5 px-4 text-center font-bold ${
                          metrics.varianceCans < 0 ? "text-rose-600" : metrics.varianceCans > 0 ? "text-amber-600" : "text-emerald-600"
                        }`}>
                          {metrics.varianceCans === 0 ? "مطابق" : `${metrics.varianceCans} علبة`}
                        </td>
                        <td className={`py-3.5 px-4 text-center font-bold ${
                          metrics.varianceMoney < 0 ? "text-rose-600" : metrics.varianceMoney > 0 ? "text-amber-600" : "text-emerald-600"
                        }`}>
                          {metrics.varianceMoney.toFixed(2)} ر.س
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Trash action for directors only */}
                            {userRole === "مدير" && (
                              <button
                                onClick={() => handleDelete(h.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                title="حذف السجل"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                // Populate to active form to view/edit using the robust helper function
                                loadEntryIntoForm(h);
                                setDayType(hasArrival ? "shipment" : "normal");
                                setActiveSubTab("form");
                                onShowToast(`📝 تم تحميل السجل لفرع ${h.branch} بتاريخ ${h.date} لنموذج التعديل`);
                              }}
                              className="p-1 text-blue-500 hover:text-blue-700 transition-colors text-[10px] font-bold cursor-pointer"
                            >
                              عرض وتعديل
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
      )}

      {/* ==================== SUB-TAB: PRICES ==================== */}
      {activeSubTab === "prices" && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 space-y-6 no-print">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-800 text-sm">تعديل وضبط أسعار بيع المشروبات</h3>
              <p className="text-xs text-slate-400 mt-1">تحديد أسعار علب الصودا والمشروبات لاعتمادها في حساب العجز المالي</p>
            </div>
            
            <button
              onClick={fetchPrices}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
              title="تحديث الأسعار الحالية"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {userRole !== "مدير" && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs font-bold leading-relaxed flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                تنبيه صلاحيات: تعديل أسعار المشروبات والسلع متاح فقط لحساب المدير العام. يمكنك استعراض الأسعار الحالية والنشطة فقط هنا دون تعديلها.
              </div>
            </div>
          )}

          <form onSubmit={handleSavePrices} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {DRINK_METADATA.map((prod) => {
                const currentPrice = prices[prod.id] ?? 2.5;
                return (
                  <div 
                    key={prod.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3"
                  >
                    <label className="block text-xs font-bold text-slate-700">{prod.name}</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        disabled={userRole !== "مدير"}
                        value={currentPrice}
                        onChange={(e) => handlePriceChange(prod.id, parseFloat(e.target.value))}
                        className="w-full text-center bg-white border border-slate-200 rounded-lg py-2 pl-12 pr-4 text-xs font-bold focus:ring-1 focus:ring-blue-500 focus:outline-none disabled:opacity-60 disabled:bg-slate-100"
                        required
                      />
                      <span className="absolute left-3 top-2.5 text-[9px] font-black text-slate-400">ر.س</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {userRole === "مدير" && (
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingPrices}
                  className="flex items-center gap-1.5 px-8 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {savingPrices ? "جاري الحفظ..." : "حفظ وتثبيت الأسعار الجديدة"}
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
