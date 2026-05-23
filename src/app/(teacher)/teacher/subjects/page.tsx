"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";

interface AssignmentWithDetails {
  id: string;
  classroom_name: string;
  subject_name: string;
}

export default function SubjectsPage() {
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current
        .from("teacher_assignments")
        .select("*, classrooms(name), subjects(name)")
        .order("created_at", { ascending: false });
      if (data) {
        setAssignments(data.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          classroom_name: (a.classrooms as Record<string, string>)?.name || "",
          subject_name: (a.subjects as Record<string, string>)?.name || "",
        })));
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      <PageHeader title="Materias" description="Materias y salones asignados" />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : assignments.length === 0 ? (
        <EmptyState title="No hay materias asignadas" description="No tienes materias asignadas actualmente" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 text-lg">{assignment.subject_name}</h3>
              <p className="text-gray-500 text-sm mt-1">Salón: {assignment.classroom_name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}