import React, { useState, useEffect } from "react";
import { 
  Users, UserCheck, Clock, Coins, FileText, Plus, Trash2, 
  Settings as SettingsIcon, AlertCircle, Calendar, Timer, CircleDollarSign, RefreshCw, Eye, Printer, FileEdit
} from "lucide-react";
import { Employee, EmployeeAdvance, EmployeeAttendance, EmployeeDeductionConfig, EmployeeViolation } from "../types";

interface EmployeesTabProps {
  onShowToast: (msg: string) => void;
  userRole: string;
}

type SubTabType = "directory" | "attendance" | "advances" | "violations" | "inquiry" | "rules";

export default function EmployeesTab({ onShowToast, userRole }: EmployeesTabProps) {
  const [subTab, setSubTab] = useState<SubTabType>("directory");
  
  // Data States
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [advances, setAdvances] = useState<EmployeeAdvance[]>([]);
  const [attendance, setAttendance] = useState<EmployeeAttendance[]>([]);
  const [violations, setViolations] = useState<EmployeeViolation[]>([]);
  const [systemSettings, setSystemSettings] = useState<any>(null);
  const [deductionConfig, setDeductionConfig] = useState<EmployeeDeductionConfig>({
    id: "global-rules",
    simpleThresholdMinutes: 15,
    mediumThresholdMinutes: 30,
    largeThresholdMinutes: 60,
    simpleMaxWarnings: 3,
    simpleDeductionHours: 1,
    mediumDeductionHours: 3,
    largeDeductionDayFraction: 0.5,
    severeDeductionDayFraction: 1.0
  });
  const [loading, setLoading] = useState(false);

  // Printed report structure
  const [printEmployeeData, setPrintEmployeeData] = useState<any | null>(null);

  // Forms States - Employee
  const [empName, setEmpName] = useState("");
  const [empJob, setEmpJob] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empSalary, setEmpSalary] = useState<number>(3000);
  const [empLimit, setEmpLimit] = useState<number>(25);
  const [empArrival, setEmpArrival] = useState("08:00");
  const [empDeparture, setEmpDeparture] = useState("16:00");

  // Forms States - Attendance
  const [attDate, setAttDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [attEmployeeId, setAttEmployeeId] = useState("");
  const [attArrival, setAttArrival] = useState("08:00");
  const [attDeparture, setAttDeparture] = useState("16:00");
  const [attNotes, setAttNotes] = useState("");
  const [attHasExcuse, setAttHasExcuse] = useState(false);

  // Forms States - Advances
  const [advDate, setAdvDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [advEmployeeId, setAdvEmployeeId] = useState("");
  const [advAmount, setAdvAmount] = useState<number>(100);
  const [advNotes, setAdvNotes] = useState("");

  // Forms States - Violations
  const [violDate, setViolDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [violEmployeeId, setViolEmployeeId] = useState("");
  const [violDescription, setViolDescription] = useState("");
  const [violType, setViolType] = useState<"warning" | "deduction">("warning");
  const [violDeductionAmount, setViolDeductionAmount] = useState<number>(0);
  const [violWarningMode, setViolWarningMode] = useState<"new" | "second">("new");
  const [violPrevId, setViolPrevId] = useState<string>("");

  // Expanded rows state in the Enquiry Tab
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Inquiry States
  const [inqStart, setInqStart] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().substring(0, 10);
  });
  const [inqEnd, setInqEnd] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().substring(0, 10);
  });
  const [inqEmployeeId, setInqEmployeeId] = useState("all");

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [empRes, advRes, attRes, configRes, violRes, settingsRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/employee-advances"),
        fetch("/api/employee-attendance"),
        fetch("/api/employee-deduction-config"),
        fetch("/api/employee-violations"),
        fetch("/api/settings")
      ]);

      if (empRes.ok) setEmployees(await empRes.json());
      if (advRes.ok) setAdvances(await advRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
      if (configRes.ok) setDeductionConfig(await configRes.json());
      if (violRes.ok) setViolations(await violRes.json());
      if (settingsRes.ok) setSystemSettings(await settingsRes.json());
    } catch (err) {
      console.error(err);
      onShowToast("❌ فشل تحميل بيانات الموظفين والمالية من الخادم");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Helper: Convert time "HH:MM" to minutes from start of day
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Helper: Format minutes to standard HH:MM
  const formatMinutesToTime = (totalMinutes: number): string => {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  // Create Employee
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empJob.trim() || empSalary <= 0) {
      onShowToast("⚠️ يرجى إدخال كافة البيانات الأساسية بشكل صحيح");
      return;
    }

    const newEmp: Partial<Employee> = {
      name: empName.trim(),
      job: empJob.trim(),
      salary: Number(empSalary),
      advanceLimitPercent: Number(empLimit),
      requiredArrivalTime: empArrival,
      requiredDepartureTime: empDeparture,
      phone: empPhone.trim()
    };

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEmp)
      });
      if (res.ok) {
        onShowToast(`✅ تم إضافة الموظف "${empName}" بنجاح وتعيين خطة الدوام`);
        setEmpName("");
        setEmpJob("");
        setEmpPhone("");
        setEmpSalary(3000);
        setEmpLimit(25);
        setEmpArrival("08:00");
        setEmpDeparture("16:00");
        loadAllData();
      } else {
        const err = await res.json();
        onShowToast(`❌ فشل الحفظ: ${err.error || "خطأ مجهول"}`);
      }
    } catch (err) {
      onShowToast("❌ خطأ شبكة أثناء حفظ الموظف");
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف الموظف "${name}" نهائياً من الكشوفات والدوام؟`)) {
      return;
    }
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      if (res.ok) {
        onShowToast(`🗑️ تم حذف الموظف "${name}" بنجاح`);
        loadAllData();
      } else {
        onShowToast("❌ فشل الحذف من الخادم");
      }
    } catch (err) {
      onShowToast("❌ خطأ بالشبكة أثناء الحذف");
    }
  };

  // Calculate Lateness Category and Deductions in Client before sending
  const evaluateLateness = (
    emp: Employee,
    pickDate: string,
    actualArr: string,
    actualDep: string
  ) => {
    const reqArrMin = timeToMinutes(emp.requiredArrivalTime);
    const actArrMin = timeToMinutes(actualArr);

    let latenessMinutes = actArrMin - reqArrMin;
    if (latenessMinutes < 0) {
      latenessMinutes = 0;
    }

    // Shift duration in hours
    let rArr = timeToMinutes(emp.requiredArrivalTime);
    let rDep = timeToMinutes(emp.requiredDepartureTime);
    let shiftMinutes = rDep - rArr;
    if (shiftMinutes < 0) {
      shiftMinutes += 1440; // crossed midnight
    }
    let shiftHours = shiftMinutes / 60;
    if (shiftHours <= 0) shiftHours = 8; // standard fallback

    const dailySalary = emp.salary / 30;
    const hourValue = dailySalary / shiftHours;

    let latenessCategory: "none" | "simple" | "medium" | "large" | "severe" = "none";
    let deductionAmount = 0;
    let oralWarning = false;

    // Filter current month logs for warning count
    const logDateObj = new Date(pickDate);
    const logMonth = logDateObj.getMonth();
    const logYear = logDateObj.getFullYear();

    const monthSimpleLogs = attendance.filter(log => {
      if (log.employeeId !== emp.id) return false;
      const d = new Date(log.date);
      return d.getMonth() === logMonth && d.getFullYear() === logYear && log.latenessCategory === "simple";
    });

    const {
      simpleThresholdMinutes = 15,
      mediumThresholdMinutes = 30,
      largeThresholdMinutes = 60,
      simpleMaxWarnings = 3,
      simpleDeductionHours = 1,
      mediumDeductionHours = 3,
      largeDeductionDayFraction = 0.5,
      severeDeductionDayFraction = 1.0
    } = deductionConfig || {};

    if (latenessMinutes === 0) {
      latenessCategory = "none";
      deductionAmount = 0;
    } else if (latenessMinutes < simpleThresholdMinutes) {
      // Simple lateness (< simpleThresholdMinutes)
      latenessCategory = "simple";
      // First X times per month is oral warning
      if (monthSimpleLogs.length < simpleMaxWarnings) {
        oralWarning = true;
        deductionAmount = 0;
      } else {
        oralWarning = false;
        deductionAmount = hourValue * simpleDeductionHours; // value of X hours
      }
    } else if (latenessMinutes >= simpleThresholdMinutes && latenessMinutes <= mediumThresholdMinutes) {
      // Medium lateness
      latenessCategory = "medium";
      deductionAmount = hourValue * mediumDeductionHours; // value of X hours directly
    } else if (latenessMinutes > mediumThresholdMinutes && latenessMinutes <= largeThresholdMinutes) {
      // Large lateness
      latenessCategory = "large";
      deductionAmount = dailySalary * largeDeductionDayFraction; // custom day fraction pay
    } else {
      // Severe lateness (greater than largeThresholdMinutes)
      latenessCategory = "severe";
      deductionAmount = dailySalary * severeDeductionDayFraction; // custom day fraction pay
    }

    return {
      latenessMinutes,
      latenessCategory,
      deductionAmount: Math.round(deductionAmount * 100) / 100, // round to 2 decimals
      oralWarning
    };
  };

  // Save Attendance Entry
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(x => x.id === attEmployeeId);
    if (!emp) {
      onShowToast("⚠️ الرجاء اختيار موظف صالح لتسجيل الحضور");
      return;
    }

    const { latenessMinutes, latenessCategory, deductionAmount, oralWarning } = evaluateLateness(
      emp,
      attDate,
      attArrival,
      attDeparture
    );

    const log: Partial<EmployeeAttendance> = {
      employeeId: emp.id,
      employeeName: emp.name,
      date: attDate,
      arrivalTime: attArrival,
      departureTime: attDeparture,
      latenessMinutes,
      latenessCategory,
      deductionAmount: attHasExcuse ? 0 : deductionAmount,
      oralWarning: attHasExcuse ? false : oralWarning,
      notes: attNotes.trim(),
      hasExcuse: attHasExcuse
    };

    try {
      const res = await fetch("/api/employee-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log)
      });
      if (res.ok) {
        let outcomeMsg = ` تم تسجيل حضور الموظف ${emp.name}. `;
        if (latenessMinutes > 0) {
          if (attHasExcuse) {
            outcomeMsg += `تأخير (${latenessMinutes} د) ولكن بعذر مقبول معفى من الحسم 🌿`;
          } else if (oralWarning) {
            outcomeMsg += `تأخير بسيط (${latenessMinutes} د): إنذار شفهي (عدد الإنذارات هذا الشهر: ${
              attendance.filter(x => x.employeeId === emp.id && x.latenessCategory === "simple").length + 1
            })`;
          } else {
            outcomeMsg += `تأخير (${latenessMinutes} د): خصم ${deductionAmount.toFixed(1)} ريال`;
          }
        } else {
          outcomeMsg += "الحضور بالوقت المطلوب تماماً (ملتزم) ✨";
        }
        onShowToast(`✅ ${outcomeMsg}`);
        setAttNotes("");
        setAttHasExcuse(false);
        loadAllData();
      } else {
        const err = await res.json();
        onShowToast(`❌ فشل الحفظ: ${err.error}`);
      }
    } catch (err) {
      onShowToast("❌ خطأ شبكة أثناء حفظ كشف الحضور");
    }
  };

  // Delete Attendance Entry
  const handleDeleteAttendance = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف كشف الحضور المعني تلقائياً؟")) return;
    try {
      const res = await fetch(`/api/employee-attendance/${id}`, { method: "DELETE" });
      if (res.ok) {
        onShowToast("🗑️ تم حذف كشف الحضور وإعادة موازنة المالية");
        loadAllData();
      }
    } catch (err) {
      onShowToast("❌ خطأ بالشبكة أثناء حذف كشف الحضور");
    }
  };

  // Save Loan / Advance
  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(x => x.id === advEmployeeId);
    if (!emp) {
      onShowToast("⚠️ الرجاء اختيار موظف صالح لتجنيب السلف");
      return;
    }

    if (advAmount <= 0) {
      onShowToast("⚠️ مبلغ السلفة غير منطقي");
      return;
    }

    // Check system-wide limit first
    const globalLimitPercent = systemSettings?.سقف_نسبة_السلفة_القصوى ?? 50;
    const requestedPercentOfSalary = (advAmount / emp.salary) * 100;
    if (requestedPercentOfSalary > globalLimitPercent) {
      onShowToast(
        `❌ تم رفض الطلب: لقد تم الوصول للنسبة القصوى لإدخال السلف المسجلة في الإعدادات وهي ${globalLimitPercent}% من الراتب (طلبك الحالي يمثل ${requestedPercentOfSalary.toFixed(1)}%). يجب تعديل الإعدادات أولاً!`
      );
      return;
    }

    // Calculate employee-specific maximum allowed borrow percentage
    const maxBorrowAmount = (emp.salary * emp.advanceLimitPercent) / 100;
    if (advAmount > maxBorrowAmount) {
      onShowToast(
        `⚠️ تجاوز السقف الخاص بالموظف: الحد الأقصى المسموح له هو ${emp.advanceLimitPercent}% من الراتب (${maxBorrowAmount.toFixed(
          2
        )} ريال)، والطلب الحالي هو: ${advAmount} ريال`
      );
      return;
    }

    const newAdv: Partial<EmployeeAdvance> = {
      employeeId: emp.id,
      employeeName: emp.name,
      date: advDate,
      amount: Number(advAmount),
      notes: advNotes.trim()
    };

    try {
      const res = await fetch("/api/employee-advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdv)
      });
      if (res.ok) {
        onShowToast(`💵 تم منح سلفة ومبلة بمقدار ${advAmount} ريال للموظف "${emp.name}" وجاري خصمها تلقائياً`);
        setAdvNotes("");
        setAdvAmount(100);
        loadAllData();
      } else {
        const err = await res.json();
        onShowToast(`❌ فشل الحفظ: ${err.error}`);
      }
    } catch (err) {
      onShowToast("❌ خطأ شبكة أثناء تسجيل السلفة");
    }
  };

  // Delete Advance
  const handleDeleteAdvance = async (id: string, name: string, amt: number) => {
    if (!window.confirm(`هل تريد إلغاء أو سداد سلفة الموظف "${name}" بقيمة ${amt} ريال؟`)) return;
    try {
      const res = await fetch(`/api/employee-advances/${id}`, { method: "DELETE" });
      if (res.ok) {
        onShowToast("🗑️ تم إلغاء السلفة وتحديث الميزان المالي المستحق للموظف");
        loadAllData();
      }
    } catch (err) {
      onShowToast("❌ خطأ بالشبكة أثناء إلغاء السلفة");
    }
  };

  // Save Disciplinary Violation
  const handleSaveViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(x => x.id === violEmployeeId);
    if (!emp) {
      onShowToast("⚠️ الرجاء اختيار موظف صالح لتسجيل الكشف");
      return;
    }

    if (!violDescription.trim()) {
      onShowToast("⚠️ الرجاء إدخال وصف المخالفة");
      return;
    }

    let finalDesc = violDescription.trim();
    if (violType === "warning" && violWarningMode === "second") {
      if (!finalDesc.startsWith("تنبيه ثاني:")) {
        finalDesc = `تنبيه ثاني: ${finalDesc}`;
      }
    }

    const newViol = {
      employeeId: emp.id,
      employeeName: emp.name,
      date: violDate,
      description: finalDesc,
      type: violType,
      deductionAmount: violType === "deduction" ? Number(violDeductionAmount) : 0,
      isSecondWarning: violType === "warning" && violWarningMode === "second" ? true : undefined,
      referredViolationId: violType === "warning" && violWarningMode === "second" ? (violPrevId || undefined) : undefined
    };

    try {
      const res = await fetch("/api/employee-violations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newViol)
      });
      if (res.ok) {
        onShowToast(`✅ تم تسجيل المخالفة للموظف "${emp.name}" بنجاح وتثبيتها بالمسير`);
        setViolDescription("");
        setViolDeductionAmount(0);
        setViolWarningMode("new");
        setViolPrevId("");
        loadAllData();
      } else {
        const err = await res.json();
        onShowToast(`❌ فشل حفظ المخالفة: ${err.error}`);
      }
    } catch (err) {
      onShowToast("❌ خطأ بالشبكة أثناء تسجيل المخالفة");
    }
  };

  // Delete Disciplinary Violation
  const handleDeleteViolation = async (id: string, name: string) => {
    if (!window.confirm(`هل تريد حذف هذه المخالفة المسجلة بحق الموظف "${name}"؟`)) return;
    try {
      const res = await fetch(`/api/employee-violations/${id}`, { method: "DELETE" });
      if (res.ok) {
        onShowToast("🗑️ تم حذف سجل المخالفة بنجاح وتحديث مسيرات الموظف");
        loadAllData();
      }
    } catch (err) {
      onShowToast("❌ خطأ بالشبكة أثناء حذف المخالفة");
    }
  };

  // Inquiry calculations for reporting window
  const getInquiryReport = () => {
    const reportList = employees.filter(emp => inqEmployeeId === "all" || emp.id === inqEmployeeId);
    
    return reportList.map(emp => {
      // Filter attendance in period
      const empAtt = attendance.filter(
        x => x.employeeId === emp.id && x.date >= inqStart && x.date <= inqEnd
      );
      // Filter advances in period
      const empAdv = advances.filter(
        x => x.employeeId === emp.id && x.date >= inqStart && x.date <= inqEnd
      );
      // Filter violations in period
      const empViolations = violations.filter(
        x => x.employeeId === emp.id && x.date >= inqStart && x.date <= inqEnd
      );

      const totalLatenessMins = empAtt.reduce((sum, item) => sum + item.latenessMinutes, 0);
      const latenessDeductions = empAtt.reduce((sum, item) => sum + (item.hasExcuse ? 0 : item.deductionAmount), 0);
      const totalViolationsDeductions = empViolations.reduce((sum, item) => sum + (item.type === "deduction" ? item.deductionAmount : 0), 0);
      
      const totalDeductions = latenessDeductions + totalViolationsDeductions;
      const totalAdvancesAmt = empAdv.reduce((sum, item) => sum + item.amount, 0);

      // Break down categories of lateness
      const simpleCount = empAtt.filter(x => x.latenessCategory === "simple").length;
      const mediumCount = empAtt.filter(x => x.latenessCategory === "medium").length;
      const largeCount = empAtt.filter(x => x.latenessCategory === "large").length;
      const severeCount = empAtt.filter(x => x.latenessCategory === "severe").length;

      const netPayable = emp.salary - totalDeductions - totalAdvancesAmt;

      return {
        ...emp,
        daysAttended: empAtt.length,
        totalLatenessMins,
        latenessDeductions,
        totalViolationsDeductions,
        totalDeductions,
        totalAdvancesAmt,
        brokenDownLateness: { simpleCount, mediumCount, largeCount, severeCount },
        netPayable,
        violationsList: empViolations
      };
    });
  };

  const reportData = getInquiryReport();

  if (userRole !== "مدير") {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 mt-6 space-y-4 max-w-lg mx-auto" dir="rtl">
        <div className="bg-rose-50 text-rose-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-900">عذراً، صلاحيات غير كافية</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          جميع ما يتعلق بالموظفين وشؤونهم الإدارية والمالية والرواتب والجزاءات يقع تحت الصلاحية الحصرية والكاملة لـ **المدير العام للنظام** فقط.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Top Banner & Header */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 rounded-lg p-2">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">👤 وحدة إدارة شؤون الموظفين الذكية</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium">المدير العام: إدارة الحضور، مدد التأخير التراكمية، الخصميات، وسلف الرواتب المعتمدة بقوة الحوكمة الذاتية.</p>
        </div>
        <button
          onClick={loadAllData}
          disabled={loading}
          className="text-indigo-400 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>تحديث البيانات المحاسبية</span>
        </button>
      </div>

      {/* Internal Tab Links */}
      <div className="bg-white p-1 rounded-xl shadow-xs border border-slate-100 flex flex-wrap gap-1">
        <button
          onClick={() => setSubTab("directory")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === "directory" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>دليل الموظفين والرواتب</span>
        </button>
        <button
          onClick={() => setSubTab("attendance")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === "attendance" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Timer className="w-4 h-4" />
          <span>حساب الحضور اليومي والـتأخير</span>
        </button>
        <button
          onClick={() => setSubTab("advances")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === "advances" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <CircleDollarSign className="w-4 h-4" />
          <span>إدارة السُلفيات والاقتراض</span>
        </button>
        <button
          onClick={() => setSubTab("violations")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === "violations" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span>منظومة الجزاءات والمخالفات</span>
        </button>
        <button
          onClick={() => setSubTab("inquiry")}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            subTab === "inquiry" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>نظام الاستعلامات الذكي والرواتب</span>
        </button>
        {userRole === "مدير" && (
          <button
            onClick={() => setSubTab("rules")}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "rules" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SettingsIcon className="w-4 h-4 text-indigo-500" />
            <span>تعديل آليات الخصم والاستيفاء</span>
          </button>
        )}
      </div>

      {/* SUB-VIEWS ORCHESTRATION */}
      <div>
        
        {/* TAB 1: DIRECTORY */}
        {subTab === "directory" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form card */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 space-y-4 h-fit">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>إضافة موظف جديد وتعيين المناوبات</span>
                </h3>
              </div>
              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">اسم الموظف الثلاثي</label>
                  <input
                    type="text"
                    required
                    placeholder="مروان أحمد العتيبي"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">المهنة / المسمى الوظيفي</label>
                  <input
                    type="text"
                    required
                    placeholder="شيف مشويات، كاشير، خدمة فروع"
                    value={empJob}
                    onChange={(e) => setEmpJob(e.target.value)}
                    className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">رقم الهاتف (الواتساب)</label>
                  <input
                    type="text"
                    placeholder="مثل 05xxxxxxxx أو 9665xxxxxxxx"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">الراتب الشهري (ر.س)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={empSalary}
                      onChange={(e) => setEmpSalary(Number(e.target.value) || 0)}
                      className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">حد السلفة الأقصى (%)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={empLimit}
                      onChange={(e) => setEmpLimit(Number(e.target.value) || 25)}
                      className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
                  <h4 className="text-[11px] font-bold text-slate-700">🕒 أوقات الحضور المطلوبة والانصراف (الدوام)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-500 font-bold">موعد الحضور</span>
                      <input
                        type="time"
                        required
                        value={empArrival}
                        onChange={(e) => setEmpArrival(e.target.value)}
                        className="w-full text-center py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-500 font-bold">موعد الانصراف</span>
                      <input
                        type="time"
                        required
                        value={empDeparture}
                        onChange={(e) => setEmpDeparture(e.target.value)}
                        className="w-full text-center py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>دفق وتأكيد إضافة الموظف</span>
                </button>
              </form>
            </div>

            {/* List and directories card */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 lg:col-span-2 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">📋 دليل الملاك الحالي والسقوف المالية الفعالة</h3>
                <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full font-bold text-slate-700">
                  {employees.length} موظفين مسجلين
                </span>
              </div>

              {employees.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  لم يتم إضافة موظفين في النظام بعد. الرجاء تعبئة النموذج اليمين.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-2">الاسم</th>
                        <th className="py-3 px-2">المهنة</th>
                        <th className="py-3 px-2 text-center">الراتب الأساسي</th>
                        <th className="py-3 px-2 text-center">أوقات الدوام المطلوبة</th>
                        <th className="py-3 px-2 text-center">حد سلفة (%)</th>
                        <th className="py-3 px-2 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {employees.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50 font-medium">
                          <td className="py-3.5 px-2 text-slate-900 font-bold">
                            <div>{emp.name}</div>
                            {emp.phone && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5" dir="ltr">📞 {emp.phone}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-2 text-slate-600">{emp.job}</td>
                          <td className="py-3.5 px-2 text-center font-mono text-slate-800 text-xs font-bold">
                            {emp.salary.toLocaleString("ar-SA")} ر.س
                          </td>
                          <td className="py-3.5 px-2 text-center text-indigo-700 font-mono">
                            {emp.requiredArrivalTime} إلى {emp.requiredDepartureTime}
                          </td>
                          <td className="py-3.5 px-2 text-center font-bold text-emerald-800 font-mono">
                            {emp.advanceLimitPercent || 25}%
                          </td>
                          <td className="py-3.5 px-2 text-center">
                            <button
                              onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                              className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg cursor-pointer transition-all inline-flex"
                              title="حذف البيانات بالكامل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ATTENDANCE */}
        {subTab === "attendance" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left entry inputs */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 space-y-4 h-fit">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>تسجيل الحضور والانصراف اليومي</span>
                </h3>
              </div>
              
              {employees.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>لا يمكنك تحضير الدوام حتى تقوم أولاً بإضافة الموظفين بالدليل!</span>
                </div>
              ) : (
                <form onSubmit={handleSaveAttendance} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">تاريخ اليومية</label>
                    <input
                      type="date"
                      required
                      value={attDate}
                      onChange={(e) => setAttDate(e.target.value)}
                      className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">الموظف المعني</label>
                    <select
                      required
                      value={attEmployeeId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAttEmployeeId(val);
                        const selectedEmp = employees.find(x => x.id === val);
                        if (selectedEmp) {
                          setAttArrival(selectedEmp.requiredArrivalTime);
                          setAttDeparture(selectedEmp.requiredDepartureTime);
                        }
                      }}
                      className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="">-- اختر موظف من القائمة --</option>
                      {employees.map(x => (
                        <option key={x.id} value={x.id}>
                          {x.name} ({x.job})
                        </option>
                      ))}
                    </select>
                  </div>

                  {attEmployeeId && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-600 font-semibold">
                      <div className="flex justify-between">
                        <span>الدوام المطلوب حسب الدليل:</span>
                        <span className="text-indigo-600 font-mono">
                          {employees.find(x => x.id === attEmployeeId)?.requiredArrivalTime} إلى {employees.find(x => x.id === attEmployeeId)?.requiredDepartureTime}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-500 font-bold">وقت الحضور الفعلي</span>
                      <input
                        type="time"
                        required
                        value={attArrival}
                        onChange={(e) => setAttArrival(e.target.value)}
                        className="w-full text-center py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-500 font-bold">وقت الانصراف الفعلي</span>
                      <input
                        type="time"
                        required
                        value={attDeparture}
                        onChange={(e) => setAttDeparture(e.target.value)}
                        className="w-full text-center py-1.5 text-xs border border-slate-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">ملاحظات / عذر الغياب الكلي</label>
                    <input
                      type="text"
                      placeholder="أدخل أي ملاحظات يدوية مخصصة هنا..."
                      value={attNotes}
                      onChange={(e) => setAttNotes(e.target.value)}
                      className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  {/* Lateness or Absence Excuse Checkbox Toggle */}
                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-dashed border-indigo-200">
                    <input
                      type="checkbox"
                      id="attHasExcuse"
                      checked={attHasExcuse}
                      onChange={(e) => setAttHasExcuse(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="attHasExcuse" className="text-[11px] font-bold text-indigo-900 select-none cursor-pointer">
                      التأخير أو الغياب بعذر رسمي مقبول (معفي من الخصم المالي)
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تأكيد وتسجيل الحضور لليوم المعين</span>
                  </button>
                </form>
              )}
            </div>

            {/* Attendance logs list */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 lg:col-span-2 space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">📅 آخر عمليات تسجيل حضور الدوام بالمنظومة</h3>
              </div>

              {attendance.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  لم يتم تسجيل حضور أي موظف حتى الآن. سجل الحيازة فارغ.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-2">التاريخ</th>
                        <th className="py-3 px-2">الموظف</th>
                        <th className="py-3 px-2 text-center">الحضور الفعلي</th>
                        <th className="py-3 px-2 text-center">دقائق التأخير</th>
                        <th className="py-3 px-2 text-center">درجة التأخير والخصم</th>
                        <th className="py-3 px-2 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {[...attendance]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .slice(0, 15)
                        .map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50 font-medium">
                            <td className="py-3.5 px-2 font-mono text-slate-600">{log.date}</td>
                            <td className="py-3.5 px-2 text-slate-900 font-bold">{log.employeeName}</td>
                            <td className="py-3.5 px-2 text-center font-mono">
                              {log.arrivalTime} - {log.departureTime}
                            </td>
                            <td className="py-3.5 px-2 text-center font-bold font-mono">
                              {log.latenessMinutes > 0 ? (
                                <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                                  {log.latenessMinutes} دقيقة
                                </span>
                              ) : (
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  لا يوجد
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-center font-bold">
                              {log.latenessMinutes === 0 ? (
                                <span className="text-slate-500 font-bold">أتى في وقته</span>
                              ) : log.oralWarning ? (
                                <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  🗣️ إنذار شفهي مبرر
                                </span>
                              ) : (
                                <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md font-mono">
                                  خصم {log.deductionAmount} ر.س ({
                                    log.latenessCategory === "simple" ? "بسيط" :
                                    log.latenessCategory === "medium" ? "متوسط" :
                                    log.latenessCategory === "large" ? "كبير" : "شديد"
                                  })
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-center">
                              <button
                                onClick={() => handleDeleteAttendance(log.id)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded-lg cursor-pointer transition-all inline-flex bg-slate-50 hover:bg-rose-50"
                                title="إلغاء التسجيل"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="pt-2 text-[10px] text-slate-400 font-medium">الجدول يستعرض آخر 15 عملية حضور للمراجعة العامة في المنظومة.</div>
                </div>
              )}
            </div>
            
          </div>
        )}

        {/* TAB 3: LOANS / ADVANCES */}
        {subTab === "advances" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form loan */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 space-y-4 h-fit">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1">
                  <Coins className="w-4 h-4 text-emerald-600" />
                  <span>تسجيل طلب سلفة موظف جديدة</span>
                </h3>
              </div>

              {employees.length === 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>الرجاء إضافة موظفين بالدليل قبل منح السلف!</span>
                </div>
              ) : (
                <form onSubmit={handleSaveAdvance} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">تاريخ منح السلفة</label>
                    <input
                      type="date"
                      required
                      value={advDate}
                      onChange={(e) => setAdvDate(e.target.value)}
                      className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">المستلف (الموظف)</label>
                    <select
                      required
                      value={advEmployeeId}
                      onChange={(e) => setAdvEmployeeId(e.target.value)}
                      className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="">-- اختر موظف من القائمة --</option>
                      {employees.map(x => (
                        <option key={x.id} value={x.id}>
                          {x.name} (الراتب: {x.salary} ر.س - حد السلفة: {x.advanceLimitPercent}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">مبلغ السلفة المطلوب (ر.س)</label>
                    <input
                      type="number"
                      required
                      min={10}
                      value={advAmount}
                      onChange={(e) => setAdvAmount(Number(e.target.value) || 0)}
                      className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                    />
                    {advEmployeeId && (() => {
                      const emp = employees.find(x => x.id === advEmployeeId);
                      if (!emp) return null;
                      const maxBorrow = (emp.salary * emp.advanceLimitPercent) / 100;
                      return (
                        <span className="block text-[10px] text-indigo-700 font-bold">
                          الحد الأقصى المسموح به حالياً: {maxBorrow.toFixed(1)} ر.س (سقف {emp.advanceLimitPercent}%)
                        </span>
                      );
                    })()}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">الآلية أو سبب الاستلاف</label>
                    <input
                      type="text"
                      placeholder="خصم من الراتب بشكل تلقائي كإلتزام شهري"
                      value={advNotes}
                      onChange={(e) => setAdvNotes(e.target.value)}
                      className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span>تأكيد وصرف السلفة المالية</span>
                  </button>
                </form>
              )}
            </div>

            {/* List and directory of advances */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 lg:col-span-2 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800">💵 سجل السلفيات النشطة والمستحقة تلقائياً</h3>
              </div>

              {advances.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  لا يوجد عمليات استلاف أو سلفيات نشطة حالياً بالدفاتر.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-2">تاريخ الصرف</th>
                        <th className="py-3 px-2">الموظف المعني</th>
                        <th className="py-3 px-2 text-center">مبلغ السلفة</th>
                        <th className="py-3 px-2">الآلية والبيان</th>
                        <th className="py-3 px-2 text-center">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {[...advances]
                        .sort((a, b) => b.date.localeCompare(a.date))
                        .map((adv) => (
                          <tr key={adv.id} className="hover:bg-slate-50 font-medium">
                            <td className="py-3.5 px-2 font-mono text-slate-600">{adv.date}</td>
                            <td className="py-3.5 px-2 text-slate-900 font-bold">{adv.employeeName}</td>
                            <td className="py-3.5 px-2 text-center font-bold text-rose-700 font-mono text-xs">
                              {adv.amount.toLocaleString("ar-SA")} ر.س
                            </td>
                            <td className="py-3.5 px-2 text-slate-500 font-semibold">{adv.notes || "مسجلة كخصم تالي"}</td>
                            <td className="py-3.5 px-2 text-center">
                              <button
                                onClick={() => handleDeleteAdvance(adv.id, adv.employeeName, adv.amount)}
                                className="text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 p-1.5 rounded-lg cursor-pointer transition-all inline-flex"
                                title="إلغاء أو سداد السلفة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-2.5 items-start mt-4 leading-relaxed text-[11px] text-emerald-800 font-bold">
                    <span>💡</span>
                    <span>عند الاستعلام الشهري واستخراج كشوفات الرواتب، ستقوم البرمجية ذاتياً بإجراء عملية الخصم والاستقطاع الدفتري لمبلغ السلفة الحائز وإرفاقها بالصافي.</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4: INQUIRIES & REPORTS */}
        {subTab === "inquiry" && (
          <div className="space-y-6">
            
            {/* Range filters selection card */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-700" />
                  <span>توليد كشوفات واستعلامات الرواتب والحضور والخصميات</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
                
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">من تاريخ</label>
                  <input
                    type="date"
                    required
                    value={inqStart}
                    onChange={(e) => setInqStart(e.target.value)}
                    className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">إلى تاريخ</label>
                  <input
                    type="date"
                    required
                    value={inqEnd}
                    onChange={(e) => setInqEnd(e.target.value)}
                    className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 font-sans">تحديد الموظف</label>
                  <select
                    required
                    value={inqEmployeeId}
                    onChange={(e) => setInqEmployeeId(e.target.value)}
                    className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 font-sans"
                  >
                    <option value="all">كافة الموظفين المعتمدين بالمنظومة</option>
                    {employees.map(x => (
                      <option key={x.id} value={x.id}>
                        {x.name} ({x.job})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-[10px] text-indigo-900 leading-normal font-semibold">
                  <span>📅 النطاق الزمني الحالي معّد ومثالي للاستعلام الدوري والحوكمة الصارمة.</span>
                </div>

              </div>
            </div>

            {/* Generated Report Output Content */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">📊 التقرير المالي الشامل للموظفين المسجلين</h3>
                  <p className="text-[10px] text-slate-500 font-bold mt-0.5">خلال الفترة من ({inqStart}) إلى ({inqEnd})</p>
                </div>
                
                {/* Visual badges counters values */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1 rounded-full font-bold">
                    إجمالي سلفيات الفترة: {reportData.reduce((s, x) => s + x.totalAdvancesAmt, 0).toLocaleString()} ر.س
                  </span>
                  <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-800 px-3 py-1 rounded-full font-bold">
                    إجمالي خصومات التأخير: {reportData.reduce((s, x) => s + x.totalDeductions, 0).toLocaleString()} ر.س
                  </span>

                  {userRole === "مدير" && employees.length > 0 && (
                    <button
                      onClick={() => {
                        const allData = reportData.map(emp => {
                          const empAtt = attendance.filter(
                            x => x.employeeId === emp.id && x.date >= inqStart && x.date <= inqEnd
                          );
                          const empAdv = advances.filter(
                            x => x.employeeId === emp.id && x.date >= inqStart && x.date <= inqEnd
                          );
                          const empViol = emp.violationsList || [];
                          return {
                            employee: emp,
                            attendance: empAtt,
                            advances: empAdv,
                            violations: empViol,
                            totals: {
                              netPayable: emp.netPayable,
                              totalDeductions: emp.totalDeductions,
                              totalAdvances: emp.totalAdvancesAmt,
                              daysAttended: emp.daysAttended,
                              totalLatenessMins: emp.totalLatenessMins,
                              brokenDownLateness: emp.brokenDownLateness
                            }
                          };
                        });
                        setPrintEmployeeData({
                          forAll: true,
                          start: inqStart,
                          end: inqEnd,
                          data: allData
                        });
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-400" />
                      <span>طباعة كشف مالي شامل لكافة الموظفين</span>
                    </button>
                  )}
                </div>
              </div>

              {employees.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  لا يتوفر موظفون بالمنظومة لاستخلاص تقاريرهم وتوليد الخصميات التلقائية.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 text-[10px] font-bold uppercase">
                        <th className="py-3 px-2">اسم الموظف كدفاتر</th>
                        <th className="py-3 px-2">الراتب الأساسي</th>
                        <th className="py-3 px-2 text-center">أيام الحضور والعمل</th>
                        <th className="py-3 px-2 text-center">إجمالي دقائق التأخير</th>
                        <th className="py-3 px-2 text-center">التأخر (بسيط/متوسط/كبير/شديد)</th>
                        <th className="py-3 px-2 text-center text-rose-800">خصوميات التأخير</th>
                        <th className="py-3 px-2 text-center text-rose-900 bg-rose-50/50 font-extrabold">جزاءات المخالفات الإدارية</th>
                        <th className="py-3 px-2 text-center">السلفيات المستلمة</th>
                        <th className="py-3 px-2 text-center text-indigo-900 font-extrabold bg-indigo-50/50">الصافي النهائي المستحق</th>
                        {userRole === "مدير" && <th className="py-3 px-2 text-center">الإجراء المطبوع</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-xs">
                      {reportData.map((emp) => (
                        <React.Fragment key={emp.id}>
                          <tr className="hover:bg-slate-50/60 font-medium">
                            <td className="py-3.5 px-2">
                               <div 
                                 className="flex items-center gap-2 cursor-pointer select-none" 
                                 onClick={() => setExpandedRows(prev => ({ ...prev, [emp.id]: !prev[emp.id] }))}
                               >
                                 <span className="text-indigo-600 hover:text-indigo-900 text-[10px] font-bold">
                                   {expandedRows[emp.id] ? "▼" : "◀"}
                                 </span>
                                 <div>
                                   <div className="font-bold text-slate-900 hover:underline">{emp.name}</div>
                                   <div className="text-[10px] text-slate-500 font-bold">{emp.job}</div>
                                 </div>
                               </div>
                            </td>
                            <td className="py-3.5 px-2 font-mono text-slate-800 font-bold">
                              {emp.salary.toLocaleString("ar-SA")} ر.س
                            </td>
                            <td className="py-3.5 px-2 text-center text-slate-600 font-mono font-bold">
                              {emp.daysAttended} أيام
                            </td>
                            <td className="py-3.5 px-2 text-center text-slate-800 font-mono">
                              {emp.totalLatenessMins > 0 ? (
                                <span className="text-amber-800 font-bold font-mono">
                                  {emp.totalLatenessMins} دقيقة
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-center text-slate-500 font-semibold font-mono">
                              {emp.totalLatenessMins > 0 ? (
                                <div className="flex items-center justify-center gap-1 text-[10px]">
                                  <span className={emp.brokenDownLateness.simpleCount > 0 ? "text-slate-700 bg-slate-100 px-1 py-0.5 rounded" : "text-slate-300"}>
                                    بسيط: {emp.brokenDownLateness.simpleCount}
                                  </span>
                                  <span className={emp.brokenDownLateness.mediumCount > 0 ? "text-amber-700 bg-amber-50 px-1 py-0.5 rounded" : "text-slate-300"}>
                                    متوسط: {emp.brokenDownLateness.mediumCount}
                                  </span>
                                  <span className={emp.brokenDownLateness.largeCount > 0 ? "text-orange-700 bg-orange-50 px-1 py-0.5 rounded" : "text-slate-300"}>
                                    كبير: {emp.brokenDownLateness.largeCount}
                                  </span>
                                  <span className={emp.brokenDownLateness.severeCount > 0 ? "text-rose-700 bg-rose-50 px-1 py-0.5 rounded" : "text-slate-300"}>
                                    شديد: {emp.brokenDownLateness.severeCount}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-emerald-600 font-semibold">ملتزم تماماً</span>
                              )}
                            </td>
                            <td className="py-3.5 px-2 text-center font-bold text-rose-700 font-mono">
                              {emp.latenessDeductions > 0 ? `${emp.latenessDeductions.toLocaleString()} ر.س` : "0"}
                            </td>
                            <td className="py-3.5 px-2 text-center font-extrabold text-rose-955 bg-rose-50/20 font-mono">
                              {emp.totalViolationsDeductions > 0 ? `${emp.totalViolationsDeductions.toLocaleString()} ر.س` : "0"}
                            </td>
                            <td className="py-3.5 px-2 text-center font-bold text-rose-800 font-mono">
                              {emp.totalAdvancesAmt > 0 ? `${emp.totalAdvancesAmt.toLocaleString()} ر.س` : "0"}
                            </td>
                            <td className="py-3.5 px-2 text-center font-bold text-indigo-700 font-mono text-xs bg-indigo-50/40">
                              {emp.netPayable.toLocaleString()} ر.س
                            </td>
                            {userRole === "مدير" && (
                              <td className="py-3.5 px-2 text-center">
                                <button
                                  onClick={() => {
                                    const empAtt = attendance.filter(
                                      x => x.employeeId === emp.id && x.date >= inqStart && x.date <= inqEnd
                                    );
                                    const empAdv = advances.filter(
                                      x => x.employeeId === emp.id && x.date >= inqStart && x.date <= inqEnd
                                    );
                                    const empViol = emp.violationsList || [];
                                    setPrintEmployeeData({
                                      forAll: false,
                                      start: inqStart,
                                      end: inqEnd,
                                      data: [{
                                        employee: emp,
                                        attendance: empAtt,
                                        advances: empAdv,
                                        violations: empViol,
                                        totals: {
                                          netPayable: emp.netPayable,
                                          totalDeductions: emp.totalDeductions,
                                          totalAdvances: emp.totalAdvancesAmt,
                                          daysAttended: emp.daysAttended,
                                          totalLatenessMins: emp.totalLatenessMins,
                                          brokenDownLateness: emp.brokenDownLateness
                                        }
                                      }]
                                    });
                                  }}
                                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>طباعة تفصيلية</span>
                                </button>
                              </td>
                            )}
                          </tr>
                          {expandedRows[emp.id] && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={userRole === "مدير" ? 10 : 9} className="p-4 border-t border-b border-slate-100">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                  
                                  {/* 1. Attendances & Lateness */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs space-y-2">
                                    <h5 className="font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>الحضور والتأخيرات المسجلة ({emp.daysAttended} أيام)</span>
                                    </h5>
                                    {attendance.filter(a => a.employeeId === emp.id && a.date >= inqStart && a.date <= inqEnd).length === 0 ? (
                                      <p className="text-[11px] text-slate-400 py-2 text-center font-sans">لا يوجد سجل حضور بالفترة</p>
                                    ) : (
                                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1 font-mono text-[10px]">
                                        {attendance
                                          .filter(a => a.employeeId === emp.id && a.date >= inqStart && a.date <= inqEnd)
                                          .map((a, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-1 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100">
                                              <div>
                                                <span className="font-bold text-slate-600">{a.date}</span>
                                                <span className="text-slate-400 mr-2">({a.arrivalTime} - {a.departureTime})</span>
                                              </div>
                                              <div className="text-left font-bold">
                                                {a.latenessMinutes > 0 ? (
                                                  <span className="text-rose-600 font-mono">{a.latenessMinutes} د تأخير (خصم: {a.deductionAmount} ر.س)</span>
                                                ) : (
                                                  <span className="text-emerald-600">ملتزم</span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* 2. Advances detail */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs space-y-2">
                                    <h5 className="font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                      <Coins className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>السلفيات المستلمة (إجمالي: {emp.totalAdvancesAmt.toLocaleString()} ر.س)</span>
                                    </h5>
                                    {advances.filter(ad => ad.employeeId === emp.id && ad.date >= inqStart && ad.date <= inqEnd).length === 0 ? (
                                      <p className="text-[11px] text-slate-400 py-2 text-center font-sans">لا توجد سلفيات مسجلة بالفترة</p>
                                    ) : (
                                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 font-mono text-[10px]">
                                        {advances
                                          .filter(ad => ad.employeeId === emp.id && ad.date >= inqStart && ad.date <= inqEnd)
                                          .map((ad, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-1 hover:bg-slate-50 rounded border border-transparent hover:border-slate-100">
                                              <div>
                                                <span className="font-bold text-slate-600">{ad.date}</span>
                                                <p className="text-[9px] text-slate-400 font-sans mt-0.5 truncate max-w-[130px]" title={ad.notes}>{ad.notes || "طلب سلفة"}</p>
                                              </div>
                                              <div className="text-left font-bold text-rose-850 font-mono">
                                                {ad.amount.toLocaleString()} ر.س
                                              </div>
                                            </div>
                                          ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* 3. Violations & Warnings detail */}
                                  <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs space-y-2">
                                    <h5 className="font-extrabold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                      <span>المخالفات والتنبيهات الإدارية القائمة بالفترة</span>
                                    </h5>
                                    {(emp.violationsList || []).length === 0 ? (
                                      <p className="text-[11px] text-slate-400 py-2 text-center font-sans">لا توجد مخالفات مسجلة بالفترة</p>
                                    ) : (
                                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-[10px]">
                                        {(emp.violationsList || []).map((v: any, idx: number) => (
                                          <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-100 space-y-0.5">
                                            <div className="flex items-center justify-between">
                                              <span className="font-mono text-[9px] text-slate-400">{v.date}</span>
                                              <span className="font-bold">
                                                {v.type === "warning" ? (
                                                  <span className="text-amber-850 bg-amber-50 px-1 py-0.2 rounded font-sans text-[9px]">تنبيه {v.isSecondWarning ? "ثاني" : "جديد"}</span>
                                                ) : (
                                                  <span className="text-rose-700 bg-rose-50 px-1 py-0.2 rounded font-sans text-[9px]">حسم ({v.deductionAmount} ر.س)</span>
                                                )}
                                              </span>
                                            </div>
                                            <p className="text-[10px] text-slate-600 font-semibold pr-1 leading-normal">{v.description}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 space-y-2 text-slate-600 text-xs mt-4">
                    <h4 className="font-bold text-slate-800">ℹ️ دليل آليات الخضم والاستبقاء لحساب مدد التأخير المعتمد في السجلات:</h4>
                    <ul className="list-disc pr-4 space-y-1 text-[11px] leading-relaxed text-slate-500 font-bold">
                      <li><strong className="text-slate-700">التأخير البسيط (أقل من {deductionConfig.simpleThresholdMinutes} دقيقة)</strong>: متاح أول {deductionConfig.simpleMaxWarnings} مرات في الشهر عبارة عن <span className="text-indigo-600">إنذار شفهي</span>، ثم يتم خصم <span className="text-rose-600">قيمة {deductionConfig.simpleDeductionHours} ساعة وظيفية</span> عن كل تأخير إضافي.</li>
                      <li><strong className="text-slate-700">التأخير المتوسط (من {deductionConfig.simpleThresholdMinutes} إلى {deductionConfig.mediumThresholdMinutes} دقيقة شاملة)</strong>: خصم <span className="text-rose-600">{deductionConfig.mediumDeductionHours} ساعات</span> من الأجر اليومي مباشرة وبلا إنذار.</li>
                      <li><strong className="text-slate-700">التأخير الكبير (من {deductionConfig.mediumThresholdMinutes} إلى {deductionConfig.largeThresholdMinutes} دقيقة شاملة)</strong>: يتم استقطاع <span className="text-rose-600">أجر {deductionConfig.largeDeductionDayFraction * 100}% من اليومية (نصف يوم افتراضياً)</span> مباشرة.</li>
                      <li><strong className="text-slate-700">التأخير الشديد (أكثر من {deductionConfig.largeThresholdMinutes} دقيقة)</strong>: حسم <span className="text-rose-600">{deductionConfig.severeDeductionDayFraction * 100}% من اليومية (كامل أجر يوم العمل)</span>.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 4.5: VIOLATIONS & DISCIPLINARY SYSTEM */}
        {subTab === "violations" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Form Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <span>تسجيل مخالفة أو تنبيه إداري</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">قم بإسناد المخالفة بالوصف والجزاء المالي/التنبيه مباشرة ليرحل تلقائياً على تقارير وسجلات الموظف الحالية بالفترة.</p>
                </div>

                <form onSubmit={handleSaveViolation} className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">اختر الموظف المخالف</label>
                    <select
                      required
                      value={violEmployeeId}
                      onChange={(e) => {
                        const empId = e.target.value;
                        setViolEmployeeId(empId);
                        setViolWarningMode("new");
                        setViolDescription("");
                        setViolPrevId("");
                      }}
                      className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="">-- حدد الموظف من القائمة --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.job})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-500 font-bold">تاريخ وقوع المخالفة</span>
                      <input
                        type="date"
                        required
                        value={violDate}
                        onChange={(e) => setViolDate(e.target.value)}
                        className="w-full text-center py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block text-[10px] text-slate-500 font-bold">الجزاء المترتب</span>
                      <select
                        value={violType}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setViolType(val);
                          setViolWarningMode("new");
                          setViolDescription("");
                          setViolPrevId("");
                        }}
                        className="w-full text-center py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="warning">تنبيه رسمي فقط</option>
                        <option value="deduction">حسم مالي مباشر</option>
                      </select>
                    </div>
                  </div>

                  {violType === "warning" && (
                    <div className="space-y-2 bg-amber-50/40 p-3 rounded-xl border border-amber-100">
                      <span className="block text-[11px] font-bold text-amber-900">تصنيف التنبيه الموجه لإدراج الموظف:</span>
                      <div className="grid grid-cols-2 gap-2 text-right">
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-700">
                          <input
                            type="radio"
                            name="warningMode"
                            checked={violWarningMode === "new"}
                            onChange={() => {
                              setViolWarningMode("new");
                              setViolDescription("");
                            }}
                          />
                          <span>تنبيه جديد بمسمى جديد</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-700">
                          <input
                            type="radio"
                            name="warningMode"
                            checked={violWarningMode === "second"}
                            onChange={() => {
                              setViolWarningMode("second");
                              const pastViols = violations.filter(x => x.employeeId === violEmployeeId);
                              if (pastViols.length > 0) {
                                setViolPrevId(pastViols[0].id);
                                setViolDescription(pastViols[0].description);
                              } else {
                                setViolPrevId("");
                                setViolDescription("");
                              }
                            }}
                            disabled={!violEmployeeId}
                          />
                          <span>تنبيه ثاني لمخالفة سابقة</span>
                        </label>
                      </div>

                      {!violEmployeeId && (
                        <div className="text-[9px] text-rose-500 font-bold mt-1">⚠️ يرجى تحديد الموظف أولاً لتمكين ربط المخالفة السابقة</div>
                      )}

                      {violType === "warning" && violWarningMode === "second" && violEmployeeId && (
                        <div className="space-y-1 mt-2 border-t border-amber-200/50 pt-2">
                          <label className="block text-[10px] font-bold text-amber-800 font-sans">اختر المخالفة السابقة المرجعية:</label>
                          {violations.filter(x => x.employeeId === violEmployeeId).length === 0 ? (
                            <div className="text-[10px] text-slate-500 font-bold bg-white p-1.5 rounded border border-slate-200/40 text-center font-sans">
                              لا يوجد سجل مخالفات سابقة لهذا الموظف لإصدار تنبيه ثانٍ لها.
                            </div>
                          ) : (
                            <select
                              required
                              value={violPrevId}
                              onChange={(e) => {
                                const id = e.target.value;
                                setViolPrevId(id);
                                const matched = violations.find(x => x.id === id);
                                if (matched) {
                                  setViolDescription(matched.description);
                                }
                              }}
                              className="w-full text-right px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold text-slate-700"
                            >
                              {violations.filter(x => x.employeeId === violEmployeeId).map((v) => (
                                <option key={v.id} value={v.id}>
                                  [{v.date}] {v.description.replace(/^تنبيه ثاني:\s*/, "")} ({v.type === "warning" ? "تنبيه" : `حسم ${v.deductionAmount} ر`})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">وصف وبيان المخالفة الإدارية</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="امثلة: تأخر غير مبرر، الإهمال في نظافة الطاولة، عدم ارتداء يونيفورم المطعم..."
                      value={violDescription}
                      onChange={(e) => setViolDescription(e.target.value)}
                      className="w-full text-right px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                    />
                  </div>

                  {violType === "deduction" && (
                    <div className="space-y-1 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                      <label className="block text-[10px] font-bold text-rose-800">مبلغ الحسم المالي المقدر (ريال)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={violDeductionAmount}
                        onChange={(e) => setViolDeductionAmount(parseFloat(e.target.value) || 0)}
                        className="w-full text-center px-3 py-1.5 text-xs border border-rose-200 rounded-lg bg-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500 text-rose-900 font-bold"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تأكيد تسجيل الجزاء / التنبيه</span>
                  </button>
                </form>
              </div>

              {/* List Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-2 space-y-4 shadow-xs">
                <div className="border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-extrabold text-slate-800">سجل المخالفات والتنبيهات الإدارية القائمة</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">يتم ترحيل سجل المخالفات أدناه تلقائياً لتقرير الاستعلام وفي مسير الراتب العام الشهري المنضبط.</p>
                </div>

                <div className="overflow-x-auto">
                  {violations.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">سجل المخالفات خالٍ تماماً حتى هذا التاريخ. جميع الموظفين ملتزمون حالياً 🌟</div>
                  ) : (
                    <table className="w-full text-right border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b border-slate-100 font-bold">
                          <th className="p-2">الموظف</th>
                          <th className="p-2">التاريخ</th>
                          <th className="p-2">بيان المخالفة</th>
                          <th className="p-2 text-center">نوع الإجراء</th>
                          <th className="p-2 text-center">الحسم المالي</th>
                          <th className="p-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {violations.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/50">
                            <td className="p-2 font-bold text-slate-800">{v.employeeName}</td>
                            <td className="p-2 font-mono text-slate-500 text-[11px]">{v.date}</td>
                            <td className="p-2 text-slate-600 max-w-xs truncate" title={v.description}>{v.description}</td>
                            <td className="p-2 text-center">
                              {v.type === "warning" ? (
                                <span className="bg-yellow-50 text-yellow-800 border border-yellow-100 text-[10px] px-2 py-0.5 rounded-full font-bold font-sans">تنبيه رسمي فقط</span>
                              ) : (
                                <span className="bg-rose-50 text-rose-800 border border-rose-100 text-[10px] px-2 py-0.5 rounded-full font-bold font-sans">حسم مستقطع</span>
                              )}
                            </td>
                            <td className="p-2 text-center font-mono font-bold text-rose-700">
                              {v.deductionAmount > 0 ? `${v.deductionAmount} ر` : "ـ"}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteViolation(v.id, v.employeeName)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer rounded-lg hover:bg-rose-50 inline-flex transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 5: CUSTOM RULES MANAGEMENT */}
        {subTab === "rules" && userRole === "مدير" && (
          <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-1.5">
                <SettingsIcon className="w-5 h-5 text-indigo-600" />
                <span>إعداد وضبط حوكمة آليات الخصم والاستقطاع الذكية</span>
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">تتيح لك هذه اللوحة حوكمة دقائق التأخر وحساب الغرامات والإنذارات الشفهية لتطبيقها على جميع عقود العمل المسجلة تلقائياً وبأقصى درجات العدالة.</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch("/api/employee-deduction-config", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(deductionConfig)
                });
                if (res.ok) {
                  onShowToast("✅ تم تحديث وتأمين قوانين الحسم والدوام للموظفين بنجاح وتطبيقها على المسيرات");
                  const data = await res.json();
                  if (data.config) setDeductionConfig(data.config);
                } else {
                  onShowToast("❌ فشل حفظ الآليات المستحدثة فى الخادم");
                }
              } catch (err) {
                onShowToast("❌ خطأ شبكة أثناء تأمين الخصميات");
              }
            }} className="space-y-6">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-800">⏱️ مستويات وعتبات التأخير (بالدقائق)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
                  <div className="space-y-1.5">
                    <label className="block text-slate-700">الحد الأقصى للتأخير البسيط (مثلاً 15 دقيقة)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={deductionConfig.simpleThresholdMinutes}
                      onChange={(e) => setDeductionConfig({...deductionConfig, simpleThresholdMinutes: Number(e.target.value) || 15})}
                      className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-700">الحد الأقصى للتأخير المتوسط (مثلاً 30 دقيقة)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={deductionConfig.mediumThresholdMinutes}
                      onChange={(e) => setDeductionConfig({...deductionConfig, mediumThresholdMinutes: Number(e.target.value) || 30})}
                      className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-700">الحد الأقصى للتأخير الكبير (مثلاً 60 دقيقة)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={deductionConfig.largeThresholdMinutes}
                      onChange={(e) => setDeductionConfig({...deductionConfig, largeThresholdMinutes: Number(e.target.value) || 60})}
                      className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-800">🗣️ ضوابط فئة التأخر البسيط ومكافحة الانفلات اللحظي</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
                  <div className="space-y-1.5">
                    <label className="block text-slate-700">عدد الإنذارات الشفهية السنوية/الشهرية المجانية مسموحة بالدليل</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={deductionConfig.simpleMaxWarnings}
                      onChange={(e) => setDeductionConfig({...deductionConfig, simpleMaxWarnings: Number(e.target.value) || 0})}
                      className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-700">ساعات الخصم المعتمدة بعد نفاد رصيد الإنذارات (لكل تأخير بسيط إضافي)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={deductionConfig.simpleDeductionHours}
                      onChange={(e) => setDeductionConfig({...deductionConfig, simpleDeductionHours: Number(e.target.value) || 1})}
                      className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h4 className="text-xs font-extrabold text-slate-800">⚖️ ضوابط فئات التأخر الأخرى وقيم الحسم القانوني</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
                  <div className="space-y-1.5">
                    <label className="block text-slate-700">التأخير المتوسط: غرامة الخصم بالساعات مباشرة باليومية</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={deductionConfig.mediumDeductionHours}
                      onChange={(e) => setDeductionConfig({...deductionConfig, mediumDeductionHours: Number(e.target.value) || 3})}
                      className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-700">التأخير الكبير: حسم نسبة من الأجر اليومي (كسر، 0.5 = نصف يومية)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min={0}
                      max={1}
                      value={deductionConfig.largeDeductionDayFraction}
                      onChange={(e) => setDeductionConfig({...deductionConfig, largeDeductionDayFraction: Number(e.target.value) || 0.5})}
                      className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-slate-700">التأخير الشديد: حسم نسبة من الأجر اليومي (مثال: 1.0 = يومية متكاملة)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min={0}
                      max={2}
                      value={deductionConfig.severeDeductionDayFraction}
                      onChange={(e) => setDeductionConfig({...deductionConfig, severeDeductionDayFraction: Number(e.target.value) || 1.0})}
                      className="w-full text-center px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={async () => {
                    const fallback = {
                      id: "global-rules",
                      simpleThresholdMinutes: 15,
                      mediumThresholdMinutes: 30,
                      largeThresholdMinutes: 60,
                      simpleMaxWarnings: 3,
                      simpleDeductionHours: 1,
                      mediumDeductionHours: 3,
                      largeDeductionDayFraction: 0.5,
                      severeDeductionDayFraction: 1.0
                    };
                    setDeductionConfig(fallback);
                    onShowToast("🔄 تمت إعادة العتبات والخصومات إلى الإعداد الأصيلي بالنظام");
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                >
                  استعادة الخطة الافتراضية
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
                >
                  <FileEdit className="w-4 h-4" />
                  <span>تأكيد خطة الخيار والحفظ الكلي</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* 🔮 BEAUTIFUL FULLSCREEN PRINT PREVIEW MODAL OVERLAY */}
      {printEmployeeData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:relative print:z-0 select-none">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col print:max-h-none print:shadow-none print:border-none print:rounded-none">
            
            {/* Control Bar inside preview modal (hidden entirely on printed media) */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 shrink-0 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2 text-slate-800">
                <Printer className="w-5 h-5 text-indigo-600 animate-pulse" />
                <h3 className="text-sm font-bold">بوابة تجهيز طباعة كشوفات الرواتب والحضور</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md inline-flex items-center gap-1.5 cursor-pointer transition-all hover:scale-103"
                >
                  <Printer className="w-4 h-4" />
                  <span>بدء عملية الطباعة الورقية الآن</span>
                </button>
                <button
                  onClick={() => setPrintEmployeeData(null)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  إغلاق المعاينة
                </button>
              </div>
            </div>

            {/* Document Content Area */}
            <div id="print-area" className="p-8 space-y-12 text-right text-slate-900 print:p-0 bg-white" dir="rtl">
              
              <style>{`
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #print-area, #print-area * {
                    visibility: visible !important;
                  }
                  #print-area {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    color: #000000 !important;
                    background-color: #ffffff !important;
                  }
                  table {
                    border: 1.5px solid #000000 !important;
                    border-collapse: collapse !important;
                    color: #000000 !important;
                    background: none !important;
                  }
                  th {
                    background-color: #000000 !important;
                    color: #ffffff !important;
                    border: 1px solid #000000 !important;
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                  }
                  td {
                    border: 1px solid #000000 !important;
                    color: #000000 !important;
                    background: none !important;
                  }
                  tr {
                    background: none !important;
                  }
                  .bg-slate-50, .bg-slate-100, .bg-slate-900, .bg-white {
                    background: none !important;
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    box-shadow: none !important;
                    border-color: #000000 !important;
                  }
                  .text-indigo-600, .text-indigo-700, .text-rose-700, .text-rose-800, .text-emerald-800, .text-slate-800, .text-slate-600, .text-slate-500, .text-slate-400 {
                    color: #000000 !important;
                  }
                  .border-indigo-600, .border-emerald-600, .border-slate-200 {
                    border-color: #000000 !important;
                  }
                }
              `}</style>

              {printEmployeeData.data.map((item: any, idx: number) => (
                <div key={idx} className="print-item border-b border-slate-300 pb-10 last:border-0 last:pb-0 font-sans text-xs leading-relaxed" style={{ pageBreakAfter: printEmployeeData.data.length > 1 ? "always" : "auto" }}>
                  
                  {/* Top document layout heading */}
                  <div className="border-b-4 border-double border-slate-800 pb-5 flex items-center justify-between">
                    <div>
                      <h1 className="text-lg font-black tracking-tight text-slate-900 font-sans">📄 كشف مالي ومسير أجور تفصيلي موحد</h1>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">تجهيز ومطابقة النظام المحاسبى الذكي لقسم إدارة شؤون الحضور والموظفين</p>
                    </div>
                    <div className="text-left font-sans">
                      <div className="text-[10px] text-slate-500 font-bold mt-1">النطاق السجلاتي: من <span className="font-mono">{printEmployeeData.start}</span> إلى <span className="font-mono">{printEmployeeData.end}</span></div>
                    </div>
                  </div>

                  {/* Basic information */}
                  <div className="my-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold">اسم الموظف المسجل:</span>
                      <strong className="text-slate-800 text-xs">{item.employee.name}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold">المسمى الوظيفي:</span>
                      <strong className="text-slate-800 text-xs">{item.employee.job}</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-bold">الراتب الأساسي المعتمد:</span>
                      <strong className="text-slate-800 text-xs font-mono">{item.employee.salary.toLocaleString("ar-SA")} ر.س</strong>
                    </div>
                    <div>
                      {item.totals.totalAdvances > 0 ? (
                        <>
                          <span className="block text-[10px] text-slate-400 font-bold">السلفة والنسبة المستقطعة:</span>
                          <strong className="text-rose-800 text-xs font-mono font-bold">
                            {item.totals.totalAdvances.toLocaleString("ar-SA")} ر.س ({((item.totals.totalAdvances / item.employee.salary) * 100).toFixed(1)}%)
                          </strong>
                        </>
                      ) : (
                        <>
                          <span className="block text-[10px] text-slate-400 font-bold">سحب السلف:</span>
                          <strong className="text-slate-500 text-xs font-sans font-black">لا يوجد سُلفة نشطة</strong>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Detailed Attendance Logs */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-800 border-r-2 border-indigo-600 pr-2">📋 كشف أيام الحضور وحصيلة دقائق التأخير بالفترة:</h4>
                    {item.attendance.length === 0 ? (
                      <div className="p-3 bg-slate-50 text-slate-400 text-center rounded-xl text-[11px]">لا يوجد سجل حضور مسجل في هذه الفترة المعنية بالبحث.</div>
                    ) : (
                      <table className="w-full text-right border-collapse border border-slate-200 text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold">
                            <th className="p-2 border border-slate-200">تاريخ الدوام</th>
                            <th className="p-2 border border-slate-200 text-center">أوقات الدوام الفعلي</th>
                            <th className="p-2 border border-slate-200 text-center">دقائق التأخير</th>
                            <th className="p-2 border border-slate-200 text-center">أثر المخالفة والخصم</th>
                            <th className="p-2 border border-slate-200 text-center">مبلغ الاستقطاع</th>
                            <th className="p-2 border border-slate-200">ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {item.attendance.map((att: any, attIdx: number) => (
                            <tr key={attIdx} className="hover:bg-slate-50/50">
                              <td className="p-2 border border-slate-200 font-mono text-slate-600">{att.date}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono">{att.arrivalTime} - {att.departureTime}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono font-bold text-slate-700">
                                {att.latenessMinutes > 0 ? `${att.latenessMinutes} د` : "ملتزم بالثوانى"}
                              </td>
                              <td className="p-2 border border-slate-200 text-center">
                                {att.latenessMinutes === 0 ? "سليم" : att.oralWarning ? "🗣️ إنذار شفهي قانوني" : `تأخير ${att.latenessCategory === "simple" ? "بسيط" : att.latenessCategory === "medium" ? "متوسط" : att.latenessCategory === "large" ? "كبير" : "شديد"}`}
                              </td>
                              <td className="p-2 border border-slate-200 text-center font-bold text-rose-700 font-mono">
                                {att.deductionAmount > 0 ? `${att.deductionAmount.toLocaleString("ar-SA")} ر.س` : "لا يوجد"}
                              </td>
                              <td className="p-2 border border-slate-200 text-slate-500 font-semibold">{att.notes || (att.hasExcuse ? "حضور بعذر مقبول" : "")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Detailed Violations Logs */}
                  <div className="space-y-2 mt-6">
                    <h4 className="text-xs font-extrabold text-slate-800 border-r-2 border-rose-600 pr-2">⚠️ كشف جزاءات المخالفات والتنبيهات الإدارية القائمة بالفترة:</h4>
                    {!item.violations || item.violations.length === 0 ? (
                      <div className="p-3 bg-slate-50 text-slate-400 text-center rounded-xl text-[11px]">لا يوجد سجل جزاءات أو مخالفات إدارية مسجل في حق الموظف خلال هذه الفترة.</div>
                    ) : (
                      <table className="w-full text-right border-collapse border border-slate-200 text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold">
                            <th className="p-2 border border-slate-200">التاريخ</th>
                            <th className="p-2 border border-slate-200">بيان ووصف المخالفة الصادر</th>
                            <th className="p-2 border border-slate-200 text-center">نوع الإجراء المطبق</th>
                            <th className="p-2 border border-slate-200 text-center">استقطاع العقوبة المالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {item.violations.map((v: any, vIdx: number) => (
                            <tr key={vIdx}>
                              <td className="p-2 border border-slate-200 font-mono text-slate-600">{v.date}</td>
                              <td className="p-2 border border-slate-200 text-slate-800 font-semibold">{v.description}</td>
                              <td className="p-2 border border-slate-200 text-center">
                                {v.type === "warning" ? "🗣️ تنبيه إداري رسمي" : "حسم مالي مباشر"}
                              </td>
                              <td className="p-2 border border-slate-200 text-center font-bold text-rose-700 font-mono">
                                {v.type === "deduction" && v.deductionAmount > 0 ? `${v.deductionAmount.toLocaleString("ar-SA")} ر.س` : "لا يوجد"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Detailed Advances/Loans Logs */}
                  <div className="space-y-2 mt-6">
                    <h4 className="text-xs font-extrabold text-slate-800 border-r-2 border-emerald-600 pr-2">💵 كشف مبالغ السلف والاستلاف المصروفة والموجبة للاستيفاء:</h4>
                    {item.advances.length === 0 ? (
                      <div className="p-3 bg-slate-50 text-slate-400 text-center rounded-xl text-[11px]">الموظف المذكور لم يحصل على أي سلفيات نشطة خلال هذا النطاق السجلاتى.</div>
                    ) : (
                      <table className="w-full text-right border-collapse border border-slate-200 text-[10px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold">
                            <th className="p-2 border border-slate-200">تاريخ استلام السلفة</th>
                            <th className="p-2 border border-slate-200 text-center">الرصيد الدفتري المسحوب</th>
                            <th className="p-2 border border-slate-200">تفاصيل السداد والخصم المفتوح</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {item.advances.map((adv: any, advIdx: number) => (
                            <tr key={advIdx}>
                              <td className="p-2 border border-slate-200 font-mono text-slate-600">{adv.date}</td>
                              <td className="p-2 border border-slate-200 text-center font-bold text-rose-800 font-mono text-xs">{adv.amount.toLocaleString("ar-SA")} ر.س</td>
                              <td className="p-2 border border-slate-200 text-slate-500 font-semibold">{adv.notes || "خصم تلقائي مباشر من ميزان رواتب الموظفين بالفترة"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Final Balance Settlement Layout */}
                  <div className="mt-8 bg-slate-100 p-5 rounded-2xl border border-slate-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-500 font-bold">صافي المبلّغ والاستحقاق المالى النهائي المبرهن:</div>
                      <div className="text-[11px] text-slate-600 font-semibold leading-relaxed">
                        الجروميات والمقتطعات الإجمالية بلغت <span className="text-rose-700 font-bold font-mono">{((item.totals.totalDeductions || 0) + (item.totals.totalAdvances || 0)).toLocaleString("ar-SA")} ر.س</span> 
                        (مقسمة تفصيلاً إلى: <span className="font-mono text-xs text-rose-700">{(item.attendance.reduce((sum: number, x: any) => sum + (x.hasExcuse ? 0 : x.deductionAmount), 0)).toLocaleString("ar-SA")} ر.س</span> غرامات تأخر، 
                        و <span className="font-mono text-xs text-rose-700">{((item.violations || []).reduce((sum: number, x: any) => sum + (x.type === "deduction" ? x.deductionAmount : 0), 0)).toLocaleString("ar-SA")} ر.س</span> جزاءات مخالفات إدارية، 
                        و <span className="font-mono text-xs text-rose-800">{(item.totals.totalAdvances || 0).toLocaleString("ar-SA")} ر.س</span> سلفيات مستحقة الاسترداد).
                      </div>
                    </div>
                    <div className="bg-white border-2 border-indigo-600/30 rounded-xl px-5 py-3 text-center self-end md:self-auto shadow-xs">
                      <span className="block text-[10px] text-slate-500 font-bold uppercase mb-1">الصافي الممنوح للاستلام الكلي:</span>
                      <span className="text-lg font-black font-mono text-indigo-700">{(item.totals.netPayable || 0).toLocaleString("ar-SA")} ر.س</span>
                    </div>
                  </div>

                  {/* Approval and Signature lines for Official use */}
                  <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-3 gap-6 text-center text-[10px] font-bold text-slate-600">
                    <div className="space-y-10">
                      <span>إدارة الموارد البشرية (HR):</span>
                      <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto pb-1 mt-4 text-slate-400 text-[9px]">توقيع واعتماد شؤون الموظفين:.......................</div>
                    </div>
                    <div className="space-y-10">
                      <span>اعتماد المدير العام للشركة:</span>
                      <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto pb-1 mt-4 text-slate-400 text-[9px]">توقيع الإدارة العامة:.......................</div>
                    </div>
                    <div className="space-y-10">
                      <span>إمضاء وبصمة المستلم:</span>
                      <div className="text-slate-800 text-[10px] font-bold leading-normal">{item.employee.name}</div>
                      <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto pb-1 mt-2 text-slate-500 text-[9px]">توقيع الموظف المعني:.......................</div>
                    </div>
                  </div>

                </div>
              ))}

              {/* General official statement */}
              <div className="pt-4 border-t border-slate-200 text-center text-[9px] text-slate-400 font-bold">
                * تم إعداد هذا الكشف آلياً ومراجعته وتأمينه دفترياً من القليلة للمروج والقادسية الذكي بتاريخ {new Date().toLocaleDateString("ar-SA")}. تعديلات الخصم والالتزام تخضع لإشراف الإدارة العامة.
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
