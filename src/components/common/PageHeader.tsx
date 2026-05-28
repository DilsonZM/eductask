import { Button } from "../ui/Button";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Panel</p>
        <h1 className="text-3xl font-semibold text-slate-900 mt-1 font-serif">{title}</h1>
        {description && (
          <p className="text-slate-500 mt-2 max-w-xl">{description}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
