"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Event = Tables<"events">;

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseRef = useRef(createClient());

  const [formData, setFormData] = useState({
    title: "", description: "", start_date: "", end_date: "", location: "", color: "#2563eb", is_all_day: true, event_type: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current.from("events").select("*").order("start_date", { ascending: false });
      if (data) setEvents(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenModal = (event?: Event) => {
    if (event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title, description: event.description || "", start_date: event.start_date.slice(0, 16), end_date: event.end_date?.slice(0, 16) || "", location: event.location || "", color: event.color || "#2563eb", is_all_day: event.is_all_day, event_type: event.event_type || "",
      });
    } else {
      setSelectedEvent(null);
      setFormData({ title: "", description: "", start_date: "", end_date: "", location: "", color: "#2563eb", is_all_day: true, event_type: "" });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (selectedEvent) {
        await supabaseRef.current.from("events").update(formData).eq("id", selectedEvent.id);
      } else {
        await supabaseRef.current.from("events").insert([formData]);
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
    if (!selectedEvent) return;
    setIsSubmitting(true);
    try {
      await supabaseRef.current.from("events").delete().eq("id", selectedEvent.id);
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
      fetchData();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    { key: "title", header: "Título" },
    { key: "start_date", header: "Fecha Inicio", render: (item: Event) => formatDate(item.start_date) },
    { key: "location", header: "Ubicación" },
    { key: "color", header: "Color", render: (item: Event) => <div className="w-6 h-6 rounded" style={{ backgroundColor: item.color || "#2563eb" }} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Eventos" description="Gestionar eventos" actionLabel="Nuevo Evento" onAction={() => handleOpenModal()} />
      {loading ? null : events.length === 0 ? (
        <EmptyState title="No hay eventos" description="Comienza creando el primer evento" actionLabel="Nuevo Evento" onAction={() => handleOpenModal()} />
      ) : (
        <DataTable data={events} columns={columns} onEdit={handleOpenModal} onDelete={(item) => { setSelectedEvent(item); setDeleteDialogOpen(true); }} />
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedEvent ? "Editar Evento" : "Nuevo Evento"} footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} isLoading={isSubmitting}>{selectedEvent ? "Guardar" : "Crear"}</Button></>}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Título" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Fecha y Hora Inicio" type="datetime-local" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} required />
            <Input label="Fecha y Hora Fin" type="datetime-local" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
          </div>
          <Input label="Ubicación" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Color" type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-10" />
            <Input label="Tipo" value={formData.event_type} onChange={(e) => setFormData({ ...formData, event_type: e.target.value })} />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={formData.is_all_day} onChange={(e) => setFormData({ ...formData, is_all_day: e.target.checked })} className="rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
            <span className="text-sm text-slate-700">Todo el día</span>
          </label>
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Evento" message={`¿Está seguro de eliminar "${selectedEvent?.title}"?`} isLoading={isSubmitting} />
    </div>
  );
}
