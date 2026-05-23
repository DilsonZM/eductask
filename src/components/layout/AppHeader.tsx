"use client";

import type { AuthUser } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { Bell, LogOut } from "lucide-react";

interface AppHeaderProps {
  title: string;
  description?: string;
  user: AuthUser | null;
  onLogout: () => void;
}

export function AppHeader({ title, description, user, onLogout }: AppHeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium text-sm">
            {user?.name ? getInitials(user.name) : "?"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}