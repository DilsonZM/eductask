# EducTask - Agentes y Convenciones

## Stack Tecnológico
- **Frontend + Backend**: Next.js 14 (App Router)
- **Base de datos + Auth + Storage**: Supabase (PostgreSQL)
- **Estilos**: Tailwind CSS + shadcn/ui
- **Lenguaje**: TypeScript estricto
- **Paqueteador**: npm

## Variables de Entorno
```
NEXT_PUBLIC_SUPABASE_URL=https://eyzymefomqzldcneisfi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_aIpyNg6bbmhkfMVdww2AYQ_V_UYhtiK
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>  # Para admin API (crear usuarios)
```

## Estructura del Proyecto
```
edutask/
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (admin)/admin/
│   │   │   ├── layout.tsx, dashboard/, students/, teachers/, classrooms/
│   │   │   ├── subjects/, assignments/, periods/, schedules/, news/, events/
│   │   │   ├── users/                    # Gestión de usuarios (solo admin)
│   │   ├── (teacher)/teacher/
│   │   │   ├── layout.tsx, dashboard/, tasks/, subjects/, schedule/
│   │   │   ├── submissions/, grades/
│   │   ├── (student)/student/
│   │   │   ├── layout.tsx, dashboard/, subjects/, schedule/, tasks/
│   │   │   ├── grades/, report-cards/
│   │   ├── api/admin/users/route.ts      # API para gestión de usuarios
│   │   ├── layout.tsx, page.tsx, globals.css
│   ├── components/
│   │   ├── ui/ (Button, Input, Select, Modal)
│   │   ├── layout/ (Sidebar, AppHeader)
│   │   └── common/ (DataTable, EmptyState, PageHeader, StatsCard, NewsCarousel, SkeletonLoader)
│   ├── lib/supabase/client.ts, server.ts
│   ├── lib/utils.ts
│   ├── hooks/useAuth.ts
│   ├── middleware.ts
│   └── types/database.ts
├── supabase/
│   ├── schema.sql
│   └── seed.sql
├── .env.local
└── package.json
```

## Convenciones de Código

### TypeScript
- Strict mode habilitado
- No usar `any`
- Tipos generados desde el schema de Supabase
- Interfaces para tipos de API

### Nomenclatura
- Archivos: kebab-case (page.tsx, use-auth.ts)
- Componentes: PascalCase (DataTable, EmptyState)
- Funciones y variables: camelCase

## Comandos
```bash
npm run dev     # Desarrollo (puerto 3001)
npm run build   # Producción
npm run lint    # Linting
npm run typecheck # Verificación de tipos
```

## Autenticación y Usuarios

### Registro de Usuarios
- **No hay registro público** - solo el admin puede crear usuarios
- El admin crea usuarios en `/admin/users`
- Los usuarios se crean en `auth.users` Y en `public.users`
- Contraseña temporal: `demo123`
- El admin puede restablecer contraseñas (envía email de recuperación)

### Roles
- **admin**: Acceso total, gestión de usuarios
- **teacher**: Solo accede a rutas `/teacher/*`
- **student**: Solo accede a rutas `/student/*`

## Rutas y Permisos

### Admin (role: admin)
- /admin/dashboard, /admin/users, /admin/students, /admin/teachers
- /admin/classrooms, /admin/subjects, /admin/assignments
- /admin/periods, /admin/schedules, /admin/news, /admin/events

### Profesor (role: teacher)
- /teacher/dashboard, /teacher/tasks, /teacher/subjects, /teacher/schedule
- /teacher/submissions, /teacher/grades

### Alumno (role: student)
- /student/dashboard, /student/subjects, /student/schedule, /student/tasks
- /student/grades, /student/report-cards

## Base de Datos
- 17 tablas principales con RLS habilitado
- Policies por rol (admin, teacher, student)
- Trigger para sincronizar auth.users con public.users
- Proyecto: EducTask en Supabase
- Tabla `users` vinculada a `auth.users` para authentication