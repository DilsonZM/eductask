"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatsCard } from "@/components/common/StatsCard";
import { NewsCarousel } from "@/components/common/NewsCarousel";
import { CardSkeleton } from "@/components/common/SkeletonLoader";
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
    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setLoading(false);
      }
    }, 6000);

    fetchData().finally(() => {
      window.clearTimeout(timeoutId);
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500">Bienvenido al panel de administración</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Noticias</h3>
              <a href="/admin/news" className="text-sm text-primary-600 hover:text-primary-700">
                Ver todas
              </a>
            </div>
            {news.length > 0 ? (
              <NewsCarousel news={news} />
            ) : (
              <p className="text-gray-500 text-center py-8">No hay noticias publicadas</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Eventos Próximos</h3>
          {events.length > 0 ? (
            <div className="space-y-4">
              {events.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full mt-1.5"
                    style={{ backgroundColor: event.color || "#2563eb" }}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(event.start_date)}
                      {event.location && ` - ${event.location}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay eventos próximos</p>
          )}
        </div>
      </div>
    </div>
  );
}