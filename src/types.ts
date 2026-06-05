export interface Settings {
  رسوم_مدى: number; // e.g. 0.8
  رسوم_فيزا: number; // e.g. 1.5
  صرف_افتراضي: number; // e.g. 350
  سقف_بيبسي: number; // e.g. 400
  سقف_بلاستيك: number; // e.g. 100
  سقف_صلصات: number; // e.g. 150
  سقف_ديزل_قادسية: number; // e.g. 50
  سقف_ديزل_مروج: number; // e.g. 30
  زيادة_عالي: number; // e.g. 25 (%)
  نسبة_قادسية_ديزل: number; // e.g. 70
  نسبة_مروج_ديزل: number; // e.g. 30
  ايام_مقارنة: number; // e.g. 7
}

export interface ExtraPurchase {
  name: string;
  amt: number;
}

export interface OtherExpense {
  name: string;
  amt: number;
}

export interface DailyEntry {
  id: string; // e.g., branch-date
  date: string; // YYYY-MM-DD
  branch: 'القادسية' | 'المروج';
  sarf: number;
  cash_box: number;
  cash_purchases: number;
  
  // Detalized purchases
  pur_gas?: number;
  pur_bread?: number;
  pur_veg?: number;
  pur_groc?: number;
  pur_extras?: ExtraPurchase[];

  // POS mada/visa
  mada1: number;
  mada2: number;
  mada3: number;
  visa1: number;
  visa2: number;
  visa3: number;

  pos_net: number; // computed
  cash_net: number; // computed
  total_sales: number; // computed

  // Expenses
  makhzan: number;
  
  pepsi_paid: number;
  pepsi_type?: 'payment' | 'invoice';
  pepsi_carry_prev: number;
  pepsi_deduct: number;
  pepsi_carry_next: number;

  plastic_paid: number;
  plastic_type?: 'payment' | 'invoice';
  plastic_carry_prev: number;
  plastic_deduct: number;
  plastic_carry_next: number;

  sauces_paid: number;
  sauces_type?: 'payment' | 'invoice';
  sauces_carry_prev: number;
  sauces_deduct: number;
  sauces_carry_next: number;

  gas: number;
  vegetables: number;
  bread: number;
  grocery: number;

  diesel_paid: number;
  diesel_type?: 'payment' | 'invoice';
  diesel_carry_prev: number;
  diesel_deduct: number;
  diesel_carry_next: number;

  others: OtherExpense[];
  fixed_deduct: number;
  fixed_note: string;
  notes: string;

  pepsi_cap?: number;
  plastic_cap?: number;
  sauces_cap?: number;
  diesel_cap?: number;

  net_day: number; // computed net profit
}

export interface SharedDiesel {
  id: string;
  date: string;
  total: number;
  notes: string;
  q_share: number;
  m_share: number;
}

export interface TaxInvoiceItem {
  name: string;
  qty: string | number;
  price_with_tax: number;
  category?: string; // نوع السلعة لتتبع المشتريات والمخزون
}

export interface TaxInvoice {
  id: string;
  date: string;
  branch: 'القادسية' | 'المروج';
  company: string;
  invoice_no: string;
  invoice_date: string;
  amount: number;
  items?: TaxInvoiceItem[];
}

export interface Purchase {
  id: string;
  name: string; // اسم المنتج أو السلعة
  date: string; // تاريخ الشراء (YYYY-MM-DD)
  qty: number | string; // الكمية المشحونة أو المشتراة
  type: 'direct' | 'split'; // مباشر أم مجزأ
  price: number; // التكلفة الصافية
  branch: 'القادسية' | 'المروج' | 'الكل'; // الفرع
  status: 'active' | 'depleted'; // حالة المخزون: نشط أم نفذ بالكامل
  source: 'manual' | 'invoice'; // مصدر الإدخال: يدوي أم تلقائي من الكشوفات
  depletedDate?: string; // تاريخ نفاذ السلعة بالكامل من المخزون
  invoiceId?: string; // لربطه بالفاتورة أو اليومية
  category?: string; // نوع السلعة للتصنيف والمراقبة
}

export interface UnifiedUser {
  id: string; // Equal to username
  username: string;
  displayName: string;
  password: string;
  role: 'مدير' | 'محاسب' | 'مدخل فواتير';
  status: 'نشط' | 'موقوف';
  branch?: 'الكل' | 'القادسية' | 'المروج';
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  job: string;
  salary: number; // monthly base salary
  advanceLimitPercent: number; // default 25, manager can increase
  requiredArrivalTime: string; // e.g. "04:00 PM"
  requiredDepartureTime: string; // e.g. "01:00 AM"
  createdAt: string;
}

export interface EmployeeAdvance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  notes: string;
  createdAt: string;
}

export interface EmployeeAttendance {
  id: string; // employeeId-date
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  arrivalTime: string; // e.g. "04:15 PM"
  departureTime: string; // e.g. "01:00 AM"
  latenessMinutes: number;
  deductionAmount: number;
  oralWarning: boolean; // if true, it was simple lateness oral warning (first 3 times)
  latenessCategory: 'simple' | 'medium' | 'large' | 'severe' | 'none';
  notes: string;
  createdAt: string;
}

export interface EmployeeDeductionConfig {
  id: string;
  simpleThresholdMinutes: number; // default: 15
  mediumThresholdMinutes: number; // default: 30
  largeThresholdMinutes: number; // default: 60
  simpleMaxWarnings: number; // default: 3
  simpleDeductionHours: number; // default: 1
  mediumDeductionHours: number; // default: 3
  largeDeductionDayFraction: number; // default: 0.5 (half day)
  severeDeductionDayFraction: number; // default: 1.0 (full day)
  updatedAt?: string;
}


