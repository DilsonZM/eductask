"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { StatsCard } from "@/components/common/StatsCard";
import { DashboardCalendar, CalendarEvent } from "@/components/common/DashboardCalendar";
import { formatDate } from "@/lib/utils";
import { ShimmerCard, ShimmerTable } from "@/components/common/SkeletonLoader";
import { BookOpen, CheckSquare, FileText, Users } from "lucide-react";
import Link from "next/link";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { useRealtimeRefresh, RealtimeProgressBar } from "@/hooks/useRealtimeRefresh";

interface NewsItem { id: string; title: string; published_at: string | null; }
interface Event { id: string; title: string; start_date: string; color: string | null; location: string | null; }

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    assignedSubjects: 0,
    publishedTasks: 0,
    pendingSubmissions: 0,
    totalStudents: 0,
  });
  const [recentTasks, setRecentTasks] = useState<
    { id: string; title: string; due_date: string; status: string }[]
  >([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: teacherData } = await supabaseRef.current
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      const teacherId = teacherData?.id;
      if (!teacherId) {
        setLoading(false);
        return;
      }

      const [assignmentsRes, publishedTasksRes, tasksWithDateRes, taskIdsRes, eventsRes, newsRes] =
        await Promise.all([
          supabaseRef.current
            .from("teacher_assignments")
            .select("id, classroom_id", { count: "exact" })
            .eq("teacher_id", teacherId),
          supabaseRef.current
            .from("tasks")
            .select("id", { count: "exact" })
            .eq("teacher_id", teacherId)
            .eq("status", "published"),
          supabaseRef.current
            .from("tasks")
            .select("id, title, due_date, status")
            .eq("teacher_id", teacherId)
            .eq("status", "published")
            .order("due_date")
            .limit(5),
          supabaseRef.current
            .from("tasks")
            .select("id")
            .eq("teacher_id", teacherId)
            .eq("status", "published"),
          supabaseRef.current.from("events").select("*").gte("start_date", new Date().toISOString()).order("start_date").limit(8),
          supabaseRef.current.from("news").select("id, title, published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(8),
        ]);

      let pendingSubmissionsCount = 0;
      const taskIds = (taskIdsRes.data || []).map((t) => t.id);
      if (taskIds.length > 0) {
        const { count } = await supabaseRef.current
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .in("task_id", taskIds)
          .is("score", null);
        pendingSubmissionsCount = count || 0;
      }

      const classroomIds = Array.from(
        new Set((assignmentsRes.data || []).map((a) => a.classroom_id).filter(Boolean))
      );
      let totalStudents = 0;
      if (classroomIds.length > 0) {
        const { count } = await supabaseRef.current
          .from("students")
          .select("id", { count: "exact", head: true })
          .in("classroom_id", classroomIds)
          .eq("status", "active");
        totalStudents = count || 0;
      }

      setStats({
        assignedSubjects: assignmentsRes.count || 0,
        publishedTasks: publishedTasksRes.count || 0,
        pendingSubmissions: pendingSubmissionsCount,
        totalStudents,
      });
      if (tasksWithDateRes.data) setRecentTasks(tasksWithDateRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (newsRes.data) setNews(newsRes.data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { isRefreshing, refresh } = useRealtimeRefresh(fetchData);

  useRealtimeSubscription("tasks", undefined, () => refresh());
  useRealtimeSubscription("submissions", undefined, () => refresh());
  useRealtimeSubscription("teacher_assignments", undefined, () => refresh());

  const calendarEvents = useMemo((): CalendarEvent[] => {
    const result: CalendarEvent[] = [];
    const now = new Date();

    for (const t of recentTasks) {
      const daysLeft = Math.ceil((new Date(t.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      result.push({
        id: t.id,
        title: t.title,
        date: t.due_date,
        type: "task",
        taskStatus: "pending",
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
  }, [recentTasks, events, news]);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (<ShimmerCard key={i} />))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ShimmerCard />
        <ShimmerCard />
        <ShimmerTable rows={4} cols={1} />
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 transition-opacity duration-300 ${isRefreshing ? "opacity-70" : ""}`}>
      <RealtimeProgressBar active={isRefreshing} />
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Panel del Profesor
        </p>
        <h2 className="text-2xl font-semibold text-slate-900 font-serif">
          Dashboard
        </h2>
      </div>
      <p className="text-slate-500 text-sm max-w-lg">
        Gestiona tareas, entregas y horarios con una vista clara de tus
        materias.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard
          title="Materias"
          value={stats.assignedSubjects}
          icon={<BookOpen className="w-5 h-5" />}
        />
        <StatsCard
          title="Tareas Publicadas"
          value={stats.publishedTasks}
          icon={<FileText className="w-5 h-5" />}
        />
        <StatsCard
          title="Entregas Pendientes"
          value={stats.pendingSubmissions}
          icon={<CheckSquare className="w-5 h-5" />}
        />
        <StatsCard
          title="Alumnos"
          value={stats.totalStudents}
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <DashboardCalendar events={calendarEvents} />
        </div>
        <div className="lg:col-span-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 h-full">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Tareas</p>
              <Link href="/teacher/tasks" className="text-sm text-primary-600 hover:text-primary-800 font-medium">Ver todas</Link>
            </div>
            {recentTasks.length > 0 ? (
              <div className="space-y-2">
                {recentTasks.map((task) => {
                  const daysLeft = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <Link key={task.id} href="/teacher/tasks" className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate text-sm">{task.title}</p>
                        <p className="text-xs text-slate-500">
                          Entrega: {formatDate(task.due_date)}
                          {daysLeft <= 2 && daysLeft >= 0 && (
                            <span className="ml-2 text-rose-500 font-medium">{daysLeft === 0 ? "Hoy" : `${daysLeft}d`}</span>
                          )}
                          {daysLeft < 0 && (
                            <span className="ml-2 text-red-500 font-medium">Vencida</span>
                          )}
                        </p>
                      </div>
                      <span className="ml-3 inline-flex px-2 py-0.5 text-xs font-medium rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                        Publicada
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400">
                <p className="text-sm">No hay tareas publicadas</p>
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
    </div>
  );
}
