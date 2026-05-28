"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatsCard } from "@/components/common/StatsCard";
import { NewsCarousel } from "@/components/common/NewsCarousel";
import { formatDate } from "@/lib/utils";
import { Users, UserCog, Building2, Calendar } from "lucide-react";

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClassrooms: number;
  upcomingEvents: number;
}

interface NewsItem {
  id: string;
  title: string;
  excerpt: string | null;
  image: string | null;
  published_at: string | null;
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
  color: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClassrooms: 0,
    upcomingEvents: 0,
  });
  const [news, setNews] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, teachersRes, classroomsRes, eventsRes, newsRes] =
        await Promise.all([
          supabaseRef.current.from("students").select("id", { count: "exact" }),
          supabaseRef.current.from("teachers").select("id", { count: "exact" }),
          supabaseRef.current.from("classrooms").select("id", { count: "exact" }),
          supabaseRef.current
            .from("events")
            .select("*")
            .gte("start_date", new Date().toISOString())
            .order("start_date")
            .limit(5),
          supabaseRef.current
            .from("news")
            .select("*")
            .eq("is_published", true)
            .order("published_at", { ascending: false })
            .limit(5),
        ]);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalClassrooms: classroomsRes.count || 0,
        upcomingEvents: eventsRes.data?.length || 0,
      });

      if (newsRes.data) setNews(newsRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchData().finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  if (loading) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-6 md:p-8 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">Panel administrativo</p>
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-2 font-serif">
              Dashboard institucional
            </h2>
            <p className="text-slate-500 mt-2 max-w-2xl">
              Seguimiento general de alumnos, docentes y eventos con indicadores claros.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Estado</p>
              <p className="text-sm font-semibold text-slate-900">Operativo</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Ciclo</p>
              <p className="text-sm font-semibold text-slate-900">2026</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard
          title="Total Alumnos"
          value={stats.totalStudents}
          icon={<Users className="w-6 h-6" />}
          description="Alumnos registrados"
        />
        <StatsCard
          title="Total Profesores"
          value={stats.totalTeachers}
          icon={<UserCog className="w-6 h-6" />}
          description="Profesores activos"
        />
        <StatsCard
          title="Salones"
          value={stats.totalClassrooms}
          icon={<Building2 className="w-6 h-6" />}
          description="Salones activos"
        />
        <StatsCard
          title="Eventos Próximos"
          value={stats.upcomingEvents}
          icon={<Calendar className="w-6 h-6" />}
          description="Eventos programados"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Comunicados</p>
                <h3 className="text-xl font-semibold text-slate-900 font-serif">Noticias</h3>
              </div>
              <a href="/admin/news" className="text-sm font-medium text-primary-700 hover:text-primary-800">
                Ver todas
              </a>
            </div>
            {news.length > 0 ? (
              <NewsCarousel news={news} />
            ) : (
              <p className="text-slate-500 text-center py-8">No hay noticias publicadas</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Agenda</p>
            <h3 className="text-xl font-semibold text-slate-900 font-serif">Eventos Próximos</h3>
          </div>
          {events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1.5"
                    style={{ backgroundColor: event.color || "#1d4ed8" }}
                  />
                  <div>
                    <p className="font-medium text-slate-900">{event.title}</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(event.start_date)}
                      {event.location && ` - ${event.location}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No hay eventos próximos</p>
          )}
        </div>
      </div>
    </div>
  );
}
