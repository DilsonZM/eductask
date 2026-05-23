"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";

interface ScheduleWithDetails {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
  subject_name: string;
}

const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current
        .from("schedules")
        .select("*, subjects(name)")
        .order("day_of_week")
        .order("start_time");
      if (data) {
        setSchedules(data.map((s) => ({
          ...s,
          subject_name: (s.subjects as Record<string, string>)?.name || "",
        })) as ScheduleWithDetails[]);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getSchedulesByDay = (day: number) => schedules.filter((s) => s.day_of_week === day);

  return (
    <div>
      <PageHeader title="Horario" description="Tu horario semanal" />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : schedules.length === 0 ? (
        <EmptyState title="No hay horario" description="No tienes horarios asignados" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-r border-gray-200">
            {days.slice(1).map((day, index) => (
              <div key={day} className="min-h-[300px] border-r border-gray-200 last:border-r-0">
                <div className="bg-gray-50 p-3 text-center font-semibold border-b border-gray-200">{day}</div>
                <div className="p-2 space-y-2">
                  {getSchedulesByDay(index + 1).map((schedule) => (
                    <div key={schedule.id} className="bg-primary-50 border border-primary-200 rounded-lg p-3">
                      <p className="font-medium text-primary-900 text-sm">{schedule.start_time} - {schedule.end_time}</p>
                      <p className="text-primary-700 text-sm">{schedule.subject_name}</p>
                      {schedule.location && <p className="text-primary-600 text-xs">{schedule.location}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}