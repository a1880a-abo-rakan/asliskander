import React, { useState, useEffect } from "react";
import { DailyEntry, TaxInvoice } from "../types";
import { BarChart3, Calendar, FileText, Download, Building2, TrendingDown, HelpCircle, CheckCircle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AslIskanderLogoSymbol } from "./AslIskanderLogo";

interface ReportsTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
}

export default function ReportsTab({ onShowToast, userRole }: ReportsTabProps) {
  const [reportMode, setReportMode] = useState<"day" | "range">(() => {
    const saved = sessionStorage.getItem("app_reports_mode");
    return (saved as any) ? (saved as any) : "day";
  });
  const [singleDate, setSingleDate] = useState(() => {
    const saved = sessionStorage.getItem("app_reports_single_date");
    return saved ? saved : new Date().toISOString().split("T")[0];
  });
  const [from, setFrom] = useState(() => {
    const saved = sessionStorage.getItem("app_reports_from");
    return saved ? saved : new Date().toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => {
    const saved = sessionStorage.getItem("app_reports_to");
    return saved ? saved : new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    sessionStorage.setItem("app_reports_mode", reportMode);
  }, [reportMode]);

  useEffect(() => {
    sessionStorage.setItem("app_reports_single_date", singleDate);
  }, [singleDate]);

  useEffect(() => {
    sessionStorage.setItem("app_reports_from", from);
  }, [from]);

  useEffect(() => {
    sessionStorage.setItem("app_reports_to", to);
  }, [to]);

  const [branch, setBranch] = useState<"الكل" | "القادسية" | "المروج">("الكل");

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [taxData, setTaxData] = useState<TaxInvoice[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "ledger" | "installments" | "notes">("overview");
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [inspectedDay, setInspectedDay] = useState<DailyEntry | null>(null);

  const loadReport = async () => {
    const fromDate = reportMode === "day" ? singleDate : from;
    const toDate = reportMode === "day" ? singleDate : to;

    if (!fromDate || !toDate) {
      onShowToast("⚠️ يرجى تعيين التواريخ بشكل صحيح أولاً");
      return;
    }

    setLoading(true);
    try {
      // 1. Load Sales & Expenses statistics
      const resStats = await fetch(`/api/reports?from=${fromDate}&to=${toDate}`);
      const stats = await resStats.ok ? await resStats.json() : null;
      setReportData(stats);

      // 2. Load Tax invoices in range
      const resTax = await fetch(`/api/tax-invoices?from=${fromDate}&to=${toDate}`);
      const taxList = await resTax.ok ? await resTax.json() : [];
      setTaxData(taxList);

      // 3. Load System Settings
      const resSettings = await fetch("/api/settings");
      if (resSettings.ok) {
        const sData = await resSettings.json();
        setSettings(sData);
      }

      onShowToast("📊 تم تجميع وإحصاء التقرير الشامل للفترة بنجاح!");
    } catch (err) {
      console.error(err);
      onShowToast("❌ فشل تجميع التقرير المالي");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportMode, singleDate, branch, from, to]); // Auto trigger on quick changes or date updates

  // Calculations
  const q = reportData?.qStats || { total: 0, cash: 0, pos: 0, count: 0, max: 0, maxDate: "", min: 0, minDate: "", avg: 0 };
  const m = reportData?.mStats || { total: 0, cash: 0, pos: 0, count: 0, max: 0, maxDate: "", min: 0, minDate: "", avg: 0 };
  const qExp = reportData?.qExp || {};
  const mExp = reportData?.mExp || {};

  // Filters to display based on single branch view selected or both
  const showQ = branch === "الكل" || branch === "القادسية";
  const showM = branch === "الكل" || branch === "المروج";

  // Compute Total Revenue
  const totalRev = (showQ ? q.total : 0) + (showM ? m.total : 0);

  // Group all expenses
  const allExpKeys = Array.from(new Set([...Object.keys(qExp), ...Object.keys(mExp)]));
  const allExpList = allExpKeys.map((key) => {
    const qVal = showQ ? (qExp[key] || 0) : 0;
    const mVal = showM ? (mExp[key] || 0) : 0;
    const total = qVal + mVal;
    const ratioOfRev = totalRev > 0 ? (total / totalRev) * 100 : 0;
    return { name: key, q: qVal, m: mVal, total, ratioOfRev };
  }).filter((x) => x.total > 0);

  const totalExp = allExpList.reduce((sum, item) => sum + item.total, 0);

  const totalTaxInvoices = taxData
    .filter((inv) => branch === "الكل" || inv.branch === branch)
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // Get active range dates for the report
  const activeFrom = reportMode === "day" ? singleDate : from;
  const activeTo = reportMode === "day" ? singleDate : to;

  // Synchronously compute total manual cash saved in local storage (sums actual saved daily entries)
  const getBranchTotalCash = (br: "القادسية" | "المروج") => {
    const dateList: string[] = [];
    try {
      let cur = new Date(activeFrom);
      const endDate = new Date(activeTo);
      let limit = 0;
      while (cur <= endDate && limit < 400) {
        const yr = cur.getFullYear();
        const mo = String(cur.getMonth() + 1).padStart(2, '0');
        const dy = String(cur.getDate()).padStart(2, '0');
        dateList.push(`${yr}-${mo}-${dy}`);
        cur.setDate(cur.getDate() + 1);
        limit++;
      }
    } catch (e) {
      console.error(e);
    }

    let calculatedTotalCash = 0;
    dateList.forEach((dateStr) => {
      const savedDaily = localStorage.getItem(`tax_cash_${br}_${dateStr}_${dateStr}`);
      if (savedDaily !== null) {
        calculatedTotalCash += parseFloat(savedDaily) || 0;
      }
    });

    return calculatedTotalCash;
  };

  // حساب ضريبة القيمة المضافة المستحقة المقررة على الفرق بناءً على الفرق الفعلي المدون في تبويب الضريبة
  const qCash = getBranchTotalCash("القادسية");
  const mCash = getBranchTotalCash("المروج");

  const qInvoices = taxData
    .filter((inv) => inv.branch === "القادسية")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const mInvoices = taxData
    .filter((inv) => inv.branch === "المروج")
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  // الفرق الصافي لكل فرع = (إيراد نقاط البيع POS + الكاش المدخل المعتمد) - الفواتير الضريبية للفرع
  const qDifference = (q.pos + qCash) - qInvoices;
  const mDifference = (m.pos + mCash) - mInvoices;

  const qVat = qDifference * (15 / 115);
  const mVat = mDifference * (15 / 115);

  let vatDueDiff = 0;
  if (branch === "القادسية") {
    vatDueDiff = qVat;
  } else if (branch === "المروج") {
    vatDueDiff = mVat;
  } else {
    // "الكل" (مجموع فرعي القادسية والمروج)
    vatDueDiff = qVat + mVat;
  }

  // يتم خصم ضريبة الفرق من صافي الربح للفترة
  const totalNet = totalRev - totalExp - vatDueDiff;

  const calcTotalDayExp = (row: DailyEntry) => {
    const others = (row.others || []).reduce((s, o) => s + (o.amt || 0), 0);
    return (
      (row.makhzan || 0) +
      (row.pepsi_deduct || 0) +
      (row.plastic_deduct || 0) +
      (row.sauces_deduct || 0) +
      (row.gas || 0) +
      (row.vegetables || 0) +
      (row.bread || 0) +
      (row.grocery || 0) +
      (row.diesel_deduct || 0) +
      others +
      (row.fixed_deduct || 0)
    );
  };

  // Build high-precision credit ledger metrics for Pepsi, Plastics, Sauces, and Diesel installments
  const computeInstallmentsReport = (daysList: DailyEntry[]) => {
    const sortedDays = [...daysList].sort((a, b) => a.date.localeCompare(b.date));
    if (sortedDays.length === 0) return [];

    const categories = [
      { key: "pepsi", name: "بيبسي ومشروبات", paidField: "pepsi_paid", deductField: "pepsi_deduct", prevField: "pepsi_carry_prev", nextField: "pepsi_carry_next" },
      { key: "plastic", name: "بلاستيك ومغلفات", paidField: "plastic_paid", deductField: "plastic_deduct", prevField: "plastic_carry_prev", nextField: "plastic_carry_next" },
      { key: "sauces", name: "الصلصات والمواد الأولية", paidField: "sauces_paid", deductField: "sauces_deduct", prevField: "sauces_carry_prev", nextField: "sauces_carry_next" },
      { key: "diesel", name: "الديزل ووقود المطبخ", paidField: "diesel_paid", deductField: "diesel_deduct", prevField: "diesel_carry_prev", nextField: "diesel_carry_next" }
    ];

    return categories.map(cat => {
      const firstDay = sortedDays[0];
      const lastDay = sortedDays[sortedDays.length - 1];

      // Safe bounds checks
      const startBalance = Number((firstDay[cat.prevField as keyof DailyEntry] as number || 0).toFixed(2));
      const endBalance = Number((lastDay[cat.nextField as keyof DailyEntry] as number || 0).toFixed(2));

      // An invoice is added only if we started fresh (prevCarry === 0) with a non-zero paid value,
      // or if we had a previous carryover and explicitly classified the payment as "invoice".
      const totalNewSupples = Number(
        sortedDays.reduce((sum, d) => {
          const paid = Number(d[cat.paidField as keyof DailyEntry] || 0);
          const prevCarry = Number(d[cat.prevField as keyof DailyEntry] || 0);
          const dayType = d[`${cat.key}_type` as keyof DailyEntry] as "payment" | "invoice" | undefined;

          const isNewInvoice = (prevCarry === 0 && paid > 0) || (prevCarry > 0 && paid > 0 && dayType === "invoice");
          return sum + (isNewInvoice ? paid : 0);
        }, 0).toFixed(2)
      );

      const totalDeductedExp = Number(sortedDays.reduce((sum, d) => sum + (d[cat.deductField as keyof DailyEntry] as number || 0), 0).toFixed(2));

      // Precision dynamic audit validation check
      const expectedEnd = Number((startBalance + totalNewSupples - totalDeductedExp).toFixed(2));
      const difference = Number((endBalance - expectedEnd).toFixed(2));
      const isMatched = Math.abs(difference) < 0.05;

      return {
        ...cat,
        startBalance,
        endBalance,
        totalNewSupples,
        totalDeductedExp,
        difference,
        isMatched
      };
    });
  };

  const qDataList = reportData?.qData || [];
  const mDataList = reportData?.mData || [];
  const chronologicalDates = Array.from(new Set([...qDataList.map((d: any) => d.date), ...mDataList.map((d: any) => d.date)]))
    .sort((a, b) => a.localeCompare(b));

  const maxTotalSalesVal = chronologicalDates.length > 0 ? chronologicalDates.reduce((max, date) => {
    const qDay = qDataList.find((d: any) => d.date === date);
    const mDay = mDataList.find((d: any) => d.date === date);
    const qVal = (showQ && qDay) ? qDay.total_sales : 0;
    const mVal = (showM && mDay) ? mDay.total_sales : 0;
    return Math.max(max, qVal + mVal, 100);
  }, 100) : 100;

  const computeTerminalsBreakdown = (daysList: DailyEntry[]) => {
    let mada1Sum = 0;
    let mada2Sum = 0;
    let mada3Sum = 0;
    let visa1Sum = 0;
    let visa2Sum = 0;
    let visa3Sum = 0;
    let totalFees = 0;
    let totalNetPOS = 0;

    daysList.forEach(d => {
      mada1Sum += d.mada1 || 0;
      mada2Sum += d.mada2 || 0;
      mada3Sum += d.mada3 || 0;
      visa1Sum += d.visa1 || 0;
      visa2Sum += d.visa2 || 0;
      visa3Sum += d.visa3 || 0;
      const rawPOSGross = (d.mada1 || 0) + (d.mada2 || 0) + (d.mada3 || 0) + (d.visa1 || 0) + (d.visa2 || 0) + (d.visa3 || 0);
      const dayNetPOS = d.pos_net || 0;
      totalFees += Math.max(0, rawPOSGross - dayNetPOS);
      totalNetPOS += dayNetPOS;
    });

    return { mada1Sum, mada2Sum, mada3Sum, visa1Sum, visa2Sum, visa3Sum, totalFees, totalNetPOS };
  };

  const qTerminals = computeTerminalsBreakdown(reportData?.qData || []);
  const mTerminals = computeTerminalsBreakdown(reportData?.mData || []);

  const allMergedDays = [...(reportData?.qData || []), ...(reportData?.mData || [])]
    .sort((a: any, b: any) => b.date.localeCompare(a.date));

  const filteredDays = allMergedDays.filter((d: any) => {
    if (!ledgerSearch) return true;
    const term = ledgerSearch.toLowerCase();
    return d.date.includes(term) || d.branch.toLowerCase().includes(term) || (d.notes && d.notes.toLowerCase().includes(term));
  });

  const detailedOtherExpenses: { date: string; branch: string; category: string; name: string; amt: number }[] = [];
  if (reportData) {
    allMergedDays.forEach((d: any) => {
      if (d.others && d.others.length > 0) {
        d.others.forEach((o: any) => {
          if (o.amt > 0 || o.name) {
            detailedOtherExpenses.push({ date: d.date, branch: d.branch, category: "مصروفات تشغيلية أخرى", name: o.name || "معالجة مصروفات متفرقة", amt: o.amt || 0 });
          }
        });
      }
      if (d.pur_extras && d.pur_extras.length > 0) {
        d.pur_extras.forEach((e: any) => {
          if (e.amt > 0 || e.name) {
            detailedOtherExpenses.push({ date: d.date, branch: d.branch, category: "مشتريات أخرى", name: e.name || "شراء مواد إضافية للمحل", amt: e.amt || 0 });
          }
        });
      }
      if (d.diesel_paid > 0 && d.diesel_type === 'invoice') {
        detailedOtherExpenses.push({ date: d.date, branch: d.branch, category: "ديزل", name: "إدخال فاتورة ديزل إضافية للفرع", amt: d.diesel_paid });
      }
      if (d.pepsi_paid > 0 && d.pepsi_type === 'invoice') {
        detailedOtherExpenses.push({ date: d.date, branch: d.branch, category: "بيبسي ومشروبات", name: "إدخال فاتورة مشروبات بيبسي", amt: d.pepsi_paid });
      }
      if (d.plastic_paid > 0 && d.plastic_type === 'invoice') {
        detailedOtherExpenses.push({ date: d.date, branch: d.branch, category: "بلاستيك وتغليف", name: "شراء وتوريد كيس وعلب التغليف البلاستيكية", amt: d.plastic_paid });
      }
      if (d.sauces_paid > 0 && d.sauces_type === 'invoice') {
        detailedOtherExpenses.push({ date: d.date, branch: d.branch, category: "صلصات وصوصات أولية", name: "إحضار وشراء صوص وصلصات أولية للمطبخ الموحد", amt: d.sauces_paid });
      }
    });
  }

  // Print styling templates & printing triggers
  const handlePrint = (type: "sales" | "tax" | "all") => {
    onShowToast("🖨️ يتم تحضير نسخة التقرير للطباعة...");
    const fromDate = reportMode === "day" ? singleDate : from;
    const toDate = reportMode === "day" ? singleDate : to;
    
    // Create standard dynamic print window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      onShowToast("⚠️ يرجى السماح بالنوافذ المنبثقة لرؤية نسخة الطباعة");
      return;
    }

    const qDataList = reportData?.qData || [];
    const mDataList = reportData?.mData || [];
    const allMergedDays = [...qDataList, ...mDataList].sort((a: any, b: any) => b.date.localeCompare(a.date));

    // Merged Daily Ledger Table HTML
    let ledgerTableHtml = "";
    if (allMergedDays.length > 0) {
      ledgerTableHtml = `
        <h3>3. الدفتر المالي اليومي الموحد للفروع</h3>
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>الفرع</th>
              <th>المبيعات الإجمالية</th>
              <th>صافي الكاش</th>
              <th>صافي الشبكة والمدى</th>
              <th>المصروفات والمستودع</th>
              <th>صافي ربح الميزانية</th>
            </tr>
          </thead>
          <tbody>
            ${allMergedDays.map((d: any) => {
              const dayExp = calcTotalDayExp(d);
              return `
                <tr>
                  <td>${d.date}</td>
                  <td class="bold">${d.branch}</td>
                  <td class="bold text-green">${(d.total_sales || 0).toFixed(2)} ر</td>
                  <td>${(d.cash_net || 0).toFixed(2)} ر <span style="font-size:10px;color:#666;">(الدرج: ${(d.cash_box || 0).toFixed(2)}، صرف: ${(d.sarf || 350)})</span></td>
                  <td>${(d.pos_net || 0).toFixed(2)} ر</td>
                  <td class="text-red">${dayExp.toFixed(2)} ر</td>
                  <td class="${d.net_day >= 0 ? 'text-green' : 'text-red'} bold">${(d.net_day || 0).toFixed(2)} ر</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `;
    }

    // Build dynamic printer-friendly Covenants & Balances Auditing Table (replaces otherExpensesTableHtml)
    let installmentsTableHtml = "";
    if (showQ || showM) {
      installmentsTableHtml = `
        <h3>4. متابعة وحساب الأرصدة والعهد</h3>
      `;
      if (showQ) {
        const qInstallments = computeInstallmentsReport(reportData?.qData || []);
        if (qInstallments.length > 0) {
          installmentsTableHtml += `
            <div class="bold" style="margin-top: 8px; margin-bottom: 4px; font-size: 10px; color: #1e293b;">• فرع القادسية - تصفية قيود أقساط العهد ومطابقة الأرصدة المتراكمة</div>
            <table>
              <thead>
                <tr>
                  <th>بند التقسيط المجدول</th>
                  <th style="text-align: left;">الرصيد الافتتاحي أمس</th>
                  <th style="text-align: left;">إجمالي الفواتير المضافة</th>
                  <th style="text-align: left;">إجمالي الأقساط المخصومة</th>
                  <th style="text-align: left;">صافي الرصيد النهائي للغد</th>
                  <th style="text-align: center;">حالة المطابقة الرياضية</th>
                </tr>
              </thead>
              <tbody>
                ${qInstallments.map((item) => `
                  <tr>
                    <td class="bold">${item.name}</td>
                    <td style="text-align: left;">${item.startBalance.toFixed(2)} ر</td>
                    <td style="text-align: left; color: #2563eb; font-weight: bold;">+${item.totalNewSupples.toFixed(2)} ر</td>
                    <td style="text-align: left; color: #dc2626; font-weight: bold;">-${item.totalDeductedExp.toFixed(2)} ر</td>
                    <td style="text-align: left; font-weight: bold; background: #fafafa;">${item.endBalance.toFixed(2)} ر</td>
                    <td style="text-align: center;">
                      ${item.isMatched ? `<span style="color: #16a34a; font-weight: bold;">🟢 مطابق</span>` : `<span style="color: #dc2626; font-weight: bold;">🔴 فارق: ${item.difference.toFixed(2)} ر</span>`}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `;
        }
      }
      if (showM) {
        const mInstallments = computeInstallmentsReport(reportData?.mData || []);
        if (mInstallments.length > 0) {
          installmentsTableHtml += `
            <div class="bold" style="margin-top: 12px; margin-bottom: 4px; font-size: 10px; color: #1e293b;">• فرع المروج - تصفية قيود أقساط العهد ومطابقة الأرصدة المتراكمة</div>
            <table>
              <thead>
                <tr>
                  <th>بند التقسيط المجدول</th>
                  <th style="text-align: left;">الرصيد الافتتاحي أمس</th>
                  <th style="text-align: left;">إجمالي الفواتير المضافة</th>
                  <th style="text-align: left;">إجمالي الأقساط المخصومة</th>
                  <th style="text-align: left;">صافي الرصيد النهائي للغد</th>
                  <th style="text-align: center;">حالة المطابقة الرياضية</th>
                </tr>
              </thead>
              <tbody>
                ${mInstallments.map((item) => `
                  <tr>
                    <td class="bold">${item.name}</td>
                    <td style="text-align: left;">${item.startBalance.toFixed(2)} ر</td>
                    <td style="text-align: left; color: #2563eb; font-weight: bold;">+${item.totalNewSupples.toFixed(2)} ر</td>
                    <td style="text-align: left; color: #dc2626; font-weight: bold;">-${item.totalDeductedExp.toFixed(2)} ر</td>
                    <td style="text-align: left; font-weight: bold; background: #fafafa;">${item.endBalance.toFixed(2)} ر</td>
                    <td style="text-align: center;">
                      ${item.isMatched ? `<span style="color: #16a34a; font-weight: bold;">🟢 مطابق</span>` : `<span style="color: #dc2626; font-weight: bold;">🔴 فارق: ${item.difference.toFixed(2)} ر</span>`}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          `;
        }
      }
    }

    // Written notes timeline HTML
    const allNotesInPeriod = allMergedDays.filter((d: any) => d.notes && d.notes.trim() !== "");
    let notesTimelineHtml = "";
    if (allNotesInPeriod.length > 0) {
      notesTimelineHtml = `
        <h3>5. سجل الملاحظات والتعليقات الإدارية للفروع</h3>
        <table>
          <thead>
            <tr>
              <th style="width: 120px;">التاريخ</th>
              <th style="width: 100px;">الفرع</th>
              <th>نص الملاحظة المدونة</th>
            </tr>
          </thead>
          <tbody>
            ${allNotesInPeriod.map((d: any) => `
              <tr>
                <td class="bold">${d.date}</td>
                <td><span style="color: ${d.branch === 'القادسية' ? '#1a237e' : '#b45309'}; font-weight: bold;">${d.branch}</span></td>
                <td style="font-style: italic; color: #333;">"${d.notes}"</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

    let printHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>طباعة تقرير مطعم أصل الاسكندر التفصيلي</title>
        <style>
          * { 
            box-sizing: border-box; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            background-color: #ffffff;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif;
            color: #000000;
            font-size: 11px;
            line-height: 1.4;
          }
          .print-wrapper {
            width: 100%;
            max-width: 900px;
            margin: 0 auto;
            padding: 5px 0px;
            direction: rtl;
            text-align: right;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000000;
            padding-bottom: 6px;
            margin-bottom: 12px;
          }
          .title {
            font-size: 16px;
            font-weight: 800;
            color: #000000;
            margin-bottom: 4px;
          }
          .period {
            font-size: 10.5px;
            color: #111111;
            font-weight: bold;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 12px;
          }
          .stat-box {
            border: 1.5px solid #000000;
            padding: 5px 8px;
            text-align: center;
            border-radius: 6px;
            background: #fafafa !important;
          }
          .stat-box div:first-child {
            font-size: 9.5px;
            color: #111111;
            font-weight: bold;
          }
          .stat-val {
            font-size: 13px;
            font-weight: 800;
            color: #000000;
            margin-top: 2px;
          }
          .text-green { color: #0b6623 !important; font-weight: bold; }
          .text-red { color: #990000 !important; font-weight: bold; }
          .text-blue { color: #000000 !important; font-weight: bold; }
          
          h3 {
            font-size: 11.5px;
            color: #000000;
            border-bottom: 1.5px solid #000000;
            padding-bottom: 4px;
            margin-top: 14px;
            margin-bottom: 6px;
            font-weight: 800;
            page-break-after: avoid;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
            border: 1.5px solid #000000 !important;
            page-break-inside: auto;
          }
          th {
            background: #f1f5f9 !important;
            color: #000000 !important;
            padding: 5px 6px;
            border: 1.5px solid #000000 !important;
            font-size: 10px;
            font-weight: 800;
            text-align: right;
          }
          td {
            padding: 5px 6px;
            border: 1px solid #000000 !important;
            font-size: 9.5px;
            color: #000000 !important;
            font-weight: bold;
            page-break-inside: avoid;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          tr:nth-child(even) td {
            background-color: #fafafa !important;
          }
          .bold {
            font-weight: bold;
          }
          .footer {
            margin-top: 16px;
            text-align: center;
            color: #111111;
            font-size: 9px;
            border-top: 1.5px dashed #000000;
            padding-top: 6px;
            font-weight: bold;
            page-break-inside: avoid;
          }
          
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          @media print {
            html, body {
              background-color: #ffffff !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              color: #000000 !important;
            }
            .print-wrapper {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
              border: 1.5px solid #000000 !important;
            }
            th {
              background-color: #f1f5f9 !important;
              border: 1.5px solid #000000 !important;
              color: #000000 !important;
            }
            td {
              border: 1px solid #000000 !important;
              color: #000000 !important;
            }
            tr:nth-child(even) td {
              background-color: #fafafa !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          <div class="header">
            <div class="title">🍽️ مطعم أصل الاسكندر</div>
            <div class="period">تقرير دوري مفصل للفترة من ${fromDate} إلى ${toDate} (${branch})</div>
          </div>
          
          <div class="stats">
            <div class="stat-box"><div>إجمالي الإيرادات</div><div class="stat-val text-green">${totalRev.toFixed(2)} ر</div></div>
            <div class="stat-box"><div>إجمالي المصروفات</div><div class="stat-val text-red">${totalExp.toFixed(2)} ر</div></div>
            <div class="stat-box"><div>ضريبة الفرق المستحقة</div><div class="stat-val font-bold text-slate-700">${vatDueDiff.toFixed(2)} ر</div></div>
            <div class="stat-box"><div>صافي الربح للفترة</div><div class="stat-val">${totalNet.toFixed(2)} ر</div></div>
          </div>
  
          <h3>1. مقارنة الفرعين والتحصيل المالي</h3>
          <table>
            <thead>
              <tr>
                <th>الفرع</th><th>إجمالي المبيعات</th><th>كاش</th><th>الشبكة والفيزا</th>
              </tr>
            </thead>
            <tbody>
              ${showQ ? `<tr><td>فرع القادسية</td><td>${q.total.toFixed(2)} ر</td><td>${q.cash.toFixed(2)} ر</td><td>${q.pos.toFixed(2)} ر</td></tr>` : ""}
              ${showM ? `<tr><td>فرع المروج</td><td>${m.total.toFixed(2)} ر</td><td>${m.cash.toFixed(2)} ر</td><td>${m.pos.toFixed(2)} ر</td></tr>` : ""}
              <tr class="bold" style="background: #f1f5f9 !important;">
                <td>الخط الإجمالي للفروع</td><td>${totalRev.toFixed(2)} ر</td><td>${((showQ ? q.cash : 0) + (showM ? m.cash : 0)).toFixed(2)} ر</td><td>${((showQ ? q.pos : 0) + (showM ? m.pos : 0)).toFixed(2)} ر</td>
              </tr>
            </tbody>
          </table>
  
          <h3>2. تفاصيل وتصنيف بنود المصروفات الدورية المخصومة</h3>
          <table>
            <thead>
              <tr>
                <th>البند المصروف</th><th>حصة القادسية</th><th>حصة المروج</th><th>المجموع والتقسيط الكلي</th><th>% من الدخل</th>
              </tr>
            </thead>
            <tbody>
              ${allExpList.map((item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.q.toFixed(2)} ر</td>
                  <td>${item.m.toFixed(2)} ر</td>
                  <td class="bold">${item.total.toFixed(2)} ر</td>
                  <td>${item.ratioOfRev.toFixed(1)}%</td>
                </tr>
              `).join("")}
              <tr class="bold" style="background: #f1f5f9 !important;">
                <td>المجموع العام المصروف</td>
                <td>${allExpList.reduce((s, x) => s + x.q, 0).toFixed(2)} ر</td>
                <td>${allExpList.reduce((s, x) => s + x.m, 0).toFixed(2)} ر</td>
                <td>${totalExp.toFixed(2)} ر</td>
                <td>${totalRev > 0 ? ((totalExp / totalRev) * 100).toFixed(1) : 0}%</td>
              </tr>
            </tbody>
          </table>
  
          ${ledgerTableHtml}
  
          ${installmentsTableHtml}
  
          ${notesTimelineHtml}
          
          <div class="footer">
            نظام محاسبة أصل الاسكندر للفروع الموحدة وبنود التصفية • تم إصدار وتثبيت هذه التقارير طبقاً للسجلات الرسمية للمطعم والمستودع.
          </div>
        </div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  // Excel XML formatted sheet exporter
  const handleExportXls = () => {
    const fromDate = reportMode === "day" ? singleDate : from;
    const toDate = reportMode === "day" ? singleDate : to;
    
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8">
        <style>
          table { border-collapse: collapse; font-family: Tahoma; }
          td, th { border: 1px solid #ccc; padding: 6px 12px; }
          .header { background: #1a237e; color: white; font-weight: bold; text-align: center; }
          .subheader { background: #e8eaf6; font-weight: bold; }
          .green { color: #1565c0; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>🍽️ تقرير مبيعات ومصروفات مطعم أصل الاسكندر للفترة من ${fromDate} إلى ${toDate}</h2>
        <br/>
        <table>
          <thead>
            <tr class="header">
              <th colspan="4">مقارنة وتحصيلات الفروع</th>
            </tr>
            <tr class="subheader">
              <th>الفرع</th><th>إجمالي المبيعات (ريال)</th><th>المبيعات النقدية كاش</th><th>تحصيل الشبكات والمدى</th>
            </tr>
          </thead>
          <tbody>
            ${showQ ? `<tr><td>فرع القادسية</td><td>${q.total}</td><td>${q.cash}</td><td>${q.pos}</td></tr>` : ""}
            ${showM ? `<tr><td>فرع المروج</td><td>${m.total}</td><td>${m.cash}</td><td>${m.pos}</td></tr>` : ""}
            <tr class="subheader">
              <td>الإجمالي الكلي للفروع</td><td>${totalRev}</td><td>${(showQ ? q.cash : 0) + (showM ? m.cash : 0)}</td><td>${(showQ ? q.pos : 0) + (showM ? m.pos : 0)}</td>
            </tr>
          </tbody>
        </table>
        <br/>
        <table>
          <thead>
            <tr class="header">
              <th colspan="5">تصنيف بنود المصروفات التشغيلية والرواتب والقروض</th>
            </tr>
            <tr class="subheader">
              <th>اسم بند المصروف</th><th>قيمة الصرف فرع القادسية</th><th>قيمة الصرف فرع المروج</th><th>المجموع (ريال)</th><th>المعدل من الدخل</th>
            </tr>
          </thead>
          <tbody>
            ${allExpList.map((item) => `
              <tr>
                <td>${item.name}</td><td>${item.q}</td><td>${item.m}</td><td>${item.total}</td><td>${item.ratioOfRev.toFixed(1)}%</td>
              </tr>
            `).join("")}
            <tr class="subheader">
              <td>المجموع العام</td>
              <td>${allExpList.reduce((s, x) => s + x.q, 0)}</td>
              <td>${allExpList.reduce((s, x) => s + x.m, 0)}</td>
              <td>${totalExp}</td>
              <td>${totalRev > 0 ? ((totalExp / totalRev) * 100).toFixed(1) : 0}%</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `تقرير_أصل_الاسكندر_${fromDate}_إلى_${toDate}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    onShowToast("📊 تم تصدير ورقة العمل بصيغة Excel بنجاح!");
  };

  return (
    <div className="space-y-6 RTL">
      {/* Search Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-700" />
            <h2 className="text-lg font-bold text-slate-800">نظام التقارير الشامل والتحليلات</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setReportMode("day")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                reportMode === "day"
                  ? "bg-indigo-700 text-white border-indigo-700"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              📅 يوم محدد
            </button>
            <button
              onClick={() => setReportMode("range")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                reportMode === "range"
                  ? "bg-indigo-700 text-white border-indigo-700"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              📆 فترة زمنية
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {reportMode === "day" ? (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-slate-400" /> تاريخ اليوم المحدد
              </label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-slate-400" /> من تاريخ
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-slate-400" /> إلى تاريخ
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 flex items-center gap-1">
              <Building2 className="w-4 h-4 text-slate-400" /> تصفية حسب الفرع
            </label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
            >
              <option value="الكل">كلا الفرعين</option>
              <option value="القادسية">فرع القادسية</option>
              <option value="المروج">فرع المروج</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadReport}
            disabled={loading}
            className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all font-sans"
          >
            📊 عرض وحساب
          </button>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => handlePrint("all")}
            className="px-4 py-2 border border-slate-200 hover:border-indigo-600 rounded-lg bg-white text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer hover:text-indigo-700 transition-colors"
          >
            <FileText className="w-4 h-4 text-rose-600" /> حفظ / طباعة كـ PDF
          </button>
          <button
            type="button"
            onClick={handleExportXls}
            className="px-4 py-2 border border-slate-200 hover:border-emerald-600 rounded-lg bg-white text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer hover:text-emerald-700 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-600" /> تصدير كـ Excel للتقرير
          </button>
        </div>
      </div>

      {reportData && (
        <div className="space-y-6">
          {/* KPI upper statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
              <div className="text-xs text-emerald-600 font-bold">💰 إجمالي المبيعات والتحصيل</div>
              <div className="text-2xl font-extrabold text-emerald-900 mt-2">{totalRev.toFixed(2)} ر</div>
              <div className="text-[10px] text-emerald-500 mt-0.5 font-medium">مجموع مبيعات وعمليات الفروع للفترة</div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 text-center">
              <div className="text-xs text-rose-600 font-bold">📉 إجمالي المصروفات الدورية</div>
              <div className="text-2xl font-extrabold text-rose-900 mt-2">{totalExp.toFixed(2)} ر</div>
              <div className="text-[10px] text-rose-500 mt-0.5 font-medium">الخصوم المباشرة والديزل والصلصات</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
              <div className="text-xs text-slate-600 font-bold">🧾 ضريبة القيمة المضافة المستحقة على الفرق</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">{vatDueDiff.toFixed(2)} ر</div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">طريقة 15/115 على وعاء الفرق المقر من الدخل</div>
            </div>

            <div className={`p-5 rounded-xl text-center border ${
              totalNet >= 0 
                ? "bg-indigo-50 border-indigo-200" 
                : "bg-amber-50 border-amber-200"
            }`}>
              <div className={`text-xs font-bold ${totalNet >= 0 ? "text-indigo-600" : "text-amber-600"}`}>
                {totalNet >= 0 ? "✅ صافي الربح للفترة" : "⚠️ صافي العجز المالي"}
              </div>
              <div className={`text-2xl font-extrabold mt-2 ${totalNet >= 0 ? "text-indigo-900" : "text-amber-900"}`}>
                {totalNet.toFixed(2)} ر
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">بعد المصاريف وقيمة ضريبة الفرق المستحقة</div>
            </div>
          </div>

          {/* Sub-Tabs Selector Menu */}
          <div className="flex flex-wrap gap-1.5 border-b border-indigo-50 pb-2">
            <button
              type="button"
              onClick={() => setActiveSubTab("overview")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "overview"
                  ? "bg-indigo-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              📊 الإحصاءات العامة والمقارنة
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("ledger")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "ledger"
                  ? "bg-indigo-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              📅 الدفتر اليومي الصندوقي ({[...(reportData?.qData || []), ...(reportData?.mData || [])].length} يوم)
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("installments")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "installments"
                  ? "bg-indigo-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              📑 متابعة وحساب الأرصدة والعهد
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("notes")}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                activeSubTab === "notes"
                  ? "bg-indigo-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              📝 سجل ملاحظات الفروع المكتوبة
            </button>
          </div>

          {/* Sub-Tab Contencts */}

          {/* TAB 1: OVERVIEW */}
          {activeSubTab === "overview" && (
            <div className="space-y-6">
              {/* Visual SVG Trend graph for range mode */}
              {chronologicalDates.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-indigo-700" /> مسار المبيعات للفروع (مقارنة بصرية يومية)
                      </h3>
                      <p className="text-[10px] text-slate-400">مرر مؤشر الفأرة على الأعمدة لعرض مبيعات اليوم بالتفصيل</p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold">
                      {showQ && <span className="flex items-center gap-1"><span className="w-3 h-3 bg-indigo-600 rounded"></span>فرع القادسية</span>}
                      {showM && <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded"></span>فرع المروج</span>}
                    </div>
                  </div>

                  <div className="pt-4 h-56 flex items-end gap-2 md:gap-3 border-b border-slate-200 overflow-x-auto pb-1 px-2">
                    {chronologicalDates.map(date => {
                      const qDay = (reportData?.qData || []).find((d: any) => d.date === date);
                      const mDay = (reportData?.mData || []).find((d: any) => d.date === date);
                      const qVal = (showQ && qDay) ? qDay.total_sales : 0;
                      const mVal = (showM && mDay) ? mDay.total_sales : 0;
                      const dayTotalSum = qVal + mVal;

                      // Scaled heights
                      const qHeight = Math.max(2, (qVal / maxTotalSalesVal) * 100);
                      const mHeight = Math.max(2, (mVal / maxTotalSalesVal) * 100);

                      return (
                        <div key={date} className="flex-1 min-w-[32px] flex flex-col justify-end items-center h-full group relative">
                          {/* Rich hover card */}
                          <div className="absolute bottom-full mb-2 bg-slate-950 text-white text-[10px] p-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-36 text-right leading-normal shadow-md">
                            <span className="font-extrabold block text-slate-300 border-b border-slate-800 pb-1 mb-1 text-center font-mono">{date}</span>
                            {showQ && qVal > 0 && <span className="flex justify-between gap-2"><span>القادسية:</span><span className="font-bold font-mono">{qVal.toFixed(2)} ر</span></span>}
                            {showM && mVal > 0 && <span className="flex justify-between gap-2"><span>المروج:</span><span className="font-bold font-mono">{mVal.toFixed(2)} ر</span></span>}
                            <span className="flex justify-between gap-2 border-t border-slate-800 mt-1 pt-1 font-black text-emerald-400 text-xs"><span>المجموع:</span><span className="font-mono">{dayTotalSum.toFixed(2)} ر</span></span>
                          </div>

                          {/* Columns container */}
                          <div className="w-full flex justify-center gap-0.5 items-end h-[85%]">
                            {showQ && qVal > 0 && (
                              <div 
                                style={{ height: `${qHeight}%` }} 
                                className="w-1/2 bg-indigo-600 group-hover:bg-indigo-700 rounded-t-xs transition-colors"
                              />
                            )}
                            {showM && mVal > 0 && (
                              <div 
                                style={{ height: `${mHeight}%` }} 
                                className="w-1/2 bg-amber-500 group-hover:bg-amber-600 rounded-t-xs transition-colors"
                              />
                            )}
                          </div>

                          {/* date label text */}
                          <span className="text-[9px] text-slate-400 mt-1 font-mono truncate w-full text-center">
                            {date.substring(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Comparative Branches overview table */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 pb-2 border-b border-slate-200">
                  <AslIskanderLogoSymbol size={24} /> جدولة ومقارنات فروع مطعم أصل الاسكندر (المبيعات والتحصيل)
                </h3>
                
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                  <table className="w-full text-sm text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-100 font-extrabold whitespace-nowrap">
                        <th className="p-3 border border-slate-800">اسم الفرع</th>
                        <th className="p-3 border border-slate-800 text-left">إجمالي الإيرادات</th>
                        <th className="p-3 border border-slate-800 text-left">مبيعات الكاش</th>
                        <th className="p-3 border border-slate-800 text-left">تحصيلات الشبكات</th>
                        <th className="p-3 border border-slate-800 text-center">أيام الإدخال</th>
                        {reportMode === "range" && (
                          <>
                            <th className="p-3 border border-slate-800 text-left">أعلى مبيعات يوم</th>
                            <th className="p-3 border border-slate-800 text-left">أقل مبيعات يوم</th>
                            <th className="p-3 border border-slate-800 text-left">المتوسط اليومي</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-250">
                      {showQ && (
                        <tr className="hover:bg-slate-50 font-semibold transition-colors duration-100">
                          <td className="p-3 border border-slate-200 font-extrabold text-indigo-900 bg-indigo-50/10">فرع القادسية</td>
                          <td className="p-3 border border-slate-200 text-left text-emerald-700 font-extrabold">{q.total.toFixed(2)} ر</td>
                          <td className="p-3 border border-slate-200 text-left text-slate-700 font-mono">{q.cash.toFixed(2)} ر</td>
                          <td className="p-3 border border-slate-200 text-left text-slate-700 font-mono">{q.pos.toFixed(2)} ر</td>
                          <td className="p-3 border border-slate-200 text-center text-indigo-700 font-bold">{q.count} يوم</td>
                          {reportMode === "range" && (
                            <>
                              <td className="p-3 border border-slate-200 text-left text-emerald-600 font-bold">{q.max.toFixed(2)} ر <span className="text-[10px] text-slate-400 font-normal">({q.maxDate})</span></td>
                              <td className="p-3 border border-slate-200 text-left text-rose-600 font-bold">{q.min.toFixed(2)} ر <span className="text-[10px] text-slate-400 font-normal">({q.minDate})</span></td>
                              <td className="p-3 border border-slate-200 text-left text-indigo-700 font-bold">{q.avg.toFixed(2)} ر</td>
                            </>
                          )}
                        </tr>
                      )}

                      {showM && (
                        <tr className="hover:bg-slate-50 font-semibold transition-colors duration-100">
                          <td className="p-3 border border-slate-200 font-extrabold text-amber-950 bg-amber-50/10">فرع المروج</td>
                          <td className="p-3 border border-slate-200 text-left text-emerald-700 font-extrabold">{m.total.toFixed(2)} ر</td>
                          <td className="p-3 border border-slate-200 text-left text-slate-700 font-mono">{m.cash.toFixed(2)} ر</td>
                          <td className="p-3 border border-slate-200 text-left text-slate-700 font-mono">{m.pos.toFixed(2)} ر</td>
                          <td className="p-3 border border-slate-200 text-center text-indigo-700 font-bold">{m.count} يوم</td>
                          {reportMode === "range" && (
                            <>
                              <td className="p-3 border border-slate-200 text-left text-emerald-600 font-bold">{m.max.toFixed(2)} ر <span className="text-[10px] text-slate-400 font-normal">({m.maxDate})</span></td>
                              <td className="p-3 border border-slate-200 text-left text-rose-600 font-bold">{m.min.toFixed(2)} ر <span className="text-[10px] text-slate-400 font-normal">({m.minDate})</span></td>
                              <td className="p-3 border border-slate-200 text-left text-indigo-700 font-bold">{m.avg.toFixed(2)} ر</td>
                            </>
                          )}
                        </tr>
                      )}

                      <tr className="bg-indigo-50 font-extrabold text-slate-900">
                        <td className="p-3 border border-slate-200 font-extrabold text-slate-900">إجمالي الفروع</td>
                        <td className="p-3 border border-slate-200 text-left text-indigo-800 font-black">{totalRev.toFixed(2)} ر</td>
                        <td className="p-3 border border-slate-200 text-left font-mono">{((showQ ? q.cash : 0) + (showM ? m.cash : 0)).toFixed(2)} ر</td>
                        <td className="p-3 border border-slate-200 text-left font-mono">{((showQ ? q.pos : 0) + (showM ? m.pos : 0)).toFixed(2)} ر</td>
                        <td className="p-3 border border-slate-200 text-center text-indigo-900">{((showQ ? q.count : 0) + (showM ? m.count : 0))} يوم</td>
                        {reportMode === "range" && <td colSpan={3} className="p-3 border border-slate-200 bg-indigo-50/30"></td>}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CARD MACHINES DETAILED BREAKDOWN (MADA & VISA PERFORMANCE) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {showQ && (
                  <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2 text-indigo-900">🏧 تشريح أجهزة الشبكة والبطاقات - فرع القادسية</h4>
                    <div className="space-y-2 text-xs font-medium">
                      <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                        <span>مدى جهاز 1:</span>
                        <span className="font-mono font-bold text-slate-700">{(qTerminals.mada1Sum).toFixed(2)} ر</span>
                      </div>
                      <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                        <span>مدى جهاز 2:</span>
                        <span className="font-mono font-bold text-slate-700">{(qTerminals.mada2Sum).toFixed(2)} ر</span>
                      </div>
                      {qTerminals.mada3Sum > 0 && (
                        <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                          <span>مدى جهاز 3:</span>
                          <span className="font-mono font-bold text-slate-700">{(qTerminals.mada3Sum).toFixed(2)} ر</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 bg-slate-50 px-2 rounded border-t border-slate-100">
                        <span>بطاقة فيزا 1:</span>
                        <span className="font-mono font-bold text-slate-700">{(qTerminals.visa1Sum).toFixed(2)} ر</span>
                      </div>
                      <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                        <span>بطاقة فيزا 2:</span>
                        <span className="font-mono font-bold text-slate-700">{(qTerminals.visa2Sum).toFixed(2)} ر</span>
                      </div>
                      {qTerminals.visa3Sum > 0 && (
                        <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                          <span>بطاقة فيزا 3:</span>
                          <span className="font-mono font-bold text-slate-700">{(qTerminals.visa3Sum).toFixed(2)} ر</span>
                        </div>
                      )}
                      <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between text-slate-500 text-[10px]">
                        <span>رسوم الشبكة والكريدت المقتطعة:</span>
                        <span className="font-mono text-red-650 font-bold">-{qTerminals.totalFees.toFixed(2)} ر</span>
                      </div>
                      <div className="flex justify-between pt-1 font-bold text-indigo-700">
                        <span>صافي مبيعات الشبكة بالقادسية:</span>
                        <span className="font-mono">{(qTerminals.totalNetPOS).toFixed(2)} ر</span>
                      </div>
                    </div>
                  </div>
                )}

                {showM && (
                  <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 border-b border-slate-50 pb-2 text-amber-900">🏧 تشريح أجهزة الشبكة والبطاقات - فرع المروج</h4>
                    <div className="space-y-2 text-xs font-medium">
                      <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                        <span>مدى جهاز 1:</span>
                        <span className="font-mono font-bold text-slate-700">{(mTerminals.mada1Sum).toFixed(2)} ر</span>
                      </div>
                      <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                        <span>مدى جهاز 2:</span>
                        <span className="font-mono font-bold text-slate-700">{(mTerminals.mada2Sum).toFixed(2)} ر</span>
                      </div>
                      {mTerminals.mada3Sum > 0 && (
                        <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                          <span>مدى جهاز 3:</span>
                          <span className="font-mono font-bold text-slate-700">{(mTerminals.mada3Sum).toFixed(2)} ر</span>
                        </div>
                      )}
                      <div className="flex justify-between py-1 bg-slate-50 px-2 rounded border-t border-slate-100">
                        <span>بطاقة فيزا 1:</span>
                        <span className="font-mono font-bold text-slate-700">{(mTerminals.visa1Sum).toFixed(2)} ر</span>
                      </div>
                      <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                        <span>بطاقة فيزا 2:</span>
                        <span className="font-mono font-bold text-slate-700">{(mTerminals.visa2Sum).toFixed(2)} ر</span>
                      </div>
                      {mTerminals.visa3Sum > 0 && (
                        <div className="flex justify-between py-1 bg-slate-50 px-2 rounded">
                          <span>بطاقة فيزا 3:</span>
                          <span className="font-mono font-bold text-slate-700">{(mTerminals.visa3Sum).toFixed(2)} ر</span>
                        </div>
                      )}
                      <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between text-slate-500 text-[10px]">
                        <span>رسوم الشبكة والكريدت المقتطعة:</span>
                        <span className="font-mono text-red-650 font-bold">-{mTerminals.totalFees.toFixed(2)} ر</span>
                      </div>
                      <div className="flex justify-between pt-1 font-bold text-indigo-700">
                        <span>صافي مبيعات الشبكة بالمروج:</span>
                        <span className="font-mono">{(mTerminals.totalNetPOS).toFixed(2)} ر</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Detailed expenses category breakdown table */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                  <TrendingDown className="w-4 h-4 text-rose-600" /> تحليل وتقسيط تفاصيل بنود المصروفات الدورية
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                  <table className="w-full text-sm text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-100 font-extrabold whitespace-nowrap">
                        <th className="p-3 border border-slate-800">اسم المصروف التشغيلي</th>
                        {showQ && <th className="p-3 border border-slate-800 text-left">فرع القادسية</th>}
                        {showM && <th className="p-3 border border-slate-800 text-left">فرع المروج</th>}
                        <th className="p-3 border border-slate-800 text-left">المجموع والتقسيط الكلي</th>
                        <th className="p-3 border border-slate-800 text-center">% من الدخل</th>
                        <th className="p-3 border border-slate-800 text-center">التقييم المحاسبي لإنفاق البند</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allExpList.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-400 font-bold border border-slate-200">
                            لا توجد تدوينات مصروفات مسجلة في هذا النطاق المالي للفروع المحددة.
                          </td>
                        </tr>
                      ) : (
                        allExpList.map((item) => (
                           <tr key={item.name} className="hover:bg-slate-50 border-b border-slate-100 font-semibold transition-colors duration-100">
                             <td className="p-3 border border-slate-200 text-slate-900 font-extrabold">{item.name}</td>
                             {showQ && <td className="p-3 border border-slate-200 text-left text-slate-700 font-mono">{item.q.toFixed(2)} ر</td>}
                             {showM && <td className="p-3 border border-slate-200 text-left text-slate-700 font-mono">{item.m.toFixed(2)} ر</td>}
                             <td className="p-3 border border-slate-200 text-left text-indigo-900 font-extrabold font-mono">{item.total.toFixed(2)} ر</td>
                             <td className="p-3 border border-slate-200 text-center font-extrabold text-slate-700 font-mono">{item.ratioOfRev.toFixed(1)}%</td>
                             <td className="p-3 border border-slate-200 text-center">
                              {item.ratioOfRev > 15 ? (
                                <span className="inline-block bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  ⚠️ مرتفع جداً
                                </span>
                              ) : item.ratioOfRev > 10 ? (
                                <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  🔔 إنفاق متوسط
                                </span>
                              ) : (
                                <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  ✅ طبيعي وضمن الهدف
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                      <tr className="bg-slate-50 font-extrabold text-slate-800 border-t-2 border-slate-200">
                        <td className="p-3 border border-slate-200">المجموع الكلي للمكامن المصروفة</td>
                        {showQ && <td className="p-3 border border-slate-200 text-left text-rose-600 font-mono">{allExpList.reduce((s, x) => s + x.q, 0).toFixed(2)} ر</td>}
                        {showM && <td className="p-3 border border-slate-200 text-left text-rose-600 font-mono">{allExpList.reduce((s, x) => s + x.m, 0).toFixed(2)} ر</td>}
                        <td className="p-3 border border-slate-200 text-left text-rose-700 font-black font-mono">{totalExp.toFixed(2)} ر</td>
                        <td className="p-3 border border-slate-200 text-center text-slate-800 font-mono">{totalRev > 0 ? ((totalExp / totalRev) * 100).toFixed(1) : 0}%</td>
                        <td className="p-3 border border-slate-200 bg-slate-50/50"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED DAILY LEDGER */}
          {activeSubTab === "ledger" && (
            <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-700" /> دفتر المحاسبة اليومي وحركات الصناديق المتفرقة
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">ابدأ البحث وتصفية الأيام، وانقر على "تفاصيل السند" لعرض تفاصيل وحركة كل يوم بشكل منفرد</p>
                </div>
                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    placeholder="ابحث بالتاريخ، الفرع، أو الملاحظة..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    className="w-full text-right px-3 py-1.5 pl-8 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                  <span className="absolute left-2.5 top-2 text-slate-400">🔍</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-xs">
                <table className="w-full text-sm text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-slate-100 font-extrabold whitespace-nowrap">
                      <th className="p-3 border border-slate-800">التاريخ</th>
                      <th className="p-3 border border-slate-800">الفرع</th>
                      <th className="p-3 border border-slate-800 text-left">مبيعات الإجمالي</th>
                      <th className="p-3 border border-slate-800 text-left">التحصيل كاش (صافي)</th>
                      <th className="p-3 border border-slate-800 text-left">تحصيل شبكة (صافي)</th>
                      <th className="p-3 border border-slate-800 text-left">التدفقات الخارجة والمستودع</th>
                      <th className="p-3 border border-slate-800 text-left">صافي الدخل المتبقي</th>
                      <th className="p-3 border border-slate-800 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredDays.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-bold border border-slate-200">
                          لا توجد نتائج تطابق بحثك الحالي في سجلات الدفتر اليومي.
                        </td>
                      </tr>
                    ) : (
                      filteredDays.map((d: any) => {
                        const dayExp = calcTotalDayExp(d);
                        return (
                          <tr key={d.id} className="hover:bg-indigo-50/30 font-semibold transition-colors">
                            <td className="p-3 border border-slate-200 font-extrabold font-mono text-slate-900">{d.date}</td>
                            <td className="p-3 border border-slate-200">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                d.branch === 'القادسية' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>{d.branch}</span>
                            </td>
                            <td className="p-3 border border-slate-200 text-left text-green-700 font-extrabold font-mono">{(d.total_sales || 0).toFixed(2)} ر</td>
                            <td className="p-3 border border-slate-200 text-left text-slate-700 font-mono">
                              {(d.cash_net || 0).toFixed(2)} ر
                              <span className="block text-[9px] text-slate-400 font-normal">درج: {(d.cash_box || 0).toFixed(2)} ر</span>
                            </td>
                            <td className="p-3 border border-slate-200 text-left text-slate-700 font-mono">{(d.pos_net || 0).toFixed(2)} ر</td>
                            <td className="p-3 border border-slate-200 text-left text-red-600 font-mono font-bold">{dayExp.toFixed(2)} ر</td>
                            <td className={`p-3 border border-slate-200 text-left font-mono font-black ${d.net_day >= 0 ? "text-indigo-800 bg-indigo-50/10" : "text-amber-800 bg-amber-50/10"}`}>
                              {(d.net_day || 0).toFixed(2)} ر
                            </td>
                            <td className="p-3 border border-slate-200 text-center">
                              <button
                                type="button"
                                onClick={() => setInspectedDay(d)}
                                className="px-2.5 py-1 text-[11px] font-extrabold bg-indigo-55 text-indigo-100 hover:bg-indigo-65 rounded-lg cursor-pointer transition-colors"
                              >
                                🔎 تفاصيل السند
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: INSTALLMENTS MATCHING & ACCOUNT AUDIT */}
          {activeSubTab === "installments" && (
            <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-700" />
                  <h3 className="text-base font-extrabold text-slate-900 font-sans">📑 متابعة وحساب الأرصدة والعهد</h3>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded">معالجة خلفية متصلة بالخوارزمية المحاسبية للفرع</span>
              </div>

              {showQ && (() => {
                const qInstallments = computeInstallmentsReport(reportData.qData || []);
                if (qInstallments.length === 0) return null;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <span className="w-2.5 h-2.5 bg-indigo-700 rounded-full"></span>
                      <span>فرع القادسية - تصفية قيود أقساط العهد ومطابقة الأرصدة المتراكمة</span>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                      <table className="w-full text-sm text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-100 font-extrabold whitespace-nowrap">
                            <th className="p-3 border border-slate-800">بند التقسيط المجدول</th>
                            <th className="p-3 border border-slate-800 text-left">الرصيد الافتتاحي المرحل (أمس)</th>
                            <th className="p-3 border border-slate-800 text-left">إجمالي الفواتير المضافة (الفترة)</th>
                            <th className="p-3 border border-slate-800 text-left">إجمالي الأقساط المخصومة (التسديد)</th>
                            <th className="p-3 border border-slate-800 text-left bg-indigo-950">صافي الرصيد النهائي للغد</th>
                            <th className="p-3 border border-slate-800 text-center">حالة المطابقة الرياضية والتدقيق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {qInstallments.map((item) => (
                            <tr key={item.key} className="hover:bg-indigo-50/20 font-semibold transition-colors">
                              <td className="p-3 border border-slate-200 text-slate-900 font-extrabold">{item.name}</td>
                              <td className="p-3 border border-slate-200 text-left text-slate-650 font-mono">{item.startBalance.toFixed(2)} ر</td>
                              <td className="p-3 border border-slate-200 text-left text-blue-700 font-extrabold font-mono">+{item.totalNewSupples.toFixed(2)} ر</td>
                              <td className="p-3 border border-slate-200 text-left text-rose-600 font-extrabold font-mono">-{item.totalDeductedExp.toFixed(2)} ر</td>
                              <td className="p-3 border border-slate-200 text-left text-indigo-900 font-black font-mono bg-indigo-100/30">{item.endBalance.toFixed(2)} ر</td>
                              <td className="p-3 border border-slate-200 text-center">
                                {item.isMatched ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-850 border border-emerald-150 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                                    <span>🟢 مطابق 100%</span>
                                    <span className="text-[9px] text-emerald-600 hidden md:inline">({item.startBalance.toFixed(2)} + {item.totalNewSupples.toFixed(2)} - {item.totalDeductedExp.toFixed(2)} = {item.endBalance.toFixed(2)})</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-150 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                                    <span>🔴 فارق متبقي</span>
                                    <span className="text-[9px] font-mono font-bold">({item.difference.toFixed(2)} ر)</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {showM && (() => {
                const mInstallments = computeInstallmentsReport(reportData.mData || []);
                if (mInstallments.length === 0) return null;
                return (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <span className="w-2.5 h-2.5 bg-amber-600 rounded-full"></span>
                      <span>فرع المروج - تصفية قيق ومطابقة الأرصدة المتراكمة</span>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                      <table className="w-full text-sm text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-100 font-extrabold whitespace-nowrap">
                            <th className="p-3 border border-slate-800">بند التقسيط المجدول</th>
                            <th className="p-3 border border-slate-800 text-left">الرصيد الافتتاحي المرحل (أمس)</th>
                            <th className="p-3 border border-slate-800 text-left">إجمالي الفواتير المضافة (الفترة)</th>
                            <th className="p-3 border border-slate-800 text-left">إجمالي الأقساط المخصومة (التسديد)</th>
                            <th className="p-3 border border-slate-800 text-left bg-indigo-950">صافي الرصيد النهائي للغد</th>
                            <th className="p-3 border border-slate-800 text-center">حالة المطابقة الرياضية والتدقيق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {mInstallments.map((item) => (
                            <tr key={item.key} className="hover:bg-indigo-50/20 font-semibold transition-colors">
                              <td className="p-3 border border-slate-200 text-slate-900 font-extrabold">{item.name}</td>
                              <td className="p-3 border border-slate-200 text-left text-slate-650 font-mono">{item.startBalance.toFixed(2)} ر</td>
                              <td className="p-3 border border-slate-200 text-left text-blue-700 font-extrabold font-mono">+{item.totalNewSupples.toFixed(2)} ر</td>
                              <td className="p-3 border border-slate-200 text-left text-rose-600 font-extrabold font-mono">-{item.totalDeductedExp.toFixed(2)} ر</td>
                              <td className="p-3 border border-slate-200 text-left text-indigo-900 font-black font-mono bg-indigo-100/30">{item.endBalance.toFixed(2)} ر</td>
                              <td className="p-3 border border-slate-200 text-center">
                                {item.isMatched ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-850 border border-emerald-150 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                                    <span>🟢 مطابق 100%</span>
                                    <span className="text-[9px] text-emerald-600 hidden md:inline">({item.startBalance.toFixed(2)} + {item.totalNewSupples.toFixed(2)} - {item.totalDeductedExp.toFixed(2)} = {item.endBalance.toFixed(2)})</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 border border-rose-150 text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                                    <span>🔴 فارق متبقي</span>
                                    <span className="text-[9px] font-mono font-bold">({item.difference.toFixed(2)} ر)</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: MANAGERS WRITTEN NOTES TIMELINE */}
          {activeSubTab === "notes" && (
            <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" /> سجل الملاحظات والتقارير الإدارية من أرض الواقع
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">خط زمني يجمع كافة الملاحظات التعليقية المضافة في هذا النطاق المالي للفروع لمتابعة الجودة التشغيلية</p>
              </div>

              <div className="space-y-4">
                {[...(reportData?.qData || []), ...(reportData?.mData || [])]
                  .filter((d: any) => d.notes && d.notes.trim() !== "")
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .length === 0 ? (
                    <div className="text-center p-8 text-slate-400 font-bold text-xs">
                      لا توجد ملاحظات إدارية مدونة للفترة والخيارات المحددة.
                    </div>
                  ) : (
                    [...(reportData?.qData || []), ...(reportData?.mData || [])]
                      .filter((d: any) => d.notes && d.notes.trim() !== "")
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((d: any, idx) => (
                        <div key={idx} className="flex gap-4 p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 hover:bg-slate-55 transition-colors">
                          <div className="space-y-1 text-center flex-shrink-0 w-24 border-l border-slate-200 pl-3">
                            <span className="font-extrabold text-[#111] block text-xs font-mono">{d.date}</span>
                            <span className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${
                              d.branch === 'القادسية' ? 'bg-indigo-150 text-indigo-800' : 'bg-amber-150 text-amber-800'
                            }`}>{d.branch}</span>
                          </div>
                          <div className="space-y-1 text-right flex-1">
                            <span className="text-[10.5px] text-slate-400 font-bold block">ملاحظة حركة الإغلاق:</span>
                            <p className="text-slate-850 text-xs italic font-medium leading-relaxed">"{d.notes}"</p>
                          </div>
                        </div>
                      ))
                  )}
              </div>
            </div>
          )}

          {/* Checklists audit box */}
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-extrabold text-sm text-slate-800">التدريب والمصادقة المحاسبية للفترة</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                تظهر هذه الأرقام حصيلة العمليات المالية الموحدة في المطبخ ومواقع مبيعات فرعي القادسية والمروج. يرجى مراجعة قيم ترحيل العهد "خزائن الديزل والصلصات البلاستيكية" لضمان عدم تكدس الفواتير في نهاية الأسبوع. القيم الضريبية تتوافق مع نظام الفاتورة المتكامل.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING DAY VOUCHER MODAL */}
      {inspectedDay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col text-right animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="border-b border-slate-100 p-5 flex items-center justify-between bg-slate-50 flex-row-reverse pb-4">
              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="p-1 px-3 rounded-lg text-slate-450 hover:text-slate-700 hover:bg-slate-100 cursor-pointer font-black text-sm"
              >
                ✕ إغلاق
              </button>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-700" />
                <h3 className="font-extrabold text-slate-800 text-base font-sans">
                  سند التفصيل والتدقيق الرياضي • {inspectedDay.branch} ({inspectedDay.date})
                </h3>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 text-slate-800">
              {/* Branch Summary KPI bar */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl text-center">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">إجمالي مبيعات اليوم</span>
                  <span className="font-extrabold text-base text-green-700">{(inspectedDay.total_sales || 0).toFixed(2)} ر</span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="text-[10px] text-slate-500 font-bold block">صافي مبيعات الكاش</span>
                  <span className="font-extrabold text-base text-slate-700">{(inspectedDay.cash_net || 0).toFixed(2)} ر</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block">صافي مبيعات الشبكة</span>
                  <span className="font-extrabold text-base text-indigo-700">{(inspectedDay.pos_net || 0).toFixed(2)} ر</span>
                </div>
              </div>

              {/* Cash Box accounting detailed audit */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-indigo-900 border-b border-slate-100 pb-1 flex items-center gap-1">💰 جرد ومطابقة حركة النقد (الدرج)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-sans">
                  <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[10px]">الكاش بالدرج:</span>
                    <span className="font-bold">{(inspectedDay.cash_box || 0).toFixed(2)} ر</span>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[10px]">الصرف الافتراضي:</span>
                    <span className="font-bold text-red-500 font-mono">-{ (inspectedDay.sarf ?? 350).toFixed(2) } ر</span>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                    <span className="text-slate-500 block text-[10px]">دفعات المشتريات كاش:</span>
                    <span className="font-bold text-emerald-600">+{ (inspectedDay.cash_purchases || 0).toFixed(2) } ر</span>
                  </div>
                  <div className="bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-indigo-700 block text-[10px] font-bold">صافي الكاش المحتسب:</span>
                    <span className="font-bold text-indigo-900">{(inspectedDay.cash_net || 0).toFixed(2)} ر</span>
                  </div>
                </div>
              </div>

              {/* POS Machine Detailed breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-indigo-900 border-b border-slate-100 pb-1">🏧 تفصيل ومبيعات أجهزة الشبكة و مدى</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50/50 p-2 rounded">
                    <span className="text-slate-500 block text-[10px]">مدى جهاز 1:</span>
                    <span className="font-bold">{(inspectedDay.mada1 || 0).toFixed(2)} ر</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 rounded">
                    <span className="text-slate-500 block text-[10px]">مدى جهاز 2:</span>
                    <span className="font-bold">{(inspectedDay.mada2 || 0).toFixed(2)} ر</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 rounded">
                    <span className="text-slate-500 block text-[10px]">مدى جهاز 3:</span>
                    <span className="font-bold">{(inspectedDay.mada3 || 0).toFixed(2)} ر</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 rounded">
                    <span className="text-slate-500 block text-[10px]">فيزا جهاز 1:</span>
                    <span className="font-bold">{(inspectedDay.visa1 || 0).toFixed(2)} ر</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 rounded">
                    <span className="text-slate-500 block text-[10px]">فيزا جهاز 2:</span>
                    <span className="font-bold">{(inspectedDay.visa2 || 0).toFixed(2)} ر</span>
                  </div>
                  <div className="bg-slate-50/50 p-2 rounded">
                    <span className="text-slate-500 block text-[10px]">فيزا جهاز 3:</span>
                    <span className="font-bold">{(inspectedDay.visa3 || 0).toFixed(2)} ر</span>
                  </div>
                </div>
              </div>

              {/* Detailed listed expenses breakdown of the day */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-[#991b1b] border-b border-rose-100 pb-1">📉 قائمة وطبيعة المصروفات المخصومة باليوم</h4>
                <div className="overflow-x-auto border border-slate-100 rounded-lg">
                  <table className="w-full text-xs text-right text-slate-750">
                    <thead>
                      <tr className="bg-slate-100 font-bold">
                        <th className="p-2">البند المحاسبي لتوزيع النفقة</th>
                        <th className="p-2">تفاصيل الدفع / التسجيل</th>
                        <th className="p-2 text-left">قيمة الخصم بالريال</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectedDay.makhzan > 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">حساب المستودع المالي</td>
                          <td className="p-2">تحويل مستودع مركزي</td>
                          <td className="p-2 text-left text-red-500">-{inspectedDay.makhzan.toFixed(2)} ر</td>
                        </tr>
                      )}
                      {inspectedDay.pepsi_deduct > 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">بيبسي ومشروبات</td>
                          <td className="p-2">الخصم وقسط اليوم (المباع والمباع نقداً / {inspectedDay.pepsi_type || "payment"})</td>
                          <td className="p-2 text-left text-red-500">-{inspectedDay.pepsi_deduct.toFixed(2)} ر</td>
                        </tr>
                      )}
                      {inspectedDay.plastic_deduct > 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">بلاستيك وتغليف</td>
                          <td className="p-2">تأمين مغلفات وحوافز عهد ({inspectedDay.plastic_type || "payment"})</td>
                          <td className="p-2 text-left text-red-500">-{inspectedDay.plastic_deduct.toFixed(2)} ر</td>
                        </tr>
                      )}
                      {inspectedDay.sauces_deduct > 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">صوصات وصلصات أولية</td>
                          <td className="p-2">مواد خام وتوريد مطبخ ({inspectedDay.sauces_type || "payment"})</td>
                          <td className="p-2 text-left text-red-500">-{inspectedDay.sauces_deduct.toFixed(2)} ر</td>
                        </tr>
                      )}
                      {inspectedDay.gas > 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">مصروف الغاز</td>
                          <td className="p-2">استهلاك اسطوانات وخزانات مخصوم</td>
                          <td className="p-2 text-left text-red-500">-{inspectedDay.gas.toFixed(2)} ر</td>
                        </tr>
                      )}
                      {inspectedDay.vegetables > 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">مصروف خضار ومواد طازجة</td>
                          <td className="p-2">تأمين حلقة الخضروات للفروع</td>
                          <td className="p-2 text-left text-red-500">-{inspectedDay.vegetables.toFixed(2)} ر</td>
                        </tr>
                      )}
                      {inspectedDay.bread > 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">بند الخبز والمخابز</td>
                          <td className="p-2">تأمين صمون وأرغفة الطهي بالفرع</td>
                          <td className="p-2 text-left text-red-500">-{inspectedDay.bread.toFixed(2)} ر</td>
                        </tr>
                      )}
                      {inspectedDay.grocery > 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">مشتريات البقالة والموارد</td>
                          <td className="p-2">تجهيز مستلزمات طهي جافة</td>
                          <td className="p-2 text-left text-red-500">-{inspectedDay.grocery.toFixed(2)} ر</td>
                        </tr>
                      )}
                      {inspectedDay.diesel_deduct > 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">ميزانية وقود المطبخ (ديزل)</td>
                          <td className="p-2">قسط أو تسديد برميل المحرك ({inspectedDay.diesel_type || "payment"})</td>
                          <td className="p-2 text-left text-red-500">-{inspectedDay.diesel_deduct.toFixed(2)} ر</td>
                        </tr>
                      )}
                      {inspectedDay.fixed_deduct > 0 && (
                        <tr className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">الخصوم والالتزامات الثابتة</td>
                          <td className="p-2">{inspectedDay.fixed_note || "إيجار/قسط ديون ثابت"}</td>
                          <td className="p-2 text-left text-red-500">-{inspectedDay.fixed_deduct.toFixed(2)} ر</td>
                        </tr>
                      )}
                      
                      {/* Sub-arrays other expenses detail */}
                      {(inspectedDay.others || []).map((o: any, idx: number) => o.amt > 0 && (
                        <tr key={`o-${idx}`} className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">مصروف تشغيلي طارئ</td>
                          <td className="p-2">{o.name || "بيان متفرق غامض"}</td>
                          <td className="p-2 text-left text-red-500">-{o.amt.toFixed(2)} ر</td>
                        </tr>
                      ))}
                      {(inspectedDay.pur_extras || []).map((e: any, idx: number) => e.amt > 0 && (
                        <tr key={`e-${idx}`} className="border-t border-slate-100">
                          <td className="p-2 font-bold text-slate-800">شراء مواد إضافية للمطبخ</td>
                          <td className="p-2">{e.name || "مشتريات طارئة أخرى"}</td>
                          <td className="p-2 text-left text-red-500">-{e.amt.toFixed(2)} ر</td>
                        </tr>
                      ))}
                      
                      <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200">
                        <td className="p-2" colSpan={2}>المجموع والخصومات الكلية لليوم</td>
                        <td className="p-2 text-left text-red-600">-{calcTotalDayExp(inspectedDay).toFixed(2)} ر</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Written daily Notes */}
              {inspectedDay.notes && (
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-dashed border-indigo-150">
                  <span className="text-[10px] text-indigo-700 block font-bold">📝 ملحوظة المشرف المشغّل لليوم:</span>
                  <p className="text-xs italic text-slate-800 leading-relaxed font-semibold mt-1">"{inspectedDay.notes}"</p>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-between gap-2 flex-row-reverse">
              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 cursor-pointer transition-colors"
              >
                حسناً، تم التدقيق والتحقق!
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
              >
                🖨️ طباعة السند المالي المفتوح
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
