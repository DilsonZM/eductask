"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface ScheduleSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code?: string;
  classroom_name?: string;
  teacher_name?: string;
  location: string | null;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const START_HOUR = 7;
const END_HOUR = 18;
const SLOT_HEIGHT = 28;
const PX_PER_MINUTE = SLOT_HEIGHT / 30;

const SUBJECT_PALETTE = [
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", sub: "text-blue-700", dot: "bg-blue-400" },
  { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", sub: "text-emerald-700", dot: "bg-emerald-400" },
  { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-900", sub: "text-violet-700", dot: "bg-violet-400" },
  { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", sub: "text-amber-700", dot: "bg-amber-400" },
  { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", sub: "text-rose-700", dot: "bg-rose-400" },
  { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-900", sub: "text-cyan-700", dot: "bg-cyan-400" },
  { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-900", sub: "text-indigo-700", dot: "bg-indigo-400" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900", sub: "text-orange-700", dot: "bg-orange-400" },
];

function getSubjectColor(subject: string) {
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_PALETTE[Math.abs(hash) % SUBJECT_PALETTE.length];
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h - START_HOUR) * 60 + m;
}

function topToPx(minutes: number): number {
  return minutes * PX_PER_MINUTE;
}

function heightToPx(minutes: number): number {
  return Math.max(minutes * PX_PER_MINUTE, 20);
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

interface TimetableGridProps {
  schedules: ScheduleSlot[];
  onBlockClick?: (slot: ScheduleSlot) => void;
}

export function TimetableGrid({ schedules, onBlockClick }: TimetableGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);

  const totalMinutes = (END_HOUR - START_HOUR) * 60;
  const totalHeight = totalMinutes * PX_PER_MINUTE;

  const handleBlockClick = (slot: ScheduleSlot) => {
    setSelectedSlot(slot);
    onBlockClick?.(slot);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="relative">
            <div className="grid grid-cols-[60px_1fr]">
              <div className="bg-slate-50 border-b border-slate-200">
                <div className="h-10" />
                {Array.from({ length: (END_HOUR - START_HOUR) * 2 }).map((_, i) => {
                  const hour = START_HOUR + Math.floor(i / 2);
                  const minute = i % 2 === 0 ? "00" : "30";
                  return (
                    <div
                      key={i}
                      className="h-7 flex items-center justify-end pr-2 border-b border-slate-100"
                    >
                      <span
                        className={cn(
                          "text-[10px] text-slate-400",
                          minute === "00" ? "font-medium text-slate-500 -mt-1" : ""
                        )}
                      >
                        {minute === "00" ? `${hour}:00` : ""}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="relative">
                <div className="grid grid-cols-5 h-10 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="text-center text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500 flex items-center justify-center border-r border-slate-200 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                <div className="relative" style={{ height: totalHeight }}>
                  {Array.from({ length: (END_HOUR - START_HOUR) * 2 }).map((_, i) => (
                    <div
                      key={`grid-${i}`}
                      className="grid grid-cols-5 h-7 border-b border-slate-50"
                    >
                      {DAYS.map((_, di) => (
                        <div
                          key={di}
                          className="border-r border-slate-100 last:border-r-0"
                        />
                      ))}
                    </div>
                  ))}

                  {DAYS.map((_, dayIndex) => {
                    const dayNumber = dayIndex + 1;
                    const daySchedules = schedules.filter(
                      (s) => s.day_of_week === dayNumber
                    );
                    const colLeft = `${(dayIndex / 5) * 100}%`;
                    const colWidth = `${100 / 5}%`;

                    return daySchedules.map((slot) => {
                      const topMin = timeToMinutes(slot.start_time);
                      const endMin = timeToMinutes(slot.end_time);
                      const height = heightToPx(endMin - topMin);
                      const top = topToPx(topMin);
                      const colors = getSubjectColor(slot.subject_name);

                      return (
                        <div
                          key={slot.id}
                          className={cn(
                            "absolute rounded-lg border px-2 py-1 overflow-hidden cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-150 group",
                            colors.bg,
                            colors.border
                          )}
                          style={{
                            top,
                            left: colLeft,
                            width: `calc(${colWidth} - 8px)`,
                            height,
                            marginLeft: 4,
                            marginRight: 4,
                          }}
                          onClick={() => handleBlockClick(slot)}
                        >
                          <div className="flex items-start gap-1.5 min-h-0">
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full mt-0.5 shrink-0",
                                colors.dot
                              )}
                            />
                            <div className="min-w-0 leading-tight">
                              <p
                                className={cn(
                                  "text-[11px] font-semibold leading-tight truncate",
                                  colors.text
                                )}
                              >
                                {slot.subject_name}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px] leading-tight",
                                  colors.sub
                                )}
                              >
                                {formatTime(slot.start_time)} -{" "}
                                {formatTime(slot.end_time)}
                              </p>
                              {slot.location && height > 40 && (
                                <p
                                  className={cn(
                                    "text-[9px] mt-0.5 leading-tight truncate",
                                    colors.sub
                                  )}
                                >
                                  {slot.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedSlot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
          onClick={() => setSelectedSlot(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-full",
                    getSubjectColor(selectedSlot.subject_name).bg,
                    getSubjectColor(selectedSlot.subject_name).text
                  )}
                >
                  {DAYS[selectedSlot.day_of_week - 1]}
                </span>
              </div>
              <button
                onClick={() => setSelectedSlot(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">
              {selectedSlot.subject_name}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <svg
                  className="w-4 h-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {formatTime(selectedSlot.start_time)} —{" "}
                {formatTime(selectedSlot.end_time)}
              </div>
              {selectedSlot.teacher_name && (
                <div className="flex items-center gap-2 text-slate-600">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Prof: {selectedSlot.teacher_name}
                </div>
              )}
              {selectedSlot.classroom_name && (
                <div className="flex items-center gap-2 text-slate-600">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  Salón: {selectedSlot.classroom_name}
                </div>
              )}
              {selectedSlot.location && (
                <div className="flex items-center gap-2 text-slate-600">
                  <svg
                    className="w-4 h-4 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Aula: {selectedSlot.location}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedSlot(null)}
              className="mt-5 w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
