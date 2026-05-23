"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { Tables } from "@/types/database";

type Schedule = Tables<"schedules">;

interface ClassroomOption { id: string; name: string }

const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const hours = Array.from({ length: 12 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`);

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseRef = useRef(createClient());

  const [formData, setFormData] = useState({ classroom_id: "", day_of_week: "1", start_time: "07:30", end_time: "08:30", location: "" });

  const fetchClassrooms = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current.from("classrooms").select("id, name").eq("status", "active");
      if (data) setClassrooms(data);
    } catch (error) {
      console.error("Error:", error);
    }
  }, []);

  const fetchSchedules = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current.from("schedules").select("*").eq("classroom_id", selectedClassroom).order("day_of_week").order("start_time");
      if (data) setSchedules(data);
    } catch (error) {
      console.error("Error:", error);
    }
  }, [selectedClassroom]);

  useEffect(() => { fetchClassrooms(); }, [fetchClassrooms]);

  useEffect(() => {
    if (selectedClassroom) fetchSchedules();
    else setSchedules([]);
  }, [selectedClassroom, fetchSchedules]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await supabaseRef.current.from("schedules").insert([{ ...formData, day_of_week: parseInt(formData.day_of_week) }]);
      setModalOpen(false);
      setFormData({ classroom_id: selectedClassroom, day_of_week: "1", start_time: "07:30", end_time: "08:30", location: "" });
      fetchSchedules();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabaseRef.current.from("schedules").delete().eq("id", id);
      fetchSchedules();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const getSchedulesByDay = (day: number) => schedules.filter((s) => s.day_of_week === day);

  return (
    <div>
      <PageHeader title="Horarios" description="Gestionar horarios por salón" />
      <div className="mb-6">
        <Select label="Seleccionar Salón" value={selectedClassroom} onChange={(e) => setSelectedClassroom(e.target.value)} options={classrooms.map((c) => ({ value: c.id, label: c.name }))} className="max-w-xs" />
      </div>

      {selectedClassroom && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Horario Semanal</h3>
            <Button onClick={() => { setFormData({ ...formData, classroom_id: selectedClassroom }); setModalOpen(true); }}>Agregar Horario</Button>
          </div>
          <div className="grid grid-cols-7 border-r border-gray-200">
            {days.slice(1).map((day, index) => (
              <div key={day} className="min-h-[400px] border-r border-gray-200 last:border-r-0">
                <div className="bg-gray-50 p-2 text-center font-medium text-sm border-b border-gray-200">{day}</div>
                <div className="p-2 space-y-2">
                  {getSchedulesByDay(index + 1).map((schedule) => (
                    <div key={schedule.id} className="bg-primary-50 border border-primary-200 rounded-lg p-2 text-xs relative group">
                      <p className="font-medium text-primary-900">{schedule.start_time} - {schedule.end_time}</p>
                      <p className="text-primary-700 truncate">{schedule.location}</p>
                      <button onClick={() => handleDelete(schedule.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700">×</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Horario" footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSubmit} isLoading={isSubmitting}>Crear</Button></>}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Día" value={formData.day_of_week} onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })} options={days.slice(1).map((d, i) => ({ value: String(i + 1), label: d }))} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Hora Inicio" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} options={hours.map((h) => ({ value: h, label: h }))} />
            <Select label="Hora Fin" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} options={hours.map((h) => ({ value: h, label: h }))} />
          </div>
          <input type="text" placeholder="Ubicación (ej: Aula 101)" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
        </form>
      </Modal>
    </div>
  );
}