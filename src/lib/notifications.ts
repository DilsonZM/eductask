import { createClient } from "@/lib/supabase/client";

type NotifType = "task" | "submission" | "grade" | "announcement" | "assignment" | "system";

interface CreateNotif {
  user_id: string;
  type: NotifType;
  title: string;
  message?: string;
  link?: string;
}

export async function createNotifications(notifs: CreateNotif[]) {
  if (!notifs.length) return;
  const supabase = createClient();
  const { error } = await supabase.from("notifications").insert(
    notifs.map((n) => ({
      user_id: n.user_id,
      type: n.type,
      title: n.title,
      message: n.message || null,
      link: n.link || null,
    }))
  );
  if (error) console.error("Error creating notifications:", error);
}
