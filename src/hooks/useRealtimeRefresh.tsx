"use client";

import { useEffect, useState, useCallback } from "react";

export function useRealtimeRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  }, [onRefresh]);

  return { isRefreshing, refresh };
}

export function RealtimeProgressBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] h-0.5 bg-primary-100">
      <div className="h-full bg-primary-500 animate-realtime-progress" />
      <style jsx>{`
        @keyframes realtime-progress {
          0% { width: 0%; opacity: 0; }
          20% { width: 20%; opacity: 1; }
          60% { width: 70%; opacity: 1; }
          80% { width: 90%; opacity: 0.5; }
          100% { width: 100%; opacity: 0; }
        }
        .animate-realtime-progress {
          animation: realtime-progress 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
}
