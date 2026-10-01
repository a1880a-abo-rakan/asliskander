import React, { useState, useEffect, useRef } from "react";
import { 
  X, Camera, Plus, Trash2, CheckCircle2, AlertCircle, Eye, 
  Upload, Sparkles, ShieldCheck, Clock, RefreshCw, ZoomIn
} from "lucide-react";
import { VegGrocItem, VegGrocRecord } from "../types";

interface VegGrocModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: "القادسية" | "المروج";
  date: string;
  userRole: string;
  userName?: string;
  onSaved: (vegTotal: number, grocTotal: number, record: VegGrocRecord) => void;
}

const DEFAULT_VEG_NAMES = [
  "خس",
  "طماطم",
  "ثوم",
  "بيض",
  "برتقال",
  "ليمون",
  "بهارات"
];

// Helper to compress images via canvas to ~50-80KB to ensure fast transmission
async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1000;
        const maxHeight = 1000;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(readerEvent.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("فشل قراءة ملف الصورة"));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = () => reject(new Error("فشل فتح الملف"));
    reader.readAsDataURL(file);
  });
}

export default function VegGrocModal({
  isOpen,
  onClose,
  branch,
  date,
  userRole,
  userName = "المحاسب عبدالله",
  onSaved
}: VegGrocModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active record
  const [recordStatus, setRecordStatus] = useState<"new" | "pending" | "approved">("new");
  const [approvedAt, setApprovedAt] = useState<string | undefined>();
  const [approvedBy, setApprovedBy] = useState<string | undefined>();

  // Veg items state
  const [vegItems, setVegItems] = useState<VegGrocItem[]>([]);
  // Detergents & grocery items state
  const [grocItems, setGrocItems] = useState<VegGrocItem[]>([]);

  // Second Accountant extra amounts state
  const [secondAccountantExtraVeg, setSecondAccountantExtraVeg] = useState<number>(0);
  const [secondAccountantGrocItems, setSecondAccountantGrocItems] = useState<{ id: string; amt: number }[]>([]);
  const [secondAccountantEnteredBy, setSecondAccountantEnteredBy] = useState<string | undefined>();

  // Image preview modal (lightbox)
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Hidden file inputs dispatcher
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetItemUploadId, setTargetItemUploadId] = useState<{ id: string; category: "خضار" | "منظفات_وبقالة" } | null>(null);

  const isManager = userRole === "مدير";
  const isLocked = recordStatus === "approved" && !isManager;

  // Initialize or fetch data whenever modal opens
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    fetchData();
  }, [isOpen, branch, date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/veg-groc?branch=${encodeURIComponent(branch)}&date=${encodeURIComponent(date)}`);
      if (res.ok) {
        const data: VegGrocRecord & { status: "new" | "pending" | "approved" } = await res.json();
        
        setRecordStatus(data.status || "new");
        setApprovedAt(data.approvedAt);
        setApprovedBy(data.approvedBy);

        const loadedItems = Array.isArray(data.items) ? data.items : [];
        const loadedVeg = loadedItems.filter(i => i.category === "خضار");
        const loadedGroc = loadedItems.filter(i => i.category === "منظفات_وبقالة");

        // Prepare vegetables items (ensure all standard 7 default vegetables are present)
        const builtVegList: VegGrocItem[] = DEFAULT_VEG_NAMES.map((name, idx) => {
          const found = loadedVeg.find(v => v.name.trim() === name.trim());
          if (found) return found;
          return {
            id: `veg_default_${idx}`,
            category: "خضار",
            name,
            price: 0,
            status: "pending"
          };
        });

        // Add any extra custom vegetables that were previously added
        loadedVeg.forEach(v => {
          if (!DEFAULT_VEG_NAMES.some(def => def.trim() === v.name.trim())) {
            builtVegList.push(v);
          }
        });

        setVegItems(builtVegList);

        // Detergents & groceries items
        if (loadedGroc.length > 0) {
          setGrocItems(loadedGroc);
        } else {
          setGrocItems([
            {
              id: `groc_${Date.now()}_0`,
              category: "منظفات_وبقالة",
              name: "",
              price: 0,
              status: "pending"
            }
          ]);
        }
        setSecondAccountantExtraVeg(data.secondAccountantExtraVeg || 0);
        setSecondAccountantGrocItems(Array.isArray(data.secondAccountantExtraGrocItems) ? data.secondAccountantExtraGrocItems : []);
        setSecondAccountantEnteredBy(data.secondAccountantEnteredBy);
      }
    } catch (err: any) {
      console.error("Error fetching veg/groc data:", err);
      setErrorMsg("تعذر تحميل البيانات: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculations
  const totalVeg = vegItems.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
  const totalGroc = grocItems.reduce((acc, it) => acc + (Number(it.price) || 0), 0);
  const grandTotal = totalVeg + totalGroc;

  // Second Accountant calculations
  const secondAccountantVeg = Number(secondAccountantExtraVeg) || 0;
  const secondAccountantGroc = secondAccountantGrocItems.reduce((acc, it) => acc + (Number(it.amt) || 0), 0);
  const combinedVeg = Number((totalVeg + secondAccountantVeg).toFixed(2));
  const combinedGroc = Number((totalGroc + secondAccountantGroc).toFixed(2));
  const combinedGrandTotal = Number((combinedVeg + combinedGroc).toFixed(2));

  // Handlers for Veg items
  const updateVegPrice = (id: string, price: number) => {
    setVegItems(prev => prev.map(item => item.id === id ? { ...item, price } : item));
  };

  const updateVegName = (id: string, name: string) => {
    setVegItems(prev => prev.map(item => item.id === id ? { ...item, name } : item));
  };

  const addCustomVeg = () => {
    setVegItems(prev => [
      ...prev,
      {
        id: `veg_custom_${Date.now()}`,
        category: "خضار",
        name: "",
        price: 0,
        status: "pending"
      }
    ]);
  };

  const removeCustomVeg = (id: string) => {
    setVegItems(prev => prev.filter(item => item.id !== id));
  };

  // Handlers for Detergents & Grocery items
  const updateGrocField = (id: string, field: "name" | "price", value: any) => {
    setGrocItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addGrocItem = () => {
    setGrocItems(prev => [
      ...prev,
      {
        id: `groc_${Date.now()}`,
        category: "منظفات_وبقالة",
        name: "",
        price: 0,
        status: "pending"
      }
    ]);
  };

  const removeGrocItem = (id: string) => {
    setGrocItems(prev => prev.filter(item => item.id !== id));
  };

  // Photo capture trigger
  const triggerImageCapture = (id: string, category: "خضار" | "منظفات_وبقالة") => {
    setTargetItemUploadId({ id, category });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetItemUploadId) return;

    try {
      const compressedDataUrl = await compressImageFile(file);
      const { id, category } = targetItemUploadId;

      if (category === "خضار") {
        setVegItems(prev => prev.map(item => item.id === id ? { ...item, invoiceImage: compressedDataUrl } : item));
      } else {
        setGrocItems(prev => prev.map(item => item.id === id ? { ...item, invoiceImage: compressedDataUrl } : item));
      }
      setSuccessMsg("تم إرفاق صورة الفاتورة بنجاح");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg("فشل معالجة الصورة: " + err.message);
    }
  };

  const removeImage = (id: string, category: "خضار" | "منظفات_وبقالة") => {
    if (category === "خضار") {
      setVegItems(prev => prev.map(item => item.id === id ? { ...item, invoiceImage: undefined } : item));
    } else {
      setGrocItems(prev => prev.map(item => item.id === id ? { ...item, invoiceImage: undefined } : item));
    }
  };

  // Save handler (by Abdullah or Accountant)
  const handleSave = async () => {
    if (isLocked) {
      setErrorMsg("تم اعتماد فواتير الخضار والبقالة لهذا اليوم رسمياً من المدير العام. لا يمكن التعديل بعد الاعتماد.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Only include items with non-empty names or prices > 0
    const activeVeg = vegItems.filter(v => v.price > 0 || (v.name && v.name.trim() !== ""));
    const activeGroc = grocItems.filter(g => g.price > 0 || (g.name && g.name.trim() !== ""));
    const allItems = [...activeVeg, ...activeGroc];

    try {
      const res = await fetch("/api/veg-groc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch,
          date,
          items: allItems,
          enteredBy: userName,
          userRole
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "فشل حفظ فواتير الخضار والبقالة");
      }

      setRecordStatus(isManager && recordStatus === "approved" ? "approved" : "pending");
      setSuccessMsg("تم حفظ فواتير الخضار والبقالة بنجاح، وهي الآن بانتظار مراجعة واعتماد المدير العام.");
      onSaved(totalVeg, totalGroc, json.record);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  };

  // Delete / Clear all veg & groc for this day (available before manager approval)
  const handleDeleteAllDay = async () => {
    if (isLocked) {
      setErrorMsg("فواتير الخضار والبقالة معتمدة رسمياً من المدير العام. لا يسمح للمحاسب بالحذف بعد الاعتماد.");
      return;
    }

    if (!confirm("هل أنت متأكد من حذف وتفريغ جميع فواتير الخضار والبقالة لهذا اليوم؟\nسيتم مسح كافة الأصناف والأسعار وتصبح فارغة.")) {
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/veg-groc?branch=${encodeURIComponent(branch)}&date=${encodeURIComponent(date)}&userRole=${encodeURIComponent(userRole)}`, {
        method: "DELETE"
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "فشل حذف فواتير الخضار والبقالة");
      }

      // Reset local state to empty default
      const freshVeg: VegGrocItem[] = DEFAULT_VEG_NAMES.map((name, idx) => ({
        id: `veg_default_${idx}`,
        category: "خضار",
        name,
        price: 0,
        status: "pending"
      }));
      setVegItems(freshVeg);
      setGrocItems([
        {
          id: `groc_${Date.now()}_0`,
          category: "منظفات_وبقالة",
          name: "",
          price: 0,
          status: "pending"
        }
      ]);
      setRecordStatus("new");
      setApprovedAt(undefined);
      setApprovedBy(undefined);
      setSecondAccountantExtraVeg(0);
      setSecondAccountantGrocItems([]);

      const emptyRecord: VegGrocRecord = {
        id: `${branch}-${date}`,
        branch,
        date,
        items: [],
        totalVeg: 0,
        totalGroc: 0,
        status: "new",
        secondAccountantExtraVeg: 0,
        secondAccountantExtraGrocItems: [],
        secondAccountantTotalVeg: 0,
        secondAccountantTotalGroc: 0,
        combinedTotalVeg: 0,
        combinedTotalGroc: 0,
        combinedGrandTotal: 0
      };

      onSaved(0, 0, emptyRecord);
      setSuccessMsg("تم حذف فواتير الخضار والبقالة وتفريغ هذا اليوم بنجاح.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء الحذف");
    } finally {
      setSaving(false);
    }
  };

  // Manager Approval Handler
  // Requirement: "ثم يعتمده فتحذف الصورة ولا تبقى حتى لا تثقل على الموقع بعد اعتماد المدير تظهر عند المحاسب الثاني"
  const handleManagerApprove = async () => {
    if (!confirm("هل أنت متأكد من اعتماد فواتير الخضار والبقالة لهذا اليوم؟\nسيتم حذف وتفريغ جميع صور الفواتير فوراً لتخفيف العبء على الموقع وتثبيت الأرقام للمحاسب الثاني.")) {
      return;
    }

    setApproving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/veg-groc/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch,
          date,
          approvedBy: userName || "المدير العام"
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "فشل اعتماد الفواتير");
      }

      setRecordStatus("approved");
      setApprovedAt(new Date().toISOString());
      setApprovedBy(userName || "المدير العام");

      // Strip images from local state as well
      setVegItems(prev => prev.map(it => ({ ...it, status: "approved", invoiceImage: undefined })));
      setGrocItems(prev => prev.map(it => ({ ...it, status: "approved", invoiceImage: undefined })));

      setSuccessMsg("تم اعتماد فواتير الخضار والبقالة بنجاح! تم تفريغ الصور لتسريع الموقع، وستظهر الأرقام الآن تلقائياً للمحاسب الثاني.");
      onSaved(totalVeg, totalGroc, json.record);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء الاعتماد");
    } finally {
      setApproving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs overflow-y-auto">
      {/* Hidden file input for invoice camera/photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 text-emerald-700 rounded-2xl">
              <span className="text-2xl">🥬</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  إدخال وتفصيل فواتير الخضار والبقالة / المنظفات
                </h2>
                {recordStatus === "approved" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> معتمد رسمياً
                  </span>
                ) : recordStatus === "pending" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> بانتظار اعتماد المدير
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-250">
                    قيد الإدخال
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                فرع {branch} &bull; تاريخ: <span className="font-mono font-bold text-slate-700">{date}</span> &bull; الحساب: {userName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Manager Review Callout & Approve Banner */}
        {isManager && (
          <div className="px-6 py-3 bg-linear-to-r from-amber-50 to-orange-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs text-amber-900">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">لوحة اعتماد المدير العام:</span> يمكنك فحص مسميات الأصناف والأسعار وصور الفواتير.
                عند الاعتماد، سيتم حذف الصور لتخفيف الموقع وتثبيت الأرقام للمحاسب الثاني.
              </div>
            </div>

            {recordStatus !== "approved" && (
              <button
                type="button"
                onClick={handleManagerApprove}
                disabled={approving || grandTotal === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                {approving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> جاري الاعتماد...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> اعتماد وحذف الصور فوراً
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Accountant Approved Locking Banner */}
        {isLocked && (
          <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-black">معتمد رسمياً من المدير العام:</span> تم اعتماد وتثبيت فواتير هذا اليوم.
                <span className="block sm:inline sm:mr-1 font-bold text-emerald-700">
                  لا يسمح للمحاسب عبدالله بالتعديل أو الحذف بعد اعتماد المدير.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-200 text-emerald-800 text-[11px] font-black rounded-lg shrink-0">
              🔒 مغلق للتعديل والحذف
            </span>
          </div>
        )}

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              <span className="text-xs font-bold">جاري تحميل فواتير الخضار والبقالة...</span>
            </div>
          ) : (
            <>
              {/* SECTION 1: الخضار (Vegetables) */}
              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🥬</span>
                    <h3 className="text-sm font-extrabold text-slate-800">
                      أصناف الخضار المحددة والإضافية
                    </h3>
                  </div>
                  <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    إجمالي الخضار: {totalVeg.toFixed(2)} ريال
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {vegItems.map((item, idx) => {
                    const isCustom = idx >= DEFAULT_VEG_NAMES.length;
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs"
                      >
                        {/* Name */}
                        <div className="flex-1 min-w-[130px]">
                          {isCustom ? (
                            <input
                              type="text"
                              placeholder="اسم صنف الخضار الجديد"
                              value={item.name}
                              disabled={isLocked}
                              readOnly={isLocked}
                              onChange={(e) => updateVegName(item.id, e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs font-bold border rounded-lg ${
                                isLocked
                                  ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                                  : "border-slate-250 text-slate-900 bg-amber-50/30 focus:outline-none focus:ring-1 focus:ring-amber-500"
                              }`}
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-xs font-bold text-slate-800">{item.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Price Input & Camera */}
                        <div className="flex items-center gap-2">
                          <div className="relative w-28">
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.price === 0 ? "" : item.price}
                              disabled={isLocked}
                              readOnly={isLocked}
                              onChange={(e) => updateVegPrice(item.id, parseFloat(e.target.value) || 0)}
                              className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold text-left border rounded-lg ${
                                isLocked
                                  ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed"
                                  : "border-slate-250 text-black bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              }`}
                              style={{ color: isLocked ? "#475569" : "#000000" }}
                              title={isLocked ? "معتمد رسمياً من المدير - مغلق للتعديل" : undefined}
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400 pointer-events-none">
                              ر.س
                            </span>
                          </div>

                          {/* Invoice Image Preview or Upload */}
                          {item.invoiceImage ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="عرض صورة الفاتورة"
                                onClick={() => setPreviewImage({ url: item.invoiceImage!, title: `فاتورة ${item.name}` })}
                                className="relative w-8 h-8 rounded-lg overflow-hidden border border-emerald-300 group cursor-pointer"
                              >
                                <img
                                  src={item.invoiceImage}
                                  alt="فاتورة"
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ZoomIn className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                              {!isLocked && recordStatus !== "approved" && (
                                <button
                                  type="button"
                                  title="حذف الصورة"
                                  onClick={() => removeImage(item.id, "خضار")}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            !isLocked && recordStatus !== "approved" ? (
                              <button
                                type="button"
                                onClick={() => triggerImageCapture(item.id, "خضار")}
                                title="تصوير فاتورة الصنف"
                                className="px-2 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Camera className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="hidden sm:inline">فاتورة</span>
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                                مفرغة
                              </span>
                            )
                          )}

                          {/* Delete custom item button */}
                          {isCustom && !isLocked && recordStatus !== "approved" && (
                            <button
                              type="button"
                              onClick={() => removeCustomVeg(item.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                              title="حذف الصنف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isLocked && recordStatus !== "approved" && (
                  <button
                    type="button"
                    onClick={addCustomVeg}
                    className="w-full py-2 border border-dashed border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/50 text-emerald-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" /> إضافة صنف خضار إضافي جديد
                  </button>
                )}
              </div>

              {/* SECTION 2: المنظفات والبقالة (Detergents & Grocery) */}
              <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧼</span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">
                        المنظفات والبقالة
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        إدخال اسم الصنف وقيمته وصورة فاتورته
                      </p>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    إجمالي البقالة والمنظفات: {totalGroc.toFixed(2)} ريال
                  </div>
                </div>

                <div className="space-y-2.5">
                  {grocItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all shadow-2xs"
                    >
                      {/* Name */}
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="اسم صنف المنظفات أو البقالة (مثال: صابون، كلوركس، مناديل...)"
                          value={item.name}
                          disabled={isLocked}
                          readOnly={isLocked}
                          onChange={(e) => updateGrocField(item.id, "name", e.target.value)}
                          className={`w-full px-3 py-1.5 text-xs font-bold border rounded-lg ${
                            isLocked
                              ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed"
                              : "border-slate-250 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          }`}
                        />
                      </div>

                      {/* Price & Image */}
                      <div className="flex items-center gap-2">
                        <div className="relative w-32">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.price === 0 ? "" : item.price}
                            disabled={isLocked}
                            readOnly={isLocked}
                            onChange={(e) => updateGrocField(item.id, "price", parseFloat(e.target.value) || 0)}
                            className={`w-full px-2.5 py-1.5 text-xs font-mono font-bold text-left border rounded-lg ${
                              isLocked
                                ? "bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed"
                                : "border-slate-250 text-black bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            }`}
                            style={{ color: isLocked ? "#475569" : "#000000" }}
                            title={isLocked ? "معتمد رسمياً من المدير - مغلق للتعديل" : undefined}
                          />
                          <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400 pointer-events-none">
                            ر.س
                          </span>
                        </div>

                        {/* Invoice Image */}
                        {item.invoiceImage ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="عرض صورة الفاتورة"
                              onClick={() => setPreviewImage({ url: item.invoiceImage!, title: `فاتورة ${item.name || "منظفات"}` })}
                              className="relative w-8 h-8 rounded-lg overflow-hidden border border-blue-300 group cursor-pointer"
                            >
                              <img
                                src={item.invoiceImage}
                                alt="فاتورة"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn className="w-3.5 h-3.5 text-white" />
                              </div>
                            </button>
                            {!isLocked && recordStatus !== "approved" && (
                              <button
                                type="button"
                                title="حذف الصورة"
                                onClick={() => removeImage(item.id, "منظفات_وبقالة")}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          !isLocked && recordStatus !== "approved" ? (
                            <button
                              type="button"
                              onClick={() => triggerImageCapture(item.id, "منظفات_وبقالة")}
                              title="تصوير فاتورة الصنف"
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Camera className="w-3.5 h-3.5 text-blue-600" />
                              <span>تصوير فاتورة</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                              مفرغة
                            </span>
                          )
                        )}

                        {/* Delete row */}
                        {!isLocked && recordStatus !== "approved" && grocItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeGrocItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {!isLocked && recordStatus !== "approved" && (
                  <button
                    type="button"
                    onClick={addGrocItem}
                    className="w-full py-2 border border-dashed border-blue-300 hover:border-blue-500 bg-white hover:bg-blue-50/50 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" /> إضافة صنف منظفات أو بقالة جديد
                  </button>
                )}
              </div>

              {/* SECTION 3: مدخلات المحاسب الثاني والمجموع المعتمد */}
              <div className="bg-linear-to-r from-blue-50/70 to-indigo-50/70 rounded-2xl p-4 border border-blue-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between border-b border-blue-200/60 pb-2.5 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💼</span>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">
                        مدخلات ومشتريات المحاسب الثاني ({secondAccountantEnteredBy || "المحاسب الثاني"})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        مبالغ إجمالية بدون تفاصيل الأصناف تُجمع مع فواتير المحاسب عبدالله بعد اعتماد المدير
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                      خضار: {secondAccountantVeg.toFixed(2)} ر.س
                    </span>
                    <span className="text-xs font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">
                      بقالة: {secondAccountantGroc.toFixed(2)} ر.س
                    </span>
                  </div>
                </div>

                {secondAccountantVeg > 0 || secondAccountantGroc > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-blue-150 shadow-2xs">
                      <span className="text-slate-500 block mb-1">مشتريات خضار من المحاسب الثاني:</span>
                      <span className="font-mono text-emerald-700 text-sm font-black">{secondAccountantVeg.toFixed(2)} ر.س</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-blue-150 shadow-2xs">
                      <span className="text-slate-500 block mb-1">مشتريات بقالة من المحاسب الثاني:</span>
                      <div className="space-y-1">
                        {secondAccountantGrocItems.length > 0 ? (
                          secondAccountantGrocItems.map((g, idx) => (
                            <div key={g.id || idx} className="flex justify-between items-center text-[11px]">
                              <span className="text-slate-600">سلعة بقالة {idx + 1}:</span>
                              <span className="font-mono font-bold text-blue-700">{Number(g.amt).toFixed(2)} ر.س</span>
                            </div>
                          ))
                        ) : (
                          <span className="font-mono text-blue-700 text-sm font-black">{secondAccountantGroc.toFixed(2)} ر.س</span>
                        )}
                        <div className="pt-1 border-t border-slate-100 flex justify-between font-bold">
                          <span>إجمالي بقالة المحاسب الثاني:</span>
                          <span className="font-mono text-blue-800">{secondAccountantGroc.toFixed(2)} ر.س</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white/80 rounded-xl border border-dashed border-blue-200 text-xs text-slate-500 text-center">
                    لم يُدخل المحاسب الثاني مبالغ إضافية لهذا اليوم حتى الآن. في حال أدخل مبالغ من حسابه ستظهر هنا تلقائياً وتُجمع مع فواتير المحاسب عبدالله بعد اعتماد المدير.
                  </div>
                )}

                {/* Combined Total Summary Card */}
                <div className="p-3 bg-linear-to-r from-emerald-600 to-teal-700 text-white rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold opacity-90">المجموع الكلي المعتمد في حساب المدير (عبدالله + المحاسب الثاني):</div>
                    <div className="text-sm font-black">
                      خضار: <span className="font-mono">{combinedVeg.toFixed(2)} ر.س</span> &bull; بقالة: <span className="font-mono">{combinedGroc.toFixed(2)} ر.س</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold opacity-80 block">الإجمالي الكلي النهائي</span>
                    <span className="text-base font-black font-mono tracking-tight">{combinedGrandTotal.toFixed(2)} ر.س</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <span className="text-slate-600">
              خضار مجمع: <span className="font-mono text-emerald-700 font-extrabold">{combinedVeg.toFixed(2)} ر.س</span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">
              بقالة مجمعة: <span className="font-mono text-blue-700 font-extrabold">{combinedGroc.toFixed(2)} ر.س</span>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-900 font-black">
              الإجمالي الكلي: <span className="font-mono text-amber-600 text-sm font-black">{combinedGrandTotal.toFixed(2)} ر.س</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
            >
              إغلاق
            </button>

            {/* Delete / Clear button available for Abdullah before approval, or for Manager */}
            {!isLocked && (grandTotal > 0 || recordStatus === "pending" || vegItems.some(v => v.price > 0)) && (
              <button
                type="button"
                onClick={handleDeleteAllDay}
                disabled={saving || loading}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                title="حذف وتفريغ جميع فواتير الخضار والبقالة لهذا اليوم"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>حذف وتفريغ فواتير اليوم</span>
              </button>
            )}

            {!isLocked && recordStatus !== "approved" && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> جاري الحفظ...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> حفظ وإرسال للاعتماد
                  </>
                )}
              </button>
            )}

            {isManager && recordStatus !== "approved" && (
              <button
                type="button"
                onClick={handleManagerApprove}
                disabled={approving || combinedGrandTotal === 0}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                {approving ? "جاري الاعتماد..." : "اعتماد الفواتير وحذف الصور"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden p-3 border border-slate-700 flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-2 text-white text-xs font-bold">
              <span>{previewImage.title}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt="فاتورة"
              className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
