import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type AuthUser, type LoginInput, type SignupInput } from "../api";

export type { AuthUser } from "../api";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  error: unknown;
  isAuthenticated: boolean;
  role: string | null;
  login: (input: LoginInput) => Promise<AuthUser>;
  signup: (input: SignupInput) => Promise<AuthUser>;
  adminLogin: (input: LoginInput) => Promise<AuthUser>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

/**
 * Auth hook with graceful offline fallback.
 *
 * On localhost the app runs full-stack, so this reads the real session via
 * the tRPC `auth.me` endpoint. On Netlify there is no backend (`/api/*` =>
 * 404), so it settles as "not authenticated" and the UI keeps its demo
 * behaviour — the same surface as a real auth hook either way.
 */
export function useAuth(_options?: UseAuthOptions): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    try {
      const current = await api.getMe();
      setUser(current);
      setError(null);
    } catch (err) {
      setError(err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const current = await api.login(input);
    setUser(current);
    setError(null);
    return current;
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const current = await api.signup(input);
    setUser(current);
    setError(null);
    return current;
  }, []);

  const adminLogin = useCallback(async (input: LoginInput) => {
    const current = await api.adminLogin(input);
    setUser(current);
    setError(null);
    return current;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
      role: user?.role ?? null,
      login,
      signup,
      adminLogin,
      refresh,
      logout,
    }),
    [user, loading, error, login, signup, adminLogin, refresh, logout]
  );
}