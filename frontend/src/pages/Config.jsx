import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Globe, SignOut, Sun, Moon } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Config() {
  const { user, lang, switchLang, logout, refresh, theme, switchTheme } = useAuth();
  const nav = useNavigate();
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confPin, setConfPin] = useState("");
  const [name, setName] = useState(user?.name || "");
  const [dob, setDob] = useState(user?.dob || "");
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.post("/auth/profile", { name, dob: dob || null });
      await refresh();
      toast.success(t(lang, "saved"));
    } catch (e) {
      toast.error(t(lang, "failed"));
    } finally {
      setSaving(false);
    }
  };

  const changePin = async () => {
    if (newPin !== confPin) return toast.error(lang === "id" ? "Konfirmasi tidak cocok" : "Confirmation doesn't match");
    if (!/^\d{6}$/.test(newPin)) return toast.error(lang === "id" ? "Passcode harus 6 digit angka" : "Passcode must be 6 digits");
    try {
      await api.post("/auth/change-passcode", { old_passcode: oldPin, new_passcode: newPin });
      toast.success(t(lang, "saved"));
      setOldPin(""); setNewPin(""); setConfPin("");
    } catch (e) {
      toast.error(e?.response?.data?.detail || t(lang, "failed"));
    }
  };

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">{t(lang, "config")}</p>
        <h1 className="font-editorial text-3xl text-ink mt-1">{t(lang, "profile")}</h1>
      </div>

      <section className="card-base p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={20} weight="duotone" className="text-forest" />
          <h2 className="font-heading text-lg text-ink">{t(lang, "profile")}</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-muted">Nama</label>
            <Input data-testid="profile-name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white" />
          </div>
          <div>
            <label className="text-xs text-ink-muted">{t(lang, "set_dob")}</label>
            <Input data-testid="profile-dob" type="date" value={dob || ""} onChange={(e) => setDob(e.target.value)} className="bg-white" />
            <p className="text-[11px] text-ink-muted mt-1">{lang === "id" ? "Digunakan untuk filter beasiswa otomatis." : "Used for automatic scholarship filtering."}</p>
          </div>
          <Button data-testid="save-profile" onClick={saveProfile} disabled={saving} className="bg-forest hover:bg-forest-hover">{t(lang, "save")}</Button>
        </div>
      </section>

      <section className="card-base p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={20} weight="duotone" className="text-forest" />
          <h2 className="font-heading text-lg text-ink">{t(lang, "change_passcode")}</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ink-muted">{t(lang, "old_passcode")}</label>
            <Input data-testid="old-passcode" type="password" inputMode="numeric" maxLength={6} value={oldPin} onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))} className="bg-white" />
          </div>
          <div>
            <label className="text-xs text-ink-muted">{t(lang, "new_passcode")}</label>
            <Input data-testid="new-passcode" type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))} className="bg-white" />
          </div>
          <div>
            <label className="text-xs text-ink-muted">{t(lang, "confirm_passcode")}</label>
            <Input data-testid="confirm-passcode" type="password" inputMode="numeric" maxLength={6} value={confPin} onChange={(e) => setConfPin(e.target.value.replace(/\D/g, ""))} className="bg-white" />
          </div>
          <Button data-testid="change-passcode-submit" onClick={changePin} className="bg-forest hover:bg-forest-hover">{t(lang, "save")}</Button>
        </div>
      </section>

      <section className="card-base p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          {theme === "dark" ? <Moon size={20} weight="duotone" className="text-bronze" /> : <Sun size={20} weight="duotone" className="text-bronze" />}
          <h2 className="font-heading text-lg text-ink">{t(lang, "dark_mode")}</h2>
        </div>
        <div className="flex gap-2">
          <button
            data-testid="theme-light"
            onClick={() => switchTheme("light")}
            className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 ${theme === "light" ? "bg-forest text-white border-forest" : "bg-white text-ink-body border-[#E8E6E1]"}`}
          >
            <Sun size={16} weight="fill" /> {t(lang, "light")}
          </button>
          <button
            data-testid="theme-dark"
            onClick={() => switchTheme("dark")}
            className={`flex-1 py-3 rounded-lg border flex items-center justify-center gap-2 ${theme === "dark" ? "bg-forest text-white border-forest" : "bg-white text-ink-body border-[#E8E6E1]"}`}
          >
            <Moon size={16} weight="fill" /> {t(lang, "dark")}
          </button>
        </div>
      </section>

      <section className="card-base p-6 mb-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={20} weight="duotone" className="text-forest" />
          <h2 className="font-heading text-lg text-ink">{t(lang, "language")}</h2>
        </div>
        <div className="flex gap-2">
          <button
            data-testid="config-lang-id"
            onClick={() => switchLang("id")}
            className={`flex-1 py-3 rounded-lg border ${lang === "id" ? "bg-forest text-white border-forest" : "bg-white text-ink-body border-[#E8E6E1]"}`}
          >
            🇮🇩 Bahasa Indonesia
          </button>
          <button
            data-testid="config-lang-en"
            onClick={() => switchLang("en")}
            className={`flex-1 py-3 rounded-lg border ${lang === "en" ? "bg-forest text-white border-forest" : "bg-white text-ink-body border-[#E8E6E1]"}`}
          >
            🇬🇧 English
          </button>
        </div>
      </section>

      <Button
        data-testid="config-logout"
        variant="outline"
        onClick={() => { logout(); nav("/"); }}
        className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
      >
        <SignOut size={16} className="mr-2" /> {t(lang, "logout")}
      </Button>
    </div>
  );
}
