"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatsCard } from "@/components/common/StatsCard";
import { NewsCarousel } from "@/components/common/NewsCarousel";
import { DashboardCalendar, CalendarEvent } from "@/components/common/DashboardCalendar";
import { formatDate } from "@/lib/utils";
import { BookOpen, FileText, Clock, Award, Calendar } from "lucide-react";
import { ShimmerCard, ShimmerTable } from "@/components/common/SkeletonLoader";
import Link from "next/link";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";

interface NewsItem { id: string; title: string; excerpt: string | null; image: string | null; published_at: string | null; }
interface Task { id: string; title: string; due_date: string; max_score: number; }
interface Event { id: string; title: string; start_date: string; location: string | null; color: string | null; }

interface TaskWithMeta extends Task {
  studentStatus: "pending" | "submitted" | "graded";
  score: number | null;
}

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    enrolledSubjects: 0,
    pendingTasks: 0,
    pendingReview: 0,
    gradedTasks: 0,
    upcomingEvents: 0,
  });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [tasksWithMeta, setTasksWithMeta] = useState<TaskWithMeta[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: studentData } = await supabaseRef.current
        .from("students")
        .select("id, classroom_id")
        .eq("user_id", user.id)
        .single();

      if (!studentData) {
        setLoading(false);
        return;
      }

      const studentId = studentData.id;
      const classroomId = studentData.classroom_id;

      const { data: classroomSubjects } = await supabaseRef.current
        .from("classroom_subjects")
        .select("id")
        .eq("classroom_id", classroomId);

      const classroomSubjectIds = classroomSubjects?.map((cs) => cs.id) || [];

      const [newsRes, tasksRes, eventsRes, submissionsRes] = await Promise.all([
        supabaseRef.current.from("news").select("*").eq("is_published", true).order("published_at", { ascending: false }).limit(5),
        classroomSubjectIds.length > 0
          ? supabaseRef.current.from("tasks").select("id, title, due_date, max_score").eq("status", "published").in("classroom_subject_id", classroomSubjectIds).order("due_date")
          : Promise.resolve({ data: null, error: null }),
        supabaseRef.current.from("events").select("*").gte("start_date", new Date().toISOString()).order("start_date").limit(5),
        supabaseRef.current.from("submissions").select("task_id, score, submitted_at").eq("student_id", studentId),
      ]);

      if (newsRes.data) setNews(newsRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);

      const subMap = new Map<string, { score: number | null }>();
      if (submissionsRes.data) {
        for (const sub of submissionsRes.data) {
          subMap.set(sub.task_id, { score: sub.score });
        }
      }

      const enrichedTasks: TaskWithMeta[] = (tasksRes.data || []).map((t) => {
        const sub = subMap.get(t.id);
        if (!sub) return { ...t, studentStatus: "pending" as const, score: null };
        if (sub.score !== null) return { ...t, studentStatus: "graded" as const, score: sub.score };
        return { ...t, studentStatus: "submitted" as const, score: null };
      });

      const sorted = enrichedTasks.sort((a, b) => {
        const order = { pending: 0, submitted: 1, graded: 2 };
        return order[a.studentStatus] - order[b.studentStatus];
      }).slice(0, 8);

      setTasksWithMeta(sorted);

      setStats({
        enrolledSubjects: classroomSubjectIds.length,
        pendingTasks: enrichedTasks.filter((t) => t.studentStatus === "pending").length,
        pendingReview: enrichedTasks.filter((t) => t.studentStatus === "submitted").length,
        gradedTasks: enrichedTasks.filter((t) => t.studentStatus === "graded").length,
        upcomingEvents: eventsRes.data?.length || 0,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, fetchData]);

  useRealtimeSubscription("tasks", undefined, () => fetchData());

  const calendarEvents = useMemo((): CalendarEvent[] => {
    const result: CalendarEvent[] = [];
    const now = new Date();

    for (const t of tasksWithMeta) {
      const daysLeft = Math.ceil((new Date(t.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      result.push({
        id: t.id,
        title: t.title,
        date: t.due_date,
        type: "task",
        taskStatus: t.studentStatus,
        daysLeft,
      });
    }

    for (const ev of events) {
      result.push({
        id: ev.id,
        title: ev.title,
        date: ev.start_date,
        type: "event",
        color: ev.color,
      });
    }

    for (const n of news) {
      if (n.published_at) {
        result.push({
          id: n.id,
          title: n.title,
          date: n.published_at,
          type: "news",
        });
      }
    }

    return result;
  }, [tasksWithMeta, events, news]);

  if (authLoading || loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (<ShimmerCard key={i} />))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ShimmerCard />
        <ShimmerCard />
        <ShimmerTable rows={4} cols={1} />
      </div>
    </div>
  );

  const statusBadge = (task: TaskWithMeta) => {
    if (task.studentStatus === "graded") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
          <Award className="w-3 h-3" />
          {task.score}/{task.max_score}
        </span>
      );
    }
    if (task.studentStatus === "submitted") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full border border-amber-200">
          <Clock className="w-3 h-3" /> Por calificar
        </span>
      );
    }
    const now = new Date();
    const due = new Date(task.due_date);
    const daysLeft = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 rounded-full border border-red-200">
          Vencida
        </span>
      );
    }
    if (daysLeft <= 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-rose-50 text-rose-700 rounded-full border border-rose-200">
          <Clock className="w-3 h-3" /> {daysLeft}d restantes
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
        <FileText className="w-3 h-3" /> Pendiente
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 md:p-8 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">Panel del alumno</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-2 font-serif">
              Tu progreso academico en un vistazo
            </h2>
            <p className="text-slate-500 mt-2 max-w-2xl">
              Consulta tareas, novedades y eventos sin perder de vista tu avance.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Periodo</p>
              <p className="text-sm font-semibold text-slate-900">Actual</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estado</p>
              <p className="text-sm font-semibold text-slate-900">Activo</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard title="Materias" value={stats.enrolledSubjects} icon={<BookOpen className="w-6 h-6" />} />
        <StatsCard title="Pendientes" value={stats.pendingTasks} icon={<FileText className="w-6 h-6" />} />
        <StatsCard title="Por Calificar" value={stats.pendingReview} icon={<Clock className="w-6 h-6" />} />
        <StatsCard title="Calificadas" value={stats.gradedTasks} icon={<Award className="w-6 h-6" />} />
        <StatsCard title="Prox. Eventos" value={stats.upcomingEvents} icon={<Calendar className="w-6 h-6" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <DashboardCalendar events={calendarEvents} />
        </div>
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-3">Comunicados</p>
            {news.length > 0 ? (
              <NewsCarousel news={news} />
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400">
                <p className="text-sm">No hay noticias</p>
              </div>
            )}
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm h-full">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-3">Eventos</p>
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: event.color || "#7c3aed" }}
                    >
                      {new Date(event.start_date).getDate()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 text-sm truncate">{event.title}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(event.start_date)}
                        {event.location ? ` - ${event.location}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400">
                <p className="text-sm">No hay eventos proximos</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 font-serif">Mis Tareas</h3>
          </div>
          <Link href="/student/tasks" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            Ver todas
          </Link>
        </div>
        {tasksWithMeta.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-4 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wider">Tarea</th>
                  <th className="text-left px-4 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wider">Fecha limite</th>
                  <th className="text-center px-4 py-2 font-semibold text-slate-500 text-xs uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasksWithMeta.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href="/student/tasks" className="font-medium text-slate-900 hover:text-primary-700">
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(task.due_date)}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(task)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No hay tareas asignadas</p>
        )}
      </div>
    </div>
  );
}
