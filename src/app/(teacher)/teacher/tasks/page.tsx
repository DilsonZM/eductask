"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";
import type { Tables } from "@/types/database";
import toast from "react-hot-toast";
import { X, ExternalLink } from "lucide-react";

type Task = Tables<"tasks">;
type TaskAttachment = Tables<"task_attachments">;

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  instructions: string | null;
  classroom_subject_id: string | null;
  school_period_id: string | null;
  due_date: string;
  max_score: number;
  allow_late: boolean;
  status: string;
  subjectName: string;
  classroomName: string;
  submissionCount: number;
  studentCount: number;
  attachments: TaskAttachment[];
}

interface SelectOption {
  value: string;
  label: string;
}

interface FileEntry {
  file: File;
  id: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    draft: { label: "Borrador", className: "bg-amber-50 text-amber-700 border-amber-200" },
    published: { label: "Publicado", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    closed: { label: "Cerrado", className: "bg-slate-50 text-slate-600 border-slate-200" },
  };
  const cfg = map[status] || map.draft;
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export default function TasksPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    classroom_id: "",
    classroom_subject_id: "",
    school_period_id: "",
    title: "",
    description: "",
    instructions: "",
    due_date: "",
    max_score: "10",
    allow_late: true,
    status: "draft" as "draft" | "published",
  });

  const [classrooms, setClassrooms] = useState<SelectOption[]>([]);
  const [modalSubjects, setModalSubjects] = useState<SelectOption[]>([]);
  const [periods, setPeriods] = useState<SelectOption[]>([]);
  const [loadingModalSubjects, setLoadingModalSubjects] = useState(false);

  const [attachments, setAttachments] = useState<FileEntry[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<TaskAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);

  const [filterClassroomId, setFilterClassroomId] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSubjects, setFilterSubjects] = useState<SelectOption[]>([]);

  const loadTeacherId = useCallback(async () => {
    if (!user) return;
    const { data } = await supabaseRef.current
      .from("teachers")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (data) setTeacherId(data.id);
  }, [user]);

  const loadClassrooms = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from("classrooms")
      .select("id, name")
      .eq("status", "active")
      .order("name");
    if (data) setClassrooms(data.map((c) => ({ value: c.id, label: c.name })));
  }, []);

  const loadPeriods = useCallback(async () => {
    const { data: yearData } = await supabaseRef.current
      .from("academic_years")
      .select("id")
      .eq("is_active", true)
      .single();
    if (!yearData) return;

    const { data } = await supabaseRef.current
      .from("school_periods")
      .select("id, name")
      .eq("academic_year_id", yearData.id)
      .eq("status", "active")
      .order("order");
    if (data) {
      setPeriods(data.map((p) => ({ value: p.id, label: p.name })));
    }
  }, []);

  const loadSubjectsForClassroom = useCallback(
    async (classroomId: string, target: "modal" | "filter") => {
      if (target === "modal") setLoadingModalSubjects(true);

      let query = supabaseRef.current
        .from("classroom_subjects")
        .select("id, subjects!inner(id, name)");

      if (classroomId) {
        query = query.eq("classroom_id", classroomId);
      }

      const { data } = await query;

      const options: SelectOption[] = [];
      if (data) {
        for (const row of data) {
          const sub = row.subjects as unknown as { name: string } | null;
          if (sub?.name) options.push({ value: row.id, label: sub.name });
        }
      }

      if (target === "modal") {
        setModalSubjects(options);
        setLoadingModalSubjects(false);
      } else {
        setFilterSubjects(options);
        setFilterSubjectId("");
      }
    },
    []
  );

  const fetchTasks = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      let query = supabaseRef.current
        .from("tasks")
        .select("*, classroom_subjects!inner(subjects!inner(name), classrooms!inner(name))")
        .eq("teacher_id", teacherId)
        .order("created_at", { ascending: false });

      if (filterSubjectId) {
        query = query.eq("classroom_subject_id", filterSubjectId);
      } else if (filterClassroomId) {
        const { data: csRows } = await supabaseRef.current
          .from("classroom_subjects")
          .select("id")
          .eq("classroom_id", filterClassroomId);
        const csIds = (csRows || []).map((r) => r.id);
        if (csIds.length > 0) query = query.in("classroom_subject_id", csIds);
        else {
          setTasks([]);
          setLoading(false);
          return;
        }
      }

      if (filterStatus) query = query.eq("status", filterStatus);

      const { data, error } = await query;
      if (error) {
        toast.error("Error al cargar tareas");
        setLoading(false);
        return;
      }

      const rows = data || [];
      const taskIds = rows.map((r: Record<string, unknown>) => r.id as string);

      const [subCountsRes, csInfoMap, attachRes] = await Promise.all([
        taskIds.length > 0
          ? supabaseRef.current
              .from("submissions")
              .select("task_id", { count: "exact" })
              .in("task_id", taskIds)
          : null,
        (async () => {
          const map = new Map<string, { classroomId: string }>();
          const uniqueIds = Array.from(new Set(rows.map((r: Record<string, unknown>) => r.classroom_subject_id as string)));
          if (uniqueIds.length > 0) {
            const { data: csData } = await supabaseRef.current
              .from("classroom_subjects")
              .select("id, classroom_id")
              .in("id", uniqueIds);
            (csData || []).forEach((cs: Record<string, unknown>) => {
              map.set(cs.id as string, { classroomId: cs.classroom_id as string });
            });
          }
          return map;
        })(),
        taskIds.length > 0
          ? supabaseRef.current
              .from("task_attachments")
              .select("*")
              .in("task_id", taskIds)
              .order("created_at", { ascending: true })
          : null,
      ]);

      const uniqueClassrooms = new Set<string>();
      csInfoMap.forEach((info) => uniqueClassrooms.add(info.classroomId));
      const classroomIdsArr = Array.from(uniqueClassrooms);

      const studentCountMap = new Map<string, number>();
      if (classroomIdsArr.length > 0) {
        const { data: studentData } = await supabaseRef.current
          .from("students")
          .select("classroom_id")
          .in("classroom_id", classroomIdsArr)
          .eq("status", "active");
        (studentData || []).forEach((s: Record<string, unknown>) => {
          const cid = s.classroom_id as string;
          studentCountMap.set(cid, (studentCountMap.get(cid) || 0) + 1);
        });
      }

      const subCountByTask = new Map<string, number>();
      if (subCountsRes?.data) {
        (subCountsRes.data as Record<string, unknown>[]).forEach((s: Record<string, unknown>) => {
          const taskId = s.task_id as string;
          subCountByTask.set(taskId, (subCountByTask.get(taskId) || 0) + 1);
        });
      }

      const attachByTask = new Map<string, TaskAttachment[]>();
      if (attachRes?.data) {
        for (const att of (attachRes.data as TaskAttachment[])) {
          const taskId = att.task_id as string;
          const arr = attachByTask.get(taskId) || [];
          arr.push(att);
          attachByTask.set(taskId, arr);
        }
      }

      const taskRows: TaskRow[] = rows.map((r: Record<string, unknown>) => {
        const cs = r.classroom_subjects as Record<string, unknown> | null;
        const subjects = cs?.subjects as { name: string } | null;
        const classrooms = cs?.classrooms as { name: string } | null;
        const csInfo = csInfoMap.get(r.classroom_subject_id as string);
        return {
          id: r.id as string,
          title: r.title as string,
          description: r.description as string | null,
          instructions: r.instructions as string | null,
          classroom_subject_id: r.classroom_subject_id as string | null,
          school_period_id: r.school_period_id as string | null,
          due_date: r.due_date as string,
          max_score: r.max_score as number,
          allow_late: r.allow_late as boolean,
          status: r.status as string,
          subjectName: subjects?.name || "—",
          classroomName: classrooms?.name || "—",
          submissionCount: subCountByTask.get(r.id as string) || 0,
          studentCount: csInfo ? (studentCountMap.get(csInfo.classroomId) || 0) : 0,
          attachments: attachByTask.get(r.id as string) || [],
        };
      });

      setTasks(taskRows);
    } catch {
      toast.error("Error al cargar tareas");
    } finally {
      setLoading(false);
    }
  }, [teacherId, filterClassroomId, filterSubjectId, filterStatus]);

  useEffect(() => {
    loadTeacherId();
    loadClassrooms();
    loadPeriods();
    loadSubjectsForClassroom("", "filter");
  }, [loadTeacherId, loadClassrooms, loadPeriods, loadSubjectsForClassroom]);

  useEffect(() => {
    if (teacherId) fetchTasks();
  }, [teacherId, fetchTasks]);

  const resetForm = () => {
    setFormData({
      classroom_id: "",
      classroom_subject_id: "",
      school_period_id: "",
      title: "",
      description: "",
      instructions: "",
      due_date: "",
      max_score: "10",
      allow_late: true,
      status: "draft",
    });
    setModalSubjects([]);
    setAttachments([]);
    setExistingAttachments([]);
    setRemovedAttachmentIds([]);
  };

  const handleOpenModal = async (task?: Task) => {
    resetForm();
    if (task) {
      setSelectedTask(task);
      const csData = task as Record<string, unknown>;
      let classroomId = "";
      if (task.classroom_subject_id) {
        const { data: cs } = await supabaseRef.current
          .from("classroom_subjects")
          .select("classroom_id")
          .eq("id", task.classroom_subject_id)
          .single();
        classroomId = cs?.classroom_id || "";
        loadSubjectsForClassroom(classroomId, "modal");
      }
      setFormData({
        classroom_id: classroomId,
        classroom_subject_id: task.classroom_subject_id || "",
        school_period_id: (csData.school_period_id as string) || "",
        title: task.title,
        description: task.description || "",
        instructions: task.instructions || "",
        due_date: task.due_date ? task.due_date.slice(0, 16) : "",
        max_score: String(task.max_score),
        allow_late: task.allow_late,
        status: task.status as "draft" | "published",
      });

      const { data: attData } = await supabaseRef.current
        .from("task_attachments")
        .select("*")
        .eq("task_id", task.id);
      if (attData) setExistingAttachments(attData);
    } else {
      setSelectedTask(null);
    }
    setModalOpen(true);
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    setRemovedAttachmentIds((prev) => [...prev, attachmentId]);
    setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
  };

  const handleRemoveNewFile = (fileId: string) => {
    setAttachments((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newEntries: FileEntry[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        toast.error(`Tipo no permitido: ${file.name}`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(`Demasiado grande (máx 50MB): ${file.name}`);
        continue;
      }
      newEntries.push({ file, id: `${Date.now()}-${i}-${file.name}` });
    }
    setAttachments((prev) => [...prev, ...newEntries]);
    e.target.value = "";
  };

  const uploadFiles = async (taskId: string): Promise<TaskAttachment[]> => {
    const results: TaskAttachment[] = [];
    for (const entry of attachments) {
      const filePath = `tasks/${taskId}/${entry.file.name}`;
      const { error: uploadError } = await supabaseRef.current.storage
        .from("edutask-tasks")
        .upload(filePath, entry.file, { upsert: true });
      if (uploadError) {
        toast.error(`Error al subir ${entry.file.name}`);
        continue;
      }
      const { data: insertData, error: insertError } = await supabaseRef.current
        .from("task_attachments")
        .insert({
          task_id: taskId,
          file_path: filePath,
          file_name: entry.file.name,
          file_type: entry.file.type,
          file_size: entry.file.size,
        })
        .select("*")
        .single();
      if (insertError) {
        toast.error(`Error al guardar ${entry.file.name}`);
        continue;
      }
      if (insertData) results.push(insertData);
    }
    return results;
  };

  const deleteStorageFiles = async (attachmentsToDelete: TaskAttachment[]) => {
    const paths = attachmentsToDelete.map((a) => a.file_path);
    if (paths.length > 0) {
      await supabaseRef.current.storage.from("edutask-tasks").remove(paths);
    }
  };

  const handleSubmit = async (status: "draft" | "published") => {
    if (!teacherId) { toast.error("Profesor no identificado"); return; }
    if (!formData.title.trim()) { toast.error("El título es obligatorio"); return; }
    if (!formData.classroom_subject_id) { toast.error("Seleccione salón y materia"); return; }
    if (!formData.due_date) { toast.error("Fecha límite obligatoria"); return; }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        instructions: formData.instructions.trim() || null,
        teacher_id: teacherId,
        classroom_subject_id: formData.classroom_subject_id,
        due_date: new Date(formData.due_date).toISOString(),
        max_score: Number(formData.max_score) || 10,
        allow_late: formData.allow_late,
        status,
      };
      if (formData.school_period_id) payload.school_period_id = formData.school_period_id;

      if (selectedTask) {
        const { error } = await supabaseRef.current.from("tasks").update(payload).eq("id", selectedTask.id);
        if (error) { toast.error("Error al actualizar"); return; }
        if (removedAttachmentIds.length > 0) {
          const toDelete = existingAttachments.filter((a) => removedAttachmentIds.includes(a.id));
          await deleteStorageFiles(toDelete);
          await supabaseRef.current.from("task_attachments").delete().in("id", removedAttachmentIds);
        }
        await uploadFiles(selectedTask.id);
        toast.success("Tarea actualizada");
      } else {
        const { data: created, error } = await supabaseRef.current.from("tasks").insert([payload]).select("id").single();
        if (error) { toast.error("Error al crear"); return; }
        if (created && attachments.length > 0) await uploadFiles(created.id);
        toast.success(status === "published" ? "Tarea publicada" : "Borrador guardado");
      }
      setModalOpen(false);
      resetForm();
      fetchTasks();
    } catch { toast.error("Error inesperado"); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      const { data: existingFiles } = await supabaseRef.current.from("task_attachments").select("*").eq("task_id", selectedTask.id);
      if (existingFiles) await deleteStorageFiles(existingFiles);
      await supabaseRef.current.from("task_attachments").delete().eq("task_id", selectedTask.id);
      const { error } = await supabaseRef.current.from("tasks").delete().eq("id", selectedTask.id);
      if (error) { toast.error("Error al eliminar"); return; }
      toast.success("Tarea eliminada");
      setDeleteDialogOpen(false);
      setSelectedTask(null);
      fetchTasks();
    } catch { toast.error("Error al eliminar"); }
    finally { setIsSubmitting(false); }
  };

  const formatDuedate = (date: string) => formatDateTime(date);

  const getAttachmentUrl = (filePath: string) =>
    supabaseRef.current.storage.from("edutask-tasks").getPublicUrl(filePath).data.publicUrl;

  return (
    <div className="space-y-6">
      <PageHeader title="Tareas" description="Gestionar tareas y actividades" actionLabel="Nueva Tarea" onAction={() => handleOpenModal()} />

      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full sm:w-auto sm:min-w-[200px]">
            <Select
              label="Salón"
              value={filterClassroomId}
              onChange={(e) => {
                setFilterClassroomId(e.target.value);
                loadSubjectsForClassroom(e.target.value, "filter");
              }}
              options={[{ value: "", label: "Todos los salones" }, ...classrooms]}
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[200px]">
            <Select
              label="Materia"
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              options={[{ value: "", label: "Todas las materias" }, ...filterSubjects]}
            />
          </div>
          <div className="w-full sm:w-auto sm:min-w-[160px]">
            <Select
              label="Estado"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: "", label: "Todos" },
                { value: "draft", label: "Borrador" },
                { value: "published", label: "Publicado" },
                { value: "closed", label: "Cerrado" },
              ]}
            />
          </div>
          {(filterClassroomId || filterSubjectId || filterStatus) && (
            <div className="flex items-end pb-1">
              <Button variant="ghost" size="sm" onClick={() => { setFilterClassroomId(""); setFilterSubjectId(""); setFilterStatus(""); setFilterSubjects([]); }}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </div>

      {loading ? (<ShimmerTable rows={5} cols={4} />) : tasks.length === 0 ? (
        <EmptyState title="No hay tareas" description="Crea tu primera tarea" actionLabel="Nueva Tarea" onAction={() => handleOpenModal()} />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Título</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Salón</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Materia</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Archivos</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Fecha límite</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Entregas</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Puntaje</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{task.title}</td>
                    <td className="px-4 py-3 text-slate-600">{task.classroomName}</td>
                    <td className="px-4 py-3 text-slate-600">{task.subjectName}</td>
                    <td className="px-4 py-3">
                      {task.attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {task.attachments.map((att) => (
                            <a
                              key={att.id}
                              href={getAttachmentUrl(att.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary-50 text-primary-700 rounded-full hover:bg-primary-100 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {att.file_name}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDuedate(task.due_date)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold ${task.submissionCount > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                        {task.submissionCount}/{task.studentCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{task.max_score} pts</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(task.status)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenModal(task as unknown as Task)} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">Editar</button>
                        <button onClick={() => { setSelectedTask(task as unknown as Task); setDeleteDialogOpen(true); }} className="px-2 py-1 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); resetForm(); }}
        title={selectedTask ? "Editar Tarea" : "Nueva Tarea"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</Button>
            <Button variant="outline" onClick={() => handleSubmit("draft")} isLoading={isSubmitting}>Guardar Borrador</Button>
            <Button onClick={() => handleSubmit("published")} isLoading={isSubmitting}>{selectedTask ? "Guardar" : "Publicar"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Salón"
              value={formData.classroom_id}
              onChange={(e) => {
                setFormData({ ...formData, classroom_id: e.target.value, classroom_subject_id: "" });
                loadSubjectsForClassroom(e.target.value, "modal");
              }}
              options={[{ value: "", label: "Seleccionar..." }, ...classrooms]}
            />
            <Select
              label="Materia"
              value={formData.classroom_subject_id}
              onChange={(e) => setFormData({ ...formData, classroom_subject_id: e.target.value })}
              options={[{ value: "", label: "Seleccionar..." }, ...modalSubjects]}
              disabled={!formData.classroom_id || loadingModalSubjects}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Período"
              value={formData.school_period_id}
              onChange={(e) => setFormData({ ...formData, school_period_id: e.target.value })}
              options={[{ value: "", label: "Sin período" }, ...periods]}
            />
            <Input label="Puntaje máximo" type="number" value={formData.max_score} onChange={(e) => setFormData({ ...formData, max_score: e.target.value })} min="1" />
            <div className="flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={formData.allow_late} onChange={(e) => setFormData({ ...formData, allow_late: e.target.checked })} className="rounded border-slate-300" />
                Permitir entregas tardías
              </label>
            </div>
          </div>
          <Input label="Título" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Nombre de la tarea" required />
          <Input label="Fecha límite" type="datetime-local" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Descripción de la tarea..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Instrucciones</label>
            <textarea value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Instrucciones detalladas..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Archivos adjuntos</label>
            <input type="file" multiple onChange={handleFileSelect} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
            <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, imágenes</p>
            {existingAttachments.length > 0 && (
              <div className="mt-3 space-y-1">
                {existingAttachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-sm">
                    <span className="text-slate-600 truncate">{att.file_name}</span>
                    <span className="text-xs text-slate-400 mr-2">{att.file_size ? formatFileSize(att.file_size) : ""}</span>
                    <button onClick={() => handleDeleteAttachment(att.id)} className="text-rose-500 hover:text-rose-700 ml-2"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-sm">
                    <span className="text-blue-700 truncate">{entry.file.name}</span>
                    <span className="text-xs text-blue-500 mr-2">{formatFileSize(entry.file.size)}</span>
                    <button onClick={() => handleRemoveNewFile(entry.id)} className="text-rose-500 hover:text-rose-700 ml-2"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Tarea" message={`¿Seguro de eliminar "${selectedTask?.title}"?`} isLoading={isSubmitting} />
    </div>
  );
}
