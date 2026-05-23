"use client";

interface NotebookLoaderProps {
  label?: string;
}

export function NotebookLoader({ label = "Cargando tu cuaderno" }: NotebookLoaderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#eef4ff_45%,_#ffffff_100%)] px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-28 w-28">
          <div className="absolute inset-0 rounded-[28px] bg-white shadow-[0_20px_60px_rgba(37,99,235,0.12)] border border-blue-100" />
          <div className="absolute left-7 top-4 h-20 w-14 overflow-hidden rounded-lg bg-white shadow-inner border border-blue-100">
            <div className="absolute inset-x-2 top-3 h-[2px] rounded-full bg-blue-200" />
            <div className="absolute inset-x-2 top-7 h-[2px] rounded-full bg-blue-200" />
            <div className="absolute inset-x-2 top-11 h-[2px] rounded-full bg-blue-200" />
            <div className="absolute inset-x-2 top-15 h-[2px] rounded-full bg-blue-200" />
            <div className="page-flip absolute inset-0 origin-left rounded-lg bg-gradient-to-br from-white via-blue-50 to-blue-100" />
            <div className="page-shadow absolute inset-0 rounded-lg" />
          </div>
          <div className="absolute left-5 top-6 h-16 w-2 rounded-full bg-primary-200" />
          <div className="absolute right-5 top-6 h-16 w-2 rounded-full bg-primary-200" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-600">
            EducTask
          </p>
          <p className="text-lg font-semibold text-gray-900">{label}</p>
          <p className="text-sm text-gray-500">Abriendo páginas, preparando tu sesión.</p>
        </div>
      </div>
    </div>
  );
}