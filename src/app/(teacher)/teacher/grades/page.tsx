"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import type { Tables } from "@/types/database";

type Grade = Tables<"grades"> & { student_name?: string; subject_name?: string; period_name?: string };

export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current
        .from("grades")
        .select("*, students(first_name, last_name), subjects(name), school_periods(name)")
        .order("created_at", { ascending: false });
      if (data) {
        setGrades(data.map((g) => ({
          ...g,
          student_name: `${(g.students as Record<string, string>)?.first_name || ""} ${(g.students as Record<string, string>)?.last_name || ""}`,
          subject_name: (g.subjects as Record<string, string>)?.name || "",
          period_name: (g.school_periods as Record<string, string>)?.name || "",
        })) as Grade[]);
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
      <PageHeader title="Notas" description="Ver y gestionar calificaciones" />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : grades.length === 0 ? (
        <EmptyState title="No hay notas" description="Las calificaciones aparecerán aquí" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alumno</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Materia</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Período</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nota</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comentarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {grades.map((grade) => (
                <tr key={grade.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{grade.student_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{grade.subject_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{grade.period_name}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{grade.score}</td>
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