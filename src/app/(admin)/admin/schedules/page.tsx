"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  TimetableGrid,
  type ScheduleSlot,
} from "@/components/common/TimetableGrid";
import toast from "react-hot-toast";
import type { Tables } from "@/types/database";

type Subject = Tables<"subjects">;
type Teacher = Tables<"teachers">;

interface ClassroomOption {
  id: string;
  name: string;
}

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const hours = Array.from({ length: 23 }, (_, i) => {
  const h = Math.floor(i / 2) + 7;
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [classrooms, setClassrooms] = useState<ClassroomOption[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabaseRef = useRef(createClient());

  const [formData, setFormData] = useState({
    classroom_id: "",
    subject_id: "",
    teacher_id: "",
    day_of_week: "1",
    start_time: "07:00",
    end_time: "08:00",
    location: "",
  });

  const fetchClassrooms = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from("classrooms")
      .select("id, name")
      .eq("status", "active");
    if (data) setClassrooms(data);
  }, []);

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from("subjects")
      .select("*")
      .order("name");
    if (data) setSubjects(data);
  }, []);

  const fetchTeachers = useCallback(async () => {
    const { data } = await supabaseRef.current
      .from("teachers")
      .select("*")
      .eq("status", "active");
    if (data) setTeachers(data);
  }, []);

  const fetchSchedules = useCallback(async () => {
    if (!selectedClassroom) {
      setSchedules([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabaseRef.current
        .from("schedules")
        .select("*, subjects(name, code), classrooms(name), teachers(first_name, last_name)")
        .eq("classroom_id", selectedClassroom)
        .order("day_of_week")
        .order("start_time");
      if (data) {
        setSchedules(
          data.map((s: Record<string, any>) => ({
            id: s.id,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            subject_name: s.subjects?.name || "Sin materia",
            subject_code: s.subjects?.code,
            classroom_name: s.classrooms?.name,
            teacher_name: s.teachers
              ? `${s.teachers.first_name || ""} ${s.teachers.last_name || ""}`.trim()
              : undefined,
            location: s.location,
          }))
        );
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedClassroom]);

  useEffect(() => {
    fetchClassrooms();
    fetchSubjects();
    fetchTeachers();
  }, [fetchClassrooms, fetchSubjects, fetchTeachers]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const getSubjectHours = (subjectId: string): number => {
    return schedules
      .filter((s) => {
        const subj = subjects.find(
          (sub) => sub.name === s.subject_name
        );
        return subj?.id === subjectId;
      })
      .reduce((acc, s) => {
        const [sh, sm] = s.start_time.split(":").map(Number);
        const [eh, em] = s.end_time.split(":").map(Number);
        return acc + (eh - sh) + (em - sm) / 60;
      }, 0);
  };

  const getTotalHours = (): number => {
    return schedules.reduce((acc, s) => {
      const [sh, sm] = s.start_time.split(":").map(Number);
      const [eh, em] = s.end_time.split(":").map(Number);
      return acc + (eh - sh) + (em - sm) / 60;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClassroom && !formData.classroom_id) {
      toast.error("Selecciona un salón primero");
      return;
    }

    const startMin =
      parseInt(formData.start_time.split(":")[0]) * 60 +
      parseInt(formData.start_time.split(":")[1]);
    const endMin =
      parseInt(formData.end_time.split(":")[0]) * 60 +
      parseInt(formData.end_time.split(":")[1]);
    const newHours = (endMin - startMin) / 60;

    const subjectHours = getSubjectHours(formData.subject_id);
    const totalHours = getTotalHours();

    if (formData.subject_id && subjectHours + newHours > 4) {
      const subj = subjects.find((s) => s.id === formData.subject_id);
      toast.error(
        `Máximo 4h/semana por materia. "${subj?.name}" ya tiene ${subjectHours}h.`
      );
      return;
    }
    if (totalHours + newHours > 30) {
      toast.error(`Máximo 30h/semana total. Actualmente hay ${totalHours}h.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        classroom_id: selectedClassroom || formData.classroom_id,
        subject_id: formData.subject_id || null,
        teacher_id: formData.teacher_id || null,
        day_of_week: parseInt(formData.day_of_week),
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location || null,
      };

      const { error } = await supabaseRef.current
        .from("schedules")
        .insert([payload]);
      if (error) throw error;

      toast.success("Horario agregado");
      setModalOpen(false);
      setFormData({
        classroom_id: "",
        subject_id: "",
        teacher_id: "",
        day_of_week: "1",
        start_time: "07:00",
        end_time: "08:00",
        location: "",
      });
      fetchSchedules();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al crear horario");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horarios"
        description="Vista semanal con eje de horas"
        actionLabel={selectedClassroom ? "Agregar Horario" : undefined}
        onAction={
          selectedClassroom
            ? () => {
                setFormData((prev) => ({
                  ...prev,
                  classroom_id: selectedClassroom,
                }));
                setModalOpen(true);
              }
            : undefined
        }
      />

      <div>
        <Select
          label="Seleccionar Salón"
          value={selectedClassroom}
          onChange={(e) => setSelectedClassroom(e.target.value)}
          options={classrooms.map((c) => ({
            value: c.id,
            label: c.name,
          }))}
          className="max-w-xs"
        />
      </div>

      {!selectedClassroom ? (
        <EmptyState
          title="Selecciona un salón"
          description="Elige un salón para ver su horario semanal"
        />
      ) : loading ? null : schedules.length === 0 ? (
        <EmptyState
          title="Sin horarios"
          description="Este salón no tiene horarios asignados"
          actionLabel="Agregar Horario"
          onAction={() => {
            setFormData((prev) => ({
              ...prev,
              classroom_id: selectedClassroom,
            }));
            setModalOpen(true);
          }}
        />
      ) : (
        <TimetableGrid
          schedules={schedules}
          onBlockClick={(slot) => {
            toast(
              `${slot.subject_name}\n${slot.start_time} - ${slot.end_time}\n${slot.teacher_name || ""}\n${slot.location || ""}`,
              { duration: 4000 }
            );
          }}
        />
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nuevo Horario"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              Crear
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Materia"
            value={formData.subject_id}
            onChange={(e) =>
              setFormData({ ...formData, subject_id: e.target.value })
            }
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Select
            label="Profesor"
            value={formData.teacher_id}
            onChange={(e) =>
              setFormData({ ...formData, teacher_id: e.target.value })
            }
            options={teachers.map((t) => ({
              value: t.id,
              label: `${t.first_name} ${t.last_name}`,
            }))}
          />
          <Select
            label="Día"
            value={formData.day_of_week}
            onChange={(e) =>
              setFormData({ ...formData, day_of_week: e.target.value })
            }
            options={DAYS.slice(1).map((d, i) => ({
              value: String(i + 1),
              label: d,
            }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Hora Inicio"
              value={formData.start_time}
              onChange={(e) =>
                setFormData({ ...formData, start_time: e.target.value })
              }
              options={hours.map((h) => ({ value: h, label: h }))}
            />
            <Select
              label="Hora Fin"
              value={formData.end_time}
              onChange={(e) =>
                setFormData({ ...formData, end_time: e.target.value })
              }
              options={hours.map((h) => ({ value: h, label: h }))}
            />
          </div>
          <input
            type="text"
            placeholder="Ubicación (ej: Aula 101)"
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
          <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
            Máx 4 horas/semana por materia · Máx 30 horas/semana total
          </p>
        </form>
      </Modal>
    </div>
  );
}
