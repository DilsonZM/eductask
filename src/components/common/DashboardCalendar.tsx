"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "event" | "task" | "news";
  color?: string | null;
  taskStatus?: "pending" | "submitted" | "graded";
  daysLeft?: number;
}

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DAYS = ["D", "L", "M", "X", "J", "V", "S"];

function dotColor(ev: CalendarEvent): string {
  if (ev.type === "event") return "bg-purple-400";
  if (ev.type === "news") return "bg-emerald-400";
  if (ev.taskStatus === "graded") return "bg-emerald-500";
  if (ev.taskStatus === "submitted") return "bg-amber-400";
  if (ev.daysLeft !== undefined && ev.daysLeft < 0) return "bg-red-400";
  if (ev.daysLeft !== undefined && ev.daysLeft <= 2) return "bg-rose-400";
  return "bg-blue-400";
}

function dotLabel(ev: CalendarEvent): string {
  if (ev.type === "event") return "evento";
  if (ev.type === "news") return "noticia";
  if (ev.taskStatus === "graded") return "calificada";
  if (ev.taskStatus === "submitted") return "entregada";
  if (ev.daysLeft !== undefined && ev.daysLeft < 0) return "vencida";
  if (ev.daysLeft !== undefined && ev.daysLeft <= 2) return "por vencer";
  return "pendiente";
}

export function DashboardCalendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(isCurrentMonth ? today.getDate() : null);
  };

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    for (const ev of events) {
      const d = new Date(ev.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    }
    return map;
  }, [events, year, month]);

  const isToday = (day: number) => isCurrentMonth && today.getDate() === day;
  const activeDay = hoveredDay || selectedDay;
  const activeItems = activeDay ? eventsByDay[activeDay] || [] : [];

  const upcoming = useMemo(() => {
    const items: CalendarEvent[] = [];
    const now = Date.now();
    for (const ev of events) {
      if (new Date(ev.date).getTime() >= now) items.push(ev);
    }
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return items.slice(0, 4);
  }, [events]);

  const dayLabels: Record<number, string> = {};
  for (const [dayStr, items] of Object.entries(eventsByDay)) {
    dayLabels[Number(dayStr)] = items.map((ev) => `${dotLabel(ev)}: ${ev.title}`).join("\n");
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden select-none">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
        <button onClick={prevMonth} className="p-0.5 rounded hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
        </button>
        <button onClick={goToday} className="text-xs font-semibold text-slate-700 hover:text-primary-600 transition-colors">
          {MONTHS[month]} {year}
        </button>
        <button onClick={nextMonth} className="p-0.5 rounded hover:bg-slate-100 transition-colors">
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      <div className="px-2 pt-2">
        <div className="grid grid-cols-7 mb-0.5">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-[9px] font-bold text-slate-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`e-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dots = eventsByDay[day] || [];
            const label = dayLabels[day] || "";
            return (
              <div key={day} className="relative">
                <button
                  onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  title={label}
                  className={`w-full aspect-square flex flex-col items-center justify-center rounded-md text-[11px] transition-colors relative
                    ${isToday(day) ? "bg-primary-600 text-white font-bold shadow-sm shadow-primary-200" : "text-slate-600 hover:bg-slate-100"}
                    ${selectedDay === day && !isToday(day) ? "bg-slate-100 font-semibold ring-1 ring-slate-200" : ""}
                  `}
                >
                  <span>{day}</span>
                  {dots.length > 0 && (
                    <div className="flex gap-[1.5px] mt-[1px]">
                      {dots.slice(0, 3).map((ev, j) => (
                        <span key={j} className={`w-1 h-1 rounded-full ${dotColor(ev)}`} />
                      ))}
                      {dots.length > 3 && (
                        <span className="text-[7px] text-slate-400 leading-none">+{dots.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>

                {hoveredDay === day && dots.length > 0 && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 bg-slate-800 text-white text-[10px] rounded-lg px-2 py-1.5 shadow-xl whitespace-nowrap max-w-[200px] pointer-events-none">
                    <div className="space-y-0.5">
                      {dots.map((ev, j) => (
                        <div key={j} className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor(ev)}`} />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-800" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 px-3 py-2 min-h-[56px]">
        {activeItems.length > 0 ? (
          <div className="space-y-0.5">
            {activeItems.slice(0, 3).map((ev) => (
              <div key={ev.id} className="flex items-center gap-1.5 text-[10px] py-0.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor(ev)}`} />
                <span className="text-slate-600 truncate">{ev.title}</span>
              </div>
            ))}
            {activeItems.length > 3 && (
              <p className="text-[10px] text-slate-400 pl-3">+{activeItems.length - 3} mas</p>
            )}
          </div>
        ) : upcoming.length > 0 ? (
          <div className="space-y-0.5">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Proximo</p>
            {upcoming.map((ev) => (
              <div key={ev.id} className="flex items-center gap-1.5 text-[10px] py-0.5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor(ev)}`} />
                <span className="text-slate-600 truncate">{ev.title}</span>
                <span className="text-slate-400 ml-auto flex-shrink-0">
                  {new Date(ev.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 text-center py-2">Sin actividades</p>
        )}
      </div>
    </div>
  );
}
