# EduTask v1

Plataforma de gestión educativa completa con Next.js 14, Supabase y Tailwind CSS. Soporta tres roles: **admin**, **teacher** y **student**, con flujos de tareas, entregas, calificaciones y notificaciones en tiempo real.

## Demo

**URL:** https://edutask-one.vercel.app
**Contraseña:** `demo123` (todos los usuarios)

| Rol | Usuario |
|---|---|
| Admin | `admin@edutask.demo` |
| Profesores | `{carlos,maria,jose,ana,pedro}.docente@edutask.demo` |
| Alumnos | `alumno{1..5}.{4a,5a,6a}@edutask.demo` |

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Backend + Auth + DB:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Estilos:** Tailwind CSS + shadcn/ui
- **Editor:** TipTap v3.23.6
- **Lenguaje:** TypeScript strict
- **Paquete:** npm

## Estructura del Proyecto

```
edutask/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login unificado
│   │   ├── (admin)/admin/          # Rutas admin (dashboard, users, students, teachers,
│   │   │                            # classrooms, subjects, assignments, periods, schedules,
│   │   │                            # news, events)
│   │   ├── (teacher)/teacher/      # Rutas profesor (dashboard, tasks, subjects, schedule,
│   │   │                            # submissions, grades, grading-config, students)
│   │   ├── (student)/student/      # Rutas alumno (dashboard, subjects, schedule, tasks,
│   │   │                            # grades, report-cards)
│   │   ├── api/admin/users/        # API CRUD usuarios (admin only)
│   │   ├── layout.tsx, page.tsx, globals.css
│   ├── components/
│   │   ├── ui/                     # Button, Input, Select, Modal (ConfirmDialog)
│   │   ├── layout/                 # Sidebar, AppHeader, NavigationContext
│   │   └── common/                 # DataTable, EmptyState, PageHeader, StatsCard,
│   │                                # NewsCarousel, SkeletonLoader, NotificationBell
│   ├── lib/
│   │   ├── supabase/               # client.ts (browser), server.ts (SSR)
│   │   ├── utils.ts
│   │   └── notifications.ts        # Helper para crear notificaciones batch
│   ├── hooks/                      # useAuth, useRealtimeSubscription, useRealtimeRefresh
│   ├── types/database.ts           # Tipos generados desde schema Supabase
│   └── middleware.ts               # Auth + role-based routing
├── supabase/
│   ├── schema.sql                  # 17 tablas + triggers + RLS
│   └── seed.sql
├── next.config.mjs
├── tailwind.config.ts
└── package.json
```

## Configuración

### Variables de Entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://eyzymefomqzldcneisfi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_<key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
```

### Desarrollo

```bash
npm install
npm run dev      # http://localhost:3001
```

## Autenticación y Roles

- **No hay registro público** — solo el admin crea usuarios desde `/admin/users`
- Los usuarios se crean en `auth.users` (Supabase Auth) y se sincronizan automáticamente con `public.users` vía trigger
- Contraseña temporal por defecto: `demo123`
- El admin puede restablecer contraseñas (envía email de recuperación de Supabase)
- Middleware redirige automáticamente al dashboard correspondiente según el rol

| Rol | Acceso | Descripción |
|---|---|---|
| `admin` | `/admin/*` | Gestión total: usuarios, alumnos, profesores, salones, materias, asignaciones, períodos, horarios, noticias, eventos |
| `teacher` | `/teacher/*` | Tareas, entregas, calificaciones, configuración de notas, mis alumnos, horario |
| `student` | `/student/*` | Tareas pendientes, entregas, notas, boletines, horario |

## Base de Datos

17 tablas con Row Level Security (RLS) habilitado y policies por rol.

### Tablas principales

| Tabla | Descripción |
|---|---|
| `users` | Vinculada a `auth.users`, contiene rol y perfil |
| `students` | Datos de alumnos + salón asignado |
| `teachers` | Datos de profesores + especialidad |
| `classrooms` | Salones por año lectivo |
| `subjects` | Materias |
| `classroom_subjects` | Materias asignadas a cada salón (auto-creado vía trigger) |
| `teacher_assignments` | Profesor → salón + materia + período |
| `schedules` | Horario por salón/materia/profesor |
| `tasks` | Tareas publicadas por profesores (draft/published/closed) |
| `submissions` | Entregas de alumnos (archivos + puntaje) |
| `grades` | Calificaciones por alumno/materia/período |
| `report_cards` | Boletines finales |
| `news` | Noticias con imagen |
| `events` | Eventos del calendario |
| `notifications` | Notificaciones en tiempo real |
| `subject_grading_config` | Configuración de pesos para calificaciones |
| `academic_years` / `school_periods` | Años lectivos y períodos |

### Constraints y Triggers

- **`on_user_deleted`**: Al borrar `public.users`, elimina el usuario en `auth.users` y propaga en cascada
- **`trg_ensure_classroom_subject`**: Al crear `teacher_assignments`, auto-crea la entrada en `classroom_subjects`
- UNIQUE constraints: `unique_assignment`, `unique_classroom_subject`, `unique_grading_config`
- FK con `ON DELETE CASCADE` / `SET NULL` en todas las tablas relevantes

### Realtime

Tablas con `REPLICA IDENTITY FULL` y publicación `supabase_realtime`:
- `notifications`
- `tasks`
- `submissions`
- `teacher_assignments`

## Features Implementadas

- **CRUD completo** en todas las tablas con ConfirmDialog (detalles en cascada, toast feedback)
- **Sidebar** con badges pastel (`bg-rose-50 text-rose-500`) y contadores por módulo
- **Notificaciones en tiempo real**: campanita con dropdown, últimas 20, marcar todas leídas, clic navega + marca leída
- **Notificaciones automáticas** al: publicar tarea → alumnos, entregar tarea → profesor, calificar → alumno, crear asignación → profesor, crear horario → profesor, crear evento → todos, publicar noticia → todos
- **RealtimeRefresh**: barra de progreso azul animada + fade al 70% en dashboards al recibir actualizaciones
- **Transición de página**: cuaderno hojeando (3D `rotateY`) + anillo girando, 1.5s, solo al cambiar de módulo
- **Shimmer loading inline** en páginas (sin `loading.tsx` de route group)
- **NewsCarousel** en dashboards con imágenes y auto-rotación
- **Grading config**: tabla editable con colgroup, inputs de pesos inline, resaltado de filas sucias, guardado por salón+materia
- **Teacher students page**: tabla con promedio (barra de progreso), estado de entregas (badges), cache en localStorage
- **Assignment form**: placeholders, validación client-side, auto-creación de classroom_subjects
- **Delete cascade**: 30+ FK actualizadas, trigger `on_user_deleted`, DELETE vía API con service_role en `auth.users`
- **Login con animación de libro** profesional

## Decisiones de Arquitectura

- `subject_grading_config.teacher_id` referencia `public.users(id)`, no `teachers(id)` — el save/load usan `user.id`
- `teacher_assignments.teacher_id` referencia `public.teachers(id)` — queries de asignaciones usan `teachers.id`
- Eliminado `school_period_id` del grading config — aplica globalmente por salón+materia
- Participación (bonus) = manual 1:1, suma directa al promedio final
- ESLint `no-unused-vars` como "warn" + `ignoreDuringBuilds: true`
- `vercel.json` con `buildCommand: next build`, `framework: nextjs`
- Storage buckets: `curriculum-files`, `edutask-submissions`, `edutask-tasks`, `avatars`

## Deploy

```bash
npm run build    # Build producción
npm run lint     # Linting
npx vercel --prod # Deploy manual a Vercel
```

- Vercel project: `dilson-zm-s-projects/edutask`
- GitHub: https://github.com/DilsonZM/eductask
