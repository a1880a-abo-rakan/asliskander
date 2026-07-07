import React, { useState, useEffect } from "react";
import { UnifiedUser } from "../types";
import { 
  UserPlus, Trash2, Shield, Lock, Unlock, 
  RotateCw, RefreshCw, Key, UserCheck, AlertTriangle 
} from "lucide-react";

interface UserManagementSectionProps {
  onShowToast: (msg: string) => void;
}

export default function UserManagementSection({ onShowToast }: UserManagementSectionProps) {
  const [users, setUsers] = useState<UnifiedUser[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Create / Edit Form State
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<'مدير' | 'محاسب' | 'مدخل فواتير'>("محاسب");
  const [status, setStatus] = useState<'نشط' | 'موقوف'>("نشط");
  const [branch, setBranch] = useState<'الكل' | 'القادسية' | 'المروج'>("الكل");
  const [canEnterInvoices, setCanEnterInvoices] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      } else {
        onShowToast("❌ فشل استرجاع حسابات الموظفين");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ شبكة أثناء جلب الحسابات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !displayName || !password) {
      onShowToast("⚠️ يرجى ملء كافة الخانات المطلوبة");
      return;
    }

    // Username format verification
    const cleanUsername = username.trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      onShowToast("⚠️ يجب أن يكون اسم المستخدم بأحرف إنجليزية صغيرة وأرقام فقط (بدون مسافات)");
      return;
    }

    setLoading(true);
    try {
      const payload: UnifiedUser = {
        id: cleanUsername,
        username: cleanUsername,
        displayName: displayName.trim(),
        password: password.trim(),
        role,
        status,
        branch,
        createdAt: new Date().toISOString(),
        canEnterInvoices: role === "محاسب" ? canEnterInvoices : false
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onShowToast(isEditing ? "✅ تم تعديل بيانات الحساب بنجاح" : "✅ تم إنشاء حساب الموظف الجديد بنجاح");
        // Clear Form
        setUsername("");
        setDisplayName("");
        setPassword("");
        setRole("محاسب");
        setStatus("نشط");
        setBranch("الكل");
        setCanEnterInvoices(false);
        setIsEditing(false);
        fetchUsers();
      } else {
        onShowToast("❌ فشل في خزن بيانات الحساب");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء حفظ الحساب");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user: UnifiedUser) => {
    if (user.username === "admin") {
      onShowToast("⚠️ لا يمكن إيقاف حساب المدير العام الأساسي");
      return;
    }
    
    const newStatus = user.status === "نشط" ? "موقوف" : "نشط";
    setLoading(true);
    try {
      const updatedUser: UnifiedUser = {
        ...user,
        status: newStatus
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedUser)
      });

      if (res.ok) {
        onShowToast(newStatus === "موقوف" ? `🔒 تم تجميد وإيقاف حساب ${user.displayName}` : `🔓 تم تنشيط وتفعيل حساب ${user.displayName}`);
        fetchUsers();
      } else {
        onShowToast("❌ فشل تعديل حالة الحساب");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ شبكة أثناء تحديث حالة الحساب");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (user: UnifiedUser) => {
    if (user.username === "admin") {
      onShowToast("⚠️ لا يمكن حذف حساب المدير العام الأساسي");
      return;
    }

    if (!confirm(`هل أنت متأكد تماماً من حذف حساب [${user.displayName}] نهائياً؟`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(user.username)}`, {
        method: "DELETE"
      });

      if (res.ok) {
        onShowToast(`🗑️ تم حذف حساب [${user.displayName}] من النظام بنجاح`);
        fetchUsers();
      } else {
        onShowToast("❌ فشل حذف حساب الموظف");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالاتصال أثناء حذف الحساب");
    } finally {
      setLoading(false);
    }
  };

  const startEditUser = (user: UnifiedUser) => {
    setUsername(user.username);
    setDisplayName(user.displayName);
    setPassword(user.password);
    setRole(user.role);
    setStatus(user.status);
    setBranch(user.branch || "الكل");
    setCanEnterInvoices(user.canEnterInvoices || false);
    setIsEditing(true);
    onShowToast(`✏️ تعديل بيانات الحساب: ${user.username}`);
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6 space-y-8 mt-6">
      
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-700" />
          <h2 className="text-lg font-bold text-slate-800">إدارة المستخدمين وصلاحيات الموظفين والمراقبين</h2>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg p-2 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 font-bold text-xs gap-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          تحديث الحسابات
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Creation Column */}
        <div className="lg:col-span-1 bg-slate-50 rounded-xl p-5 border border-slate-200/60 space-y-4">
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2.5">
            <UserPlus className="w-4 h-4 text-slate-700 animate-pulse" />
            <h3 className="text-xs font-extrabold text-slate-800">
              {isEditing ? "تعديل حساب موظف نشط" : "إضافة موظف محاسب / مدخل جديد"}
            </h3>
          </div>

          <form onSubmit={handleSaveUser} className="space-y-4">
            
            {/* Username */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">اسم مستخدم الحساب (ID الإنجليزي)</label>
              <input
                type="text"
                required
                disabled={isEditing} // Prevent username changes because it's the ID
                placeholder="e.g. ahmed_pos"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full text-left px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50 disabled:bg-slate-100 font-mono"
              />
              <p className="text-[9px] text-slate-500 font-medium">مستقيل من الحروف الإنجليزية الصغيرة والأرقام فقط (مثل: hassan1).</p>
            </div>

            {/* Display Name */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">اسم الموظف الثنائي (بالعربي)</label>
              <input
                type="text"
                required
                placeholder="أحمد الحامد"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
              />
            </div>

            {/* Password / PIN */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">كلمة المرور أو رمز مرور الموظف (PIN)</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="كلمة مرور الدخول للموظف"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:opacity-50"
                />
                <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* Role selection */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">الدور والجهود المصرح بها:</label>
              <select
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as any;
                  setRole(newRole);
                  if (newRole === "مدير") {
                    setBranch("الكل");
                  }
                }}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold text-slate-700"
              >
                <option value="محاسب">👤 المحاسب المعتمد (المبيعات والرسوم فقط)</option>
                <option value="مدخل فواتير">📥 مدخل فواتير (المشتريات الضريبية فقط)</option>
                <option value="مدير">🛡️ المدير العام (مدير بصلاحيات كاملة شاملة)</option>
              </select>
            </div>

            {/* Branch Selection */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">الفرع المرتبط والمصرح بالدخول له:</label>
              <select
                value={branch}
                disabled={role === "مدير"}
                onChange={(e) => setBranch(e.target.value as any)}
                className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold text-slate-700 disabled:opacity-55 disabled:bg-slate-100"
              >
                <option value="الكل">🏢 كافة الفروع (الكل/غير مقيد)</option>
                <option value="القادسية">📍 فرع القادسية</option>
                <option value="المروج">📍 فرع المروج</option>
              </select>
            </div>

            {/* Accountant Invoice Entry Permission (only if role is accountant) */}
            {role === "محاسب" && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-1.5">
                <label className="flex items-center gap-2 text-xs font-bold text-indigo-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canEnterInvoices}
                    onChange={(e) => setCanEnterInvoices(e.target.checked)}
                    className="w-4 h-4 text-indigo-700 border-indigo-300 rounded focus:ring-indigo-500 accent-indigo-600"
                  />
                  <span>تفويض صلاحية إدخال الفواتير الضريبية</span>
                </label>
                <p className="text-[10px] text-indigo-700 font-medium leading-relaxed">
                  عند تفعيل هذا الخيار، سيتمكن المحاسب من فتح شاشة الفواتير الضريبية وإدخال فواتير المصروفات لكلا الفرعين لتتدفق بانتظار اعتماد المدير العام.
                </p>
              </div>
            )}

            {/* Status selection */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700">حالة نشاط الحساب بالنظام:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={status === "نشط"}
                    onChange={() => setStatus("نشط")}
                    className="accent-indigo-600"
                  />
                  <span>نشط ودخول مسموح</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={status === "موقوف"}
                    onChange={() => setStatus("موقوف")}
                    className="accent-rose-600"
                  />
                  <span className="text-rose-600">موقوف/مجمد (Block)</span>
                </label>
              </div>
            </div>

            {/* Submit and action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-lg transition-all text-center cursor-pointer disabled:opacity-50"
              >
                {isEditing ? "تحديث الحساب" : "إنشاء الحساب المالي"}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setUsername("");
                    setDisplayName("");
                    setPassword("");
                    setRole("محاسب");
                    setStatus("نشط");
                    setBranch("الكل");
                    setCanEnterInvoices(false);
                    setIsEditing(false);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-3 rounded-lg transition-all cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Users Table List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800/80">الموظفين المعتمدين وسجل الصلاحيات الحالي:</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
              إجمالي الموظفين: {users.length}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-3xs">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 shadow-3xs">
                  <th className="p-3 text-right">الموظف</th>
                  <th className="p-3">اسم المستخدم ID</th>
                  <th className="p-3">الصلاحية المالية</th>
                  <th className="p-3">الفرع المرتبط</th>
                  <th className="p-3">رمز PIN</th>
                  <th className="p-3">الحالة ودخول</th>
                  <th className="p-3 text-center">خيارات التعديل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const roleColors = {
                    "مدير": "bg-indigo-50 border border-indigo-200 text-indigo-700",
                    "محاسب": "bg-emerald-50 border border-emerald-200 text-emerald-700",
                    "مدخل فواتير": "bg-amber-50 border border-amber-200 text-amber-500"
                  };
                  return (
                    <tr key={user.username} className="hover:bg-slate-50/50">
                      <td className="p-3 font-extrabold text-slate-800">{user.displayName}</td>
                      <td className="p-3 font-mono text-[11px] text-slate-500">{user.username}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${roleColors[user.role] || "bg-slate-100"}`}>
                            {user.role}
                          </span>
                          {user.role === "محاسب" && user.canEnterInvoices && (
                            <span className="text-[9px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap">
                              📝 مفوض بالفواتير الضريبية
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-extrabold text-[10px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                          {user.branch || "الكل"}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 font-medium">{user.password}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${user.status === 'نشط' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'نشط' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                          {user.status === 'نشط' ? 'نشط ومصرح' : 'موقف (Block)'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => startEditUser(user)}
                            className="bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 p-1.5 rounded-md transition-all font-bold text-[10px] border border-slate-200 hover:border-indigo-100"
                            title="تعديل حساب الموظف"
                          >
                            تعديل
                          </button>
                          
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={user.username === "admin"}
                            className={`p-1.5 rounded-md transition-all font-bold text-[10px] border ${
                              user.status === "نشط"
                                ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-150"
                            } disabled:opacity-30`}
                            title={user.status === "نشط" ? "تجميد الحساب مؤقتاً" : "إلغاء التجميد وتفعيل الحساب"}
                          >
                            {user.status === "نشط" ? "🔒 تجميد" : "🔓 تفعيل"}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.username === "admin"}
                            className="bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-700 p-1.5 rounded-md transition-all disabled:opacity-30 flex items-center justify-center"
                            title="حذف الحساب نهائياً من النظام"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 text-slate-700 text-[10px] font-bold py-3 px-4 rounded-xl leading-relaxed flex items-start gap-2 max-w-2xl">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong>ملاحظة هامة للمدير العام:</strong> حساب 
              <span className="font-mono bg-amber-100 px-1 py-0.2 rounded mx-0.5 text-amber-900">admin</span> 
              هو الحساب الرئيسي والإداري للشركة ولا يمكن حذفه أو تجميده لضمان عدم تأمين دخولك إلى النظام تحت أي ظرف. تذكر الموظفين الجدد لتغيير كلمات مرورهم ورمز الـ PIN بانتظام لضمان حوكمة مالية فائقة الدقة.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
