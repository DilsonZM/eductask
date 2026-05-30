"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type TableName = "notifications" | "tasks" | "submissions" | "teacher_assignments";

export function useRealtimeSubscription(
  table: TableName,
  filter: string | undefined,
  onChange: (payload: RealtimePostgresChangesPayload<any>) => void
) {
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    let channel = supabase
      .channel(`realtime:${table}:${filter || "all"}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter } : {}),
        },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter, onChange]);
}
