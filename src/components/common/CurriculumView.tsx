"use client";

import { useState } from "react";
import { FileText, Download, BookOpen } from "lucide-react";

interface CFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
}

interface PeriodData {
  periodId: string;
  periodName: string;
  order: number;
  content: string | null;
  files: CFile[];
}

interface CurriculumViewProps {
  periods: PeriodData[];
  accentColor: string;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CurriculumView({ periods, accentColor }: CurriculumViewProps) {
  const [activePeriod, setActivePeriod] = useState(0);

  if (periods.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-slate-400">
        <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        Sin períodos configurados
      </div>
    );
  }

  const current = periods[activePeriod];
  const hasContent = current?.content && current.content.trim() && current.content !== "<p></p>";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {periods.map((p, idx) => (
          <button
            key={p.periodId}
            type="button"
            onClick={() => setActivePeriod(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              idx === activePeriod
                ? `${accentColor.split(" ").find(c => c.startsWith("bg-")) || "bg-primary-500"} text-white shadow-sm`
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p.periodName}
          </button>
        ))}
      </div>

      {!hasContent ? (
        <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          Sin contenido registrado para este período
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-slate-50 rounded-xl p-4">
            <div
              className="text-sm text-slate-700 prose prose-sm max-w-none prose-headings:text-slate-900 prose-p:leading-relaxed prose-a:text-primary-600 prose-li:my-0.5"
              dangerouslySetInnerHTML={{ __html: current.content || "" }}
            />
          </div>

          {current.files.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Download className="w-3 h-3" /> Archivos adjuntos
              </p>
              {current.files.map((f) => (
                <a
                  key={f.id}
                  href={f.file_path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm hover:border-primary-300 hover:bg-primary-50/30 transition group"
                >
                  <FileText className="w-4 h-4 text-primary-500 shrink-0" />
                  <span className="flex-1 truncate text-slate-700 group-hover:text-primary-700">
                    {f.file_name}
                  </span>
                  {f.file_size != null && (
                    <span className="text-xs text-slate-400 shrink-0">
                      {formatFileSize(f.file_size)}
                    </span>
                  )}
                  <Download className="w-4 h-4 text-slate-300 group-hover:text-primary-500 shrink-0" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
