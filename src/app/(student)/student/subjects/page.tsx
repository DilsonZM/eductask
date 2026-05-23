"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";

interface Subject { id: string; name: string; description: string | null; code: string; credits: number; }

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current.from("subjects").select("*").order("name");
      if (data) setSubjects(data);
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
      <PageHeader title="Materias" description="Materias disponibles" />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : subjects.length === 0 ? (
        <EmptyState title="No hay materias" description="No hay materias disponibles" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{subject.code}</p>
                </div>
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">{subject.credits} créditos</span>
              </div>
              {subject.description && <p className="text-sm text-gray-500 mt-3">{subject.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}