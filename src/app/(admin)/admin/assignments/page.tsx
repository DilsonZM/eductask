"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { createNotifications } from "@/lib/notifications";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface AssignmentWithDetails {
  id: string;
  teacher_id: string | null;
  classroom_id: string | null;
  subject_id: string | null;
  school_period_id: string | null;
  created_at: string;
  updated_at: string;
  teacher_name?: string;
  classroom_name?: string;
  subject_name?: string;
  period_name?: string;
}

interface FormData {
  teacher_id: string;
  classroom_id: string;
  subject_id: string;
  school_period_id: string;
}

interface TeacherOption { id: string; name: string }
interface ClassroomOption { id: string; name: string }
interface SubjectOption { id: string; name: string }
interface PeriodOption { id: string; name: string }

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({ teacher_id: "", classroom_id: "", subject_id: "", school_period_id: "" });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const [assignmentsRes, teachersRes, classroomsRes, subjectsRes, periodsRes] = await Promise.all([
        supabase.from("teacher_assignments").select("*, teachers(first_name, last_name), classrooms(name), subjects(name), school_periods(name)"),
        supabase.from("teachers").select("id, first_name, last_name"),
        supabase.from("classrooms").select("id, name"),
        supabase.from("subjects").select("id, name"),
        supabase.from("school_periods").select("id, name"),
      ]);

      if (assignmentsRes.data) {
        const formatted: AssignmentWithDetails[] = assignmentsRes.data.map((a) => {
          const record = a as Record<string, unknown>;
          const teachers = record.teachers as Record<string, string> | null;
          const classrooms = record.classrooms as Record<string, string> | null;
          const subjects = record.subjects as Record<string, string> | null;
          const school_periods = record.school_periods as Record<string, string> | null;
          return {
            id: record.id as string,
            teacher_id: record.teacher_id as string | null,
            classroom_id: record.classroom_id as string | null,
            subject_id: record.subject_id as string | null,
            school_period_id: record.school_period_id as string | null,
            created_at: record.created_at as string,
            updated_at: record.updated_at as string,
            teacher_name: teachers ? `${teachers.first_name} ${teachers.last_name}` : "",
            classroom_name: classrooms?.name || "",
            subject_name: subjects?.name || "",
            period_name: school_periods?.name || "",
          };
        });
        setAssignments(formatted);
      }
      if (teachersRes.data) setTeachers(teachersRes.data.map((t) => ({ id: t.id, name: `${t.first_name} ${t.last_name}` })));
      if (classroomsRes.data) setClassrooms(classroomsRes.data.map((c) => ({ id: c.id, name: c.name })));
      if (subjectsRes.data) setSubjects(subjectsRes.data.map((s) => ({ id: s.id, name: s.name })));
      if (periodsRes.data) setPeriods(periodsRes.data.map((p) => ({ id: p.id, name: p.name })));
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenModal = (assignment?: AssignmentWithDetails) => {
    if (assignment) {
      setSelectedAssignment(assignment);
      setFormData({ teacher_id: assignment.teacher_id || "", classroom_id: assignment.classroom_id || "", subject_id: assignment.subject_id || "", school_period_id: assignment.school_period_id || "" });
    } else {
      setSelectedAssignment(null);
      setFormData({ teacher_id: "", classroom_id: "", subject_id: "", school_period_id: "" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher_id || !formData.classroom_id || !formData.subject_id || !formData.school_period_id) {
      toast.error("Todos los campos son obligatorios");
      return;
    }
    setIsSubmitting(true);
    try {
      if (selectedAssignment) {
        const { error } = await supabase.from("teacher_assignments").update(formData).eq("id", selectedAssignment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teacher_assignments").insert([formData]);
        if (error) throw error;
      }
      toast.success(selectedAssignment ? "Asignación actualizada" : "Asignación creada");
      const { data: teacher } = await supabase.from("teachers").select("user_id, first_name").eq("id", formData.teacher_id).single();
      if (teacher) {
        const classroomName = classrooms.find((c) => c.id === formData.classroom_id)?.name || "un salón";
        const subjectName = subjects.find((s) => s.id === formData.subject_id)?.name || "una materia";
        const periodName = periods.find((p) => p.id === formData.school_period_id)?.name || "un período";
        await createNotifications([{
          user_id: teacher.user_id,
          type: "assignment",
          title: selectedAssignment ? "Asignación actualizada" : "Nueva asignación",
          message: `Plantel académico te asignó a ${classroomName} - ${subjectName} (${periodName})`,
          link: "/teacher/subjects",
        }]);
      }
      setModalOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error?.message || "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAssignment) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("teacher_assignments").delete().eq("id", selectedAssignment.id);
      if (error) throw error;
      toast.success("Asignación eliminada");
      setDeleteDialogOpen(false);
      setSelectedAssignment(null);
      fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error?.message || "Error al eliminar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "teacher_name", header: "Profesor" },
    { key: "classroom_name", header: "Salón" },
    { key: "subject_name", header: "Materia" },
    { key: "period_name", header: "Período" },
  ];

  return (
    <div>
      <PageHeader title="Asignaciones" description="Asignar profesores a materias y salones" actionLabel="Nueva Asignación" onAction={() => handleOpenModal()} />
      {!loading && assignments.length === 0 ? (
        <EmptyState title="No hay asignaciones" description="Comienza creando la primera asignación" actionLabel="Nueva Asignación" onAction={() => handleOpenModal()} />
      ) : (
        <DataTable isLoading={loading} data={assignments} columns={columns} searchPlaceholder="Buscar por profesor o materia..." searchKeys={["teacher_name", "subject_name", "classroom_name"]} onEdit={handleOpenModal} onDelete={(item) => { setSelectedAssignment(item); setDeleteDialogOpen(true); }} />
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedAssignment ? "Editar Asignación" : "Nueva Asignación"} footer={<><Button variant="outline" type="button" onClick={() => setModalOpen(false)}>Cancelar</Button><Button type="submit" form="assignment-form" isLoading={isSubmitting}>{selectedAssignment ? "Guardar" : "Crear"}</Button></>}>
        <form id="assignment-form" onSubmit={handleSubmit} className="space-y-4">
          <Select label="Profesor" value={formData.teacher_id} onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })} options={teachers.map((t) => ({ value: t.id, label: t.name }))} placeholder="Seleccionar profesor..." />
          <Select label="Salón" value={formData.classroom_id} onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })} options={classrooms.map((c) => ({ value: c.id, label: c.name }))} placeholder="Seleccionar salón..." />
          <Select label="Materia" value={formData.subject_id} onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })} options={subjects.map((s) => ({ value: s.id, label: s.name }))} placeholder="Seleccionar materia..." />
          <Select label="Período" value={formData.school_period_id} onChange={(e) => setFormData({ ...formData, school_period_id: e.target.value })} options={periods.map((p) => ({ value: p.id, label: p.name }))} placeholder="Seleccionar período..." />
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Asignación" message={`¿Eliminar esta asignación?`} details={["El profesor ya no estará vinculado a esta materia/salón", "Los horarios asociados quedarán sin profesor asignado"]} type="warning" confirmLabel="Quitar" isLoading={isSubmitting} />
    </div>
  );
}