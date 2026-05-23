"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDate } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  max_score: number;
  status: string;
  classroom_subject?: { subjects: { name: string } | null };
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current
        .from("tasks")
        .select("*, classroom_subjects(subjects(name))")
        .eq("status", "published")
        .order("due_date", { ascending: false });
      if (data) {
        setTasks(data.map((t) => ({
          ...t,
          classroom_subject: t.classroom_subjects as Record<string, unknown>,
        })) as Task[]);
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

  const getSubjectName = (task: Task) => {
    const cs = task.classroom_subject;
    return cs ? (cs.subjects as Record<string, string>)?.name || "Sin materia" : "Sin materia";
  };

  return (
    <div>
      <PageHeader title="Tareas" description="Tareas asignadas" />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : tasks.length === 0 ? (
        <EmptyState title="No hay tareas" description="No tienes tareas asignadas" />
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{task.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{getSubjectName(task)}</p>
                </div>
                <span className={`px-3 py-1 text-xs rounded-full ${new Date(task.due_date) < new Date() ? "bg-red-100 text-red-700" : "bg-primary-100 text-primary-700"}`}>
                  {new Date(task.due_date) < new Date() ? "Vencida" : formatDate(task.due_date)}
                </span>
              </div>
              {task.description && <p className="text-gray-600 mt-3">{task.description}</p>}
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                <span>Fecha límite: {formatDate(task.due_date)}</span>
                <span>Puntaje máximo: {task.max_score}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}