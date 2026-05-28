"use client";

import { useEffect, useState } from "react";

interface Props {
  onDone: () => void;
}

const MESSAGES = [
  "Guardando tu progreso...",
  "Cerrando tu sesion...",
  "Nos vemos pronto",
  "Hasta luego!",
];

export function LogoutOverlay({ onDone }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 600);
    const t2 = setTimeout(() => setStep(2), 1300);
    const t3 = setTimeout(() => setStep(3), 1800);
    const t4 = setTimeout(() => onDone(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30 animate-fadeIn">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24">
          <div className="absolute inset-0 rounded-full border-[3px] border-primary-100" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary-400 check-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 sm:w-9 sm:h-9 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary-600 mb-3">EducTask</p>
          <p className="text-xl sm:text-2xl font-semibold text-slate-800 font-serif transition-all duration-500">
            {MESSAGES[step]}
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes checkSpin { to { transform: rotate(360deg); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .check-spin { animation: checkSpin 1.2s linear infinite; }
      `}</style>
    </div>
  );
}
