"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";

interface Grade {
  id: string;
  score: number;
  comments: string | null;
  graded_at: string | null;
  subject_name: string;
  period_name: string;
}

export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current
        .from("grades")
        .select("*, subjects(name), school_periods(name)")
        .order("graded_at", { ascending: false });
      if (data) {
        setGrades(data.map((g: Record<string, unknown>) => ({
          id: g.id as string,
          score: g.score as number,
          comments: g.comments as string | null,
          graded_at: g.graded_at as string | null,
          subject_name: (g.subjects as Record<string, string>)?.name || "",
          period_name: (g.school_periods as Record<string, string>)?.name || "",
        })));
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <PageHeader title="Notas" description="Tus calificaciones" />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : grades.length === 0 ? (
        <EmptyState title="No hay notas" description="Aún no tienes calificaciones registradas" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Materia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nota</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comentarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {grades.map((grade) => (
                <tr key={grade.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{grade.subject_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{grade.period_name}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${grade.score >= 7 ? "bg-green-100 text-green-700" : grade.score >= 5 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                      {grade.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{grade.comments || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}