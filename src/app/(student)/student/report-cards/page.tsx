"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { formatDate } from "@/lib/utils";

interface ReportCard {
  id: string;
  average: number | null;
  rank: number | null;
  attendance: number | null;
  observations: string | null;
  status: string;
  generated_at: string | null;
  period_name: string;
}

export default function ReportCardsPage() {
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const supabaseRef = useRef(createClient());

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabaseRef.current
        .from("report_cards")
        .select("*, school_periods(name)")
        .eq("status", "published")
        .order("generated_at", { ascending: false });
      if (data) {
        setReportCards(data.map((rc) => ({
          ...rc,
          period_name: (rc.school_periods as Record<string, string>)?.name || "",
        }) as ReportCard));
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
      <PageHeader title="Boletines" description="Tus boletines escolares" />
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8"><p className="text-center text-gray-500">Cargando...</p></div>
      ) : reportCards.length === 0 ? (
        <EmptyState title="No hay boletines" description="Los boletines aparecerán cuando sean publicados" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportCards.map((rc) => (
            <div key={rc.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{rc.period_name}</h3>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Publicado</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Promedio</span>
                  <span className="text-2xl font-bold text-gray-900">{rc.average?.toFixed(1) || "-"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Ranking</span>
                  <span className="font-medium text-gray-900">#{rc.rank || "-"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Asistencia</span>
                  <span className="font-medium text-gray-900">{rc.attendance ? `${rc.attendance}%` : "-"}</span>
                </div>
                {rc.observations && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-500">Observaciones:</p>
                    <p className="text-sm text-gray-700">{rc.observations}</p>
                  </div>
                )}
                {rc.generated_at && (
                  <p className="text-xs text-gray-400 pt-2">Generado: {formatDate(rc.generated_at)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}