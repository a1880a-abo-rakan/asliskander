import React, { useState } from "react";
import {
  Printer,
  X,
  User,
  GraduationCap,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  BookOpen,
  Edit3,
  Check,
  Building,
  FileText,
  AlertCircle,
  Copy,
  ChevronDown,
  Droplet,
  Droplets,
  Leaf,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import {
  Student,
  TeacherInquiryRequest,
  SchoolSignatories,
  StudentEvaluationItem
} from "../types";

export interface AggregatedStudentEvaluation {
  student: {
    id: string;
    name: string;
    nationalId?: string;
    grade?: string;
    className?: string;
    phone?: string;
    [key: string]: any;
  };
  totalInquiriesCount: number;
  completedEvaluationsCount: number;
  teachersEvaluations: {
    inquiryId: string;
    teacherName: string;
    teacherPhone?: string;
    subject: string;
    section: string;
    grade?: string;
    status: "pending" | "opened" | "completed" | "failed";
    isVerified: boolean;
    sentAt: string;
    completedAt?: string;
    evaluation?: StudentEvaluationItem;
  }[];
}

interface ConsolidatedStudentReportModalProps {
  studentEval: AggregatedStudentEvaluation;
  schoolSignatories: SchoolSignatories;
  allAggregatedStudents?: AggregatedStudentEvaluation[];
  onClose: () => void;
  onSelectAnotherStudent?: (studentEval: AggregatedStudentEvaluation) => void;
}

export default function ConsolidatedStudentReportModal({
  studentEval,
  schoolSignatories,
  allAggregatedStudents = [],
  onClose,
  onSelectAnotherStudent,
}: ConsolidatedStudentReportModalProps) {
  const [counselorNotes, setCounselorNotes] = useState<string>("");
  const [isEditingCounselorNotes, setIsEditingCounselorNotes] = useState(false);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState("1447 / 1448 هـ");
  const [selectedTerm, setSelectedTerm] = useState("الفصل الدراسي الثالث");
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [printMode, setPrintMode] = useState<"single" | "all">("single");
  // Ink-Saver Mode is enabled by default to save toner, reduce solid dark fills, and produce crisp official prints
  const [inkSaverMode, setInkSaverMode] = useState(true);

  const { student, teachersEvaluations, completedEvaluationsCount, totalInquiriesCount } = studentEval;

  // Calculate Overall Averages and Ratings
  const completedList = teachersEvaluations.filter((t) => t.evaluation && t.status === "completed");

  const getAcademicScore = (level?: string) => {
    switch (level) {
      case "ممتاز": return 4;
      case "جيد جداً": return 3;
      case "جيد": return 2;
      case "مقبول": return 1;
      case "ضعيف": return 0;
      default: return 3;
    }
  };

  const getDisciplineScore = (level?: string) => {
    switch (level) {
      case "ممتاز": return 4;
      case "جيد جداً": return 3;
      case "جيد": return 2;
      case "ضعيف": return 1;
      default: return 3;
    }
  };

  const getBehaviorScore = (level?: string) => {
    switch (level) {
      case "متميز": return 4;
      case "ملتزم": return 3;
      case "يحتاج توجيه": return 2;
      case "غير منضبط": return 1;
      default: return 3;
    }
  };

  const avgAcademicScore = completedList.length > 0
    ? completedList.reduce((acc, curr) => acc + getAcademicScore(curr.evaluation?.academicLevel || curr.evaluation?.academicAchievement), 0) / completedList.length
    : 0;

  const avgDisciplineScore = completedList.length > 0
    ? completedList.reduce((acc, curr) => acc + getDisciplineScore(curr.evaluation?.disciplineLevel || curr.evaluation?.disciplineAndCommitment), 0) / completedList.length
    : 0;

  const avgBehaviorScore = completedList.length > 0
    ? completedList.reduce((acc, curr) => acc + getBehaviorScore(curr.evaluation?.behaviorLevel || curr.evaluation?.behaviorAndEthics), 0) / completedList.length
    : 0;

  const getGeneralRatingLabel = (score: number) => {
    if (score >= 3.5) return { label: "ممتاز (متميز)", rating: "أ" };
    if (score >= 2.5) return { label: "جيد جداً (مرتفع)", rating: "ب" };
    if (score >= 1.5) return { label: "جيد (متوسط)", rating: "ج" };
    return { label: "يحتاج متابعة ودعم", rating: "د" };
  };

  const handlePrint = (mode: "single" | "all" = "single") => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleCopySummary = () => {
    const summaryText = `*تقرير استعلام وتقييم شامل للطالب: ${student.name}*
الصف/الشعبة: ${student.grade || ""} / ${student.className || ""}
رقم الطالب: ${student.id || student["رقم الطالب"] || student.nationalId || "—"}
المدرسة: ${schoolSignatories.schoolName || "ثانوية الأبناء الأولى"}

*إفادات المعلمين (${completedEvaluationsCount} من ${totalInquiriesCount} معلماً):*
${teachersEvaluations.map((t, idx) => {
  if (t.evaluation) {
    return `${idx + 1}. المعلم: ${t.teacherName} (${t.subject})
- التحصيل: ${t.evaluation.academicLevel || t.evaluation.academicAchievement || "—"}
- الانضباط: ${t.evaluation.disciplineLevel || t.evaluation.disciplineAndCommitment || "—"}
- السلوك: ${t.evaluation.behaviorLevel || t.evaluation.behaviorAndEthics || "—"}
- المشاركة: ${t.evaluation.participationLevel || t.evaluation.participationAndInteraction || "—"}
${t.evaluation.teacherNotes ? `- الملاحظات: ${t.evaluation.teacherNotes}` : ""}`;
  } else {
    return `${idx + 1}. المعلم: ${t.teacherName} (${t.subject}) - بانتظار الإفادة`;
  }
}).join("\n\n")}

${counselorNotes ? `*توصيات التوجيه الطلابي:*\n${counselorNotes}\n` : ""}
- الموجه الطلابي: ${schoolSignatories.counselorName || "—"}
- مدير المدرسة: ${schoolSignatories.principalName || "—"}`;

    navigator.clipboard.writeText(summaryText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  const currentDateFormatted = new Date().toLocaleDateString("ar-SA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const currentDateHijri = new Date().toLocaleDateString("ar-SA-u-ca-islamic", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const studentPhone = student.phone || (student as any)["رقم الجوال"] || (student as any)["الجوال"] || "";
  const studentNationalId = student.nationalId || student["السجل المدني"] || student["رقم الهوية"] || "";

  // Presets for student guidance recommendations
  const guidancePresets = [
    "طالب متفوق ومتميز دراسياً وسلوكياً، يُوصى بتكريمه واستمرار تعزيز دافعيته وتوجيهه لرعاية الموهبة.",
    "مستوى أكاديمي جيد وملتزم سلوكياً، يُوصى بالمتابعة والتنسيق مع ولي الأمر للارتقاء بالتحصيل في المواد التي تحتاج دعماً.",
    "ملتزم بالحضور الصفي، ويحتاج إلى تكثيف المشاركة والتفاعل مع معلمي المواد والاهتمام بالواجبات المدرسية أولاً بأول.",
    "تمت دراسة الحالة من قِبل التوجيه الطلابي، ووُضعت خطة إرشادية للمتابعة الدورية مع معلمي الفصول والتواصل المستمر مع الأسرة."
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto" dir="rtl">
      
      {/* Strict A4 Print CSS Styles (Exact 1.15cm margins on all 4 sides & Ink-Saver rules) */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 1.15cm !important;
        }
        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: system-ui, -apple-system, sans-serif !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-a4-sheet {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .avoid-break-inside {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          /* Eliminate heavy solid dark ink fills in print */
          .ink-saver-active {
            background-color: transparent !important;
            color: #000000 !important;
            border-color: #333333 !important;
            box-shadow: none !important;
          }
          .ink-saver-active th {
            background-color: #f1f5f9 !important;
            color: #000000 !important;
          }
        }
      `}</style>

      {/* Modal Dialog Container */}
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[96vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
        
        {/* Top Sticky Header (Hidden in Print) */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  تقرير الاستعلام عن طالب (A4 بهوامش 1.15 سم)
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold">
                  {completedEvaluationsCount} من {totalInquiriesCount} إفادات معتمدة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                تصميم رسمي معتمد موفر لحبر الطابعة بنسبة 80% ومقاس A4 بهوامش دقيقة 1.15 سم
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
            {/* Ink-Saver Mode Toggle Button */}
            <button
              type="button"
              onClick={() => setInkSaverMode(!inkSaverMode)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                inkSaverMode
                  ? "bg-emerald-50 text-emerald-900 border-emerald-300 ring-2 ring-emerald-500/20 shadow-2xs"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              }`}
              title="تفعيل نمط توفير الحبر لإزالة الخلفيات الداكنة وحماية خراطيش الطباعة"
            >
              <Leaf className={`w-3.5 h-3.5 ${inkSaverMode ? "text-emerald-700" : "text-slate-400"}`} />
              <span>{inkSaverMode ? "نمط توفير الحبر (نشط ✓)" : "توفير الحبر (معطل)"}</span>
            </button>

            {/* Student Switcher Dropdown if multiple students exist */}
            {allAggregatedStudents.length > 1 && onSelectAnotherStudent && (
              <div className="relative inline-block text-xs">
                <select
                  value={student.id}
                  onChange={(e) => {
                    const target = allAggregatedStudents.find((s) => s.student.id === e.target.value);
                    if (target) onSelectAnotherStudent(target);
                  }}
                  className="py-2 px-3 bg-white border border-slate-300 rounded-xl text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer text-xs"
                >
                  {allAggregatedStudents.map((item) => (
                    <option key={item.student.id} value={item.student.id}>
                      الطالب: {item.student.name} ({item.completedEvaluationsCount}/{item.totalInquiriesCount})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Copy Summary */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="نسخ ملخص تقرير الاستعلام لمشاركته عبر واتساب أو المستندات"
            >
              {copiedNotification ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ التقرير</span>
                </>
              )}
            </button>

            {/* Print Single Report Button */}
            <button
              type="button"
              onClick={() => handlePrint("single")}
              className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
              title="طباعة التقرير الفردي للطالب بهوامش 1.15 سم موفر للحبر"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>طباعة التقرير (A4)</span>
            </button>

            {/* Batch Print All Students if available */}
            {allAggregatedStudents.length > 1 && (
              <button
                type="button"
                onClick={() => handlePrint("all")}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hidden md:flex"
                title="طباعة تقارير كافة الطلاب دفعة واحدة"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة جميع الطلاب ({allAggregatedStudents.length})</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Body */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-slate-200/50 print:bg-white print:p-0">
          
          {/* ========================================================================= */}
          {/* SINGLE STUDENT REPORT VIEW (A4 PROPORTIONS, 1.15CM MARGINS, INK-SAVER)    */}
          {/* ========================================================================= */}
          <div className={`space-y-6 ${printMode === "all" ? "print:hidden" : ""}`}>
            
            {/* Sheet Card Container with strict A4 width & 1.15cm equivalent padding */}
            <div
              className={`printable-a4-sheet bg-white max-w-[210mm] w-full mx-auto p-5 sm:p-[1.15cm] rounded-2xl border border-slate-300 shadow-md print:shadow-none print:border-none print:p-0 space-y-4 text-slate-900 ${
                inkSaverMode ? "ink-saver-active" : ""
              }`}
              id="printable-single-student-report"
            >
              
              {/* 1. Official Ministry Header (Minimal, Ink-Saving & Organized) */}
              <div className="border-b-2 border-slate-900 pb-3 space-y-3 avoid-break-inside">
                <div className="grid grid-cols-3 items-center gap-2 text-xs font-bold text-slate-800">
                  
                  {/* Right: Country, Ministry, Directorate & School */}
                  <div className="space-y-0.5 text-right leading-tight">
                    <p className="text-[11px] text-slate-700">{schoolSignatories.countryName || "المملكة العربية السعودية"}</p>
                    <p className="text-[11px] text-slate-700">{schoolSignatories.ministryName || "وزارة التعليم"}</p>
                    <p className="text-[11px] text-slate-700">{schoolSignatories.administrationName || "الإدارة العامة للتعليم"}</p>
                    <p className="text-slate-950 font-black text-xs pt-0.5">{schoolSignatories.schoolName || "ثانوية الأبناء الأولى"}</p>
                    <p className="text-[10px] text-slate-600 font-semibold">قسم التوجيه الطلابي والإرشاد الأكاديمي</p>
                  </div>

                  {/* Center: School / Ministry Logo & Vision 2030 */}
                  <div className="flex flex-col items-center justify-center text-center">
                    {schoolSignatories.logoUrl ? (
                      <img
                        src={schoolSignatories.logoUrl}
                        alt="شعار المدرسة"
                        referrerPolicy="no-referrer"
                        className="object-contain max-h-16 mb-1"
                        style={{
                          width: `${schoolSignatories.logoWidth || 60}px`,
                          height: `${schoolSignatories.logoHeight || 60}px`,
                        }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl border border-slate-400 flex items-center justify-center text-slate-800 font-black mb-1 bg-slate-50 print:bg-white">
                        <Building className="w-6 h-6 text-slate-700" />
                      </div>
                    )}
                    <span className="text-[9px] text-slate-500 font-mono tracking-wider">رؤية المملكة 2030</span>
                  </div>

                  {/* Left: Official Reference, Dates & Hijri */}
                  <div className="space-y-0.5 text-left font-mono text-[10px] text-slate-800 leading-tight" dir="ltr">
                    <p><strong className="font-sans">التاريخ الهجري:</strong> {currentDateHijri}</p>
                    <p><strong className="font-sans">التاريخ الميلادي:</strong> {new Date().toLocaleDateString("ar-SA")}</p>
                    <p><strong className="font-sans">العام الدراسي:</strong> {selectedAcademicYear}</p>
                    <p><strong className="font-sans">الفصل:</strong> {selectedTerm}</p>
                    <p><strong className="font-sans">الرقم المرجعي:</strong> STU-INQ-{student.id.replace(/\D/g, "").slice(-5) || "1024"}</p>
                  </div>
                </div>

                {/* Formal Title Ribbon - Ink-Saving Outlined Banner */}
                <div className="text-center pt-1">
                  <div className="inline-block px-6 py-1.5 border-2 border-slate-900 bg-slate-50 print:bg-white text-slate-950 rounded-xl text-xs sm:text-sm font-black tracking-wide shadow-2xs">
                    استمارة التقييم والاستعلام التجميعي الشامل للمعلمين عن الطالب
                  </div>
                </div>
              </div>

              {/* 2. Student Identity Card - Clean 4-5 Column Outlined Grid (No Solid Fills) */}
              <div className="border border-slate-400 rounded-xl p-3 bg-slate-50/50 print:bg-white space-y-2 avoid-break-inside">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[10px] text-slate-500 font-semibold block">اسم الطالب الرباعي:</span>
                    <strong className="text-slate-950 font-black text-xs block truncate">{student.name}</strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[10px] text-slate-500 font-semibold block">رقم الطالب / الهوية:</span>
                    <strong className="text-slate-900 font-mono font-bold text-xs block">
                      {student.id || student["رقم الطالب"] || studentNationalId || "—"}
                    </strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[10px] text-slate-500 font-semibold block">الصف الدراسي:</span>
                    <strong className="text-slate-900 font-bold block">{student.grade || "المرحلة الثانوية"}</strong>
                  </div>

                  <div className="bg-white p-2 rounded-lg border border-slate-300">
                    <span className="text-[10px] text-slate-500 font-semibold block">الشعبة / الفصل:</span>
                    <strong className="text-slate-900 font-bold block">{student.className || "1"}</strong>
                  </div>
                </div>

                {/* Secondary Meta Row: Phone, Status & Completeness */}
                <div className="flex items-center justify-between text-[11px] pt-1 px-1 border-t border-slate-200">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="font-bold">جوال ولي الأمر:</span>
                    <span className="font-mono text-slate-900">{studentPhone || "مسجل لدى الإدارة"}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-slate-600">حالة الاستعلام:</span>
                    {completedEvaluationsCount === totalInquiriesCount && totalInquiriesCount > 0 ? (
                      <span className="text-slate-900 border border-slate-800 px-2 py-0.5 rounded-md bg-white text-[10px]">
                        ✓ مكتمل الاعتماد من كافة المعلمين ({completedEvaluationsCount}/{totalInquiriesCount})
                      </span>
                    ) : (
                      <span className="text-slate-800 border border-slate-400 px-2 py-0.5 rounded-md bg-white text-[10px]">
                        قيد المتابعة ({completedEvaluationsCount} معلماً أكملوا التقييم من أصل {totalInquiriesCount})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Overall Performance Indicators (Ink-Saving 4-Box Summary) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs avoid-break-inside">
                <div className="bg-white p-2.5 rounded-xl border border-slate-300 text-center space-y-0.5">
                  <span className="text-[10px] text-slate-600 font-bold block">التحصيل الدراسي العام</span>
                  <strong className="text-sm font-black text-slate-950 block">
                    {completedList.length > 0 ? getGeneralRatingLabel(avgAcademicScore).label : "بانتظار الإفادات"}
                  </strong>
                  <span className="text-[9px] text-slate-500 block">بناءً على تقييم معلمي المواد</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-300 text-center space-y-0.5">
                  <span className="text-[10px] text-slate-600 font-bold block">الانضباط الصفي والالتزام</span>
                  <strong className="text-sm font-black text-slate-950 block">
                    {completedList.length > 0 ? getGeneralRatingLabel(avgDisciplineScore).label : "بانتظار الإفادات"}
                  </strong>
                  <span className="text-[9px] text-slate-500 block">الحضور والتركيز الصفي</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-300 text-center space-y-0.5">
                  <span className="text-[10px] text-slate-600 font-bold block">السلوك والمواظبة العامة</span>
                  <strong className="text-sm font-black text-slate-950 block">
                    {completedList.length > 0 ? getGeneralRatingLabel(avgBehaviorScore).label : "بانتظار الإفادات"}
                  </strong>
                  <span className="text-[9px] text-slate-500 block">التعامل والروح الإيجابية</span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-300 text-center space-y-0.5">
                  <span className="text-[10px] text-slate-600 font-bold block">نسبة اكتمال الإفادات</span>
                  <strong className="text-sm font-black text-slate-950 block font-mono">
                    {totalInquiriesCount > 0 ? Math.round((completedEvaluationsCount / totalInquiriesCount) * 100) : 0}%
                  </strong>
                  <span className="text-[9px] text-slate-500 block">{completedEvaluationsCount} من أصل {totalInquiriesCount} مادة</span>
                </div>
              </div>

              {/* 4. Detailed Teachers Evaluations Table (Ink-Saving & Highly Organized) */}
              <div className="space-y-1.5 avoid-break-inside">
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 px-1">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-700" />
                    <span>جدول إفادات المعلمين التفصيلية للمقررات الدراسية</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    إجمالي المقررات المستعلم عنها: {teachersEvaluations.length}
                  </span>
                </div>

                <div className="border border-slate-400 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs border-collapse divide-y divide-slate-300">
                    <thead>
                      <tr className="bg-slate-100 text-slate-950 font-bold border-b-2 border-slate-900 text-[11px]">
                        <th className="p-2 text-center w-7 border-l border-slate-300">م</th>
                        <th className="p-2 border-l border-slate-300">المادة المقررة</th>
                        <th className="p-2 border-l border-slate-300">اسم المعلم</th>
                        <th className="p-2 text-center border-l border-slate-300">التحصيل</th>
                        <th className="p-2 text-center border-l border-slate-300">الانضباط</th>
                        <th className="p-2 text-center border-l border-slate-300">السلوك</th>
                        <th className="p-2 text-center border-l border-slate-300">المشاركة</th>
                        <th className="p-2 border-l border-slate-300 w-1/3">ملاحظات وتوصيات المعلم</th>
                        <th className="p-2 text-center w-16">التوثيق</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 bg-white text-[11px]">
                      {teachersEvaluations.map((t, idx) => {
                        const ev = t.evaluation;
                        const isDone = t.status === "completed" && ev;

                        return (
                          <tr key={t.inquiryId || idx} className="hover:bg-slate-50">
                            <td className="p-2 text-center font-mono text-slate-500 font-bold border-l border-slate-200">
                              {idx + 1}
                            </td>
                            
                            <td className="p-2 font-black text-slate-950 border-l border-slate-200 whitespace-nowrap">
                              {t.subject}
                            </td>

                            <td className="p-2 font-bold text-slate-800 border-l border-slate-200 whitespace-nowrap">
                              {t.teacherName}
                            </td>

                            {isDone ? (
                              <>
                                <td className="p-1.5 text-center border-l border-slate-200 whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded border border-slate-300 font-bold text-[10px] inline-block">
                                    {ev.academicLevel || ev.academicAchievement || "ممتاز"}
                                  </span>
                                </td>

                                <td className="p-1.5 text-center border-l border-slate-200 whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded border border-slate-300 font-bold text-[10px] inline-block">
                                    {ev.disciplineLevel || ev.disciplineAndCommitment || "ممتاز"}
                                  </span>
                                </td>

                                <td className="p-1.5 text-center border-l border-slate-200 whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded border border-slate-300 font-bold text-[10px] inline-block">
                                    {ev.behaviorLevel || ev.behaviorAndEthics || "متميز"}
                                  </span>
                                </td>

                                <td className="p-1.5 text-center border-l border-slate-200 whitespace-nowrap">
                                  <span className="px-1.5 py-0.5 rounded border border-slate-300 font-bold text-[10px] inline-block">
                                    {ev.participationLevel || ev.participationAndInteraction || "ممتاز"}
                                  </span>
                                </td>

                                <td className="p-2 text-[10px] leading-snug border-l border-slate-200 font-sans">
                                  {ev.teacherNotes ? (
                                    <p className="text-slate-900">{ev.teacherNotes}</p>
                                  ) : (
                                    <span className="text-slate-400 italic">لا توجد ملاحظات إضافية</span>
                                  )}
                                </td>

                                <td className="p-1.5 text-center whitespace-nowrap">
                                  <span className="text-slate-900 font-bold border border-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                    ✓ معتمد
                                  </span>
                                </td>
                              </>
                            ) : (
                              <td colSpan={6} className="p-2 text-center text-slate-500 bg-slate-50/70 border-l border-slate-200">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                                  <Clock className="w-3 h-3 text-slate-400" />
                                  <span>بانتظار إفادة المعلم واعتماد التقييم عبر الرابط الإلكتروني</span>
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Counselor Guidance Section & Action Plan (Organized Box with Preset Helpers) */}
              <div className="border border-slate-400 rounded-xl p-3 bg-white space-y-2 avoid-break-inside">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-700" />
                    <span>مرئيات وتوصيات التوجيه الطلابي والإرشاد الأكاديمي:</span>
                  </h4>

                  <button
                    type="button"
                    onClick={() => setIsEditingCounselorNotes(!isEditingCounselorNotes)}
                    className="text-[11px] font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer no-print border border-slate-300 px-2 py-0.5 rounded-lg bg-slate-50"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{isEditingCounselorNotes ? "إنهاء التعديل" : "كتابة / تعديل التوصية"}</span>
                  </button>
                </div>

                {/* Preset Suggestions Bar (Shown during editing or when empty) */}
                {isEditingCounselorNotes && (
                  <div className="space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 no-print">
                    <span className="text-[10px] text-slate-500 font-bold block">عبارات وتوصيات إرشادية سريعة (انقر للاختيار):</span>
                    <div className="flex flex-wrap gap-1">
                      {guidancePresets.map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setCounselorNotes(preset)}
                          className="text-[10px] p-1.5 text-right rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 transition-colors cursor-pointer"
                        >
                          • {preset.slice(0, 50)}...
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isEditingCounselorNotes ? (
                  <textarea
                    value={counselorNotes}
                    onChange={(e) => setCounselorNotes(e.target.value)}
                    placeholder="اكتب هنا مرئيات وتوصيات الموجه الطلابي، خطة المتابعة العلاجية أو الإثرائية للطالب، والتوجيهات الموصى بها لإدارة المدرسة والأسرة..."
                    rows={3}
                    className="w-full p-2.5 bg-white border border-slate-400 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 leading-relaxed font-sans"
                  />
                ) : (
                  <div className="min-h-10 bg-slate-50/50 print:bg-white p-2.5 rounded-lg border border-slate-200 text-xs text-slate-900 leading-relaxed font-sans">
                    {counselorNotes ? (
                      <p>{counselorNotes}</p>
                    ) : (
                      <p className="text-slate-500 italic text-[11px]">
                        {completedList.length > 0
                          ? "تمت دراسة إفادات المعلمين من قِبل التوجيه الطلابي، ويُوصى بتعزيز الجوانب الإيجابية والتنسيق المستمر لدعم التحصيل والانضباط الصفي."
                          : "بانتظار اكتمال ردود المعلمين لاعتماد التوصية الإرشادية والخطة المعتمدة للطالب."}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 6. Official Signatories & School Stamp (Clean 3-Column Box) */}
              <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-3 text-center text-xs avoid-break-inside">
                
                {/* 1. Counselor */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-600 font-bold block">الموجه الطلابي</span>
                  <div className="h-7 flex items-center justify-center">
                    <strong className="text-slate-950 font-black text-xs block">
                      {schoolSignatories.counselorName || "أ. الموجه الطلابي"}
                    </strong>
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-400">
                    التوقيع: ................................
                  </div>
                </div>

                {/* 2. Vice Principal */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-600 font-bold block">وكيل الشؤون التعليمية / شؤون الطلاب</span>
                  <div className="h-7 flex items-center justify-center">
                    <strong className="text-slate-950 font-black text-xs block">
                      {schoolSignatories.vicePrincipalName || "أ. وكيل المدرسة"}
                    </strong>
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-400">
                    التوقيع: ................................
                  </div>
                </div>

                {/* 3. Principal & Stamp */}
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-600 font-bold block">مدير المدرسة</span>
                  <div className="h-7 flex items-center justify-center">
                    <strong className="text-slate-950 font-black text-xs block">
                      {schoolSignatories.principalName || "أ. مدير المدرسة"}
                    </strong>
                  </div>
                  <div className="border-t border-dashed border-slate-400 pt-1 text-[10px] text-slate-400">
                    الختم والتوقيع الرسمي
                  </div>
                </div>

              </div>

              {/* Footer Note */}
              <div className="pt-2 text-center text-[9px] text-slate-400 border-t border-slate-200">
                وثيقة استعلام وتقييم رسمي صادرة آلياً من نظام إدارة شؤون الطلاب والتقييم الأكاديمي • معتمدة للاستخدام الإداري والإرشادي
              </div>

            </div>
          </div>

          {/* ========================================================================= */}
          {/* BATCH PRINT ALL STUDENTS (PRINT VIEW ONLY)                                */}
          {/* ========================================================================= */}
          {printMode === "all" && allAggregatedStudents.length > 0 && (
            <div className="hidden print:block space-y-8">
              {allAggregatedStudents.map((aggItem) => {
                const completedSubList = aggItem.teachersEvaluations.filter((t) => t.evaluation && t.status === "completed");
                
                return (
                  <div
                    key={aggItem.student.id}
                    className={`printable-a4-sheet bg-white p-0 space-y-4 text-slate-900 ${inkSaverMode ? "ink-saver-active" : ""}`}
                    style={{ pageBreakAfter: "always" }}
                  >
                    {/* Header */}
                    <div className="border-b-2 border-slate-900 pb-3 space-y-2">
                      <div className="grid grid-cols-3 items-center gap-2 text-xs font-bold text-slate-800">
                        <div className="space-y-0.5 text-right leading-tight">
                          <p className="text-[11px]">{schoolSignatories.countryName || "المملكة العربية السعودية"}</p>
                          <p className="text-[11px]">{schoolSignatories.ministryName || "وزارة التعليم"}</p>
                          <p className="text-slate-950 font-black text-xs">{schoolSignatories.schoolName || "ثانوية الأبناء الأولى"}</p>
                        </div>
                        <div className="text-center">
                          <span className="text-[10px] text-slate-500 font-mono">قسم التوجيه الطلابي • رؤية 2030</span>
                        </div>
                        <div className="text-left font-mono text-[10px]" dir="ltr">
                          <p>التاريخ: {new Date().toLocaleDateString("ar-SA")}</p>
                          <p>العام: {selectedAcademicYear}</p>
                        </div>
                      </div>
                      <div className="text-center pt-1">
                        <div className="inline-block px-4 py-1 border-2 border-slate-900 bg-white text-slate-950 rounded-xl text-xs font-black">
                          استمارة التقييم التجميعي الشامل للمعلمين عن الطالب: {aggItem.student.name}
                        </div>
                      </div>
                    </div>

                    {/* Student Info */}
                    <div className="border border-slate-400 p-2.5 rounded-xl bg-white grid grid-cols-4 gap-2 text-xs">
                      <div><span className="text-slate-500 block text-[10px]">الطالب:</span><strong className="text-slate-950">{aggItem.student.name}</strong></div>
                      <div><span className="text-slate-500 block text-[10px]">رقم الطالب:</span><strong>{aggItem.student.id || aggItem.student["رقم الطالب"] || aggItem.student.nationalId || "—"}</strong></div>
                      <div><span className="text-slate-500 block text-[10px]">الصف:</span><strong>{aggItem.student.grade || "—"}</strong></div>
                      <div><span className="text-slate-500 block text-[10px]">الشعبة:</span><strong>{aggItem.student.className || "—"}</strong></div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-right text-xs border border-slate-400 divide-y divide-slate-300">
                      <thead>
                        <tr className="bg-slate-100 text-slate-950 text-[11px]">
                          <th className="p-1.5 border-l border-slate-300">المادة</th>
                          <th className="p-1.5 border-l border-slate-300">المعلم</th>
                          <th className="p-1.5 text-center border-l border-slate-300">التحصيل</th>
                          <th className="p-1.5 text-center border-l border-slate-300">الانضباط</th>
                          <th className="p-1.5 text-center border-l border-slate-300">السلوك</th>
                          <th className="p-1.5 text-center border-l border-slate-300">المشاركة</th>
                          <th className="p-1.5 border-l border-slate-300">الملاحظات</th>
                          <th className="p-1.5 text-center">التوثيق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[11px]">
                        {aggItem.teachersEvaluations.map((t, i) => (
                          <tr key={i}>
                            <td className="p-1.5 font-bold border-l border-slate-200">{t.subject}</td>
                            <td className="p-1.5 border-l border-slate-200">{t.teacherName}</td>
                            <td className="p-1.5 text-center border-l border-slate-200">{t.evaluation?.academicLevel || t.evaluation?.academicAchievement || "—"}</td>
                            <td className="p-1.5 text-center border-l border-slate-200">{t.evaluation?.disciplineLevel || t.evaluation?.disciplineAndCommitment || "—"}</td>
                            <td className="p-1.5 text-center border-l border-slate-200">{t.evaluation?.behaviorLevel || t.evaluation?.behaviorAndEthics || "—"}</td>
                            <td className="p-1.5 text-center border-l border-slate-200">{t.evaluation?.participationLevel || t.evaluation?.participationAndInteraction || "—"}</td>
                            <td className="p-1.5 text-[10px] border-l border-slate-200">{t.evaluation?.teacherNotes || "—"}</td>
                            <td className="p-1.5 text-center font-bold">
                              {t.status === "completed" && t.evaluation ? "✓ معتمد" : "بانتظار الإفادة"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Signatures */}
                    <div className="pt-4 border-t-2 border-slate-900 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>الموجه الطلابي: <strong>{schoolSignatories.counselorName || "أ. الموجه الطلابي"}</strong></div>
                      <div>وكيل المدرسة: <strong>{schoolSignatories.vicePrincipalName || "أ. وكيل المدرسة"}</strong></div>
                      <div>مدير المدرسة: <strong>{schoolSignatories.principalName || "أ. مدير المدرسة"}</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Bottom Actions Bar (Hidden in Print) */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0 no-print">
          <div className="text-xs text-slate-600 font-medium hidden sm:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>التقرير مهيأ بدقة لمقاس A4 بهوامش 1.15 سم مع مراعاة توفير أحبار الطابعة بنسبة عالية.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePrint("single")}
              className="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>طباعة هذا التقرير (A4)</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
