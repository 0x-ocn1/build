import { useEffect, useState } from "react";
import { supabase } from "../supabase/client";
import { Session, User } from "@supabase/supabase-js";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1️⃣ Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false); // ✅ CRITICAL FIX
    });

    // 2️⃣ Listen for auth changes
    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
      });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}
