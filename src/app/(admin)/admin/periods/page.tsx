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

type Period = Tables<"school_periods">;

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [, setAcademicYears] = useState<{ id: string; year: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseRef = useRef(createClient());

  const [formData, setFormData] = useState({ name: "", start_date: "", end_date: "", order: "1", academic_year_id: "" });

  const fetchData = useCallback(async () => {
    try {
      const [periodsRes, yearsRes] = await Promise.all([
        supabaseRef.current.from("school_periods").select("*").order("order"),
        supabaseRef.current.from("academic_years").select("id, year").eq("status", "active"),
      ]);
      if (periodsRes.data) setPeriods(periodsRes.data);
      if (yearsRes.data) setAcademicYears(yearsRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (period?: Period) => {
    if (period) {
      setSelectedPeriod(period);
      setFormData({ name: period.name, start_date: period.start_date, end_date: period.end_date, order: String(period.order), academic_year_id: period.academic_year_id || "" });
    } else {
      setSelectedPeriod(null);
      setFormData({ name: "", start_date: "", end_date: "", order: "1", academic_year_id: "" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = { ...formData, order: parseInt(formData.order) };
      if (selectedPeriod) {
        await supabaseRef.current.from("school_periods").update(data).eq("id", selectedPeriod.id);
      } else {
        await supabaseRef.current.from("school_periods").insert([data]);
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
    if (!selectedPeriod) return;
    setIsSubmitting(true);
    try {
      await supabaseRef.current.from("school_periods").delete().eq("id", selectedPeriod.id);
      setDeleteDialogOpen(false);
      setSelectedPeriod(null);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "name", header: "Nombre" },
    { key: "start_date", header: "Fecha Inicio" },
    { key: "end_date", header: "Fecha Fin" },
    { key: "order", header: "Orden" },
    { key: "status", header: "Estado" },
  ];

  return (
    <div>
      <PageHeader title="Períodos Escolares" description="Gestionar períodos" actionLabel="Nuevo Período" onAction={() => handleOpenModal()} />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : periods.length === 0 ? (
        <EmptyState title="No hay períodos" description="Comienza creando el primer período" actionLabel="Nuevo Período" onAction={() => handleOpenModal()} />
      ) : (
        <DataTable data={periods} columns={columns} onEdit={handleOpenModal} onDelete={(item) => { setSelectedPeriod(item); setDeleteDialogOpen(true); }} />
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedPeriod ? "Editar Período" : "Nuevo Período"} footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} isLoading={isSubmitting}>{selectedPeriod ? "Guardar" : "Crear"}</Button></>}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Primer Trimestre" required />
          <div className="grid grid-cols-3 gap-4">
            <Input label="Orden" type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fecha Inicio" type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
            <Input label="Fecha Fin" type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} required />
          </div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Período" message={`¿Está seguro de eliminar "${selectedPeriod?.name}"?`} isLoading={isSubmitting} />
    </div>
  );
}