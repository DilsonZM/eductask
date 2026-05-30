"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Sliders, AlertTriangle, CheckCircle } from "lucide-react";

interface GradingConfig {
  id?: string;
  weight_taller: number;
  weight_trabajo: number;
  weight_quiz: number;
  weight_participacion: number;
  weight_examen_final: number;
  max_score: number;
}

const CATEGORIES = [
  { key: "taller", label: "Taller" },
  { key: "trabajo", label: "Trabajo" },
  { key: "quiz", label: "Quiz" },
  { key: "participacion", label: "Participación" },
  { key: "examen_final", label: "Examen Final" },
] as const;

const MAX_SCORE_OPTIONS = [5, 10, 100];

export default function GradingConfigPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasGrades, setHasGrades] = useState(false);

  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [config, setConfig] = useState<GradingConfig>({
    weight_taller: 0, weight_trabajo: 0, weight_quiz: 0,
    weight_participacion: 0, weight_examen_final: 0, max_score: 10,
  });
  const [existingConfigId, setExistingConfigId] = useState<string | null>(null);

  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const loadInit = useCallback(async () => {
    if (!user) return;
    try {
      const { data: teacher } = await supabaseRef.current.from("teachers").select("id").eq("user_id", user.id).single();
      if (!teacher) { setLoading(false); return; }
      setTeacherId(teacher.id);

      const [{ data: ta }, { data: per }] = await Promise.all([
        supabaseRef.current.from("teacher_assignments").select("classroom_id, classrooms!inner(id, name)").eq("teacher_id", teacher.id),
        supabaseRef.current.from("school_periods").select("id, name, order").order("order"),
      ]);

      if (per) setPeriods(per);
      if (ta) {
        const seen = new Map<string, string>();
        for (const r of ta) {
          const c = (r as any).classrooms as { id: string; name: string } | null;
          if (c && r.classroom_id && !seen.has(r.classroom_id)) seen.set(r.classroom_id, c.name);
        }
        setClassrooms(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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

  const loadConfig = useCallback(async (csId: string, pId: string) => {
    const { data } = await supabaseRef.current.from("subject_grading_config")
      .select("*").eq("classroom_subject_id", csId).eq("school_period_id", pId).single();
    if (data) {
      const d = data as Record<string, unknown>;
      setConfig({
        weight_taller: (d.weight_taller as number) || 0,
        weight_trabajo: (d.weight_trabajo as number) || 0,
        weight_quiz: (d.weight_quiz as number) || 0,
        weight_participacion: (d.weight_participacion as number) || 0,
        weight_examen_final: (d.weight_examen_final as number) || 0,
        max_score: (d.max_score as number) || 10,
      });
      setExistingConfigId(d.id as string);
      setHasGrades(true); // if config exists, assume grades might exist
    } else {
      setConfig({ weight_taller: 0, weight_trabajo: 0, weight_quiz: 0, weight_participacion: 0, weight_examen_final: 0, max_score: 10 });
      setExistingConfigId(null);
      setHasGrades(false);
    }
  }, []);

  const handleClassroom = (cId: string) => {
    setClassroomId(cId); setSubjectId(""); setPeriodId("");
    if (cId) loadSubjects(cId);
  };

  const handleSubject = async (sId: string) => {
    setSubjectId(sId);
    if (sId && classroomId && periodId) {
      const { data: cs } = await supabaseRef.current.from("classroom_subjects").select("id")
        .eq("classroom_id", classroomId).eq("subject_id", sId).single();
      if (cs) loadConfig(cs.id, periodId);
    }
  };

  const handlePeriod = async (pId: string) => {
    setPeriodId(pId);
    if (pId && classroomId && subjectId) {
      const { data: cs } = await supabaseRef.current.from("classroom_subjects").select("id")
        .eq("classroom_id", classroomId).eq("subject_id", subjectId).single();
      if (cs) loadConfig(cs.id, pId);
    }
  };

  useEffect(() => {
    if (classroomId && subjectId && periodId) {
      const check = async () => {
        const { data: cs } = await supabaseRef.current.from("classroom_subjects").select("id")
          .eq("classroom_id", classroomId).eq("subject_id", subjectId).single();
        if (cs) {
          const { count } = await supabaseRef.current.from("grades")
            .select("*", { count: "exact", head: true })
            .eq("classroom_subject_id", cs.id).eq("school_period_id", periodId);
          setHasGrades((count || 0) > 0);
        }
      };
      check();
    }
  }, [classroomId, subjectId, periodId]);

  const totalWeight = useMemo(() =>
    config.weight_taller + config.weight_trabajo + config.weight_quiz + config.weight_participacion + config.weight_examen_final,
    [config]);
  const isValid = totalWeight === 100;

  const setWeight = (key: string, val: number) => {
    setConfig((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, val || 0)) }));
  };

  const handleSave = async () => {
    if (!isValid) { toast.error("Los pesos deben sumar 100%"); return; }
    if (!teacherId) return;
    setSaving(true);
    try {
      const { data: cs } = await supabaseRef.current.from("classroom_subjects").select("id")
        .eq("classroom_id", classroomId).eq("subject_id", subjectId).single();
      if (!cs) { toast.error("Seleccione salón, materia y periodo"); return; }

      const payload = {
        classroom_subject_id: cs.id,
        school_period_id: periodId,
        teacher_id: teacherId,
        weight_taller: config.weight_taller,
        weight_trabajo: config.weight_trabajo,
        weight_quiz: config.weight_quiz,
        weight_participacion: config.weight_participacion,
        weight_examen_final: config.weight_examen_final,
        max_score: config.max_score,
      };

      if (existingConfigId) {
        await supabaseRef.current.from("subject_grading_config").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", existingConfigId);
      } else {
        await supabaseRef.current.from("subject_grading_config").insert(payload);
      }
      toast.success("Configuración guardada");
    } catch (e) { console.error(e); toast.error("Error al guardar"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">Configuración de Evaluación</h1>
        <p className="text-sm text-slate-500 mt-2">Define los pesos y el tope de calificación por materia y período</p>
      </div>

      {loading ? (<ShimmerTable rows={4} cols={3} />) : classrooms.length === 0 ? (
        <EmptyState title="Sin asignaciones" description="No tienes salones asignados" />
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Salón</p>
              <div className="flex flex-wrap gap-2">
                {classrooms.map((c) => (
                  <button key={c.id} onClick={() => handleClassroom(classroomId === c.id ? "" : c.id)}
                    className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                      classroomId === c.id ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{c.name}</button>
                ))}
              </div>
            </div>
            {classroomId && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Materia</p>
                <div className="flex flex-wrap gap-2">
                  {subjects.map((s) => (
                    <button key={s.id} onClick={() => handleSubject(subjectId === s.id ? "" : s.id)}
                      className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        subjectId === s.id ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{s.name}</button>
                  ))}
                </div>
              </div>
            )}
            {subjectId && (
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Período</p>
                <div className="flex flex-wrap gap-2">
                  {periods.map((p) => (
                    <button key={p.id} onClick={() => handlePeriod(periodId === p.id ? "" : p.id)}
                      className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                        periodId === p.id ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{p.name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {periodId && subjectId && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Tope de calificación</p>
                <div className="flex flex-wrap gap-2">
                  {MAX_SCORE_OPTIONS.map((v) => (
                    <button key={v} onClick={() => !hasGrades && setConfig((prev) => ({ ...prev, max_score: v }))}
                      disabled={hasGrades}
                      className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        config.max_score === v ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                        hasGrades && "opacity-60 cursor-not-allowed")}>{v}</button>
                  ))}
                </div>
                {hasGrades && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    No puedes cambiar el tope porque ya hay notas registradas en este período.
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Distribución de pesos (%)</p>
                  <span className={cn("text-sm font-bold", isValid ? "text-emerald-600" : "text-red-500")}>
                    Total: {totalWeight}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", isValid ? "bg-emerald-500" : totalWeight > 100 ? "bg-red-500" : "bg-amber-500")}
                    style={{ width: `${Math.min(totalWeight, 100)}%` }} />
                </div>
                <div className="space-y-3">
                  {CATEGORIES.map((cat) => {
                    const key = `weight_${cat.key}` as keyof GradingConfig;
                    return (
                      <div key={cat.key} className="flex items-center gap-3">
                        <span className="w-32 text-sm text-slate-700">{cat.label}</span>
                        <input type="number" min={0} max={100} value={config[key] || ""}
                          onChange={(e) => setWeight(key, parseFloat(e.target.value) || 0)}
                          className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-primary-500 outline-none" />
                        <span className="text-sm text-slate-400">%</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                <Button onClick={handleSave} isLoading={saving} disabled={!isValid}>
                  <Sliders className="w-4 h-4" /> Guardar configuración
                </Button>
                {isValid && (
                  <span className="text-sm text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Pesos correctos
                  </span>
                )}
                {!isValid && totalWeight > 0 && (
                  <span className="text-sm text-red-500 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Debe sumar exactamente 100%
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
