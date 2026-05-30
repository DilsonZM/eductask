"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Check, Save } from "lucide-react";

const MAX_SCORE_OPTIONS = [5, 10, 100];

interface ConfigRow {
  classroomSubjId: string;
  classroomName: string;
  subjectName: string;
  weight_taller: number;
  weight_trabajo: number;
  weight_quiz: number;
  weight_examen_final: number;
  bonus: number;
  max_score: number;
  configId: string | null;
  dirty: boolean;
}

const WEIGHT_KEYS = ["weight_taller", "weight_trabajo", "weight_quiz", "weight_examen_final"] as const;

export default function GradingConfigPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rows, setRows] = useState<ConfigRow[]>([]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: ta } = await supabaseRef.current.from("teacher_assignments")
        .select("classroom_id, subject_id, classrooms!inner(id, name, grade_level), subjects!inner(id, name)")
        .eq("teacher_id", user.id);

      const { data: configs } = await supabaseRef.current.from("subject_grading_config")
        .select("*").eq("teacher_id", user.id);

      const configMap = new Map<string, any>();
      (configs || []).forEach((c: any) => configMap.set(c.classroom_subject_id, c));

      if (!ta?.length) { setRows([]); return; }

      const seen = new Map<string, { classroomSubjId: string; classroomName: string; subjectName: string; grade: string }>();
      for (const r of ta) {
        const c = (r as any).classrooms as { id: string; name: string; grade_level: string } | null;
        const s = (r as any).subjects as { id: string; name: string } | null;
        const { data: cs } = await supabaseRef.current.from("classroom_subjects")
          .select("id").eq("classroom_id", r.classroom_id).eq("subject_id", r.subject_id).single();
        if (c && s && cs) {
          const key = `${c.name}:${s.name}`;
          if (!seen.has(key)) seen.set(key, { classroomSubjId: cs.id, classroomName: c.name, subjectName: s.name, grade: c.grade_level });
        }
      }

      const result: ConfigRow[] = Array.from(seen.values())
        .sort((a, b) => parseInt(a.grade) - parseInt(b.grade) || a.classroomName.localeCompare(b.classroomName))
        .map(({ classroomSubjId, classroomName, subjectName }) => {
          const cfg = configMap.get(classroomSubjId);
          return {
            classroomSubjId,
            classroomName,
            subjectName,
            weight_taller: cfg?.weight_taller || 0,
            weight_trabajo: cfg?.weight_trabajo || 0,
            weight_quiz: cfg?.weight_quiz || 0,
            weight_examen_final: cfg?.weight_examen_final || 0,
            bonus: cfg?.weight_participacion || 0,
            max_score: cfg?.max_score || 10,
            configId: cfg?.id || null,
            dirty: false,
          };
        });

      setRows(result);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateRow = (classroomSubjId: string, field: string, value: number) => {
    setRows(prev => prev.map(r =>
      r.classroomSubjId === classroomSubjId ? { ...r, [field]: value, dirty: true } : r
    ));
  };

  const totalWeight = (row: ConfigRow) =>
    row.weight_taller + row.weight_trabajo + row.weight_quiz + row.weight_examen_final;

  const handleSave = async (row: ConfigRow) => {
    if (totalWeight(row) !== 100) { toast.error("Los pesos deben sumar 100%"); return; }
    setSavingId(row.classroomSubjId);
    try {
      const payload = {
        classroom_subject_id: row.classroomSubjId,
        teacher_id: user!.id,
        weight_taller: row.weight_taller,
        weight_trabajo: row.weight_trabajo,
        weight_quiz: row.weight_quiz,
        weight_participacion: row.bonus,
        weight_examen_final: row.weight_examen_final,
        max_score: row.max_score,
      };

      if (row.configId) {
        await supabaseRef.current.from("subject_grading_config").update(payload).eq("id", row.configId);
      } else {
        const { data } = await supabaseRef.current.from("subject_grading_config").upsert(payload, { onConflict: "classroom_subject_id,teacher_id" }).select("id").single();
        if (data) setRows(prev => prev.map(r => r.classroomSubjId === row.classroomSubjId ? { ...r, configId: data.id, dirty: false } : r));
      }
      setRows(prev => prev.map(r => r.classroomSubjId === row.classroomSubjId ? { ...r, dirty: false } : r));
      toast.success(`Pesos guardados: ${row.classroomName} - ${row.subjectName}`);
    } catch (e: any) { console.error(e); toast.error(e?.message || "Error al guardar"); }
    finally { setSavingId(null); }
  };

  if (loading) return <div className="space-y-6"><ShimmerTable rows={5} cols={7} /></div>;
  if (rows.length === 0) return <EmptyState title="Sin asignaciones" description="No tienes materias asignadas todavía" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">Configuración de Evaluación</h1>
        <p className="text-sm text-slate-500 mt-2">Define los pesos y tope por materia. Los cambios se guardan individualmente.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Salón</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Materia</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Tope</th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Taller %</th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Trabajo %</th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Quiz %</th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ex. Final %</th>
                <th className="text-center px-2 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">⭐ Bonus</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Total</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Guardar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => {
                const tw = totalWeight(row);
                const isValid = tw === 100;
                return (
                  <tr key={row.classroomSubjId} className={cn("hover:bg-slate-50/50 transition", row.dirty && "bg-amber-50/30")}>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{row.classroomName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{row.subjectName}</td>
                    <td className="px-3 py-3">
                      <select value={row.max_score} onChange={(e) => updateRow(row.classroomSubjId, "max_score", parseInt(e.target.value))}
                        className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center font-medium text-slate-700 bg-white focus:ring-2 focus:ring-primary-500 outline-none">
                        {MAX_SCORE_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    {WEIGHT_KEYS.map(k => (
                      <td key={k} className="px-2 py-3">
                        <input type="number" min={0} max={100} value={row[k] || ""}
                          onChange={(e) => updateRow(row.classroomSubjId, k, parseFloat(e.target.value) || 0)}
                          className="w-14 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center font-medium text-slate-700 focus:ring-2 focus:ring-primary-500 outline-none" />
                      </td>
                    ))}
                    <td className="px-2 py-3">
                      <input type="number" min={0} max={row.max_score} value={row.bonus || ""}
                        onChange={(e) => updateRow(row.classroomSubjId, "bonus", parseFloat(e.target.value) || 0)}
                        className="w-14 px-2 py-1.5 border border-amber-200 bg-amber-50 rounded-lg text-xs text-center font-medium text-amber-700 focus:ring-2 focus:ring-amber-500 outline-none" />
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn("text-xs font-bold", isValid ? "text-emerald-600" : tw > 100 ? "text-red-500" : "text-amber-500")}>
                        {tw}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleSave(row)} disabled={savingId === row.classroomSubjId || !isValid}
                        className={cn("inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                          row.dirty && isValid ? "bg-primary-500 text-white hover:bg-primary-600 shadow-sm" : "bg-slate-100 text-slate-400",
                          !isValid && "opacity-50 cursor-not-allowed")}>
                        {savingId === row.classroomSubjId ? (
                          <span className="flex items-center gap-1"><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></span>
                        ) : row.dirty ? <><Save className="w-3 h-3" /> Guardar</> : <><Check className="w-3 h-3" /> Listo</>}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
