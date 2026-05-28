"use client";

import type { AuthUser } from "@/hooks/useAuth";
import { getInitials } from "@/lib/utils";
import { Bell, LogOut, User, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { MotivationalTicker } from "@/components/common/MotivationalTicker";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface AppHeaderProps {
  title: string;
  description?: string;
  user: AuthUser | null;
  onLogout: () => void;
  onMenuToggle?: () => void;
}

export function AppHeader({ title, description, user: propUser, onLogout, onMenuToggle }: AppHeaderProps) {
  const { user: hookUser, updateProfile } = useAuth();
  const supabaseRef = useRef(createClient());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [isPreviewOpen, setPreviewOpen] = useState(false);

  const user = hookUser || propUser;
  const displayAvatar = hookUser?.avatar || propUser?.avatar || null;
  const avatarSrc = displayAvatar ? `${displayAvatar}?v=${avatarVersion}` : null;

  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    avatar: user?.avatar || "",
  });

  useEffect(() => {
    setFormData({
      name: user?.name || "",
      phone: user?.phone || "",
      avatar: user?.avatar || "",
    });
  }, [user?.name, user?.phone, user?.avatar]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateProfile({
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        avatar: formData.avatar.trim() || null,
      });
      toast.success("Perfil actualizado");
      setProfileOpen(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("No se pudo actualizar el perfil");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resizeImage = async (file: File, size = 512) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = imageUrl;

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas no disponible");

    const minSide = Math.min(image.width, image.height);
    const sx = (image.width - minSide) / 2;
    const sy = (image.height - minSide) / 2;

    ctx.drawImage(image, sx, sy, minSide, minSide, 0, 0, size, size);
    URL.revokeObjectURL(imageUrl);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((result) => resolve(result as Blob), "image/jpeg", 0.85);
    });

    return blob;
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen valida");
      return;
    }

    setIsUploading(true);
    try {
      const resized = await resizeImage(file);
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabaseRef.current.storage
        .from("avatars")
        .upload(path, resized, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabaseRef.current.storage.from("avatars").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      await updateProfile({ avatar: publicUrl });
      setFormData((prev) => ({ ...prev, avatar: publicUrl }));
      setAvatarVersion((v) => v + 1);
      toast.success("Foto actualizada");
    } catch (error) {
      console.error("Error uploading avatar:", error);
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`No se pudo actualizar la foto${message ? ": " + message : ""}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClearData = async () => {
    if (!user) return;
    setIsClearing(true);
    try {
      await supabaseRef.current.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
      await updateProfile({ avatar: null, phone: null });
      setFormData((prev) => ({ ...prev, avatar: "", phone: "" }));
      setAvatarVersion((v) => v + 1);
      toast.success("Datos eliminados");
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("No se pudieron eliminar los datos");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <header className="relative h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center gap-4">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Abrir menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-lg sm:text-xl font-semibold text-slate-900 font-serif">{title}</h1>
          {description && (
            <p className="text-sm text-slate-500 hidden sm:block">{description}</p>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        {user?.role && (user.role === "student" || user.role === "teacher" || user.role === "admin") && (
          <div className="max-w-[340px] min-w-0">
            <MotivationalTicker role={user.role} />
          </div>
        )}

        <button className="relative p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition flex-shrink-0">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <button
          type="button"
          className="flex items-center gap-3 rounded-full hover:bg-slate-50 px-2 py-1 transition"
          onClick={() => {
            setFormData({
              name: user?.name || "",
              phone: user?.phone || "",
              avatar: user?.avatar || "",
            });
            setProfileOpen(true);
          }}
        >
          <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-medium text-sm overflow-hidden">
            {avatarSrc ? (
              <img src={avatarSrc} alt={user?.name || "Usuario"} className="w-full h-full object-cover" />
            ) : (
              getInitials(user?.name || "?")
            )}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-slate-900">{user?.name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
          <User className="w-4 h-4 text-slate-400 hidden sm:block" />
        </button>

        <button
          onClick={onLogout}
          className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
      <div
        className={`fixed inset-0 z-40 bg-slate-950/30 transition-opacity ${
          isProfileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setProfileOpen(false)}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white shadow-2xl transform transition-transform duration-300 ${
          isProfileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Perfil</p>
            <h3 className="text-lg font-semibold text-slate-900">Ajustes de cuenta</h3>
          </div>
          <button
            type="button"
            onClick={() => setProfileOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
            aria-label="Cerrar panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="relative group"
            >
              <div className="h-16 w-16 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center overflow-hidden ring-2 ring-slate-100 group-hover:ring-primary-300 transition">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="h-16 w-16 object-cover" />
                ) : (
                  <User className="h-8 w-8" />
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <Modal isOpen={isPreviewOpen} onClose={() => setPreviewOpen(false)} title="Foto de perfil" size="sm" footer={null}>
            <div className="flex flex-col items-center gap-4">
              <div className="h-40 w-40 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center overflow-hidden ring-4 ring-slate-100">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="h-40 w-40 object-cover" />
                ) : (
                  <User className="h-16 w-16" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} isLoading={isUploading}>
                  Subir nueva
                </Button>
                {displayAvatar && (
                  <Button type="button" variant="danger" onClick={() => { handleClearData(); setPreviewOpen(false); }} isLoading={isClearing}>
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </Modal>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Telefono"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <div className="pt-2 flex items-center gap-3">
              <Button variant="outline" type="button" onClick={() => setProfileOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Guardar
              </Button>
            </div>
          </form>

          <div className="pt-5 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClearData}
              disabled={isClearing}
              className="w-full text-left text-[11px] text-slate-300 hover:text-slate-500 transition"
            >
              {isClearing ? "Eliminando..." : "Eliminar foto y telefono"}
            </button>
          </div>
        </div>
      </aside>
    </header>
  );
}
