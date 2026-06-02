"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { createNotifications } from "@/lib/notifications";
import { Save, ExternalLink, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskOption = {
  id: string;
  title: string;
  subject_name: string;
  due_date: string;
  max_score: number;
  classroom_subject_id: string;
  classroom_id: string;
  school_period_id: string;
};

interface SubmissionFile {
  id: string;
  file_path: string;
  file_name: string;
}

interface SubmissionRow {
  id: string;
  student_id: string;
  student_name: string;
  files: SubmissionFile[];
  submitted_at: string | null;
  score: number | null;
  teacher_comment: string | null;
  status: "on-time" | "late" | "missing";
}

export default function SubmissionsPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());

  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [nonSubmitters, setNonSubmitters] = useState<{ student_id: string; student_name: string }[]>([]);

  const [editingScores, setEditingScores] = useState<Record<string, number | null>>({});
  const [editingComments, setEditingComments] = useState<Record<string, string | null>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const loadTasks = useCallback(async () => {
    if (!user) return;
    try {
      const { data: teacher } = await supabaseRef.current
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!teacher) {
        setLoadingTasks(false);
        return;
      }

      setTeacherId(teacher.id);

      const { data: tasksData } = await supabaseRef.current
        .from("tasks")
        .select("*, classroom_subjects!inner(id, classroom_id, subjects!inner(name))")
        .eq("teacher_id", teacher.id)
        .in("status", ["published", "closed"])
        .order("due_date", { ascending: true });

      if (tasksData) {
        const mapped = tasksData.map((t: Record<string, unknown>) => {
            const cs = t.classroom_subjects as Record<string, unknown>;
            const subjects = cs?.subjects as Record<string, unknown>;
            return {
              id: t.id as string,
              title: t.title as string,
              subject_name: (subjects?.name as string) || "",
              due_date: t.due_date as string,
              max_score: (t.max_score as number) || 10,
              classroom_subject_id: t.classroom_subject_id as string,
              classroom_id: (cs?.classroom_id as string) || "",
              school_period_id: t.school_period_id as string,
            };
          });
        setTasks(mapped);
        if (mapped.length > 0) {
          setSelectedTaskId(mapped[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  }, [user]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const selectedTaskData = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const loadSubmissions = useCallback(
    async (task: TaskOption) => {
      setLoadingSubmissions(true);
      try {
        const { data: subsData } = await supabaseRef.current
          .from("submissions")
          .select("*, students!inner(first_name, last_name), submission_files(*)")
          .eq("task_id", task.id);

        const submitters = new Set<string>();
        const rows: SubmissionRow[] = [];

        if (subsData) {
          for (const s of subsData) {
            const student = s.students as Record<string, string>;
            const submittedAt = s.submitted_at ? new Date(s.submitted_at) : null;
            const dueDate = new Date(task.due_date);
            submitters.add(s.student_id as string);

            rows.push({
              id: s.id as string,
              student_id: s.student_id as string,
              student_name: `${student?.first_name || ""} ${student?.last_name || ""}`.trim(),
              files: ((s as Record<string, unknown>).submission_files as SubmissionFile[]) || [],
              submitted_at: s.submitted_at as string | null,
              score: (s as Record<string, number | null>).score ?? null,
              teacher_comment: (s as Record<string, string | null>).teacher_comment ?? null,
              status: !submittedAt
                ? "missing"
                : submittedAt > dueDate
                  ? "late"
                  : "on-time",
            });
          }
        }

        const { data: classroomStudents } = await supabaseRef.current
          .from("students")
          .select("id, first_name, last_name")
          .eq("classroom_id", task.classroom_id)
          .eq("status", "active");

        const missing: { student_id: string; student_name: string }[] = [];
        if (classroomStudents) {
          for (const st of classroomStudents) {
            if (!submitters.has(st.id)) {
              missing.push({
                student_id: st.id,
                student_name: `${st.first_name} ${st.last_name}`.trim(),
              });
            }
          }
        }

        setSubmissions(rows);
        setNonSubmitters(missing);

        const scoresInit: Record<string, number | null> = {};
        const commentsInit: Record<string, string | null> = {};
        for (const row of rows) {
          scoresInit[row.id] = row.score;
          commentsInit[row.id] = row.teacher_comment;
        }
        setEditingScores(scoresInit);
        setEditingComments(commentsInit);
      } catch (error) {
        console.error("Error loading submissions:", error);
      } finally {
        setLoadingSubmissions(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedTaskId && tasks.length > 0) {
      const task = tasks.find((t) => t.id === selectedTaskId);
      if (task) loadSubmissions(task);
    }
  }, [selectedTaskId, tasks, loadSubmissions]);

  const handleTaskChange = (value: string) => {
    setSelectedTaskId(value);
    setSubmissions([]);
    setNonSubmitters([]);
    if (value) {
      const task = tasks.find((t) => t.id === value);
      if (task) {
        loadSubmissions(task);
      }
    }
  };

  const getDownloadUrl = (filePath: string) => {
    return supabaseRef.current.storage
      .from("edutask-submissions")
      .getPublicUrl(filePath).data.publicUrl;
  };

  const handleSave = async (submissionId: string) => {
    setSavingIds((prev) => new Set(prev).add(submissionId));
    try {
      const score = editingScores[submissionId];
      const teacher_comment = editingComments[submissionId];

      const { error } = await supabaseRef.current
        .from("submissions")
        .update({ score, teacher_comment })
        .eq("id", submissionId);

      if (error) throw error;

      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId
            ? { ...s, score: score ?? null, teacher_comment: teacher_comment ?? null }
            : s
        )
      );

      const submission = submissions.find((s) => s.id === submissionId);
      const task = selectedTaskData;
      if (submission && task && teacherId) {
        const { data: existing } = await supabaseRef.current
          .from("grades")
          .select("id")
          .eq("student_id", submission.student_id)
          .eq("classroom_subject_id", task.classroom_subject_id)
          .eq("school_period_id", task.school_period_id)
          .single();

        if (existing) {
          await supabaseRef.current.from("grades").update({
            score, graded_at: new Date().toISOString(),
          }).eq("id", existing.id);
        } else {
          await supabaseRef.current.from("grades").insert({
            student_id: submission.student_id,
            teacher_id: teacherId,
            classroom_subject_id: task.classroom_subject_id,
            school_period_id: task.school_period_id,
            score, graded_at: new Date().toISOString(),
          });
        }
      }

      toast.success("Calificación guardada");
      if (submission && score != null) {
        const { data: student } = await supabaseRef.current.from("students").select("user_id, first_name").eq("id", submission.student_id).single();
        if (student) {
          await createNotifications([{
            user_id: student.user_id,
            type: "grade",
            title: "Tarea calificada",
            message: `Recibiste ${score} en "${task?.title || "una tarea"}"`,
            link: "/student/grades",
          }]);
        }
      }
    } catch (error) {
      console.error("Error saving grade:", error);
      toast.error("Error al guardar la calificación");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
    }
  };

  const statusBadge = (status: SubmissionRow["status"]) => {
    switch (status) {
      case "on-time":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Clock className="w-3 h-3" />A tiempo
          </span>
        );
      case "late":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" />Tarde
          </span>
        );
      case "missing":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            Sin entregar
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Entregas" description="Revisar y calificar entregas de los alumnos" />

      {loadingTasks ? (<ShimmerTable rows={5} cols={4} />) : tasks.length === 0 ? (
        <EmptyState
          title="No hay tareas publicadas"
          description="Publica una tarea primero para ver sus entregas aquí"
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600 mr-1">Tarea:</span>
            {tasks.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTaskChange(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm transition-all text-left max-w-xs truncate",
                  selectedTaskId === t.id
                    ? "bg-primary-500 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {t.title}
                <span className={cn("block text-xs mt-0.5", selectedTaskId === t.id ? "text-primary-100" : "text-slate-400")}>
                  {t.subject_name} · {new Date(t.due_date).toLocaleDateString("es-ES")}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedTaskId && selectedTaskData && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-slate-500">
                Materia: <strong className="text-slate-700">{selectedTaskData.subject_name}</strong>
              </span>
              <span className="text-slate-500">
                Entrega límite:{" "}
                <strong className="text-slate-700">
                  {formatDateTime(selectedTaskData.due_date)}
                </strong>
              </span>
              <span className="text-slate-500">
                Puntaje máx:{" "}
                <strong className="text-slate-700">{selectedTaskData.max_score}</strong>
              </span>
            </div>
          </div>

          {loadingSubmissions ? (<ShimmerTable rows={5} cols={4} />) : submissions.length === 0 && nonSubmitters.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Sin datos" description="No se encontraron estudiantes en este curso" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      Alumno
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      Fecha de entrega
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      Archivo
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      Calificación
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      Comentario
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900 font-medium">
                        {sub.student_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {sub.submitted_at ? formatDateTime(sub.submitted_at) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {sub.files.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {sub.files.map((f) => (
                              <a
                                key={f.id}
                                href={getDownloadUrl(f.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-primary-700"
                              >
                                <span className="max-w-[140px] truncate">{f.file_name}</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 transition-colors">
                                  Ver <ExternalLink className="w-3 h-3" />
                                </span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{statusBadge(sub.status)}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={selectedTaskData.max_score}
                          step={0.1}
                          value={editingScores[sub.id] ?? ""}
                          onChange={(e) =>
                            setEditingScores((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value ? parseFloat(e.target.value) : null,
                            }))
                          }
                          className="w-20 px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          placeholder="—"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          rows={1}
                          value={editingComments[sub.id] ?? ""}
                          onChange={(e) =>
                            setEditingComments((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value || null,
                            }))
                          }
                          className="w-full min-w-[140px] px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                          placeholder="Comentario..."
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          onClick={() => handleSave(sub.id)}
                          isLoading={savingIds.has(sub.id)}
                        >
                          <Save className="w-3.5 h-3.5" />
                          Guardar
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {nonSubmitters.map((ns) => (
                    <tr key={ns.student_id} className="bg-red-50/30 hover:bg-red-50/50">
                      <td className="px-4 py-3 text-sm text-slate-500 font-medium">
                        {ns.student_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">—</td>
                      <td className="px-4 py-3 text-sm text-slate-400">—</td>
                      <td className="px-4 py-3">{statusBadge("missing")}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">—</td>
                      <td className="px-4 py-3 text-sm text-slate-400">—</td>
                      <td className="px-4 py-3 text-sm text-slate-400">—</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
