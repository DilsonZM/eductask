"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerGrid } from "@/components/common/SkeletonLoader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import {
  ReportCardPDFContent,
  downloadReportCardPDF,
  type ReportCardPDFData,
  type GradeItem,
} from "@/components/common/ReportCardPDF";
import toast from "react-hot-toast";
import { FileDown, Eye, FileText } from "lucide-react";

interface ReportCard {
  id: string;
  student_id: string | null;
  school_period_id: string | null;
  classroom_id: string | null;
  average: number | null;
  rank: number | null;
  attendance: number | null;
  observations: string | null;
  status: string;
  generated_at: string | null;
  period_name: string;
}

interface StudentRecord {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  classroom_id: string | null;
}

interface GradeRecord {
  student_id: string | null;
  classroom_subject_id: string | null;
  score: number;
  comments: string | null;
}

type CSRow = {
  id: string;
  subject_id: string | null;
  subjects: { id: string; name: string } | null;
};

export default function ReportCardsPage() {
  const { user, loading: authLoading } = useAuth();
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [previewData, setPreviewData] = useState<ReportCardPDFData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  const fetchReportCards = useCallback(async (studentId: string) => {
    try {
      const [{ data: cards }, { data: periods }] = await Promise.all([
        supabaseRef.current
          .from("report_cards")
          .select("*")
          .eq("student_id", studentId)
          .eq("status", "published")
          .order("generated_at", { ascending: false }),
        supabaseRef.current.from("school_periods").select("id, name, academic_year_id"),
      ]);

      const periodMap: Record<string, string> = {};
      if (periods) {
        for (const p of periods) {
          periodMap[p.id] = p.name;
        }
      }

      if (cards) {
        setReportCards(
          cards.map((rc) => ({
            ...rc,
            period_name: periodMap[rc.school_period_id || ""] || "",
          })) as ReportCard[]
        );
      }
    } catch (error) {
      console.error("Error fetching report cards:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      return;
    }

    const init = async () => {
      const { data: studentData } = await supabaseRef.current
        .from("students")
        .select("id, user_id, first_name, last_name, classroom_id")
        .eq("user_id", user.id)
        .single();

      if (studentData) {
        setStudent(studentData);
        await fetchReportCards(studentData.id);
      } else {
        setLoading(false);
      }
    };

    init();
  }, [user, authLoading, fetchReportCards]);

  const handlePreview = useCallback(
    async (rc: ReportCard) => {
      if (!student || !rc.classroom_id || !rc.school_period_id) {
        toast.error("Datos incompletos del boletín");
        return;
      }

      try {
        const [
          { data: classroom },
          { data: period },
          { data: classroomSubjectsRaw },
        ] = await Promise.all([
          supabaseRef.current
            .from("classrooms")
            .select("id, name, grade_level")
            .eq("id", rc.classroom_id)
            .single(),
          supabaseRef.current
            .from("school_periods")
            .select("id, name, academic_year_id")
            .eq("id", rc.school_period_id)
            .single(),
          supabaseRef.current
            .from("classroom_subjects")
            .select("id, subject_id, subjects(id, name)")
            .eq("classroom_id", rc.classroom_id),
        ]);

        if (!classroom || !period) {
          toast.error("No se encontró información del salón o período");
          return;
        }

        const classroomSubjects = (classroomSubjectsRaw || []) as unknown as CSRow[];

        const csIds = classroomSubjects.map((cs) => cs.id);
        const subjectMap: Record<string, string> = {};
        const csToSubject: Record<string, string> = {};
        const subjectOrder: string[] = [];

        for (const cs of classroomSubjects) {
          if (cs.subjects) {
            subjectMap[cs.subjects.id] = cs.subjects.name;
            csToSubject[cs.id] = cs.subjects.id;
            if (!subjectOrder.includes(cs.subjects.id)) {
              subjectOrder.push(cs.subjects.id);
            }
          }
        }

        const { data: grades } = await supabaseRef.current
          .from("grades")
          .select("student_id, classroom_subject_id, score, comments")
          .eq("student_id", rc.student_id || "")
          .eq("school_period_id", rc.school_period_id)
          .in("classroom_subject_id", csIds.length > 0 ? csIds : ["none"]);

        const gradesBySubject: Record<string, { scores: number[]; comments: string[] }> = {};
        for (const sid of subjectOrder) {
          gradesBySubject[sid] = { scores: [], comments: [] };
        }

        for (const g of (grades || []) as GradeRecord[]) {
          if (!g.classroom_subject_id) continue;
          const subjectId = csToSubject[g.classroom_subject_id];
          if (!subjectId) continue;
          if (!gradesBySubject[subjectId]) {
            gradesBySubject[subjectId] = { scores: [], comments: [] };
          }
          gradesBySubject[subjectId].scores.push(g.score);
          if (g.comments) gradesBySubject[subjectId].comments.push(g.comments);
        }

        const gradeItems: GradeItem[] = subjectOrder.map((sid) => {
          const entry = gradesBySubject[sid];
          if (entry && entry.scores.length > 0) {
            const avg = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
            return {
              subject: subjectMap[sid] || "Desconocido",
              score: Math.round(avg * 10) / 10,
              comments: entry.comments.filter(Boolean).slice(-1)[0] || null,
            };
          }
          return {
            subject: subjectMap[sid] || "Desconocido",
            score: null,
            comments: null,
          };
        });

        let academicYear = new Date().getFullYear();
        if (period.academic_year_id) {
          const { data: ay } = await supabaseRef.current
            .from("academic_years")
            .select("year")
            .eq("id", period.academic_year_id)
            .single();
          if (ay) academicYear = ay.year;
        }

        const pdfData: ReportCardPDFData = {
          studentName: `${student.first_name} ${student.last_name}`,
          classroomName: classroom.name,
          gradeLevel: classroom.grade_level,
          periodName: period.name,
          academicYear,
          grades: gradeItems,
          average: rc.average,
          rank: rc.rank,
          attendance: rc.attendance,
          generatedAt: rc.generated_at ? formatDate(rc.generated_at) : formatDate(new Date()),
        };

        setPreviewData(pdfData);
        setPreviewOpen(true);
      } catch (error) {
        console.error("Error loading preview:", error);
        toast.error("Error al cargar vista previa");
      }
    },
    [student]
  );

  const handleDownloadPDF = useCallback(
    async (rc: ReportCard) => {
      if (!student || !rc.classroom_id || !rc.school_period_id) {
        toast.error("Datos incompletos del boletín");
        return;
      }

      setDownloadingId(rc.id);

      try {
        const [
          { data: classroom },
          { data: period },
          { data: classroomSubjectsRaw },
        ] = await Promise.all([
          supabaseRef.current
            .from("classrooms")
            .select("id, name, grade_level")
            .eq("id", rc.classroom_id)
            .single(),
          supabaseRef.current
            .from("school_periods")
            .select("id, name, academic_year_id")
            .eq("id", rc.school_period_id)
            .single(),
          supabaseRef.current
            .from("classroom_subjects")
            .select("id, subject_id, subjects(id, name)")
            .eq("classroom_id", rc.classroom_id),
        ]);

        if (!classroom || !period) {
          toast.error("No se encontró información del salón o período");
          setDownloadingId(null);
          return;
        }

        const classroomSubjects = (classroomSubjectsRaw || []) as unknown as CSRow[];

        const csIds = classroomSubjects.map((cs) => cs.id);
        const subjectMap: Record<string, string> = {};
        const csToSubject: Record<string, string> = {};
        const subjectOrder: string[] = [];

        for (const cs of classroomSubjects) {
          if (cs.subjects) {
            subjectMap[cs.subjects.id] = cs.subjects.name;
            csToSubject[cs.id] = cs.subjects.id;
            if (!subjectOrder.includes(cs.subjects.id)) {
              subjectOrder.push(cs.subjects.id);
            }
          }
        }

        const query = supabaseRef.current
          .from("grades")
          .select("student_id, classroom_subject_id, score, comments")
          .eq("student_id", rc.student_id || "")
          .eq("school_period_id", rc.school_period_id);

        if (csIds.length > 0) {
          query.in("classroom_subject_id", csIds);
        } else {
          query.in("classroom_subject_id", ["none"]);
        }

        const { data: grades } = await query;

        const gradesBySubject: Record<string, { scores: number[]; comments: string[] }> = {};
        for (const sid of subjectOrder) {
          gradesBySubject[sid] = { scores: [], comments: [] };
        }

        for (const g of (grades || []) as GradeRecord[]) {
          if (!g.classroom_subject_id) continue;
          const subjectId = csToSubject[g.classroom_subject_id];
          if (!subjectId) continue;
          if (!gradesBySubject[subjectId]) {
            gradesBySubject[subjectId] = { scores: [], comments: [] };
          }
          gradesBySubject[subjectId].scores.push(g.score);
          if (g.comments) gradesBySubject[subjectId].comments.push(g.comments);
        }

        const gradeItems: GradeItem[] = subjectOrder.map((sid) => {
          const entry = gradesBySubject[sid];
          if (entry && entry.scores.length > 0) {
            const avg = entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length;
            return {
              subject: subjectMap[sid] || "Desconocido",
              score: Math.round(avg * 10) / 10,
              comments: entry.comments.filter(Boolean).slice(-1)[0] || null,
            };
          }
          return {
            subject: subjectMap[sid] || "Desconocido",
            score: null,
            comments: null,
          };
        });

        let academicYear = new Date().getFullYear();
        if (period.academic_year_id) {
          const { data: ay } = await supabaseRef.current
            .from("academic_years")
            .select("year")
            .eq("id", period.academic_year_id)
            .single();
          if (ay) academicYear = ay.year;
        }

        const pdfData: ReportCardPDFData = {
          studentName: `${student.first_name} ${student.last_name}`,
          classroomName: classroom.name,
          gradeLevel: classroom.grade_level,
          periodName: period.name,
          academicYear,
          grades: gradeItems,
          average: rc.average,
          rank: rc.rank,
          attendance: rc.attendance,
          generatedAt: rc.generated_at ? formatDate(rc.generated_at) : formatDate(new Date()),
        };

        const filename = `boletin-${student.first_name}-${student.last_name}-${period.name}`
          .replace(/\s+/g, "-")
          .toLowerCase();

        await downloadReportCardPDF(pdfData, filename);
      } catch (error) {
        console.error("Error downloading PDF:", error);
        toast.error("Error al descargar PDF");
      } finally {
        setDownloadingId(null);
      }
    },
    [student]
  );

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Boletines" description="Tus boletines escolares" />
        <ShimmerGrid count={3} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Boletines" description="Tus boletines escolares" />
        <EmptyState title="No autenticado" description="Inicia sesión para ver tus boletines" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="space-y-6">
        <PageHeader title="Boletines" description="Tus boletines escolares" />
        <EmptyState title="Perfil no encontrado" description="No se encontró tu perfil de estudiante" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Boletines" description="Tus boletines escolares" />

      {reportCards.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="No hay boletines"
          description="Los boletines aparecerán cuando sean publicados por la administración"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCards.map((rc) => (
            <div
              key={rc.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 font-serif text-lg">{rc.period_name}</h3>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold">
                  Publicado
                </span>
              </div>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Promedio</span>
                  <span className="text-2xl font-semibold text-slate-900">
                    {rc.average != null ? rc.average.toFixed(1) : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Ranking</span>
                  <span className="font-medium text-slate-900">
                    {rc.rank != null ? `#${rc.rank}` : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Asistencia</span>
                  <span className="font-medium text-slate-900">
                    {rc.attendance != null ? `${rc.attendance}%` : "N/A"}
                  </span>
                </div>
                {rc.observations && (
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-sm text-slate-500">Observaciones:</p>
                    <p className="text-sm text-slate-700">{rc.observations}</p>
                  </div>
                )}
                {rc.generated_at && (
                  <p className="text-xs text-slate-400 pt-2">
                    Generado: {formatDate(rc.generated_at)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-200">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handlePreview(rc)}
                >
                  <Eye className="w-4 h-4" />
                  Vista previa
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  onClick={() => handleDownloadPDF(rc)}
                  isLoading={downloadingId === rc.id}
                >
                  <FileDown className="w-4 h-4" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Vista Previa del Boletín"
        size="lg"
      >
        {previewData && (
          <div className="max-h-[70vh] overflow-y-auto">
            <ReportCardPDFContent data={previewData} />
          </div>
        )}
      </Modal>
    </div>
  );
}
