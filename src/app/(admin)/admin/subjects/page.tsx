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

type Subject = Tables<"subjects">;

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseRef = useRef(createClient());

  const [formData, setFormData] = useState({ name: "", description: "", code: "", credits: "1" });

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current.from("subjects").select("*").order("name");
      if (data) setSubjects(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (subject?: Subject) => {
    if (subject) {
      setSelectedSubject(subject);
      setFormData({ name: subject.name, description: subject.description || "", code: subject.code, credits: String(subject.credits) });
    } else {
      setSelectedSubject(null);
      setFormData({ name: "", description: "", code: "", credits: "1" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = { ...formData, credits: parseInt(formData.credits) };
      if (selectedSubject) {
        await supabaseRef.current.from("subjects").update(data).eq("id", selectedSubject.id);
      } else {
        await supabaseRef.current.from("subjects").insert([data]);
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
    if (!selectedSubject) return;
    setIsSubmitting(true);
    try {
      await supabaseRef.current.from("subjects").delete().eq("id", selectedSubject.id);
      setDeleteDialogOpen(false);
      setSelectedSubject(null);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "code", header: "Código" },
    { key: "name", header: "Nombre" },
    { key: "description", header: "Descripción" },
    { key: "credits", header: "Créditos" },
  ];

  return (
    <div>
      <PageHeader title="Materias" description="Gestionar materias" actionLabel="Nueva Materia" onAction={() => handleOpenModal()} />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : subjects.length === 0 ? (
        <EmptyState title="No hay materias" description="Comienza creando la primera materia" actionLabel="Nueva Materia" onAction={() => handleOpenModal()} />
      ) : (
        <DataTable data={subjects} columns={columns} onEdit={handleOpenModal} onDelete={(item) => { setSelectedSubject(item); setDeleteDialogOpen(true); }} />
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedSubject ? "Editar Materia" : "Nueva Materia"} footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} isLoading={isSubmitting}>{selectedSubject ? "Guardar" : "Crear"}</Button></>}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Código" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="MAT-5" required />
          <Input label="Nombre" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <Input label="Descripción" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          <Input label="Créditos" type="number" value={formData.credits} onChange={(e) => setFormData({ ...formData, credits: e.target.value })} required />
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Materia" message={`¿Está seguro de eliminar ${selectedSubject?.name}?`} isLoading={isSubmitting} />
    </div>
  );
}