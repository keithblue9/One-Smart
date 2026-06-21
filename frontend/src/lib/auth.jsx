import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(() => localStorage.getItem("os_lang") || "id");
  const [theme, setTheme] = useState(() => localStorage.getItem("os_theme") || "light");

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("os_theme", theme);
  }, [theme]);

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
      if (data.theme) setTheme(data.theme);
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
    if (data.user?.theme) setTheme(data.user.theme);
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

  const switchTheme = (t) => {
    setTheme(t);
    if (user) api.post("/auth/profile", { theme: t }).catch(() => {});
  };

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, login, logout, lang, switchLang, theme, switchTheme, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
