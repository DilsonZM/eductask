"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerTable } from "@/components/common/SkeletonLoader";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatDate } from "@/lib/utils";
import { downloadReportCardPDF, type ReportCardPDFData, type GradeItem } from "@/components/common/ReportCardPDF";
import toast from "react-hot-toast";
import { FileDown, FileText } from "lucide-react";

interface Classroom {
  id: string;
  name: string;
  grade_level: string;
}

interface SchoolPeriod {
  id: string;
  name: string;
  academic_year_id: string | null;
}

interface SubjectInfo {
  id: string;
  name: string;
}

interface StudentPreview {
  id: string;
  studentId: string;
  studentName: string;
  grades: Record<string, number | null>;
  comments: Record<string, string | null>;
  subjectIds: string[];
  average: number;
  rank: number;
}

interface StudentRecord {
  id: string;
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

export default function AdminReportsPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [periods, setPeriods] = useState<SchoolPeriod[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [selectedClassroomData, setSelectedClassroomData] = useState<Classroom | null>(null);
  const [selectedPeriodData, setSelectedPeriodData] = useState<SchoolPeriod | null>(null);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [previewData, setPreviewData] = useState<StudentPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<number>(new Date().getFullYear());
  const [existingReportCards, setExistingReportCards] = useState<Set<string>>(new Set());
  const supabaseRef = useRef(createClient());

  const fetchInitialData = useCallback(async () => {
    try {
      const [classroomsRes, periodsRes] = await Promise.all([
        supabaseRef.current.from("classrooms").select("id, name, grade_level").eq("status", "active").order("name"),
        supabaseRef.current.from("school_periods").select("id, name, academic_year_id").eq("status", "active").order("order"),
      ]);

      if (classroomsRes.data) setClassrooms(classroomsRes.data);
      if (periodsRes.data) setPeriods(periodsRes.data);
    } catch (error) {
      console.error("Error fetching initial data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleCalculate = useCallback(async () => {
    if (!selectedClassroom || !selectedPeriod) {
      toast.error("Selecciona un salón y un período");
      return;
    }

    setCalculating(true);
    setPreviewData([]);

    try {
      const classroomData = classrooms.find((c) => c.id === selectedClassroom) || null;
      const periodData = periods.find((p) => p.id === selectedPeriod) || null;
      setSelectedClassroomData(classroomData);
      setSelectedPeriodData(periodData);

      const [{ data: students }, { data: classroomSubjectsRaw }, { data: existingCards }] =
        await Promise.all([
          supabaseRef.current
            .from("students")
            .select("id, first_name, last_name, classroom_id")
            .eq("classroom_id", selectedClassroom)
            .eq("status", "active")
            .order("last_name"),
          supabaseRef.current
            .from("classroom_subjects")
            .select("id, subject_id, subjects(id, name)")
            .eq("classroom_id", selectedClassroom),
          supabaseRef.current
            .from("report_cards")
            .select("student_id")
            .eq("school_period_id", selectedPeriod)
            .eq("classroom_id", selectedClassroom)
            .eq("status", "published"),
        ]);

      const classroomSubjects = (classroomSubjectsRaw || []) as unknown as CSRow[];

      const existingSet = new Set<string>(
        (existingCards || []).map((rc: { student_id: string | null }) => rc.student_id || "")
      );
      setExistingReportCards(existingSet);

      if (periodData) {
        const { data: ay } = await supabaseRef.current
          .from("academic_years")
          .select("year")
          .eq("id", periodData.academic_year_id || "")
          .single();
        if (ay) setAcademicYear(ay.year);
      }

      if (!students || students.length === 0) {
        toast("No hay estudiantes en este salón", { icon: "ℹ️" });
        setCalculating(false);
        return;
      }

      if (!classroomSubjects || classroomSubjects.length === 0) {
        toast("No hay materias asignadas a este salón", { icon: "ℹ️" });
        setCalculating(false);
        return;
      }

      const csIds = classroomSubjects.map((cs) => cs.id);
      const subjectMap: Record<string, SubjectInfo> = {};
      const csToSubject: Record<string, string> = {};
      for (const cs of classroomSubjects) {
        if (cs.subjects) {
          subjectMap[cs.subjects.id] = { id: cs.subjects.id, name: cs.subjects.name };
          csToSubject[cs.id] = cs.subjects.id;
        }
      }
      const subjectList = Object.values(subjectMap);
      setSubjects(subjectList);

      const { data: allGrades } = await supabaseRef.current
        .from("grades")
        .select("student_id, classroom_subject_id, score, comments")
        .eq("school_period_id", selectedPeriod)
        .in("classroom_subject_id", csIds)
        .in(
          "student_id",
          students.map((s: StudentRecord) => s.id)
        );

      const gradesByStudent: Record<string, Record<string, { scores: number[]; comments: string[] }>> = {};
      for (const s of students) {
        gradesByStudent[s.id] = {};
        for (const subj of subjectList) {
          gradesByStudent[s.id][subj.id] = { scores: [], comments: [] };
        }
      }

      for (const g of (allGrades || []) as GradeRecord[]) {
        if (!g.student_id || !g.classroom_subject_id) continue;
        const subjectId = csToSubject[g.classroom_subject_id];
        if (!subjectId) continue;
        const entry = gradesByStudent[g.student_id];
        if (!entry) continue;
        if (!entry[subjectId]) entry[subjectId] = { scores: [], comments: [] };
        entry[subjectId].scores.push(g.score);
        if (g.comments) entry[subjectId].comments.push(g.comments);
      }

      const preview: StudentPreview[] = students.map((s: StudentRecord) => {
        const studentGrades: Record<string, number | null> = {};
        const studentComments: Record<string, string | null> = {};
        let totalSubjectAvg = 0;
        let subjectsWithGrades = 0;

        for (const subj of subjectList) {
          const entry = gradesByStudent[s.id]?.[subj.id];
          if (entry && entry.scores.length > 0) {
            const avg = entry.scores.reduce((a: number, b: number) => a + b, 0) / entry.scores.length;
            studentGrades[subj.id] = Math.round(avg * 10) / 10;
            studentComments[subj.id] = entry.comments.filter(Boolean).slice(-1)[0] || null;
            totalSubjectAvg += avg;
            subjectsWithGrades++;
          } else {
            studentGrades[subj.id] = null;
            studentComments[subj.id] = null;
          }
        }

        const average = subjectsWithGrades > 0
          ? Math.round((totalSubjectAvg / subjectsWithGrades) * 10) / 10
          : 0;

        return {
          id: s.id,
          studentId: s.id,
          studentName: `${s.first_name} ${s.last_name}`,
          grades: studentGrades,
          comments: studentComments,
          subjectIds: subjectList.map((subj) => subj.id),
          average,
          rank: 0,
        };
      });

      preview.sort((a, b) => b.average - a.average);
      preview.forEach((p, i) => {
        p.rank = i + 1;
      });

      setPreviewData(preview);
    } catch (error) {
      console.error("Error calculating:", error);
      toast.error("Error al calcular calificaciones");
    } finally {
      setCalculating(false);
    }
  }, [selectedClassroom, selectedPeriod, classrooms, periods]);

  const handleGenerate = useCallback(async () => {
    if (previewData.length === 0) {
      toast.error("No hay datos para generar boletines");
      return;
    }

    setGenerating(true);

    try {
      const { error: deleteError } = await supabaseRef.current
        .from("report_cards")
        .delete()
        .eq("school_period_id", selectedPeriod)
        .eq("classroom_id", selectedClassroom);

      if (deleteError) {
        console.error("Error deleting existing report cards:", deleteError);
      }

      const insertData = previewData.map((p) => ({
        student_id: p.studentId,
        school_period_id: selectedPeriod,
        classroom_id: selectedClassroom,
        average: p.average,
        rank: p.rank,
        attendance: null,
        observations: null,
        status: "published" as const,
        generated_at: new Date().toISOString(),
      }));

      const { error } = await supabaseRef.current.from("report_cards").insert(insertData);

      if (error) throw error;

      const newSet = new Set(previewData.map((p) => p.studentId));
      setExistingReportCards(newSet);
      toast.success(`${previewData.length} boletines generados correctamente`);
    } catch (error) {
      console.error("Error generating report cards:", error);
      toast.error("Error al generar boletines");
    } finally {
      setGenerating(false);
    }
  }, [previewData, selectedPeriod, selectedClassroom]);

  const handleDownloadPDF = useCallback(
    async (student: StudentPreview) => {
      if (!selectedClassroomData || !selectedPeriodData) return;

      setDownloadingId(student.id);

      try {
        const gradeItems: GradeItem[] = student.subjectIds.map((sid) => {
          const subj = subjects.find((s) => s.id === sid);
          return {
            subject: subj?.name || "Desconocido",
            score: student.grades[sid],
            comments: student.comments[sid],
          };
        });

        const pdfData: ReportCardPDFData = {
          studentName: student.studentName,
          classroomName: selectedClassroomData.name,
          gradeLevel: selectedClassroomData.grade_level,
          periodName: selectedPeriodData.name,
          academicYear,
          grades: gradeItems,
          average: student.average,
          rank: student.rank,
          attendance: null,
          generatedAt: formatDate(new Date()),
        };

        await downloadReportCardPDF(
          pdfData,
          `boletin-${student.studentName.replace(/\s+/g, "-").toLowerCase()}.pdf`
        );
      } catch (error) {
        console.error("Error downloading PDF:", error);
        toast.error("Error al descargar PDF");
      } finally {
        setDownloadingId(null);
      }
    },
    [selectedClassroomData, selectedPeriodData, subjects, academicYear]
  );

  if (loading) return <ShimmerTable rows={6} cols={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generar Boletines"
        description="Calcula y publica boletines de calificaciones por salón y período"
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="w-full sm:w-64">
            <Select
              label="Salón"
              value={selectedClassroom}
              onChange={(e) => setSelectedClassroom(e.target.value)}
              options={classrooms.map((c) => ({
                value: c.id,
                label: `${c.name} - ${c.grade_level}`,
              }))}
            />
          </div>
          <div className="w-full sm:w-64">
            <Select
              label="Período"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              options={periods.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <Button onClick={handleCalculate} isLoading={calculating} className="h-[42px]">
            <FileText className="w-4 h-4" />
            Calcular Calificaciones
          </Button>
        </div>
      </div>

      {calculating && null}

      {!calculating && previewData.length > 0 && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Vista previa
                </p>
                <h3 className="text-lg font-semibold text-slate-900 font-serif">
                  {selectedClassroomData?.name} - {selectedClassroomData?.grade_level} | {selectedPeriodData?.name}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">
                  {previewData.length} estudiantes
                </span>
                {existingReportCards.size > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-semibold">
                    {existingReportCards.size} publicados
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] sticky left-0 bg-slate-50 z-10">
                      Estudiante
                    </th>
                    {subjects.map((s) => (
                      <th
                        key={s.id}
                        className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]"
                      >
                        {s.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em] bg-primary-50">
                      Promedio
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      Ranking
                    </th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-[0.2em]">
                      PDF
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {previewData.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 sticky left-0 bg-white">
                        {student.studentName}
                      </td>
                      {student.subjectIds.map((sid) => (
                        <td key={sid} className="px-4 py-3 text-sm text-center text-slate-900">
                          {student.grades[sid] != null ? (
                            <span
                              className={
                                student.grades[sid]! >= 7
                                  ? "text-emerald-600 font-semibold"
                                  : student.grades[sid]! >= 5
                                  ? "text-amber-600 font-semibold"
                                  : "text-rose-600 font-semibold"
                              }
                            >
                              {student.grades[sid]!.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm text-center font-bold text-primary-700 bg-primary-50/50">
                        {student.average.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-medium text-slate-900">
                        #{student.rank}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadPDF(student)}
                          isLoading={downloadingId === student.id}
                        >
                          <FileDown className="w-4 h-4" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleGenerate} isLoading={generating} size="lg">
              <FileText className="w-5 h-5" />
              Generar Boletines ({previewData.length})
            </Button>
          </div>
        </>
      )}

      {!calculating && previewData.length === 0 && selectedClassroom && selectedPeriod && (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="Sin datos para mostrar"
          description="Selecciona un salón y período, luego haz clic en Calcular Calificaciones"
        />
      )}

      {!calculating && previewData.length === 0 && !selectedClassroom && !selectedPeriod && (
        <EmptyState
          icon={<FileText className="w-8 h-8" />}
          title="Generar Boletines"
          description="Selecciona un salón y un período para calcular las calificaciones y generar los boletines"
        />
      )}
    </div>
  );
}
