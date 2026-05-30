"use client";

import { useAuth } from "@/hooks/useAuth";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { NotebookLoader } from "@/components/common/NotebookLoader";
import { LogoutOverlay } from "@/components/common/LogoutOverlay";
import { ConfirmDialog } from "@/components/ui/Modal";
import { NavigationProvider } from "@/components/layout/NavigationContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [minDone, setMinDone] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinDone(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && user?.role !== "student") {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleLogout = useCallback(() => setShowConfirm(true), []);
  const confirmLogout = useCallback(() => { setShowConfirm(false); setLoggingOut(true); }, []);
  const finishLogout = useCallback(() => { void logout(); }, [logout]);

  if (loading || !minDone) return <NotebookLoader role="student" />;
  if (loggingOut) return <LogoutOverlay onDone={finishLogout} />;
  if (user?.role !== "student") return null;

  return (
    <NavigationProvider>
      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={confirmLogout} title="Cerrar sesion" message="¿Deseas cerrar tu sesion actual?" confirmLabel="Si, salir" />
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar role="student" isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col">
          <AppHeader title="Panel del Alumno" user={user} onLogout={handleLogout} onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </NavigationProvider>
  );
}
