"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext } from "react";

type NavigationContextValue = {
  navigateTo: (url: string) => void;
};

const NavigationContext = createContext<NavigationContextValue | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const value: NavigationContextValue = {
    navigateTo: (url: string) => {
      router.push(url);
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
