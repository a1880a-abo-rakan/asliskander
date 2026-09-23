import React, { useState, useEffect } from "react";
import { Settings, Save, RefreshCw, Sliders, ShieldAlert, Sparkles, Percent, DollarSign, Fuel, Layers, Trash2, Zap, CheckCircle2 } from "lucide-react";
import { Settings as AppSettings } from "../types";

interface SettingsTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  رسوم_مدى: 0.8,
  رسوم_فيزا: 1.5,
  صرف_افتراضي: 350,
  سقف_بيبسي: 400,
  سقف_بيبسي_قادسية: 400,
  سقف_بيبسي_مروج: 400,
  سقف_بلاستيك: 100,
  سقف_بلاستيك_قادسية: 100,
  سقف_بلاستيك_مروج: 100,
  سقف_صلصات: 150,
  سقف_صلصات_قادسية: 150,
  سقف_صلصات_مروج: 150,
  سقف_ديزل_قادسية: 50,
  سقف_ديزل_مروج: 30,
  زيادة_عالي: 25,
  نسبة_قادسية_ديزل: 70,
  نسبة_مروج_ديزل: 30,
  ايام_مقارنة: 7,
  سقف_نسبة_السلفة_القصوى: 50,
};

export default function SettingsTab({ onShowToast, userRole }: SettingsTabProps) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<string | null>(null);

  const handleSystemCleanup = async () => {
    if (userRole !== "مدير") {
      onShowToast("⛔ متاح للمدير فقط");
      return;
    }
    setCleaning(true);
    setCleanupResult(null);
    try {
      const res = await fetch("/api/app-state/cleanup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCleanupResult(data.message || "تم تنظيف وتسريع النظام بنجاح!");
        onShowToast("⚡ تم تنظيف الذاكرة المؤقتة وتسريع النظام بنجاح!");
      } else {
        onShowToast("⚠️ " + (data.error || "فشل تنظيف النظام"));
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ أثناء الاتصال بالخادم لتنظيف النظام");
    } finally {
      setCleaning(false);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      } else {
        onShowToast("⚠️ تعذر تحميل الإعدادات من الخادم");
      }
    } catch (err) {
      console.error(err);
      onShowToast("⚠️ خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== "مدير") {
      onShowToast("⛔ عذراً، تعديل الإعدادات متاح للمدير فقط");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        onShowToast("✅ تم حفظ الإعدادات وقواعد المحاسبة بنجاح");
      } else {
        onShowToast("❌ فشل في حفظ الإعدادات");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ أثناء إرسال الإعدادات");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: keyof AppSettings, val: string) => {
    const parsed = parseFloat(val);
    setSettings((prev) => ({
      ...prev,
      [key]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-sm font-bold text-slate-600">جاري تحميل إعدادات وقواعد النظام...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">إعدادات المحاسبة والتحكم بالأسقف</h2>
            <p className="text-xs text-slate-500 font-medium">
              ضبط الرسوم البنكية، سقوف استقطاع الموردين، نسب توزيع الديزل بين الفروع
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchSettings}
          className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-slate-200"
        >
          <RefreshCw className="w-4 h-4" />
          <span>إعادة تحميل</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Banking Fees & Default Cash Box */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Percent className="w-4 h-4 text-indigo-600" />
            <span>رسوم نقاط البيع والصرف الافتراضي</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">عمولة مدى (%):</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={settings.رسوم_مدى}
                  onChange={(e) => updateField("رسوم_مدى", e.target.value)}
                  disabled={userRole !== "مدير"}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[10px] text-slate-400">النسبة الافتراضية المخصومة من عمليات مدى</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">عمولة فيزا / ماستر (%):</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={settings.رسوم_فيزا}
                  onChange={(e) => updateField("رسوم_فيزا", e.target.value)}
                  disabled={userRole !== "مدير"}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[10px] text-slate-400">النسبة المخصومة من البطاقات الائتمانية</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">الصرف الافتراضي الثابت (ريال):</label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  value={settings.صرف_افتراضي}
                  onChange={(e) => updateField("صرف_افتراضي", e.target.value)}
                  disabled={userRole !== "مدير"}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                />
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">ريال</span>
              </div>
              <p className="text-[10px] text-slate-400">قيمة عهدة الصرف الافتتاحية للصندوق يومياً</p>
            </div>
          </div>
        </div>

        {/* Suppliers Daily Deduction Ceilings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>سقوف الاستقطاع اليومي للموردين (حسب الفروع)</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* فرع القادسية */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                <span>📍 فرع القادسية</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">سقف بيبسي:</label>
                  <input
                    type="number"
                    value={settings.سقف_بيبسي_قادسية}
                    onChange={(e) => updateField("سقف_بيبسي_قادسية", e.target.value)}
                    disabled={userRole !== "مدير"}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">سقف البلاستيك:</label>
                  <input
                    type="number"
                    value={settings.سقف_بلاستيك_قادسية}
                    onChange={(e) => updateField("سقف_بلاستيك_قادسية", e.target.value)}
                    disabled={userRole !== "مدير"}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">سقف الصلصات:</label>
                  <input
                    type="number"
                    value={settings.سقف_صلصات_قادسية}
                    onChange={(e) => updateField("سقف_صلصات_قادسية", e.target.value)}
                    disabled={userRole !== "مدير"}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">سقف الديزل:</label>
                  <input
                    type="number"
                    value={settings.سقف_ديزل_قادسية}
                    onChange={(e) => updateField("سقف_ديزل_قادسية", e.target.value)}
                    disabled={userRole !== "مدير"}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* فرع المروج */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                <span>📍 فرع المروج</span>
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">سقف بيبسي:</label>
                  <input
                    type="number"
                    value={settings.سقف_بيبسي_مروج}
                    onChange={(e) => updateField("سقف_بيبسي_مروج", e.target.value)}
                    disabled={userRole !== "مدير"}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">سقف البلاستيك:</label>
                  <input
                    type="number"
                    value={settings.سقف_بلاستيك_مروج}
                    onChange={(e) => updateField("سقف_بلاستيك_مروج", e.target.value)}
                    disabled={userRole !== "مدير"}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">سقف الصلصات:</label>
                  <input
                    type="number"
                    value={settings.سقف_صلصات_مروج}
                    onChange={(e) => updateField("سقف_صلصات_مروج", e.target.value)}
                    disabled={userRole !== "مدير"}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-600">سقف الديزل:</label>
                  <input
                    type="number"
                    value={settings.سقف_ديزل_مروج}
                    onChange={(e) => updateField("سقف_ديزل_مروج", e.target.value)}
                    disabled={userRole !== "مدير"}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diesel & Advanced Analytics Ratios */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Fuel className="w-4 h-4 text-amber-600" />
            <span>نسب توزيع فواتير الديزل وقواعد المقارنة</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">نسبة القادسية من الديزل (%):</label>
              <input
                type="number"
                value={settings.نسبة_قادسية_ديزل}
                onChange={(e) => updateField("نسبة_قادسية_ديزل", e.target.value)}
                disabled={userRole !== "مدير"}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-400">حصة القادسية عند تسجيل فاتورة ديزل مركزية</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">نسبة المروج من الديزل (%):</label>
              <input
                type="number"
                value={settings.نسبة_مروج_ديزل}
                onChange={(e) => updateField("نسبة_مروج_ديزل", e.target.value)}
                disabled={userRole !== "مدير"}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-400">حصة المروج عند تسجيل فاتورة ديزل مركزية</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">زيادة أيام الضغط (%):</label>
              <input
                type="number"
                value={settings.زيادة_عالي}
                onChange={(e) => updateField("زيادة_عالي", e.target.value)}
                disabled={userRole !== "مدير"}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-400">نسبة الزيادة المقدرة في الحسابات عند تفعيل يوم ضغط</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">سقف السلفة القصوى (% من الراتب):</label>
              <input
                type="number"
                value={settings.سقف_نسبة_السلفة_القصوى}
                onChange={(e) => updateField("سقف_نسبة_السلفة_القصوى", e.target.value)}
                disabled={userRole !== "مدير"}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-slate-50 focus:bg-white font-bold text-slate-900"
              />
              <p className="text-[10px] text-slate-400">الحد الأقصى المسموح به لسلفة الموظف من إجمالي راتبه</p>
            </div>
          </div>
        </div>

        {/* Save Action Footer */}
        {userRole === "مدير" ? (
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ وتثبيت الإعدادات</span>
            </button>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>تنبيه: أنت تتصفح الإعدادات بوضع العرض فقط، تعديل وحفظ الإعدادات مقتصر على حساب المدير.</span>
          </div>
        )}
      </form>

      {/* System Maintenance & Speed Cleanup Panel (Manager Only) */}
      {userRole === "مدير" && (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl p-6 text-white shadow-xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black tracking-tight text-slate-100">تنظيف وتسريع النظام الشامل</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  آمن 100%
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
                يقوم هذا الزر بتفريغ الذاكرة العشوائية (RAM Flush)، وإزالة الملفات المؤقتة، وتطهير أي بقايا لصور الفواتير المعتمدة دون أي مساس بالبيانات المحاسبية أو الفواتير المعلقة.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSystemCleanup}
              disabled={cleaning}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {cleaning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جارٍ التنظيف والتسريع...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>تنظيف الذاكرة المؤقتة وتسريع النظام الآن</span>
                </>
              )}
            </button>
          </div>

          {cleanupResult && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{cleanupResult}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
