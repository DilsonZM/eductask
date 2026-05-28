"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface NotebookLoaderProps {
  module?: string;
  role?: "student" | "teacher" | "admin";
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard", tasks: "Mis Tareas", subjects: "Mis Materias",
  schedule: "Mi Horario", grades: "Mis Calificaciones",
  "report-cards": "Boletines", submissions: "Entregas",
  students: "Estudiantes", teachers: "Profesores", classrooms: "Salones",
  news: "Noticias", events: "Eventos", periods: "Periodos",
  users: "Usuarios", assignments: "Asignaciones",
};

const DEFAULT_MESSAGES: Record<string, string[]> = {
  student: ["Cada pagina que lees te acerca a tus sueños","La practica hace al maestro, sigue practicando","Hoy aprendes algo nuevo, mañana cambiaras el mundo"],
  teacher: ["Enseñar es dejar una huella eterna en el corazon","Un buen maestro inspira, un gran maestro transforma","No estas enseñando materias, estas formando futuros"],
  admin: ["Liderar una institucion educativa es sembrar futuro","Organizar hoy para educar mejor mañana","Cada recurso bien administrado es una oportunidad"],
};

const FALLBACK_MESSAGES = ["Preparando tu espacio de trabajo...","Cargando recursos educativos...","Conectando con el servidor...","Casi listo..."];

export function NotebookLoader({ module, role }: NotebookLoaderProps) {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const indexRef = useRef(0);
  const supabaseRef = useRef(createClient());
  const moduleName = module ? MODULE_LABELS[module] || module : null;

  useEffect(() => {
    if (module) return;
    if (!role) { setMessages(FALLBACK_MESSAGES); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabaseRef.current.from("loading_messages").select("message").eq("role", role);
        if (cancelled) return;
        if (data?.length) setMessages(data.map((r: { message: string }) => r.message).sort(() => Math.random() - 0.5));
        else setMessages(DEFAULT_MESSAGES[role] || FALLBACK_MESSAGES);
      } catch { if (!cancelled) setMessages(DEFAULT_MESSAGES[role] || FALLBACK_MESSAGES); }
    })();
    return () => { cancelled = true; };
  }, [module, role]);

  useEffect(() => {
    if (!messages.length) { setMsg(module ? `Abriendo ${moduleName}...` : ""); return; }
    setMsg(messages[0]);
    indexRef.current = 0;
    const timer = setInterval(() => { const n = (indexRef.current + 1) % messages.length; indexRef.current = n; setMsg(messages[n]); }, 3000);
    return () => clearInterval(timer);
  }, [messages, module, moduleName]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="flex flex-col items-center gap-8">
        <div className="relative w-24 h-24 sm:w-28 sm:h-28">
          <div className="absolute inset-0 rounded-full border-[3px] border-primary-100" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary-500 spinner" />

          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 sm:w-9 sm:h-9 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary-600 bg-primary-50/80 px-3 py-1 rounded-full inline-block">
            EducTask
          </p>
          {moduleName ? (
            <>
              <p className="text-lg sm:text-xl font-semibold text-slate-800 font-serif">Hojeando paginas</p>
              <p className="text-sm text-slate-400">Abriendo {moduleName}...</p>
            </>
          ) : (
            <>
              <p className="text-lg sm:text-xl font-semibold text-slate-800 font-serif">Hojeando paginas</p>
              <p className="text-sm text-slate-400 min-h-[24px] transition-opacity duration-500">{msg || "Preparando tu sesion..."}</p>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
}
