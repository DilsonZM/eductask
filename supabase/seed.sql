-- Seed data para EduTask Demo

-- Crear usuarios demo en auth.users (la contraseña para todos es: demo123)
INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@edutask.demo', '$2a$10$abcdefghijklmnopqrstuvwxyz', '{"name": "Administrador", "role": "admin"}'),
('22222222-2222-2222-2222-222222222222', 'teacher@edutask.demo', '$2a$10$abcdefghijklmnopqrstuvwxyz', '{"name": "María García", "role": "teacher"}'),
('33333333-3333-3333-3333-333333333333', 'student@edutask.demo', '$2a$10$abcdefghijklmnopqrstuvwxyz', '{"name": "Juan Pérez", "role": "student"}');

-- Usuarios en public.users
INSERT INTO public.users (id, name, email, role) VALUES
('11111111-1111-1111-1111-111111111111', 'Administrador', 'admin@edutask.demo', 'admin'),
('22222222-2222-2222-2222-222222222222', 'María García', 'teacher@edutask.demo', 'teacher'),
('33333333-3333-3333-3333-333333333333', 'Juan Pérez', 'student@edutask.demo', 'student');

-- Año lectivo 2026
INSERT INTO public.academic_years (id, year, start_date, end_date, is_active, status) VALUES
('a1111111-1111-1111-1111-111111111111', 2026, '2026-01-15', '2026-12-15', true, 'active');

-- Períodos escolares
INSERT INTO public.school_periods (id, academic_year_id, name, start_date, end_date, "order", status) VALUES
('p1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'Primer Trimestre', '2026-01-15', '2026-04-30', 1, 'active'),
('p2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', 'Segundo Trimestre', '2026-05-01', '2026-08-31', 2, 'active'),
('p3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'Tercer Trimestre', '2026-09-01', '2026-12-15', 3, 'active');

-- Salones
INSERT INTO public.classrooms (id, academic_year_id, name, grade_level, capacity, location, status) VALUES
('c1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', '5° A', 'Quinto Grado', 35, 'Edificio A, Planta 1', 'active'),
('c2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111', '5° B', 'Quinto Grado', 32, 'Edificio A, Planta 2', 'active'),
('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', '6° A', 'Sexto Grado', 30, 'Edificio B, Planta 1', 'active');

-- Materias
INSERT INTO public.subjects (id, name, description, code, credits) VALUES
('s1111111-1111-1111-1111-111111111111', 'Matemáticas', 'Matemáticas generales para quinto grado', 'MAT-5', 5),
('s2222222-2222-2222-2222-222222222222', 'Lengua Española', 'Comunicación verbal y escrita', 'LEN-5', 4),
('s3333333-3333-3333-3333-333333333333', 'Ciencias Naturales', 'Ciencias de la naturaleza', 'CNA-5', 4),
('s4444444-4444-4444-4444-444444444444', 'Ciencias Sociales', 'Historia y geografía', 'CSO-5', 3),
('s5555555-5555-5555-5555-555555555555', 'Educación Física', 'Actividad física y deporte', 'EFD-5', 2);

-- Profesores
INSERT INTO public.teachers (id, user_id, employee_code, first_name, last_name, specialty, phone, hire_date, status) VALUES
('t1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'EMP-001', 'María', 'García', 'Matemáticas y Ciencias', '555-0101', '2020-03-01', 'active'),
('t2222222-2222-2222-2222-222222222222', NULL, 'EMP-002', 'Carlos', 'Rodríguez', 'Lengua y Sociales', '555-0102', '2019-08-15', 'active');

-- Alumnos
INSERT INTO public.students (id, user_id, student_code, first_name, last_name, birth_date, gender, address, phone, enrollment_date, classroom_id, status) VALUES
('al111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'EST-001', 'Juan', 'Pérez', '2015-08-20', 'male', 'Calle Principal 123', '555-1001', '2026-01-15', 'c1111111-1111-1111-1111-111111111111', 'active'),
('al222222-2222-2222-2222-222222222222', NULL, 'EST-002', 'Ana', 'López', '2015-03-15', 'female', 'Av. Central 456', '555-1002', '2026-01-15', 'c1111111-1111-1111-1111-111111111111', 'active'),
('al333333-3333-3333-3333-333333333333', NULL, 'EST-003', 'Pedro', 'Martínez', '2015-11-08', 'male', 'Calle Secundaria 789', '555-1003', '2026-01-15', 'c2222222-2222-2222-2222-222222222222', 'active'),
('al444444-4444-4444-4444-444444444444', NULL, 'EST-004', 'Sofia', 'Hernández', '2015-05-22', 'female', 'Av. Primera 321', '555-1004', '2026-01-15', 'c2222222-2222-2222-2222-222222222222', 'active'),
('al555555-5555-5555-5555-555555555555', NULL, 'EST-005', 'Diego', 'González', '2014-09-10', 'male', 'Calle Tercera 654', '555-1005', '2025-01-15', 'c3333333-3333-3333-3333-333333333333', 'active');

-- Asignaciones de profesores
INSERT INTO public.teacher_assignments (id, teacher_id, classroom_id, subject_id, school_period_id) VALUES
('as111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111'),
('as222222-2222-2222-2222-222222222222', 't1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 's3333333-3333-3333-3333-333333333333', 'p1111111-1111-1111-1111-111111111111'),
('as333333-3333-3333-3333-333333333333', 't2222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', 'p1111111-1111-1111-1111-111111111111'),
('as444444-4444-4444-4444-444444444444', 't2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 's4444444-4444-4444-4444-444444444444', 'p1111111-1111-1111-1111-111111111111');

-- Materias por salón
INSERT INTO public.classroom_subjects (id, classroom_id, subject_id, curriculum) VALUES
('cs111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 'Curriculo 2026'),
('cs222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', 'Curriculo 2026'),
('cs333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 's3333333-3333-3333-3333-333333333333', 'Curriculo 2026'),
('cs444444-4444-4444-4444-444444444444', 'c2222222-2222-2222-2222-222222222222', 's4444444-4444-4444-4444-444444444444', 'Curriculo 2026'),
('cs555555-5555-5555-5555-555555555555', 'c3333333-3333-3333-3333-333333333333', 's1111111-1111-1111-1111-111111111111', 'Curriculo 2026');

-- Horarios (Lunes a Viernes para 5° A)
INSERT INTO public.schedules (id, classroom_id, subject_id, teacher_id, teacher_assignment_id, day_of_week, start_time, end_time, location) VALUES
('sc111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'as111111-1111-1111-1111-111111111111', 1, '07:30', '08:30', 'Edificio A, Aula 101'),
('sc222222-2222-2222-2222-222222222222', 'c1111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', 't2222222-2222-2222-2222-222222222222', 'as333333-3333-3333-3333-333333333333', 1, '08:30', '09:30', 'Edificio A, Aula 101'),
('sc333333-3333-3333-3333-333333333333', 'c1111111-1111-1111-1111-111111111111', 's3333333-3333-3333-3333-333333333333', 't1111111-1111-1111-1111-111111111111', 'as222222-2222-2222-2222-222222222222', 2, '07:30', '08:30', 'Laboratorio 1'),
('sc444444-4444-4444-4444-444444444444', 'c1111111-1111-1111-1111-111111111111', 's1111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'as111111-1111-1111-1111-111111111111', 3, '07:30', '08:30', 'Edificio A, Aula 101'),
('sc555555-5555-5555-5555-555555555555', 'c1111111-1111-1111-1111-111111111111', 's2222222-2222-2222-2222-222222222222', 't2222222-2222-2222-2222-222222222222', 'as333333-3333-3333-3333-333333333333', 4, '08:30', '09:30', 'Edificio A, Aula 101'),
('sc666666-6666-6666-6666-666666666666', 'c1111111-1111-1111-1111-111111111111', 's3333333-3333-3333-3333-333333333333', 't1111111-1111-1111-1111-111111111111', 'as222222-2222-2222-2222-222222222222', 5, '07:30', '08:30', 'Laboratorio 1');

-- Tareas
INSERT INTO public.tasks (id, title, description, instructions, teacher_id, classroom_subject_id, due_date, max_score, allow_late, status) VALUES
('tk111111-1111-1111-1111-111111111111', 'Tarea de Fracciones', 'Ejercicios de fracciones para practicar', 'Resolver los ejercicios del 1 al 10 de la pagina 45', 't1111111-1111-1111-1111-111111111111', 'cs111111-1111-1111-1111-111111111111', '2026-06-15 23:59:00', 10, true, 'published'),
('tk222222-2222-2222-2222-222222222222', 'Ensayo sobre Animales', 'Escribir un ensayo sobre animales vertebrados', 'El ensayo debe tener minimum 500 palabras', 't2222222-2222-2222-2222-222222222222', 'cs222222-2222-2222-2222-222222222222', '2026-06-20 23:59:00', 10, true, 'published'),
('tk333333-3333-3333-3333-333333333333', 'Experimento de sales', 'Realizar un experimento simple con sal', 'Documentar el proceso con fotos', 't1111111-1111-1111-1111-111111111111', 'cs333333-3333-3333-3333-333333333333', '2026-06-25 23:59:00', 10, false, 'published');

-- Noticias
INSERT INTO public.news (id, title, content, excerpt, author_id, is_published, published_at, category, featured) VALUES
('n1111111-1111-1111-1111-111111111111', 'Bienvenidos al Año Escolar 2026', 'Estimados padres y estudiantes, les damos la bienvenida al año escolar 2026. Estamos muy emocionados de comenzar este nuevo ciclo educativo con todas las actividades planeadas.', 'Bienvenidos al año escolar 2026', '11111111-1111-1111-1111-111111111111', true, '2026-01-10 08:00:00', 'General', true),
('n2222222-2222-2222-2222-222222222222', 'Reunión de Padres - 15 de Junio', 'Se convoca a todos los padres de familia a la reunión general del mes de junio para discutir el progreso académico de los estudiantes.', 'Reunión de padres el 15 de junio', '11111111-1111-1111-1111-111111111111', true, '2026-06-01 09:00:00', 'Eventos', false),
('n3333333-3333-3333-3333-333333333333', 'Feria de Ciencias 2026', 'Les informamos que la feria de ciencias anual se realizará el próximo mes de julio. Los estudiantes pueden inscribir sus proyectos hasta el 30 de junio.', 'Feria de ciencias en julio', '11111111-1111-1111-1111-111111111111', true, '2026-05-15 10:00:00', 'Eventos', true);

-- Eventos
INSERT INTO public.events (id, title, description, start_date, end_date, location, is_all_day, color, event_type) VALUES
('ev111111-1111-1111-1111-111111111111', 'Inicio de Clases', 'Primer día de clases del año lectivo 2026', '2026-01-15 07:00:00', '2026-01-15 12:00:00', 'Todos los salones', true, '#2563eb', 'academic'),
('ev222222-2222-2222-2222-222222222222', 'Examen Final del Primer Trimestre', 'Período de exámenes finales', '2026-04-25 08:00:00', '2026-04-30 18:00:00', 'Edificio Principal', true, '#dc2626', 'exam'),
('ev333333-3333-3333-3333-333333333333', 'Día del Estudiante', 'Celebración del día del estudiante', '2026-05-15 08:00:00', '2026-05-15 14:00:00', 'Cancha Principal', true, '#16a34a', 'celebration');

-- Avisos
INSERT INTO public.announcements (id, title, content, priority, target_role, is_active, created_by) VALUES
('an111111-1111-1111-1111-111111111111', 'Recordatorio de Pago de Matrícula', 'Se recuerda a los padres que el pago de la matrícula del segundo trimestre debe realizarse antes del 15 de junio.', 'normal', NULL, true, '11111111-1111-1111-1111-111111111111'),
('an222222-2222-2222-2222-222222222222', 'Cambio de Horario', 'A partir del lunes 10 de junio, el horario de entrada será a las 7:00 AM para todos los niveles.', 'high', NULL, true, '11111111-1111-1111-1111-111111111111');

-- Notas
INSERT INTO public.grades (id, student_id, teacher_id, classroom_subject_id, school_period_id, score, comments, graded_at) VALUES
('gr111111-1111-1111-1111-111111111111', 'al111111-1111-1111-1111-111111111111', 't1111111-1111-1111-1111-111111111111', 'cs111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 8.5, 'Buen trabajo', '2026-04-10 14:00:00'),
('gr222222-2222-2222-2222-222222222222', 'al222222-2222-2222-2222-222222222222', 't1111111-1111-1111-1111-111111111111', 'cs111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 9.0, 'Excelente', '2026-04-10 14:30:00');