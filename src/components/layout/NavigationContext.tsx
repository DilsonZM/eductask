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
    timerRef.current = setTimeout(() => setIsNavigating(false), 1600);
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
      <div className="absolute inset-0 bg-white/60 animate-fog" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="relative w-14 h-16 z-10 animate-book">
            <div className="absolute inset-0 rounded-r-lg rounded-l-sm bg-white border border-slate-300 shadow-md flex items-center justify-center">
              <div className="absolute left-2 right-2 top-3 space-y-1.5">
                <div className="h-[1.5px] rounded-full bg-slate-300" />
                <div className="h-[1.5px] rounded-full bg-slate-200 w-3/4" />
                <div className="h-[1.5px] rounded-full bg-slate-300" />
              </div>
            </div>
            <div className="absolute inset-0 rounded-r-lg rounded-l-sm bg-white border border-slate-300 shadow-sm origin-left animate-page-flip">
              <div className="absolute left-2 right-2 top-3 space-y-1.5">
                <div className="h-[1.5px] rounded-full bg-slate-300" />
                <div className="h-[1.5px] rounded-full bg-slate-200 w-2/3" />
              </div>
            </div>
          </div>

          <div className="absolute w-24 h-24 rounded-full border-[3px] border-primary-100 animate-ring" />
          <div className="absolute w-24 h-24 rounded-full border-[3px] border-transparent border-t-primary-500 animate-ring-spin" />
        </div>
      </div>

      <style jsx>{`
        @keyframes fog {
          0% { opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes ring {
          0% { opacity: 0; transform: scale(0.5); }
          30% { opacity: 1; transform: scale(1); }
          80% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(1.3); }
        }
        @keyframes ring-spin {
          0% { transform: rotate(0deg); opacity: 0; }
          20% { transform: rotate(90deg); opacity: 1; }
          100% { transform: rotate(360deg); opacity: 0; }
        }
        @keyframes book {
          0% { transform: scale(0.6); opacity: 0; }
          25% { transform: scale(1); opacity: 1; }
          85% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0; }
        }
        @keyframes page-flip {
          0% { transform: rotateY(0deg); }
          20% { transform: rotateY(0deg); }
          40% { transform: rotateY(-60deg); }
          60% { transform: rotateY(-120deg); }
          80% { transform: rotateY(-160deg); }
          100% { transform: rotateY(-180deg); }
        }
        .animate-fog { animation: fog 1.5s ease-out forwards; }
        .animate-ring { animation: ring 1.5s ease-out forwards; }
        .animate-ring-spin { animation: ring-spin 1.5s linear forwards; }
        .animate-book { animation: book 1.5s ease-out forwards; }
        .animate-page-flip { animation: page-flip 1.5s ease-in-out forwards; transform-origin: left center; backface-visibility: hidden; }
      `}</style>
    </div>
  );
}
