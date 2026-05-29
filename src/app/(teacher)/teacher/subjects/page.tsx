"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerGrid } from "@/components/common/SkeletonLoader";
import { SubjectCard, getSubjectColor } from "@/components/common/SubjectCard";
import { CurriculumView } from "@/components/common/CurriculumView";
import { cn } from "@/lib/utils";
import { BookOpen } from "lucide-react";

interface CFile {
  id: string; file_name: string; file_path: string; file_size: number | null;
}

interface PeriodCurriculum {
  periodId: string; periodName: string; order: number;
  content: string | null; files: CFile[];
}

interface SubjectCardData {
  classroomSubjectId: string; assignmentId: string;
  subjectName: string; classroomName: string; classroomId: string;
  subjectCode: string; subjectCredits: number;
  periods: PeriodCurriculum[];
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const [subjects, setSubjects] = useState<SubjectCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [classroomFilter, setClassroomFilter] = useState("all");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: teacher } = await supabaseRef.current
        .from("teachers").select("id").eq("user_id", user.id).single();
      if (!teacher) { setSubjects([]); return; }

      const teacherId = teacher.id;
      const { data: assignments } = await supabaseRef.current
        .from("teacher_assignments").select("id, classroom_id, subject_id")
        .eq("teacher_id", teacherId);

      if (!assignments?.length) { setSubjects([]); return; }

      const classroomIds = Array.from(new Set(assignments.map((a) => a.classroom_id).filter(Boolean)));
      const subjectIds = Array.from(new Set(assignments.map((a) => a.subject_id).filter(Boolean)));

      const [{ data: classroomsData }, { data: subjectsData }] = await Promise.all([
        supabaseRef.current.from("classrooms").select("id, name").in("id", classroomIds),
        supabaseRef.current.from("subjects").select("id, name, code, credits").in("id", subjectIds),
      ]);

      const classroomMap = new Map((classroomsData || []).map((c) => [c.id, (c as Record<string, unknown>).name as string]));
      const subjectMap = new Map((subjectsData || []).map((s) => [s.id, s]));

      const { data: classroomSubjects } = await supabaseRef.current
        .from("classroom_subjects").select("id, classroom_id, subject_id")
        .in("classroom_id", classroomIds).in("subject_id", subjectIds);

      const csMap = new Map<string, string>();
      (classroomSubjects || []).forEach((cs) => {
        const r = cs as Record<string, unknown>;
        if (r.classroom_id && r.subject_id) csMap.set(`${r.classroom_id}:${r.subject_id}`, r.id as string);
      });

      const seen = new Set<string>();
      const deduped: { assignmentId: string; classroomSubjectId: string; classroomId: string; subjectId: string }[] = [];
      for (const a of assignments) {
        const r = a as Record<string, unknown>;
        const key = `${r.classroom_id}:${r.subject_id}`;
        const csId = csMap.get(key);
        if (csId && !seen.has(csId)) {
          seen.add(csId);
          deduped.push({ assignmentId: r.id as string, classroomSubjectId: csId, classroomId: r.classroom_id as string, subjectId: r.subject_id as string });
        }
      }

      const { data: activeYear } = await supabaseRef.current
        .from("academic_years").select("id").eq("is_active", true).single();

      let periods: { id: string; name: string; order: number }[] = [];
      if (activeYear) {
        const { data: periodsData } = await supabaseRef.current
          .from("school_periods").select("id, name, order")
          .eq("academic_year_id", (activeYear as Record<string, unknown>).id as string)
          .eq("status", "active").order("order");
        if (periodsData) periods = periodsData.map((p) => {
          const pr = p as Record<string, unknown>;
          return { id: pr.id as string, name: pr.name as string, order: pr.order as number };
        });
      }

      const csIds = deduped.map((d) => d.classroomSubjectId);
      const { data: entries } = csIds.length > 0
        ? await supabaseRef.current.from("curriculum_entries")
            .select("id, classroom_subject_id, school_period_id, content").in("classroom_subject_id", csIds)
        : { data: [] };

      const entryIds = (entries || []).map((e) => (e as Record<string, unknown>).id as string);
      const { data: filesData } = entryIds.length > 0
        ? await supabaseRef.current.from("curriculum_files").select("*").in("curriculum_entry_id", entryIds)
        : { data: [] };

      const filesMap = new Map<string, CFile[]>();
      (filesData || []).forEach((f) => {
        const fr = f as Record<string, unknown>;
        if (!filesMap.has(fr.curriculum_entry_id as string)) filesMap.set(fr.curriculum_entry_id as string, []);
        filesMap.get(fr.curriculum_entry_id as string)!.push({
          id: fr.id as string, file_name: fr.file_name as string,
          file_path: fr.file_path as string, file_size: fr.file_size as number | null,
        });
      });

      const entriesMap = new Map<string, Map<string, { content: string; entryId: string }>>();
      (entries || []).forEach((e) => {
        const er = e as Record<string, unknown>;
        if (!entriesMap.has(er.classroom_subject_id as string)) entriesMap.set(er.classroom_subject_id as string, new Map());
        entriesMap.get(er.classroom_subject_id as string)!.set(er.school_period_id as string, {
          content: er.content as string, entryId: er.id as string,
        });
      });

      const result: SubjectCardData[] = deduped.map((d) => {
        const sub = subjectMap.get(d.subjectId) as { name: string; code: string; credits: number } | undefined;
        return {
          classroomSubjectId: d.classroomSubjectId, assignmentId: d.assignmentId,
          subjectName: sub?.name || "Sin nombre", classroomName: classroomMap.get(d.classroomId) || "Sin salón",
          classroomId: d.classroomId, subjectCode: sub?.code || "", subjectCredits: sub?.credits ?? 0,
          periods: periods.map((p) => {
            const entry = entriesMap.get(d.classroomSubjectId)?.get(p.id);
            return { periodId: p.id, periodName: p.name, order: p.order,
              content: entry?.content ?? null, files: entry ? filesMap.get(entry.entryId) || [] : [] };
          }),
        };
      });

      setSubjects(result);
    } catch (error) { console.error("Error:", error); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  const classrooms = useMemo(() => {
    const set = new Set(subjects.map((s) => s.classroomName));
    return Array.from(set).sort();
  }, [subjects]);

  const filtered = useMemo(() => {
    if (classroomFilter === "all") return subjects;
    return subjects.filter((s) => s.classroomName === classroomFilter);
  }, [subjects, classroomFilter]);

  const totalTopics = useMemo(() =>
    filtered.reduce((sum, s) => sum + s.periods.filter((p) => p.content).length, 0), [filtered]);
  const totalFiles = useMemo(() =>
    filtered.reduce((sum, s) => sum + s.periods.reduce((fsum, p) => fsum + p.files.length, 0), 0), [filtered]);

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">Materias</h1>
        <p className="text-sm text-slate-500 mt-2 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {filtered.length} materias</span>
          <span className="text-slate-300">|</span>
          <span>{classrooms.length} salones</span>
          <span className="text-slate-300">|</span>
          <span>{totalTopics} temas registrados</span>
          {totalFiles > 0 && (<><span className="text-slate-300">|</span><span>{totalFiles} archivos</span></>)}
        </p>
      </div>

      {classrooms.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 mr-1">Salón:</span>
          <button
            onClick={() => setClassroomFilter("all")}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium transition-all",
              classroomFilter === "all"
                ? "bg-primary-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Todos
          </button>
          {classrooms.map((c) => (
            <button
              key={c}
              onClick={() => setClassroomFilter(c)}
              className={cn(
                "px-3 py-1 rounded-lg text-sm font-medium transition-all",
                classroomFilter === c
                  ? "bg-primary-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <ShimmerGrid />
      ) : filtered.length === 0 ? (
        <EmptyState title="No hay materias asignadas" description="No tienes materias asignadas actualmente" icon={<BookOpen className="w-8 h-8" />} />
      ) : (
        <div className={cn(
          "grid gap-4",
          classroomFilter === "all"
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1"
        )}>
          {filtered.map((subject) => {
            const isExpanded = expandedId === subject.classroomSubjectId;
            const color = getSubjectColor(subject.subjectName);

            return (
              <SubjectCard
                key={subject.classroomSubjectId}
                name={subject.subjectName}
                code={subject.subjectCode}
                credits={subject.subjectCredits}
                classroomName={subject.classroomName}
                periodsCount={subject.periods.length}
                topicsCount={subject.periods.filter((p) => p.content).length}
                filesCount={subject.periods.reduce((s, p) => s + p.files.length, 0)}
                expanded={isExpanded}
                onToggle={() => toggleExpand(subject.classroomSubjectId)}
              >
                <CurriculumView
                  periods={subject.periods}
                  accentColor={color.active}
                />
              </SubjectCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
