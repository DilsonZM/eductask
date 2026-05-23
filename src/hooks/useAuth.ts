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
}

export type { UserRole };

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabaseRef = useRef(createClient());

  const getProfile = useCallback(async (userId: string) => {
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
      });
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
          const hasMetadataUser = setUserFromMetadata(authUser);

          if (!hasMetadataUser) {
            void getProfile(authUser.id);
          }
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
          const hasMetadataUser = setUserFromMetadata(session.user);

          if (!hasMetadataUser) {
            void getProfile(session.user.id);
          }
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

  return { user, loading, login, logout };
}