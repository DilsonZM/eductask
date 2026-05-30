"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/components/layout/NavigationContext";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Building2,
  BookOpen,
  ClipboardList,
  CalendarDays,
  Newspaper,
  Calendar,
  GraduationCap,
  FileText,
  Clock,
  CheckSquare,
  UserCircle,
  Sliders,
} from "lucide-react";

interface SidebarProps {
  role: "admin" | "teacher" | "student";
  isOpen: boolean;
  onClose: () => void;
}

type SidebarLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

type SidebarGroup = {
  title: string;
  links: SidebarLink[];
};

const roleConfig: Record<SidebarProps["role"], { label: string; accent: string; groups: SidebarGroup[] }> = {
  admin: {
    label: "admin",
    accent: "from-primary-600 to-primary-500",
    groups: [
      {
        title: "Inicio",
        links: [{ href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard }],
      },
      {
        title: "Gestión",
        links: [
          { href: "/admin/users", label: "Usuarios", icon: UserCircle },
          { href: "/admin/students", label: "Alumnos", icon: Users },
          { href: "/admin/teachers", label: "Profesores", icon: UserCog },
          { href: "/admin/classrooms", label: "Salones", icon: Building2 },
          { href: "/admin/subjects", label: "Materias", icon: BookOpen },
          { href: "/admin/assignments", label: "Asignaciones", icon: ClipboardList },
        ],
      },
      {
        title: "Planificación",
        links: [
          { href: "/admin/periods", label: "Períodos", icon: CalendarDays },
          { href: "/admin/schedules", label: "Horarios", icon: Clock },
        ],
      },
      {
        title: "Comunicación",
        links: [
          { href: "/admin/news", label: "Noticias", icon: Newspaper },
          { href: "/admin/events", label: "Eventos", icon: Calendar },
        ],
      },
    ],
  },
  teacher: {
    label: "profesor",
    accent: "from-secondary-600 to-emerald-500",
    groups: [
      {
        title: "Inicio",
        links: [{ href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard }],
      },
      {
        title: "Docencia",
        links: [
          { href: "/teacher/tasks", label: "Tareas", icon: CheckSquare },
          { href: "/teacher/subjects", label: "Materias", icon: BookOpen },
          { href: "/teacher/schedule", label: "Horario", icon: Clock },
          { href: "/teacher/students", label: "Mis Estudiantes", icon: Users },
        ],
      },
      {
        title: "Evaluación",
        links: [
          { href: "/teacher/grading-config", label: "Configurar Evaluación", icon: Sliders },
          { href: "/teacher/submissions", label: "Entregas", icon: FileText },
          { href: "/teacher/grades", label: "Notas", icon: GraduationCap },
        ],
      },
    ],
  },
  student: {
    label: "alumno",
    accent: "from-indigo-600 to-sky-500",
    groups: [
      {
        title: "Inicio",
        links: [{ href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard }],
      },
      {
        title: "Academia",
        links: [
          { href: "/student/subjects", label: "Materias", icon: BookOpen },
          { href: "/student/schedule", label: "Horario", icon: Clock },
          { href: "/student/tasks", label: "Tareas", icon: CheckSquare },
        ],
      },
      {
        title: "Seguimiento",
        links: [
          { href: "/student/grades", label: "Notas", icon: GraduationCap },
          { href: "/student/report-cards", label: "Boletines", icon: FileText },
        ],
      },
    ],
  },
};

export function Sidebar({ role, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { navigateTo } = useNavigation();
  const config = roleConfig[role];

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/30 transition-opacity lg:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white/95 backdrop-blur border-r border-gray-200 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.06)] transform transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group" onClick={onClose}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${config.accent} shadow-md transition-transform duration-200 group-hover:scale-105`}>
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div>
              <span className="font-bold text-gray-900">EduTask</span>
              <span className="text-xs text-gray-500 block capitalize">{config.label}</span>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Cerrar menú"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-5 overflow-y-auto">
          {config.groups.map((group) => (
            <div key={group.title} className="space-y-2">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                {group.title}
              </p>
              <div className="space-y-1">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <button
                      key={link.href}
                      type="button"
                      onClick={() => {
                        onClose();
                        navigateTo(link.href);
                      }}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 will-change-transform w-full text-left",
                        isActive
                          ? "bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100"
                          : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:translate-x-1"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200",
                          isActive
                            ? "bg-primary-100 text-primary-700"
                            : "bg-gray-100 text-gray-500 group-hover:scale-105 group-hover:bg-gray-200"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1">{link.label}</span>
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full transition-opacity duration-200",
                          isActive ? "bg-primary-500" : "bg-transparent group-hover:bg-gray-300"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
