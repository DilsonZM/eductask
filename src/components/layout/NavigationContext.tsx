"use client";

import { useRouter, usePathname } from "next/navigation";
import { createContext, useContext, useRef, useState, useEffect, useCallback } from "react";

type NavigationContextValue = {
  navigateTo: (url: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsNavigating(false);
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, [pathname]);

  const navigateTo = useCallback((url: string) => {
    if (url === pathname) return;
    setIsNavigating(true);
    router.push(url);
    timerRef.current = setTimeout(() => setIsNavigating(false), 700);
  }, [pathname, router]);

  const value: NavigationContextValue = { navigateTo };

  return (
    <NavigationContext.Provider value={value}>
      {children}
      <TransitionOverlay active={isNavigating} />
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) throw new Error("useNavigation must be used within NavigationProvider");
  return context;
}

function TransitionOverlay({ active }: { active: boolean }) {
  if (!active) return null;

  const pieces = [
    { x: -70, y: -55, r: -20, w: 26, h: 34 },
    { x: 80, y: -45, r: 15, w: 30, h: 38 },
    { x: -55, y: 60, r: 12, w: 22, h: 30 },
    { x: 60, y: 50, r: -18, w: 28, h: 36 },
    { x: -25, y: -70, r: -8, w: 24, h: 32 },
    { x: 35, y: -25, r: 10, w: 32, h: 40 },
    { x: -45, y: 15, r: -6, w: 22, h: 30 },
    { x: 15, y: 35, r: -14, w: 26, h: 34 },
  ];

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px] animate-cloud" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-20 h-28">
          {pieces.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-lg bg-white border border-slate-200/60"
              style={{
                width: `${p.w}px`,
                height: `${p.h}px`,
                left: '50%',
                top: '50%',
                marginLeft: `-${p.w / 2}px`,
                marginTop: `-${p.h / 2}px`,
                animation: `assemble 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.025}s forwards`,
                '--tx': `${p.x}px`,
                '--ty': `${p.y}px`,
                '--tr': `${p.r}deg`,
              } as React.CSSProperties}
            >
            <div className="px-2 py-1.5 space-y-1 opacity-30">
              <div className="h-[1.5px] rounded-full bg-slate-300" style={{ width: `${60 + (i % 3) * 15}%` }} />
              <div className="h-[1.5px] rounded-full bg-slate-200" />
              <div className="h-[1.5px] rounded-full bg-slate-300" style={{ width: `${45 + (i % 4) * 12}%` }} />
            </div>
          </div>
        ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes cloud {
          0% { opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes assemble {
          0% {
            transform: translate(var(--tx), var(--ty)) rotate(var(--tr)) scale(0.5);
            opacity: 0.2;
            box-shadow: 0 0 0 rgba(0,0,0,0);
          }
          100% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
            box-shadow: 0 2px 15px rgba(0,0,0,0.06);
          }
        }
        .animate-cloud { animation: cloud 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
}
