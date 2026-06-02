"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { cn, formatDate } from "@/lib/utils";
import { BookOpen, Star, CheckCircle, Circle, ThumbsUp, ThumbsDown, FileText, Clock } from "lucide-react";

const CAT_LABELS: Record<string, string> = {
  taller: "Taller",
  trabajo: "Trabajo",
  quiz: "Quiz",
  participacion: "Participación",
  examen_final: "Examen Final",
};

const CAT_COLORS: Record<string, string> = {
  taller: "bg-amber-100 text-amber-700",
  trabajo: "bg-blue-100 text-blue-700",
  quiz: "bg-purple-100 text-purple-700",
  participacion: "bg-rose-100 text-rose-700",
  examen_final: "bg-red-100 text-red-700",
};

interface TaskRow {
  id: string;
  title: string;
  category: string | null;
  maxScore: number;
  dueDate: string;
  submission: { score: number | null; submittedAt: string | null } | null;
}

interface GradingConfig {
  weights: Record<string, number>;
  maxScore: number;
  bonusPartic: number;
}

export default function GradesPage() {
  const { user, loading: authLoading } = useAuth();
  const supabaseRef = useRef(createClient());
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<{ id: string; name: string; classroomSubjectId: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [config, setConfig] = useState<GradingConfig | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = supabaseRef.current;
      const { data: student } = await supabase
        .from("students")
        .select("id, classroom_id")
        .eq("user_id", user.id)
        .single();
      if (!student?.classroom_id) {
        setLoading(false);
        return;
      }

      const { data: csRows } = await supabase
        .from("classroom_subjects")
        .select("id, subjects(id, name)")
        .eq("classroom_id", student.classroom_id);

      const list = (csRows || [])
        .filter((r: any) => r.subjects)
        .map((r: any) => ({
          id: r.subjects.id,
          name: r.subjects.name,
          classroomSubjectId: r.id,
        }));
      setSubjects(list);
      if (list.length > 0) setSelectedSubject(list[0].classroomSubjectId);

      const allCsIds = list.map((s) => s.classroomSubjectId);

      const [tasksRes, configRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, category, max_score, due_date, classroom_subject_id")
          .in("classroom_subject_id", allCsIds)
          .eq("status", "published")
          .order("due_date"),
        supabase
          .from("subject_grading_config")
          .select("*")
          .in("classroom_subject_id", allCsIds),
      ]);

      const taskIds = (tasksRes.data || []).map((t) => t.id);
      const { data: subsData } = taskIds.length
        ? await supabase
            .from("submissions")
            .select("task_id, score, submitted_at")
            .eq("student_id", student.id)
            .in("task_id", taskIds)
        : { data: [] as { task_id: string; score: number | null; submitted_at: string | null }[] };

      setTasks(buildTaskRows(tasksRes.data || [], subsData || []));
      const cfg = (configRes.data || []).find((c: any) => c.classroom_subject_id === list[0]?.classroomSubjectId);
      setConfig(cfg ? buildConfig(cfg) : null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchData();
  }, [authLoading, fetchData]);

  const handleSubject = (csId: string) => {
    setSelectedSubject(csId);
    const supabase = supabaseRef.current;
    (async () => {
      const { data: cfgData } = await supabase
        .from("subject_grading_config")
        .select("*")
        .eq("classroom_subject_id", csId)
        .maybeSingle();
      setConfig(cfgData ? buildConfig(cfgData) : null);
    })();
  };

  const subjectName = subjects.find((s) => s.classroomSubjectId === selectedSubject)?.name || "";

  const { avg, gradedCount, totalCount } = useMemo(() => {
    const graded = tasks.filter((t) => t.submission?.score != null);
    if (graded.length === 0) return { avg: null, gradedCount: 0, totalCount: tasks.length };
    const sum = graded.reduce((acc, t) => acc + (t.submission!.score! / t.maxScore) * 10, 0);
    return {
      avg: Math.round((sum / graded.length) * 10) / 10,
      gradedCount: graded.length,
      totalCount: tasks.length,
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">Mis Calificaciones</h1>
        <p className="text-sm text-slate-500 mt-2">Tu rendimiento académico por materia y tarea</p>
      </div>

      {loading || authLoading ? (
        <ShimmerTable rows={5} cols={4} />
      ) : subjects.length === 0 ? (
        <EmptyState
          title="Sin materias"
          description="No tienes materias asignadas"
          icon={<BookOpen className="w-8 h-8" />}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500 mr-1">Materia:</span>
            {subjects.map((s) => (
              <button
                key={s.classroomSubjectId}
                onClick={() => handleSubject(s.classroomSubjectId)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  selectedSubject === s.classroomSubjectId
                    ? "bg-primary-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{subjectName}</h2>
                <p className="text-xs text-slate-500">
                  {totalCount === 0
                    ? "Sin tareas publicadas"
                    : `${gradedCount} de ${totalCount} tareas calificadas`}
                </p>
              </div>
              {avg !== null && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Promedio actual</p>
                  <p className="text-2xl font-bold text-primary-700">
                    {avg} <span className="text-sm font-medium text-slate-400">/ 10</span>
                  </p>
                </div>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No hay tareas publicadas para esta materia todavía
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        Tarea
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        Categoría
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">
                        Entrega
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">
                        Nota
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tasks.map((t) => {
                      const score = t.submission?.score;
                      const submitted = t.submission != null;
                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">
                            <p className="font-medium text-slate-900">{t.title}</p>
                            <p className="text-xs text-slate-500">Vence: {formatDate(t.dueDate)}</p>
                          </td>
                          <td className="px-4 py-3">
                            {t.category ? (
                              <span
                                className={cn(
                                  "inline-flex px-2 py-0.5 rounded-md text-xs font-medium",
                                  CAT_COLORS[t.category] || "bg-slate-100 text-slate-700"
                                )}
                              >
                                {CAT_LABELS[t.category] || t.category}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">Sin categoría</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {submitted ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600">
                                <CheckCircle className="w-3.5 h-3.5" /> Entregada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-400">
                                <Clock className="w-3.5 h-3.5" /> No entregada
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {score != null ? (
                              <span
                                className={cn(
                                  "inline-block rounded-lg px-2.5 py-1 text-sm font-semibold border",
                                  score >= 7
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : score >= 5
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                )}
                              >
                                {score} / {t.maxScore}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {score != null ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                                <CheckCircle className="w-3 h-3" /> Calificado
                              </span>
                            ) : submitted ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                                <Clock className="w-3 h-3" /> Por calificar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <Circle className="w-3 h-3" /> Pendiente
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {config && (
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                Configuración de evaluación
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
                {(["taller", "trabajo", "quiz", "participacion", "examen_final"] as const).map((cat) => {
                  const w =
                    cat === "participacion"
                      ? config.bonusPartic
                      : config.weights[cat] || 0;
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <span className="text-slate-600">{CAT_LABELS[cat]}</span>
                      <span className="font-semibold text-slate-900">
                        {cat === "participacion" ? `+${w} pts` : `${w}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function buildConfig(c: any): GradingConfig {
  return {
    weights: {
      taller: c.weight_taller || 0,
      trabajo: c.weight_trabajo || 0,
      quiz: c.weight_quiz || 0,
      examen_final: c.weight_examen_final || 0,
    },
    maxScore: c.max_score || 10,
    bonusPartic: c.weight_participacion || 0,
  };
}

function buildTaskRows(taskData: any[], subsData: any[]): TaskRow[] {
  const subByTask = new Map<string, { score: number | null; submittedAt: string | null }>();
  for (const s of subsData) {
    subByTask.set(s.task_id, { score: s.score, submittedAt: s.submitted_at });
  }
  return taskData.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    maxScore: t.max_score || 10,
    dueDate: t.due_date,
    submission: subByTask.get(t.id) || null,
  }));
}
