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

interface SubjectData {
  id: string; name: string; code: string; credits: number;
  classroomSubjectId: string; classroomName: string;
  teacherName: string; teacherEmail: string;
  curriculum: Record<string, { content: string | null; files: CFile[] }>;
}

interface SchoolPeriod {
  id: string; name: string; order: number;
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [periods, setPeriods] = useState<SchoolPeriod[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("all");

  const fetchData = useCallback(async () => {
    const supabase = supabaseRef.current;
    const userId = user?.id;
    if (!userId) return;

    try {
      const { data: student } = await supabase
        .from("students").select("id, classroom_id").eq("user_id", userId).single();
      if (!student?.classroom_id) { setLoading(false); return; }

      const { data: periodsData } = await supabase
        .from("school_periods").select("id, name, order").order("order");
      const { data: csRows } = await supabase
        .from("classroom_subjects").select("id, subjects(id, name, code, credits)")
        .eq("classroom_id", student.classroom_id);

      const classroomSubjects = csRows || [];
      const csIds = classroomSubjects.map((r) => r.id);

      const { data: classroom } = await supabase
        .from("classrooms").select("name").eq("id", student.classroom_id).single();

      const { data: teacherAssignments } = await supabase
        .from("teacher_assignments")
        .select("classroom_id, subject_id, teachers!inner(id, users!inner(name, email))")
        .eq("classroom_id", student.classroom_id);
      const teacherMap = new Map<string, { name: string; email: string }>();
      (teacherAssignments || []).forEach((ta: any) => {
        const t = ta.teachers;
        if (t?.users && !teacherMap.has(ta.subject_id)) {
          teacherMap.set(ta.subject_id, { name: t.users.name || "", email: t.users.email || "" });
        }
      });

      const curriculumMap: Record<string, Record<string, { content: string | null; files: CFile[] }>> = {};

      if (csIds.length > 0) {
        const { data: entries } = await supabase
          .from("curriculum_entries").select("id, classroom_subject_id, school_period_id, content")
          .in("classroom_subject_id", csIds);

        const entryIds = (entries || []).map((e) => e.id);
        const { data: filesData } = entryIds.length > 0
          ? await supabase.from("curriculum_files").select("*").in("curriculum_entry_id", entryIds)
          : { data: [] };

        const filesMap = new Map<string, CFile[]>();
        (filesData || []).forEach((f) => {
          if (!filesMap.has(f.curriculum_entry_id)) filesMap.set(f.curriculum_entry_id, []);
          filesMap.get(f.curriculum_entry_id)!.push({
            id: f.id, file_name: f.file_name, file_path: f.file_path, file_size: f.file_size,
          });
        });

        (entries || []).forEach((entry) => {
          if (!curriculumMap[entry.classroom_subject_id]) curriculumMap[entry.classroom_subject_id] = {};
          curriculumMap[entry.classroom_subject_id][entry.school_period_id] = {
            content: entry.content, files: filesMap.get(entry.id) || [],
          };
        });
      }

      const cName = (classroom as Record<string, unknown> | null)?.name as string || "";

      const subjectsData: SubjectData[] = classroomSubjects
        .filter((cs) => cs.subjects && typeof cs.subjects === "object" && !Array.isArray(cs.subjects))
        .map((cs) => {
          const subj = cs.subjects as unknown as Record<string, unknown>;
          const sid = subj.id as string;
          const teacher = teacherMap.get(sid);
          return {
            id: sid || cs.id, name: (subj.name as string) || "Sin nombre",
            code: (subj.code as string) || "", credits: (subj.credits as number) ?? 0,
            classroomSubjectId: cs.id, classroomName: cName,
            teacherName: teacher?.name || "Sin asignar",
            teacherEmail: teacher?.email || "",
            curriculum: curriculumMap[cs.id] || {},
          };
        });

      setSubjects(subjectsData.sort((a, b) => a.name.localeCompare(b.name)));
      setPeriods((periodsData || []) as SchoolPeriod[]);
    } catch (error) { console.error("Error:", error); }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalTopics = useMemo(() =>
    subjects.reduce((sum, s) => sum + Object.values(s.curriculum).filter((c) => c.content).length, 0), [subjects]);
  const totalFiles = useMemo(() =>
    subjects.reduce((sum, s) => sum + Object.values(s.curriculum).reduce((fs, c) => fs + c.files.length, 0), 0), [subjects]);

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const filtered = useMemo(() => {
    if (subjectFilter === "all") return subjects;
    return subjects.filter((s) => s.name === subjectFilter);
  }, [subjects, subjectFilter]);

  const subjectNames = useMemo(() => {
    const set = new Set(subjects.map((s) => s.name));
    return Array.from(set).sort();
  }, [subjects]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">Materias</h1>
        <p className="text-sm text-slate-500 mt-2 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {filtered.length} materias</span>
          <span className="text-slate-300">|</span>
          <span>{periods.length} períodos</span>
          <span className="text-slate-300">|</span>
          <span>{totalTopics} temas registrados</span>
          {totalFiles > 0 && (<><span className="text-slate-300">|</span><span>{totalFiles} archivos</span></>)}
        </p>
      </div>

      {subjectNames.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-slate-500 mr-1">Materia:</span>
          <button
            onClick={() => setSubjectFilter("all")}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-medium transition-all",
              subjectFilter === "all" ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Todas
          </button>
          {subjectNames.map((n) => (
            <button
              key={n}
              onClick={() => setSubjectFilter(n)}
              className={cn(
                "px-3 py-1 rounded-lg text-sm font-medium transition-all",
                subjectFilter === n ? "bg-primary-500 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <ShimmerGrid count={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No hay materias" description="No tienes materias asignadas en tu curso" icon={<BookOpen className="w-8 h-8" />} />
      ) : (
        <div className={cn(
          "grid gap-4",
          subjectFilter === "all"
            ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1"
        )}>
          {filtered.map((subject) => {
            const isExpanded = expandedId === subject.id;
            const color = getSubjectColor(subject.name);

            const cardPeriods = periods.map((p) => {
              const data = subject.curriculum[p.id];
              return {
                periodId: p.id, periodName: p.name, order: p.order,
                content: data?.content ?? null, files: data?.files || [],
              };
            });

            return (
              <SubjectCard
                key={subject.id}
                name={subject.name}
                code={subject.code}
                credits={subject.credits}
                classroomName={subject.classroomName}
                periodsCount={periods.length}
                topicsCount={Object.values(subject.curriculum).filter((c) => c.content).length}
                filesCount={Object.values(subject.curriculum).reduce((s, c) => s + c.files.length, 0)}
                expanded={isExpanded}
                onToggle={() => toggleExpand(subject.id)}
                teacherName={subject.teacherName}
                teacherEmail={subject.teacherEmail}
              >
                <CurriculumView periods={cardPeriods} accentColor={color.active} />
              </SubjectCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
