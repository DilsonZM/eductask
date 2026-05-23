"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Task = Tables<"tasks">;

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [classroomSubjects, setClassroomSubjects] = useState<{ id: string; classroom_name: string; subject_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseRef = useRef(createClient());

  const [formData, setFormData] = useState({ title: "", description: "", instructions: "", classroom_subject_id: "", due_date: "", max_score: "10", allow_late: true, status: "draft" });

  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, csRes] = await Promise.all([
        supabaseRef.current.from("tasks").select("*").order("created_at", { ascending: false }),
        supabaseRef.current.from("classroom_subjects").select("*, classrooms(name), subjects(name)"),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (csRes.data) {
        setClassroomSubjects(csRes.data.map((cs: Record<string, unknown>) => ({
          id: cs.id as string,
          classroom_name: (cs.classrooms as Record<string, string>)?.name || "",
          subject_name: (cs.subjects as Record<string, string>)?.name || "",
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

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setSelectedTask(task);
      setFormData({ title: task.title, description: task.description || "", instructions: task.instructions || "", classroom_subject_id: task.classroom_subject_id || "", due_date: task.due_date.slice(0, 16), max_score: String(task.max_score), allow_late: task.allow_late, status: task.status });
    } else {
      setSelectedTask(null);
      setFormData({ title: "", description: "", instructions: "", classroom_subject_id: "", due_date: "", max_score: "10", allow_late: true, status: "draft" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedTask) {
        await supabaseRef.current.from("tasks").update(formData).eq("id", selectedTask.id);
      } else {
        await supabaseRef.current.from("tasks").insert([formData]);
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      await supabaseRef.current.from("tasks").delete().eq("id", selectedTask.id);
      setDeleteDialogOpen(false);
      setSelectedTask(null);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "title", header: "Título" },
    { key: "due_date", header: "Fecha Límite", render: (item: Task) => formatDate(item.due_date) },
    { key: "max_score", header: "Puntaje" },
    { key: "status", header: "Estado" },
  ];

  return (
    <div>
      <PageHeader title="Tareas" description="Gestionar tareas" actionLabel="Nueva Tarea" onAction={() => handleOpenModal()} />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : tasks.length === 0 ? (
        <EmptyState title="No hay tareas" description="Crea tu primera tarea" actionLabel="Nueva Tarea" onAction={() => handleOpenModal()} />
      ) : (
        <DataTable data={tasks} columns={columns} onEdit={handleOpenModal} onDelete={(item) => { setSelectedTask(item); setDeleteDialogOpen(true); }} />
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedTask ? "Editar Tarea" : "Nueva Tarea"} footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} isLoading={isSubmitting}>{selectedTask ? "Guardar" : "Crear"}</Button></>}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Título" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Instrucciones</label>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500" rows={2} value={formData.instructions} onChange={(e) => setFormData({ ...formData, instructions: e.target.value })} />
          </div>
          <Select label="Materia/Salón" value={formData.classroom_subject_id} onChange={(e) => setFormData({ ...formData, classroom_subject_id: e.target.value })} options={classroomSubjects.map((cs) => ({ value: cs.id, label: `${cs.classroom_name} - ${cs.subject_name}` }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha Límite" type="datetime-local" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} required />
            <Input label="Puntaje Máximo" type="number" value={formData.max_score} onChange={(e) => setFormData({ ...formData, max_score: e.target.value })} required />
          </div>
          <Select label="Estado" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={[{ value: "draft", label: "Borrador" }, { value: "published", label: "Publicado" }, { value: "closed", label: "Cerrado" }]} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={formData.allow_late} onChange={(e) => setFormData({ ...formData, allow_late: e.target.checked })} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-gray-700">Permitir entregas tardías</span>
          </label>
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Tarea" message={`¿Está seguro de eliminar "${selectedTask?.title}"?`} isLoading={isSubmitting} />
    </div>
  );
}