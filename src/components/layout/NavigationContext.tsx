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

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-swipe-line" />

      <div className="absolute inset-x-0 top-1/3 flex flex-col items-center justify-center gap-3">
        <div className="flex items-end gap-[3px] h-8 animate-lines-in">
          {[75, 55, 90, 40, 85, 60, 70, 45].map((w, i) => (
            <div key={i} className="rounded-full bg-primary-500/70" style={{
              width: `${w * 0.3}px`,
              opacity: 0,
              animation: `line-appear 0.5s ease-out ${i * 0.04}s forwards`,
              height: '2px',
            }} />
          ))}
        </div>
        <div className="h-3 w-1.5 rounded-sm bg-primary-500 animate-pen-draw" />
      </div>

      <style jsx>{`
        @keyframes swipe-line {
          0% { transform: translateX(-100%); }
          40% { transform: translateX(0); }
          60% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes line-appear {
          0% { transform: scaleX(0); opacity: 0; }
          100% { transform: scaleX(1); opacity: 1; }
        }
        @keyframes pen-draw {
          0% { transform: translateX(-8px) rotate(-15deg); opacity: 0; }
          40% { transform: translateX(0) rotate(0deg); opacity: 1; }
          80% { transform: translateX(8px) rotate(5deg); opacity: 0.8; }
          100% { transform: translateX(16px) rotate(10deg); opacity: 0; }
        }
        .animate-swipe-line { animation: swipe-line 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .animate-lines-in { animation: none; }
        .animate-pen-draw { animation: pen-draw 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s forwards; }
      `}</style>
    </div>
  );
}
