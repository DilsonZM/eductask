-- USUARIOS (vinculada a auth.users de Supabase)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin','teacher','student')),
  avatar TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALUMNOS
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  student_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male','female')),
  address TEXT,
  phone TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  enrollment_date DATE,
  classroom_id UUID,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFESORES
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  employee_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  specialty TEXT,
  phone TEXT,
  hire_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AÑOS LECTIVOS
CREATE TABLE public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERÍODOS ESCOLARES
CREATE TABLE public.school_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID REFERENCES public.academic_years(id),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  "order" INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALONES
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID REFERENCES public.academic_years(id),
  name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  capacity INTEGER DEFAULT 35,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MATERIAS
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL UNIQUE,
  credits INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MATERIAS POR SALÓN
CREATE TABLE public.classroom_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id),
  subject_id UUID REFERENCES public.subjects(id),
  curriculum TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEMARIO POR MATERIA-SALÓN-PERÍODO
CREATE TABLE public.curriculum_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_subject_id UUID REFERENCES public.classroom_subjects(id) ON DELETE CASCADE,
  school_period_id UUID REFERENCES public.school_periods(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.curriculum_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_entry_id UUID REFERENCES public.curriculum_entries(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  content_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ASIGNACIONES PROFESOR-MATERIA-SALÓN
CREATE TABLE public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.teachers(id),
  classroom_id UUID REFERENCES public.classrooms(id),
  subject_id UUID REFERENCES public.subjects(id),
  school_period_id UUID REFERENCES public.school_periods(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HORARIOS
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES public.classrooms(id),
  subject_id UUID REFERENCES public.subjects(id),
  teacher_id UUID REFERENCES public.teachers(id),
  teacher_assignment_id UUID REFERENCES public.teacher_assignments(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TAREAS
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  teacher_id UUID REFERENCES public.teachers(id),
  classroom_subject_id UUID REFERENCES public.classroom_subjects(id),
  school_period_id UUID REFERENCES public.school_periods(id),
  due_date TIMESTAMPTZ NOT NULL,
  max_score NUMERIC DEFAULT 10,
  allow_late BOOLEAN DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ARCHIVOS ADJUNTOS DE TAREAS
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ENTREGAS DE ALUMNOS
CREATE TABLE public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id),
  student_id UUID REFERENCES public.students(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  comments TEXT,
  score NUMERIC,
  teacher_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTAS
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id),
  teacher_id UUID REFERENCES public.teachers(id),
  classroom_subject_id UUID REFERENCES public.classroom_subjects(id),
  school_period_id UUID REFERENCES public.school_periods(id),
  score NUMERIC NOT NULL,
  comments TEXT,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BOLETINES
CREATE TABLE public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.students(id),
  school_period_id UUID REFERENCES public.school_periods(id),
  classroom_id UUID REFERENCES public.classrooms(id),
  average NUMERIC,
  rank INTEGER,
  attendance NUMERIC,
  observations TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTICIAS
CREATE TABLE public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  author_id UUID REFERENCES public.users(id),
  image TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  category TEXT,
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENTOS
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  is_all_day BOOLEAN DEFAULT TRUE,
  color TEXT,
  event_type TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AVISOS
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  target_role TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para sincronizar usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas
-- Admin: acceso total
CREATE POLICY "Admin full access" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.teachers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.academic_years FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.school_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.classrooms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.classroom_subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.teacher_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.task_attachments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.grades FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.report_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.news FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access" ON public.announcements FOR ALL USING (true) WITH CHECK (true);

-- Teacher: leer y escribir en sus tareas, grades, submissions
CREATE POLICY "Teacher read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Teacher insert tasks" ON public.tasks FOR INSERT WITH CHECK (true);
CREATE POLICY "Teacher update tasks" ON public.tasks FOR UPDATE USING (true);
CREATE POLICY "Teacher read submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Teacher read grades" ON public.grades FOR SELECT USING (true);
CREATE POLICY "Teacher insert grades" ON public.grades FOR INSERT WITH CHECK (true);
CREATE POLICY "Teacher update grades" ON public.grades FOR UPDATE USING (true);
CREATE POLICY "Teacher read schedules" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "Teacher read teacher_assignments" ON public.teacher_assignments FOR SELECT USING (true);

-- Student: leer sus datos, tareas asignadas; escribir en submissions
CREATE POLICY "Student read own data" ON public.students FOR SELECT USING (true);
CREATE POLICY "Student read grades" ON public.grades FOR SELECT USING (true);
CREATE POLICY "Student read report_cards" ON public.report_cards FOR SELECT USING (true);
CREATE POLICY "Student read tasks" ON public.tasks FOR SELECT USING (true);
CREATE POLICY "Student read submissions" ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Student insert submissions" ON public.submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Student update submissions" ON public.submissions FOR UPDATE USING (true);

-- Todos los roles: leer news, events, announcements activos
CREATE POLICY "Public read news" ON public.news FOR SELECT USING (is_published = true);
CREATE POLICY "Public read events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Public read announcements" ON public.announcements FOR SELECT USING (is_active = true);
CREATE POLICY "Auth read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Auth read classrooms" ON public.classrooms FOR SELECT USING (true);
CREATE POLICY "Auth read subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Auth read schedules" ON public.schedules FOR SELECT USING (true);

-- Curriculum entries and files
CREATE POLICY "Admin full access curriculum" ON public.curriculum_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Auth read curriculum" ON public.curriculum_entries FOR SELECT USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Admin full access curriculum_files" ON public.curriculum_files FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Auth read curriculum_files" ON public.curriculum_files FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- ============================================================
-- ÍNDICES DE OPTIMIZACIÓN
-- ============================================================

-- Críticos (alto impacto en rendimiento):
-- 1. teachers.user_id: cada página de profesor consulta por user_id
CREATE INDEX idx_teachers_user_id ON public.teachers(user_id);

-- 2. tasks(teacher_id, status): dashboard y listado de tareas filtran por profesor + estado
CREATE INDEX idx_tasks_teacher_status ON public.tasks(teacher_id, status);

-- 3. tasks.classroom_subject_id: filtrado de tareas por materia/asignación
CREATE INDEX idx_tasks_classroom_subject ON public.tasks(classroom_subject_id);

-- 4. students(classroom_id, status): conteo de alumnos activos por salón
CREATE INDEX idx_students_classroom_status ON public.students(classroom_id, status);

-- 5. submissions(task_id, score): conteo de entregas pendientes sin calificar
CREATE INDEX idx_submissions_task_score ON public.submissions(task_id, score);

-- 6. teacher_assignments.teacher_id: dashboard del profesor consulta sus asignaciones
CREATE INDEX idx_teacher_assignments_teacher ON public.teacher_assignments(teacher_id);

-- Secundarios (rendimiento general):
-- 7. events.start_date: dashboards filtran eventos futuros
CREATE INDEX idx_events_start_date ON public.events(start_date);

-- 8. news(is_published, published_at DESC): news carousel en todos los dashboards
CREATE INDEX idx_news_published ON public.news(is_published, published_at DESC);

-- 9. classroom_subjects.classroom_id: materias por salón (tareas, filtros)
CREATE INDEX idx_classroom_subjects_classroom ON public.classroom_subjects(classroom_id);

-- 10. academic_years.is_active: carga de año lectivo activo
CREATE INDEX idx_academic_years_active ON public.academic_years(is_active);

-- 11. school_periods(academic_year_id, status): períodos activos por año lectivo
CREATE INDEX idx_school_periods_year_status ON public.school_periods(academic_year_id, status);

-- 12. task_attachments.task_id: archivos adjuntos de tareas
CREATE INDEX idx_task_attachments_task ON public.task_attachments(task_id);
