"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { Select } from "@/components/ui/Select";
import toast from "react-hot-toast";
import type { Tables } from "@/types/database";

type Period = Tables<"school_periods">;
type Grade = Tables<"grades">;

interface SelectOption {
  value: string;
  label: string;
}

interface StudentGradeRow {
  studentId: string;
  studentName: string;
  scores: Record<string, { gradeId?: string; score: number | null }>;
  average: number | null;
}

function getScoreColor(score: number | null) {
  if (score === null) return "bg-slate-100 text-slate-400";
  if (score >= 7) return "bg-emerald-100 text-emerald-700";
  if (score >= 5) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function formatScore(score: number | null) {
  if (score === null) return "—";
  return score % 1 === 0 ? score.toString() : score.toFixed(1);
}

export default function GradesPage() {
  const { user } = useAuth();
  const supabase = useRef(createClient());

  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");

  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<SelectOption[]>([]);
  const [subjects, setSubjects] = useState<SelectOption[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [gradeRows, setGradeRows] = useState<StudentGradeRow[]>([]);

  const [loadingTeacher, setLoadingTeacher] = useState(true);
  const [loadingClassrooms, setLoadingClassrooms] = useState(false);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);

  const [editingCell, setEditingCell] = useState<{ studentId: string; periodId: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingCell, setSavingCell] = useState<{ studentId: string; periodId: string } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const loadClassrooms = useCallback(async (tId: string) => {
    setLoadingClassrooms(true);
    try {
      const { data } = await supabase.current
        .from("teacher_assignments")
        .select("classroom_id, classrooms!inner(id, name)")
        .eq("teacher_id", tId);

      if (data) {
        const seen = new Map<string, string>();
        for (const row of data) {
          const c = row.classrooms as unknown as Record<string, string> | null;
          if (c && row.classroom_id && !seen.has(row.classroom_id)) {
            seen.set(row.classroom_id, c.name);
          }
        }
        setClassrooms(
          Array.from(seen.entries()).map(([id, name]) => ({
            value: id,
            label: name,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading classrooms:", error);
    } finally {
      setLoadingClassrooms(false);
    }
  }, []);

  const loadPeriods = useCallback(async () => {
    setLoadingPeriods(true);
    try {
      const { data } = await supabase.current
        .from("school_periods")
        .select("*")
        .order("order", { ascending: true });

      if (data) setPeriods(data);
    } catch (error) {
      console.error("Error loading periods:", error);
    } finally {
      setLoadingPeriods(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const init = async () => {
      try {
        const { data: teacher } = await supabase.current
          .from("teachers")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!cancelled && teacher) {
          setTeacherId(teacher.id);
          loadClassrooms(teacher.id);
          loadPeriods();
        }
      } catch (error) {
        console.error("Error loading teacher:", error);
      } finally {
        if (!cancelled) setLoadingTeacher(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [user, loadClassrooms, loadPeriods]);

  const loadSubjects = useCallback(async (tId: string, cId: string) => {
    try {
      const { data } = await supabase.current
        .from("teacher_assignments")
        .select("subject_id, subjects!inner(id, name)")
        .eq("teacher_id", tId)
        .eq("classroom_id", cId);

      if (data) {
        const seen = new Map<string, string>();
        for (const row of data) {
          const s = row.subjects as unknown as Record<string, string> | null;
          if (s && row.subject_id && !seen.has(row.subject_id)) {
            seen.set(row.subject_id, s.name);
          }
        }
        setSubjects(
          Array.from(seen.entries()).map(([id, name]) => ({
            value: id,
            label: name,
          }))
        );
      }
    } catch (error) {
      console.error("Error loading subjects:", error);
    }
  }, []);

  const loadGrades = useCallback(
    async (cId: string, sId: string) => {
      if (!teacherId) return;
      setLoadingGrades(true);
      try {
        const { data: cs } = await supabase.current
          .from("classroom_subjects")
          .select("id")
          .eq("classroom_id", cId)
          .eq("subject_id", sId)
          .single();

        if (!cs) {
          setGradeRows([]);
          setLoadingGrades(false);
          return;
        }

        const classroomSubjectId = cs.id;

        const { data: students } = await supabase.current
          .from("students")
          .select("id, first_name, last_name")
          .eq("classroom_id", cId)
          .eq("status", "active")
          .order("last_name", { ascending: true });

        if (!students || students.length === 0) {
          setGradeRows([]);
          setLoadingGrades(false);
          return;
        }

        const activePeriods = periods;
        const periodIds = activePeriods.map((p) => p.id);

        const { data: existingGrades } = await supabase.current
          .from("grades")
          .select("*")
          .eq("classroom_subject_id", classroomSubjectId)
          .in("school_period_id", periodIds);

        const gradeMap = new Map<string, Grade>();
        if (existingGrades) {
          for (const g of existingGrades) {
            gradeMap.set(`${g.student_id}_${g.school_period_id}`, g);
          }
        }

        const rows: StudentGradeRow[] = students.map((st) => {
          const scores: Record<string, { gradeId?: string; score: number | null }> = {};
          let sum = 0;
          let count = 0;

          for (const period of activePeriods) {
            const g = gradeMap.get(`${st.id}_${period.id}`);
            if (g && g.score !== null) {
              scores[period.id] = { gradeId: g.id, score: g.score };
              sum += g.score;
              count++;
            } else {
              scores[period.id] = { score: null };
            }
          }

          return {
            studentId: st.id,
            studentName: `${st.first_name} ${st.last_name}`.trim(),
            scores,
            average: count > 0 ? Math.round((sum / count) * 10) / 10 : null,
          };
        });

        setGradeRows(rows);
      } catch (error) {
        console.error("Error loading grades:", error);
        toast.error("Error al cargar calificaciones");
      } finally {
        setLoadingGrades(false);
      }
    },
    [teacherId, periods]
  );

  const handleClassroomChange = (value: string) => {
    setClassroomId(value);
    setSubjectId("");
    setGradeRows([]);
    if (value && teacherId) {
      loadSubjects(teacherId, value);
    } else {
      setSubjects([]);
    }
  };

  const handleSubjectChange = (value: string) => {
    setSubjectId(value);
    if (value && classroomId) {
      loadGrades(classroomId, value);
    } else {
      setGradeRows([]);
    }
  };

  const handleCellClick = (studentId: string, periodId: string, currentScore: number | null) => {
    setEditingCell({ studentId, periodId });
    setEditValue(currentScore !== null ? currentScore.toString() : "");
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const saveGrade = useCallback(
    async (studentId: string, periodId: string) => {
      if (!teacherId || !classroomId || !subjectId) return;

      const numeric = editValue.trim() === "" ? null : parseFloat(editValue);
      if (numeric !== null && (isNaN(numeric) || numeric < 0 || numeric > 10)) {
        toast.error("Ingresa una nota válida (0-10)");
        setEditingCell(null);
        return;
      }

      setSavingCell({ studentId, periodId });

      try {
        const { data: cs } = await supabase.current
          .from("classroom_subjects")
          .select("id")
          .eq("classroom_id", classroomId)
          .eq("subject_id", subjectId)
          .single();

        if (!cs) {
          toast.error("No se encontró la asignación aula-materia");
          return;
        }

        const classroomSubjectId = cs.id;
        const existingRow = gradeRows.find((r) => r.studentId === studentId);
        const existingGradeId = existingRow?.scores[periodId]?.gradeId;

        if (existingGradeId && numeric !== null) {
          const { error } = await supabase.current
            .from("grades")
            .update({ score: numeric, graded_at: new Date().toISOString() })
            .eq("id", existingGradeId);

          if (error) throw error;
        } else if (existingGradeId && numeric === null) {
          const { error } = await supabase.current
            .from("grades")
            .delete()
            .eq("id", existingGradeId);

          if (error) throw error;
        } else if (!existingGradeId && numeric !== null) {
          const { error } = await supabase.current
            .from("grades")
            .insert({
              student_id: studentId,
              teacher_id: teacherId,
              classroom_subject_id: classroomSubjectId,
              school_period_id: periodId,
              score: numeric,
              graded_at: new Date().toISOString(),
            });

          if (error) throw error;
        }

        setGradeRows((prev) =>
          prev.map((row) => {
            if (row.studentId !== studentId) return row;

            const newScores = { ...row.scores };
            newScores[periodId] = {
              ...newScores[periodId],
              score: numeric,
            };

            let sum = 0;
            let count = 0;
            for (const key of Object.keys(newScores)) {
              const s = newScores[key].score;
              if (s !== null) {
                sum += s;
                count++;
              }
            }

            return {
              ...row,
              scores: newScores,
              average: count > 0 ? Math.round((sum / count) * 10) / 10 : null,
            };
          })
        );

        toast.success("Nota guardada");
      } catch (error) {
        console.error("Error saving grade:", error);
        toast.error("Error al guardar la nota");
      } finally {
        setSavingCell(null);
      }
    },
    [editValue, teacherId, classroomId, subjectId, gradeRows]
  );

  const handleCellBlur = () => {
    if (editingCell) {
      const { studentId, periodId } = editingCell;
      setEditingCell(null);
      saveGrade(studentId, periodId);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (editingCell) {
        const { studentId, periodId } = editingCell;
        setEditingCell(null);
        saveGrade(studentId, periodId);
      }
    }
    if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  const filteredPeriods = useMemo(() => {
    if (periodId) return periods.filter((p) => p.id === periodId);
    return periods;
  }, [periods, periodId]);

  const periodOptions: SelectOption[] = useMemo(
    () => [
      { value: "", label: "Todos los periodos" },
      ...periods.map((p) => ({ value: p.id, label: p.name })),
    ],
    [periods]
  );

  const hasGrades = gradeRows.some((row) =>
    Object.values(row.scores).some((s) => s.score !== null)
  );

  const showTable = classroomId && subjectId;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calificaciones"
        description="Gestiona las notas de tus alumnos por aula, materia y periodo"
      />

      {loadingTeacher || loadingClassrooms || loadingPeriods ? (<ShimmerTable rows={5} cols={4} />) : classrooms.length === 0 ? (
        <EmptyState
          title="No tienes aulas asignadas"
          description="Contacta al administrador para que te asigne aulas y materias"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select
              label="Aula"
              options={classrooms}
              value={classroomId}
              onChange={(e) => handleClassroomChange(e.target.value)}
            />
            <Select
              label="Materia"
              options={subjects}
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={!classroomId}
            />
            <Select
              label="Periodo"
              options={periodOptions}
              value={periodId}
              onChange={(e) => setPeriodId(e.target.value)}
              disabled={!showTable && !hasGrades}
            />
          </div>
        </div>
      )}

      {showTable && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          {loadingGrades ? (<ShimmerTable rows={5} cols={5} />) : gradeRows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Sin estudiantes"
                description="No se encontraron estudiantes activos en esta aula"
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      Alumno
                    </th>
                    {filteredPeriods.map((period) => (
                      <th
                        key={period.id}
                        className="px-3 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]"
                      >
                        {period.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      Promedio
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {gradeRows.map((row) => (
                    <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-sm text-slate-900 font-medium whitespace-nowrap">
                        {row.studentName}
                      </td>
                      {filteredPeriods.map((period) => {
                        const cell = row.scores[period.id];
                        const isEditing =
                          editingCell?.studentId === row.studentId &&
                          editingCell?.periodId === period.id;
                        const isSaving =
                          savingCell?.studentId === row.studentId &&
                          savingCell?.periodId === period.id;

                        if (isEditing) {
                          return (
                            <td key={period.id} className="px-1 py-2.5 text-center">
                              <input
                                ref={inputRef}
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={handleCellBlur}
                                onKeyDown={handleCellKeyDown}
                                className="w-16 px-2 py-1 border border-primary-400 rounded text-center text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                                placeholder="0"
                              />
                            </td>
                          );
                        }

                        return (
                          <td
                            key={period.id}
                            className="px-1 py-2.5 text-center cursor-pointer"
                            onClick={() =>
                              !isSaving &&
                              handleCellClick(row.studentId, period.id, cell?.score ?? null)
                            }
                          >
                            {isSaving ? (
                              <div className="inline-flex items-center justify-center w-16">
                                <div className="w-4 h-4 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin" />
                              </div>
                            ) : (
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${getScoreColor(cell?.score ?? null)}`}
                              >
                                {formatScore(cell?.score ?? null)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-center">
                        {row.average !== null ? (
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${getScoreColor(row.average)}`}
                          >
                            {row.average % 1 === 0 ? row.average.toString() : row.average.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!showTable && classrooms.length > 0 && !loadingTeacher && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Selecciona filtros</p>
            <p className="text-slate-500 text-sm mt-1">
              Elige un aula y una materia para ver la matriz de calificaciones
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
