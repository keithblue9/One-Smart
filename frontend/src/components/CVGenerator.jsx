import { useState } from "react";
import { Plus, Trash, DownloadSimple, FilePdf, Sparkle } from "@phosphor-icons/react";
import { api, API } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const emptyExp = () => ({ title: "", company: "", period: "", bullets: "" });
const emptyEdu = () => ({ degree: "", school: "", period: "", note: "" });

export default function CVGenerator() {
  const { lang } = useAuth();
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState({
    name: "",
    role_target: "",
    summary: "",
    email: "",
    phone: "",
    location: "",
    experiences: [emptyExp()],
    education: [emptyEdu()],
    skills_str: "",
  });

  const upd = (patch) => setData((d) => ({ ...d, ...patch }));

  const updateExp = (i, patch) => setData((d) => {
    const experiences = d.experiences.map((e, idx) => idx === i ? { ...e, ...patch } : e);
    return { ...d, experiences };
  });
  const updateEdu = (i, patch) => setData((d) => {
    const education = d.education.map((e, idx) => idx === i ? { ...e, ...patch } : e);
    return { ...d, education };
  });

  const generate = async () => {
    if (!data.name.trim() || !data.role_target.trim()) {
      toast.error(lang === "id" ? "Nama & Target Role wajib" : "Name & Target Role required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: data.name,
        role_target: data.role_target,
        summary: data.summary,
        email: data.email,
        phone: data.phone,
        location: data.location,
        experiences: data.experiences.filter((e) => e.title || e.company).map((e) => ({
          ...e,
          bullets: e.bullets ? e.bullets.split("\n").map((s) => s.trim()).filter(Boolean) : [],
        })),
        education: data.education.filter((e) => e.degree || e.school),
        skills: data.skills_str.split(",").map((s) => s.trim()).filter(Boolean),
        language: lang,
      };
      const token = localStorage.getItem("os_token");
      const res = await fetch(`${API}/cv/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `OneSmart_CV_${data.name.replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(lang === "id" ? "CV PDF berhasil di-download" : "CV PDF downloaded");
    } catch (e) {
      toast.error((lang === "id" ? "Gagal: " : "Failed: ") + e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="ai-panel flex items-start gap-3">
        <Sparkle size={20} weight="fill" className="text-bronze mt-0.5" />
        <p className="text-sm">
          {lang === "id"
            ? "Isi data Anda. AI Claude Sonnet 4.5 akan memperkaya summary, action-verb bullets ATS-friendly, dan tips optimisasi sebelum PDF di-download."
            : "Fill your details. Claude Sonnet 4.5 will enrich your summary, action-verb bullets, and add optimization tips before downloading the PDF."}
        </p>
      </div>

      {/* Basics */}
      <section className="card-base p-5 space-y-3" data-testid="cv-basics">
        <h3 className="font-heading text-base text-ink">{t(lang, "profile")}</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-ink-muted">{t(lang, "your_name")} *</label>
            <Input data-testid="cv-name" value={data.name} onChange={(e) => upd({ name: e.target.value })} className="bg-white" />
          </div>
          <div>
            <label className="text-xs text-ink-muted">{t(lang, "target_role")} *</label>
            <Input data-testid="cv-target" value={data.role_target} onChange={(e) => upd({ role_target: e.target.value })} placeholder="Senior PM at Google" className="bg-white" />
          </div>
          <div>
            <label className="text-xs text-ink-muted">{t(lang, "email")}</label>
            <Input data-testid="cv-email" type="email" value={data.email} onChange={(e) => upd({ email: e.target.value })} className="bg-white" />
          </div>
          <div>
            <label className="text-xs text-ink-muted">{t(lang, "phone")}</label>
            <Input data-testid="cv-phone" value={data.phone} onChange={(e) => upd({ phone: e.target.value })} className="bg-white" />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-ink-muted">{t(lang, "location")}</label>
            <Input data-testid="cv-location" value={data.location} onChange={(e) => upd({ location: e.target.value })} placeholder="Jakarta, Indonesia" className="bg-white" />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-ink-muted">{t(lang, "summary_profile")} ({t(lang, "optional")})</label>
            <Textarea data-testid="cv-summary" rows={2} value={data.summary} onChange={(e) => upd({ summary: e.target.value })} className="bg-white" placeholder={lang === "id" ? "Kosongkan untuk dibuatkan AI" : "Leave empty to let AI generate"} />
          </div>
        </div>
      </section>

      {/* Experiences */}
      <section className="card-base p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base text-ink">Experience</h3>
          <Button data-testid="cv-add-exp" variant="outline" size="sm" onClick={() => upd({ experiences: [...data.experiences, emptyExp()] })} className="border-[#E8E6E1]"><Plus size={14} className="mr-1" /> {t(lang, "add_experience")}</Button>
        </div>
        {data.experiences.map((e, i) => (
          <div key={i} className="border border-[#E8E6E1] rounded-xl p-4 space-y-2" data-testid={`cv-exp-${i}`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              <Input data-testid={`cv-exp-title-${i}`} placeholder={t(lang, "role_title")} value={e.title} onChange={(ev) => updateExp(i, { title: ev.target.value })} className="bg-white" />
              <Input data-testid={`cv-exp-company-${i}`} placeholder={t(lang, "company")} value={e.company} onChange={(ev) => updateExp(i, { company: ev.target.value })} className="bg-white" />
              <Input data-testid={`cv-exp-period-${i}`} placeholder="2020 — 2024" value={e.period} onChange={(ev) => updateExp(i, { period: ev.target.value })} className="bg-white" />
            </div>
            <Textarea data-testid={`cv-exp-bullets-${i}`} rows={3} placeholder={t(lang, "bullets")} value={e.bullets} onChange={(ev) => updateExp(i, { bullets: ev.target.value })} className="bg-white" />
            {data.experiences.length > 1 && (
              <button type="button" onClick={() => upd({ experiences: data.experiences.filter((_, idx) => idx !== i) })} className="text-xs text-red-600"><Trash size={12} className="inline" /> Remove</button>
            )}
          </div>
        ))}
      </section>

      {/* Education */}
      <section className="card-base p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base text-ink">{t(lang, "education")}</h3>
          <Button data-testid="cv-add-edu" variant="outline" size="sm" onClick={() => upd({ education: [...data.education, emptyEdu()] })} className="border-[#E8E6E1]"><Plus size={14} className="mr-1" /> {t(lang, "add_education")}</Button>
        </div>
        {data.education.map((e, i) => (
          <div key={i} className="border border-[#E8E6E1] rounded-xl p-4 space-y-2" data-testid={`cv-edu-${i}`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <Input data-testid={`cv-edu-degree-${i}`} placeholder={t(lang, "degree")} value={e.degree} onChange={(ev) => updateEdu(i, { degree: ev.target.value })} className="bg-white" />
              <Input data-testid={`cv-edu-school-${i}`} placeholder={t(lang, "school")} value={e.school} onChange={(ev) => updateEdu(i, { school: ev.target.value })} className="bg-white" />
              <Input data-testid={`cv-edu-period-${i}`} placeholder="2010 — 2014" value={e.period} onChange={(ev) => updateEdu(i, { period: ev.target.value })} className="bg-white" />
              <Input data-testid={`cv-edu-note-${i}`} placeholder={lang === "id" ? "Catatan (opsional)" : "Notes (optional)"} value={e.note} onChange={(ev) => updateEdu(i, { note: ev.target.value })} className="bg-white" />
            </div>
            {data.education.length > 1 && (
              <button type="button" onClick={() => upd({ education: data.education.filter((_, idx) => idx !== i) })} className="text-xs text-red-600"><Trash size={12} className="inline" /> Remove</button>
            )}
          </div>
        ))}
      </section>

      {/* Skills */}
      <section className="card-base p-5">
        <label className="text-xs text-ink-muted">{t(lang, "skills_label")}</label>
        <Input data-testid="cv-skills" value={data.skills_str} onChange={(e) => upd({ skills_str: e.target.value })} placeholder="Python, AWS, Leadership, React" className="bg-white mt-1" />
      </section>

      <Button data-testid="cv-generate" onClick={generate} disabled={busy} className="bg-forest hover:bg-forest-hover w-full">
        {busy ? <><Sparkle size={16} className="mr-2 animate-pulse" />{lang === "id" ? "Menghasilkan PDF (8-15 dtk)..." : "Generating PDF (8-15s)..."}</> : <><FilePdf size={16} className="mr-2" />{t(lang, "generate_cv")}</>}
      </Button>
    </div>
  );
}
