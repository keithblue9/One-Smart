import { NavLink, useNavigate } from "react-router-dom";
import { GraduationCap, Briefcase, ChartLineUp, Globe, NotePencil, Gear, House, BookmarkSimple, Sun, Moon } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

const items = [
  { to: "/app", icon: House, key: "home", testId: "nav-home" },
  { to: "/app/education", icon: GraduationCap, key: "education", testId: "nav-education" },
  { to: "/app/job", icon: Briefcase, key: "job", testId: "nav-job" },
  { to: "/app/investment", icon: ChartLineUp, key: "investment", testId: "nav-investment" },
  { to: "/app/world", icon: Globe, key: "world", testId: "nav-world" },
  { to: "/app/quick", icon: NotePencil, key: "quick", testId: "nav-quick" },
  { to: "/app/bookmarks", icon: BookmarkSimple, key: "bookmarks", testId: "nav-bookmarks" },
  { to: "/app/config", icon: Gear, key: "config", testId: "nav-config" },
];

// Mobile bottom nav: 6 primary items (skip bookmarks to avoid clutter — accessible via desktop sidebar or Hub or direct URL)
const mobileItems = items.filter((i) => i.key !== "bookmarks");

export default function Layout({ children }) {
  const { lang, switchLang, logout, theme, switchTheme } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-linen text-ink-body">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 border-r border-[#E8E6E1] bg-white flex-col p-6 z-30">
        <div className="mb-10">
          <div className="font-editorial text-2xl text-ink leading-tight">One Smart</div>
          <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mt-1">{t(lang, "your_hub")}</div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/app"}
              data-testid={it.testId}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-forest text-white" : "text-ink-body hover:bg-stone"
                }`
              }
            >
              <it.icon size={20} weight="duotone" />
              <span>{t(lang, it.key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between pt-4 border-t border-[#E8E6E1]">
          <div className="flex gap-1 items-center">
            <button
              data-testid="lang-id"
              onClick={() => switchLang("id")}
              className={`text-xs px-2.5 py-1 rounded-full ${lang === "id" ? "bg-forest text-white" : "bg-stone text-ink-muted"}`}
            >
              ID
            </button>
            <button
              data-testid="lang-en"
              onClick={() => switchLang("en")}
              className={`text-xs px-2.5 py-1 rounded-full ${lang === "en" ? "bg-forest text-white" : "bg-stone text-ink-muted"}`}
            >
              EN
            </button>
            <button
              data-testid="theme-toggle"
              onClick={() => switchTheme(theme === "dark" ? "light" : "dark")}
              className="ml-1 h-7 w-7 inline-flex items-center justify-center rounded-full bg-stone text-ink-body hover:text-bronze"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={14} weight="fill" /> : <Moon size={14} weight="fill" />}
            </button>
          </div>
          <button
            data-testid="logout-button"
            onClick={() => { logout(); nav("/"); }}
            className="text-xs text-ink-muted hover:text-forest"
          >
            {t(lang, "logout")}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-30 bg-linen/85 backdrop-blur-xl border-b border-[#E8E6E1] pt-safe">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="font-editorial text-xl text-ink">One Smart</div>
          <div className="flex items-center gap-1">
            <button
              data-testid="theme-toggle-mobile"
              onClick={() => switchTheme(theme === "dark" ? "light" : "dark")}
              className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-stone text-ink-body"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={14} weight="fill" /> : <Moon size={14} weight="fill" />}
            </button>
            <button
              data-testid="lang-id-mobile"
              onClick={() => switchLang("id")}
              className={`text-xs px-2.5 py-1 rounded-full ${lang === "id" ? "bg-forest text-white" : "bg-stone text-ink-muted"}`}
            >
              ID
            </button>
            <button
              data-testid="lang-en-mobile"
              onClick={() => switchLang("en")}
              className={`text-xs px-2.5 py-1 rounded-full ${lang === "en" ? "bg-forest text-white" : "bg-stone text-ink-muted"}`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="lg:ml-64 pb-28 lg:pb-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[#E8E6E1] pb-safe z-30">
        <div className="grid grid-cols-7 px-2 pt-2">
          {mobileItems.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/app"}
              data-testid={`${it.testId}-mobile`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 rounded-lg text-[10px] transition-colors ${
                  isActive ? "text-forest" : "text-ink-muted"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <it.icon size={20} weight={isActive ? "fill" : "regular"} />
                  <span className="leading-none">{t(lang, it.key)}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
