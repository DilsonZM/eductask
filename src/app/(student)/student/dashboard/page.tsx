"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatsCard } from "@/components/common/StatsCard";
import { CardSkeleton } from "@/components/common/SkeletonLoader";
import { NewsCarousel } from "@/components/common/NewsCarousel";
import { formatDate } from "@/lib/utils";
import { BookOpen, CheckSquare, GraduationCap, Calendar } from "lucide-react";
import Link from "next/link";

interface NewsItem { id: string; title: string; excerpt: string | null; image: string | null; published_at: string | null; }
interface Task { id: string; title: string; due_date: string; status: string; }
interface Event { id: string; title: string; start_date: string; location: string | null; color: string | null; }

export default function StudentDashboard() {
  const [stats, setStats] = useState({ enrolledSubjects: 0, pendingTasks: 0, recentGrades: 0, upcomingEvents: 0 });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const [newsRes, tasksRes, eventsRes] = await Promise.all([
        supabaseRef.current.from("news").select("*").eq("is_published", true).order("published_at", { ascending: false }).limit(5),
        supabaseRef.current.from("tasks").select("id, title, due_date, status").eq("status", "published").order("due_date").limit(5),
        supabaseRef.current.from("events").select("*").gte("start_date", new Date().toISOString()).order("start_date").limit(5),
      ]);
      if (newsRes.data) setNews(newsRes.data);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      setStats({ enrolledSubjects: 5, pendingTasks: tasksRes.data?.length || 0, recentGrades: 2, upcomingEvents: eventsRes.data?.length || 0 });
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
        <p className="text-gray-500">Bienvenido a tu panel de alumno</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Materias" value={stats.enrolledSubjects} icon={<BookOpen className="w-6 h-6" />} />
        <StatsCard title="Tareas Pendientes" value={stats.pendingTasks} icon={<CheckSquare className="w-6 h-6" />} />
        <StatsCard title="Notas Recientes" value={stats.recentGrades} icon={<GraduationCap className="w-6 h-6" />} />
        <StatsCard title="Eventos Próximos" value={stats.upcomingEvents} icon={<Calendar className="w-6 h-6" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Noticias</h3>
            {news.length > 0 ? <NewsCarousel news={news} /> : <p className="text-gray-500 text-center py-8">No hay noticias</p>}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Eventos Próximos</h3>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="w-3 h-3 rounded-full mt-1.5" style={{ backgroundColor: event.color || "#2563eb" }} />
                  <div>
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-500">{formatDate(event.start_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-center py-8">No hay eventos próximos</p>}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tareas Próximas</h3>
        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task) => (
              <Link key={task.id} href="/student/tasks" className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <p className="font-medium text-gray-900">{task.title}</p>
                <p className="text-sm text-gray-500">Fecha límite: {formatDate(task.due_date)}</p>
              </Link>
            ))}
          </div>
        ) : <p className="text-gray-500 text-center py-8">No hay tareas pendientes</p>}
      </div>
    </div>
  );
}