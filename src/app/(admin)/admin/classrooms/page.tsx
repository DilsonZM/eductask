"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";

interface Classroom {
  id: string;
  academic_year_id: string | null;
  name: string;
  grade_level: string;
  capacity: number;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FormData {
  name: string;
  grade_level: string;
  capacity: string;
  location: string;
  academic_year_id: string;
  status: string;
}

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [academicYears, setAcademicYears] = useState<{ id: string; year: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "", grade_level: "", capacity: "35", location: "", academic_year_id: "", status: "active",
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const [classroomsRes, yearsRes] = await Promise.all([
        supabase.from("classrooms").select("*").order("created_at", { ascending: false }),
        supabase.from("academic_years").select("id, year").eq("status", "active"),
      ]);
      if (classroomsRes.data) setClassrooms(classroomsRes.data as Classroom[]);
      if (yearsRes.data) setAcademicYears(yearsRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenModal = (classroom?: Classroom) => {
    if (classroom) {
      setSelectedClassroom(classroom);
      setFormData({
        name: classroom.name, grade_level: classroom.grade_level,
        capacity: String(classroom.capacity), location: classroom.location || "",
        academic_year_id: classroom.academic_year_id || "", status: classroom.status,
      });
    } else {
      setSelectedClassroom(null);
      setFormData({ name: "", grade_level: "", capacity: "35", location: "", academic_year_id: "", status: "active" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = { ...formData, capacity: parseInt(formData.capacity) };
      if (selectedClassroom) {
        const { error } = await supabase.from("classrooms").update(data).eq("id", selectedClassroom.id);
        if (error) console.error("Error:", error);
      } else {
        const { error } = await supabase.from("classrooms").insert([data]);
        if (error) console.error("Error:", error);
      }
      toast.success(selectedClassroom ? "Salón actualizado" : "Salón creado");
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedClassroom) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("classrooms").delete().eq("id", selectedClassroom.id);
      if (error) throw error;
      toast.success("Salón, asignaciones, materias y horarios eliminados");
      setDeleteDialogOpen(false);
      setSelectedClassroom(null);
      fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error?.message || "Error al eliminar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "grade_level", header: "Grado" },
    { key: "capacity", header: "Capacidad" },
    { key: "location", header: "Ubicación" },
    { key: "status", header: "Estado" },
  ];

  return (
    <div>
      <PageHeader title="Salones" description="Gestionar salones" actionLabel="Nuevo Salón" onAction={() => handleOpenModal()} />
      {!loading && classrooms.length === 0 ? (
        <EmptyState title="No hay salones" description="Comienza creando el primer salón" actionLabel="Nuevo Salón" onAction={() => handleOpenModal()} />
      ) : (
        <DataTable isLoading={loading} data={classrooms} columns={columns} searchPlaceholder="Buscar por nombre o grado..." searchKeys={["name", "grade_level"]} onEdit={handleOpenModal} onDelete={(item) => { setSelectedClassroom(item); setDeleteDialogOpen(true); }} />
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedClassroom ? "Editar Salón" : "Nuevo Salón"} footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} isLoading={isSubmitting}>{selectedClassroom ? "Guardar" : "Crear"}</Button></>}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="5° A" required />
          <Input label="Nivel de Grado" value={formData.grade_level} onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })} placeholder="Quinto Grado" required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Capacidad" type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} required />
            <Input label="Ubicación" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
          </div>
          <Select label="Año Lectivo" value={formData.academic_year_id} onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })} options={academicYears.map((y) => ({ value: y.id, label: String(y.year) }))} />
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Salón" message={`¿Eliminar ${selectedClassroom?.name}?`} details={["Todas las materias asignadas al salón", "Todas las tareas de esas materias", "Todas las entregas de alumnos", "Las calificaciones asociadas", "Los horarios y asignaciones de profesores", "Los boletines quedarán sin salón"]} isLoading={isSubmitting} />
    </div>
  );
}