import React, { useState, useEffect, useRef } from "react";
import { TaxInvoice, TaxInvoiceItem } from "../types";
import ReorderTimerBanner from "./ReorderTimerBanner";
import { 
  Receipt, 
  Calendar, 
  Plus, 
  Trash, 
  Library, 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  FileText,
  Sparkles,
  UploadCloud,
  Camera,
  Loader2,
  CheckCircle2,
  ArrowDownToLine,
  Edit,
  Pen,
  Building2,
  Check,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Eye,
  Bell,
  BellRing
} from "lucide-react";

interface TaxTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
  userBranch?: "الكل" | "القادسية" | "المروج";
}

interface InvoiceInput {
  company: string;
  invoice_no: string;
  invoice_date: string;
  amount: number | "";
  items?: TaxInvoiceItem[];
}

// Arabic-optimized string normalization for fuzzy comparison
function normalizeArabicString(str: string): string {
  if (!str) return "";
  let s = str.trim().toLowerCase();
  // Remove punctuation
  s = s.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  // Replace multiple spaces with single
  s = s.replace(/\s+/g, " ");
  // Normalize Alif
  s = s.replace(/[أإآ]/g, "ا");
  // Normalize Ta-Marbuta
  s = s.replace(/ة/g, "ه");
  // Normalize Ya
  s = s.replace(/ى/g, "ي");
  return s;
}

// Levenshtein Distance calculation
function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Check if entered name is very close to an existing company name from database
function checkSimilarity(entered: string, existingList: string[]): { matches: boolean; similarName: string } {
  const normEntered = normalizeArabicString(entered);
  if (!normEntered || normEntered.length < 3) return { matches: false, similarName: "" };

  for (const ext of existingList) {
    const normExt = normalizeArabicString(ext);
    if (ext === entered || normExt === normEntered) continue; // Exact matches are fine

    // Compute similarity ratio
    const distance = getLevenshteinDistance(normEntered, normExt);
    const maxLen = Math.max(normEntered.length, normExt.length);
    const similarity = (maxLen - distance) / maxLen;

    // Threshold: 75% similarity or distance <= 3
    if (similarity >= 0.70 && distance <= 4) {
      return { matches: true, similarName: ext };
    }
  }
  return { matches: false, similarName: "" };
}

// Unified company name resolution function (Principle 2)
function getUnifiedCompanyName(entered: string, existingList: string[]): string {
  const trimmed = entered.trim();
  if (!trimmed) return "";

  const normEntered = normalizeArabicString(trimmed);

  // 1. First, search for EXACT match (with or without normalization)
  // If there is an exact match in the database, keep it as is
  const exactMatch = existingList.find(ext => ext.trim() === trimmed);
  if (exactMatch) return exactMatch;

  // 2. Next, search for normalized exact match (solving typos like hamza, ta-marbuta, etc.)
  const normalizedExactMatch = existingList.find(ext => normalizeArabicString(ext) === normEntered);
  if (normalizedExactMatch) {
    return normalizedExactMatch; // Automatically unify to the existing database name!
  }

  // 3. Fallback to entered name if no match found
  return trimmed;
}

interface TaxCompany {
  id: string;
  name: string;
}

interface SearchableCompanyInputProps {
  value: string;
  onChange: (val: string) => void;
  registeredCompanies: TaxCompany[];
  onRegisterCompany: (name: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  id?: string;
}

function SearchableCompanyInput({
  value,
  onChange,
  registeredCompanies,
  onRegisterCompany,
  placeholder = "ابحث بالاسم أو اختر...",
  className = "w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold",
  id
}: SearchableCompanyInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch(value || "");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [value]);

  const normSearch = normalizeArabicString(search);
  const filtered = registeredCompanies.filter(comp => {
    if (!search) return true;
    const normComp = normalizeArabicString(comp.name);
    return normComp.includes(normSearch) || comp.name.includes(search);
  });

  const exactMatchExists = registeredCompanies.some(comp => 
    normalizeArabicString(comp.name) === normSearch || comp.name.trim() === search.trim()
  );

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        id={id}
        type="text"
        required
        placeholder={placeholder}
        value={search}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
          onChange(e.target.value);
        }}
        className={className}
        autoComplete="off"
      />
      
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg divide-y divide-slate-100 animate-fadeIn text-right rtl">
          {filtered.length > 0 ? (
            <div className="p-1">
              {filtered.map((comp) => {
                const isSelected = comp.name === value;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => {
                      onChange(comp.name);
                      setSearch(comp.name);
                      setIsOpen(false);
                    }}
                    className={`w-full text-right px-3 py-2 text-xs font-bold rounded-md flex items-center justify-between transition-colors ${
                      isSelected 
                        ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100" 
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span>{comp.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-slate-400 font-medium animate-pulse">
              لا توجد نتائج تطابق "{search}" 🔍
            </div>
          )}

          {search.trim() !== "" && !exactMatchExists && (
            <div className="p-1.5 bg-slate-50">
              <button
                type="button"
                onClick={async () => {
                  setIsOpen(false);
                  await onRegisterCompany(search);
                }}
                className="w-full text-right px-3 py-2 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50 rounded-md flex items-center gap-1.5 transition-colors border border-dashed border-emerald-200 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>➕ تسجيل المورد الجديد "{search}"</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Generate all sequential dates from the start range (from) to the end range (to)
const getDatesInRange = (startStr: string, endStr: string): string[] => {
  if (!startStr || !endStr) return [];
  const dates: string[] = [];
  const start = new Date(startStr);
  const end = new Date(endStr);
  const curr = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  
  while (curr <= last) {
    const yr = curr.getUTCFullYear();
    const mo = String(curr.getUTCMonth() + 1).padStart(2, '0');
    const dy = String(curr.getUTCDate()).padStart(2, '0');
    dates.push(`${yr}-${mo}-${dy}`);
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
};

// Module-level caches for instant UI switching (Stale-While-Revalidate)
let cachedPendingInvoices: TaxInvoice[] = [];
let cachedCarryovers: any[] = [];
let cachedRegisteredCompanies: TaxCompany[] = [];
let cachedAllCompanies: string[] = [];
let cachedInvoices: TaxInvoice[] = [];
let cachedStats: { qPos: number; mPos: number; totalPos: number } | null = null;
let cachedReportRawData: any = null;
let hasInitiallyLoaded = false;

export default function TaxTab({ onShowToast, userRole, userBranch }: TaxTabProps) {
  const currentUser = (() => {
    const saved = sessionStorage.getItem("alex_user_session");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  })();

  const [date, setDate] = useState(() => {
    const saved = sessionStorage.getItem("app_tax_invoice_date");
    return saved ? saved : new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    sessionStorage.setItem("app_tax_invoice_date", date);
  }, [date]);

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
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: "",
    message: "",
    onConfirm: () => {}
  });

  // Invoice edit states for مدیر (Admin)
  const [editModal, setEditModal] = useState<{
    show: boolean;
    invoice: TaxInvoice | null;
  }>({
    show: false,
    invoice: null
  });
  const [editCompany, setEditCompany] = useState("");
  const [editInvoiceNo, setEditInvoiceNo] = useState("");
  const [editInvoiceDate, setEditInvoiceDate] = useState("");
  const [editAmount, setEditAmount] = useState<number | string>("");
  const [editBranch, setEditBranch] = useState<"القادسية" | "المروج">("القادسية");
  const [editDate, setEditDate] = useState("");
  const [previewInvoice, setPreviewInvoice] = useState<TaxInvoice | null>(null);
  const [previewAmountStr, setPreviewAmountStr] = useState<string>("");

  useEffect(() => {
    if (previewInvoice) {
      setPreviewAmountStr(String(previewInvoice.amount));
    } else {
      setPreviewAmountStr("");
    }
  }, [previewInvoice?.id]);
  const [previewImgZoom, setPreviewImgZoom] = useState(1);
  const [previewImgRotation, setPreviewImgRotation] = useState(0);
  const [previewImgPan, setPreviewImgPan] = useState({ x: 0, y: 0 });
  const [previewIsDraggingPan, setPreviewIsDraggingPan] = useState(false);
  const previewDragStart = useRef({ x: 0, y: 0 });
  const [pendingInvoices, setPendingInvoices] = useState<TaxInvoice[]>(() => cachedPendingInvoices);
  
  const [carryovers, setCarryovers] = useState<any[]>(() => cachedCarryovers);

  const loadCarryovers = async () => {
    try {
      const res = await fetch(`/api/carryover?branch=${branch}`);
      if (res.ok) {
        const list = await res.json();
        cachedCarryovers = list;
        setCarryovers(list);
      }
    } catch (err) {
      console.error("Error loading carryovers in TaxTab:", err);
    }
  };

  useEffect(() => {
    loadCarryovers();
  }, [branch]);
  
  // Multiple incoming invoice submissions
  const [rows, setRows] = useState<InvoiceInput[]>([
    { company: "", invoice_no: "", invoice_date: "", amount: "" }
  ]);

  // Company filtering & similarity states
  const [registeredCompanies, setRegisteredCompanies] = useState<TaxCompany[]>(() => cachedRegisteredCompanies);
  const [showSuppliersManager, setShowSuppliersManager] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editingSupplierName, setEditingSupplierName] = useState<string>("");
  const [allCompanies, setAllCompanies] = useState<string[]>(() => cachedAllCompanies);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("الكل");
  const [ignoredSimilarities, setIgnoredSimilarities] = useState<Record<string, boolean>>({});

  // AI OCR States
  const [ocrLoading, setOcrLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedInvoices, setParsedInvoices] = useState<Array<{
    company: string;
    invoice_no: string;
    invoice_date: string;
    amount: number | string | "";
    tempId: string;
    success: boolean;
    error?: string;
    rawImage?: string;
    originalObjectUrl?: string;
    fileType?: string;
    isRetrying?: boolean;
    items?: TaxInvoiceItem[];
  }>>([]);

  const [auditInvoiceId, setAuditInvoiceId] = useState<string | null>(null);
  const [imgZoom, setImgZoom] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);
  const [imgPan, setImgPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processFiles(Array.from(files));
  };

  // Helper to compress images on client-side before sending to server for OCR
  const compressImage = (file: File, maxWidth = 1600, maxHeight = 1600): Promise<string> => {
    return new Promise((resolve, reject) => {
      // If it's not an image file (e.g. PDF), fall back to standard reader
      if (!file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // fallback to original file if canvas fails
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Compress as JPEG format with 0.82 quality for ultra-fast upload and sharp OCR legibility
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.82);
        resolve(compressedBase64);
      };
      img.onerror = (err) => {
        reject(err);
      };
    });
  };

  const processFiles = async (files: File[]) => {
    // Check if any PDF file is over 5MB and warn the user
    const tooLarge = files.some((f) => f.type === "application/pdf" && f.size > 5 * 1024 * 1024);
    if (tooLarge) {
      onShowToast("⚠️ تنبيه: أحد ملفات الـ PDF حجمه كبير، قد يستغرق الرفع والتحليل بعض الوقت الإضافي.");
    }

    setOcrLoading(true);
    try {
      const base64Promises = files.map((file) => compressImage(file));
      const base64Images = await Promise.all(base64Promises);
      
      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: base64Images }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          const newParsed = data.results.map((r: any, rIdx: number) => ({
            company: r.company || "",
            invoice_no: r.invoice_no || "",
            invoice_date: r.invoice_date || date,
            amount: r.amount === 0 ? "" : r.amount,
            tempId: r.tempId || `temp-${Date.now()}-${Math.random()}`,
            success: r.success !== false,
            error: r.error,
            rawImage: base64Images[rIdx],
            originalObjectUrl: URL.createObjectURL(files[rIdx]),
            fileType: files[rIdx].type,
            isRetrying: false,
            items: r.items || []
          }));
          setParsedInvoices((prev) => [...prev, ...newParsed]);
          onShowToast(`✨ تم مسح وقراءة ${newParsed.length} فواتير ضريبية عبر الذكاء الاصطناعي بنجاح!`);
        } else {
          onShowToast("⚠️ حصلت مشكلة أثناء استلام النتيجة من الخادم");
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        onShowToast(`❌ فشل قراءة الفاتورة: ${errData.error || "خطأ غير معروف في الخادم"}`);
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء محاولة مسح الفواتير بالذكاء الاصطناعي");
    } finally {
      setOcrLoading(false);
      const fileInput = document.getElementById("ai-invoice-input") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
      const cameraInput = document.getElementById("ai-camera-input") as HTMLInputElement;
      if (cameraInput) {
        cameraInput.value = "";
      }
    }
  };

  const retryInvoice = async (idx: number) => {
    const item = parsedInvoices[idx];
    if (!item.rawImage) return;

    const updated = [...parsedInvoices];
    updated[idx] = { 
      ...item, 
      isRetrying: true,
      error: undefined,
      company: "جاري المحاولة...",
    };
    setParsedInvoices(updated);

    try {
      const res = await fetch("/api/parse-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [item.rawImage] }),
      });

      if (res.ok) {
        const data = await res.json();
        const r = data.results?.[0];
        if (r) {
          const fresh = [...parsedInvoices];
          fresh[idx] = {
            ...item,
            company: r.company || "",
            invoice_no: r.invoice_no || "",
            invoice_date: r.invoice_date || date,
            amount: r.amount === 0 ? "" : r.amount,
            success: r.success !== false,
            error: r.error,
            items: r.items || [],
            isRetrying: false
          };
          setParsedInvoices(fresh);
          if (r.success !== false) {
            onShowToast("✨ تمت إعادة المحاولة والتشخيص بنجاح!");
          } else {
            onShowToast(`⚠️ فشل التحليل: ${r.error || "خطأ في القراءة"}`);
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        const fresh = [...parsedInvoices];
        fresh[idx] = {
          ...item,
          success: false,
          error: errData.error || "خطأ غير معروف في الخادم",
          isRetrying: false
        };
        setParsedInvoices(fresh);
        onShowToast(`❌ فشل: ${errData.error || "خطأ في الخادم"}`);
      }
    } catch (err) {
      console.error(err);
      const fresh = [...parsedInvoices];
      fresh[idx] = {
        ...item,
        success: false,
        error: "فشل الاتصال بالشبكة",
        isRetrying: false
      };
      setParsedInvoices(fresh);
      onShowToast("❌ خطأ بالشبكة أثناء المحاولة");
    }
  };

  // Report filters
  const [from, setFrom] = useState(() => {
    const saved = sessionStorage.getItem("app_tax_report_from");
    return saved ? saved : new Date().toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => {
    const saved = sessionStorage.getItem("app_tax_report_to");
    return saved ? saved : new Date().toISOString().split("T")[0];
  });
  const [reportMode, setReportMode] = useState<"day" | "period" | "period_detailed">(() => {
    const saved = sessionStorage.getItem("app_tax_report_mode");
    return (saved as any) ? (saved as any) : "day";
  });

  useEffect(() => {
    sessionStorage.setItem("app_tax_report_from", from);
  }, [from]);

  useEffect(() => {
    sessionStorage.setItem("app_tax_report_to", to);
  }, [to]);

  useEffect(() => {
    sessionStorage.setItem("app_tax_report_mode", reportMode);
  }, [reportMode]);

  const [reportRawData, setReportRawData] = useState<any>(() => cachedReportRawData);
  const [dailyCashKeyTrigger, setDailyCashKeyTrigger] = useState<number>(0);

  const getDailyCash = (dateStr: string) => {
    const saved = localStorage.getItem(`tax_cash_${branch}_${dateStr}_${dateStr}`);
    if (saved !== null) return parseFloat(saved) || 0;
    return 0;
  };

  const getDailyCashDisplayValue = (dateStr: string) => {
    const saved = localStorage.getItem(`tax_cash_${branch}_${dateStr}_${dateStr}`);
    if (saved !== null) return saved;
    return "";
  };

  const getArabicDayName = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("ar-SA", { weekday: "long" });
    } catch (err) {
      return "";
    }
  };

  const [invoices, setInvoices] = useState<TaxInvoice[]>(() => cachedInvoices);
  const [stats, setStats] = useState<{ qPos: number; mPos: number; totalPos: number } | null>(() => cachedStats);
  const [cashInput, setCashInput] = useState<number>(0);
  const [tempCashInput, setTempCashInput] = useState<string>("");
  const [isTaxCalculated, setIsTaxCalculated] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedInvoiceIds([]);
  }, [from, to, branch, reportMode]);

  // Dynamic values
  const addRow = () => {
    setRows([...rows, { company: "", invoice_no: "", invoice_date: "", amount: "" }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: keyof InvoiceInput, value: string | number) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value } as InvoiceInput;
    setRows(updated);
  };

  const sumInvoicesInput = rows.reduce((s, r) => s + (parseFloat(r.amount as string) || 0), 0);

  const handleSaveInvoices = async (e: React.FormEvent) => {
    e.preventDefault();
    const validInvoices = rows.filter((r) => r.company && (parseFloat(r.amount as string) || 0) > 0);
    if (validInvoices.length === 0) {
      onShowToast("⚠️ يرجى تعبئة مؤسسة واحدة على الأقل وبقيمة أكبر من الصفر");
      return;
    }

    setLoading(true);
    try {
      const payloads = validInvoices.map((v) => ({
        date,
         branch,
        company: getUnifiedCompanyName(v.company, allCompanies),
        invoice_no: v.invoice_no,
        invoice_date: v.invoice_date || date,
        amount: parseFloat(v.amount as string) || 0,
        items: v.items || [],
        createdBy: currentUser?.username || "unknown",
        status: (userRole === "مدخل فواتير" || userRole === "محاسب") ? "pending" : "approved"
      }));

      const res = await fetch("/api/tax-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloads),
      });

      if (res.ok) {
        onShowToast(`🧾 تم حفظ ${payloads.length} فواتير ضريبية بنجاح!`);
        setRows([{ company: "", invoice_no: "", invoice_date: "", amount: "" }]);
        // Refresh period report automatically
        loadTaxReport();
      } else {
        onShowToast("❌ فشل حفظ الفواتير");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ شبكة أثناء حفظ الفواتير");
    } finally {
      setLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const res = await fetch("/api/tax-companies");
      if (res.ok) {
        const data = await res.json() as TaxCompany[];
        cachedRegisteredCompanies = data;
        const companyNames = data.map(c => c.name);
        cachedAllCompanies = companyNames;
        setRegisteredCompanies(data);
        setAllCompanies(companyNames);
      }
    } catch (err) {
      console.error("Error loading tax companies:", err);
    }
  };

  const handleAddSupplier = async (nameToAdd?: string) => {
    const targetName = nameToAdd !== undefined ? nameToAdd : newSupplierName;
    const trimmed = targetName.trim();
    if (!trimmed) {
      onShowToast("⚠️ يرجى التكرم بكتابة اسم المورد أولاً");
      return;
    }
    try {
      const res = await fetch("/api/tax-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        onShowToast(`🏢 تم تسجيل المورد "${trimmed}" بنجاح!`);
        if (nameToAdd === undefined) {
          setNewSupplierName("");
        }
        await loadCompanies();
      } else {
        onShowToast("❌ فشل تسجيل المورد");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالاتصال أثناء تسجيل المورد");
    }
  };

  const handleDeleteSupplier = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف المورد "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/tax-companies/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        onShowToast(`🗑️ تم حذف المورد "${name}" بنجاح`);
        await loadCompanies();
      } else {
        onShowToast("❌ فشل حذف المورد");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ شبكة أثناء حذف المورد");
    }
  };

  const handleEditSupplierSave = async (id: string) => {
    const trimmed = editingSupplierName.trim();
    if (!trimmed) {
      onShowToast("⚠️ يرجى كتابة اسم المورد الجديد");
      return;
    }
    try {
      const res = await fetch("/api/tax-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: trimmed }),
      });
      if (res.ok) {
        onShowToast(`✏️ تم تعديل المورد بنجاح إلى "${trimmed}"`);
        setEditingSupplierId(null);
        setEditingSupplierName("");
        await loadCompanies();
      } else {
        onShowToast("❌ فشل تعديل المورد");
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ شبكة أثناء تعديل المورد");
    }
  };

  const loadPendingInvoices = async () => {
    try {
      const res = await fetch("/api/tax-invoices?status=pending");
      if (res.ok) {
        const pending: TaxInvoice[] = await res.json();
        cachedPendingInvoices = pending;
        setPendingInvoices(pending);
      }
    } catch (err) {
      console.error("Error loading pending invoices:", err);
    }
  };

  const handleApprovePendingInvoice = async (inv: TaxInvoice) => {
    // 1. Optimistic UI update: Remove from pending immediately
    setPendingInvoices((prev) => {
      const updated = prev.filter((i) => i.id !== inv.id);
      cachedPendingInvoices = updated;
      return updated;
    });

    // Move to approved in main invoices list immediately
    setInvoices((prev) => {
      const exists = prev.some((i) => i.id === inv.id);
      let updatedList;
      if (exists) {
        updatedList = prev.map((i) =>
          i.id === inv.id ? { ...inv, status: "approved" as const } : i
        );
      } else {
        updatedList = [...prev, { ...inv, status: "approved" as const }];
      }
      cachedInvoices = updatedList;
      return updatedList;
    });

    if (previewInvoice?.id === inv.id) {
      setPreviewInvoice(null);
    }

    onShowToast(`✅ تم اعتماد وتثبيت فاتورة ${inv.company} بفرع ${inv.branch} بنجاح!`);

    // 2. Perform network request in background
    try {
      const updated = {
        ...inv,
        status: "approved" as const
      };
      const res = await fetch(`/api/tax-invoices/${encodeURIComponent(inv.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
      });
      if (!res.ok) {
        console.error("Failed to approve invoice on server");
      }
      
      // Quietly sync in the background to ensure consistency
      await loadPendingInvoices();
      await loadTaxReport();
    } catch (err) {
      console.error("Network error during approval:", err);
    }
  };

  const handleRejectPendingInvoice = (id: string, company: string) => {
    setConfirmModal({
      show: true,
      title: "تأكيد رفض وحذف الفاتورة المعلقة",
      message: `هل أنت متأكد من رغبتك في رفض وحذف فاتورة "${company}" المعلقة نهائياً؟ لن يتم اعتمادها أو تسجيل مشترياتها في النظام.`,
      onConfirm: async () => {
        // 1. Optimistic UI update: Remove from both pending and main list immediately
        setPendingInvoices((prev) => {
          const updated = prev.filter((i) => i.id !== id);
          cachedPendingInvoices = updated;
          return updated;
        });

        setInvoices((prev) => {
          const updated = prev.filter((i) => i.id !== id);
          cachedInvoices = updated;
          return updated;
        });

        if (previewInvoice?.id === id) {
          setPreviewInvoice(null);
        }

        onShowToast("✅ تم رفض وحذف الفاتورة المعلقة بنجاح");

        // 2. Perform network request in background
        try {
          const res = await fetch(`/api/tax-invoices/${encodeURIComponent(id)}`, { method: "DELETE" });
          if (!res.ok) {
            console.error("Failed to delete invoice on server");
          }
          // Quietly sync in the background
          await loadPendingInvoices();
          await loadTaxReport();
        } catch (err) {
          console.error("Network error during rejection:", err);
        }
      }
    });
  };

  const loadTaxReport = async () => {
    if (userRole !== "مدخل فواتير" && (!from || !to)) {
      onShowToast("⚠️ يرجى تحديد نطاق التاريخ المطلوب");
      return;
    }
    const isFirstTime = !hasInitiallyLoaded;
    if (isFirstTime) {
      setLoading(true);
    }
    try {
      const promises: Promise<any>[] = [
        loadCompanies(),
        loadCarryovers()
      ];

      if (userRole === "مدير") {
        promises.push(loadPendingInvoices());
      }

      const url = userRole === "مدخل فواتير"
        ? "/api/tax-invoices"
        : `/api/tax-invoices?from=${from}&to=${to}`;

      promises.push(
        fetch(url)
          .then(async (resInvs) => {
            const invData = resInvs.ok ? await resInvs.json() : [];
            cachedInvoices = invData;
            setInvoices(invData);
          })
          .catch((err) => console.error("Error loading tax invoices:", err))
      );

      if (userRole !== "مدخل فواتير") {
        promises.push(
          fetch(`/api/reports?from=${from}&to=${to}`)
            .then(async (resReport) => {
              if (resReport.ok) {
                const rep = await resReport.json();
                cachedReportRawData = rep;
                setReportRawData(rep);
                const qPos = rep.qStats.pos || 0;
                const mPos = rep.mStats.pos || 0;
                const newStats = {
                  qPos,
                  mPos,
                  totalPos: qPos + mPos
                };
                cachedStats = newStats;
                setStats(newStats);
              }
            })
            .catch((err) => console.error("Error loading reports:", err))
        );
      }

      await Promise.all(promises);
      hasInitiallyLoaded = true;
    } catch (err) {
      console.error(err);
      onShowToast("❌ فشل تحميل بيانات التقرير الضريبي");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateTax = () => {
    const cashVal = parseFloat(tempCashInput) || 0;
    
    if (reportMode === "day") {
      // Save strictly for that specific day
      const savedDailyKey = `tax_cash_${branch}_${from}_${from}`;
      localStorage.setItem(savedDailyKey, String(cashVal));
      setCashInput(cashVal);
      setIsTaxCalculated(true);
      onShowToast("💾 تم اعتماد دخل الكاش لليوم بنجاح!");
    } else {
      // For period modes, the cash value is a dynamic sum of independent daily cash entries.
      // We don't overwrite or divide/split anything over the days. We just approve the calculation.
      const dates = getDatesInRange(from, to);
      let totalDailyCash = 0;
      dates.forEach(dateStr => {
        const dSaved = localStorage.getItem(`tax_cash_${branch}_${dateStr}_${dateStr}`);
        if (dSaved !== null) {
          totalDailyCash += parseFloat(dSaved) || 0;
        }
      });
      setCashInput(totalDailyCash);
      setIsTaxCalculated(totalDailyCash > 0);
      
      // Save period metadata key just for consistency but without any division
      const savedCashKey = `tax_cash_${branch}_${from}_${to}`;
      localStorage.setItem(savedCashKey, String(totalDailyCash));

      onShowToast("💾 تم اعتماد الحساب الضريبي للفترة بنجاح بناءً على مجموع الكاش اليومي!");
    }

    setDailyCashKeyTrigger(prev => prev + 1);
  };

  const isInvoiceEditableByClerk = (inv: TaxInvoice) => {
    if (userRole === "مدير") return true;
    if (userRole !== "مدخل فواتير" && userRole !== "محاسب") return false;

    // Get all invoices entered by this user
    const myInvs = invoices.filter(i => i.createdBy === currentUser?.username);
    if (myInvs.length === 0) return false;

    // Sort chronologically by their ID (since ID has timestamp inside)
    const sorted = [...myInvs].sort((a, b) => a.id.localeCompare(b.id));
    const latest = sorted[sorted.length - 1];

    return latest && latest.id === inv.id;
  };

  const deleteInvoice = (id: string) => {
    const targetInv = invoices.find(i => i.id === id);
    if (!targetInv) return;

    if (userRole !== "مدير" && !isInvoiceEditableByClerk(targetInv)) {
      onShowToast("⚠️ لا تملك صلاحية حذف هذه الفاتورة الضريبية!");
      return;
    }
    setConfirmModal({
      show: true,
      title: "تأكيد حذف الفاتورة الضريبية",
      message: "هل أنت متأكد من رغبتك في حذف هذه الفاتورة الضريبية نهائياً من سجلات الفترة؟",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tax-invoices/${encodeURIComponent(id)}`, { method: "DELETE" });
          if (res.ok) {
            onShowToast("✅ تم حذف الفاتورة الضريبية وجاري التحديث");
            loadTaxReport();
          } else {
            onShowToast("❌ فشل حذف الفاتورة الضريبية");
          }
        } catch (err) {
          console.error(err);
          onShowToast("❌ خطأ بالشبكة أثناء حذف الفاتورة");
        }
      }
    });
  };

  const handleBulkDeleteInvoices = async () => {
    if (selectedInvoiceIds.length === 0) {
      onShowToast("⚠️ يرجى تحديد بعض الفواتير أولاً لحذفها");
      return;
    }
    if (userRole !== "مدير") {
      onShowToast("⚠️ صلاحيات المدير فقط لطلب الحذف!");
      return;
    }
    setConfirmModal({
      show: true,
      title: "تأكيد حذف الفواتير الرقمية المحددة",
      message: `هل أنت متأكد من رغبتك في حذف الفواتير المحددة (${selectedInvoiceIds.length}) نهائياً من سجل النظام؟ سيتم التخلص من المشتريات المرتبطة تلقائياً.`,
      onConfirm: async () => {
        try {
          const res = await fetch("/api/tax-invoices/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: selectedInvoiceIds })
          });
          if (res.ok) {
            const data = await res.json();
            onShowToast(`🗑️ ${data.message || "تم حذف الفواتير بنجاح"}`);
            setSelectedInvoiceIds([]);
            loadTaxReport();
          } else {
            onShowToast("❌ فشل حذف الفواتير الضريبية المحددة");
          }
        } catch (err) {
          console.error(err);
          onShowToast("❌ خطأ بالشبكة أثناء حذف الفواتير المحددة");
        }
      }
    });
  };

  const handleClearAllInvoices = async () => {
    if (filteredInvoices.length === 0) {
      onShowToast("⚠️ لا توجد فواتير ضريبية حالية لحذفها");
      return;
    }
    if (userRole !== "مدير") {
      onShowToast("⚠️ صلاحيات المدير فقط لطلب الحذف!");
      return;
    }
    setConfirmModal({
      show: true,
      title: "⚠️ تحذير تدميري: حذف كلي للفواتير",
      message: `هل أنت متأكد تماماً من رغبتك في حذف جميع الفواتير الضريبية المعروضة حالياً (${filteredInvoices.length}) لفرع ${branch} في النطاق الزمني المحدد؟ لا يمكن استعادة البيانات المحذوفة وسيتم تحديث الحسابات!`,
      onConfirm: async () => {
        try {
          const res = await fetch("/api/tax-invoices/bulk-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              all: true,
              branch,
              from,
              to
            })
          });
          if (res.ok) {
            const data = await res.json();
            onShowToast(`🗑️ ${data.message || "تم تفريغ كافة الفواتير بنجاح"}`);
            setSelectedInvoiceIds([]);
            loadTaxReport();
          } else {
            onShowToast("❌ فشل حذف وتفريغ فواتير هذه الفترة");
          }
        } catch (err) {
          console.error(err);
          onShowToast("❌ خطأ بالشبكة أثناء تفريغ الفواتير");
        }
      }
    });
  };

  const startEditInvoice = (inv: TaxInvoice) => {
    if (userRole !== "مدير" && !isInvoiceEditableByClerk(inv)) {
      onShowToast("⚠️ لا تملك صلاحية تعديل هذه الفاتورة الضريبية!");
      return;
    }
    setEditCompany(inv.company || "");
    setEditInvoiceNo(inv.invoice_no || "");
    setEditInvoiceDate(inv.invoice_date || "");
    setEditAmount(inv.amount);
    setEditBranch(inv.branch as "القادسية" | "المروج" || "القادسية");
    setEditDate(inv.date || "");
    setEditModal({
      show: true,
      invoice: inv
    });
  };

  const saveEditedInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal.invoice) return;
    if (!editCompany.trim() || editAmount === "") {
      onShowToast("⚠️ يرجى ملء الحقول المطلوبة (المورد والمبلغ)");
      return;
    }

    try {
      const updatedData = {
        date: editDate || editModal.invoice.date,
        branch: editBranch,
        company: getUnifiedCompanyName(editCompany, allCompanies),
        invoice_no: editInvoiceNo.trim(),
        invoice_date: editInvoiceDate,
        amount: parseFloat(editAmount.toString()),
        items: editModal.invoice.items || [],
        createdBy: editModal.invoice.createdBy || currentUser?.username || ""
      };

      const res = await fetch(`/api/tax-invoices/${encodeURIComponent(editModal.invoice.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });

      if (res.ok) {
        onShowToast("✅ تم تعديل الفاتورة الضريبية وتحديث التقارير بنجاح");
        setEditModal({ show: false, invoice: null });
        loadTaxReport();
      } else {
        const err = await res.json().catch(() => ({ error: "فشل تعديل الفاتورة بسبب خطأ في الخادم" }));
        onShowToast(`❌ فشل تعديل الفاتورة: ${err.error || ""}`);
      }
    } catch (err) {
      console.error(err);
      onShowToast("❌ خطأ بالشبكة أثناء تعديل الفاتورة");
    }
  };

  // Keep 'to' date in sync with 'from' date if reportMode is "day"
  useEffect(() => {
    if (reportMode === "day") {
      setTo(from);
    }
  }, [from, reportMode]);

  // Load companies catalog on component mount to support autocompletion right away
  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadTaxReport();
  }, [from, to]);

  // Sync cash input memory for this branch and date range
  useEffect(() => {
    if (reportMode === "day") {
      const savedDailyKey = `tax_cash_${branch}_${from}_${from}`;
      const saved = localStorage.getItem(savedDailyKey);
      if (saved !== null) {
        setTempCashInput(saved);
        setCashInput(parseFloat(saved) || 0);
        setIsTaxCalculated(true);
      } else {
        setTempCashInput("");
        setCashInput(0);
        setIsTaxCalculated(false);
      }
    } else {
      // For period and period_detailed, we sum up the independently entered daily values
      const dates = getDatesInRange(from, to);
      let totalDailyCash = 0;
      let hasAnyDaily = false;
      dates.forEach(dateStr => {
        const dSaved = localStorage.getItem(`tax_cash_${branch}_${dateStr}_${dateStr}`);
        if (dSaved !== null) {
          totalDailyCash += parseFloat(dSaved) || 0;
          hasAnyDaily = true;
        }
      });

      setTempCashInput(String(totalDailyCash));
      setCashInput(totalDailyCash);
      setIsTaxCalculated(hasAnyDaily);
    }
  }, [branch, from, to, reportMode, dailyCashKeyTrigger]);

  // Filter invoices to only show/count the ones matching the selected active branch and optionally company
  const filteredInvoices = invoices.filter((i) => {
    const isApproved = i.status !== "pending" && i.status !== "rejected";
    const matchesBranch = i.branch === branch;
    const matchesCompany = !selectedCompanyFilter || selectedCompanyFilter === "الكل" || i.company === selectedCompanyFilter;
    return isApproved && matchesBranch && matchesCompany;
  });
  const totalInvoicesAmount = filteredInvoices.reduce((s, i) => s + (i.amount || 0), 0);
  
  // Get ONLY the POS income for the currently selected branch
  const totalPosValue = stats 
    ? (branch === "القادسية" ? stats.qPos : stats.mPos)
    : 0;
    
  const grandTotalWithInjectedCash = totalPosValue + cashInput;
  const grandDifference = grandTotalWithInjectedCash - totalInvoicesAmount;
  
  // Calculation of the 15% VAT from the vat-inclusive difference: amount * (15/115)
  const grandVat = grandDifference * (15 / 115);

  return (
    <div className="space-y-8 RTL">
      {/* Shared datalist for supplier names autocomplete (Principle 1) */}
      <datalist id="registered-companies-list">
        {allCompanies.map((comp) => (
          <option key={comp} value={comp} />
        ))}
      </datalist>

      {/* Dynamic Glowing Alert Banner for Manager if pending invoices exist */}
      {userRole === "مدير" && pendingInvoices.length > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3.5 print:hidden animate-pulse">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-md shrink-0">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-sm font-black text-amber-950">🔔 تنبيه إداري هام: فواتير جديدة معلقة بانتظار الاعتماد والمراجعة!</h3>
                <p className="text-xs text-amber-900 font-bold leading-relaxed">
                  هناك فواتير معلقة تم إدخالها حديثاً بواسطة مدخلي الفواتير بفرع <span className="font-black text-indigo-950 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">المروج</span> أو فرع <span className="font-black text-amber-950 bg-amber-100 px-1 py-0.5 rounded border border-amber-200">القادسية</span>. يرجى مراجعتها وتدقيقها يدوياً وبصرياً فوراً لاعتمادها وتثبيتها بالحسابات.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="px-3 py-1 bg-amber-200 text-amber-950 text-xs font-black rounded-full shrink-0 border border-amber-300">
                {pendingInvoices.length} فواتير معلقة ⏳
              </span>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("pending-invoices-panel");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Eye className="w-4 h-4" />
                <span>عرض ومراجعة الفواتير المعلقة</span>
              </button>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-500/10 text-[11px] font-bold text-amber-900">
            <span>توزيع الفواتير المعلقة بالأفرع حالياً:</span>
            {pendingInvoices.filter(i => i.branch === "المروج").length > 0 && (
              <span className="px-2.5 py-0.5 bg-indigo-150 text-indigo-850 border border-indigo-200 rounded-md shadow-3xs font-extrabold">
                فرع المروج: {pendingInvoices.filter(i => i.branch === "المروج").length} فواتير معلقة 📋
              </span>
            )}
            {pendingInvoices.filter(i => i.branch === "القادسية").length > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-200 text-amber-950 border border-amber-300 rounded-md shadow-3xs font-extrabold">
                فرع القادسية: {pendingInvoices.filter(i => i.branch === "القادسية").length} فواتير معلقة 📋
              </span>
            )}
          </div>
        </div>
      )}

      {/* Segmented control at the very top of the Tax Tab */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
        <div className="text-right">
          <h2 className="text-md font-extrabold text-slate-800">اختر فرع العمليات النشط والتحليل الممنهج للضريبة</h2>
          <p className="text-[11px] text-slate-500 font-medium">سيقوم النظام بفلترة كافة البيانات، الإدخالات، الكشوفات، والحسابات بناءً على الفرع المحدد مباشرةً.</p>
        </div>
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
          {(!userBranch || userBranch === "الكل" || userBranch === "القادسية") && (
            <button
              type="button"
              onClick={() => {
                setBranch("القادسية");
                onShowToast("📍 تم الانتقال لعرض وبيانات فرع القادسية");
              }}
              disabled={userBranch !== undefined && userBranch !== "الكل" && userBranch !== "القادسية"}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                branch === "القادسية"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              } ${userBranch && userBranch !== "الكل" ? "cursor-default" : "cursor-pointer"}`}
            >
              فرع القادسية {userBranch && userBranch === "القادسية" && "🔒 (مخصص لك)"}
            </button>
          )}
          {(!userBranch || userBranch === "الكل" || userBranch === "المروج") && (
            <button
              type="button"
              onClick={() => {
                setBranch("المروج");
                onShowToast("📍 تم الانتقال لعرض وبيانات فرع المروج");
              }}
              disabled={userBranch !== undefined && userBranch !== "الكل" && userBranch !== "المروج"}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
                branch === "المروج"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-indigo-600 hover:bg-slate-50"
              } ${userBranch && userBranch !== "الكل" ? "cursor-default" : "cursor-pointer"}`}
            >
              فرع المروج {userBranch && userBranch === "المروج" && "🔒 (مخصص لك)"}
            </button>
          )}
        </div>
      </div>

      {/* Re-order Countdown & Status Banner */}
      {userRole !== "مدير" && <ReorderTimerBanner carryovers={carryovers} branch={branch} />}

      {/* Dynamic Pending Invoices Panel for Manager */}
      {userRole === "مدير" && (
        <div id="pending-invoices-panel" className="bg-white rounded-xl shadow-xs border border-slate-150 p-6 space-y-4 print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Receipt className="w-5 h-5 text-amber-500 font-extrabold" />
                {pendingInvoices.length > 0 && (
                  <span className="absolute -top-1 -left-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                )}
              </div>
              <div className="text-right">
                <h2 className="text-sm font-extrabold text-slate-800">الفواتير المعلقة بانتظار المراجعة والاعتماد البصري 🔬</h2>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">تحقق ومطابقة الفواتير المدخلة من قبل مدخلي الفواتير في الفروع لاعتمادها وتثبيتها بالنظام.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadPendingInvoices}
              className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg p-2 transition-all flex items-center justify-center cursor-pointer font-bold text-xs gap-1"
            >
              <Search className="w-3.5 h-3.5" />
              تحديث الفواتير المعلقة
            </button>
          </div>

          {loading && pendingInvoices.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-xs font-semibold flex flex-col items-center justify-center gap-3 bg-slate-50/50 border border-slate-100 rounded-xl">
              <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              <span>جاري تحميل وفحص الفواتير المعلقة بانتظار الاعتماد...</span>
            </div>
          ) : pendingInvoices.length === 0 ? (
            <div className="p-5 text-center bg-emerald-50/20 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>رائع! لا توجد فواتير معلقة بانتظار المراجعة والاعتماد حالياً. جميع الفواتير من الفروع مستقرة ومؤكدة.</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold leading-relaxed flex items-start gap-2.5 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  تنبيـه هام للمدير: هناك <strong>{pendingInvoices.length} فواتير معلقة</strong> تم إدخالها حديثاً بواسطة مدخلي الفواتير بفرع المروج أو فرع القادسية. يرجى معاينتها بصرياً بدقة ثم اعتمادها لتثبيتها في الحسابات وتوليد مشترياتها تلقائياً.
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-3xs">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 text-right">المورد / المؤسسة</th>
                      <th className="p-3 text-center">الفرع</th>
                      <th className="p-3 text-center">رقم الفاتورة</th>
                      <th className="p-3 text-center">تاريخ الفاتورة</th>
                      <th className="p-3 text-left">مبلـغ الفاتورة</th>
                      <th className="p-3 text-center">مدخل الفاتورة</th>
                      <th className="p-3 text-center">خيارات التحكم والمعاينة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-extrabold text-slate-800">{inv.company}</td>
                        <td className="p-3 text-center font-bold text-slate-600">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            inv.branch === "المروج" ? "bg-indigo-50 text-indigo-700" : "bg-amber-50 text-amber-700"
                          }`}>
                            {inv.branch}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">{inv.invoice_no || "—"}</td>
                        <td className="p-3 text-center font-mono text-slate-600">{inv.invoice_date || inv.date}</td>
                        <td className="p-3 text-left font-extrabold text-amber-700 font-mono">
                          {inv.amount.toFixed(2)} ر.س
                        </td>
                        <td className="p-3 text-center font-bold text-slate-700">
                          👤 {inv.createdBy || "غير معروف"}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewInvoice(inv)}
                              className="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="معاينة محتويات الفاتورة بصرياً"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>معاينة بصريـة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprovePendingInvoice(inv)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="اعتماد وتثبيت الفاتورة بالنظام"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>اعتماد</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPendingInvoice(inv.id, inv.company)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                              title="رفض وحذف الفاتورة"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>رفض وحذف</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 0. Manual Suppliers Directory */}
      {userRole !== "مدخل فواتير" && (
        <div className="bg-white rounded-xl shadow-xs border border-slate-150 p-6 print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h2 className="text-sm font-extrabold text-slate-800">دليل الموردين والمؤسسات المعتمدة 🏢</h2>
                <p className="text-[11px] text-slate-500 font-bold mt-0.5">تسجيل الدليل يدوياً لتوحيد كتابة أسمائهم تحت كافة فواتير المصروفات مباشرة.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowSuppliersManager(!showSuppliersManager)}
              className="w-full sm:w-auto px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-2xs active:scale-[0.98]"
            >
              {showSuppliersManager ? "إخفاء لوحة إدارة الموردين 🔼" : "🏢 عرض وإدارة الموردين المسجلين ⚙️"}
            </button>
          </div>

          {showSuppliersManager && (
            <div className="mt-5 pt-5 border-t border-slate-100 space-y-4 animate-fadeIn">
              {/* Add New Supplier input */}
              <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                <input
                  type="text"
                  placeholder="اكتب اسم المورد الجديد هنا... (مثال: شركة المراعي)"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => handleAddSupplier()}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة لتسجيل المورد</span>
                </button>
              </div>

              {/* List of current suppliers */}
              <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150/80">
                <div className="text-[11px] font-extrabold text-slate-600 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  <span>قائمة الموردين المسجلين حالياً والمسجلين بالكامل ({registeredCompanies.length} مورد)</span>
                </div>
                {registeredCompanies.length === 0 ? (
                  <div className="text-xs text-slate-400 py-4 text-center font-bold">لا يوجد موردين مسجلين حالياً.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1 text-right">
                    {registeredCompanies.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-3xs group hover:border-indigo-300 hover:shadow-2xs transition-all min-h-11"
                      >
                        {editingSupplierId === comp.id ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editingSupplierName}
                              onChange={(e) => setEditingSupplierName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleEditSupplierSave(comp.id);
                                } else if (e.key === "Escape") {
                                  setEditingSupplierId(null);
                                }
                              }}
                              className="flex-1 px-2 py-1 text-xs border border-indigo-400 rounded-md focus:outline-none font-bold text-slate-800 bg-white"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleEditSupplierSave(comp.id)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer shrink-0"
                              title="حفظ التعديل"
                            >
                              <Check className="w-4.5 h-4.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSupplierId(null)}
                              className="p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0 text-sm font-bold"
                              title="إلغاء"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-xs font-bold text-slate-800 truncate select-all">{comp.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSupplierId(comp.id);
                                  setEditingSupplierName(comp.name);
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all cursor-pointer"
                                title="تعديل اسم المورد"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSupplier(comp.id, comp.name)}
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-all cursor-pointer"
                                title="حذف المورد"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 1. Invoices Form */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-100 p-6 print:hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
          <Receipt className="w-5 h-5 text-indigo-700" />
          <h2 className="text-lg font-bold text-slate-800">إدخال فواتير ضريبية للمصروفات</h2>
        </div>

        {/* AI Scanner Section */}
        <div 
          className={`relative border-2 border-dashed rounded-2xl p-6 transition-all duration-300 text-center ${
            dragActive 
              ? "border-indigo-600 bg-indigo-50/70 scale-[0.99] shadow-inner" 
              : "border-indigo-150 bg-slate-50/50 hover:bg-slate-50 hover:border-indigo-300"
          } mb-8`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
        >
          {/* File Picker Input (Images / PDFs) */}
          <input
            id="ai-invoice-input"
            type="file"
            accept="image/*,application/pdf"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          {/* Direct Camera Input for Mobile */}
          <input
            id="ai-camera-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-indigo-100/80 rounded-full text-indigo-700 shadow-xs">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            
            <div className="space-y-1">
              <h3 className="font-extrabold text-sm text-slate-800">المسح التلقائي بالذكاء الاصطناعي للفواتير الضريبية</h3>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                اسحب وأفلت صورة الفاتورة أو ملف PDF هنا، أو قم بتصويرها مباشرة من كاميرا الجوال، وسيتكفل النظام بقراءة البيانات وتعبئتها آلياً وبدقة متناهية.
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-[11px] text-amber-700 font-bold">
                  💡 تلميح: قراءة ملفات الـ PDF قد تستغرق بضع ثوانٍ إضافية للتحليل الشامل. لتحقيق قراءة فائقة السرعة، اختر الصفحة الأولى فقط أو استخدم صور كاميرا الهاتف.
                </span>
              </div>
            </div>

            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => document.getElementById("ai-invoice-input")?.click()}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" /> رفع فواتير (صور / PDF)
              </button>
              
              <button
                type="button"
                onClick={() => document.getElementById("ai-camera-input")?.click()}
                className="px-5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200"
              >
                <Camera className="w-4 h-4" /> تصوير الفاتورة بالجوال
              </button>
            </div>
          </div>

          {/* AI Loader Overlay */}
          {ocrLoading && (
            <div className="absolute inset-x-0 inset-y-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center gap-3 rounded-2xl z-10 animate-pulse">
              <Loader2 className="w-8 h-8 text-indigo-700 animate-spin" />
              <div className="space-y-1 text-center px-4">
                <span className="font-extrabold text-sm text-indigo-900 block">جاري مسح وقراءة الفاتورة بالذكاء الاصطناعي...</span>
                <span className="text-xs text-indigo-600 block font-semibold">تأخذ ملفات الـ PDF وقتاً أطول في الرفع والتحليل - يتم عمل موازنة سريعة حالياً</span>
                <span className="text-[11px] text-slate-400 block font-medium">نظام قراءة مستندي ذكي فائق الدقة مدعوم بـ Gemini Flash AI</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Parsed Results Review Dashboard */}
        {parsedInvoices.length > 0 && (
          <div className="bg-indigo-50/40 rounded-2xl p-6 border border-indigo-100/60 mb-8 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-700" />
                <h3 className="font-bold text-sm text-slate-800">الفواتير المستخرجة بالذكاء الاصطناعي قيد المراجعة والاعتماد ({parsedInvoices.length})</h3>
              </div>
              <button
                type="button"
                onClick={() => setParsedInvoices([])}
                className="text-xs text-slate-500 hover:text-rose-600 transition-all font-bold cursor-pointer"
              >
                مسح القائمة بالكامل
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {parsedInvoices.map((pinv, idx) => (
                <div 
                  key={pinv.tempId} 
                  className={`p-4 rounded-xl border bg-white shadow-xs relative space-y-3 transition-all overflow-hidden ${
                    pinv.success ? "border-indigo-100/80 hover:border-indigo-300" : "border-rose-100 bg-rose-50/10 hover:border-rose-300"
                  }`}
                >
                  {/* Local Card Retrying Overlay */}
                  {pinv.isRetrying && (
                    <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-xl z-10 transition-all">
                      <Loader2 className="w-6 h-6 text-indigo-700 animate-spin" />
                      <span className="text-[11px] font-bold text-indigo-900 leading-none">جاري المحاولة مجدداً...</span>
                    </div>
                  )}

                  {/* Delete/Discard button */}
                  <button
                    type="button"
                    onClick={() => {
                      setParsedInvoices(parsedInvoices.filter((p) => p.tempId !== pinv.tempId));
                    }}
                    className="absolute left-3 top-3 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all cursor-pointer hover:bg-rose-50"
                    title="استبعاد الفاتورة"
                  >
                    <Trash className="w-4 h-4" />
                  </button>

                  {/* High Density Match / Precise Verification Trigger */}
                  {(pinv.originalObjectUrl || pinv.rawImage) && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuditInvoiceId(pinv.tempId);
                        setImgZoom(1);
                        setImgRotation(0);
                        setImgPan({ x: 0, y: 0 });
                      }}
                      className="absolute left-11 top-3 text-emerald-700 hover:text-emerald-950 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer hover:shadow-2xs"
                      title="فتح مدقق المطابقة البصري ذو الجودة الفائقة والضبط المتقدم"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                      <span>تدقيق ومطابقة بصرية 🔬</span>
                    </button>
                  )}

                  <div className="space-y-2">
                    {/* Error Warning badge */}
                    {!pinv.success && (
                      <div className="space-y-2 mb-2">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-md">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>
                            {pinv.error && pinv.error.includes("404")
                              ? "تم تحديث محرك القراءة الذكي - يرجى النقر على زر إعادة المحاولة"
                              : pinv.error && pinv.error.startsWith("{")
                              ? "فشلت القراءة الآلية تلقائياً - يمكنك تعبئة الحقول يدوياً أو إعادة المحاولة"
                              : `فشلت القراءة الآلية تلقائياً: ${pinv.error || "يرجى تعبئة الحقول يدوياً"}`}
                          </span>
                        </div>
                        {pinv.rawImage && (
                          <button
                            type="button"
                            disabled={pinv.isRetrying}
                            onClick={() => retryInvoice(idx)}
                            className="w-full py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-xs transition-all disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            <span>إعادة محاولة القراءة الذكية 🔄</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {/* Interactive document image crop/thumbnail */}
                      {(pinv.originalObjectUrl || pinv.rawImage) && (
                        <div 
                          onClick={() => {
                            setAuditInvoiceId(pinv.tempId);
                            setImgZoom(1);
                            setImgRotation(0);
                            setImgPan({ x: 0, y: 0 });
                          }}
                          className="w-full sm:w-[94px] h-[120px] bg-slate-900 border border-slate-200 hover:border-emerald-500 rounded-xl overflow-hidden relative group cursor-pointer transition-all shrink-0 hover:shadow-xs mt-1"
                          title="انقر لعرض وتكبير الفاتورة بكامل تفاصيلها الأصلية البالغة الوضوح"
                        >
                          {pinv.fileType === "application/pdf" ? (
                            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-2 text-rose-500">
                              <FileText className="w-8 h-8 shrink-0 text-rose-600 mb-1" />
                              <span className="text-[10px] font-black uppercase text-rose-400">PDF</span>
                            </div>
                          ) : (
                            <img 
                              src={pinv.originalObjectUrl || pinv.rawImage} 
                              alt="مرفق الفاتورة الأصيل"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-black gap-1">
                            <Maximize2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                            <span>تدقيق ومطابقة</span>
                          </div>
                        </div>
                      )}

                      {/* Main fields layout */}
                      <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
                      <div className="space-y-1 relative">
                        <label className="text-[10px] font-bold text-slate-500 block">اسم المورد / المؤسسة</label>
                        <SearchableCompanyInput
                          value={pinv.company}
                          onChange={(val) => {
                            const updated = [...parsedInvoices];
                            updated[idx].company = val;
                            setParsedInvoices(updated);
                          }}
                          registeredCompanies={registeredCompanies}
                          onRegisterCompany={(name) => handleAddSupplier(name)}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:border-indigo-500 bg-slate-50/30 focus:bg-white focus:outline-none font-bold text-slate-800"
                        />
                        {(() => {
                          const simResult = checkSimilarity(pinv.company, allCompanies);
                          const showWarning = simResult.matches && !ignoredSimilarities[`parsed-${idx}-${simResult.similarName}`];
                          if (showWarning) {
                            return (
                              <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 space-y-1 animate-fadeIn">
                                <div className="font-bold flex items-center gap-1">
                                  <span>⚠️ هل تقصد المؤسسة المسجلة؟</span>
                                </div>
                                <div className="text-[10px]">
                                  الاسم قريب جداً من: <span className="font-extrabold text-amber-950 underline">{simResult.similarName}</span>
                                </div>
                                <div className="flex gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...parsedInvoices];
                                      updated[idx].company = simResult.similarName;
                                      setParsedInvoices(updated);
                                    }}
                                    className="px-1.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-sm text-[9px] cursor-pointer animate-pulse"
                                  >
                                    ✅ مطابقة الاسم
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIgnoredSimilarities(prev => ({ ...prev, [`parsed-${idx}-${simResult.similarName}`]: true }));
                                    }}
                                    className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-sm text-[9px] cursor-pointer"
                                  >
                                    ❌ إبقاء الحالي
                                  </button>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">رقم الفاتورة الأصيل</label>
                        <input
                          type="text"
                          value={pinv.invoice_no}
                          onChange={(e) => {
                            const updated = [...parsedInvoices];
                            updated[idx].invoice_no = e.target.value;
                            setParsedInvoices(updated);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:border-indigo-500 bg-slate-50/30 focus:bg-white focus:outline-none text-slate-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 block">تاريخ الفاتورة</label>
                        <input
                          type="date"
                          value={pinv.invoice_date}
                          onChange={(e) => {
                            const updated = [...parsedInvoices];
                            updated[idx].invoice_date = e.target.value;
                            setParsedInvoices(updated);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md focus:border-indigo-500 bg-slate-50/30 focus:bg-white focus:outline-none text-slate-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-900 block">المبلغ الإجمالي</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={pinv.amount}
                          onChange={(e) => {
                            const updated = [...parsedInvoices];
                            updated[idx].amount = e.target.value;
                            setParsedInvoices(updated);
                          }}
                          className="w-full px-2.5 py-1 text-xs border border-indigo-200 focus:border-indigo-500 rounded-md bg-slate-50/30 focus:bg-white focus:outline-none font-bold text-indigo-700"
                        />
                      </div>
                    </div>
                    </div>

                    {/* Extracted items checklist/viewer - FULLY EDITABLE FOR MANAGER AND INVOICE ENTRIES USER */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 bg-slate-50/50 p-3 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-indigo-700 font-extrabold select-none">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 animate-pulse text-indigo-500" />
                          <span>المشتريات والسلع للتتبع ({pinv.items?.length || 0})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...parsedInvoices];
                            if (!updated[idx].items) {
                              updated[idx].items = [];
                            }
                            updated[idx].items.push({
                              name: "",
                              qty: "1 حبة",
                              price_with_tax: 0,
                              category: ""
                            });
                            setParsedInvoices(updated);
                          }}
                          className="px-2 py-0.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md flex items-center gap-0.5 cursor-pointer transition-all"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>إضافة سلعة +</span>
                        </button>
                      </div>

                      {/* Items List */}
                      {(!pinv.items || pinv.items.length === 0) ? (
                        <div className="p-3 text-center text-slate-400 text-[10px] border border-dashed border-slate-200 rounded-lg">
                          لا توجد سلع مضافة لهذه الفاتورة. انقر فوق "إضافة سلعة" لإضافة مواد.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                          {pinv.items.map((item, itemIdx) => (
                            <div 
                              key={itemIdx} 
                              className="flex items-center gap-2 text-[10px] bg-white p-1.5 rounded-lg border border-slate-150/80 shadow-3xs hover:border-indigo-150 transition-all"
                            >
                              {/* Item Name Input */}
                              <div className="flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={item.name}
                                  placeholder="المادة (مثال: طماطم)"
                                  title="اسم المادة/السلعة لنظام التتبع"
                                  onChange={(e) => {
                                    const updated = [...parsedInvoices];
                                    if (updated[idx].items) {
                                      updated[idx].items[itemIdx].name = e.target.value;
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-[11px] border border-slate-205 rounded-md focus:border-indigo-500 bg-slate-50/20 text-slate-800 font-extrabold focus:bg-white focus:outline-none placeholder-slate-300"
                                />
                              </div>

                              {/* Item Category Input (نوع السلعة) */}
                              <div className="w-[100px]">
                                <input
                                  type="text"
                                  value={item.category || ""}
                                  placeholder="نوع السلعة"
                                  title="نوع السلعة (مثال: خضار، بيبسي، غاز...)"
                                  onChange={(e) => {
                                    const updated = [...parsedInvoices];
                                    if (updated[idx].items) {
                                      updated[idx].items[itemIdx].category = e.target.value;
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-[11px] border border-pink-200 focus:border-pink-500 bg-pink-50/20 text-pink-700 font-bold focus:bg-white focus:outline-none placeholder-pink-300"
                                />
                              </div>

                              {/* Item Qty Input */}
                              <div className="w-[60px]">
                                <input
                                  type="text"
                                  value={item.qty}
                                  placeholder="الكمية"
                                  title="الحجم / الكمية"
                                  onChange={(e) => {
                                    const updated = [...parsedInvoices];
                                    if (updated[idx].items) {
                                      updated[idx].items[itemIdx].qty = e.target.value;
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-1.5 py-1 text-[10px] border border-slate-205 rounded-md focus:border-indigo-450 bg-slate-50/20 text-center text-slate-600 font-mono font-bold focus:bg-white focus:outline-none placeholder-slate-300"
                                />
                              </div>

                              {/* Item Price incl. tax Input */}
                              <div className="w-[75px]">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.price_with_tax || ""}
                                  placeholder="السعر"
                                  title="سعر السلعة الإجمالي شامل الضريبة"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = [...parsedInvoices];
                                    if (updated[idx].items) {
                                      updated[idx].items[itemIdx].price_with_tax = val === "" ? 0 : parseFloat(val);
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-1.5 py-1 text-[11px] border border-slate-205 rounded-md focus:border-indigo-400 bg-slate-50/20 text-left font-mono font-black text-indigo-700 focus:bg-white focus:outline-none placeholder-0"
                                />
                              </div>

                              {/* Delete Item action */}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...parsedInvoices];
                                  if (updated[idx].items) {
                                    updated[idx].items.splice(itemIdx, 1);
                                    setParsedInvoices(updated);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50/60 rounded-md transition-all cursor-pointer flex-shrink-0"
                                title="حذف هذه السلعة"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* AI Review Panel Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-indigo-100/80">
              <div className="text-xs text-indigo-950 font-bold text-right w-full sm:w-auto">
                إجمالي قيمة الفواتير المكتشفة: <strong className="text-indigo-700 text-sm font-extrabold">
                  {parsedInvoices.reduce((sum, p) => sum + (parseFloat(p.amount as string) || 0), 0).toFixed(2)} ريال
                </strong>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const activeValid = parsedInvoices.filter(p => p.company && (parseFloat(p.amount as string) || 0) > 0);
                    if (activeValid.length === 0) {
                      onShowToast("⚠️ لا توجد فواتير صالحة لنقلها (يجب ملء حقل المورد والمبلغ).");
                      return;
                    }
                    
                    const cleanedManual = rows.filter(r => r.company || r.amount);
                    const newlyMerged = [...cleanedManual, ...activeValid.map(v => ({
                      company: v.company,
                      invoice_no: v.invoice_no,
                      invoice_date: v.invoice_date,
                      amount: v.amount,
                      items: v.items || [],
                    }))];

                    setRows(newlyMerged);
                    setParsedInvoices([]);
                    onShowToast("📥 تم دمج ونقل الفواتير بنجاح لجدول الإدخال بالأسفل!");
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowDownToLine className="w-4 h-4" /> نقل إلى جدول الإدخال اليدوي بالأسفل
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    const activeValid = parsedInvoices.filter(p => p.company && (parseFloat(p.amount as string) || 0) > 0);
                    if (activeValid.length === 0) {
                      onShowToast("⚠️ يرجى تعبئة مورد واحد على الأقل وقيمة أكبر من الصفر للحفظ مباشرة.");
                      return;
                    }

                    setLoading(true);
                    try {
                      const payloads = activeValid.map((v) => ({
                        date,
                        branch,
                        company: getUnifiedCompanyName(v.company, allCompanies),
                        invoice_no: v.invoice_no,
                        invoice_date: v.invoice_date || date,
                        amount: parseFloat(v.amount as string) || 0,
                        items: v.items || [],
                        createdBy: currentUser?.username || "unknown",
                        status: (userRole === "مدخل فواتير" || userRole === "محاسب") ? "pending" : "approved",
                        rawImage: v.rawImage || "",
                        fileType: v.fileType || ""
                      }));

                      const res = await fetch("/api/tax-invoices", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payloads),
                      });

                      if (res.ok) {
                        onShowToast(`🧾 تم حفظ ${payloads.length} فواتير مدعومة بالذكاء الاصطناعي بنجاح!`);
                        setParsedInvoices([]);
                        loadTaxReport();
                      } else {
                        onShowToast("❌ فشل حفظ الفواتير");
                      }
                    } catch (err) {
                      console.error(err);
                      onShowToast("❌ خطأ شبكة أثناء مباشرة الحفظ");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" /> اعتماد وحفظ الفواتير فوراً 🛡️
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveInvoices} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">تاريخ الإدخال العام</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">فرع التحصيل النشط</label>
              <div className="w-full px-3 py-2 text-sm border border-indigo-100 rounded-lg bg-indigo-50/50 text-indigo-900 font-extrabold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>فرع {branch}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">بنود الفواتير المكتوبة:</h3>
            </div>
            
            <div className="space-y-3">
              {rows.map((row, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100 relative">
                  <div className="space-y-1 relative">
                    <label className="text-[11px] font-bold text-slate-600">اسم المورد / المؤسسة</label>
                    <SearchableCompanyInput
                      value={row.company}
                      onChange={(val) => updateRow(index, "company", val)}
                      registeredCompanies={registeredCompanies}
                      onRegisterCompany={(name) => handleAddSupplier(name)}
                      placeholder="مثال: المراعي"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                    />
                    {(() => {
                      const simResult = checkSimilarity(row.company, allCompanies);
                      const showWarning = simResult.matches && !ignoredSimilarities[`row-${index}-${simResult.similarName}`];
                      if (showWarning) {
                        return (
                          <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 space-y-1 animate-fadeIn">
                            <div className="font-bold flex items-center gap-1">
                              <span>⚠️ هل تقصد الاسم المسجل مسبقاً؟</span>
                            </div>
                            <div className="text-[10px]">
                              الاسم قريب جداً من: <span className="font-extrabold text-amber-950 underline">{simResult.similarName}</span>
                            </div>
                            <div className="flex gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => updateRow(index, "company", simResult.similarName)}
                                className="px-1.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-sm text-[9px] cursor-pointer animate-pulse"
                              >
                                ✅ مطابقة الاسم
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIgnoredSimilarities(prev => ({ ...prev, [`row-${index}-${simResult.similarName}`]: true }));
                                }}
                                className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-sm text-[9px] cursor-pointer"
                              >
                                ❌ إبقاء الحالي
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">رقم الفاتورة المكتوب</label>
                    <input
                      type="text"
                      placeholder="رقم الفاتورة"
                      value={row.invoice_no}
                      onChange={(e) => updateRow(index, "invoice_no", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">تاريخ الفاتورة</label>
                    <input
                      type="date"
                      value={row.invoice_date}
                      onChange={(e) => updateRow(index, "invoice_date", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="grid grid-cols-6 gap-2 items-center">
                    <div className="col-span-4 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">المبلغ الإجمالي</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) => updateRow(index, "amount", e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                      />
                    </div>
                    <div className="col-span-2 text-left pt-5">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        disabled={rows.length === 1}
                        className="text-rose-600 hover:text-rose-800 p-2 disabled:opacity-30 cursor-pointer"
                        title="حذف هذا السطر"
                      >
                        <Trash className="w-4 h-4 mx-auto" />
                      </button>
                    </div>
                  </div>

                  {/* Manual Row Items Editor */}
                  {(!row.items || row.items.length === 0) ? (
                    <div className="col-span-1 md:col-span-4 mt-2 flex justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...rows];
                          updated[index].items = [{ name: "", qty: "1 حبة", price_with_tax: 0, category: "" }];
                          setRows(updated);
                        }}
                        className="text-[10px] font-bold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-150/80 px-2.5 py-1 rounded-lg border border-indigo-100 flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة سلع/بضائع تفصيلية لتتبع المشتريات والمخزون الذكي</span>
                      </button>
                    </div>
                  ) : (
                    <div className="col-span-1 md:col-span-4 mt-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-indigo-700 font-extrabold px-1">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          <span>المشتريات السلعية المدرجة للمخزون والتتبع ({row.items.length}):</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...rows];
                            if (!updated[index].items) {
                              updated[index].items = [];
                            }
                            updated[index].items.push({
                              name: "",
                              qty: "1 حبة",
                              price_with_tax: 0,
                              category: ""
                            });
                            setRows(updated);
                          }}
                          className="text-[9px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-0.5 cursor-pointer bg-white px-2 py-0.5 rounded-md border border-indigo-200 animate-pulse"
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>إضافة سلعة +</span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {row.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="flex flex-col gap-1.5 bg-white p-2.5 rounded-lg border border-slate-200 shadow-3xs">
                            <div className="flex items-center gap-1.5">
                              {/* Item Name */}
                              <input
                                type="text"
                                value={item.name}
                                placeholder="اسم السلعة"
                                title="اسم المادة/السلعة للتتبع"
                                onChange={(e) => {
                                  const updated = [...rows];
                                  if (updated[index].items) {
                                    updated[index].items[itemIdx].name = e.target.value;
                                    setRows(updated);
                                  }
                                }}
                                className="flex-1 bg-slate-50/30 border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1.5 py-0.5 min-w-0 text-[11px]"
                              />
                              {/* Remove Item */}
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...rows];
                                  if (updated[index].items) {
                                    updated[index].items.splice(itemIdx, 1);
                                    setRows(updated);
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-1.5 py-0.5 rounded transition-all font-bold cursor-pointer text-[11px]"
                                title="حذف المادة"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {/* Category (نوع السلعة) */}
                              <input
                                type="text"
                                value={item.category || ""}
                                placeholder="نوع السلعة"
                                title="تصنيف السلعة (خضار، بيبسي، ديزل...)"
                                onChange={(e) => {
                                  const updated = [...rows];
                                  if (updated[index].items) {
                                    updated[index].items[itemIdx].category = e.target.value;
                                    setRows(updated);
                                  }
                                }}
                                className="col-span-1 bg-pink-50/25 border border-pink-100 text-pink-700 text-center font-bold focus:outline-none focus:ring-1 focus:ring-pink-300 rounded px-1 py-0.5 text-[10px]"
                              />
                              {/* Quantity */}
                              <input
                                type="text"
                                value={item.qty}
                                placeholder="الكمية"
                                onChange={(e) => {
                                  const updated = [...rows];
                                  if (updated[index].items) {
                                    updated[index].items[itemIdx].qty = e.target.value;
                                    setRows(updated);
                                  }
                                }}
                                className="col-span-1 bg-slate-50/30 border border-slate-200 text-center font-mono text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 text-[10px]"
                              />
                              {/* Price */}
                              <input
                                type="number"
                                step="0.01"
                                value={item.price_with_tax || ""}
                                placeholder="السعر"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updated = [...rows];
                                  if (updated[index].items) {
                                    updated[index].items[itemIdx].price_with_tax = val === "" ? 0 : parseFloat(val);
                                    setRows(updated);
                                  }
                                }}
                                className="col-span-1 bg-slate-50/30 border border-slate-200 text-left font-mono font-bold text-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded px-1 py-0.5 text-[11px]"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addRow}
                className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-lg flex items-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> إضافة مورد وفاتورة أخرى
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-600">
              إجمالي فواتير الإدخال المؤقتة: <strong className="text-indigo-700 font-extrabold text-base">{sumInvoicesInput.toFixed(2)} ر</strong>
            </span>
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-bold py-2.5 px-6 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Receipt className="w-4 h-4" />
              حفظ وتثبيت قائمة الفواتير
            </button>
          </div>
        </form>
      </div>

      {/* For Invoice clerks show a neat simple list of entered branch invoices to avoid confusion and double-entries */}
      {(userRole === "مدخل فواتير" || (userRole === "محاسب" && currentUser?.canEnterInvoices)) && (() => {
        const todayStr = new Date().toISOString().split("T")[0];
        const myInvoices = invoices.filter(i => i.createdBy === currentUser?.username && i.date === todayStr);
        const myInvoicesSorted = [...myInvoices].sort((a, b) => a.id.localeCompare(b.id));
        
        // Keep overall latest invoice check for permission logic
        const overallInvoices = invoices.filter(i => i.createdBy === currentUser?.username);
        const overallSorted = [...overallInvoices].sort((a, b) => a.id.localeCompare(b.id));
        const latestInvoice = overallSorted[overallSorted.length - 1];

        const displayInvoices = [...myInvoicesSorted].reverse();
        const totalAmount = displayInvoices.reduce((acc, inv) => acc + inv.amount, 0);

        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-150 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-700 font-extrabold" />
                <h2 className="text-sm font-bold text-slate-800">الفواتير الضريبية التي قمت بإدخالها اليوم ({todayStr})</h2>
              </div>
              <button
                type="button"
                onClick={loadTaxReport}
                disabled={loading}
                className="text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg p-2 transition-all flex items-center justify-center cursor-pointer disabled:opacity-50 font-bold text-xs gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                تحديث القائمة
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              توضح هذه القائمة الفواتير الضريبية التي قمت بإدخالها لتاريخ اليوم المحدد <strong>({todayStr})</strong>. يُسمح لك بتعديل أو حذف <strong>الفاتورة الأحدث فقط</strong>. بمجرد قيامك بإدخال فاتورة تالية، تصبح الفاتورة السابقة مغلقة وتثبت تلقائياً في النظام لحماية البيانات.
            </p>

            {displayInvoices.length === 0 ? (
              <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-slate-500 font-medium text-xs">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                    <span>جاري تحميل قائمة فواتيرك...</span>
                  </div>
                ) : (
                  `لم تقم بإدخال أي فواتير ضريبية في تاريخ ${todayStr} حتى الآن.`
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white shadow-3xs">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 shadow-3xs">
                      <th className="p-3 text-right">المورد / المؤسسة</th>
                      <th className="p-3 text-center">الفرع</th>
                      <th className="p-3 text-center">رقم الفاتورة</th>
                      <th className="p-3 text-center">تاريخ الفاتورة</th>
                      <th className="p-3 text-left">مبلـغ الفاتورة</th>
                      <th className="p-3 text-center">حالة الفاتورة والتحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayInvoices.map((inv) => {
                      const isLatest = latestInvoice && inv.id === latestInvoice.id;
                      return (
                        <tr key={inv.id} className={`hover:bg-slate-50/50 ${isLatest ? 'bg-indigo-50/10' : ''}`}>
                          <td className="p-3 font-extrabold text-slate-800">{inv.company}</td>
                          <td className="p-3 text-center font-bold text-slate-600">{inv.branch}</td>
                          <td className="p-3 text-center font-mono text-slate-500">{inv.invoice_no || "—"}</td>
                          <td className="p-3 text-center font-mono text-slate-600">{inv.invoice_date || inv.date}</td>
                          <td className="p-3 text-left font-extrabold text-indigo-950 font-mono">
                            {inv.amount.toFixed(2)} ر.س
                          </td>
                          <td className="p-3 text-center">
                            {isLatest ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                                  🔓 الفاتورة الأحدث
                                </span>
                                <button
                                  type="button"
                                  onClick={() => startEditInvoice(inv)}
                                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                  title="تعديل الفاتورة"
                                >
                                  <Edit className="w-3 h-3" />
                                  <span>تعديل</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteInvoice(inv.id)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 shrink-0"
                                  title="حذف الفاتورة"
                                >
                                  <Trash className="w-3 h-3" />
                                  <span>حذف</span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2.5 py-1 rounded-md flex items-center justify-center gap-1 w-max mx-auto">
                                🔒 مغلق بالنظام
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 text-slate-800 font-extrabold border-t border-slate-200">
                      <td colSpan={4} className="p-3 text-right">إجمالي الفواتير التي قمت بإدخالها:</td>
                      <td className="p-3 text-left font-extrabold text-indigo-700 font-mono">
                        {totalAmount.toFixed(2)} ر.س
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* 2. Comprehensive Tax Report (Print Friendly & Ink Saving) */}
      {userRole !== "مدخل فواتير" && (
        <div id="printable-tax-report-area" className="bg-white rounded-xl shadow-sm border border-slate-150 p-6 print:p-0 print:border-none print:shadow-none">
        
        {/* Dynamic style injection specifically optimized for clean print outputs of this report */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            header, nav, form, button, .print\\:hidden, #toast-container, [role="alert"], aside, footer {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            body, html {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              height: auto !important;
            }
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            #printable-tax-report-area {
              display: block !important;
              border: none !important;
              box-shadow: none !important;
              padding: 10mm 12mm !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              visibility: visible !important;
            }
            #printable-tax-report-area * {
              visibility: visible !important;
            }
            #printable-tax-report-area table {
              width: 100% !important;
              border-collapse: collapse !important;
              font-size: 8px !important;
            }
            #printable-tax-report-area th, 
            #printable-tax-report-area td {
              padding: 3px 4px !important;
              font-size: 8px !important;
              line-height: 1.15 !important;
              border-color: #475569 !important; /* darker borders for maximum legibility */
            }
            #printable-tax-report-area th {
              background-color: #f1f5f9 !important;
              color: #000000 !important;
              font-weight: 850 !important;
            }
            #printable-tax-report-area .bg-slate-50,
            #printable-tax-report-area .bg-slate-100,
            #printable-tax-report-area .bg-indigo-50\\/20,
            #printable-tax-report-area .bg-emerald-50\\/10 {
              background-color: transparent !important;
            }
            #printable-tax-report-area h3 {
              font-size: 11px !important;
              margin-bottom: 2px !important;
            }
            #printable-tax-report-area p {
              font-size: 8.5px !important;
            }
            #printable-tax-report-area .text-xs,
            #printable-tax-report-area .text-sm {
              font-size: 8px !important;
            }
            #printable-tax-report-area input {
              display: none !important; /* hide inputs on print completely */
            }
          }
        `}} />

        {/* Advisory banner for iframe print contexts */}
        {typeof window !== "undefined" && window.self !== window.top && (
          <div className="mb-4 p-3.5 bg-amber-50/85 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold flex items-start gap-2.5 print:hidden leading-relaxed">
            <span className="text-sm">💡</span>
            <div>
              <span><strong>تنبيه المتصفح للمعاينة:</strong> واجهات الحماية داخل المنصة تمنع الطباعة التلقائية (window.print). للطباعة والحفظ الفعلي بصيغة PDF أو ورقياً، يرجى فتح التطبيق في علامة تبويب كاملة ومستقلة بالنقر على زر التبويب أعلى المتصفح.</span>
            </div>
          </div>
        )}

        {/* Header containing Title & Print Button (Hidden in Print) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-indigo-700" />
            <h2 className="text-lg font-bold text-slate-800">التقرير الضريبي الموحد الشامل للفرع</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              try {
                window.print();
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
          >
            <span>🖨️</span>
            <span>طباعة التقرير الشامل (بديل مالي موفر للحبر)</span>
          </button>
        </div>

        {/* Switch Selector of Single Day vs period (Hidden in Print) */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="text-right">
            <label className="block text-xs font-extrabold text-slate-700 mb-1">تحديد المدى والوعاء الضريبي للتقرير:</label>
            <p className="text-[10px] text-slate-500 font-medium">اختر ما إذا كنت ترغب في مراجعة وتصفية مبيعات يوم واحد نشط بدقة أو مراجعة فترة مجمعة بالكامل.</p>
          </div>
          <div className="flex bg-slate-200 p-1 rounded-lg flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                setReportMode("day");
                setTo(from);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                reportMode === "day"
                  ? "bg-white text-slate-900 shadow-3xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📅 يوم واحد
            </button>
            <button
              type="button"
              onClick={() => setReportMode("period")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                reportMode === "period"
                  ? "bg-white text-slate-900 shadow-3xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              🗓️ مدى زمني (المجموع الكامل)
            </button>
            <button
              type="button"
              onClick={() => setReportMode("period_detailed")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                reportMode === "period_detailed"
                  ? "bg-white text-slate-900 shadow-3xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              📊 مدى زمني (تفصيلي يومي)
            </button>
          </div>
        </div>

        {/* Date parameters & Company filters inputs (Hidden in Print) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/60 shadow-3xs mb-6 space-y-4 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            {reportMode === "day" ? (
              <>
                <div className="space-y-2 md:col-span-1">
                  <label className="block text-xs font-bold text-slate-700">تاريخ اليوم المراد مراجعته</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFrom(val);
                      setTo(val);
                    }}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 select-none">البحث باسم المؤسسة الموردة (اختياري)</label>
                  <select
                    id="report-company-filter-dropdown"
                    value={selectedCompanyFilter}
                    onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold text-slate-800"
                  >
                    <option value="الكل">🔍 جميع المؤسسات الموردة</option>
                    {allCompanies.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">تاريخ بدء الفترة</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">تاريخ نهاية الفترة</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 select-none">البحث باسم المؤسسة الموردة (اختياري)</label>
                  <select
                    id="report-company-filter-dropdown"
                    value={selectedCompanyFilter}
                    onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold text-slate-800"
                  >
                    <option value="الكل">🔍 جميع المؤسسات الموردة</option>
                    {allCompanies.map((comp) => (
                      <option key={comp} value={comp}>
                        {comp}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={loadTaxReport}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
          >
            <Search className="w-4 h-4" /> 
            <span>{reportMode === "day" ? "عرض ومطابقة مبيعات اليوم" : "عرض ومطابقة مبيعات الفترة"}</span>
          </button>
        </div>

        {stats && (
          <div className="space-y-6">
            
            {/* 1. Cash Input configuration panel (Hidden in Print) */}
            <div className="bg-indigo-50/15 p-5 rounded-2xl border border-indigo-100/50 space-y-4 print:hidden">
              <div className="border-b border-indigo-100/50 pb-2">
                <h3 className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-600 rounded-xs" />
                  إدخال وتثبيت الدخل والوعاء لتنفيذ احتساب الضريبة
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">خطوة إدخال ومراجعة الكاش وتأكيد الوعاء للحسبة الضريبية وعرض الفروقات.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* POS daily sum field (Readonly) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-600">الدخل التلقائي لنقاط البيع (الشبكة خلال الفترة)</label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={`${totalPosValue.toFixed(2)} ريال`}
                      className="w-full pl-3 pr-10 py-2.5 text-sm border border-slate-200 bg-slate-100 text-slate-600 rounded-xl font-extrabold focus:outline-none"
                    />
                    <TrendingUp className="w-4 h-4 text-emerald-600 absolute right-3.5 top-3.5" />
                  </div>
                </div>

                {/* Empty/Editable manual Cash field */}
                <div className="space-y-1.5 font-sans">
                  <label className="block text-xs font-bold text-indigo-950 flex items-center gap-1 select-none">
                    {reportMode === "day" ? (
                      <>مبلغ دخل الكاش لليوم <span className="text-indigo-600 font-normal opacity-85">(خانة إدخال)</span></>
                    ) : (
                      <>مجموع كاش الفترة التراكمي المجمع <span className="text-emerald-700 font-extrabold opacity-95">(محسوب تلقائياً من الأيام)</span></>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      disabled={reportMode !== "day"}
                      placeholder={reportMode === "day" ? "أدخل مبلغ الكاش يدوياً لليوم..." : "مجموع مبالغ الكاش المكتوبة يدوياً للأيام..."}
                      value={tempCashInput}
                      onChange={(e) => setTempCashInput(e.target.value)}
                      className={`w-full pl-12 pr-3 py-2.5 text-sm border-2 rounded-xl focus:outline-none font-bold text-indigo-950 ${
                        reportMode === "day" 
                          ? "border-indigo-200 focus:border-indigo-600 bg-white" 
                          : "border-slate-200 bg-slate-50 cursor-not-allowed text-slate-500 font-extrabold"
                      }`}
                    />
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-1 rounded-lg absolute left-2.5 top-2.5 border border-indigo-150">ريال</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-indigo-100/55">
                <span className="text-[10px] text-slate-500 font-medium">سيتولى النظام خصم الفواتير من إجمالي مجموع (الشبكة والمنصرف النقدي للفرع).</span>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                   <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("🚨 هل أنت متأكد من رغبتك في حذف وتصفير جميع مبالغ الكاش المكتوبة يدوياً في المتصفح لهذه الفترة واليوم المحدد؟")) {
                        // Clear period cash key
                        const savedCashKey = `tax_cash_${branch}_${from}_${to}`;
                        localStorage.removeItem(savedCashKey);
                        setTempCashInput("");
                        setCashInput(0);
                        setIsTaxCalculated(false);

                        // Clear daily cash keys robustly using the getDatesInRange helper
                        try {
                          const dates = getDatesInRange(from, to);
                          dates.forEach((dateStr) => {
                            localStorage.removeItem(`tax_cash_القادسية_${dateStr}_${dateStr}`);
                            localStorage.removeItem(`tax_cash_المروج_${dateStr}_${dateStr}`);
                          });
                        } catch (err) {
                          console.error(err);
                        }

                        setDailyCashKeyTrigger(prev => prev + 1);
                        onShowToast("🧹 تم مسح وتصفير كافة مبالغ الكاش المدخلة يدوياً للفترة والفرع بنجاح!");
                        loadTaxReport();
                      }
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="تصفير الكاش اليدوي للمتصفح بالكامل"
                  >
                    <span>🗑️</span>
                    <span>تصفير ومسح الكاش اليدوي للفترة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCalculateTax}
                    className="w-full sm:w-auto px-6 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>💾</span>
                    <span>حفظ واعتماد الحساب المالي للفترة</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Official Ink-saving Printable Comprehensive Tax Ledger Table (أعمدة وصفوف للطباعة على ورقة واحدة) */}
            <div className="bg-white border border-slate-350 rounded-xl overflow-hidden shadow-2xs mt-4 print:border-slate-400">
              
              {/* Header block optimized for light-ink print outputs */}
              <div className="p-4 bg-slate-50/50 border-b border-slate-300 text-center space-y-1 print:bg-white print:border-b-2">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  تقرير ضريبة القيمة المضافة الموحد الشامل - منشأة فرع {branch}
                </h3>
                <p className="text-[10px] text-slate-500 font-bold">
                  {reportMode === "day" ? `كشف حركة اليوم المالي: ${from}` : `كشف حركة الفترة الزمنية المعتمدة: من ${from} إلى ${to}`}
                </p>
                <div className="text-[9px] text-slate-400 font-semibold font-mono flex items-center justify-center gap-2 mt-1">
                  <span>تاريخ استخراج النشرة: {new Date().toLocaleDateString('ar-EG')}</span>
                  <span>|</span>
                  <span>العملة الرسمية المعبر عنها: ريال سعودي (SAR)</span>
                </div>
              </div>

              <div className="p-4 overflow-x-auto print:overflow-visible scrollbar-thin">
                {reportMode === "period_detailed" ? (
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-800 font-extrabold print:bg-slate-50 print:border-b-2">
                        <th className="p-3 border-l border-slate-300 text-center w-32">التاريخ واليوم</th>
                        <th className="p-3 border-l border-slate-300 text-left w-24">دخل الشبكة (نقاط البيع)</th>
                        <th className="p-3 border-l border-slate-300 text-center w-28 print:p-1">دخل الكاش</th>
                        <th className="p-3 border-l border-slate-300 text-left w-28 bg-slate-50/40">مجموع الدخل الكلي (1)</th>
                        <th className="p-3 border-l border-slate-300 text-right">اسم المؤسسة / المورد</th>
                        <th className="p-3 border-l border-slate-300 text-center w-24">رقم الفاتورة</th>
                        <th className="p-3 border-l border-slate-300 text-center w-24">تاريخ الفاتورة</th>
                        <th className="p-3 border-l border-slate-300 text-left w-24">مبلغ الفاتورة (2)</th>
                        <th className="p-3 border-l border-slate-300 text-left w-28 bg-slate-50/20">صافي الفرق الخاضع (1-2)</th>
                        <th className="p-3 text-left w-28 bg-emerald-50/10 text-emerald-950 font-black">الضريبة 15%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const branchDays = (branch === "القادسية" ? reportRawData?.qData : reportRawData?.mData) || [];
                        
                        const invoiceDatesSet = new Set<string>(filteredInvoices.map((inv) => inv.date));
                        const allUniqueDates = getDatesInRange(from, to).filter(dateStr => invoiceDatesSet.has(dateStr));

                        if (allUniqueDates.length === 0) {
                          return (
                            <tr>
                              <td colSpan={10} className="p-8 text-center text-slate-400 font-medium border-b border-slate-200">
                                لا توجد سجلات يومية أو فواتير ضريبية مسجلة للفترة الزمنية المحددة.
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <>
                            {allUniqueDates.flatMap((dateStr) => {
                              // Find actual entry if it exists in branchDays
                              const realD = branchDays.find((b: any) => b.date === dateStr);
                              const d = realD || {
                                date: dateStr,
                                pos_net: 0,
                                total_sales: 0,
                                cash_net: 0
                              };

                              const dayInvoices = filteredInvoices.filter(
                                (inv) => inv.date === dateStr
                              );
                              const dayInvoicesTotal = dayInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
                              const dayCash = getDailyCash(dateStr);
                              const dayTotalSales = (d.pos_net || 0) + dayCash;
                              const dayNetDifference = dayTotalSales - dayInvoicesTotal;
                              const dayVat = dayNetDifference * (15 / 115);
                              const maxSpan = dayInvoices.length === 0 ? 1 : dayInvoices.length;

                              if (dayInvoices.length === 0) {
                                return [
                                  <tr 
                                    key={d.id || d.date} 
                                    className="border-b border-slate-300 font-medium hover:bg-slate-50/20 bg-white"
                                  >
                                    {/* 1. Date & Day */}
                                    <td className="p-3 text-center border-l border-slate-300 font-bold bg-slate-50/60 font-mono text-slate-800">
                                      <div>{d.date}</div>
                                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">{getArabicDayName(d.date)}</div>
                                    </td>
                                    
                                    {/* 2. POS Net */}
                                    <td className="p-3 text-left border-l border-slate-300 font-bold text-slate-900">
                                      {(d.pos_net || 0).toFixed(2)} ر
                                    </td>
                                    
                                    {/* 3. Daily Cash Input */}
                                    <td className="p-3 text-center border-l border-slate-300 print:p-1">
                                      <div className="flex items-center justify-center gap-1.5 print:hidden">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={getDailyCashDisplayValue(d.date)}
                                          placeholder="0.00"
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "") {
                                              localStorage.removeItem(`tax_cash_${branch}_${d.date}_${d.date}`);
                                            } else {
                                              localStorage.setItem(`tax_cash_${branch}_${d.date}_${d.date}`, val);
                                            }
                                            setDailyCashKeyTrigger(prev => prev + 1);
                                          }}
                                          className="w-24 px-2 py-1 text-center border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-lg text-slate-800 font-extrabold focus:outline-none text-xs bg-slate-50/30 font-mono placeholder-slate-300"
                                        />
                                        <span className="text-[9px] text-slate-400 font-bold">ر</span>
                                      </div>
                                      <span className="hidden print:inline font-bold font-mono text-slate-700">
                                        {dayCash.toFixed(2)} ر
                                      </span>
                                    </td>
                                    
                                    {/* 4. Total Sales */}
                                    <td className="p-3 text-left border-l border-slate-300 font-extrabold text-slate-950 bg-slate-50/30">
                                      {dayTotalSales.toFixed(2)} ر
                                    </td>
                                    
                                    {/* 5. Company Name (Supplier) */}
                                    <td className="p-3 text-center border-l border-slate-300 text-slate-400 font-medium">
                                      لا توجد فواتير
                                    </td>
                                    
                                    {/* 6. Invoice No */}
                                    <td className="p-3 text-center border-l border-slate-300 text-slate-400">
                                      —
                                    </td>
                                    
                                    {/* 7. Invoice Date */}
                                    <td className="p-3 text-center border-l border-slate-300 text-slate-400 font-mono">
                                      —
                                    </td>
                                    
                                    {/* 8. Invoice Amount */}
                                    <td className="p-3 text-left border-l border-slate-300 text-slate-400">
                                      0.00 ر
                                    </td>
                                    
                                    {/* 9. Difference */}
                                    <td className="p-3 text-left border-l border-slate-300 font-extrabold bg-slate-50/10">
                                      <span className={dayNetDifference >= 0 ? "text-emerald-700" : "text-rose-600"}>
                                        {dayNetDifference.toFixed(2)} ر
                                      </span>
                                    </td>
                                    
                                    {/* 10. Daily VAT */}
                                    <td className="p-3 text-left font-black bg-emerald-50/10 text-emerald-800">
                                      {dayVat.toFixed(2)} ر
                                    </td>
                                  </tr>
                                ];
                              }

                              return dayInvoices.map((inv, idx) => {
                                const isFirst = idx === 0;
                                return (
                                  <tr 
                                    key={inv.id} 
                                    className={`border-b border-slate-300 font-medium hover:bg-slate-50/20 ${
                                      idx % 2 === 1 ? 'bg-slate-50/10' : 'bg-white'
                                    }`}
                                  >
                                    {/* 1-4. Daily metrics merged for this day */}
                                    {isFirst && (
                                      <>
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-center border-l border-slate-300 font-bold bg-slate-50/60 font-mono text-slate-800 align-middle"
                                        >
                                          <div>{d.date}</div>
                                          <div className="text-[10px] text-slate-500 font-bold mt-0.5">{getArabicDayName(d.date)}</div>
                                        </td>
                                        
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-left border-l border-slate-300 font-bold text-slate-900 align-middle"
                                        >
                                          {(d.pos_net || 0).toFixed(2)} ر
                                        </td>
                                        
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-center border-l border-slate-300 print:p-1 align-middle"
                                        >
                                          <div className="flex items-center justify-center gap-1.5 print:hidden">
                                            <input
                                              type="number"
                                              step="0.01"
                                              value={getDailyCashDisplayValue(d.date)}
                                              placeholder="0.00"
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === "") {
                                                  localStorage.removeItem(`tax_cash_${branch}_${d.date}_${d.date}`);
                                                } else {
                                                  localStorage.setItem(`tax_cash_${branch}_${d.date}_${d.date}`, val);
                                                }
                                                setDailyCashKeyTrigger(prev => prev + 1);
                                              }}
                                              className="w-24 px-2 py-1 text-center border border-slate-300 hover:border-slate-400 focus:border-indigo-600 rounded-lg text-slate-800 font-extrabold focus:outline-none text-xs bg-slate-50/30 font-mono placeholder-slate-300"
                                            />
                                            <span className="text-[9px] text-slate-400 font-bold">ر</span>
                                          </div>
                                          <span className="hidden print:inline font-bold font-mono text-slate-700">
                                            {dayCash.toFixed(2)} ر
                                          </span>
                                        </td>
                                        
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-left border-l border-slate-300 font-extrabold text-slate-950 bg-slate-50/30 align-middle"
                                        >
                                          {dayTotalSales.toFixed(2)} ر
                                        </td>
                                      </>
                                    )}
                                    
                                    {/* 5-8. Individual Invoice columns */}
                                    <td className="p-3 text-right border-l border-slate-300 text-slate-800 font-bold">
                                      {inv.company}
                                    </td>
                                    
                                    <td className="p-3 text-center border-l border-slate-300 font-mono text-slate-550">
                                      {inv.invoice_no || "—"}
                                    </td>
                                    
                                    <td className="p-3 text-center border-l border-slate-300 font-mono text-slate-500">
                                      {inv.invoice_date || inv.date}
                                    </td>
                                    
                                    <td className="p-3 text-left border-l border-slate-300 font-bold text-slate-750 font-mono">
                                      {inv.amount.toFixed(2)} ر
                                    </td>
                                    
                                    {/* 9-10. Daily difference and VAT merged for this day */}
                                    {isFirst && (
                                      <>
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-left border-l border-slate-300 font-extrabold align-middle"
                                        >
                                          <span className={dayNetDifference >= 0 ? "text-emerald-700 font-extrabold" : "text-rose-600 font-extrabold"}>
                                            {dayNetDifference.toFixed(2)} ر
                                          </span>
                                        </td>
                                        
                                        <td 
                                          rowSpan={maxSpan}
                                          className="p-3 text-left font-black bg-emerald-50/10 text-emerald-800 align-middle"
                                        >
                                          {dayVat.toFixed(2)} ر
                                        </td>
                                      </>
                                    )}
                                  </tr>
                                );
                              });
                            })}

                            {/* Totals Row for Detailed Period */}
                            {(() => {
                              let totalPos = 0;
                              let totalCash = 0;
                              let totalInvs = 0;

                              allUniqueDates.forEach((dateStr) => {
                                const realD = branchDays.find((b: any) => b.date === dateStr);
                                const d = realD || { pos_net: 0 };
                                totalPos += d.pos_net || 0;
                                totalCash += getDailyCash(dateStr);
                                const dayInvs = filteredInvoices.filter(
                                  (inv) => inv.date === dateStr
                                );
                                totalInvs += dayInvs.reduce((sum, inv) => sum + (inv.amount || 0), 0);
                              });

                              const totalSalesCombined = totalPos + totalCash;
                              const netDiffCombined = totalSalesCombined - totalInvs;
                              const vatCombined = netDiffCombined * (15 / 115);

                              return (
                                <tr className="bg-slate-100 border-t-2 border-b-2 border-slate-300 font-bold text-slate-800 text-xs">
                                  <td className="p-3 text-center border-l border-slate-300 font-extrabold bg-slate-150">الـمـجـمـوع الـكـلـي لـفـتـرة {allUniqueDates.length} أيام في الكشف</td>
                                  <td className="p-3 text-left border-l border-slate-300 text-slate-900 font-extrabold font-mono">{totalPos.toFixed(2)} ر</td>
                                  <td className="p-3 text-left border-l border-slate-300 text-slate-700 font-extrabold bg-slate-50 font-mono">{totalCash.toFixed(2)} ر</td>
                                  <td className="p-3 text-left border-l border-slate-300 text-indigo-950 font-black bg-indigo-50/20 font-mono">{totalSalesCombined.toFixed(2)} ر</td>
                                  <td colSpan={3} className="p-3 text-center border-l border-slate-300 text-slate-400 bg-slate-50">—</td>
                                  <td className="p-3 text-left border-l border-slate-300 text-rose-700 font-extrabold font-mono">{totalInvs.toFixed(2)} ر</td>
                                  <td className="p-3 text-left border-l border-slate-300 font-black text-slate-900 bg-slate-50 font-mono">
                                    <span className={netDiffCombined >= 0 ? "text-emerald-700 font-black" : "text-rose-600 font-black"}>
                                      {netDiffCombined.toFixed(2)} ر
                                    </span>
                                  </td>
                                  <td className="p-3 text-left font-black bg-emerald-50 text-emerald-950 text-sm font-mono">
                                    {vatCombined.toFixed(2)} ر
                                  </td>
                                </tr>
                              );
                            })()}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-800 font-extrabold print:bg-slate-50 print:border-b-2">
                        <th className="p-2 border-l border-slate-300 text-center w-28">تاريخ / فترة الضريبة</th>
                        <th className="p-2 border-l border-slate-300 text-left w-28">مجموع دخل نقاط البيع</th>
                        <th className="p-2 border-l border-slate-300 text-left w-24">دخل الكاش المدرج</th>
                        <th className="p-2 border-l border-slate-300 text-left w-32 bg-slate-50/30">مجموع دخل الدورة (1)</th>
                        {userRole === "مدير" && (
                          <th className="p-2 border-l border-slate-300 text-center w-12 print:hidden">
                            <input
                              type="checkbox"
                              checked={filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoiceIds.includes(inv.id))}
                              onChange={() => {
                                const allSelected = filteredInvoices.length > 0 && filteredInvoices.every(inv => selectedInvoiceIds.includes(inv.id));
                                if (allSelected) {
                                  setSelectedInvoiceIds([]);
                                } else {
                                  setSelectedInvoiceIds(filteredInvoices.map(inv => inv.id));
                                }
                              }}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-slate-500 cursor-pointer h-3.5 w-3.5"
                            />
                          </th>
                        )}
                        <th className="p-2 border-l border-slate-300 text-center w-28">تاريخ الفاتورة</th>
                        <th className="p-2 border-l border-slate-300 text-right">مورد الفاتورة (اسم المؤسسة)</th>
                        <th className="p-2 border-l border-slate-300 text-center w-24">رقم الفاتورة</th>
                        <th className="p-2 border-l border-slate-200 text-left w-24 bg-slate-50/20">مبلـغ الفاتورة (2)</th>
                        <th className="p-2 text-center w-12 print:hidden">تعديل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.length === 0 ? (
                        <tr className="border-b border-slate-300 font-medium">
                          <td className="p-2 text-center border-l border-slate-300 font-bold bg-slate-100/20">
                            {reportMode === "day" ? (
                              <span className="font-mono">{from}</span>
                            ) : (
                              <>
                                <span className="font-mono">{from}</span> <br /> 
                                <span className="font-mono">{to}</span>
                              </>
                            )}
                          </td>
                          <td className="p-2 text-left border-l border-slate-300 font-bold text-slate-900">
                            {totalPosValue.toFixed(2)} ر
                          </td>
                          <td className="p-2 text-left border-l border-slate-300 font-bold text-slate-600">
                            {cashInput.toFixed(2)} ر
                          </td>
                          <td className="p-2 text-left border-l border-slate-300 font-extrabold text-slate-900 bg-slate-50/60">
                            {grandTotalWithInjectedCash.toFixed(2)} ر
                          </td>
                          
                          {/* Empty indicators for invoices */}
                          <td colSpan={userRole === "مدير" ? 5 : 4} className="p-4 text-center text-slate-400 border-l border-slate-300 font-medium">
                            {loading ? (
                              <div className="flex items-center justify-center gap-2 py-1 text-xs text-indigo-600 font-bold">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>جاري تحميل ومطابقة الفواتير...</span>
                              </div>
                            ) : (
                              "لا توجد فواتير ضريبية مستلمة أو مثبتة للفترة المحددة."
                            )}
                          </td>
                          <td className="p-2 text-center print:hidden">—</td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv, idx) => {
                          const isFirst = idx === 0;
                          return (
                            <tr 
                              key={inv.id} 
                              className={`border-b border-slate-300 hover:bg-slate-50/10 font-medium ${
                                idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                              }`}
                            >
                              {/* Grouping aggregated revenue parameters onto the first row utilizing rowSpan */}
                              {isFirst && (
                                <>
                                  <td 
                                    rowSpan={filteredInvoices.length} 
                                    className="p-2 text-center border-l border-slate-300 bg-slate-50/50 align-middle font-bold text-slate-800"
                                  >
                                    {reportMode === "day" ? (
                                      <div className="font-mono">{from}</div>
                                    ) : (
                                      <>
                                        <div>من: {from}</div>
                                        <div className="my-1.5 text-slate-400 font-normal">إلى:</div>
                                        <div>{to}</div>
                                      </>
                                    )}
                                  </td>
                                  <td 
                                    rowSpan={filteredInvoices.length} 
                                    className="p-2 text-left border-l border-slate-300 align-middle font-bold text-slate-900"
                                  >
                                    {totalPosValue.toFixed(2)} ر
                                  </td>
                                  <td 
                                    rowSpan={filteredInvoices.length} 
                                    className="p-2 text-left border-l border-slate-300 align-middle font-bold text-slate-600"
                                  >
                                    {cashInput.toFixed(2)} ر
                                  </td>
                                  <td 
                                    rowSpan={filteredInvoices.length} 
                                    className="p-2 text-left border-l border-slate-300 align-middle font-extrabold text-indigo-950 bg-indigo-50/20"
                                  >
                                    {grandTotalWithInjectedCash.toFixed(2)} ر
                                  </td>
                                </>
                              )}

                              {/* Row specific invoice data */}
                              {userRole === "مدير" && (
                                <td className="p-2 text-center border-l border-slate-300 print:hidden">
                                  <input
                                    type="checkbox"
                                    checked={selectedInvoiceIds.includes(inv.id)}
                                    onChange={() => {
                                      if (selectedInvoiceIds.includes(inv.id)) {
                                        setSelectedInvoiceIds(selectedInvoiceIds.filter(id => id !== inv.id));
                                      } else {
                                        setSelectedInvoiceIds([...selectedInvoiceIds, inv.id]);
                                      }
                                    }}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-slate-500 cursor-pointer h-3.5 w-3.5"
                                  />
                                </td>
                              )}
                              <td className="p-2 text-center border-l border-slate-300 text-slate-500 font-mono">
                                {inv.invoice_date || inv.date}
                              </td>
                              <td className="p-2 text-right border-l border-slate-300 text-slate-800 font-bold">
                                {inv.company}
                              </td>
                              <td className="p-2 text-center border-l border-slate-300 font-mono text-slate-550">
                                {inv.invoice_no || "—"}
                              </td>
                              <td className="p-2 text-left border-l border-slate-300 font-bold text-slate-700 bg-slate-50/10">
                                {inv.amount.toFixed(2)} ر
                              </td>
                              <td className="p-2 text-center print:hidden">
                                {userRole === "مدير" ? (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => startEditInvoice(inv)}
                                      className="text-indigo-600 hover:text-indigo-800 p-0.5 cursor-pointer transform hover:scale-110 transition-transform"
                                      title="تعديل الفاتورة الضريبية"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteInvoice(inv.id)}
                                      className="text-rose-600 hover:text-rose-800 p-0.5 cursor-pointer transform hover:scale-110 transition-transform"
                                      title="حذف الفاتورة الضريبية"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                                    🔒 مؤمنة
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}

                      {/* Column totals and formulas according to bookkeeping guidelines */}
                      <tr className="bg-slate-50/75 border-b border-slate-300 font-bold">
                        <td colSpan={4} className="p-2 text-center border-l border-slate-300 text-slate-400 text-[10px] font-normal">نظام تجميع الوعاء الشامل</td>
                        <td colSpan={userRole === "مدير" ? 4 : 3} className="p-2 text-right border-l border-slate-300 text-slate-700 bg-slate-100/50">
                          إجمالي فواتير ومشتريات الدورة المعتمدة (مجموع الفواتير) (2)
                        </td>
                        <td className="p-2 text-left font-extrabold text-rose-700 border-l border-slate-300 bg-rose-50/10">
                          {totalInvoicesAmount.toFixed(2)} ر
                        </td>
                        <td className="print:hidden"></td>
                      </tr>

                      {/* NET difference after deducting the aggregated income from the expenses */}
                      <tr className="bg-slate-100/40 border-b border-slate-300 font-bold">
                        <td colSpan={4} className="p-2 border-l border-slate-300"></td>
                        <td colSpan={userRole === "مدير" ? 4 : 3} className="p-2 text-right border-l border-slate-300 text-slate-700">
                          الفرق الصافي الخاضع للضريبة (خصم الفواتير من مجموع الدخل الموحد = الوعاء 1 - المصروف 2)
                        </td>
                        <td className="p-2 text-left font-extrabold text-slate-900 border-l border-slate-300 bg-slate-50">
                          <span className={grandDifference >= 0 ? "text-emerald-700" : "text-rose-600"}>
                            {grandDifference.toFixed(2)} ر
                          </span>
                        </td>
                        <td className="print:hidden"></td>
                      </tr>

                      {/* VAT Computation Row */}
                      <tr className="bg-slate-50 border-b-2 border-slate-300">
                        <td colSpan={4} className="p-2 border-l border-slate-300 text-slate-400 text-[10px] font-normal print:text-[8px]">الضريبة 15% على الوعاء الصافي للفرق</td>
                        <td colSpan={userRole === "مدير" ? 4 : 3} className="p-2 text-right border-l border-slate-300 text-slate-800 font-bold text-sm">
                          مبلغ ضريبة القيمة المضافة المستحقة المقررة على الفرق
                        </td>
                        <td className="p-2 text-left font-extrabold text-sm text-emerald-800 border-l border-slate-300 bg-emerald-50/20 border-2 border-emerald-500/20">
                          {grandVat.toFixed(2)} ر
                        </td>
                        <td className="print:hidden"></td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>

              {/* Informative, ink-saving accounting footer and sign off fields for business legitimacy */}
              <div className="p-4 bg-white text-[9px] text-slate-500 leading-relaxed text-right font-medium">
                <p>
                  * <strong>ملاحظة محاسبية وإدارية:</strong> يصدر هذا الكشف بشكل مالي شامل لأغراض تصفية الفاقد الضريبي والمطابقة مع الهيئة العامة للزكاة والضريبة والجمارك. كافة البنود الواردة تم تجميعها من خلال ربط مباشر لأجهزة الدفع (نقاط بيع سلة/مدى) للفترة المحددة مع المنصرف اليدوي المسجل، وخصم مطالبات المشتريات ومصروفات المواد الأولية والخدمات للفرع بشكل دقيق.
                </p>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-205">
                  <span>إمضاء مراجع الحسابات للفرع: _____________________</span>
                  <span>اعتماد الإدارة الضريبية للشركة: _____________________</span>
                  <span className="font-mono text-slate-400">الفرع النشط: {branch} (A4 LANDSCAPE)</span>
                </div>
              </div>
            </div>

            {/* Print Friendly configuration instructions (Hidden in Print) */}
            <p className="text-[10px] text-slate-400 font-semibold text-center flex items-center justify-center gap-1 print:hidden">
              <span>💡</span>
              <span><strong>نصيحة الطباعة والتوفير:</strong> تم تحسين هذا التقرير ليركز على اللونين الأبيض والرمادي لعدم استهلاك حبر الطابعة. يمكنك طباعة الشهر بالكامل في ورقة واحدة عن طريق تقليل النطاق الزمني أو ضبط خيارات الطباعة متبوعاً باختيار الاتجاه الأفقي (Landscape) عبر المتصفح.</span>
            </p>

          </div>
        )}
      </div>
      )}

      {/* Reusable Polish Safe Custom Confirm Dialog Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="rtl" text-right="true">
            {/* Modal Header */}
            <div className="p-5 flex items-start gap-4 bg-rose-50 border-b border-rose-100">
              <div className="p-2.5 rounded-full flex-shrink-0 bg-rose-100 text-rose-700">
                <Trash className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-base font-bold text-slate-900">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-500">منظومة الإدارة المحاسبية الضريبية</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-sm text-slate-700 font-medium leading-relaxed text-right space-y-3">
              <p>{confirmModal.message}</p>
              <div className="bg-amber-50 p-3 rounded-lg text-amber-900 text-xs font-bold leading-relaxed flex items-start gap-1.5 border border-amber-100">
                <span>⚠️</span>
                <span>تنبيه: لا يمكن التراجع عن حذف الفاتورة الضريبية، وسيتم تحديث كشوفات الأرصدة والبيانات تلقائياً لضمان دقة التقارير.</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-2 border-t border-slate-100">
              <button
                type="button"
                className="w-full sm:w-auto px-5 py-2.5 font-bold text-xs rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
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

      {/* Dynamic Pop-up Edit Invoice Modal for "مدير" */}
      {editModal.show && editModal.invoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-150 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-right" dir="rtl">
            {/* Modal Header */}
            <div className="p-5 flex items-start gap-4 bg-indigo-50 border-b border-indigo-100">
              <div className="p-2.5 rounded-full flex-shrink-0 bg-indigo-100 text-indigo-700">
                <Pen className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-right">
                <h3 className="text-base font-bold text-slate-900">
                  تعديل بيانات هذه الفاتورة الضريبية
                </h3>
                <p className="text-xs text-slate-500 font-medium">تعديل المشتريات والمنعكس بشكل فوري على كشوفات ضريبة القيمة المضافة والشامل</p>
              </div>
            </div>

            {/* Modal Form */}
            <form onSubmit={saveEditedInvoice}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Company Item Name */}
                <div className="space-y-1 relative">
                  <label className="block text-xs font-bold text-slate-700">مورد الفاتورة (اسم المؤسسة / الشركة): <span className="text-red-500">*</span></label>
                  <SearchableCompanyInput
                    value={editCompany}
                    onChange={(val) => setEditCompany(val)}
                    registeredCompanies={registeredCompanies}
                    onRegisterCompany={(name) => handleAddSupplier(name)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold"
                    placeholder="مثال: شركة المراعي للصناعات الغذائية"
                  />
                  {(() => {
                    const simResult = checkSimilarity(editCompany, allCompanies);
                    const showWarning = simResult.matches && !ignoredSimilarities[`edit-${simResult.similarName}`];
                    if (showWarning) {
                      return (
                        <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 space-y-1 animate-fadeIn">
                          <div className="font-bold flex items-center gap-1">
                            <span>⚠️ هل تقصد الاسم المسجل مسبقاً؟</span>
                          </div>
                          <div className="text-[10px]">
                            الاسم قريب جداً من: <span className="font-extrabold text-amber-950 underline">{simResult.similarName}</span>
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditCompany(simResult.similarName)}
                              className="px-1.5 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-sm text-[9px] cursor-pointer animate-pulse"
                            >
                              ✅ مطابقة الاسم
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIgnoredSimilarities(prev => ({ ...prev, [`edit-${simResult.similarName}`]: true }));
                              }}
                              className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-sm text-[9px] cursor-pointer"
                            >
                              ❌ إبقاء الحالي
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Two-Column: Invoice Number & System date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">رقم الفاتورة الضريبية:</label>
                    <input
                      type="text"
                      value={editInvoiceNo}
                      onChange={(e) => setEditInvoiceNo(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                      placeholder="مثال: VAT-492931"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">تاريخ إصدار الفاتورة المكتوب ورقيّاً:</label>
                    <input
                      type="date"
                      value={editInvoiceDate}
                      onChange={(e) => setEditInvoiceDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                    />
                  </div>
                </div>

                {/* Date of registration on system (for filtering list in range) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">تاريخ التسجيل وقيد النظام للفترة: <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono font-bold text-indigo-900"
                  />
                </div>

                {/* Two-Column: Amount & Branch designation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">المبلغ الإجمالي شامل الضريبة (ر.س): <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-left font-mono font-extrabold text-blue-900"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">تقييد الفرع المستفيد من الفاتورة:</label>
                    <select
                      value={editBranch}
                      onChange={(e) => setEditBranch(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-bold text-slate-700"
                    >
                      <option value="القادسية">📍 فرع القادسية</option>
                      <option value="المروج">📍 فرع المروج</option>
                    </select>
                  </div>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg text-amber-900 text-[11px] font-bold leading-relaxed flex items-start gap-1.5 border border-amber-100">
                  <span>ℹ️</span>
                  <span>تنبيه المراجعة: سوف يتم تحديث كافّة المجاميع، والوعاء الضريبي، وتقرير القيمة المضافة الموحد الشامل بشكل تلقائي فور تأكيد الحفظ.</span>
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="bg-slate-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-2 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 font-bold text-xs rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <span>💾 حفظ وتعديل الفاتورة</span>
                </button>
                <button
                  type="button"
                  className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center cursor-pointer"
                  onClick={() => {
                    setEditModal({ show: false, invoice: null });
                  }}
                >
                  <span>إلغاء والتراجع</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Immersive Visual Invoice Audit & Verification Modal */}
      {auditInvoiceId && (() => {
        const pinv = parsedInvoices.find(p => p.tempId === auditInvoiceId);
        if (!pinv) return null;
        
        // Find the index of this pinv in parsedInvoices
        const pinvIdx = parsedInvoices.findIndex(p => p.tempId === auditInvoiceId);

        return (
          <div className="fixed inset-0 z-55 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md transition-opacity duration-305" dir="rtl">
            <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl max-w-7xl w-full h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Header */}
              <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white">نظام المراجعة والتدقيق والتحقق البصري للفاتورة 🔬</h3>
                    <p className="text-[10px] text-slate-400">تحقق ومطابقة محتويات الفاتورة المصورة بدقة متناهية وجودة ممتازة قبل الاعتماد النهائي</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAuditInvoiceId(null)}
                  className="p-1.5 hover:bg-slate-750 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                  title="إغلاق نافذة التدقيق"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body - Split Screen split into 2 Columns */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
                
                {/* Right Column: Pristine High-Resolution Document Viewer (Interactive Panning/Zooming) */}
                <div className="md:w-1/2 bg-slate-950 flex flex-col border-l border-slate-800 min-h-[320px] md:min-h-0 relative group">
                  
                  {/* Floating Action Controls for Pristine Viewing Quality */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900/95 border border-slate-700 p-1.5 rounded-xl shadow-lg backdrop-blur-xs select-none">
                    <button
                      type="button"
                      onClick={() => setImgZoom(prev => Math.min(prev + 0.25, 4.5))}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md transition-all cursor-pointer"
                      title="تكبير الصورة (+)"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImgZoom(prev => Math.max(prev - 0.25, 0.4))}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md transition-all cursor-pointer"
                      title="تصغير الصورة (-)"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImgRotation(prev => (prev + 90) % 360)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md transition-all cursor-pointer"
                      title="تدوير الصورة 90 درجة يميناً"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImgZoom(1);
                        setImgRotation(0);
                        setImgPan({ x: 0, y: 0 });
                      }}
                      className="p-1.5 bg-indigo-905 hover:bg-indigo-800 text-indigo-200 hover:text-white rounded-md transition-all text-[10px] font-bold px-2.5 cursor-pointer"
                      title="إعادة التوطين الافتراضي للمطابقة"
                    >
                      إعادة ضبط
                    </button>
                  </div>

                  {/* Display Instruction Indicator */}
                  <div className="absolute bottom-3 right-3 z-10 text-[9px] bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-md text-slate-400 select-none pointer-events-none">
                    💡 اسحب الصورة للتحريك، أو استخدم عجلات الماوس للتكبير والتصغير بدقة عالية.
                  </div>

                  {/* Document Display Canvas Stage */}
                  <div 
                    className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing flex items-center justify-center select-none"
                    onMouseDown={(e) => {
                      setIsDraggingPan(true);
                      dragStart.current = { x: e.clientX - imgPan.x, y: e.clientY - imgPan.y };
                    }}
                    onMouseMove={(e) => {
                      if (!isDraggingPan) return;
                      setImgPan({
                        x: e.clientX - dragStart.current.x,
                        y: e.clientY - dragStart.current.y
                      });
                    }}
                    onMouseUp={() => setIsDraggingPan(false)}
                    onMouseLeave={() => setIsDraggingPan(false)}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY < 0 ? 0.15 : -0.15;
                      setImgZoom(prev => Math.max(0.4, Math.min(prev + delta, 4.5)));
                    }}
                  >
                    {!pinv.originalObjectUrl && !pinv.rawImage ? (
                      <div className="text-slate-500 text-xs font-bold flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 text-slate-600 animate-bounce" />
                        <span>الملف الممسوح مفقود بصریاً</span>
                      </div>
                    ) : pinv.fileType === "application/pdf" ? (
                      <object
                        data={pinv.originalObjectUrl || pinv.rawImage}
                        type="application/pdf"
                        className="w-full h-full"
                        style={{
                          transform: `scale(${imgZoom}) rotate(${imgRotation}deg) translate(${imgPan.x}px, ${imgPan.y}px)`,
                          transformOrigin: "center center",
                          transition: isDraggingPan ? "none" : "transform 0.1s ease-out"
                        }}
                      >
                        <embed src={pinv.originalObjectUrl || pinv.rawImage} type="application/pdf" />
                      </object>
                    ) : (
                      <img
                        src={pinv.originalObjectUrl || pinv.rawImage}
                        alt="مستند الفاتورة الأصلي عالي الجودة"
                        draggable={false}
                        className="max-h-full max-w-full object-contain shadow-2xl transition-all"
                        referrerPolicy="no-referrer"
                        style={{
                          transform: `translate(${imgPan.x}px, ${imgPan.y}px) scale(${imgZoom}) rotate(${imgRotation}deg)`,
                          transformOrigin: "center center",
                          transition: isDraggingPan ? "none" : "transform 0.1s ease-out"
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Left Column: Form Editor & Purchases Details */}
                <div className="md:w-1/2 flex flex-col bg-slate-900 min-w-0">
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    
                    {/* Invoice Meta Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Supplier/Company Custom Searchable Input */}
                      <div className="space-y-1 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                        <label className="block text-[10px] font-bold text-slate-400">اسم المورد / المؤسسة بالفاتورة:</label>
                        <SearchableCompanyInput
                          value={pinv.company}
                          onChange={(val) => {
                            const updated = [...parsedInvoices];
                            updated[pinvIdx].company = val;
                            setParsedInvoices(updated);
                          }}
                          registeredCompanies={registeredCompanies}
                          onRegisterCompany={(name) => handleAddSupplier(name)}
                          className="w-full px-3 py-1.5 text-xs border border-slate-700 bg-slate-800 hover:border-slate-600 focus:border-indigo-500 rounded-md focus:outline-none font-bold text-slate-100"
                        />
                      </div>

                      {/* Invoice Date */}
                      <div className="space-y-1 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                        <label className="block text-[10px] font-bold text-slate-400">تاريخ الفاتورة المكتوب:</label>
                        <input
                          type="date"
                          value={pinv.invoice_date}
                          onChange={(e) => {
                            const updated = [...parsedInvoices];
                            updated[pinvIdx].invoice_date = e.target.value;
                            setParsedInvoices(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-slate-700 bg-slate-800 rounded-md focus:outline-none focus:border-indigo-500 font-bold text-slate-100"
                        />
                      </div>

                      {/* Invoice Serial Number */}
                      <div className="space-y-1 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                        <label className="block text-[10px] font-bold text-slate-400">رقم الفاتورة الأصيل (SERIAL):</label>
                        <input
                          type="text"
                          value={pinv.invoice_no}
                          onChange={(e) => {
                            const updated = [...parsedInvoices];
                            updated[pinvIdx].invoice_no = e.target.value;
                            setParsedInvoices(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-slate-700 bg-slate-800 rounded-md focus:outline-none focus:border-indigo-500 font-bold text-slate-100"
                          placeholder="Inv-XXXXXXXX"
                        />
                      </div>

                      {/* Total Gross Amount */}
                      <div className="space-y-1 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                        <label className="block text-[10px] font-bold text-indigo-400">المبلغ الإجمالي شامل الضريبة:</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={pinv.amount}
                          onChange={(e) => {
                            const updated = [...parsedInvoices];
                            updated[pinvIdx].amount = e.target.value;
                            setParsedInvoices(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-indigo-900/50 bg-indigo-950/40 text-indigo-300 rounded-md focus:outline-none focus:border-indigo-500 font-black"
                        />
                      </div>
                    </div>

                    {/* Similarity Warning inside Modal if found */}
                    {(() => {
                      const simResult = checkSimilarity(pinv.company, allCompanies);
                      const showWarning = simResult.matches && !ignoredSimilarities[`parsed-mod-${pinvIdx}-${simResult.similarName}`];
                      if (showWarning) {
                        return (
                          <div className="p-3 bg-amber-950/45 border border-amber-800/60 rounded-xl text-xs text-amber-200 space-y-2 animate-fadeIn select-none">
                            <div className="font-extrabold flex items-center gap-1.5 text-amber-300">
                              <span>⚠️ مطابقة تلقائية لقرب الاسم:</span>
                              <span>هل تقصد المؤسسة المسجلة بالنظام؟</span>
                            </div>
                            <p className="text-[11px] text-amber-400">
                              الاسم المكتوب قريب من: <span className="font-black text-white underline">{simResult.similarName}</span>
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...parsedInvoices];
                                  updated[pinvIdx].company = simResult.similarName;
                                  setParsedInvoices(updated);
                                }}
                                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-md text-[10px] cursor-pointer"
                              >
                                ✅ مطابقة وتوحيد كـ ({simResult.similarName})
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIgnoredSimilarities(prev => ({ ...prev, [`parsed-mod-${pinvIdx}-${simResult.similarName}`]: true }));
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-[10px] cursor-pointer"
                              >
                                ❌ إبقاء الاسم الحالي
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Tabular List of Extracted Purchase Items */}
                    <div className="space-y-2 pt-3 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-300 flex items-center gap-1">
                          <Library className="w-4 h-4 text-indigo-400" />
                          <span>تفاصيل مصفوفة السلع والمشتريات المستخرجة ({pinv.items?.length || 0})</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...parsedInvoices];
                            if (!updated[pinvIdx].items) {
                              updated[pinvIdx].items = [];
                            }
                            updated[pinvIdx].items.push({
                              name: "",
                              qty: "1 حبة",
                              price_with_tax: 0,
                              category: ""
                            });
                            setParsedInvoices(updated);
                          }}
                          className="px-2.5 py-1 text-[10px] font-black text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 border border-indigo-900 rounded-md flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة مادة جديدة +</span>
                        </button>
                      </div>

                      {/* Items Matrix */}
                      {(!pinv.items || pinv.items.length === 0) ? (
                        <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                          لا توجد بنود وسلع مسجلة لهذه الفاتورة حتى الآن. يمكنك استخراجها أو إضافتها يدوياً.
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                          {pinv.items.map((item, itemIdx) => (
                            <div 
                              key={itemIdx}
                              className="flex flex-col sm:flex-row items-stretch gap-2 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800 hover:border-slate-750 transition-all text-xs"
                            >
                              {/* Item Description Name */}
                              <div className="flex-1 space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 block">اسم المادة / السلعة:</label>
                                <input
                                  type="text"
                                  value={item.name}
                                  placeholder="مثل: خضار، لحوم، غاز..."
                                  onChange={(e) => {
                                    const updated = [...parsedInvoices];
                                    if (updated[pinvIdx].items) {
                                      updated[pinvIdx].items[itemIdx].name = e.target.value;
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-100 font-extrabold placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                                />
                              </div>

                              {/* Item Category */}
                              <div className="w-full sm:w-[120px] space-y-1">
                                <label className="text-[9px] font-bold text-pink-400 block">تصنيف السلعة للفرع:</label>
                                <input
                                  type="text"
                                  value={item.category || ""}
                                  placeholder="تصنيف المادة"
                                  onChange={(e) => {
                                    const updated = [...parsedInvoices];
                                    if (updated[pinvIdx].items) {
                                      updated[pinvIdx].items[itemIdx].category = e.target.value;
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-slate-800 border border-pink-900/40 focus:border-pink-500 rounded-md text-pink-300 font-semibold focus:outline-none placeholder-pink-900/50"
                                />
                              </div>

                              {/* Qty */}
                              <div className="w-full sm:w-[70px] space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 block">الكمية:</label>
                                <input
                                  type="text"
                                  value={item.qty}
                                  placeholder="الكمية"
                                  onChange={(e) => {
                                    const updated = [...parsedInvoices];
                                    if (updated[pinvIdx].items) {
                                      updated[pinvIdx].items[itemIdx].qty = e.target.value;
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-300 font-mono text-center focus:outline-none"
                                />
                              </div>

                              {/* Price */}
                              <div className="w-full sm:w-[90px] space-y-1">
                                <label className="text-[9px] font-bold text-slate-500 block">السعر (بضريبة):</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.price_with_tax || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updated = [...parsedInvoices];
                                    if (updated[pinvIdx].items) {
                                      updated[pinvIdx].items[itemIdx].price_with_tax = val === "" ? 0 : parseFloat(val);
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-indigo-400 font-mono text-left font-black focus:outline-none placeholder-slate-600"
                                />
                              </div>

                              {/* Delete Item button */}
                              <div className="flex items-end p-0.5 mt-2 sm:mt-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...parsedInvoices];
                                    if (updated[pinvIdx].items) {
                                      updated[pinvIdx].items.splice(itemIdx, 1);
                                      setParsedInvoices(updated);
                                    }
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                                  title="حذف هذا البند"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Modal Column Footer Action Buttons */}
                  <div className="p-4 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        // Dismiss/Discard this invoice from listing
                        setParsedInvoices(parsedInvoices.filter(p => p.tempId !== pinv.tempId));
                        setAuditInvoiceId(null);
                        onShowToast("🗑️ تم استبعاد وتجاهل الفاتورة المحددة");
                      }}
                      className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-900 text-rose-300 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash className="w-4 h-4" />
                      <span>تجاهل واستبعاد الفاتورة</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAuditInvoiceId(null)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-650 border border-slate-600 text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
                      >
                        إغلاق المعاينة الضريبية
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          // Validate and save the specific changes inside parsedInvoices, then close
                          if (!pinv.company || pinv.company.trim() === "") {
                            onShowToast("⚠️ يجب توفير اسم المورد لاعتماد المطابقة.");
                            return;
                          }
                          if (!pinv.amount || parseFloat(pinv.amount as string) <= 0) {
                            onShowToast("⚠️ يجب كتابة القيمة الإجمالية الصحيحة لتصفية الضريبة.");
                            return;
                          }
                          setAuditInvoiceId(null);
                          onShowToast("✅ تم اعتماد تفاصيل المطابقة البصرية وتعديل محتوى الفاتورة بنجاح!");
                        }}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg border border-indigo-500 text-white font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>اعتماد ومطابقة الفاتورة البصرية 👍</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* Immersive Visual Inspection & Preview Modal for Manager (Same system as Manager Audit Modal) */}
      {previewInvoice && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md transition-opacity duration-305" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl max-w-7xl w-full h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-900">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">نظام المراجعة والتدقيق والتحقق البصري للفاتورة المعلقة 🔬</h3>
                  <p className="text-[10px] text-slate-400">تحقق ومطابقة الفاتورة ومراجعة بنودها المسجلة وتعديل الأخطاء يدوياً قبل الاعتماد النهائي</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
                className="p-1.5 hover:bg-slate-750 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                title="إغلاق نافذة التدقيق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Split Screen split into 2 Columns */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
              
              {/* Right Column: Pristine High-Resolution Document Viewer (Interactive Panning/Zooming) */}
              <div className="md:w-1/2 bg-slate-950 flex flex-col border-l border-slate-800 min-h-[320px] md:min-h-0 relative group">
                
                {/* Floating Action Controls for Pristine Viewing Quality */}
                <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900/95 border border-slate-700 p-1.5 rounded-xl shadow-lg backdrop-blur-xs select-none">
                  <button
                    type="button"
                    onClick={() => setPreviewImgZoom(prev => Math.min(prev + 0.25, 4.5))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md transition-all cursor-pointer"
                    title="تكبير الصورة (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewImgZoom(prev => Math.max(prev - 0.25, 0.4))}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md transition-all cursor-pointer"
                    title="تصغير الصورة (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewImgRotation(prev => (prev + 90) % 360)}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md transition-all cursor-pointer"
                    title="تدوير الصورة 90 درجة يميناً"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImgZoom(1);
                      setPreviewImgRotation(0);
                      setPreviewImgPan({ x: 0, y: 0 });
                    }}
                    className="p-1.5 bg-indigo-905 hover:bg-indigo-800 text-indigo-200 hover:text-white rounded-md transition-all text-[10px] font-bold px-2.5 cursor-pointer"
                    title="إعادة التوطين الافتراضي للمطابقة"
                  >
                    إعادة ضبط
                  </button>
                </div>

                {/* Display Instruction Indicator */}
                <div className="absolute bottom-3 right-3 z-10 text-[9px] bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-md text-slate-400 select-none pointer-events-none">
                  💡 اسحب الصورة للتحريك، أو استخدم عجلات الماوس للتكبير والتصغير بدقة عالية.
                </div>

                {/* Document Display Canvas Stage */}
                <div 
                  className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing flex items-center justify-center select-none"
                  onMouseDown={(e) => {
                    setPreviewIsDraggingPan(true);
                    previewDragStart.current = { x: e.clientX - previewImgPan.x, y: e.clientY - previewImgPan.y };
                  }}
                  onMouseMove={(e) => {
                    if (!previewIsDraggingPan) return;
                    setPreviewImgPan({
                      x: e.clientX - previewDragStart.current.x,
                      y: e.clientY - previewDragStart.current.y
                    });
                  }}
                  onMouseUp={() => setPreviewIsDraggingPan(false)}
                  onMouseLeave={() => setPreviewIsDraggingPan(false)}
                  onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY < 0 ? 0.15 : -0.15;
                    setPreviewImgZoom(prev => Math.max(0.4, Math.min(prev + delta, 4.5)));
                  }}
                >
                  {!previewInvoice.rawImage ? (
                    <div className="text-slate-500 text-xs font-bold flex flex-col items-center gap-2">
                      <FileText className="w-8 h-8 text-slate-600 animate-bounce" />
                      <span>لم يتم إرفاق ملف ممسوح بصریاً من مدخل الفاتورة</span>
                    </div>
                  ) : previewInvoice.fileType === "application/pdf" ? (
                    <object
                      data={previewInvoice.rawImage}
                      type="application/pdf"
                      className="w-full h-full"
                      style={{
                        transform: `scale(${previewImgZoom}) rotate(${previewImgRotation}deg) translate(${previewImgPan.x}px, ${previewImgPan.y}px)`,
                        transformOrigin: "center center",
                        transition: previewIsDraggingPan ? "none" : "transform 0.1s ease-out"
                      }}
                    >
                      <embed src={previewInvoice.rawImage} type="application/pdf" />
                    </object>
                  ) : (
                    <img
                      src={previewInvoice.rawImage}
                      alt="مستند الفاتورة الأصلي عالي الجودة"
                      draggable={false}
                      className="max-h-full max-w-full object-contain shadow-2xl transition-all"
                      referrerPolicy="no-referrer"
                      style={{
                        transform: `translate(${previewImgPan.x}px, ${previewImgPan.y}px) scale(${previewImgZoom}) rotate(${previewImgRotation}deg)`,
                        transformOrigin: "center center",
                        transition: previewIsDraggingPan ? "none" : "transform 0.1s ease-out"
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Left Column: Form Editor & Purchases Details */}
              <div className="md:w-1/2 flex flex-col bg-slate-900 min-w-0">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  
                  {/* Top Clerk Banner */}
                  <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between text-xs text-slate-300">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-400 block">مسؤول الإدخال الأول:</span>
                      <span className="font-extrabold text-slate-100">👤 {previewInvoice.createdBy || "غير معروف"}</span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] uppercase font-bold text-indigo-400 block">فرع التسجيل:</span>
                      <span className="font-extrabold text-slate-100">📍 {previewInvoice.branch}</span>
                    </div>
                  </div>

                  {/* Invoice Meta Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Supplier/Company Custom Searchable Input */}
                    <div className="space-y-1 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                      <label className="block text-[10px] font-bold text-slate-400">اسم المورد / المؤسسة بالفاتورة:</label>
                      <SearchableCompanyInput
                        value={previewInvoice.company}
                        onChange={(val) => {
                          setPreviewInvoice({ ...previewInvoice, company: val });
                        }}
                        registeredCompanies={registeredCompanies}
                        onRegisterCompany={(name) => handleAddSupplier(name)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-700 bg-slate-800 hover:border-slate-600 focus:border-indigo-500 rounded-md focus:outline-none font-bold text-slate-100"
                      />
                    </div>

                    {/* Invoice Date */}
                    <div className="space-y-1 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                      <label className="block text-[10px] font-bold text-slate-400">تاريخ الفاتورة المكتوب:</label>
                      <input
                        type="date"
                        value={previewInvoice.invoice_date || previewInvoice.date}
                        onChange={(e) => {
                          setPreviewInvoice({ ...previewInvoice, invoice_date: e.target.value });
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-slate-700 bg-slate-800 rounded-md focus:outline-none focus:border-indigo-500 font-bold text-slate-100"
                      />
                    </div>

                    {/* Invoice Serial Number */}
                    <div className="space-y-1 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                      <label className="block text-[10px] font-bold text-slate-400">رقم الفاتورة الأصيل (SERIAL):</label>
                      <input
                        type="text"
                        value={previewInvoice.invoice_no || ""}
                        onChange={(e) => {
                          setPreviewInvoice({ ...previewInvoice, invoice_no: e.target.value });
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-slate-700 bg-slate-800 rounded-md focus:outline-none focus:border-indigo-500 font-bold text-slate-100"
                        placeholder="Inv-XXXXXXXX"
                      />
                    </div>

                    {/* Total Gross Amount */}
                    <div className="space-y-1 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                      <label className="block text-[10px] font-bold text-indigo-400">المبلغ الإجمالي شامل الضريبة:</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={previewAmountStr}
                        onChange={(e) => {
                          const valStr = e.target.value;
                          setPreviewAmountStr(valStr);
                          const parsed = parseFloat(valStr);
                          setPreviewInvoice({
                            ...previewInvoice,
                            amount: isNaN(parsed) ? 0 : parsed
                          });
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-indigo-900/50 bg-indigo-950/40 text-indigo-300 rounded-md focus:outline-none focus:border-indigo-500 font-black"
                      />
                    </div>
                  </div>

                  {/* Similarity Warning inside Modal if found */}
                  {(() => {
                    const simResult = checkSimilarity(previewInvoice.company, allCompanies);
                    const showWarning = simResult.matches && !ignoredSimilarities[`preview-mod-${previewInvoice.id}-${simResult.similarName}`];
                    if (showWarning) {
                      return (
                        <div className="p-3 bg-amber-950/45 border border-amber-800/60 rounded-xl text-xs text-amber-200 space-y-2 animate-fadeIn select-none">
                          <div className="font-extrabold flex items-center gap-1.5 text-amber-300">
                            <span>⚠️ مطابقة تلقائية لقرب الاسم:</span>
                            <span>هل تقصد المؤسسة المسجلة بالنظام؟</span>
                          </div>
                          <p className="text-[11px] text-amber-400">
                            الاسم المكتوب قريب من: <span className="font-black text-white underline">{simResult.similarName}</span>
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewInvoice({ ...previewInvoice, company: simResult.similarName });
                              }}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-md text-[10px] cursor-pointer"
                            >
                              ✅ مطابقة وتوحيد كـ ({simResult.similarName})
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIgnoredSimilarities(prev => ({ ...prev, [`preview-mod-${previewInvoice.id}-${simResult.similarName}`]: true }));
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-md text-[10px] cursor-pointer"
                            >
                              ❌ إبقاء الاسم الحالي
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Tabular List of Extracted Purchase Items */}
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-300 flex items-center gap-1">
                        <Library className="w-4 h-4 text-indigo-400" />
                        <span>تفاصيل مصفوفة السلع والمشتريات المستخرجة ({previewInvoice.items?.length || 0})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedItems = [...(previewInvoice.items || [])];
                          updatedItems.push({
                            name: "",
                            qty: "1 حبة",
                            price_with_tax: 0,
                            category: ""
                          });
                          setPreviewInvoice({ ...previewInvoice, items: updatedItems });
                        }}
                        className="px-2.5 py-1 text-[10px] font-black text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 border border-indigo-900 rounded-md flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة مادة جديدة +</span>
                      </button>
                    </div>

                    {/* Items Matrix */}
                    {(!previewInvoice.items || previewInvoice.items.length === 0) ? (
                      <div className="p-4 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                        لا توجد بنود وسلع مسجلة لهذه الفاتورة حتى الآن. يمكنك إضافتها يدوياً للتحقق والمطابقة.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                        {previewInvoice.items.map((item, itemIdx) => (
                          <div 
                            key={itemIdx}
                            className="flex flex-col sm:flex-row items-stretch gap-2 bg-slate-800/30 p-2.5 rounded-xl border border-slate-800 hover:border-slate-750 transition-all text-xs"
                          >
                            {/* Item Description Name */}
                            <div className="flex-1 space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 block">اسم المادة / السلعة:</label>
                              <input
                                type="text"
                                value={item.name || (item as any).product_name || ""}
                                placeholder="مثل: خضار، لحوم، غاز..."
                                onChange={(e) => {
                                  const updatedItems = [...(previewInvoice.items || [])];
                                  updatedItems[itemIdx] = { ...updatedItems[itemIdx], name: e.target.value };
                                  setPreviewInvoice({ ...previewInvoice, items: updatedItems });
                                }}
                                className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-100 font-extrabold placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            {/* Item Category */}
                            <div className="w-full sm:w-[120px] space-y-1">
                              <label className="text-[9px] font-bold text-pink-400 block">تصنيف السلعة للفرع:</label>
                              <input
                                type="text"
                                value={item.category || ""}
                                placeholder="تصنيف المادة"
                                onChange={(e) => {
                                  const updatedItems = [...(previewInvoice.items || [])];
                                  updatedItems[itemIdx] = { ...updatedItems[itemIdx], category: e.target.value };
                                  setPreviewInvoice({ ...previewInvoice, items: updatedItems });
                                }}
                                className="w-full px-2 py-1 bg-slate-800 border border-pink-900/40 focus:border-pink-500 rounded-md text-pink-300 font-semibold focus:outline-none placeholder-pink-900/50"
                              />
                            </div>

                            {/* Qty */}
                            <div className="w-full sm:w-[70px] space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 block">الكمية:</label>
                              <input
                                type="text"
                                value={item.qty}
                                placeholder="الكمية"
                                onChange={(e) => {
                                  const updatedItems = [...(previewInvoice.items || [])];
                                  updatedItems[itemIdx] = { ...updatedItems[itemIdx], qty: e.target.value };
                                  setPreviewInvoice({ ...previewInvoice, items: updatedItems });
                                }}
                                className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-slate-300 font-mono text-center focus:outline-none"
                              />
                            </div>

                            {/* Price */}
                            <div className="w-full sm:w-[90px] space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 block">السعر (بضريبة):</label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.price_with_tax || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const updatedItems = [...(previewInvoice.items || [])];
                                  updatedItems[itemIdx] = { ...updatedItems[itemIdx], price_with_tax: val === "" ? 0 : parseFloat(val) };
                                  setPreviewInvoice({ ...previewInvoice, items: updatedItems });
                                }}
                                className="w-full px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-indigo-400 font-mono text-left font-black focus:outline-none placeholder-slate-600"
                              />
                            </div>

                            {/* Delete Item button */}
                            <div className="flex items-end p-0.5 mt-2 sm:mt-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedItems = (previewInvoice.items || []).filter((_, i) => i !== itemIdx);
                                  setPreviewInvoice({ ...previewInvoice, items: updatedItems });
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-all cursor-pointer"
                                title="حذف هذا البند"
                              >
                                <Trash className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Column Footer Action Buttons */}
                <div className="p-4 bg-slate-800 border-t border-slate-700 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleRejectPendingInvoice(previewInvoice.id, previewInvoice.company)}
                    className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900 border border-rose-900 text-rose-300 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash className="w-4 h-4" />
                    <span>رفض وحذف الفاتورة المعلقة</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewInvoice(null)}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-650 border border-slate-600 text-slate-200 font-bold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      إغلاق المعاينة
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!previewInvoice.company || previewInvoice.company.trim() === "") {
                          onShowToast("⚠️ يجب توفير اسم المورد لاعتماد المطابقة.");
                          return;
                        }
                        if (!previewInvoice.amount || parseFloat(previewInvoice.amount.toString()) <= 0) {
                          onShowToast("⚠️ يجب كتابة القيمة الإجمالية الصحيحة لتصفية الضريبة.");
                          return;
                        }
                        handleApprovePendingInvoice(previewInvoice);
                      }}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg border border-emerald-500 text-white font-black rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>اعتماد ومطابقة الفاتورة البصرية 👍</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
