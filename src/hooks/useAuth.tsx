import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { api, clearToken, getToken, setToken } from "@/services/api-client";
import { queryClient } from "@/lib/query-client";

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string };
  phone?: string | null;
} | null;
type AuthSession = { access_token: string; user?: AuthUser } | null;

interface AuthContextType {
  session: AuthSession;
  user: AuthUser;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function userFromProfile(profile: any): NonNullable<AuthUser> {
  return {
    id: profile.id,
    email: profile.email,
    phone: profile.phone,
    user_metadata: { full_name: profile.name },
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession>(null);
  const [user, setUser] = useState<AuthUser>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const localToken = getToken();
      if (localToken) {
        if (!mounted) return;
        setSession({ access_token: localToken });

        try {
          const profile = await api.get<any>('/auth/me');
          if (mounted) {
            const profileUser = userFromProfile(profile);
            setUser(profileUser);
            setSession({ access_token: localToken, user: profileUser });
          }
        } catch (error) {
          console.error("[Auth] Sessao local invalida:", error);
          clearToken();
          if (mounted) {
            setSession(null);
            setUser(null);
          }
        } finally {
          if (mounted) setIsLoading(false);
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (session?.access_token) {
        setToken(session.access_token);
        setSession({ access_token: session.access_token, user: session.user as any });
        setUser(session.user as any);
      } else {
        setSession(null);
        setUser(null);
      }
      setIsLoading(false);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (getToken() && !supabaseSession?.access_token) {
        return;
      }

      if (supabaseSession?.access_token) {
        setToken(supabaseSession.access_token);
        setSession({ access_token: supabaseSession.access_token, user: supabaseSession.user as any });
        setUser(supabaseSession.user as any);
      } else {
        clearToken();
        setSession(null);
        setUser(null);
        queryClient.clear();
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      clearToken();
      localStorage.removeItem('economyzee_org_id');
      await supabase.auth.signOut();
      queryClient.clear();
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const value = useMemo(
    () => ({ session, user, isLoading, signOut }),
    [session, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
