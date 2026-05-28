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
import type { Tables } from "@/types/database";

type Student = Tables<"students">;

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseRef = useRef(createClient());

  const [formData, setFormData] = useState({
    student_code: "",
    first_name: "",
    last_name: "",
    birth_date: "",
    gender: "",
    address: "",
    phone: "",
    emergency_contact: "",
    emergency_phone: "",
    enrollment_date: "",
    classroom_id: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, classroomsRes] = await Promise.all([
        supabaseRef.current.from("students").select("*").order("created_at", { ascending: false }),
        supabaseRef.current.from("classrooms").select("id, name").eq("status", "active"),
      ]);

      if (studentsRes.data) setStudents(studentsRes.data);
      if (classroomsRes.data) setClassrooms(classroomsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setSelectedStudent(student);
      setFormData({
        student_code: student.student_code,
        first_name: student.first_name,
        last_name: student.last_name,
        birth_date: student.birth_date || "",
        gender: student.gender || "",
        address: student.address || "",
        phone: student.phone || "",
        emergency_contact: student.emergency_contact || "",
        emergency_phone: student.emergency_phone || "",
        enrollment_date: student.enrollment_date || "",
        classroom_id: student.classroom_id || "",
      });
    } else {
      setSelectedStudent(null);
      setFormData({
        student_code: "",
        first_name: "",
        last_name: "",
        birth_date: "",
        gender: "",
        address: "",
        phone: "",
        emergency_contact: "",
        emergency_phone: "",
        enrollment_date: "",
        classroom_id: "",
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedStudent) {
        await supabaseRef.current
          .from("students")
          .update(formData)
          .eq("id", selectedStudent.id);
      } else {
        await supabaseRef.current.from("students").insert([formData]);
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving student:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStudent) return;
    setIsSubmitting(true);
    try {
      await supabaseRef.current.from("students").delete().eq("id", selectedStudent.id);
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting student:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "student_code", header: "Código" },
    { key: "first_name", header: "Nombre" },
    { key: "last_name", header: "Apellido" },
    {
      key: "classroom_id",
      header: "Salón",
      render: (item: Student) => {
        const classroom = classrooms.find((c) => c.id === item.classroom_id);
        return classroom?.name || "-";
      },
    },
    { key: "status", header: "Estado" },
  ];

  return (
    <div>
      <PageHeader
        title="Alumnos"
        description="Gestionar alumnos registrados"
        actionLabel="Nuevo Alumno"
        onAction={() => handleOpenModal()}
      />

      {loading ? null : students.length === 0 ? (
        <EmptyState
          title="No hay alumnos"
          description="Comienza agregando el primer alumno"
          actionLabel="Nuevo Alumno"
          onAction={() => handleOpenModal()}
        />
      ) : (
        <DataTable
          data={students}
          columns={columns}
          onEdit={handleOpenModal}
          onDelete={(item) => {
            setSelectedStudent(item);
            setDeleteDialogOpen(true);
          }}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedStudent ? "Editar Alumno" : "Nuevo Alumno"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {selectedStudent ? "Guardar Cambios" : "Crear Alumno"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Código"
              value={formData.student_code}
              onChange={(e) => setFormData({ ...formData, student_code: e.target.value })}
              required
            />
            <Select
              label="Salón"
              value={formData.classroom_id}
              onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
              options={classrooms.map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              required
            />
            <Input
              label="Apellido"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de Nacimiento"
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            />
            <Select
              label="Género"
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              options={[
                { value: "male", label: "Masculino" },
                { value: "female", label: "Femenino" },
              ]}
            />
          </div>
          <Input
            label="Dirección"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
          <Input
            label="Teléfono"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Contacto de Emergencia"
              value={formData.emergency_contact}
              onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
            />
            <Input
              label="Teléfono de Emergencia"
              value={formData.emergency_phone}
              onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
            />
          </div>
          <Input
            label="Fecha de Matrícula"
            type="date"
            value={formData.enrollment_date}
            onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
          />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Alumno"
        message={`¿Está seguro de eliminar a ${selectedStudent?.first_name} ${selectedStudent?.last_name}? Esta acción no se puede deshacer.`}
        isLoading={isSubmitting}
      />
    </div>
  );
}