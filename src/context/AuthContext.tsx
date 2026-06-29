import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { api, ApiError } from "../lib/api";
import { clearSession, isSessionExpired, loadSession, persistSession, type AuthSession } from "../lib/auth";
import type { PerfilUsuario } from "../types/api";

interface AuthContextValue {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, senha: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: PerfilUsuario[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const current = loadSession();
    return isSessionExpired(current) ? null : current;
  });

  useEffect(() => {
    if (session && isSessionExpired(session)) {
      clearSession();
      setSession(null);
    }
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.token),
      isAdmin: session?.usuario.perfil === "ADMIN",
      async login(username: string, senha: string) {
        try {
          const response = await api.login(username, senha);
          setSession(persistSession(response));
        } catch (error) {
          if (error instanceof ApiError) throw error;
          throw new Error("Não foi possível fazer login.");
        }
      },
      logout() {
        clearSession();
        setSession(null);
      },
      hasRole(roles: PerfilUsuario[]) {
        return session ? roles.includes(session.usuario.perfil) : false;
      }
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
