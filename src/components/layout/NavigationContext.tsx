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
    timerRef.current = setTimeout(() => setIsNavigating(false), 900);
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
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm animate-fade-in" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-28 h-36 animate-page-swipe">
          <div className="absolute inset-0 rounded-2xl bg-white shadow-2xl border border-slate-200 transform rotate-2" />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-50 via-white to-blue-50 shadow-lg border border-slate-100 transform -rotate-1" />
          <div className="absolute inset-0 rounded-2xl bg-white shadow-md border border-slate-200 flex items-center justify-center">
            <div className="space-y-2 px-4">
              <div className="h-0.5 w-12 rounded-full bg-slate-300 mx-auto" />
              <div className="h-0.5 w-8 rounded-full bg-slate-200 mx-auto" />
              <div className="h-0.5 w-10 rounded-full bg-slate-300 mx-auto" />
              <div className="h-0.5 w-6 rounded-full bg-slate-200 mx-auto" />
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes page-swipe {
          0% { transform: translateX(-120%) rotate(-8deg); opacity: 0; }
          30% { transform: translateX(0) rotate(2deg); opacity: 1; }
          70% { transform: translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateX(120%) rotate(5deg); opacity: 0; }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        .animate-page-swipe { animation: page-swipe 0.7s cubic-bezier(0.22, 0.61, 0.36, 1) forwards; }
      `}</style>
    </div>
  );
}
