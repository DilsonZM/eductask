"use client";

import {
  Calculator, BookOpen, Microscope, Globe, Dumbbell,
  Palette, Music, Monitor, Languages, Atom, ChevronDown,
  FileText, Clock, Edit3, Download, UserCheck,
} from "lucide-react";
import { type ReactNode } from "react";

export const SUBJECT_COLORS = [
  { card: "border-t-blue-500", badge: "bg-blue-100 text-blue-700", icon: "text-blue-600", active: "bg-blue-500" },
  { card: "border-t-emerald-500", badge: "bg-emerald-100 text-emerald-700", icon: "text-emerald-600", active: "bg-emerald-500" },
  { card: "border-t-violet-500", badge: "bg-violet-100 text-violet-700", icon: "text-violet-600", active: "bg-violet-500" },
  { card: "border-t-amber-500", badge: "bg-amber-100 text-amber-700", icon: "text-amber-600", active: "bg-amber-500" },
  { card: "border-t-rose-500", badge: "bg-rose-100 text-rose-700", icon: "text-rose-600", active: "bg-rose-500" },
  { card: "border-t-cyan-500", badge: "bg-cyan-100 text-cyan-700", icon: "text-cyan-600", active: "bg-cyan-500" },
  { card: "border-t-fuchsia-500", badge: "bg-fuchsia-100 text-fuchsia-700", icon: "text-fuchsia-600", active: "bg-fuchsia-500" },
  { card: "border-t-orange-500", badge: "bg-orange-100 text-orange-700", icon: "text-orange-600", active: "bg-orange-500" },
  { card: "border-t-teal-500", badge: "bg-teal-100 text-teal-700", icon: "text-teal-600", active: "bg-teal-500" },
  { card: "border-t-indigo-500", badge: "bg-indigo-100 text-indigo-700", icon: "text-indigo-600", active: "bg-indigo-500" },
];

const SUBJECT_ICONS: Record<string, React.ElementType> = {
  matematicas: Calculator,
  matematica: Calculator,
  algebra: Calculator,
  geometria: Calculator,
  calculo: Calculator,
  lengua: BookOpen,
  literatura: BookOpen,
  espanol: BookOpen,
  castellano: BookOpen,
  ingles: Languages,
  frances: Languages,
  portugues: Languages,
  idioma: Languages,
  ciencias: Microscope,
  biologia: Atom,
  fisica: Atom,
  quimica: Atom,
  naturales: Microscope,
  sociales: Globe,
  geografia: Globe,
  historia: Globe,
  civica: Globe,
  "ed fisica": Dumbbell,
  "educacion fisica": Dumbbell,
  deportes: Dumbbell,
  arte: Palette,
  artistica: Palette,
  dibujo: Palette,
  musica: Music,
  informatica: Monitor,
  tecnologia: Monitor,
  computacion: Monitor,
  programacion: Monitor,
};

export function getSubjectColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

export function getSubjectIcon(name: string) {
  const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, icon] of Object.entries(SUBJECT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return BookOpen;
}

interface SubjectCardProps {
  name: string;
  code: string;
  credits: number;
  classroomName?: string;
  periodsCount: number;
  topicsCount: number;
  filesCount: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  editable?: boolean;
  onEdit?: () => void;
  teacherName?: string;
  teacherEmail?: string;
}

export function SubjectCard({
  name, code, credits, classroomName,
  periodsCount, topicsCount, filesCount,
  expanded, onToggle, children, editable, onEdit,
  teacherName, teacherEmail,
}: SubjectCardProps) {
  const color = getSubjectColor(name);
  const Icon = getSubjectIcon(name);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 ${expanded ? "shadow-md border-slate-300" : ""}`}>
      <button
        onClick={onToggle}
        className={`w-full text-left transition-all duration-200 hover:shadow-md cursor-pointer border-t-2 ${color.card} ${expanded ? "" : ""}`}
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 rounded-xl ${color.icon} bg-slate-50 flex items-center justify-center shrink-0`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900 text-base leading-tight">
                {name}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {classroomName && (
                  <span className="text-xs text-slate-500">{classroomName}</span>
                )}
                <span className="text-xs text-slate-400">{code}</span>
                <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${color.badge}`}>
                  {credits} cr
                </span>
              </div>
              {teacherName && (
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> {teacherName}
                </p>
              )}
            </div>
            <ChevronDown
              className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </div>

          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" /> {topicsCount} temas
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {periodsCount} períodos
            </span>
            {filesCount > 0 && (
              <span className="flex items-center gap-1">
                <Download className="w-3.5 h-3.5" /> {filesCount} archivos
              </span>
            )}
            {editable && (
              <span className="ml-auto">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
                  className="flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Editar
                </button>
              </span>
            )}
          </div>
        </div>
      </button>

      <div
        className="transition-all duration-300 ease-in-out overflow-hidden"
        style={{ maxHeight: expanded ? "4000px" : "0px", opacity: expanded ? 1 : 0 }}
      >
        <div className="px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}
