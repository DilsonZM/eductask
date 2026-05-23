"use client";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { NotebookLoader } from "@/components/common/NotebookLoader";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <NotebookLoader label="Abriendo panel de administración" />;
  }

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col">
        <AppHeader title="Panel de Administración" user={user} onLogout={() => void logout()} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}