"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { ArrowLeft, Star, CheckCircle, AlertTriangle, FileText, Download, Edit3, Trash2 } from "lucide-react";
import Link from "next/link";

interface TaskRow { id: string; title: string; category: string; dueDate: string; score: number | null; }
interface ExemptionRow { id: string; category: string; auto_score: number; reason: string | null; school_period_id: string | null; }
interface CategoryData { tasks: TaskRow[]; exemption: ExemptionRow | null; avg: number | null; }
interface SubFile { id: string; file_name: string; file_path: string; }
interface SubHistory { id: string; taskTitle: string; category: string; files: SubFile[]; submittedAt: string | null; comments: string | null; score: number | null; dueDate: string; }

const CATEGORY_LABELS: Record<string, string> = {
  taller: "Taller", trabajo: "Trabajo", quiz: "Quiz", participacion: "Participación", examen_final: "Examen Final",
};
const CAT_ORDER = ["taller", "trabajo", "quiz", "participacion", "examen_final"];
const WEIGHT_CATS = ["taller", "trabajo", "quiz", "examen_final"] as const;

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const sp = useSearchParams();
  const studentId = params.id;
  const csId = sp.get("classroomSubjectId") || "";
  const studentName = sp.get("studentName") || "Estudiante";
  const subjectName = sp.get("subjectName") || "";
  const classroomName = sp.get("classroomName") || "";

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<{ weights: Record<string, number>; maxScore: number; bonusPartic: number } | null>(null);
  const [categories, setCategories] = useState<Record<string, CategoryData>>({});
  const [exemptions, setExemptions] = useState<ExemptionRow[]>([]);
  const [weightedAvg, setWeightedAvg] = useState<number | null>(null);
  const [subsHistory, setSubsHistory] = useState<SubHistory[]>([]);
  const [studentUserId, setStudentUserId] = useState<string>("");
  const [studentAvatar, setStudentAvatar] = useState<string | null>(null);

  const [exemptModal, setExemptModal] = useState(false);
  const [exemptCategory, setExemptCategory] = useState("");
  const [exemptScore, setExemptScore] = useState(0);
  const [exemptReason, setExemptReason] = useState("");
  const [exemptPeriod, setExemptPeriod] = useState("");
  const [editingExemptId, setEditingExemptId] = useState<string | null>(null);
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([]);
  const [savingExempt, setSavingExempt] = useState(false);
  const [editingScore, setEditingScore] = useState<{ submissionId: string; value: string } | null>(null);
  const [savingScore, setSavingScore] = useState(false);
  const [deleteExemptId, setDeleteExemptId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!csId) return;
    setLoading(true);
    try {
      const { data: stu } = await supabaseRef.current.from("students")
        .select("user_id").eq("id", studentId).maybeSingle();
      setStudentUserId(stu?.user_id || "");

      if (stu?.user_id) {
        const { data: userData } = await supabaseRef.current.from("users")
          .select("avatar").eq("id", stu.user_id).maybeSingle();
        setStudentAvatar(userData?.avatar || null);
      } else {
        setStudentAvatar(null);
      }

      const { data: configData } = await supabaseRef.current.from("subject_grading_config")
        .select("*").eq("classroom_subject_id", csId).order("created_at", { ascending: false }).limit(1).single();

      const weights: Record<string, number> = {
        taller: (configData as any)?.weight_taller || 0,
        trabajo: (configData as any)?.weight_trabajo || 0,
        quiz: (configData as any)?.weight_quiz || 0,
        examen_final: (configData as any)?.weight_examen_final || 0,
      };
      const bonusPartic = (configData as any)?.weight_participacion || 0;
      const maxScore = (configData as any)?.max_score || 10;
      setConfig({ weights, maxScore, bonusPartic });

      const { data: tasks } = await supabaseRef.current.from("tasks")
        .select("id, title, category, due_date").eq("classroom_subject_id", csId).in("status", ["published", "closed"]);

      const taskIds = (tasks || []).map((t) => t.id);
      const { data: subs } = taskIds.length > 0 ? await supabaseRef.current.from("submissions")
        .select("id, task_id, student_id, score, submitted_at, comments, submission_files(*)").eq("student_id", studentId).in("task_id", taskIds) : { data: [] };

      const { data: exemptData } = stu?.user_id
        ? await supabaseRef.current.from("exemptions")
            .select("*").eq("student_id", stu.user_id).eq("classroom_subject_id", csId)
        : { data: [] };
      setExemptions((exemptData || []) as ExemptionRow[]);

      const { data: periodData } = await supabaseRef.current.from("school_periods")
        .select("id, name").order("order");
      setPeriods(periodData || []);

      const cats: Record<string, CategoryData> = {};
      const exemptMap = new Map<string, ExemptionRow>();
      (exemptData || []).forEach((e) => exemptMap.set(e.category, e as ExemptionRow));

      CAT_ORDER.forEach((cat) => {
        const catTasks = (tasks || []).filter((t) => t.category === cat);
        const catSubs = (subs || []).filter((s) => catTasks.some((t) => t.id === s.task_id));
        const taskRows: TaskRow[] = catTasks.map((t) => {
          const sub = catSubs.find((s) => s.task_id === t.id);
          return { id: t.id, title: t.title, category: t.category, dueDate: t.due_date, score: sub?.score ?? null };
        });
        const scores = taskRows.filter((t) => t.score !== null).map((t) => t.score as number);
        cats[cat] = { tasks: taskRows, exemption: exemptMap.get(cat) || null, avg: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null };
      });

      setCategories(cats);

      const history: SubHistory[] = [];
      const taskMap = new Map((tasks || []).map((t) => [t.id, t]));
      (subs || []).forEach((s) => {
        const t = taskMap.get(s.task_id);
        history.push({
          id: s.id,
          taskTitle: t?.title || "Tarea",
          category: t?.category || "",
          files: ((s as Record<string, unknown>).submission_files as SubFile[]) || [],
          submittedAt: s.submitted_at, comments: s.comments || null,
          score: s.score, dueDate: t?.due_date || "",
        });
      });
      setSubsHistory(history);

      let wSum = 0, wCount = 0;
      WEIGHT_CATS.forEach((cat) => {
        const w = weights[cat];
        if (!w) return;
        const d = cats[cat];
        const ex = exemptMap.get(cat);
        if (ex) { wSum += (ex.auto_score / maxScore) * w; wCount += w; }
        else if (d.avg !== null) { wSum += (d.avg / maxScore) * w; wCount += w; }
      });
      let avg = wCount > 0 ? Math.round((wSum / wCount) * maxScore * 10) / 10 : null;
      if (avg !== null && bonusPartic > 0) {
        const particCat = cats["participacion"];
        const bonus = particCat?.exemption ? (particCat.exemption.auto_score || 0) : (bonusPartic || 0);
        avg = Math.min(Math.round((avg + bonus) * 10) / 10, maxScore);
      }
      setWeightedAvg(avg);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [csId, studentId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExempt = async () => {
    if (!exemptCategory || !exemptPeriod) {
      toast.error("Selecciona categoría y período");
      return;
    }
    setSavingExempt(true);
    try {
      const { error } = await supabaseRef.current.from("exemptions").upsert({
        student_id: studentUserId,
        classroom_subject_id: csId,
        school_period_id: exemptPeriod,
        category: exemptCategory,
        auto_score: exemptScore,
        reason: exemptReason || null,
        granted_by: user?.id,
      }, { onConflict: "student_id,classroom_subject_id,school_period_id,category" });
      if (error) throw error;
      toast.success(editingExemptId ? "Exoneración actualizada" : "Exoneración registrada");
      setExemptModal(false);
      setEditingExemptId(null);
      loadData();
    } catch (e: any) {
      toast.error(e?.message || "Error");
    } finally {
      setSavingExempt(false);
    }
  };

  const openEditExempt = (ex: ExemptionRow) => {
    setEditingExemptId(ex.id);
    setExemptCategory(ex.category);
    setExemptScore(ex.auto_score);
    setExemptReason(ex.reason || "");
    setExemptPeriod(ex.school_period_id || "");
    setExemptModal(true);
  };

  const closeExemptModal = () => {
    setExemptModal(false);
    setEditingExemptId(null);
  };

  const handleSaveScore = async (submissionId: string) => {
    if (!editingScore) return;
    const val = parseFloat(editingScore.value);
    if (isNaN(val) || val < 0 || val > (config?.maxScore || 10)) { toast.error(`Nota inválida (0-${config?.maxScore || 10})`); return; }
    setSavingScore(true);
    try {
      await supabaseRef.current.from("submissions").update({ score: val }).eq("id", submissionId);
      toast.success("Nota guardada"); setEditingScore(null); loadData();
    } catch (e) { toast.error("Error"); }
    finally { setSavingScore(false); }
  };

  const handleDeleteExempt = async () => {
    if (!deleteExemptId) return;
    try {
      await supabaseRef.current.from("exemptions").delete().eq("id", deleteExemptId);
      toast.success("Exoneración removida"); setDeleteExemptId(null); loadData();
    } catch (e) { toast.error("Error"); }
  };

  const getDownloadUrl = (path: string) =>
    supabaseRef.current.storage.from("edutask-submissions").getPublicUrl(path).data.publicUrl;

  return (
    <div className="space-y-6">
      <Link href="/teacher/students" className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Volver a Mis Estudiantes
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-semibold text-lg overflow-hidden shrink-0">
          {studentAvatar ? (
            <img src={studentAvatar} alt={studentName} className="w-full h-full object-cover" />
          ) : (
            studentName.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">{studentName}</h1>
          <p className="text-sm text-slate-500">{classroomName} — {subjectName}</p>
        </div>
      </div>

      {loading ? (<div className="text-center py-8 text-slate-400">Cargando...</div>) : (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-6">
            <div className="w-16 h-16 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xl font-bold">
              {studentName.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{studentName}</h3>
              <div className="flex items-center gap-4 mt-2">
                {weightedAvg !== null ? (
                  <div>
                    <span className="text-2xl font-bold text-slate-900">{weightedAvg}</span>
                    <span className="text-sm text-slate-400"> / {config?.maxScore || 10}</span>
                    <div className="w-32 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div className={cn("h-full rounded-full", (weightedAvg / (config?.maxScore || 10)) >= 0.7 ? "bg-emerald-500" : "bg-amber-500")}
                        style={{ width: `${Math.min((weightedAvg / (config?.maxScore || 10)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">Sin promedio calculado</span>
                )}
                <Button onClick={() => { setEditingExemptId(null); setExemptModal(true); setExemptCategory(""); setExemptScore(config?.maxScore || 10); setExemptReason(""); setExemptPeriod(""); }}
                  variant="outline"><Star className="w-4 h-4" /> Exonerar categoría</Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
              <h3 className="font-semibold text-slate-900">Notas por categoría</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Categoría</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Actividad</th>
                    <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Nota</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CAT_ORDER.map((cat) => {
                    const d = categories[cat];
                    if (!d) return null;
                    const w = config?.weights[cat] || 0;
                    const ex = d.exemption;

                    return (
                      <Fragment key={cat}>
                        {d.tasks.length === 0 && !ex ? (
                          <tr>
                            <td className="px-4 py-3 text-sm text-slate-500">
                              <span className="font-medium">{CATEGORY_LABELS[cat]}</span>
                              <span className="text-xs ml-1">({w}%)</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400" colSpan={3}>Sin actividades registradas</td>
                          </tr>
                        ) : null}
                        {ex && (
                          <tr className="bg-purple-50/30">
                            <td className="px-4 py-3 text-sm font-medium text-purple-700">
                              {CATEGORY_LABELS[cat]} <span className="text-xs">({w}%)</span>
                            </td>
                            <td className="px-4 py-3"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700"><Star className="w-3 h-3" /> EXONERADO</span></td>
                            <td className="px-4 py-3 text-center text-sm font-bold text-purple-700">{ex.auto_score}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => openEditExempt(ex)} className="text-xs text-slate-400 hover:text-primary-600 mr-2"><Edit3 className="w-3.5 h-3.5 inline" /> Editar</button>
                              <button onClick={() => setDeleteExemptId(ex.id)} className="text-xs text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5 inline" /> Quitar</button>
                            </td>
                          </tr>
                        )}
                        {d.tasks.map((t) => (
                          <tr key={t.id}>
                            <td className="px-4 py-3 text-sm text-slate-500">{!ex && <span className="font-medium">{CATEGORY_LABELS[cat]}</span>}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{t.title}</td>
                            <td className="px-4 py-3 text-center">
                              {editingScore && editingScore.submissionId === t.id ? (
                                <div className="flex items-center justify-center gap-1">
                                  <input type="number" value={editingScore.value} onChange={(e) => setEditingScore({ ...editingScore, value: e.target.value })}
                                    className="w-16 px-2 py-1 border border-primary-400 rounded text-center text-sm" />
                                  <button onClick={() => handleSaveScore(t.id)} disabled={savingScore} className="text-xs text-emerald-600 font-medium">Guardar</button>
                                </div>
                              ) : t.score !== null ? (
                                <span className={cn("inline-block rounded-lg px-2.5 py-1 text-xs font-semibold border",
                                  t.score >= 3.5 || (config?.maxScore || 10) > 10 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : t.score >= 2.5 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200")}>{t.score}</span>
                              ) : (
                                <button onClick={() => setEditingScore({ submissionId: t.id, value: "" })} className="text-xs text-primary-600 hover:text-primary-800">Calificar</button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">{/* placeholder for actions */}</td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {subsHistory.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80">
                <h3 className="font-semibold text-slate-900">Historial de entregas</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Tarea</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Categoría</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Entrega</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Archivo</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subsHistory.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-sm text-slate-800">{h.taskTitle}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{CATEGORY_LABELS[h.category] || h.category}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {h.submittedAt ? (
                            <span className={cn(
                              new Date(h.submittedAt) > new Date(h.dueDate) ? "text-red-600" : "text-emerald-600"
                            )}>
                              {new Date(h.submittedAt).toLocaleDateString("es-ES")}
                              {new Date(h.submittedAt) > new Date(h.dueDate) ? " (Tarde)" : " (A tiempo)"}
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {h.files.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {h.files.map((f) => (
                                <a key={f.id} href={supabaseRef.current.storage.from("edutask-submissions").getPublicUrl(f.file_path).data.publicUrl}
                                  target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> {f.file_name}
                                </a>
                              ))}
                            </div>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center text-sm font-medium">
                          {h.score !== null ? (
                            <span className={cn("rounded-lg px-2 py-0.5 text-xs font-semibold border",
                              h.score >= 3.5 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>{h.score}</span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={exemptModal} onClose={closeExemptModal} title={editingExemptId ? `Editar exoneración — ${studentName}` : `Exonerar categoría — ${studentName}`}
        footer={<><Button variant="outline" onClick={closeExemptModal}>Cancelar</Button><Button onClick={handleExempt} isLoading={savingExempt} disabled={!exemptCategory || !exemptPeriod}><Star className="w-4 h-4" /> {editingExemptId ? "Guardar cambios" : "Confirmar exoneración"}</Button></>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CAT_ORDER.filter((c) => editingExemptId ? c === exemptCategory || !categories[c]?.exemption : !categories[c]?.exemption).map((c) => (
                <button key={c} onClick={() => setExemptCategory(exemptCategory === c ? "" : c)}
                  className={cn("px-3 py-1.5 rounded-lg text-sm", exemptCategory === c ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{CATEGORY_LABELS[c]}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Período</label>
            <select value={exemptPeriod} onChange={(e) => setExemptPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
              <option value="">Seleccionar período...</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nota automática (máx {config?.maxScore || 10})</label>
            <input type="number" value={exemptScore || ""} onChange={(e) => setExemptScore(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
            <textarea value={exemptReason} onChange={(e) => setExemptReason(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Opcional..." />
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteExemptId} onClose={() => setDeleteExemptId(null)} title="Quitar exoneración"
        footer={<><Button variant="outline" onClick={() => setDeleteExemptId(null)}>Cancelar</Button><Button onClick={handleDeleteExempt} variant="danger">Quitar exoneración</Button></>}>
        <p className="text-sm text-slate-600">¿Quitar exoneración de {studentName}? Sus notas reales serán restauradas.</p>
      </Modal>
    </div>
  );
}
