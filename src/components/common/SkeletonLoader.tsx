export function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-slate-100 ${className || "h-4 w-full"}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export function ShimmerCard() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <ShimmerBlock className="h-4 w-24" />
          <ShimmerBlock className="h-8 w-16" />
          <ShimmerBlock className="h-3 w-32" />
        </div>
        <ShimmerBlock className="w-12 h-12 rounded-lg" />
      </div>
    </div>
  );
}

export function ShimmerTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="h-10 bg-white rounded-lg flex items-center px-4 gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <ShimmerBlock key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="h-12 bg-white rounded-lg flex items-center px-4 gap-4">
          {Array.from({ length: cols }).map((_, ci) => (
            <ShimmerBlock key={ci} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ShimmerList({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-slate-100 flex items-center gap-3">
          <ShimmerBlock className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <ShimmerBlock className="h-4 w-2/3" />
            <ShimmerBlock className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShimmerGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonLoader({ variant = "content" }: { variant?: "content" | "page" }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-primary-500 animate-spin" />
      <p className="text-sm text-slate-400">{variant === "page" ? "Cargando..." : "Preparando panel..."}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-200/80 rounded ${className}`} />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="h-10 bg-slate-200 rounded grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="bg-slate-300 rounded m-2" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="h-12 bg-slate-100 rounded grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="bg-slate-200 rounded m-2" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="w-12 h-12 rounded-lg" />
      </div>
    </div>
  );
}
