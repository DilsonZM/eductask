"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerGrid } from "@/components/common/SkeletonLoader";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Users, GraduationCap, CheckCircle, AlertTriangle, Star, ChevronRight } from "lucide-react";

interface StudentRow {
  studentId: string;
  name: string;
  classroomName: string;
  subjectName: string;
  subjectId: string;
  classroomSubjectId: string;
  average: number | null;
  maxScore: number;
  entregas: number;
  totalTareas: number;
  status: "ok" | "atrasado" | "exonerado";
}

export default function StudentsPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [classroomFilter, setClassroomFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const loadInit = useCallback(async () => {
    if (!user) return;
    const { data: teacher } = await supabaseRef.current.from("teachers").select("id").eq("user_id", user.id).single();
    if (!teacher) { setLoading(false); return; }
    setTeacherId(teacher.id);

    const { data: ta } = await supabaseRef.current.from("teacher_assignments")
      .select("classroom_id, classrooms!inner(id, name)").eq("teacher_id", teacher.id);
    if (ta) {
      const seen = new Map<string, string>();
      for (const r of ta) {
        const c = (r as any).classrooms as { id: string; name: string } | null;
        if (c && r.classroom_id && !seen.has(r.classroom_id)) seen.set(r.classroom_id, c.name);
      }
      setClassrooms(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadInit(); }, [loadInit]);

  const loadSubjects = useCallback(async (cId: string) => {
    if (!teacherId) return;
    const { data } = await supabaseRef.current.from("teacher_assignments")
      .select("subject_id, subjects!inner(id, name)").eq("teacher_id", teacherId).eq("classroom_id", cId);
    if (data) {
      const seen = new Map<string, string>();
      for (const r of data) {
        const s = (r as any).subjects as { id: string; name: string } | null;
        if (s && r.subject_id && !seen.has(r.subject_id)) seen.set(r.subject_id, s.name);
      }
      setSubjects(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
    }
  }, [teacherId]);

  const loadStudents = useCallback(async () => {
    if (!classroomFilter || !subjectFilter) { setStudents([]); return; }
    setLoading(true);
    try {
      const { data: cs } = await supabaseRef.current.from("classroom_subjects").select("id")
        .eq("classroom_id", classroomFilter).eq("subject_id", subjectFilter).single();
      if (!cs) { setStudents([]); return; }
      const csId = cs.id;

      const { data: config } = await supabaseRef.current.from("subject_grading_config")
        .select("max_score").eq("classroom_subject_id", csId).order("created_at", { ascending: false }).limit(1).single();
      const maxScore = (config?.max_score as number) || 10;

      const { data: studentList } = await supabaseRef.current.from("students")
        .select("id, first_name, last_name").eq("classroom_id", classroomFilter).eq("status", "active").order("last_name");

      if (!studentList?.length) { setStudents([]); return; }

      const { data: allTasks } = await supabaseRef.current.from("tasks")
        .select("id, category").eq("classroom_subject_id", csId).in("status", ["published", "closed"]);

      const taskIds = (allTasks || []).map((t) => t.id);
      const totalTareas = allTasks?.length || 0;

      const { data: subs } = taskIds.length > 0 ? await supabaseRef.current.from("submissions")
        .select("student_id, score").in("task_id", taskIds) : { data: [] };

      const { data: exempts } = await supabaseRef.current.from("exemptions")
        .select("student_id").eq("classroom_subject_id", csId);

      const exonerados = new Set((exempts || []).map((e) => e.student_id));

      const gradesMap = new Map<string, { sum: number; count: number }>();
      (subs || []).forEach((s) => {
        if (s.score === null) return;
        const cur = gradesMap.get(s.student_id) || { sum: 0, count: 0 };
        cur.sum += s.score as number; cur.count++;
        gradesMap.set(s.student_id, cur);
      });

      const subsMap = new Map<string, number>();
      (subs || []).forEach((s) => {
        subsMap.set(s.student_id, (subsMap.get(s.student_id) || 0) + 1);
      });

      const rows: StudentRow[] = studentList.map((st) => {
        const g = gradesMap.get(st.id);
        const entregas = subsMap.get(st.id) || 0;
        const avg = g && g.count > 0 ? Math.round((g.sum / g.count) * 10) / 10 : null;
        let status: StudentRow["status"] = "ok";
        if (exonerados.has(st.id)) status = "exonerado";
        else if (entregas < totalTareas) status = "atrasado";
        return {
          studentId: st.id,
          name: `${st.first_name} ${st.last_name}`,
          classroomName: classrooms.find((c) => c.id === classroomFilter)?.name || "",
          subjectName: subjects.find((s) => s.id === subjectFilter)?.name || "",
          subjectId: subjectFilter,
          classroomSubjectId: csId,
          average: avg,
          maxScore,
          entregas,
          totalTareas,
          status,
        };
      });

      setStudents(rows);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [classroomFilter, subjectFilter, classrooms, subjects]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const handleClassroom = (cId: string) => {
    setClassroomFilter(cId); setSubjectFilter("");
    if (cId) loadSubjects(cId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">Mis Estudiantes</h1>
        <p className="text-sm text-slate-500 mt-2">Consulta el rendimiento de tus alumnos por salón y materia</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Salón</p>
          <div className="flex flex-wrap gap-2">
            {classrooms.map((c) => (
              <button key={c.id} onClick={() => handleClassroom(classroomFilter === c.id ? "" : c.id)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  classroomFilter === c.id ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{c.name}</button>
            ))}
          </div>
        </div>
        {classroomFilter && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Materia</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => (
                <button key={s.id} onClick={() => setSubjectFilter(subjectFilter === s.id ? "" : s.id)}
                  className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    subjectFilter === s.id ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{s.name}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (<ShimmerGrid count={6} />) : students.length === 0 && classroomFilter && subjectFilter ? (
        <EmptyState title="Sin estudiantes" description="No se encontraron estudiantes activos" icon={<Users className="w-8 h-8" />} />
      ) : students.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((st) => (
            <div key={st.studentId} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex items-start gap-3 mb-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  st.status === "exonerado" ? "bg-purple-100" : st.status === "atrasado" ? "bg-amber-100" : "bg-emerald-100")}>
                  <GraduationCap className={cn("w-5 h-5",
                    st.status === "exonerado" ? "text-purple-600" : st.status === "atrasado" ? "text-amber-600" : "text-emerald-600")} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 text-sm truncate">{st.name}</h3>
                  <p className="text-xs text-slate-500">{st.classroomName} — {st.subjectName}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {st.average !== null ? (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-slate-500">Promedio</span>
                      <span className="font-bold text-slate-900">{st.average} / {st.maxScore}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all",
                        st.average >= 3.5 || st.maxScore > 10 ? "bg-emerald-500" : st.average >= 2.5 ? "bg-amber-500" : "bg-red-500")}
                        style={{ width: `${Math.min((st.average / st.maxScore) * 100, 100)}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Sin calificaciones</p>
                )}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>Entregas: {st.entregas}/{st.totalTareas}</span>
                  {st.status === "ok" && <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Al día</span>}
                  {st.status === "atrasado" && <span className="text-amber-600 flex items-center gap-0.5"><AlertTriangle className="w-3 h-3" /> Atrasado</span>}
                  {st.status === "exonerado" && <span className="text-purple-600 flex items-center gap-0.5"><Star className="w-3 h-3" /> Exonerado</span>}
                </div>
              </div>

              <button onClick={() => router.push(`/teacher/students/${st.studentId}?classroomSubjectId=${st.classroomSubjectId}&subjectName=${encodeURIComponent(st.subjectName)}&studentName=${encodeURIComponent(st.name)}&classroomName=${encodeURIComponent(st.classroomName)}`)}
                className="w-full text-center text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center justify-center gap-1">
                Ver perfil académico <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
