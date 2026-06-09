import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(null); // "admin" | "staff" | "member"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchRole(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchRole(session.user);
      else { setUser(null); setRole(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(authUser) {
    const { data } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", authUser.id)
      .single();

    setUser(authUser);
    setRole(data?.role || "staff");
    setLoading(false);
  }

  async function signIn(email, password) {
    return await supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
export function useIsAdmin() { const { role } = useAuth(); return role === "admin"; }
export function useIsMember() { const { role } = useAuth(); return role === "member"; }

