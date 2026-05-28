"use client";

import { useRouter, usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type NavigationContextValue = {
  isNavigating: boolean;
  navigateTo: (url: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsNavigating(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pathname]);

  const value: NavigationContextValue = {
    isNavigating,
    navigateTo: (url: string) => {
      setIsNavigating(true);
      requestAnimationFrame(() => {
        router.push(url);
      });
      timeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        timeoutRef.current = null;
      }, 8000);
    },
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}

export function NavigationOverlay() {
  const { isNavigating } = useNavigation();

  if (!isNavigating) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-24 w-24 sm:h-28 sm:w-28">
          <div className="absolute inset-0 rounded-[24px] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.12)] border border-slate-200" />
          <div className="absolute left-6 top-4 h-16 w-12 sm:left-7 sm:top-4 sm:h-20 sm:w-14 overflow-hidden rounded-lg bg-white shadow-inner border border-slate-200">
            <div className="absolute inset-x-2 top-3 h-[2px] rounded-full bg-slate-200" />
            <div className="absolute inset-x-2 top-7 h-[2px] rounded-full bg-slate-200" />
            <div className="absolute inset-x-2 top-11 h-[2px] rounded-full bg-slate-200" />
            <div className="absolute inset-x-2 top-15 h-[2px] rounded-full bg-slate-200" />
            <div className="page-flip absolute inset-0 origin-left rounded-lg bg-gradient-to-br from-white via-blue-50 to-blue-100" />
            <div className="page-shadow absolute inset-0 rounded-lg" />
          </div>
          <div className="absolute left-4 top-6 h-14 w-2 sm:left-5 sm:top-6 sm:h-16 rounded-full bg-primary-200" />
          <div className="absolute right-4 top-6 h-14 w-2 sm:right-5 sm:top-6 sm:h-16 rounded-full bg-primary-200" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-700">
            EducTask
          </p>
          <p className="text-lg sm:text-xl font-semibold text-slate-900 font-serif">Hojeando páginas</p>
          <p className="text-sm text-slate-500">Preparando tu sesión...</p>
        </div>
      </div>
    </div>
  );
}
