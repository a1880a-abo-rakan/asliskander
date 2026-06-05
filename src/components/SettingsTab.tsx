import React, { useState, useEffect } from "react";
import { Settings } from "../types";
import { Save, RefreshCw, Settings as SettingsIcon, Percent, ShieldAlert } from "lucide-react";
import UserManagementSection from "./UserManagementSection";

interface SettingsTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
}

export default function SettingsTab({ onShowToast, userRole }: SettingsTabProps) {
  const [settings, setSettings] = useState<Settings>({
    رسوم_مدى: 0.8,
    رسوم_فيزا: 1.5,
    صرف_افتراضي: 350,
    سقف_بيبسي: 400,
    سقف_بلاستيك: 100,
    سقف_صلصات: 150,
    سقف_ديزل_قادسية: 50,
    سقف_ديزل_مروج: 30,
    زيادة_عالي: 25,
    نسبة_قادسية_ديزل: 70,
    نسبة_مروج_ديزل: 30,
    ايام_مقارنة: 7
  });
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ فشل تحميل الإعدادات");
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
      onShowToast("⚠️ عذراً! صلاحيات المدير فقط تسمح بتعديل الإعدادات");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        onShowToast("✅ تم حفظ الإعدادات بنجاح وجاري إعادة جدولة العمليات");
      } else {
        onShowToast("❌ فشل في حفظ الإعدادات");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء حفظ الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key: keyof Settings, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const isReadOnly = userRole !== "مدير";

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 flex items-start gap-3 RTL">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-bold">تنبيه صلاحيات:</span> حسابك الحالي ليس حساب مدير. يمكنك استعراض الإعدادات والقيم النشطة فقط، لكن تعديل الإعدادات مقيد لحساب المدير.
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-indigo-700" />
            <h2 className="text-lg font-bold text-slate-800">إعدادات النظام والرسوم والتسقيف</h2>
          </div>
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading}
            className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg p-2 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* mada percentage */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">رسوم شبكة مدى (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  disabled={isReadOnly}
                  value={settings.رسوم_مدى}
                  onChange={(e) => updateField("رسوم_مدى", parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* visa percentage */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">رسوم شبكة فيزا (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  disabled={isReadOnly}
                  value={settings.رسوم_فيزا}
                  onChange={(e) => updateField("رسوم_فيزا", parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* initial receipt sarf */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">مبلغ الصرف المبدئي الافتراضي</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  disabled={isReadOnly}
                  value={settings.صرف_افتراضي}
                  onChange={(e) => updateField("صرف_افتراضي", parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded absolute left-2 top-2">ریان</span>
              </div>
            </div>

            {/* pepsi daily cap */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">سقف البيبسي اليومي</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  disabled={isReadOnly}
                  value={settings.سقف_بيبسي}
                  onChange={(e) => updateField("سقف_بيبسي", parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded absolute left-2 top-2">ريال</span>
              </div>
            </div>

            {/* plastics daily cap */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">سقف البلاستيكيات اليومي</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  disabled={isReadOnly}
                  value={settings.سقف_بلاستيك}
                  onChange={(e) => updateField("سقف_بلاستيك", parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded absolute left-2 top-2">ريال</span>
              </div>
            </div>

            {/* sauces daily cap */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">سقف الصلصات اليومي</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  disabled={isReadOnly}
                  value={settings.سقف_صلصات}
                  onChange={(e) => updateField("سقف_صلصات", parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded absolute left-2 top-2">ريال</span>
              </div>
            </div>

            {/* Al-Qadisiyah diesel daily cap */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">سقف ديزل فرع القادسية اليومي</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  disabled={isReadOnly}
                  value={settings.سقف_ديزل_قادسية}
                  onChange={(e) => updateField("سقف_ديزل_قادسية", parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded absolute left-2 top-2">ريال</span>
              </div>
            </div>

            {/* Al-Murooj diesel daily cap */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">سقف ديزل فرع المروج اليومي</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  disabled={isReadOnly}
                  value={settings.سقف_ديزل_مروج}
                  onChange={(e) => updateField("سقف_ديزل_مروج", parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded absolute left-2 top-2">ريال</span>
              </div>
            </div>

            {/* boost percentage on busy days */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">زيادة السقف أيام المبيعات العالية (%)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  disabled={isReadOnly}
                  value={settings.زيادة_عالي}
                  onChange={(e) => updateField("زيادة_عالي", parseFloat(e.target.value) || 0)}
                  className="w-full pl-12 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* comparison days */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">أيام المقارنة لحساب المتوسط (3-7)</label>
              <input
                type="number"
                min="3"
                max="14"
                required
                disabled={isReadOnly}
                value={settings.ايام_مقارنة}
                onChange={(e) => updateField("ايام_مقارنة", parseInt(e.target.value) || 7)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
              />
            </div>

            {/* Qadisiyah diesel ratio */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">حصة القادسية من الديزل المشترك (%)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  disabled={isReadOnly}
                  value={settings.نسبة_قادسية_ديزل}
                  onChange={(e) => updateField("نسبة_قادسية_ديزل", parseFloat(e.target.value) || 70)}
                  className="w-full pl-12 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Murooj diesel ratio */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">حصة المروج من الديزل المشترك (%)</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  disabled={isReadOnly}
                  value={settings.نسبة_مروج_ديزل}
                  onChange={(e) => updateField("نسبة_مروج_ديزل", parseFloat(e.target.value) || 30)}
                  className="w-full pl-12 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100"
                />
                <Percent className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

          </div>

          {!isReadOnly && (
            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-bold py-2.5 px-6 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                حفظ الإعدادات الجديدة
              </button>
            </div>
          )}
        </form>
      </div>

      {userRole === "مدير" && (
        <UserManagementSection onShowToast={onShowToast} />
      )}
    </div>
  );
}
