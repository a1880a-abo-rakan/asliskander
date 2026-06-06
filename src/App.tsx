import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Settings as SettingsIcon, BarChart3, Receipt,
  User, Shield, Calendar, LogOut, Check, Building2, Terminal, ShoppingBag, Users,
  Timer, AlertTriangle
} from "lucide-react";
import DailyInputTab from "./components/DailyInputTab";
import PurchasesTab from "./components/PurchasesTab";
import TaxTab from "./components/TaxTab";
import ReportsTab from "./components/ReportsTab";
import EmployeesTab from "./components/EmployeesTab";
import SettingsTab from "./components/SettingsTab";
import { AslIskanderLogoSymbol, AslIskanderText } from "./components/AslIskanderLogo";

type TabType = "input" | "purchases" | "tax" | "reports" | "employees" | "settings";
type RoleType = "مدير" | "محاسب" | "مدخل فواتير";

const PERMISSIONS: Record<RoleType, Record<TabType, boolean>> = {
  "مدير": { input: true, purchases: true, tax: true, reports: true, employees: true, settings: true },
  "محاسب": { input: true, purchases: false, tax: false, reports: false, employees: false, settings: false },
  "مدخل فواتير": { input: false, purchases: false, tax: true, reports: false, employees: false, settings: false }
};

interface UserSession {
  username: string;
  displayName: string;
  role: RoleType;
  status: string;
  branch?: 'الكل' | 'القادسية' | 'المروج';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>("input");
  
  // Clean, persistent User Session state
  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    const saved = sessionStorage.getItem("alex_user_session") || localStorage.getItem("alex_user_session");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Idle timeout and warning countdown states
  const [showIdleWarning, setShowIdleWarning] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(30);

  // Inactivity detection effect
  useEffect(() => {
    if (!currentUser) {
      setShowIdleWarning(false);
      return;
    }

    let idleTimer: NodeJS.Timeout;
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes inactivity limit

    const resetIdleTimer = () => {
      if (showIdleWarning) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        setIdleCountdown(30);
        setShowIdleWarning(true);
      }, INACTIVITY_LIMIT);
    };

    // Listen to user inputs
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetIdleTimer);
    });

    resetIdleTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [currentUser, showIdleWarning]);

  // Countdown timer for idle warning popup
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    if (showIdleWarning) {
      countdownInterval = setInterval(() => {
        setIdleCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            // Auto logout
            sessionStorage.removeItem("alex_user_session");
            localStorage.removeItem("alex_user_session");
            setCurrentUser(null);
            setShowIdleWarning(false);
            showToast("⚠️ تم تسجيل الخروج تلقائياً لعدم النشاط");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      clearInterval(countdownInterval);
    };
  }, [showIdleWarning]);

  const handleExtendSession = () => {
    setShowIdleWarning(false);
    setIdleCountdown(30);
    showToast("🔄 تم تمديد جلسة العمل بنجاح");
  };

  // Login Form State
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    // Format Arabic Gregorian date & time beautifully
    const formatTimeArabic = () => {
      const now = new Date();
      return now.toLocaleDateString("ar-SA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    };
    setCurrentTime(formatTimeArabic());
    
    // Auto sync tab based on roles on mount if logged in
    if (currentUser) {
      const allowed = PERMISSIONS[currentUser.role];
      if (!allowed[activeTab]) {
        const firstAllowed = (Object.keys(allowed) as TabType[]).find((tab) => allowed[tab]);
        if (firstAllowed) {
          setActiveTab(firstAllowed);
        }
      }
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoginLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginUsername.trim().toLowerCase(),
          password: loginPassword.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          sessionStorage.setItem("alex_user_session", JSON.stringify(data.user));
          localStorage.removeItem("alex_user_session"); // strictly clean localStorage copy
          setCurrentUser(data.user);
          showToast(`🔓 تم تفويض دخول: ${data.user.displayName}`);
        }
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || "❌ فشل تسجيل الدخول، يرجى مراجعة المدخلات");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("❌ خطأ شبكة أثناء التحقق من الحساب");
    } finally {
      setLoginLoading(false);
    }
  };

  const userRole = currentUser?.role || "محاسب";
  const isTabAllowed = (tab: TabType) => PERMISSIONS[userRole][tab];

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 antialiased select-none" dir="rtl">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/50 overflow-hidden flex flex-col">
          {/* Header layout with brand identity */}
          <div className="bg-slate-950 p-8 text-center border-b border-slate-800/60 flex flex-col items-center gap-4 relative overflow-hidden">
            {/* Subtle background warm brand gradients */}
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-orange-600/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative group transition-transform duration-300">
              {/* Pulsing glow under the circle logo */}
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-500 via-orange-500 to-red-600 rounded-full scale-105 blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-500 animate-pulse"></div>
              <AslIskanderLogoSymbol size={100} className="relative z-10" />
            </div>

            <div className="z-10 space-y-2 mt-1">
              <AslIskanderText className="text-[13px] tracking-[0.25em]" />
              <div className="flex items-center justify-center gap-1.5">
                <h1 className="text-base font-black text-slate-100 tracking-tight">مطعم أصل الاسكندر</h1>
                <span className="text-xs">🍽️</span>
              </div>
              <p className="text-[9px] text-orange-400/80 font-black tracking-widest uppercase">المنظومة المالية وحوكمة مبيعات الفروع الموحدة</p>
            </div>
          </div>

          {/* Form container */}
          <form onSubmit={handleLogin} className="p-8 space-y-5 text-right bg-white flex-1">
            <div className="space-y-1">
              <h2 className="text-sm font-extrabold text-slate-800">🔒 تسجيل الدخول الآمن للمنظومة</h2>
              <p className="text-[10px] text-slate-500 font-medium">الرجاء إدخال اسم مستخدم الحساب ورمز المرور السري (PIN).</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg flex items-start gap-1.5 leading-relaxed">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">اسم مستخدم الحساب</label>
              <div className="relative">
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  required
                  placeholder="e.g. admin"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full text-left pl-3 pr-10 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Password PIN Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">كلمة المرور أو رمز الـ PIN</label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  placeholder="ادخل رمز الدخول الموحد"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                />
                <Shield className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-slate-900 hover:bg-slate-800 hover:scale-[0.99] text-white font-extrabold text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>{loginLoading ? "جاري المطابقة..." : "تأكيد وتسجيل الدخول المالي"}</span>
            </button>


          </form>
        </div>

        <footer className="text-slate-600 py-6 text-[9px] tracking-wide mt-6">
          مطعم أصل الاسكندر • كافة الحقوق محفوظة  © {new Date().getFullYear()}
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased select-none" dir="rtl">
      
      {/* Dynamic Toast Alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 50, x: "-50%" }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 text-slate-100 font-bold px-6 py-3.5 rounded-full shadow-2xl text-xs flex items-center gap-2"
          >
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar Header */}
      <header className="bg-slate-900 text-slate-100 border-b border-slate-800 px-6 py-3 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative group transition-all duration-300">
            <div className="absolute inset-0 bg-orange-500/10 rounded-full scale-110 blur-xs transition-opacity"></div>
            <AslIskanderLogoSymbol size={42} className="relative z-10" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-row-reverse justify-end">
              <h1 className="text-sm font-black tracking-tight text-white leading-tight">مطعم أصل الاسكندر</h1>
              <span className="text-xs">🍽️</span>
            </div>
            <p className="text-[9px] text-orange-400 font-bold tracking-wide mt-0.5">نظام الحوكمة المالية وإدارة الفروع الموحدة والمخزون الذكي</p>
          </div>
        </div>

        {/* Calendar visual */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs bg-slate-800/80 px-4 py-1.5 rounded-full text-slate-300 font-medium border border-slate-700/50">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>{currentTime}</span>
        </div>

        {/* Roles controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs bg-slate-800 text-slate-300 px-3.5 py-1.5 rounded-xl border border-slate-700/50">
              <User className="w-4 h-4 text-indigo-400" />
              <span>أهلاً، <span className="font-extrabold text-white">{currentUser.displayName}</span></span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded-lg border border-indigo-500/30">
                {currentUser.role}
              </span>
            </div>
            
            <button
              onClick={() => {
                sessionStorage.removeItem("alex_user_session");
                localStorage.removeItem("alex_user_session");
                setCurrentUser(null);
                showToast("🔒 تم تسجيل الخروج بنجاح");
              }}
              className="text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl px-3 py-1.5 text-xs font-bold font-sans flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main content wrapper */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Navigation tabs row */}
        <nav className="bg-white p-1.5 rounded-2xl shadow-xs border border-slate-100 flex flex-wrap items-center gap-1">
          {isTabAllowed("input") && (
            <button
              onClick={() => setActiveTab("input")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "input"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Plus className="w-4 h-4" /> إدخال كاش ومبيعات
            </button>
          )}

          {isTabAllowed("purchases") && (
            <button
              onClick={() => setActiveTab("purchases")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "purchases"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <ShoppingBag className="w-4 h-4" /> تتبع المشتريات والمخزون
            </button>
          )}

          {isTabAllowed("tax") && (
            <button
              onClick={() => setActiveTab("tax")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "tax"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Receipt className="w-4 h-4" /> الفواتير الضريبية
            </button>
          )}

          {isTabAllowed("reports") && (
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "reports"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> قياس كفاءة الفروع والتقارير
            </button>
          )}

          {isTabAllowed("employees") && (
            <button
              onClick={() => setActiveTab("employees")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "employees"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Users className="w-4 h-4" /> إدارة الموظفين
            </button>
          )}

          {isTabAllowed("settings") && (
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "settings"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <SettingsIcon className="w-4 h-4" /> التحكم والأهداف
            </button>
          )}
        </nav>

        {/* Tabs views orchestration */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "input" && isTabAllowed("input") && (
                <DailyInputTab onShowToast={showToast} userRole={userRole} userBranch={currentUser?.branch || "الكل"} />
              )}
              {activeTab === "purchases" && isTabAllowed("purchases") && (
                <PurchasesTab onShowToast={showToast} userRole={userRole} userBranch={currentUser?.branch || "الكل"} />
              )}
              {activeTab === "tax" && isTabAllowed("tax") && (
                <TaxTab onShowToast={showToast} userRole={userRole} userBranch={currentUser?.branch || "الكل"} />
              )}
              {activeTab === "reports" && isTabAllowed("reports") && (
                <ReportsTab onShowToast={showToast} userRole={userRole} />
              )}
              {activeTab === "employees" && isTabAllowed("employees") && (
                <EmployeesTab onShowToast={showToast} userRole={userRole} />
              )}
              {activeTab === "settings" && isTabAllowed("settings") && (
                <SettingsTab onShowToast={showToast} userRole={userRole} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-center py-4 text-[10px] tracking-wide mt-12">
        مطعم أصل الاسكندر • كافة الحقوق المحفوظة لبراءة الذمة المحاسبية © {new Date().getFullYear()}
      </footer>

      {/* ⚠️ IDLE WARNING COUNTDOWN OVERLAY MODAL */}
      <AnimatePresence>
        {showIdleWarning && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[99999] flex items-center justify-center p-4" dir="rtl">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-6"
            >
              <div className="mx-auto bg-amber-50 rounded-2xl p-4 w-16 h-16 flex items-center justify-center border border-amber-200/50">
                <Timer className="w-8 h-8 text-amber-600 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-base font-extrabold text-slate-900">⚠️ تنبيه: انتهاء الجلسة بسبب عدم النشاط</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">
                  أنت واقف عن العمل منذ أكثر من 5 دقائق. لحماية أمن البيانات المالية للمنظومة، سيتم تسجيل خروجك تلقائياً بعد:
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl py-4 border border-slate-100 flex flex-col items-center justify-center">
                <span className="text-4xl font-black font-mono text-indigo-700 animate-bounce">{idleCountdown}</span>
                <span className="text-[10px] text-slate-400 font-bold mt-1">ثانية لطلب التمديد</span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleExtendSession}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 rounded-xl shadow-md cursor-pointer transition-all hover:scale-[1.02]"
                >
                  استمرار العمل بالمنظومة
                </button>
                <button
                  onClick={() => {
                    sessionStorage.removeItem("alex_user_session");
                    localStorage.removeItem("alex_user_session");
                    setCurrentUser(null);
                    setShowIdleWarning(false);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-5 py-3 rounded-xl cursor-pointer"
                >
                  الخروج الآن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
