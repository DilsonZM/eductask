"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerGrid } from "@/components/common/SkeletonLoader";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import {
  Upload,
  Download,
  Clock,
  BookOpen,
  Calendar,
  Award,
  ExternalLink,
  X,
  UserCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import { createNotifications } from "@/lib/notifications";

interface TaskRaw {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  teacher_id: string | null;
  classroom_subject_id: string | null;
  due_date: string;
  max_score: number;
  allow_late: boolean;
  status: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  classroom_subjects?: any;
}

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  teacher_id: string | null;
  teacherName: string;
  classroom_subject_id: string | null;
  due_date: string;
  max_score: number;
  allow_late: boolean;
  status: string;
  subjectName: string;
  subjectCode: string;
}

interface SubmissionData {
  id: string;
  task_id: string;
  student_id: string;
  file_path: string;
  file_name: string;
  submitted_at: string;
  comments: string | null;
  score: number | null;
  teacher_comment: string | null;
}

interface AttachmentData {
  id: string;
  task_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
}

type TabType = "todas" | "pendientes" | "entregadas" | "calificadas";

const TABS: { key: TabType; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "pendientes", label: "Pendientes" },
  { key: "entregadas", label: "Entregadas" },
  { key: "calificadas", label: "Calificadas" },
];

const SUBJECT_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  { bg: "bg-lime-100", text: "text-lime-700" },
];

const ACCEPTED_FILE_TYPES =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.webp,.txt";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 3;

function getSubjectColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function getDaysRemaining(dueDate: string): number {
  const diff = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getDaysRemainingLabel(dueDate: string): string {
  const days = getDaysRemaining(dueDate);
  if (days < 0) return "Vencida";
  if (days === 0) return "Hoy";
  if (days === 1) return "1 día";
  return `${days} días`;
}

function isOverdue(dueDate: string): boolean {
  return getDaysRemaining(dueDate) < 0;
}

function getTaskStatus(
  taskId: string,
  taskSubmissions?: SubmissionData[],
  overdue?: boolean
): { label: string; className: string } {
  if (taskSubmissions && taskSubmissions.some((s) => s.score != null)) {
    return { label: "Calificada", className: "bg-emerald-100 text-emerald-700" };
  }
  if (taskSubmissions && taskSubmissions.length > 0) {
    return { label: "Entregada", className: "bg-blue-100 text-blue-700" };
  }
  if (overdue) {
    return { label: "Vencida", className: "bg-rose-100 text-rose-700" };
  }
  return { label: "Pendiente", className: "bg-amber-100 text-amber-700" };
}

export default function TasksPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionData[]>>({});
  const [attachments, setAttachments] = useState<Record<string, AttachmentData[]>>({});
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>("todas");
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [comments, setComments] = useState("");
  const [uploading, setUploading] = useState(false);

  const extractSubject = useCallback((t: TaskRaw): { name: string; code: string } => {
    const cs = t.classroom_subjects;
    if (cs && typeof cs === "object") {
      const subjects = "subjects" in cs ? (cs as Record<string, unknown>).subjects : null;
      if (subjects && typeof subjects === "object") {
        const s = subjects as Record<string, string>;
        return { name: s.name || "Sin materia", code: s.code || "" };
      }
      if (Array.isArray(cs) && cs.length > 0 && cs[0]?.subjects) {
        const s = cs[0].subjects as Record<string, string>;
        return { name: s.name || "Sin materia", code: s.code || "" };
      }
    }
    return { name: "Sin materia", code: "" };
  }, []);

  const fetchData = useCallback(async () => {
    const supabase = supabaseRef.current;
    const userId = user?.id;
    if (!userId) return;

    try {
      const { data: student } = await supabase
        .from("students")
        .select("id, classroom_id")
        .eq("user_id", userId)
        .single();

      if (!student || !student.classroom_id) {
        setLoading(false);
        return;
      }

      setStudentId(student.id);

      const { data: csRows } = await supabase
        .from("classroom_subjects")
        .select("id")
        .eq("classroom_id", student.classroom_id);

      const csIds = (csRows || []).map((r) => r.id);

      const { data: publishedTasks } = await supabase
        .from("tasks")
        .select("*, classroom_subjects(subject_id, subjects(name, code))")
        .eq("status", "published")
        .in("classroom_subject_id", csIds)
        .order("due_date", { ascending: true });

      const allPublished = (publishedTasks || []) as TaskRaw[];

      const publishedIds = allPublished.map((t) => t.id);

      const { data: existingSubs } = await supabase
        .from("submissions")
        .select("*")
        .eq("student_id", student.id);

      const subsArr = (existingSubs || []) as SubmissionData[];

      const extraTaskIds = subsArr
        .map((s) => s.task_id)
        .filter((id): id is string => !!id && !publishedIds.includes(id));

      let extraTasks: TaskRaw[] = [];
      if (extraTaskIds.length > 0) {
        const { data: extra } = await supabase
          .from("tasks")
          .select("*, classroom_subjects(subject_id, subjects(name, code))")
          .in("id", extraTaskIds);
        extraTasks = (extra || []) as TaskRaw[];
      }

      const allTasksRaw = [...allPublished, ...extraTasks];

      const allTaskIds = allTasksRaw.map((t) => t.id);

      const subsMap: Record<string, SubmissionData[]> = {};
      subsArr.forEach((s) => {
        if (s.task_id) {
          if (!subsMap[s.task_id]) subsMap[s.task_id] = [];
          subsMap[s.task_id].push(s);
        }
      });
      setSubmissions(subsMap);

      const teacherIds = Array.from(new Set(allTasksRaw.map((t) => t.teacher_id).filter(Boolean) as string[]));
      const teacherMap = new Map<string, string>();
      if (teacherIds.length > 0) {
        const { data: teachersData } = await supabase
          .from("teachers").select("id, users!inner(name)").in("id", teacherIds);
        (teachersData || []).forEach((t: any) => {
          teacherMap.set(t.id, t.users?.name || "Docente");
        });
      }

      const tasksData: TaskData[] = allTasksRaw.map((t) => {
        const subj = extractSubject(t);
        return {
          id: t.id,
          title: t.title,
          description: t.description,
          instructions: t.instructions,
          teacher_id: t.teacher_id,
          teacherName: teacherMap.get(t.teacher_id || "") || "Docente",
          classroom_subject_id: t.classroom_subject_id,
          due_date: t.due_date,
          max_score: t.max_score,
          allow_late: t.allow_late,
          status: t.status,
          subjectName: subj.name,
          subjectCode: subj.code,
        };
      });

      tasksData.sort(
        (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      );
      setTasks(tasksData);

      if (allTaskIds.length > 0) {
        const { data: attachRows } = await supabase
          .from("task_attachments")
          .select("*")
          .in("task_id", allTaskIds);

        const attachMap: Record<string, AttachmentData[]> = {};
        (attachRows || []).forEach((a: AttachmentData) => {
          if (!attachMap[a.task_id]) attachMap[a.task_id] = [];
          attachMap[a.task_id].push(a);
        });
        setAttachments(attachMap);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, extractSubject]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const closeModal = () => {
    setModalOpen(false);
    setUploadFiles([]);
    setComments("");
  };

  const openDetail = (task: TaskData) => {
    setSelectedTask(task);
    setUploadFiles([]);
    const taskSubs = submissions[task.id] || [];
    setComments(taskSubs.length > 0 ? (taskSubs[0]?.comments || "") : "");
    setModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`El archivo "${f.name}" supera los 10MB`);
        return false;
      }
      return true;
    });

    setUploadFiles((prev) => {
      const combined = [...prev, ...validFiles];
      if (combined.length > MAX_FILES) {
        toast.error(`Máximo ${MAX_FILES} archivos por entrega`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (uploadFiles.length === 0 || !selectedTask || !studentId) return;

    const supabase = supabaseRef.current;

    if (selectedTask.status === "closed" && !selectedTask.allow_late) {
      toast.error("La tarea está cerrada y no permite entregas tardías");
      return;
    }

    setUploading(true);

    const timestamp = Date.now();

    try {
      const existingSubs = submissions[selectedTask.id] || [];
      const ungradedIds = existingSubs
        .filter((s) => s.score == null)
        .map((s) => s.id);

      if (ungradedIds.length > 0) {
        await supabase.from("submissions").delete().in("id", ungradedIds);
      }

      for (let i = 0; i < uploadFiles.length; i++) {
        const file = uploadFiles[i];
        const fileName = `${timestamp}_${i}_${file.name}`;
        const filePath = `submissions/${selectedTask.id}/${studentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("edutask-submissions")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        await supabase.from("submissions").insert({
          task_id: selectedTask.id,
          student_id: studentId,
          file_path: filePath,
          file_name: file.name,
          comments: comments.trim() || null,
        });
      }

      toast.success("Tarea entregada correctamente");
      if (selectedTask?.teacher_id) {
        const { data: teacher } = await supabase.from("teachers").select("user_id, first_name").eq("id", selectedTask.teacher_id).single();
        if (teacher) {
          await createNotifications([{
            user_id: teacher.user_id,
            type: "submission",
            title: "Nueva entrega recibida",
            message: `Un alumno entregó "${selectedTask.title}"`,
            link: "/teacher/submissions",
          }]);
        }
      }
      setUploadFiles([]);
      setComments("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchData();
    } catch {
      toast.error("Error al subir la tarea");
    } finally {
      setUploading(false);
    }
  };

  const getAttachmentUrl = (filePath: string) => {
    const { data } = supabaseRef.current.storage
      .from("edutask-tasks")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const taskSubmissions = selectedTask ? submissions[selectedTask.id] || [] : [];
  const taskAttachments = selectedTask ? attachments[selectedTask.id] || [] : [];
  const taskOverdue = selectedTask ? isOverdue(selectedTask.due_date) : false;
  const canSubmit =
    selectedTask &&
    (selectedTask.status !== "closed" || selectedTask.allow_late);

  const pendientes = tasks.filter(
    (t) => !submissions[t.id] || submissions[t.id].length === 0
  );
  const entregadas = tasks.filter((t) => {
    const subs = submissions[t.id];
    return subs && subs.length > 0 && subs.every((s) => s.score == null);
  });
  const calificadas = tasks.filter((t) => {
    const subs = submissions[t.id];
    return subs && subs.some((s) => s.score != null);
  });

  const filteredTasks = (() => {
    switch (activeTab) {
      case "pendientes":
        return pendientes;
      case "entregadas":
        return entregadas;
      case "calificadas":
        return calificadas;
      default:
        return tasks;
    }
  })();

  const counts = {
    todas: tasks.length,
    pendientes: pendientes.length,
    entregadas: entregadas.length,
    calificadas: calificadas.length,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Mis Tareas" description="Tareas asignadas a tu curso" />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">({counts[tab.key]})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <ShimmerGrid count={6} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title="No hay tareas"
          description={
            activeTab === "pendientes"
              ? "No tienes tareas pendientes"
              : activeTab === "entregadas"
                ? "No tienes tareas entregadas"
                : activeTab === "calificadas"
                  ? "No tienes tareas calificadas"
                  : "No tienes tareas asignadas"
          }
          icon={<BookOpen className="w-8 h-8" />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => {
            const subs = submissions[task.id];
            const overdue = isOverdue(task.due_date);
            const status = getTaskStatus(task.id, subs, overdue);
            const color = getSubjectColor(task.subjectName);
            const daysLabel = getDaysRemainingLabel(task.due_date);
            const daysNum = getDaysRemaining(task.due_date);

            return (
              <button
                key={task.id}
                onClick={() => openDetail(task)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer w-full"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center shrink-0`}
                  >
                    <BookOpen className={`w-5 h-5 ${color.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-semibold ${color.text} truncate`}>
                      {task.subjectName}
                    </p>
                    <h3 className="font-semibold text-slate-900 mt-0.5 line-clamp-2 font-serif">
                      {task.title}
                    </h3>
                    {task.teacherName && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> {task.teacherName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      daysNum < 0
                        ? "bg-rose-100 text-rose-700"
                        : daysNum <= 1
                          ? "bg-amber-100 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {daysLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    <Award className="w-3 h-3" />
                    /{task.max_score} pts
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(task.due_date)}
                  </span>
                </div>

                {subs?.some((s) => s.score != null) && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Calificación</span>
                      <span className="text-sm font-bold text-slate-900">
                        {subs.find((s) => s.score != null)?.score} / {task.max_score}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={selectedTask?.title || "Detalle de tarea"}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  getSubjectColor(selectedTask.subjectName).bg
                } ${getSubjectColor(selectedTask.subjectName).text}`}
              >
                {selectedTask.subjectName}
              </span>
              {(() => {
                const stat = getTaskStatus(
                  selectedTask.id,
                  taskSubmissions,
                  taskOverdue
                );
                return (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${stat.className}`}>
                    {stat.label}
                  </span>
                );
              })()}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                /{selectedTask.max_score} pts
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Entrega: {formatDate(selectedTask.due_date)}
              </span>
              <span
                className={`flex items-center gap-1 font-medium ${
                  taskOverdue ? "text-rose-600" : "text-slate-500"
                }`}
              >
                <Clock className="w-4 h-4" />
                {getDaysRemainingLabel(selectedTask.due_date)}
              </span>
            </div>

            {selectedTask.instructions && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-1">
                  Instrucciones
                </h4>
                <div className="prose prose-sm max-w-none text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
                  {selectedTask.instructions}
                </div>
              </div>
            )}

            {selectedTask.description && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-1">
                  Descripción
                </h4>
                <p className="text-sm text-slate-600">{selectedTask.description}</p>
              </div>
            )}

            {taskAttachments.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-2">
                  Archivos del profesor
                </h4>
                <div className="space-y-2">
                  {taskAttachments.map((att) => (
                    <a
                      key={att.id}
                      href={getAttachmentUrl(att.file_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 transition-colors"
                    >
                      <Download className="w-4 h-4 text-slate-400" />
                      <span className="truncate flex-1">{att.file_name}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">
                Mi entrega
              </h4>

              {taskSubmissions.length > 0 ? (
                <div className="space-y-3">
                  {taskSubmissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                    >
                      <a
                        href={
                          supabaseRef.current.storage
                            .from("edutask-submissions")
                            .getPublicUrl(sub.file_path).data.publicUrl
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 flex-1 truncate"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span className="truncate">{sub.file_name}</span>
                      </a>
                      <span className="text-xs text-slate-400">
                        {new Date(sub.submitted_at).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  ))}

                  {taskSubmissions.some((s) => s.score != null) && (() => {
                    const gradedSub = taskSubmissions.find((s) => s.score != null);
                    if (!gradedSub) return null;
                    return (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-emerald-900">
                            Calificación
                          </span>
                          <span className="text-lg font-bold text-emerald-700">
                            {gradedSub.score} / {selectedTask.max_score}
                          </span>
                        </div>
                        {gradedSub.teacher_comment && (
                          <p className="text-sm text-emerald-800">
                            {gradedSub.teacher_comment}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {canSubmit && (
                    <p className="text-xs text-slate-400">
                      Puedes volver a subir archivos para reemplazar tu entrega.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Aún no has entregado esta tarea.
                </p>
              )}

              {canSubmit && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Mensaje para el profesor
                    </label>
                    <textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Escribe un mensaje para tu profesor... (opcional)"
                      rows={3}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPTED_FILE_TYPES}
                      onChange={handleFileSelect}
                      disabled={uploadFiles.length >= MAX_FILES}
                      className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-50"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      PDF, Word, Excel, imágenes (max 10MB c/u, {MAX_FILES} archivos máximo)
                    </p>
                  </div>

                  {uploadFiles.length > 0 && (
                    <div className="space-y-2">
                      {uploadFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <Download className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    isLoading={uploading}
                    disabled={uploadFiles.length === 0}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4" />
                    {taskSubmissions.length > 0 ? "Reemplazar entrega" : "Entregar tarea"}
                  </Button>
                </div>
              )}

              {!canSubmit && (
                <p className="mt-4 text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  La tarea está cerrada y no permite entregas tardías.
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
