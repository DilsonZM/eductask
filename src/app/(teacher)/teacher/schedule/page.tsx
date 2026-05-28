"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { Select } from "@/components/ui/Select";
import {
  TimetableGrid,
  type ScheduleSlot,
} from "@/components/common/TimetableGrid";

export default function TeacherSchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [classrooms, setClassrooms] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchTeacherAssignments = useCallback(async () => {
    if (!user) return;
    try {
      const { data: teacherData } = await supabaseRef.current
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!teacherData) {
        setInitialLoading(false);
        return;
      }

      const { data: assignments } = await supabaseRef.current
        .from("teacher_assignments")
        .select("classroom_id, classrooms(name)")
        .eq("teacher_id", teacherData.id);

      if (assignments) {
        const unique = new Map<
          string,
          { id: string; name: string }
        >();
        assignments.forEach((a: Record<string, any>) => {
          if (a.classroom_id && !unique.has(a.classroom_id)) {
            unique.set(a.classroom_id, {
              id: a.classroom_id,
              name: a.classrooms?.name || "Sin nombre",
            });
          }
        });
        const list = Array.from(unique.values());
        setClassrooms(list);
        if (list.length > 0) {
          setSelectedClassroom(list[0].id);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setInitialLoading(false);
    }
  }, [user]);

  const fetchSchedules = useCallback(async () => {
    if (!selectedClassroom) {
      setSchedules([]);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabaseRef.current
        .from("schedules")
        .select(
          "*, subjects(name, code), classrooms(name), teachers(first_name, last_name)"
        )
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
    fetchTeacherAssignments();
  }, [fetchTeacherAssignments]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  if (initialLoading) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Horario" description="Tu horario semanal" />

      {classrooms.length > 1 && (
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
      )}

      {!selectedClassroom ? (
        <EmptyState
          title="Sin horarios asignados"
          description="No tienes salones asignados aún"
        />
      ) : loading ? null : schedules.length === 0 ? (
        <EmptyState
          title="Sin horarios"
          description="Este salón no tiene horarios configurados"
        />
      ) : (
        <TimetableGrid schedules={schedules} />
      )}
    </div>
  );
}
