"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable } from "@/components/common/DataTable";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDateTime } from "@/lib/utils";
import type { Tables } from "@/types/database";

type Submission = Tables<"submissions"> & { task_title?: string; student_name?: string };

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current
        .from("submissions")
        .select("*, tasks(title), students(first_name, last_name)")
        .order("submitted_at", { ascending: false });
      if (data) {
        setSubmissions(data.map((s) => ({
          ...s,
          task_title: (s.tasks as Record<string, string>)?.title || "",
          student_name: `${(s.students as Record<string, string>)?.first_name || ""} ${(s.students as Record<string, string>)?.last_name || ""}`,
        })) as Submission[]);
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

  const columns = [
    { key: "student_name", header: "Alumno" },
    { key: "task_title", header: "Tarea" },
    { key: "file_name", header: "Archivo" },
    { key: "submitted_at", header: "Fecha de Entrega", render: (item: Submission) => formatDateTime(item.submitted_at) },
  ];

  return (
    <div>
      <PageHeader title="Entregas" description="Ver entregas de los alumnos" />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : submissions.length === 0 ? (
        <EmptyState title="No hay entregas" description="Las entregas aparecerán aquí cuando los alumnos entreguen sus tareas" />
      ) : (
        <DataTable data={submissions} columns={columns} />
      )}
    </div>
  );
}