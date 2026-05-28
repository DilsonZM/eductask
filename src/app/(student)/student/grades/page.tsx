"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";

interface SchoolPeriod {
  id: string;
  name: string;
  order: number;
  start_date: string;
  end_date: string;
}

interface SubjectGrade {
  subject_id: string;
  subject_name: string;
  scores: Record<string, number>;
  average: number;
}

export default function GradesPage() {
  const { user, loading: authLoading } = useAuth();
  const [periods, setPeriods] = useState<SchoolPeriod[]>([]);
  const [subjects, setSubjects] = useState<SubjectGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriodId, setCurrentPeriodId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const supabase = supabaseRef.current;

      const { data: student } = await supabase
        .from("students")
        .select("id, classroom_id")
        .eq("user_id", user.id)
        .single();

      if (!student) {
        setLoading(false);
        return;
      }

      const { data: activeYear } = await supabase
        .from("academic_years")
        .select("id")
        .eq("is_active", true)
        .single();

      const [periodsRes, csRes, gradesRes] = await Promise.all([
        supabase
          .from("school_periods")
          .select("id, name, order, start_date, end_date")
          .eq("academic_year_id", activeYear?.id ?? "")
          .order("order"),
        supabase
          .from("classroom_subjects")
          .select("id, subject_id, subjects(id, name)")
          .eq("classroom_id", student.classroom_id),
        supabase
          .from("grades")
          .select("classroom_subject_id, school_period_id, score")
          .eq("student_id", student.id),
      ]);

      const periodsData = periodsRes.data;
      const csData = csRes.data;
      const gradesData = gradesRes.data;

      if (periodsData) {
        setPeriods(periodsData);

        const today = new Date();
        const current = periodsData.find((p) => {
          const start = new Date(p.start_date);
          const end = new Date(p.end_date);
          return today >= start && today <= end;
        });
        if (current) setCurrentPeriodId(current.id);
      }

      if (csData && periodsData) {
        const accumulatedScores: Record<string, Record<string, number[]>> = {};

        if (gradesData) {
          for (const g of gradesData) {
            const csId = g.classroom_subject_id;
            if (!accumulatedScores[csId]) {
              accumulatedScores[csId] = {};
            }
            if (!accumulatedScores[csId][g.school_period_id]) {
              accumulatedScores[csId][g.school_period_id] = [];
            }
            accumulatedScores[csId][g.school_period_id].push(g.score);
          }
        }

        const subjectGrades: SubjectGrade[] = csData.map((cs) => {
          const scores: Record<string, number> = {};
          let total = 0;
          let count = 0;

          for (const period of periodsData) {
            const periodScores = accumulatedScores[cs.id]?.[period.id];
            if (periodScores && periodScores.length > 0) {
              const avg =
                periodScores.reduce((sum, s) => sum + s, 0) /
                periodScores.length;
              scores[period.id] = avg;
              total += avg;
              count++;
            }
          }

          const subjectName =
            (cs.subjects as unknown as { name: string })?.name || "Desconocido";

          return {
            subject_id: cs.subject_id,
            subject_name: subjectName,
            scores,
            average: count > 0 ? total / count : 0,
          };
        });

        setSubjects(subjectGrades);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  const getScoreColor = (score: number) => {
    if (score >= 7) return "bg-emerald-50 text-emerald-700";
    if (score >= 5) return "bg-amber-50 text-amber-700";
    return "bg-red-50 text-red-700";
  };

  const formatScore = (score: number) => {
    const rounded = Math.round(score * 10) / 10;
    return rounded.toFixed(1);
  };

  const overallAverage =
    subjects.filter((s) => s.average > 0).length > 0
      ? subjects
          .filter((s) => s.average > 0)
          .reduce((sum, s) => sum + s.average, 0) /
        subjects.filter((s) => s.average > 0).length
      : 0;

  if (authLoading || loading) return null;

  if (subjects.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Mis Calificaciones"
          description="Tu rendimiento académico por periodo"
        />
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <EmptyState
            title="Sin calificaciones"
            description="No tienes materias asignadas o aún no se han registrado calificaciones."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis Calificaciones"
        description="Tu rendimiento académico por periodo"
      />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[640px] w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                  Materia
                </th>
                {periods.map((period) => (
                  <th
                    key={period.id}
                    className={`px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] ${
                      period.id === currentPeriodId
                        ? "text-primary-600 bg-primary-50/50"
                        : "text-slate-500"
                    }`}
                  >
                    {period.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                  Promedio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((subject) => (
                <tr
                  key={subject.subject_id}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {subject.subject_name}
                  </td>
                  {periods.map((period) => {
                    const score = subject.scores[period.id];
                    return (
                      <td
                        key={period.id}
                        className={`px-4 py-3 text-center font-medium ${
                          period.id === currentPeriodId
                            ? "bg-primary-50/30"
                            : ""
                        }`}
                      >
                        {score !== undefined ? (
                          <span
                            className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-semibold ${getScoreColor(score)}`}
                          >
                            {formatScore(score)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    {subject.average > 0 ? (
                      <span
                        className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-bold ${getScoreColor(subject.average)}`}
                      >
                        {formatScore(subject.average)}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            {overallAverage > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-4 py-3 text-sm font-bold text-slate-700">
                    Promedio General
                  </td>
                  {periods.map((period) => {
                    const periodScores = subjects
                      .map((s) => s.scores[period.id])
                      .filter((s): s is number => s !== undefined);
                    const periodAvg =
                      periodScores.length > 0
                        ? periodScores.reduce((a, b) => a + b, 0) /
                          periodScores.length
                        : 0;
                    return (
                      <td
                        key={period.id}
                        className={`px-4 py-3 text-center font-bold ${
                          period.id === currentPeriodId
                            ? "bg-primary-50/50"
                            : ""
                        }`}
                      >
                        {periodAvg > 0 ? (
                          <span
                            className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-bold ${getScoreColor(periodAvg)}`}
                          >
                            {formatScore(periodAvg)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center font-bold">
                    <span
                      className={`inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 rounded-lg text-sm font-bold ${getScoreColor(overallAverage)}`}
                    >
                      {formatScore(overallAverage)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
