import { ReactNode } from "react";
import { FileQuestion, Plus } from "lucide-react";
import { Button } from "../ui/Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
        {icon || <FileQuestion className="w-8 h-8" />}
      </div>
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Sin resultados</p>
      <h3 className="text-lg font-semibold text-slate-900 mt-2 font-serif">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mt-1 max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-4" onClick={onAction}>
          <Plus className="w-4 h-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
