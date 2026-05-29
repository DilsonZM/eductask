"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ShimmerGrid } from "@/components/common/SkeletonLoader";
import { BookOpen, ChevronDown } from "lucide-react";

interface CFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
}

interface SubjectData {
  id: string;
  name: string;
  code: string;
  credits: number;
  classroomSubjectId: string;
  curriculum: Record<string, { content: string | null; files: CFile[] }>;
}

interface SchoolPeriod {
  id: string;
  name: string;
  order: number;
}

const SUBJECT_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-emerald-100", text: "text-emerald-700" },
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-cyan-100", text: "text-cyan-700" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-700" },
  { bg: "bg-lime-100", text: "text-lime-700" },
];

function getSubjectColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const supabaseRef = useRef(createClient());

  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [periods, setPeriods] = useState<SchoolPeriod[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const supabase = supabaseRef.current;
    const userId = user?.id;
    if (!userId) return;

    try {
      const { data: student } = await supabase
        .from("students")
        .select("id, classroom_id")
        .eq("user_id", userId)
        .single();

      if (!student || !student.classroom_id) {
        setLoading(false);
        return;
      }

      const { data: periodsData } = await supabase
        .from("school_periods")
        .select("id, name, order")
        .order("order", { ascending: true });

      const { data: csRows } = await supabase
        .from("classroom_subjects")
        .select("id, subjects(id, name, code, credits)")
        .eq("classroom_id", student.classroom_id);

      const classroomSubjects = csRows || [];
      const csIds = classroomSubjects.map((r) => r.id);

      const curriculumMap: Record<string, Record<string, { content: string | null; files: CFile[]; entryId: string }>> = {};

      if (csIds.length > 0) {
        const { data: entries } = await supabase
          .from("curriculum_entries")
          .select("id, classroom_subject_id, school_period_id, content")
          .in("classroom_subject_id", csIds);

        const entryIds = (entries || []).map((e) => e.id);
        const { data: filesData } =
          entryIds.length > 0
            ? await supabase.from("curriculum_files").select("*").in("curriculum_entry_id", entryIds)
            : { data: [] };

        const filesMap = new Map<string, CFile[]>();
        (filesData || []).forEach((f) => {
          if (!filesMap.has(f.curriculum_entry_id)) filesMap.set(f.curriculum_entry_id, []);
          filesMap.get(f.curriculum_entry_id)!.push({
            id: f.id,
            file_name: f.file_name,
            file_path: f.file_path,
            file_size: f.file_size,
          });
        });

        (entries || []).forEach((entry) => {
          if (!curriculumMap[entry.classroom_subject_id]) {
            curriculumMap[entry.classroom_subject_id] = {};
          }
          curriculumMap[entry.classroom_subject_id][entry.school_period_id] = {
            content: entry.content,
            files: filesMap.get(entry.id) || [],
            entryId: entry.id,
          };
        });
      }

      const subjectsData: SubjectData[] = classroomSubjects
        .filter((cs) => cs.subjects && typeof cs.subjects === "object" && !Array.isArray(cs.subjects))
        .map((cs) => {
          const subj = cs.subjects as unknown as Record<string, unknown>;
          return {
            id: (subj.id as string) || cs.id,
            name: (subj.name as string) || "Sin nombre",
            code: (subj.code as string) || "",
            credits: (subj.credits as number) ?? 0,
            classroomSubjectId: cs.id,
            curriculum: curriculumMap[cs.id] || {},
          };
        });

      setSubjects(subjectsData.sort((a, b) => a.name.localeCompare(b.name)));
      setPeriods((periodsData || []) as SchoolPeriod[]);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Materias" description="Materias de tu curso con el temario por trimestre" />

      {loading ? (
        <ShimmerGrid count={6} />
      ) : subjects.length === 0 ? (
        <EmptyState
          title="No hay materias"
          description="No tienes materias asignadas en tu curso"
          icon={<BookOpen className="w-8 h-8" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => {
            const color = getSubjectColor(subject.name);
            const isExpanded = expandedId === subject.id;

            return (
              <div
                key={subject.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(subject.id)}
                  className="w-full p-6 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center shrink-0`}
                    >
                      <BookOpen className={`w-5 h-5 ${color.text}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900 font-serif">
                        {subject.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs text-slate-400">{subject.code}</span>
                        <span className={`px-2 py-0.5 ${color.bg} ${color.text} text-xs rounded-full font-medium`}>
                          {subject.credits} créditos
                        </span>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                <div
                  className={`transition-all duration-300 ease-in-out ${
                    isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
                  } overflow-hidden`}
                >
                  <div className="px-6 pb-6 space-y-3">
                    {periods.map((period) => {
                      const data = subject.curriculum[period.id];
                      return (
                        <div key={period.id} className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                            {period.name}
                          </p>
                          {data?.content ? (
                            <div
                              className="text-sm text-slate-700 prose prose-sm max-w-none prose-headings:text-slate-800 prose-a:text-primary-600"
                              dangerouslySetInnerHTML={{ __html: data.content }}
                            />
                          ) : (
                            <p className="text-sm text-slate-400 italic">Pendiente</p>
                          )}
                          {data?.files && data.files.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {data.files.map((f) => (
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
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
