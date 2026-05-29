"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerGrid } from "@/components/common/SkeletonLoader";

interface PeriodCurriculum {
  periodId: string;
  periodName: string;
  order: number;
  content: string | null;
  files: { id: string; file_name: string; file_path: string; file_size: number | null }[];
}

interface SubjectCardData {
  classroomSubjectId: string;
  assignmentId: string;
  subjectName: string;
  classroomName: string;
  subjectCode: string;
  subjectCredits: number;
  periods: PeriodCurriculum[];
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const [subjects, setSubjects] = useState<SubjectCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: teacher } = await supabaseRef.current
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!teacher) {
        setSubjects([]);
        return;
      }

      const teacherId = teacher.id;

      const { data: assignments } = await supabaseRef.current
        .from("teacher_assignments")
        .select("id, classroom_id, subject_id")
        .eq("teacher_id", teacherId);

      if (!assignments || assignments.length === 0) {
        setSubjects([]);
        return;
      }

      const classroomIds = Array.from(new Set(assignments.map((a) => a.classroom_id).filter(Boolean)));
      const subjectIds = Array.from(new Set(assignments.map((a) => a.subject_id).filter(Boolean)));

      const [{ data: classroomsData }, { data: subjectsData }] = await Promise.all([
        supabaseRef.current.from("classrooms").select("id, name").in("id", classroomIds),
        supabaseRef.current
          .from("subjects")
          .select("id, name, code, credits")
          .in("id", subjectIds),
      ]);

      const classroomMap = new Map(
        (classroomsData || []).map((c) => [c.id, (c as Record<string, unknown>).name as string])
      );
      const subjectMap = new Map(
        (subjectsData || []).map((s) => [s.id, s])
      );

      const { data: classroomSubjects } = await supabaseRef.current
        .from("classroom_subjects")
        .select("id, classroom_id, subject_id")
        .in("classroom_id", classroomIds)
        .in("subject_id", subjectIds);

      const csMap = new Map<string, string>();
      (classroomSubjects || []).forEach((cs) => {
        const csRecord = cs as Record<string, unknown>;
        if (csRecord.classroom_id && csRecord.subject_id) {
          csMap.set(
            `${csRecord.classroom_id}:${csRecord.subject_id}`,
            csRecord.id as string
          );
        }
      });

      const seenCsIds = new Set<string>();
      const deduped: {
        assignmentId: string;
        classroomSubjectId: string;
        classroomId: string;
        subjectId: string;
      }[] = [];
      for (const a of assignments) {
        const record = a as Record<string, unknown>;
        const key = `${record.classroom_id}:${record.subject_id}`;
        const csId = csMap.get(key);
        if (csId && !seenCsIds.has(csId)) {
          seenCsIds.add(csId);
          deduped.push({
            assignmentId: record.id as string,
            classroomSubjectId: csId,
            classroomId: record.classroom_id as string,
            subjectId: record.subject_id as string,
          });
        }
      }

      const { data: activeYear } = await supabaseRef.current
        .from("academic_years")
        .select("id")
        .eq("is_active", true)
        .single();

      let periods: { id: string; name: string; order: number }[] = [];
      if (activeYear) {
        const { data: periodsData } = await supabaseRef.current
          .from("school_periods")
          .select("id, name, order")
          .eq("academic_year_id", (activeYear as Record<string, unknown>).id as string)
          .eq("status", "active")
          .order("order");

        if (periodsData) {
          periods = periodsData.map((p) => {
            const pr = p as Record<string, unknown>;
            return {
              id: pr.id as string,
              name: pr.name as string,
              order: pr.order as number,
            };
          });
        }
      }

      const csIds = deduped.map((d) => d.classroomSubjectId);
      const { data: entries } =
        csIds.length > 0
          ? await supabaseRef.current
              .from("curriculum_entries")
              .select("id, classroom_subject_id, school_period_id, content")
              .in("classroom_subject_id", csIds)
          : { data: [] };

      const entryIds = (entries || []).map((e) => (e as Record<string, unknown>).id as string);
      const { data: filesData } =
        entryIds.length > 0
          ? await supabaseRef.current
              .from("curriculum_files")
              .select("*")
              .in("curriculum_entry_id", entryIds)
          : { data: [] };

      const filesMap = new Map<string, { id: string; file_name: string; file_path: string; file_size: number | null }[]>();
      (filesData || []).forEach((f) => {
        const fr = f as Record<string, unknown>;
        const eId = fr.curriculum_entry_id as string;
        if (!filesMap.has(eId)) filesMap.set(eId, []);
        filesMap.get(eId)!.push({
          id: fr.id as string,
          file_name: fr.file_name as string,
          file_path: fr.file_path as string,
          file_size: fr.file_size as number | null,
        });
      });

      const entriesMap = new Map<string, Map<string, { content: string; entryId: string }>>();
      (entries || []).forEach((e) => {
        const er = e as Record<string, unknown>;
        const csId = er.classroom_subject_id as string;
        const periodId = er.school_period_id as string;
        if (!entriesMap.has(csId)) entriesMap.set(csId, new Map());
        entriesMap.get(csId)!.set(periodId, {
          content: er.content as string,
          entryId: er.id as string,
        });
      });

      const result: SubjectCardData[] = deduped.map((d) => {
        const sub = subjectMap.get(d.subjectId) as
          | { name: string; code: string; credits: number }
          | undefined;
        const periodCurriculums: PeriodCurriculum[] = periods.map((p) => {
          const entry = entriesMap.get(d.classroomSubjectId)?.get(p.id);
          return {
            periodId: p.id,
            periodName: p.name,
            order: p.order,
            content: entry?.content ?? null,
            files: entry ? filesMap.get(entry.entryId) || [] : [],
          };
        });
        return {
          classroomSubjectId: d.classroomSubjectId,
          assignmentId: d.assignmentId,
          subjectName: sub?.name || "Sin nombre",
          classroomName: classroomMap.get(d.classroomId) || "Sin salón",
          subjectCode: sub?.code || "",
          subjectCredits: sub?.credits ?? 0,
          periods: periodCurriculums,
        };
      });

      setSubjects(result);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div>
      <PageHeader title="Materias" description="Materias y temarios asignados" />
      {loading ? (
        <ShimmerGrid />
      ) : subjects.length === 0 ? (
        <EmptyState
          title="No hay materias asignadas"
          description="No tienes materias asignadas actualmente"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const isExpanded = expandedId === subject.classroomSubjectId;
            return (
              <div key={subject.classroomSubjectId}>
                <div
                  onClick={() => toggleExpand(subject.classroomSubjectId)}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer"
                >
                  <h3 className="font-semibold text-slate-900 text-lg">
                    {subject.subjectName}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Salón: {subject.classroomName}
                  </p>
                  {subject.subjectCode && (
                    <div className="flex gap-3 mt-2 text-xs text-slate-400">
                      <span>Código: {subject.subjectCode}</span>
                      <span>Créditos: {subject.subjectCredits}</span>
                    </div>
                  )}
                </div>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isExpanded
                      ? "max-h-[2000px] opacity-100 mt-3"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="space-y-3">
                    {subject.periods.length > 0 ? (
                      subject.periods.map((p) => (
                        <div
                          key={p.periodId}
                          className="bg-slate-50 rounded-lg p-3"
                        >
                          <h4 className="font-medium text-slate-800 text-sm">
                            {p.periodName}
                          </h4>
                          {p.content ? (
                            <div
                              className="text-sm text-slate-600 mt-1 prose prose-sm max-w-none prose-headings:text-slate-800 prose-a:text-primary-600"
                              dangerouslySetInnerHTML={{ __html: p.content }}
                            />
                          ) : (
                            <p className="text-sm text-slate-400 mt-1">Pendiente</p>
                          )}
                          {p.files.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {p.files.map((f) => (
                                <a
                                  key={f.id}
                                  href={f.file_path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-800"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  {f.file_name}
                                  {f.file_size != null && (
                                    <span className="text-slate-400">
                                      ({f.file_size < 1024 ? `${f.file_size} B` : `${(f.file_size / 1024).toFixed(1)} KB`})
                                    </span>
                                  )}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 text-center py-4">
                        No hay períodos configurados
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
