"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

type UserRole = "admin" | "teacher" | "student";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatar: string | null;
  phone: string | null;
}

export type { UserRole };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  const getProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile } = await supabaseRef.current
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (profile) {
        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role as UserRole,
          name: profile.name,
          avatar: profile.avatar ?? null,
          phone: profile.phone ?? null,
        });
      }
    } catch {
      // Profile may not exist (stale session after DB reset)
    }
  }, []);

  const setUserFromMetadata = useCallback((authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) => {
    const role = authUser.user_metadata?.role as UserRole | undefined;
    const name = authUser.user_metadata?.name as string | undefined;

    if (role) {
      setUser({
        id: authUser.id,
        email: authUser.email || "",
        role,
        name: name || authUser.email || "Usuario",
        avatar: null,
        phone: null,
      });
      return true;
    }

    return false;
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const authUser = session?.user;

        if (authUser) {
          setUserFromMetadata(authUser);
          void getProfile(authUser.id);
        }
      } catch (error) {
        console.error("Error loading auth session:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUserFromMetadata(session.user);
          void getProfile(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [getProfile, setUserFromMetadata]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabaseRef.current.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { data: profile } = await supabaseRef.current
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

      const role = profile?.role || "student";

      if (role === "admin") router.push("/admin/dashboard");
      else if (role === "teacher") router.push("/teacher/dashboard");
      else router.push("/student/dashboard");
    }
  };

  const logout = async () => {
    await supabaseRef.current.auth.signOut();
    router.push("/login");
  };

  const updateProfile = async (updates: { name?: string; avatar?: string | null; phone?: string | null }) => {
    if (!user) return;

    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.avatar !== undefined) payload.avatar = updates.avatar;
    if (updates.phone !== undefined) payload.phone = updates.phone;

    const supabase = supabaseRef.current as any;
    const { data, error } = await supabase
      .from("users")
      .update(payload)
      .eq("id", user.id)
      .select("*")
      .single();

    if (error) throw error;

    if (data) {
      setUser({
        id: data.id,
        email: data.email,
        role: data.role as UserRole,
        name: data.name,
        avatar: data.avatar ?? null,
        phone: data.phone ?? null,
      });
    }
  };

  return { user, loading, login, logout, updateProfile };
}
