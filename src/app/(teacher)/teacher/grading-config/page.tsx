"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { Sliders, CheckCircle, Trash2 } from "lucide-react";

const WEIGHT_CATS = [
  { key: "taller", label: "Taller" },
  { key: "trabajo", label: "Trabajo" },
  { key: "quiz", label: "Quiz" },
  { key: "examen_final", label: "Examen Final" },
] as const;

const MAX_SCORE_OPTIONS = [5, 10, 100];

interface SavedConfig {
  id: string;
  classroomName: string;
  subjectName: string;
  weight_taller: number;
  weight_trabajo: number;
  weight_quiz: number;
  weight_examen_final: number;
  bonus_participacion: number;
  max_score: number;
  classroom_subject_id: string;
}

interface FormConfig {
  weight_taller: number;
  weight_trabajo: number;
  weight_quiz: number;
  weight_examen_final: number;
  bonus_participacion: number;
  max_score: number;
}

export default function GradingConfigPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [classroomId, setClassroomId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [formConfig, setFormConfig] = useState<FormConfig>({
    weight_taller: 0, weight_trabajo: 0, weight_quiz: 0,
    weight_examen_final: 0, bonus_participacion: 0, max_score: 10,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [savedConfigs, setSavedConfigs] = useState<SavedConfig[]>([]);
  const [teacherId, setTeacherId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
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

      const { data: configs } = await supabaseRef.current.from("subject_grading_config")
        .select("id, classroom_subject_id, weight_taller, weight_trabajo, weight_quiz, weight_examen_final, weight_participacion, max_score, classroom_subjects!inner(classroom_id, subject_id, classrooms!inner(name), subjects!inner(name))")
        .eq("teacher_id", user.id);

      if (configs) {
        const mapped: SavedConfig[] = configs.map((r: any) => ({
          id: r.id,
          classroom_subject_id: r.classroom_subject_id,
          classroomName: r.classroom_subjects?.classrooms?.name || "",
          subjectName: r.classroom_subjects?.subjects?.name || "",
          weight_taller: r.weight_taller || 0,
          weight_trabajo: r.weight_trabajo || 0,
          weight_quiz: r.weight_quiz || 0,
          weight_examen_final: r.weight_examen_final || 0,
          bonus_participacion: r.weight_participacion || 0,
          max_score: r.max_score || 10,
        }));
        setSavedConfigs(mapped);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

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

  const handleClassroom = (cId: string) => {
    setClassroomId(cId); setSubjectId(""); setEditingId(null);
    if (cId) loadSubjects(cId);
  };

  const handleSubject = (sId: string) => {
    setSubjectId(sId);
    setEditingId(null);
    if (sId) {
      const existing = savedConfigs.find(c =>
        c.classroom_subject_id && subjects.find(s => s.id === sId) && classrooms.find(c2 => c2.id === classroomId)
      );
      const csMatch = savedConfigs.find(c =>
        c.classroomName === classrooms.find(c2 => c2.id === classroomId)?.name &&
        c.subjectName === subjects.find(s2 => s2.id === sId)?.name
      );
      if (csMatch) {
        setFormConfig({
          weight_taller: csMatch.weight_taller,
          weight_trabajo: csMatch.weight_trabajo,
          weight_quiz: csMatch.weight_quiz,
          weight_examen_final: csMatch.weight_examen_final,
          bonus_participacion: csMatch.bonus_participacion,
          max_score: csMatch.max_score,
        });
        setEditingId(csMatch.id);
      } else {
        setFormConfig({
          weight_taller: 0, weight_trabajo: 0, weight_quiz: 0,
          weight_examen_final: 0, bonus_participacion: 0, max_score: 10,
        });
      }
    }
  };

  const editConfig = (cfg: SavedConfig) => {
    const c = classrooms.find(c => c.name === cfg.classroomName);
    const s = subjects.find(s => s.name === cfg.subjectName);
    if (c) setClassroomId(c.id);
    if (s) setSubjectId(s.id);
    if (c) loadSubjects(c.id);
    setFormConfig({
      weight_taller: cfg.weight_taller,
      weight_trabajo: cfg.weight_trabajo,
      weight_quiz: cfg.weight_quiz,
      weight_examen_final: cfg.weight_examen_final,
      bonus_participacion: cfg.bonus_participacion,
      max_score: cfg.max_score,
    });
    setEditingId(cfg.id);
  };

  const totalWeight = useMemo(() =>
    formConfig.weight_taller + formConfig.weight_trabajo + formConfig.weight_quiz + formConfig.weight_examen_final,
    [formConfig]);
  const isValid = totalWeight === 100;

  const setWeight = (key: string, val: number) => {
    setFormConfig((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, val || 0)) }));
  };

  const handleSave = async () => {
    if (!isValid) { toast.error("Los pesos deben sumar 100%"); return; }
    if (!user || !classroomId || !subjectId) { toast.error("Seleccione salón y materia"); return; }
    setSaving(true);
    try {
      const { data: cs } = await supabaseRef.current.from("classroom_subjects").select("id")
        .eq("classroom_id", classroomId).eq("subject_id", subjectId).single();
      if (!cs) { toast.error("No existe la asignación salón-materia"); return; }

      const payload = {
        classroom_subject_id: cs.id,
        teacher_id: user.id,
        weight_taller: formConfig.weight_taller,
        weight_trabajo: formConfig.weight_trabajo,
        weight_quiz: formConfig.weight_quiz,
        weight_participacion: formConfig.bonus_participacion,
        weight_examen_final: formConfig.weight_examen_final,
        max_score: formConfig.max_score,
      };

      if (editingId) {
        await supabaseRef.current.from("subject_grading_config").update(payload).eq("id", editingId);
      } else {
        const { error } = await supabaseRef.current.from("subject_grading_config").upsert(payload, { onConflict: "classroom_subject_id,teacher_id" });
        if (error) throw error;
      }
      toast.success("Configuración guardada");
      await loadAll();
    } catch (e: any) { console.error(e); toast.error(e?.message || "Error al guardar"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta configuración?")) return;
    try {
      await supabaseRef.current.from("subject_grading_config").delete().eq("id", id);
      toast.success("Configuración eliminada");
      setSavedConfigs(prev => prev.filter(c => c.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setFormConfig({ weight_taller: 0, weight_trabajo: 0, weight_quiz: 0, weight_examen_final: 0, bonus_participacion: 0, max_score: 10 });
      }
    } catch { toast.error("Error al eliminar"); }
  };

  if (loading) return <div className="space-y-6"><ShimmerTable rows={5} cols={4} /></div>;
  if (classrooms.length === 0) return <EmptyState title="Sin asignaciones" description="No tienes salones asignados" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">Configuración de Evaluación</h1>
        <p className="text-sm text-slate-500 mt-2">Define los pesos y el tope de calificación por materia</p>
      </div>

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
      </div>

      {subjectId && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Tope de calificación</p>
            <div className="flex flex-wrap gap-2">
              {MAX_SCORE_OPTIONS.map((v) => (
                <button key={v} onClick={() => setFormConfig((prev) => ({ ...prev, max_score: v }))}
                  className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    formConfig.max_score === v ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{v}</button>
              ))}
            </div>
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
              {WEIGHT_CATS.map((cat) => {
                const key = `weight_${cat.key}` as keyof FormConfig;
                return (
                  <div key={cat.key} className="flex items-center gap-3">
                    <span className="w-32 text-sm text-slate-700">{cat.label}</span>
                    <input type="number" min={0} max={100} value={formConfig[key] || ""}
                      onChange={(e) => setWeight(key, parseFloat(e.target.value) || 0)}
                      className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-primary-500 outline-none" />
                    <span className="text-sm text-slate-400">%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-2">⭐ Participación (bonus manual)</p>
            <p className="text-xs text-amber-600 mb-3">Este valor se suma 1:1 al promedio final.</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-700">Bonus máx:</span>
              <input type="number" min={0} max={formConfig.max_score} value={formConfig.bonus_participacion || ""}
                onChange={(e) => setFormConfig((prev) => ({ ...prev, bonus_participacion: parseFloat(e.target.value) || 0 }))}
                className="w-20 px-3 py-1.5 border border-amber-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-amber-500 outline-none" />
              <span className="text-sm text-amber-600">/ {formConfig.max_score} pts</span>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
            <Button onClick={handleSave} isLoading={saving} disabled={!isValid}>
              <Sliders className="w-4 h-4" /> {editingId ? "Actualizar" : "Guardar configuración"}
            </Button>
            {isValid && <span className="text-sm text-emerald-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Pesos correctos</span>}
            {!isValid && totalWeight > 0 && <span className="text-sm text-red-500">Debe sumar exactamente 100%</span>}
          </div>
        </div>
      )}

      {savedConfigs.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configuraciones guardadas</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Salón</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Materia</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Tope</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Pesos</th>
                  <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Bonus</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {savedConfigs.map((cfg) => (
                  <tr key={cfg.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{cfg.classroomName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{cfg.subjectName}</td>
                    <td className="px-4 py-3 text-sm text-center font-semibold text-slate-800">{cfg.max_score}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <span>T:{cfg.weight_taller}%</span>
                      <span className="mx-1">·</span>
                      <span>TR:{cfg.weight_trabajo}%</span>
                      <span className="mx-1">·</span>
                      <span>Q:{cfg.weight_quiz}%</span>
                      <span className="mx-1">·</span>
                      <span>EF:{cfg.weight_examen_final}%</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-amber-600">{cfg.bonus_participacion}p</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => editConfig(cfg)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition">
                          <Sliders className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cfg.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
