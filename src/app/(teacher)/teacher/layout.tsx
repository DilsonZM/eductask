"use client";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { NotebookLoader } from "@/components/common/NotebookLoader";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== "teacher") {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <NotebookLoader label="Abriendo panel del profesor" />;
  }

  if (user?.role !== "teacher") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="teacher" />
      <div className="flex-1 flex flex-col">
        <AppHeader title="Panel del Profesor" user={user} onLogout={() => void logout()} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}