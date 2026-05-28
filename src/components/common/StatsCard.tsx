import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, description, icon, trend }: StatsCardProps) {
  return (
    <div className="bg-white/90 rounded-2xl p-6 border border-slate-200 shadow-card backdrop-blur kpi-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            {title}
          </p>
          <p className="text-3xl font-semibold text-slate-900 mt-2 font-serif">{value}</p>
          {description && (
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          )}
          {trend && (
            <p className={`text-sm mt-2 ${trend.isPositive ? "text-emerald-600" : "text-rose-600"}`}>
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}% vs mes anterior
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-primary-50 text-primary-700 shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  );
}
