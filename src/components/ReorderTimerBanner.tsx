import React from "react";
import { Timer, CheckCircle, AlertTriangle, Calendar } from "lucide-react";

interface CarryoverItem {
  key: string;
  name: string;
  carry: number;
  cap: number;
  daysLeft: number;
  startDate: string;
  endDate: string;
}

interface ReorderTimerBannerProps {
  carryovers: CarryoverItem[];
  branch: "القادسية" | "المروج";
  title?: string;
}

export default function ReorderTimerBanner({ carryovers = [], branch, title = "مؤقت وجدولة إعادة طلب أصناف الفواتير" }: ReorderTimerBannerProps) {
  // Extract and process our specific categories
  const pepsiActive = carryovers.find((c) => c.key === "pepsi");
  const plasticActive = carryovers.find((c) => c.key === "plastic");
  const saucesActive = carryovers.find((c) => c.key === "sauces");
  const dieselActive = carryovers.find((c) => c.key === "diesel");

  // Determine block status for the three categories requested:
  // 1. بيبسي ومشروبات (Pepsi)
  const pepsiBlocked = pepsiActive && pepsiActive.carry > 0;
  const pepsiDays = pepsiActive ? pepsiActive.daysLeft : 0;
  const pepsiDate = pepsiActive ? pepsiActive.endDate : "";

  // 2. بلاستيك ومغلفات (Plastic)
  const plasticBlocked = plasticActive && plasticActive.carry > 0;
  const plasticDays = plasticActive ? plasticActive.daysLeft : 0;
  const plasticDate = plasticActive ? plasticActive.endDate : "";

  // 3. الصلصات والمواد الأولية (Sauces & Diesel)
  const saucesBlocked = saucesActive && saucesActive.carry > 0;
  const dieselBlocked = dieselActive && dieselActive.carry > 0;
  const saucesDieselBlocked = saucesBlocked || dieselBlocked;

  const saucesDieselDays = Math.max(
    saucesBlocked && saucesActive ? saucesActive.daysLeft : 0,
    dieselBlocked && dieselActive ? dieselActive.daysLeft : 0
  );

  const dateSauces = saucesBlocked && saucesActive ? saucesActive.endDate : "";
  const dateDiesel = dieselBlocked && dieselActive ? dieselActive.endDate : "";
  const saucesDieselDate = dateSauces > dateDiesel ? dateSauces : dateDiesel;

  // The 3 final display categories
  const displayItems = [
    {
      key: "pepsi",
      label: "بيبسي ومشروبات",
      isBlocked: pepsiBlocked,
      daysLeft: pepsiDays,
      endDate: pepsiDate,
    },
    {
      key: "plastic",
      label: "بلاستيك ومغلفات",
      isBlocked: plasticBlocked,
      daysLeft: plasticDays,
      endDate: plasticDate,
    },
    {
      key: "sauces_materials",
      label: "الصلصات والمواد الأولية",
      isBlocked: saucesDieselBlocked,
      daysLeft: saucesDieselDays,
      endDate: saucesDieselDate,
    }
  ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm text-right rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-900 rounded-lg text-white">
            <Timer className="w-5 h-5 text-orange-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">{title}</h3>
            <p className="text-[10px] text-slate-500 font-bold mt-0.5">مؤشرات وجدولة زمنية لطلب فواتير الإمداد لفرع <span className="text-orange-600 font-extrabold">{branch}</span></p>
          </div>
        </div>
        <div className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1 rounded-full font-bold select-none">
          📊 تحديث حي من الحسبة الزمنية
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayItems.map((item) => {
          if (item.isBlocked) {
            // Orange warning card (No mention of "installments" or "amounts")
            const days = item.daysLeft;
            const daysText = 
              days === 1 
                ? "يوم واحد" 
                : days === 2 
                ? "يومين" 
                : days >= 3 && days <= 10 
                ? `${days} أيام` 
                : `${days} يوم`;

            return (
              <div 
                key={item.key} 
                className="bg-orange-50/70 border-2 border-orange-200 rounded-xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden transition-all duration-300 hover:shadow-md border-r-4 border-r-orange-500"
              >
                {/* Subtle background decoration */}
                <div className="absolute -top-6 -left-6 w-16 h-16 bg-orange-500/5 rounded-full pointer-events-none"></div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-orange-100 rounded-lg text-orange-700">
                      <AlertTriangle className="w-4 h-4" />
                    </span>
                    <span className="font-extrabold text-xs text-orange-950">
                      {item.label}
                    </span>
                  </div>
                  
                  <div className="text-xs font-black text-orange-900 leading-relaxed pt-1">
                    ستتمكن من إعادة الطلب بعد <span className="text-orange-600 underline font-black text-sm">{daysText}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] bg-orange-100/60 text-orange-950 font-bold px-2.5 py-1.5 rounded-lg border border-orange-200/50 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-orange-700 shrink-0" />
                  <span>تاريخ إتاحة الطلب: {item.endDate}</span>
                </div>
              </div>
            );
          } else {
            // Green success card (Available to order)
            return (
              <div 
                key={item.key} 
                className="bg-emerald-50/70 border-2 border-emerald-200 rounded-xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden transition-all duration-300 hover:shadow-md border-r-4 border-r-emerald-500"
              >
                {/* Subtle background decoration */}
                <div className="absolute -top-6 -left-6 w-16 h-16 bg-emerald-500/5 rounded-full pointer-events-none"></div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-100 rounded-lg text-emerald-700">
                      <CheckCircle className="w-4 h-4" />
                    </span>
                    <span className="font-extrabold text-xs text-emerald-950">
                      {item.label}
                    </span>
                  </div>
                  
                  <div className="text-xs font-black text-emerald-900 leading-relaxed pt-1">
                    نوع الصنف: <span className="font-extrabold text-emerald-800">{item.label}</span>
                  </div>
                  
                  <p className="text-[10px] text-emerald-750 font-bold leading-normal">
                    في حال هناك احتياج للطلبية يمكنك الطلب الآن
                  </p>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] bg-emerald-100/60 text-emerald-950 font-bold px-2.5 py-1.5 rounded-lg border border-emerald-200/50 mt-1 justify-center">
                  <span>✨ متاح للطلب الفوري</span>
                </div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
