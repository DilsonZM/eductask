"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { GraduationCap, Users, Star, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import type { Tables } from "@/types/database";

type Period = Tables<"school_periods">;
type Grade = Tables<"grades">;

interface StudentGradeRow {
  studentId: string;
  studentName: string;
  scores: Record<string, { gradeId?: string; score: number | null }>;
  average: number | null;
}

function getScoreColor(score: number | null) {
  if (score === null) return "bg-slate-100 text-slate-400 border-slate-200";
  if (score >= 7) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 5) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function formatScore(score: number | null) {
  if (score === null) return "—";
  return score % 1 === 0 ? score.toString() : score.toFixed(1);
}

export default function GradesPage() {
  const { user } = useAuth();
  const supabase = useRef(createClient());

  const [classroomFilter, setClassroomFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("all");

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [gradeRows, setGradeRows] = useState<StudentGradeRow[]>([]);
  const [classroomStudents, setClassroomStudents] = useState<{ id: string; name: string; status: string }[]>([]);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const [editingCell, setEditingCell] = useState<{ studentId: string; periodId: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingCell, setSavingCell] = useState<{ studentId: string; periodId: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadInit = useCallback(async () => {
    if (!user) return;
    try {
      const { data: teacher } = await supabase.current
        .from("teachers").select("id").eq("user_id", user.id).single();
      if (!teacher) { setLoadingInit(false); return; }
      setTeacherId(teacher.id);

      const [{ data: taData }, { data: perData }] = await Promise.all([
        supabase.current.from("teacher_assignments")
          .select("classroom_id, classrooms!inner(id, name)")
          .eq("teacher_id", teacher.id),
        supabase.current.from("school_periods").select("*").order("order"),
      ]);

      if (perData) setPeriods(perData);

      if (taData) {
        const seen = new Map<string, string>();
        for (const row of taData) {
          const c = (row as any).classrooms as { id: string; name: string } | null;
          if (c && row.classroom_id && !seen.has(row.classroom_id)) seen.set(row.classroom_id, c.name);
        }
        const sorted = Array.from(seen.entries())
          .sort((a, b) => {
            const na = parseInt(a[1]) || 0;
            const nb = parseInt(b[1]) || 0;
            if (na !== nb) return na - nb;
            return a[1].localeCompare(b[1]);
          })
          .map(([id, name]) => ({ id, name }));
        setClassrooms(sorted);
      }
    } catch (error) { console.error("Error:", error); }
    finally { setLoadingInit(false); }
  }, [user]);

  useEffect(() => { loadInit(); }, [loadInit]);

  const loadSubjects = useCallback(async (cId: string) => {
    if (!teacherId) return;
    const { data } = await supabase.current
      .from("teacher_assignments")
      .select("subject_id, subjects!inner(id, name)")
      .eq("teacher_id", teacherId).eq("classroom_id", cId);
    if (data) {
      const seen = new Map<string, string>();
      for (const row of data) {
      const s = (row as any).subjects as { id: string; name: string } | null;
      if (s && row.subject_id && !seen.has(row.subject_id)) seen.set(row.subject_id, s.name);
      }
      setSubjects(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
    }
  }, [teacherId]);

  const loadGrades = useCallback(async (cId: string, sId: string) => {
    setLoadingGrades(true);
    try {
      const { data: cs } = await supabase.current
        .from("classroom_subjects").select("id")
        .eq("classroom_id", cId).eq("subject_id", sId).single();
      if (!cs) { setGradeRows([]); return; }
      const csId = cs.id;

      const { data: students } = await supabase.current
        .from("students").select("id, first_name, last_name, status")
        .eq("classroom_id", cId).eq("status", "active").order("last_name");
      if (!students?.length) { setGradeRows([]); setClassroomStudents([]); return; }

      setClassroomStudents(students.map((s) => ({
        id: s.id, name: `${s.first_name} ${s.last_name}`, status: s.status,
      })));

      const pIds = periods.map((p) => p.id);
      const { data: existing } = await supabase.current
        .from("grades").select("*").eq("classroom_subject_id", csId).in("school_period_id", pIds);
      const gradeMap = new Map<string, Grade>();
      if (existing) for (const g of existing) gradeMap.set(`${g.student_id}_${g.school_period_id}`, g);

      setGradeRows(students.map((st) => {
        const scores: Record<string, { gradeId?: string; score: number | null }> = {};
        let sum = 0, count = 0;
        for (const p of periods) {
          const g = gradeMap.get(`${st.id}_${p.id}`);
          if (g && g.score !== null) {
            scores[p.id] = { gradeId: g.id, score: g.score };
            sum += g.score; count++;
          } else { scores[p.id] = { score: null }; }
        }
        return {
          studentId: st.id, studentName: `${st.first_name} ${st.last_name}`.trim(),
          scores, average: count > 0 ? Math.round((sum / count) * 10) / 10 : null,
        };
      }));
    } catch (error) { console.error("Error:", error); }
    finally { setLoadingGrades(false); }
  }, [periods]);

  const handleClassroom = (cId: string) => {
    setClassroomFilter(cId);
    setSubjectFilter("");
    setGradeRows([]);
    if (cId) loadSubjects(cId);
  };

  const handleSubject = (sId: string) => {
    setSubjectFilter(sId);
    if (sId && classroomFilter) loadGrades(classroomFilter, sId);
    else setGradeRows([]);
  };

  const filteredPeriods = useMemo(() =>
    periodFilter === "all" ? periods : periods.filter((p) => p.id === periodFilter),
    [periods, periodFilter]);

  const stats = useMemo(() => {
    if (!gradeRows.length) return null;
    const scores = gradeRows.flatMap((r) =>
      Object.values(r.scores).map((s) => s.score).filter((s) => s !== null) as number[]
    );
    const avg = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
    const approved = gradeRows.filter((r) => r.average !== null && r.average >= 5).length;
    const failed = gradeRows.filter((r) => r.average !== null && r.average < 5).length;
    const pending = gradeRows.filter((r) => r.average === null).length;
    return { avg, total: scores.length, approved, failed, pending };
  }, [gradeRows]);

  const showTable = classroomFilter && subjectFilter;

  const handleCellClick = (studentId: string, periodId: string, score: number | null) => {
    setEditingCell({ studentId, periodId });
    setEditValue(score !== null ? score.toString() : "");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveGrade = useCallback(async (studentId: string, periodId: string) => {
    if (!teacherId || !classroomFilter || !subjectFilter) return;
    const numeric = editValue.trim() === "" ? null : parseFloat(editValue);
    if (numeric !== null && (isNaN(numeric) || numeric < 0 || numeric > 10)) {
      toast.error("Nota invalida (0-10)"); setEditingCell(null); return;
    }
    setSavingCell({ studentId, periodId });
    try {
      const { data: cs } = await supabase.current
        .from("classroom_subjects").select("id")
        .eq("classroom_id", classroomFilter).eq("subject_id", subjectFilter).single();
      if (!cs) { toast.error("Error"); return; }
      const csId = cs.id;
      const existing = gradeRows.find((r) => r.studentId === studentId)?.scores[periodId]?.gradeId;

      if (existing && numeric !== null)
        await supabase.current.from("grades").update({ score: numeric, graded_at: new Date().toISOString() }).eq("id", existing);
      else if (existing && numeric === null)
        await supabase.current.from("grades").delete().eq("id", existing);
      else if (!existing && numeric !== null)
        await supabase.current.from("grades").insert({ student_id: studentId, teacher_id: teacherId, classroom_subject_id: csId, school_period_id: periodId, score: numeric, graded_at: new Date().toISOString() });

      setGradeRows((prev) => prev.map((row) => {
        if (row.studentId !== studentId) return row;
        const newScores = { ...row.scores };
        newScores[periodId] = { ...newScores[periodId], score: numeric };
        let sum = 0, count = 0;
        for (const k of Object.keys(newScores)) {
          const s = newScores[k].score;
          if (s !== null) { sum += s; count++; }
        }
        return { ...row, scores: newScores, average: count > 0 ? Math.round((sum / count) * 10) / 10 : null };
      }));
      toast.success("Nota guardada");
    } catch (error) { console.error("Error:", error); toast.error("Error al guardar"); }
    finally { setSavingCell(null); }
  }, [editValue, teacherId, classroomFilter, subjectFilter, gradeRows]);

  const handleCellBlur = () => {
    if (editingCell) { const { studentId, periodId } = editingCell; setEditingCell(null); saveGrade(studentId, periodId); }
  };
  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); if (editingCell) { const { studentId, periodId } = editingCell; setEditingCell(null); saveGrade(studentId, periodId); } }
    if (e.key === "Escape") setEditingCell(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">Calificaciones</h1>
        <p className="text-sm text-slate-500 mt-2">Gestiona las notas de tus alumnos por salón, materia y período</p>
      </div>

      {loadingInit ? (<ShimmerTable rows={5} cols={4} />) : classrooms.length === 0 ? (
        <EmptyState title="No tienes aulas asignadas" description="Contacta al administrador para que te asigne aulas y materias" />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Salón</p>
              <div className="flex flex-wrap gap-2">
                {classrooms.map((c) => (
                  <button key={c.id} onClick={() => handleClassroom(classroomFilter === c.id ? "" : c.id)}
                    className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      classroomFilter === c.id ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {classroomFilter && subjects.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Materia</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <button key={s.id} onClick={() => handleSubject(subjectFilter === s.id ? "" : s.id)}
                      className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        subjectFilter === s.id ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showTable && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Período</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setPeriodFilter("all")}
                    className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      periodFilter === "all" ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                    Todos
                  </button>
                  {periods.map((p) => (
                    <button key={p.id} onClick={() => setPeriodFilter(p.id)}
                      className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        periodFilter === p.id ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {showTable && stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">{stats.avg}</p>
                  <p className="text-xs text-slate-500">Promedio general</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-700">{stats.approved}</p>
                  <p className="text-xs text-slate-500">Aprobados</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-red-700">{stats.failed}</p>
                  <p className="text-xs text-slate-500">Reprobados</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-700">{stats.pending}</p>
                  <p className="text-xs text-slate-500">Pendientes</p>
                </div>
              </div>
            </div>
          )}

          {showTable && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-500"><Users className="w-3.5 h-3.5" /> {gradeRows.length} alumnos</span>
                <span className="text-slate-300">|</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" /> ≥ 7
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" /> ≥5
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-50 border border-red-200" /> &lt;5
                </span>
              </div>

              {loadingGrades ? (<ShimmerTable rows={5} cols={5} />) : gradeRows.length === 0 ? (
                <div className="p-6"><EmptyState title="Sin estudiantes" description="No se encontraron estudiantes activos en esta aula" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[640px] w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Alumno</th>
                        {filteredPeriods.map((p) => (
                          <th key={p.id} className="px-3 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">{p.name}</th>
                        ))}
                        <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Prom</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gradeRows.map((row) => (
                        <tr key={row.studentId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5 text-sm text-slate-900 font-medium whitespace-nowrap">{row.studentName}</td>
                          {filteredPeriods.map((p) => {
                            const cell = row.scores[p.id];
                            const editing = editingCell?.studentId === row.studentId && editingCell?.periodId === p.id;
                            const saving = savingCell?.studentId === row.studentId && savingCell?.periodId === p.id;
                            if (editing) return (
                              <td key={p.id} className="px-1 py-2.5 text-center">
                                <input ref={inputRef} type="number" min={0} max={10} step={0.1} value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)} onBlur={handleCellBlur} onKeyDown={handleCellKeyDown}
                                  className="w-16 px-2 py-1 border border-primary-400 rounded text-center text-sm focus:ring-2 focus:ring-primary-500 outline-none" />
                              </td>
                            );
                            return (
                              <td key={p.id} className="px-1 py-2.5 text-center cursor-pointer"
                                onClick={() => !saving && handleCellClick(row.studentId, p.id, cell?.score ?? null)}>
                                {saving ? (
                                  <div className="inline-flex items-center justify-center w-16"><div className="w-4 h-4 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin" /></div>
                                ) : (
                                  <span className={cn("inline-block rounded-lg px-2.5 py-1 text-xs font-semibold border", getScoreColor(cell?.score ?? null))}>
                                    {formatScore(cell?.score ?? null)}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-4 py-2.5 text-center">
                            {row.average !== null ? (
                              <span className={cn("inline-block rounded-lg px-2.5 py-1 text-xs font-bold border", getScoreColor(row.average))}>
                                {formatScore(row.average)}
                              </span>
                            ) : <span className="text-sm text-slate-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {!showTable && classrooms.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center py-16">
              <div className="text-center">
                <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Selecciona un salón y una materia</p>
                <p className="text-sm text-slate-400 mt-1">Para comenzar a registrar calificaciones</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
