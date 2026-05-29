"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import {
  TimetableGrid,
  type ScheduleSlot,
} from "@/components/common/TimetableGrid";

export default function StudentSchedulePage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<ScheduleSlot[]>([]);
  const [classroomName, setClassroomName] = useState("");
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: studentData } = await supabaseRef.current
        .from("students")
        .select("classroom_id")
        .eq("user_id", user.id)
        .single();

      if (!studentData?.classroom_id) {
        setLoading(false);
        return;
      }

      const { data: classroomData } = await supabaseRef.current
        .from("classrooms")
        .select("name")
        .eq("id", studentData.classroom_id)
        .single();

      setClassroomName(classroomData?.name || "");

      const { data: scheduleData } = await supabaseRef.current
        .from("schedules")
        .select(
          "*, subjects(name, code), classrooms(name), teachers(first_name, last_name)"
        )
        .eq("classroom_id", studentData.classroom_id)
        .order("day_of_week")
        .order("start_time");

      if (scheduleData) {
        setSchedules(
          scheduleData.map((s: Record<string, any>) => ({
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
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Horario"
        description={
          classroomName ? `Salón: ${classroomName}` : "Tu horario semanal"
        }
      />
      {loading ? (<ShimmerTable rows={8} cols={6} />) : schedules.length === 0 ? (
        <EmptyState
          title="Sin horarios"
          description="Tu salón no tiene horarios configurados aún"
        />
      ) : (
        <TimetableGrid schedules={schedules} />
      )}
    </div>
  );
}
