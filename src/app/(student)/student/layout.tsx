"use client";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { NotebookLoader } from "@/components/common/NotebookLoader";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== "student") {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <NotebookLoader label="Abriendo panel del alumno" />;
  }

  if (user?.role !== "student") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="student" />
      <div className="flex-1 flex flex-col">
        <AppHeader title="Panel del Alumno" user={user} onLogout={() => void logout()} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}