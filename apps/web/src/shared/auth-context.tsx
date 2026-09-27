import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isDemoMode, supabase } from "./supabase-client.js";

type AuthUser = { id: string; email: string; name: string; accessToken: string; demo: boolean };
type AuthContextValue = { user: AuthUser | null; ready: boolean; demoMode: boolean; signInWithMagicLink: (email: string) => Promise<void>; continueAsDemo: () => void; signOut: () => Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

function userFromSession(session: Session): AuthUser {
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.user_metadata?.full_name ?? session.user.email?.split("@")[0] ?? "Gather member",
    accessToken: session.access_token,
    demo: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const demoUser = localStorage.getItem("gather-demo-user");
    if (demoUser && isDemoMode) setUser({ id: demoUser, email: "hello@gather.demo", name: "Pankaj Verma", accessToken: `demo-token-${demoUser}`, demo: true });
    if (!supabase) { setReady(true); return; }
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session ? userFromSession(data.session) : null);
      setReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? userFromSession(session) : null);
      setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, ready, demoMode: isDemoMode,
    signInWithMagicLink: async (email) => {
      if (!supabase) throw new Error("Magic-link sign-in is not configured in demo mode.");
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
      if (error) throw error;
    },
    continueAsDemo: () => {
      const id = "demo-user";
      localStorage.setItem("gather-demo-user", id);
      setUser({ id, email: "hello@gather.demo", name: "Pankaj Verma", accessToken: `demo-token-${id}`, demo: true });
    },
    signOut: async () => {
      localStorage.removeItem("gather-demo-user");
      if (supabase) await supabase.auth.signOut();
      setUser(null);
    },
  }), [user, ready]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
