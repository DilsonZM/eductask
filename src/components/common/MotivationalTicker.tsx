"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  role: "student" | "teacher" | "admin";
}

const DEFAULTS: Record<string, string[]> = {
  student: [
    "Cada pagina que lees te acerca a tus sueños",
    "El conocimiento es el unico tesoro que nadie puede robarte",
    "La practica hace al maestro, sigue practicando",
    "Hoy aprendes algo nuevo, mañana cambiaras el mundo",
  ],
  teacher: [
    "Enseñar es dejar una huella eterna en el corazon",
    "Un buen maestro inspira, un gran maestro transforma",
    "No estas enseñando materias, estas formando futuros",
    "La paciencia es el arte de esperar que la semilla germine",
  ],
  admin: [
    "Liderar una institucion educativa es sembrar futuro",
    "La buena gestion es invisible cuando funciona",
    "Organizar hoy para educar mejor mañana",
    "Cada recurso bien administrado es una oportunidad",
  ],
};

export function MotivationalTicker({ role }: Props) {
  const [messages, setMessages] = useState<string[]>(DEFAULTS[role] || []);
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabaseRef.current
          .from("loading_messages")
          .select("message")
          .eq("role", role);
        if (data && data.length > 0) {
          setMessages(data.map((r: { message: string }) => r.message).sort(() => Math.random() - 0.5));
        }
      } catch { /* use defaults */ }
    })();
  }, [role]);

  useEffect(() => {
    if (messages.length <= 1) return;
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setFading(false);
      }, 400);
    }, 10000);
    return () => clearInterval(timer);
  }, [messages.length]);

  if (messages.length === 0) return null;

  return (
    <div className="hidden lg:flex items-center gap-1.5 text-xs italic text-slate-400">
      <svg className="w-3 h-3 flex-shrink-0 gemini-sparkle" viewBox="0 0 24 24" fill="none">
        <path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z" fill="currentColor" className="text-primary-400" />
      </svg>
      <span
        className={`line-clamp-2 transition-opacity duration-400 leading-relaxed ${fading ? "opacity-0" : "opacity-100"}`}
      >
        {messages[index]}
      </span>

      <style jsx>{`
        @keyframes geminiPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        .gemini-sparkle { animation: geminiPulse 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
