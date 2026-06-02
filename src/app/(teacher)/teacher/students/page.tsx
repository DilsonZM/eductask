"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Users, CheckCircle, AlertTriangle, Star, ChevronRight } from "lucide-react";

interface StudentRow {
  studentId: string;
  name: string;
  avatar: string | null;
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

const CACHE_KEY = "teacher_students_filter";

export default function StudentsPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
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
    if (!ta?.length) { setLoading(false); return; }

    const seen = new Map<string, string>();
    for (const r of ta) {
      const c = (r as any).classrooms as { id: string; name: string } | null;
      if (c && r.classroom_id && !seen.has(r.classroom_id)) seen.set(r.classroom_id, c.name);
    }
    const sorted = Array.from(seen.entries())
      .sort((a, b) => a[1].localeCompare(b[1], undefined, { numeric: true }))
      .map(([id, name]) => ({ id, name }));
    setClassrooms(sorted);

    const cached = localStorage.getItem(CACHE_KEY);
    let targetClassroom = "";
    let targetSubject = "";

    if (cached) {
      try {
        const { cId, sId } = JSON.parse(cached);
        if (sorted.find(c => c.id === cId)) {
          targetClassroom = cId;
          targetSubject = sId || "";
        }
      } catch {}
    }

    if (!targetClassroom && sorted.length > 0) {
      targetClassroom = sorted[0].id;
    }

    if (targetClassroom) {
      setClassroomFilter(targetClassroom);
      const { data: subData } = await supabaseRef.current.from("teacher_assignments")
        .select("subject_id, subjects!inner(id, name)").eq("teacher_id", teacher.id).eq("classroom_id", targetClassroom);
      if (subData) {
        const subSeen = new Map<string, string>();
        for (const r of subData) {
          const s = (r as any).subjects as { id: string; name: string } | null;
          if (s && r.subject_id && !subSeen.has(r.subject_id)) subSeen.set(r.subject_id, s.name);
        }
        const sortedSubs = Array.from(subSeen.entries())
          .sort((a, b) => a[1].localeCompare(b[1]))
          .map(([id, name]) => ({ id, name }));
        setSubjects(sortedSubs);

        if (targetSubject && !sortedSubs.find(s => s.id === targetSubject)) targetSubject = "";
        if (!targetSubject && sortedSubs.length > 0) targetSubject = sortedSubs[0].id;
        if (targetSubject) {
          setSubjectFilter(targetSubject);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ cId: targetClassroom, sId: targetSubject }));
        }
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { loadInit(); }, [loadInit]);

  const loadSubjects = useCallback(async (cId: string) => {
    if (!teacherId) return [];
    const { data } = await supabaseRef.current.from("teacher_assignments")
      .select("subject_id, subjects!inner(id, name)").eq("teacher_id", teacherId).eq("classroom_id", cId);
    if (data) {
      const seen = new Map<string, string>();
      for (const r of data) {
        const s = (r as any).subjects as { id: string; name: string } | null;
        if (s && r.subject_id && !seen.has(r.subject_id)) seen.set(r.subject_id, s.name);
      }
      const sorted = Array.from(seen.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, name]) => ({ id, name }));
      setSubjects(sorted);
      return sorted;
    }
    return [];
  }, [teacherId]);

  const handleClassroom = useCallback(async (cId: string) => {
    setClassroomFilter(cId);
    setSubjectFilter("");
    setStudents([]);
    if (cId) {
      const sorted = await loadSubjects(cId);
      if (sorted.length > 0) {
        setSubjectFilter(sorted[0].id);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ cId, sId: sorted[0].id }));
      }
    }
  }, [loadSubjects]);

  const handleSubject = useCallback((sId: string) => {
    setSubjectFilter(sId);
    if (classroomFilter && sId) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ cId: classroomFilter, sId }));
    }
  }, [classroomFilter]);

  const loadStudents = useCallback(async () => {
    if (!classroomFilter || !subjectFilter) { setStudents([]); return; }
    setTableLoading(true);
    try {
      const { data: cs } = await supabaseRef.current.from("classroom_subjects").select("id")
        .eq("classroom_id", classroomFilter).eq("subject_id", subjectFilter).single();
      if (!cs) { setStudents([]); return; }
      const csId = cs.id;

      const { data: config } = await supabaseRef.current.from("subject_grading_config")
        .select("max_score").eq("classroom_subject_id", csId).order("created_at", { ascending: false }).limit(1).single();
      const maxScore = (config?.max_score as number) || 10;

      const { data: studentList } = await supabaseRef.current.from("students")
        .select("id, user_id, first_name, last_name").eq("classroom_id", classroomFilter).eq("status", "active").order("last_name");

      if (!studentList?.length) { setStudents([]); return; }

      const userIds = (studentList || [])
        .map((s) => s.user_id)
        .filter((id): id is string => Boolean(id));
      let avatarMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: userData } = await supabaseRef.current.from("users")
          .select("id, avatar").in("id", userIds);
        avatarMap = new Map((userData || []).map((u) => [u.id, u.avatar || ""]));
      }

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
          avatar: st.user_id ? avatarMap.get(st.user_id) || null : null,
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
    finally { setTableLoading(false); }
  }, [classroomFilter, subjectFilter, classrooms, subjects]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const statusConfig = {
    ok: { badge: "bg-emerald-50 text-emerald-700", icon: CheckCircle, label: "Al día" },
    atrasado: { badge: "bg-amber-50 text-amber-700", icon: AlertTriangle, label: "Atrasado" },
    exonerado: { badge: "bg-purple-50 text-purple-700", icon: Star, label: "Exonerado" },
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
                <button key={s.id} onClick={() => handleSubject(subjectFilter === s.id ? "" : s.id)}
                  className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    subjectFilter === s.id ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{s.name}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {tableLoading ? (
        <ShimmerTable rows={5} cols={5} />
      ) : students.length === 0 && classroomFilter && subjectFilter ? (
        <EmptyState title="Sin estudiantes" description="No se encontraron estudiantes activos" icon={<Users className="w-8 h-8" />} />
      ) : students.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estudiante</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Promedio</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entregas</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st) => {
                  const sc = statusConfig[st.status];
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={st.studentId} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold text-xs overflow-hidden shrink-0">
                            {st.avatar ? (
                              <img src={st.avatar} alt={st.name} className="w-full h-full object-cover" />
                            ) : (
                              st.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-900">{st.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {st.average !== null ? (
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-slate-900 w-16">{st.average} / {st.maxScore}</span>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full transition-all",
                                (st.maxScore <= 10 && st.average >= 6) || (st.maxScore > 10 && st.average >= st.maxScore * 0.6)
                                  ? "bg-emerald-500" : st.average >= st.maxScore * 0.4 ? "bg-amber-500" : "bg-red-500")}
                                style={{ width: `${Math.min((st.average / st.maxScore) * 100, 100)}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin notas</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-600">{st.entregas}/{st.totalTareas}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", sc.badge)}>
                          <StatusIcon className="w-3 h-3" /> {sc.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button onClick={() => router.push(`/teacher/students/${st.studentId}?classroomSubjectId=${st.classroomSubjectId}&subjectName=${encodeURIComponent(st.subjectName)}&studentName=${encodeURIComponent(st.name)}&classroomName=${encodeURIComponent(st.classroomName)}`)}
                          className="text-sm text-primary-600 hover:text-primary-800 font-medium inline-flex items-center gap-1">
                          Ver perfil <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
