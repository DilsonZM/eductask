"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Tables } from "@/types/database";

type Teacher = Tables<"teachers">;

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseRef = useRef(createClient());

  const [formData, setFormData] = useState({
    employee_code: "",
    first_name: "",
    last_name: "",
    specialty: "",
    phone: "",
    hire_date: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current
        .from("teachers")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setTeachers(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setSelectedTeacher(teacher);
      setFormData({
        employee_code: teacher.employee_code,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        specialty: teacher.specialty || "",
        phone: teacher.phone || "",
        hire_date: teacher.hire_date || "",
      });
    } else {
      setSelectedTeacher(null);
      setFormData({ employee_code: "", first_name: "", last_name: "", specialty: "", phone: "", hire_date: "" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedTeacher) {
        await supabaseRef.current.from("teachers").update(formData).eq("id", selectedTeacher.id);
      } else {
        await supabaseRef.current.from("teachers").insert([formData]);
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving teacher:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTeacher) return;
    setIsSubmitting(true);
    try {
      await supabaseRef.current.from("teachers").delete().eq("id", selectedTeacher.id);
      setDeleteDialogOpen(false);
      setSelectedTeacher(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting teacher:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "employee_code", header: "Código" },
    { key: "first_name", header: "Nombre" },
    { key: "last_name", header: "Apellido" },
    { key: "specialty", header: "Especialidad" },
    { key: "phone", header: "Teléfono" },
    { key: "status", header: "Estado" },
  ];

  return (
    <div>
      <PageHeader title="Profesores" description="Gestionar profesores" actionLabel="Nuevo Profesor" onAction={() => handleOpenModal()} />
      {!loading && teachers.length === 0 ? (
        <EmptyState title="No hay profesores" description="Comienza agregando el primer profesor" actionLabel="Nuevo Profesor" onAction={() => handleOpenModal()} />
      ) : (
        <DataTable isLoading={loading} data={teachers} columns={columns} searchPlaceholder="Buscar por nombre o código..." searchKeys={["first_name", "last_name", "employee_code"]} onEdit={handleOpenModal} onDelete={(item) => { setSelectedTeacher(item); setDeleteDialogOpen(true); }} />
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedTeacher ? "Editar Profesor" : "Nuevo Profesor"} footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} isLoading={isSubmitting}>{selectedTeacher ? "Guardar" : "Crear"}</Button></>}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Código" value={formData.employee_code} onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} required />
            <Input label="Apellido" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} required />
          </div>
          <Input label="Especialidad" value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })} />
          <Input label="Teléfono" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          <Input label="Fecha de Contratación" type="date" value={formData.hire_date} onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })} />
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Profesor" message={`¿Está seguro de eliminar a ${selectedTeacher?.first_name} ${selectedTeacher?.last_name}?`} isLoading={isSubmitting} />
    </div>
  );
}