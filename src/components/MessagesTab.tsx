import React, { useState, useEffect } from "react";
import { 
  MessageSquare, Send, Smartphone, QrCode, CheckCircle2, XCircle, AlertTriangle, 
  Users, History, Trash2, ShieldCheck, Check, Sparkles, AlertCircle, RefreshCw, Layers
} from "lucide-react";
import { Employee } from "../types";

interface MessagesTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
}

interface WhatsAppConfig {
  phoneNumber?: string;
  status: "disconnected" | "pairing_requested" | "connected";
  pairingCode?: string;
  qrCodeUrl?: string;
  linkedAt?: string;
}

interface SentMessageLog {
  id: string;
  employeeId?: string;
  employeeName: string;
  recipientPhone: string;
  messageType: "custom" | "warning" | "advance" | "salary";
  messageText: string;
  status: "sent" | "failed" | "pending";
  sentAt: string;
}

const TEMPLATES = [
  {
    type: "warning" as const,
    name: "⚠️ تنبيه حضور وتأخير",
    title: "تنبيه غياب أو تأخير عن الدوم",
    body: "عزيزي [الاسم]، نود تنبيهك بأنه تم رصد تأخير في حضورك اليوم لدوام مطعم أصل الإسكندر. نرجو الالتزام التام بجدول الدوام المعتمد تفادياً لتطبيق آليات الخصم المعتمدة في المنظومة الموحدة."
  },
  {
    type: "advance" as const,
    name: "💸 إشعار سلفة مالية",
    title: "استلام كشف السلفة",
    body: "الموظف الكريم [الاسم]، تم تقييد وتسجيل سلفة مالية جديدة بقيمة [المبلغ] ر.س في حسابك بالمنظومة بنجاح وتجاوزها للمراجعة المالية. شاكرين جهودك."
  },
  {
    type: "salary" as const,
    name: "💼 إشعار صرف راتب",
    title: "كشف تسوية الرواتب والأجور",
    body: "عزيزي [الاسم]، تم الانتهاء من احتساب وتسوية راتبك لشهر العمل الحالي في مطعم أصل الإسكندر وإيداعه. يرجى مراجعة الإدارة في حال وجود أي استفسار."
  },
  {
    type: "custom" as const,
    name: "💬 تعميم إداري مخصص",
    title: "رسالة إدارية حرة للموظف",
    body: "السلام عليكم يا [الاسم]، يرجى الحضور للاجتماع الدوري لإدارة مطعم أصل الإسكندر اليوم لمناقشة مؤشرات أداء الفروع وخطط المبيعات."
  }
];

export default function MessagesTab({ onShowToast, userRole }: MessagesTabProps) {
  // Config States
  const [phoneToLink, setPhoneToLink] = useState("");
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>({ status: "disconnected" });
  const [verificationCode, setVerificationCode] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  
  // Message Sending States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[number]>(TEMPLATES[3]);
  const [customMsgText, setCustomMsgText] = useState("");
  const [msgAmountParam, setMsgAmountParam] = useState("150"); // Used for [المبلغ] placeholder
  
  // Sending state triggers
  const [isSending, setIsSending] = useState(false);
  const [sentLogs, setSentLogs] = useState<SentMessageLog[]>([]);
  const [activeTab, setActiveTab] = useState<"broadcast" | "history" | "status">("broadcast");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state helpers
  const loadWhatsAppConfig = async () => {
    try {
      const res = await fetch("/api/whatsapp/config");
      if (res.ok) {
        setWaConfig(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSentLogs = async () => {
    try {
      const res = await fetch("/api/whatsapp/messages");
      if (res.ok) {
        setSentLogs(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch("/api/employees");
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadWhatsAppConfig();
    loadSentLogs();
    loadEmployees();
  }, []);

  const handleStartPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneToLink.trim()) {
      onShowToast("⚠️ يرجى إدخال رقم جوالك أولاً");
      return;
    }
    setPairingLoading(true);
    try {
      const res = await fetch("/api/whatsapp/pair-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneToLink.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setWaConfig(data.config);
        onShowToast("🔑 تم توليد رمز وإقتران QR ذكي بنجاح. يرجى تأكيده لاعتماده.");
      } else {
        onShowToast("❌ فشل طلب الربط");
      }
    } catch (err) {
      onShowToast("❌ خطأ بالشبكة أثناء تأكيد الرقم");
    } finally {
      setPairingLoading(false);
    }
  };

  const handleVerifyPairing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      onShowToast("⚠️ يرجى إدخال كود التحقق المرسل");
      return;
    }
    try {
      const res = await fetch("/api/whatsapp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verificationCode.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setWaConfig(data.config);
        onShowToast("✅ تم اعتماد رقمك بنجاح! الواتساب متصل حالياً بالنظام ومستعد للإرسال.");
        setActiveTab("broadcast");
      } else {
        onShowToast("❌ رمز التأكيد غير صحيح");
      }
    } catch (err) {
      onShowToast("❌ خطأ أثناء مطابقة الرمز");
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("هل أنت متأكد من فك ارتباط واتساب بالمنظومة؟")) return;
    try {
      const res = await fetch("/api/whatsapp/disconnect", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setWaConfig(data.config);
        setPhoneToLink("");
        setVerificationCode("");
        onShowToast("🗑️ تم فك ارتباط الجوال بجهاز الواتساب بنجاح");
      }
    } catch (err) {
      onShowToast("❌ خطأ أثناء فصل الحساب");
    }
  };

  // Build the message text replacing placeholders
  const getRenderedText = (employeeName: string) => {
    let t = customMsgText || selectedTemplate.body;
    t = t.replace(/\[الاسم\]/g, employeeName);
    t = t.replace(/\[المبلغ\]/g, msgAmountParam);
    return t;
  };

  const handleSendMessage = async () => {
    if (waConfig.status !== "connected") {
      onShowToast("⚠️ يرجى ربط رقم الواتساب بالنظام أولاً لتتمكن من الإرسال!");
      setActiveTab("status");
      return;
    }

    const recs: { phone: string; name: string; id?: string }[] = [];

    // Prioritize selected employees
    if (selectedEmployees.length > 0) {
      selectedEmployees.forEach(empId => {
        const emp = employees.find(e => e.id === empId);
        if (emp && emp.phone) {
          recs.push({ phone: emp.phone, name: emp.name, id: emp.id });
        }
      });
    }

    // Add manual phone if provided
    if (manualPhone.trim()) {
      recs.push({ phone: manualPhone.trim(), name: manualName.trim() || "جهة خارجية", id: undefined });
    }

    if (recs.length === 0) {
      onShowToast("⚠️ يرجى تحديد موظف لديه رقم هاتف مسجل أو إدخال رقم يدوي بالإسفل");
      return;
    }

    setIsSending(true);
    let successCount = 0;

    for (const rec of recs) {
      try {
        const text = getRenderedText(rec.name);
        const res = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipientPhone: rec.phone,
            recipientName: rec.name,
            messageText: text,
            messageType: selectedTemplate.type,
            employeeId: rec.id
          })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error("Error sending to:", rec.phone, err);
      }
    }

    onShowToast(`📢 تم إرسال الرسالة بنجاح إلى (${successCount}) من أصل (${recs.length}) جهة اتصال عبر خادم الواتساب المعتمد.`);
    setIsSending(false);
    setSelectedEmployees([]);
    setManualPhone("");
    setManualName("");
    setCustomMsgText("");
    loadSentLogs();
  };

  // Fill in active text edit box with template when chosen
  useEffect(() => {
    setCustomMsgText(selectedTemplate.body);
  }, [selectedTemplate]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Upper header section */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/20 text-indigo-400">
                <MessageSquare className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className="text-lg font-black text-white">نظام التراسل الفوري والتعاميم المباشرة عبر الواتساب (WhatsApp Gateway)</h2>
            </div>
            <p className="text-[11px] text-slate-400 font-bold max-w-xl leading-relaxed">
              اربط رقم هاتفك الفردي بالمنظومة آلياً، وأرسل تقارير المالية الرواتب، السلف والخصومات، وتنبيهات الحضور والانصراف لموظفي المطعم دون الحاجة لمغادرة النظام المالي.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("broadcast")}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
                activeTab === "broadcast"
                  ? "bg-white text-slate-900 shadow-md scale-102"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              🚀 منصة التراسل الموحدة
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-slate-900 shadow-md scale-102"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              📊 الأرشيف الكلي ({sentLogs.length})
            </button>
            <button
              onClick={() => setActiveTab("status")}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
                activeTab === "status"
                  ? "bg-white text-slate-900 shadow-md scale-102"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              ⚙️ ربط الحساب والاقتران
              {waConfig.status === "connected" ? (
                <span className="mr-1.5 inline-block w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
              ) : (
                <span className="mr-1.5 inline-block w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Right Section: Configuration of template and choosing employee */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-5">
            <div>
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                <Users className="w-4 h-4 text-slate-500" />
                <span>1. حدد مستلم التنبيه</span>
              </h3>
            </div>

            {/* Check if WA connects */}
            {waConfig.status !== "connected" && (
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 text-[11px] font-bold space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-rose-900 font-extrabold">
                  <AlertCircle className="w-4 h-4" />
                  <span>عفواً.. حساب الواتساب غير مرتبط حالياً</span>
                </div>
                <p className="leading-relaxed font-medium">
                  لتفعيل نظام الإرسال الآلي، يلزم ربط رقم هاتف الواتساب المعتمد أولاً لمطعم أصل الإسكندر من صفحة "ربط الحساب والاقتران".
                </p>
                <button
                  onClick={() => setActiveTab("status")}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[9px] cursor-pointer transition-all"
                >
                  الذهاب للربط الفوري 🔑
                </button>
              </div>
            )}

            {/* Employee quick search and list */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">تحديد الموظفين ({selectedEmployees.length} مستلم)</label>
              <div className="max-h-72 overflow-y-auto border border-slate-100 rounded-2xl p-2.5 bg-slate-50/50 space-y-1.5 divide-y divide-slate-100/60 text-right">
                {employees.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4">لا توجد سجلات موظفين متاحة. يرجى إضافتهم من صفحة الموظفين أولاً.</p>
                ) : (
                  employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-xl transition-all cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(emp.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedEmployees([...selectedEmployees, emp.id]);
                          } else {
                            setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                          }
                        }}
                        className="rounded text-indigo-600 focus:ring-indigo-500 scale-105"
                      />
                      <div className="flex-1 text-right">
                        <span className="text-xs font-bold text-slate-800">{emp.name}</span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[9px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/50">{emp.job}</span>
                          <span className={`text-[9px] font-mono leading-none ${emp.phone ? "text-indigo-600 font-extrabold" : "text-rose-500"}`}>
                            {emp.phone ? emp.phone : "لا يوجد رقم"}
                          </span>
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Manual recipient addition */}
            <div className="space-y-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">✍️ إرسال خارجي (رقم يدوي)</span>
                <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded-md">اختياري</span>
              </div>
              
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="اسم الشخص غير المسجل"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full text-right px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <input
                  type="text"
                  placeholder="رقم الجوال (مثال: 9665xxxxxxxx)"
                  value={manualPhone}
                  onChange={(e) => setManualPhone(e.target.value)}
                  className="w-full text-left font-mono px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
                <p className="text-[9px] text-slate-400 leading-relaxed font-bold">
                  * سيتم دمج الجهة اليدوية مع الموظفين المختارين لإرسال التعاميم الموحدة في خروج واحد.
                </p>
              </div>
            </div>
          </div>

          {/* Left Section: Message template composer and actions */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-5">
              <div>
                <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>2. اختر نوع الرسالة والنموذج الجاهز</span>
                </h3>
              </div>

              {/* Grid of templates */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.type}
                    onClick={() => setSelectedTemplate(tmpl)}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-2xl text-center border transition-all cursor-pointer gap-2 ${
                      selectedTemplate.type === tmpl.type
                        ? "bg-slate-900 border-slate-950 text-white shadow-md scale-102"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200/50 text-slate-700"
                    }`}
                  >
                    <span className="text-xs font-bold leading-none">{tmpl.name}</span>
                  </button>
                ))}
              </div>

              {/* Message inputs form */}
              <div className="space-y-4">
                {/* Dynamic variables inputs */}
                {selectedTemplate.type === "advance" && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-900">💸 حدد متغيرات كشف السلفة</h4>
                      <p className="text-[10px] text-indigo-700 mt-1">سيتم مطابقة هذا المبلغ تلقائياً وتعويضه بالرمز النائب بقالب النص المعتمد.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">مبلغ السلفة:</span>
                      <input
                        type="number"
                        value={msgAmountParam}
                        onChange={(e) => setMsgAmountParam(e.target.value)}
                        className="w-24 text-center px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl font-mono text-slate-900 focus:outline-none"
                      />
                      <span className="text-xs font-bold text-slate-700">ر.س</span>
                    </div>
                  </div>
                )}

                {/* Main Message Text Area */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700">محتوى رسالة البث (قابلة للتعديل)</label>
                    <span className="text-[10px] text-slate-400 font-mono">طول الرسالة: {customMsgText.length} حرف</span>
                  </div>
                  
                  <textarea
                    rows={6}
                    value={customMsgText}
                    onChange={(e) => setCustomMsgText(e.target.value)}
                    className="w-full text-right p-4 text-xs font-medium border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 leading-relaxed"
                    placeholder="ادخل نص الرسالة هنا للموظف..."
                  />

                  {/* Variables info pill */}
                  <div className="flex flex-wrap gap-2 text-[10px] text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-100/50 font-bold">
                    <span>💡 رموز معتمدة تعوض تلقائياً:</span>
                    <span>• <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200">[الاسم]</code> لإدراج اسم الموظف</span>
                    {selectedTemplate.type === "advance" && (
                      <span>• <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200">[المبلغ]</code> لإدراج قيمة السلفة المقررة</span>
                    )}
                  </div>
                </div>

                {/* Final preview panel box based on mock first target */}
                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 space-y-2 relative">
                  <div className="absolute top-2 left-3 bg-amber-500/20 text-amber-300 font-black px-2 py-0.5 rounded text-[8px] tracking-widest uppercase animate-pulse">
                    معاينة حية للمستلم الأول
                  </div>

                  <div className="text-[10px] font-bold text-slate-300">
                    مستلم المعاينة: <span className="text-emerald-400">
                      {selectedEmployees.length > 0 
                        ? (employees.find(e => e.id === selectedEmployees[0])?.name || "المستلم الأول")
                        : (manualPhone ? manualName || "جهة مخصصة" : "اسم الموظف")
                      }
                    </span>
                  </div>
                  <div className="text-xs bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-100 whitespace-pre-wrap leading-relaxed select-text text-right" dir="auto">
                    {getRenderedText(
                      selectedEmployees.length > 0 
                        ? (employees.find(e => e.id === selectedEmployees[0])?.name || "الموظف") 
                        : (manualPhone ? manualName || "جهة مخصصة" : "[اسم الموظف]")
                    )}
                  </div>
                </div>

                {/* Submit / Trigger Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || (selectedEmployees.length === 0 && !manualPhone)}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-8 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span>جاري بث الرسائل للمستقبلين آلياً...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-indigo-400" />
                        <span>إرسال برودكاست التعميم الآن 🚀</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Sent Messages History Audit Logs */}
      {activeTab === "history" && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <History className="w-4 h-4 text-indigo-600" />
              <span>أرشيف التراسل وتقارير الإرسال</span>
            </h3>
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="بحث عن موظف أو رقم جوال..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-900 font-sans"
              />
            </div>
          </div>

          {/* Table list of logs */}
          {sentLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <span className="text-3xl">📭</span>
              <p className="text-xs font-bold">لا يوجد سجل رسائل مرسلة بعد.</p>
              <p className="text-[10px]">الرسائل التي تقوم بإرسالها للموظفين سوف تحفظ كشوفاتها الضريبية والإدارية هنا للتتبع المالي والتدوير.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              <table className="w-full text-right border-collapse text-xs select-text">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 font-extrabold text-[11px] border-b border-slate-850">
                    <th className="py-3 px-4">الموظف / الجهة</th>
                    <th className="py-3 px-4">رقم الهاتف</th>
                    <th className="py-3 px-4">نوع الرسالة</th>
                    <th className="py-3 px-4">محتوى الإرسال</th>
                    <th className="py-3 px-4 text-center">التاريخ والوقت</th>
                    <th className="py-3 px-4 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sentLogs
                    .filter(log => 
                      log.employeeName.includes(searchQuery) || 
                      log.recipientPhone.includes(searchQuery) ||
                      log.messageText.includes(searchQuery)
                    )
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-slate-900 font-bold">{log.employeeName}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]" dir="ltr">{log.recipientPhone}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                            log.messageType === "warning" ? "bg-amber-50 text-amber-800 border border-amber-200" :
                            log.messageType === "advance" ? "bg-indigo-50 text-indigo-800 border border-indigo-200" :
                            log.messageType === "salary" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                            "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {log.messageType === "warning" ? "تنبيه دوام" :
                             log.messageType === "advance" ? "سلفة مالية" :
                             log.messageType === "salary" ? "إشعار راتب" : "رسالة عامة"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.messageText}>
                          {log.messageText}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-[10px] text-slate-400 text-slate-500">
                          {new Date(log.sentAt).toLocaleString("ar-SA", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>تم الإرسال</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 3: WhatsApp Linking Configuration Dashboard */}
      {activeTab === "status" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Right Panel: Active Status and Actions Form */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-500" />
                <span>إعداد ارتباط رقم الجوال بالواتساب الموحد</span>
              </h3>
            </div>

            {waConfig.status === "connected" ? (
              /* Connected screen display state */
              <div className="space-y-6 text-center py-6">
                <div className="mx-auto w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 animate-bounce" />
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
                    <span>الواتساب مرتبط بنجاح ومتصل حالياً</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-2">رقم الجوال النشط: <span className="font-mono text-indigo-700">{waConfig.phoneNumber}</span></h4>
                  <p className="text-[10px] text-slate-400 font-bold">تاريخ وساعة الاقتران: {new Date(waConfig.linkedAt || "").toLocaleString("ar-SA")}</p>
                </div>

                <div className="pt-4 max-w-sm mx-auto">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 text-[11px] leading-relaxed text-right space-y-2 md:text-[10px]">
                    <div className="flex items-center gap-1 text-slate-800 font-extrabold text-[11px]">
                      <ShieldCheck className="w-4 h-4 text-slate-600" />
                      <span>🔑 بروتوكول التشفير والاستيقاظ التلقائي</span>
                    </div>
                    <span>حساب التراسل قيد المراقبة الآن بنجاح. لا يلزم إبقاء هذه الصفحة مفتوحة. عند طلب إرسال كشف للراتب أو السلفة، ستنطلق الإشارة لهاتفك تلقائياً لإرساله دون تدخل يدوي.</span>
                  </div>
                </div>

                {/* Disconnect trigger */}
                <div className="pt-2">
                  <button
                    onClick={handleDisconnect}
                    className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs px-6 py-2.5 rounded-xl cursor-pointer transition-all inline-flex items-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>قطع ارتباط خط الواتساب الموحد</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Disconnected or pairing requested forms screen */
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 leading-relaxed text-[11px] text-slate-600 text-right space-y-1.5">
                  <span className="block text-slate-800 font-bold text-xs mb-1">📋 آلية عمل الربط المباشر:</span>
                  <p>1. أدخل رقم الجوال الخاص بك الذي ترغب بالإرسال من خلاله في الحقل المعتمد أدناه.</p>
                  <p>2. اضغط على "تأكيد وبدء الاقتران" لتوليد كود ربط فريد من خادم المنظومة.</p>
                  <p>3. سيظهر لك كود QR ذكي وكود pairing مخصص على يسار الشاشة لتأكيده عبر الواتساب بهاتفك.</p>
                </div>

                <form onSubmit={handleStartPairing} className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">رقم الهاتف المراد ربطه بالنظام</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        disabled={waConfig.status === "pairing_requested"}
                        placeholder="مثل: 9665xxxxxxxx أو 05xxxxxxxx"
                        value={phoneToLink}
                        onChange={(e) => setPhoneToLink(e.target.value)}
                        className="w-full text-left font-mono px-3 pr-10 py-2.5 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                      <Smartphone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                    </div>
                  </div>

                  {waConfig.status !== "pairing_requested" && (
                    <button
                      type="submit"
                      disabled={pairingLoading}
                      className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200/50 text-slate-900 font-extrabold text-xs py-3 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      {pairingLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>جاري توليد مفاتيح الاقتران الذكية...</span>
                        </>
                      ) : (
                        <>
                          <span>⚡️ بدء تأكيد رقم الجوال وطلب الاقتران</span>
                        </>
                      )}
                    </button>
                  )}
                </form>

                {/* If Pairing code generated - verification module code */}
                {waConfig.status === "pairing_requested" && (
                  <div className="mt-4 p-5 bg-indigo-50 border border-indigo-100 rounded-2xl text-right space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span>أدخل كود الاستدعاء / الاقتران</span>
                      </h4>
                      <p className="text-[10px] text-indigo-700 leading-relaxed">
                        قم بفتح جهاز الواتساب في هاتفك &gt; الأجهزة المرتبطة &gt; ربط جهاز &gt; اختيار "ربط باستخدام رقم الهاتف" ثم إدخال كود الاقتران الذي يظهر على يسار الشاشة لتثبيت الربط الفوري، أو أدخل كود التأكيد أدناه للمطابقة.
                      </p>
                    </div>

                    <form onSubmit={handleVerifyPairing} className="space-y-3">
                      <div className="space-y-1">
                        <span className="block text-[10px] text-indigo-950 font-bold">كود التأكيد النشط بالواتساب</span>
                        <input
                          type="text"
                          required
                          placeholder="مثال: 123456"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="w-full text-center font-mono font-black text-sm tracking-widest py-2 bg-white border border-slate-200 rounded-xl uppercase text-slate-800"
                        />
                      </div>

                      <div className="flex gap-2 text-xs">
                        <button
                          type="submit"
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl cursor-pointer"
                        >
                          تأكيد وتفعيل الاقتران بالمنظومة 🔓
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWaConfig({ status: "disconnected" });
                            setPhoneToLink("");
                            setVerificationCode("");
                          }}
                          className="bg-white border border-slate-200 text-slate-700 font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                        >
                          إلغاء الطلب
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Left Panel: Pairing Codes visual graphics / emulator simulator helper for QA */}
          <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden relative">
            {/* Ambient gradients */}
            <div className="absolute top-0 right-1/4 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] text-orange-400 font-extrabold tracking-widest uppercase">WhatsApp Web Engine Simulator</span>
                <h4 className="text-sm font-black text-white mt-0.5">لوحة مسح الـ QR والربط المباشر الموحد</h4>
              </div>

              {waConfig.status === "pairing_requested" ? (
                <div className="space-y-5 text-center py-4 flex flex-col items-center justify-center">
                  <p className="text-[10px] text-slate-300 font-bold">امسح الكود بالمربع الذكي لتفعيل الربط آلياً بساحة الواتساب</p>
                  
                  {/* Beautiful generated mock QR image box */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-850 inline-block relative shadow-2xl scale-102">
                    <img
                      src={waConfig.qrCodeUrl}
                      alt="WhatsApp Pair QR"
                      className="w-40 h-40 object-contain mx-auto"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-950/5 rounded-2xl pointer-events-none"></div>
                  </div>

                  {/* Or Pairing PIN representation code */}
                  <div className="space-y-1 text-center">
                    <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase bg-slate-800/80 px-2 py-0.5 rounded-md">PAIRED DEVICE KEY</span>
                    <div className="text-xl font-mono font-black text-indigo-400 tracking-widest py-1 px-4 bg-slate-950/60 rounded-xl border border-slate-850">
                      {waConfig.pairingCode}
                    </div>
                  </div>

                  {/* Quick QA Simulator Help Alert */}
                  <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 max-w-sm text-right space-y-2 mt-2">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-500">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>💡 دليل محاكاة الإقتران بالتطبيق</span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold leading-normal">
                      بما أننا في بيئة تطويرية مشفرة، يمكنك بسهولة محاكاة نجاح مسح الكود أو تفعيل الربط بكتابة أي كود من 6 خانات (على سبيل المثال الكود <code className="text-white font-mono bg-slate-800 px-1 py-0.5 rounded">123456</code>) في الخانة المعتمدة على اليمين ثم ضغط زر "تأكيد وتفعيل الاقتران" لاعتماد الاتصال فوراً.
                    </p>
                  </div>
                </div>
              ) : waConfig.status === "connected" ? (
                <div className="text-center py-10 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-500/30">
                    <Check className="w-8 h-8 font-black" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">الارتباط متصل وآمن بالكامل 🔒</p>
                    <p className="text-[10px] text-slate-400 mt-1">تستقبل المنظومة حالياً إشارات هاتفك ومستعدة لتوزيع التعاميم ومذكرات السلف للموظفين.</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="mx-auto w-12 h-12 bg-slate-850 text-slate-500 rounded-full flex items-center justify-center border border-slate-800">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <p className="text-[10px] text-slate-400">في انتظار بدء إدخال رقم الجوال وتأكيد الاقتران من اللوحة اليمنى...</p>
                </div>
              )}
            </div>

            <div className="bg-slate-950/60 p-4 border-t border-slate-850 rounded-2xl flex items-center gap-2.5 mt-8">
              <span className="p-1.5 bg-slate-900 rounded-lg text-indigo-400 border border-slate-850">
                <Check className="w-3.5 h-3.5" />
              </span>
              <p className="text-[9px] text-slate-500 leading-normal font-bold">
                * كافة الاتصالات المحققة والمراسلات الصادرة تمر آلياً بأعلى معايير التروية والتطابق مع سياسات شركة Meta بخصوص مكافحة الرسائل العشوائية والسبام.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
