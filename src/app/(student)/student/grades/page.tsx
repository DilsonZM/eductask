"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { cn } from "@/lib/utils";
import { BookOpen, Star, CheckCircle, Circle, ThumbsUp, ThumbsDown } from "lucide-react";

const CAT_ORDER = ["taller", "trabajo", "quiz", "participacion", "examen_final"];
const WEIGHT_CATS = ["taller", "trabajo", "quiz", "examen_final"] as const;
const CAT_LABELS: Record<string, string> = {
  taller: "Taller", trabajo: "Trabajo", quiz: "Quiz", participacion: "Participación", examen_final: "Examen Final",
};

interface GradingConfig { weights: Record<string, number>; maxScore: number; bonusPartic: number; }
interface CatData { avg: number | null; exempt: boolean; exemptScore: number | null; bonus: number | null; }

export default function GradesPage() {
  const { user, loading: authLoading } = useAuth();
  const supabaseRef = useRef(createClient());
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<{ id: string; name: string; classroomSubjectId: string }[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [configs, setConfigs] = useState<Record<string, GradingConfig>>({});
  const [categories, setCategories] = useState<Record<string, CatData>>({});
  const [weightedAvg, setWeightedAvg] = useState<number | null>(null);
  const [exemptData, setExemptData] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const supabase = supabaseRef.current;
      const { data: student } = await supabase.from("students").select("id, classroom_id").eq("user_id", user.id).single();
      if (!student?.classroom_id) { setLoading(false); return; }

      const { data: csRows } = await supabase.from("classroom_subjects")
        .select("id, subjects(id, name)").eq("classroom_id", student.classroom_id);

      const list = (csRows || []).filter((r: any) => r.subjects).map((r: any) => ({
        id: r.subjects.id,
        name: r.subjects.name,
        classroomSubjectId: r.id,
      }));
      setSubjects(list);
      if (list.length > 0) setSelectedSubject(list[0].classroomSubjectId);

      const allCsIds = list.map((s) => s.classroomSubjectId);
      const [{ data: configData }, { data: gradesData }, { data: exempts }] = await Promise.all([
        supabase.from("subject_grading_config").select("*").in("classroom_subject_id", allCsIds),
        supabase.from("grades").select("classroom_subject_id, school_period_id, score").eq("student_id", student.id),
        supabase.from("exemptions").select("*").eq("student_id", student.id).in("classroom_subject_id", allCsIds),
      ]);

      const cfgMap: Record<string, GradingConfig> = {};
      (configData || []).forEach((c: any) => {
        cfgMap[c.classroom_subject_id] = {
          weights: {
            taller: c.weight_taller || 0, trabajo: c.weight_trabajo || 0, quiz: c.weight_quiz || 0,
            examen_final: c.weight_examen_final || 0,
          },
          maxScore: c.max_score || 10,
          bonusPartic: c.weight_participacion || 0,
        };
      });
      setConfigs(cfgMap);
      setExemptData(exempts || []);

      const gradesMap = new Map<string, number[]>();
      (gradesData || []).forEach((g: any) => {
        const key = `${g.classroom_subject_id}`;
        if (!gradesMap.has(key)) gradesMap.set(key, []);
        gradesMap.get(key)!.push(g.score);
      });

      if (list.length > 0) {
        const csId = list[0].classroomSubjectId;
        const cfg = cfgMap[csId];
        const exs = (exempts || []).filter((e: any) => e.classroom_subject_id === csId);
        calculateCats(csId, cfg, gradesMap.get(csId) || [], exs);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  const calculateCats = useCallback((csId: string, cfg: GradingConfig | undefined, scores: number[], exs: any[]) => {
    if (!cfg) { setCategories({}); setWeightedAvg(null); return; }

    const cats: Record<string, CatData> = {};
    CAT_ORDER.forEach((cat) => {
      const ex = exs.find((e: any) => e.category === cat);
      if (cat === "participacion") {
        cats[cat] = { avg: null, exempt: !!ex, exemptScore: ex?.auto_score || null, bonus: ex ? ex.auto_score : 0 };
      } else {
        const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
        cats[cat] = { avg: ex ? null : avg, exempt: !!ex, exemptScore: ex?.auto_score || null, bonus: null };
      }
    });

    setCategories(cats);

    let wSum = 0, wCount = 0;
    WEIGHT_CATS.forEach((cat) => {
      const w = cfg.weights[cat] || 0;
      if (!w) return;
      const d = cats[cat];
      let val: number | null = null;
      if (d.exempt && d.exemptScore !== null) val = d.exemptScore;
      else if (d.avg !== null) val = d.avg;
      if (val !== null) { wSum += (val / cfg.maxScore) * w; wCount += w; }
    });
    let avg = wCount > 0 ? Math.round((wSum / wCount) * cfg.maxScore * 10) / 10 : null;

    const bonusCat = cats["participacion"];
    const bonus = bonusCat?.exempt ? (bonusCat.exemptScore || 0) : (bonusCat?.bonus || 0);
    if (avg !== null && bonus > 0) avg = Math.min(Math.round((avg + bonus) * 10) / 10, cfg.maxScore);

    setWeightedAvg(avg);
  }, []);

  const handleSubject = (csId: string) => {
    setSelectedSubject(csId);
    const cfg = configs[csId];
    const exs = exemptData.filter((e: any) => e.classroom_subject_id === csId);
    calculateCats(csId, cfg, [], exs);
  };

  const cfg = configs[selectedSubject];
  const subjectName = subjects.find((s) => s.classroomSubjectId === selectedSubject)?.name || "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">Mis Calificaciones</h1>
        <p className="text-sm text-slate-500 mt-2">Tu rendimiento académico por materia y categoría</p>
      </div>

      {loading || authLoading ? (<ShimmerTable rows={5} cols={4} />) : subjects.length === 0 ? (
        <EmptyState title="Sin materias" description="No tienes materias asignadas" icon={<BookOpen className="w-8 h-8" />} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500 mr-1">Materia:</span>
            {subjects.map((s) => (
              <button key={s.classroomSubjectId} onClick={() => handleSubject(s.classroomSubjectId)}
                className={cn("px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  selectedSubject === s.classroomSubjectId ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                {s.name}
              </button>
            ))}
          </div>

          {cfg ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Categoría</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Peso</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Nota</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {CAT_ORDER.map((cat) => {
                      const d = categories[cat];
                      if (!d) return null;
                      const isParticipacion = cat === "participacion";
                      const w = isParticipacion ? 0 : (cfg.weights[cat] || 0);
                      return (
                        <tr key={cat}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-800">
                            {CAT_LABELS[cat]}
                            {isParticipacion && <span className="text-xs text-amber-500 ml-1">⭐ bonus</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-slate-500">
                            {isParticipacion ? "—" : `${w}%`}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {d.exempt ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <Star className="w-3.5 h-3.5" /> {d.exemptScore} / {cfg.maxScore}
                              </span>
                            ) : isParticipacion ? (
                              <span className="text-sm text-slate-400">+{cfg.bonusPartic} pts</span>
                            ) : d.avg !== null ? (
                              <span className={cn("inline-block rounded-lg px-2.5 py-1 text-sm font-semibold border",
                                d.avg >= 7 || cfg.maxScore > 10 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                d.avg >= 5 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200")}>
                                {d.avg} / {cfg.maxScore}
                              </span>
                            ) : (
                              <span className="text-sm text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {d.exempt ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600"><Star className="w-3 h-3" /> Exonerado</span>
                            ) : isParticipacion ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600">⚡ Comodín</span>
                            ) : d.avg !== null ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle className="w-3 h-3" /> Calificado</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400"><Circle className="w-3 h-3" /> Pendiente</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {weightedAvg !== null && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-50">
                        <td className="px-4 py-3 text-sm font-bold text-slate-700" colSpan={2}>Promedio Final</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-bold bg-primary-50 text-primary-700 border border-primary-200">
                            {weightedAvg} / {cfg.maxScore}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden">
                            <div className={cn("h-full rounded-full",
                              (weightedAvg / cfg.maxScore) >= 0.7 ? "bg-emerald-500" : "bg-amber-500")}
                              style={{ width: `${Math.min((weightedAvg / cfg.maxScore) * 100, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-400">{Math.round((weightedAvg / cfg.maxScore) * 100)}%</span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                  {weightedAvg !== null && (
                    <tfoot>
                      <tr className="border-t border-slate-100 bg-white">
                        <td colSpan={4} className="px-4 py-3 text-center">
                          <span className={cn("inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold",
                            (weightedAvg / cfg.maxScore) >= 0.6
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700")}>
                            {(weightedAvg / cfg.maxScore) >= 0.6 ? (
                              <><ThumbsUp className="w-4 h-4" /> Aprobado (mín 60%)</>
                            ) : (
                              <><ThumbsDown className="w-4 h-4" /> Reprobado — necesitas {Math.round(cfg.maxScore * 0.6)} / {cfg.maxScore} (60%)</>
                            )}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 text-center">
              <p className="text-sm text-slate-400">El profesor aún no ha configurado la evaluación para esta materia</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
