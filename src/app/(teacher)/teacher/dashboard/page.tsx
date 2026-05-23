"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatsCard } from "@/components/common/StatsCard";
import { CardSkeleton } from "@/components/common/SkeletonLoader";
import { formatDate } from "@/lib/utils";
import { BookOpen, CheckSquare, FileText, Clock } from "lucide-react";
import Link from "next/link";

export default function TeacherDashboard() {
  const [stats, setStats] = useState({ assignedSubjects: 0, pendingTasks: 0, pendingSubmissions: 0, upcomingSchedules: 0 });
  const [recentTasks, setRecentTasks] = useState<{ id: string; title: string; due_date: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const [subjectsRes, tasksRes, submissionsRes, schedulesRes, tasksWithDateRes] = await Promise.all([
        supabaseRef.current.from("teacher_assignments").select("id", { count: "exact" }),
        supabaseRef.current.from("tasks").select("id", { count: "exact" }),
        supabaseRef.current.from("submissions").select("id", { count: "exact" }),
        supabaseRef.current.from("schedules").select("id", { count: "exact" }),
        supabaseRef.current.from("tasks").select("id, title, due_date").order("due_date").limit(5),
      ]);
      setStats({
        assignedSubjects: subjectsRes.count || 0,
        pendingTasks: tasksRes.count || 0,
        pendingSubmissions: submissionsRes.count || 0,
        upcomingSchedules: schedulesRes.count || 0,
      });
      if (tasksWithDateRes.data) setRecentTasks(tasksWithDateRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500">Bienvenido al panel del profesor</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Materias Asignadas" value={stats.assignedSubjects} icon={<BookOpen className="w-6 h-6" />} />
        <StatsCard title="Tareas Creadas" value={stats.pendingTasks} icon={<CheckSquare className="w-6 h-6" />} />
        <StatsCard title="Entregas Pendientes" value={stats.pendingSubmissions} icon={<FileText className="w-6 h-6" />} />
        <StatsCard title="Horarios Activos" value={stats.upcomingSchedules} icon={<Clock className="w-6 h-6" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tareas Recientes</h3>
          {recentTasks.length > 0 ? (
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <Link key={task.id} href="/teacher/tasks" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-sm text-gray-500">Fecha límite: {formatDate(task.due_date)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay tareas recientes</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Accesos Rápidos</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/teacher/tasks" className="p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition text-center">
              <CheckSquare className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <p className="font-medium text-primary-900">Tareas</p>
            </Link>
            <Link href="/teacher/submissions" className="p-4 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition text-center">
              <FileText className="w-8 h-8 text-secondary-600 mx-auto mb-2" />
              <p className="font-medium text-secondary-900">Entregas</p>
            </Link>
            <Link href="/teacher/grades" className="p-4 bg-green-50 rounded-lg hover:bg-green-100 transition text-center">
              <BookOpen className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-medium text-green-900">Notas</p>
            </Link>
            <Link href="/teacher/schedule" className="p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition text-center">
              <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="font-medium text-orange-900">Horario</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}