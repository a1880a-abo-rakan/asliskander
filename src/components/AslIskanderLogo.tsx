import React from "react";

interface LogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
}

export function AslIskanderLogoSymbol({ size = 80, className = "" }: { size?: number | string; className?: string }) {
  return (
    <div 
      className={`relative flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_4px_12px_rgba(240,105,39,0.25)] transition-all duration-500 hover:scale-105 hover:rotate-6"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Circular Ring */}
        <circle 
          cx="50" 
          cy="50" 
          r="43" 
          stroke="#f06927" 
          strokeWidth="4" 
          className="stroke-[f06927] hover:stroke-[#e01c24] transition-colors"
        />

        {/* Vertical Skewer Shaft */}
        <rect 
          x="48" 
          y="18" 
          width="4" 
          height="64" 
          rx="2" 
          fill="#e01c24" 
        />

        {/* meat slice 1 (Top - Yellowish Gold) */}
        <rect 
          x="23" 
          y="31" 
          width="54" 
          height="8.5" 
          rx="4.25" 
          fill="#f5b025" 
        />

        {/* meat slice 2 (Orange) */}
        <rect 
          x="27.5" 
          y="44" 
          width="45" 
          height="8.5" 
          rx="4.25" 
          fill="#f2792c" 
        />

        {/* meat slice 3 (Reddish-Orange) */}
        <rect 
          x="32" 
          y="57" 
          width="36" 
          height="8.5" 
          rx="4.25" 
          fill="#e6472b" 
        />

        {/* meat slice 4 (Bottom - Crimson) */}
        <rect 
          x="36.5" 
          y="70" 
          width="27" 
          height="8.5" 
          rx="4.25" 
          fill="#e01c24" 
        />
      </svg>
    </div>
  );
}

export function AslIskanderText({ className = "" }: { className?: string }) {
  return (
    <div className={`font-mono tracking-[0.25em] text-slate-100 flex items-center justify-center gap-1 flex-row-reverse select-none ${className}`}>
      <span className="text-[#f5b025] font-extrabold">a</span>
      <span className="text-[#f5b025] font-extrabold">s</span>
      <span className="text-[#f2792c] font-extrabold">l</span>
      <span className="text-[#f2792c] font-extrabold">i</span>
      <span className="text-[#e6472b] font-extrabold">s</span>
      <span className="text-[#e6472b] font-extrabold">k</span>
      <span className="text-[#e01c24] font-extrabold">a</span>
      <span className="text-[#e01c24] font-extrabold">n</span>
      <span className="text-[#e01c24] font-extrabold">d</span>
      <span className="text-[#e01c24] font-extrabold">e</span>
      <span className="text-[#e01c24] font-extrabold">r</span>
    </div>
  );
}

export default function AslIskanderLogo({ className = "", size = 120, showText = true }: LogoProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <AslIskanderLogoSymbol size={size} />
      {showText && <AslIskanderText className="text-xs font-semibold" />}
    </div>
  );
}
