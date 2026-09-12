import React, { useState, useEffect } from "react";
import { 
  Building2, Calendar, Clock, CheckCircle2, AlertCircle, 
  Send, RefreshCw, DollarSign, CreditCard, ShoppingBag, 
  FileText, ShieldCheck, UserCheck, Inbox, Search
} from "lucide-react";
import { DailyEntry } from "../types";

interface SecondAccountantTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
  userBranch: string;
  userName?: string;
}

export default function SecondAccountantTab({ 
  onShowToast, 
  userRole, 
  userBranch, 
  userName 
}: SecondAccountantTabProps) {
  const [branch, setBranch] = useState<"القادسية" | "المروج">(
    userBranch === "المروج" ? "المروج" : "القادسية"
  );
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentEntries, setRecentEntries] = useState<DailyEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DailyEntry | null>(null);

  // Form states
  const [sarf, setSarf] = useState<number>(350);
  const [cashBox, setCashBox] = useState<string>("");
  
  // Purchases
  const [purGas, setPurGas] = useState<string>("");
  const [purBread, setPurBread] = useState<string>("");
  const [purVeg, setPurVeg] = useState<string>("");
  const [purGroc, setPurGroc] = useState<string>("");

  // POS
  const [mada1, setMada1] = useState<string>("");
  const [mada2, setMada2] = useState<string>("");
  const [mada3, setMada3] = useState<string>("");
  const [visa1, setVisa1] = useState<string>("");
  const [visa2, setVisa2] = useState<string>("");
  const [visa3, setVisa3] = useState<string>("");

  // Suppliers
  const [pepsiPaid, setPepsiPaid] = useState<string>("");
  const [plasticPaid, setPlasticPaid] = useState<string>("");
  const [saucesPaid, setSaucesPaid] = useState<string>("");
  const [dieselPaid, setDieselPaid] = useState<string>("");

  const [notes, setNotes] = useState<string>("");

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/days");
      if (res.ok) {
        const data: DailyEntry[] = await res.json();
        setRecentEntries(data);
      }
    } catch (err) {
      console.error(err);
      onShowToast("⚠️ خطأ في جلب بيانات الأيام السابقة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  // When date or branch changes, check if an entry exists
  useEffect(() => {
    const existing = recentEntries.find(d => d.date === date && d.branch === branch);
    if (existing) {
      setSelectedEntry(existing);
      setSarf(existing.sarf ?? 350);
      setCashBox(existing.cash_box ? String(existing.cash_box) : "");
      setPurGas(existing.pur_gas ? String(existing.pur_gas) : "");
      setPurBread(existing.pur_bread ? String(existing.pur_bread) : "");
      setPurVeg(existing.pur_veg ? String(existing.pur_veg) : "");
      setPurGroc(existing.pur_groc ? String(existing.pur_groc) : "");
      setMada1(existing.mada1 ? String(existing.mada1) : "");
      setMada2(existing.mada2 ? String(existing.mada2) : "");
      setMada3(existing.mada3 ? String(existing.mada3) : "");
      setVisa1(existing.visa1 ? String(existing.visa1) : "");
      setVisa2(existing.visa2 ? String(existing.visa2) : "");
      setVisa3(existing.visa3 ? String(existing.visa3) : "");
      setPepsiPaid(existing.pepsi_paid ? String(existing.pepsi_paid) : "");
      setPlasticPaid(existing.plastic_paid ? String(existing.plastic_paid) : "");
      setSaucesPaid(existing.sauces_paid ? String(existing.sauces_paid) : "");
      setDieselPaid(existing.diesel_paid ? String(existing.diesel_paid) : "");
      setNotes(existing.notes || "");
    } else {
      setSelectedEntry(null);
      setCashBox("");
      setPurGas("");
      setPurBread("");
      setPurVeg("");
      setPurGroc("");
      setMada1("");
      setMada2("");
      setMada3("");
      setVisa1("");
      setVisa2("");
      setVisa3("");
      setPepsiPaid("");
      setPlasticPaid("");
      setSaucesPaid("");
      setDieselPaid("");
      setNotes("");
    }
  }, [date, branch, recentEntries]);

  // POS & Purchases Totals Calculation
  const totalMada = (parseFloat(mada1) || 0) + (parseFloat(mada2) || 0) + (parseFloat(mada3) || 0);
  const totalVisa = (parseFloat(visa1) || 0) + (parseFloat(visa2) || 0) + (parseFloat(visa3) || 0);
  const totalPurchases = (parseFloat(purGas) || 0) + (parseFloat(purBread) || 0) + (parseFloat(purVeg) || 0) + (parseFloat(purGroc) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashBox && totalMada === 0) {
      onShowToast("⚠️ يرجى إدخال مبالغ الصندوق أو الشبكات");
      return;
    }

    try {
      setSubmitting(true);
      const payload: Partial<DailyEntry> = {
        id: `${branch}-${date}`,
        branch,
        date,
        sarf: Number(sarf) || 350,
        cash_box: parseFloat(cashBox) || 0,
        pur_gas: parseFloat(purGas) || 0,
        pur_bread: parseFloat(purBread) || 0,
        pur_veg: parseFloat(purVeg) || 0,
        pur_groc: parseFloat(purGroc) || 0,
        mada1: parseFloat(mada1) || 0,
        mada2: parseFloat(mada2) || 0,
        mada3: parseFloat(mada3) || 0,
        visa1: parseFloat(visa1) || 0,
        visa2: parseFloat(visa2) || 0,
        visa3: parseFloat(visa3) || 0,
        pepsi_paid: parseFloat(pepsiPaid) || 0,
        plastic_paid: parseFloat(plasticPaid) || 0,
        sauces_paid: parseFloat(saucesPaid) || 0,
        diesel_paid: parseFloat(dieselPaid) || 0,
        notes: notes ? `${notes} (تدقيق: المحاسب الثاني ${userName || ""})` : `تدقيق المحاسب الثاني ${userName || ""}`,
        // Flag for management audit review
        review_status: "pending_review",
        entered_by: "محاسب ثان",
      };

      const res = await fetch("/api/days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onShowToast("✅ تم إرسال اليومية للمدير بنجاح بانتظار المراجعة والاعتماد");
        fetchEntries();
      } else {
        const errData = await res.json();
        onShowToast(`❌ فشل الإرسال: ${errData.error || "خطأ غير معروف"}`);
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ أثناء الإرسال للمخدم");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">بوابة المحاسب الثاني</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                تدقيق وإرسال للمدير
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              إدخال ومطابقة إيرادات الصندوق ونقاط البيع ومشتريات الفروع وإحالتها للمدير للاعتماد
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchEntries}
          className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث السجلات</span>
        </button>
      </div>

      {/* Existing entry notice banner */}
      {selectedEntry && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-bold ${
          selectedEntry.review_status === "pending_review"
            ? "bg-amber-50 border-amber-300 text-amber-900"
            : "bg-emerald-50 border-emerald-300 text-emerald-900"
        }`}>
          <div className="flex items-center gap-2">
            {selectedEntry.review_status === "pending_review" ? (
              <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            )}
            <span>
              {selectedEntry.review_status === "pending_review"
                ? `هذا السجل مرسل مسبقاً وبانتظار اعتماد المدير لفرع ${branch} بتاريخ ${date}`
                : `هذا السجل معتمد رسمياً في النظام لفرع ${branch} بتاريخ ${date}`}
            </span>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-white/80 border font-mono">
            المبيعات: {selectedEntry.total_sales ? selectedEntry.total_sales.toLocaleString("ar-SA") : "0"} ريال
          </span>
        </div>
      )}

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branch & Date selection */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>تحديد الفرع وتاريخ اليومية</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">الفرع:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBranch("القادسية")}
                  disabled={userBranch === "المروج"}
                  className={`py-2.5 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                    branch === "القادسية"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  } disabled:opacity-50`}
                >
                  📍 القادسية
                </button>
                <button
                  type="button"
                  onClick={() => setBranch("المروج")}
                  disabled={userBranch === "القادسية"}
                  className={`py-2.5 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                    branch === "المروج"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  } disabled:opacity-50`}
                >
                  📍 المروج
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">تاريخ اليومية:</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">الصرف الافتتاحي (عهدة الكاش):</label>
              <input
                type="number"
                value={sarf}
                onChange={(e) => setSarf(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Cash & POS Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cash Box */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>إيراد الصندوق الفعلي (كاش)</span>
            </h3>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">مجموع الكاش في الصندوق (ريال):</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cashBox}
                onChange={(e) => setCashBox(e.target.value)}
                className="w-full px-3.5 py-2.5 text-base border-2 border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:border-emerald-500 font-black text-slate-900"
              />
              <p className="text-[11px] text-slate-400">يشمل الكاش الفعلي المقبوض مضافاً إليه عهدة الصرف</p>
            </div>
          </div>

          {/* POS networks */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>نقاط البيع (الشبكات)</span>
              </h3>
              <span className="text-xs font-black text-indigo-700 font-mono">
                المجموع: {(totalMada + totalVisa).toFixed(2)} ريال
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600">مدى 1:</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mada1}
                  onChange={(e) => setMada1(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600">مدى 2:</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mada2}
                  onChange={(e) => setMada2(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600">مدى 3:</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={mada3}
                  onChange={(e) => setMada3(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600">فيزا 1:</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={visa1}
                  onChange={(e) => setVisa1(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600">فيزا 2:</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={visa2}
                  onChange={(e) => setVisa2(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-600">فيزا 3:</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={visa3}
                  onChange={(e) => setVisa3(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Cash Purchases */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-purple-600" />
              <span>مشتريات اليومية المباشرة (نقداً)</span>
            </h3>
            <span className="text-xs font-black text-purple-700 font-mono">
              إجمالي المشتريات: {totalPurchases.toFixed(2)} ريال
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">غاز:</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={purGas}
                onChange={(e) => setPurGas(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">خبز:</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={purBread}
                onChange={(e) => setPurBread(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">خضار:</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={purVeg}
                onChange={(e) => setPurVeg(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">بقالة / مواد:</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={purGroc}
                onChange={(e) => setPurGroc(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold"
              />
            </div>
          </div>
        </div>

        {/* Suppliers & Invoices Payments */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>سداد الموردين والشركات (إن وجد)</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">سداد بيبسي:</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={pepsiPaid}
                onChange={(e) => setPepsiPaid(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">سداد بلاستيك:</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={plasticPaid}
                onChange={(e) => setPlasticPaid(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">سداد صلصات:</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={saucesPaid}
                onChange={(e) => setSaucesPaid(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">سداد ديزل:</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={dieselPaid}
                onChange={(e) => setDieselPaid(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold"
              />
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <label className="block text-xs font-bold text-slate-700">ملاحظات وتدقيق المحاسب الثاني:</label>
            <textarea
              rows={2}
              placeholder="اكتب أي ملاحظة أو فروقات أو تفاصيل تدقيق هنا ليراها المدير أثناء الاعتماد..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-medium"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>سيتم وضع علامة "بانتظار مراجعة المدير" مع حفظ اسمك في السجل</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>إرسال اليومية للمدير للاعتماد</span>
          </button>
        </div>
      </form>

      {/* Recent submissions table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Inbox className="w-4 h-4 text-indigo-600" />
          <span>سجل اليوميات المرسلة والمدققة حديثاً</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <th className="p-3">التاريخ</th>
                <th className="p-3">الفرع</th>
                <th className="p-3">الكاش الصافي</th>
                <th className="p-3">إجمالي الشبكات</th>
                <th className="p-3">المبيعات الإجمالية</th>
                <th className="p-3">حالة الاعتماد</th>
                <th className="p-3">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentEntries.slice(0, 10).map((item) => {
                const isPending = item.review_status === "pending_review" || item.entered_by === "محاسب ثان";
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-900">{item.date}</td>
                    <td className="p-3 font-bold text-slate-700">{item.branch}</td>
                    <td className="p-3 font-mono text-emerald-700 font-bold">
                      {item.cash_net ? item.cash_net.toFixed(2) : (item.cash_box ? item.cash_box.toFixed(2) : "-")}
                    </td>
                    <td className="p-3 font-mono text-indigo-700 font-bold">
                      {item.pos_net ? item.pos_net.toFixed(2) : "-"}
                    </td>
                    <td className="p-3 font-mono font-black text-slate-900">
                      {item.total_sales ? item.total_sales.toFixed(2) : "-"}
                    </td>
                    <td className="p-3">
                      {isPending ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">
                          بانتظار اعتماد المدير
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                          معتمد ومقفل
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDate(item.date);
                          setBranch(item.branch);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                      >
                        تحميل وتعديل
                      </button>
                    </td>
                  </tr>
                );
              })}
              {recentEntries.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400 font-medium">
                    لا توجد يوميات مدخلة حتى الآن
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
