import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GraduationCap, Briefcase, ChartLineUp, Globe, NotePencil,
  Gear, House, BookmarkSimple, Sun, Moon, List, X } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import LifeGoalAssistant from "@/components/LifeGoalAssistant";

const items = [
  { to: "/app",             icon: House,          key: "home",       testId: "nav-home" },
  { to: "/app/education",   icon: GraduationCap,  key: "education",  testId: "nav-education" },
  { to: "/app/job",         icon: Briefcase,      key: "job",        testId: "nav-job" },
  { to: "/app/investment",  icon: ChartLineUp,    key: "investment", testId: "nav-investment" },
  { to: "/app/world",       icon: Globe,          key: "world",      testId: "nav-world" },
  { to: "/app/quick",       icon: NotePencil,     key: "quick",      testId: "nav-quick" },
  { to: "/app/bookmarks",   icon: BookmarkSimple, key: "bookmarks",  testId: "nav-bookmarks" },
  { to: "/app/config",      icon: Gear,           key: "config",     testId: "nav-config" },
];

export default function Layout({ children }) {
  const { lang, switchLang, logout, theme, switchTheme } = useAuth();
  const nav = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-linen text-ink-body">

      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 border-r border-[#E8E6E1] bg-white flex-col p-6 z-30">
        <div className="mb-10">
          <div className="font-editorial text-2xl text-ink leading-tight">One Smart</div>
          <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mt-1">{t(lang, "your_hub")}</div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} end={it.to === "/app"} data-testid={it.testId}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-forest text-white" : "text-ink-body hover:bg-stone"}`}>
              <it.icon size={20} weight="duotone"/>
              <span>{t(lang, it.key)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between pt-4 border-t border-[#E8E6E1]">
          <div className="flex gap-1 items-center">
            <button onClick={() => switchLang("id")} data-testid="lang-id"
              className={`text-xs px-2.5 py-1 rounded-full ${lang==="id"?"bg-forest text-white":"bg-stone text-ink-muted"}`}>ID</button>
            <button onClick={() => switchLang("en")} data-testid="lang-en"
              className={`text-xs px-2.5 py-1 rounded-full ${lang==="en"?"bg-forest text-white":"bg-stone text-ink-muted"}`}>EN</button>
            <button data-testid="theme-toggle" onClick={() => switchTheme(theme==="dark"?"light":"dark")}
              className="ml-1 h-7 w-7 inline-flex items-center justify-center rounded-full bg-stone text-ink-body hover:text-bronze">
              {theme==="dark" ? <Sun size={14} weight="fill"/> : <Moon size={14} weight="fill"/>}
            </button>
          </div>
          <button data-testid="logout-button" onClick={() => { logout(); nav("/"); }}
            className="text-xs text-ink-muted hover:text-forest">{t(lang, "logout")}</button>
        </div>
      </aside>

      {/* ── Mobile header (hamburger + logo + controls) ─────────────── */}
      <header className="lg:hidden sticky top-0 z-30 bg-linen/95 backdrop-blur-xl border-b border-[#E8E6E1] pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Hamburger */}
          <button onClick={() => setDrawerOpen(true)} className="h-9 w-9 flex items-center justify-center rounded-xl bg-stone text-ink-body">
            <List size={20} weight="bold"/>
          </button>

          <div className="font-editorial text-xl text-ink">One Smart</div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button onClick={() => switchTheme(theme==="dark"?"light":"dark")} data-testid="theme-toggle-mobile"
              className="h-7 w-7 inline-flex items-center justify-center rounded-full bg-stone text-ink-body">
              {theme==="dark" ? <Sun size={14} weight="fill"/> : <Moon size={14} weight="fill"/>}
            </button>
            <button onClick={() => switchLang("id")} data-testid="lang-id-mobile"
              className={`text-xs px-2.5 py-1 rounded-full ${lang==="id"?"bg-forest text-white":"bg-stone text-ink-muted"}`}>ID</button>
            <button onClick={() => switchLang("en")} data-testid="lang-en-mobile"
              className={`text-xs px-2.5 py-1 rounded-full ${lang==="en"?"bg-forest text-white":"bg-stone text-ink-muted"}`}>EN</button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer overlay ────────────────────────────────────── */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)}/>

          {/* Drawer panel */}
          <div className="relative w-72 max-w-[80vw] bg-white h-full flex flex-col shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E6E1]">
              <div>
                <div className="font-editorial text-xl text-ink">One Smart</div>
                <div className="text-[10px] uppercase tracking-wider text-ink-muted">{t(lang, "your_hub")}</div>
              </div>
              <button onClick={() => setDrawerOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-stone text-ink-muted hover:text-ink">
                <X size={16} weight="bold"/>
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
              {items.map((it) => (
                <NavLink key={it.to} to={it.to} end={it.to === "/app"} data-testid={`${it.testId}-mobile`}
                  onClick={() => setDrawerOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? "bg-forest text-white" : "text-ink-body hover:bg-stone"}`}>
                  <it.icon size={20} weight="duotone"/>
                  <span>{t(lang, it.key)}</span>
                </NavLink>
              ))}
            </nav>

            {/* Drawer footer */}
            <div className="px-4 pb-6 pt-3 border-t border-[#E8E6E1] flex items-center justify-between">
              <button onClick={() => { logout(); nav("/"); setDrawerOpen(false); }}
                className="text-sm text-ink-muted hover:text-forest font-medium">{t(lang, "logout")}</button>
              <div className="text-[10px] text-slate-300">One Smart v1.0</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="lg:ml-64 pb-10">{children}</main>

      {/* ── Life Goal Assistant FAB ──────────────────────────────────── */}
      <LifeGoalAssistant />
    </div>
  );
}
