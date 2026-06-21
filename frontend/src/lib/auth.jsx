import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(() => localStorage.getItem("os_lang") || "id");

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("os_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      if (data.language) {
        setLang(data.language);
        localStorage.setItem("os_lang", data.language);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = async (passcode) => {
    const { data } = await api.post("/auth/login", { passcode });
    localStorage.setItem("os_token", data.token);
    setUser(data.user);
    if (data.user?.language) {
      setLang(data.user.language);
      localStorage.setItem("os_lang", data.user.language);
    }
  };

  const logout = () => {
    localStorage.removeItem("os_token");
    setUser(null);
  };

  const switchLang = (l) => {
    setLang(l);
    localStorage.setItem("os_lang", l);
    if (user) api.post("/auth/profile", { language: l }).catch(() => {});
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, login, logout, lang, switchLang, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
