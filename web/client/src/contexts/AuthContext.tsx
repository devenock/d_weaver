import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "@/lib/auth-api";
import type { ApiUser } from "@/lib/auth-api";
import { ApiError } from "@/lib/api";

const REFRESH_TOKEN_KEY = "dweaver_refresh_token";

interface AuthState {
  user: ApiUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    loading: true,
  });

  const restoreSession = useCallback(async () => {
    const stored = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!stored) {
      setState((s) => ({ ...s, user: null, accessToken: null, refreshToken: null, loading: false }));
      return;
    }
    try {
      const result = await authApi.refresh(stored);
      localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh_token);
      setState({
        user: result.user,
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        loading: false,
      });
    } catch {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setState((s) => ({ ...s, user: null, accessToken: null, refreshToken: null, loading: false }));
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh_token);
    setState({
      user: result.user,
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      loading: false,
    });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const result = await authApi.register(email, password);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh_token);
    setState({
      user: result.user,
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      loading: false,
    });
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = state.refreshToken ?? localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // ignore
      }
    }
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      loading: false,
    });
  }, [state.refreshToken]);

  const getAccessToken = useCallback(() => state.accessToken, [state.accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      isAuthenticated: state.user != null,
      login,
      register,
      logout,
      getAccessToken,
    }),
    [state, login, register, logout, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}

/** Re-export for components that need to show API error messages */
export { ApiError };
