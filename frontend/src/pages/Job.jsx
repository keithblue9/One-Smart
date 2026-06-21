import { useEffect, useState } from "react";
import { Briefcase, MapPin, GlobeStand, TrendUp, Wallet, ChartBar, Lightbulb } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import AIInsightButton from "@/components/AIInsightButton";
import BookmarkButton from "@/components/BookmarkButton";
import CVGenerator from "@/components/CVGenerator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

const riskTone = { "Very Low": "bg-[#E5EFE7] text-forest", Low: "bg-[#E5EFE7] text-forest", Medium: "bg-[#F4E8D9] text-bronze" };

export default function Job() {
  const { lang } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [sites, setSites] = useState([]);
  const [trends, setTrends] = useState(null);
  const [tips, setTips] = useState(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/job/companies"),
      api.get("/job/freelance-sites"),
      api.get("/job/trends"),
      api.get("/job/portfolio-tips"),
    ]).then(([c, s, tr, tp]) => {
      setCompanies(c.data.items);
      setSites(s.data.items);
      setTrends(tr.data);
      setTips(tp.data);
    });
  }, []);

  const filteredCompanies = companies.filter(c =>
    !filter || c.location.toLowerCase().includes(filter.toLowerCase()) || c.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">{t(lang, "job")}</p>
        <h1 className="font-editorial text-3xl text-ink mt-1">{t(lang, "top_companies")}</h1>
      </div>

      <Tabs defaultValue="companies">
        <TabsList className="bg-stone flex flex-wrap h-auto" data-testid="job-tabs">
          <TabsTrigger value="companies" data-testid="tab-companies">{t(lang, "top_companies")}</TabsTrigger>
          <TabsTrigger value="freelance" data-testid="tab-freelance">{t(lang, "freelance_sites")}</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">{t(lang, "job_trends")}</TabsTrigger>
          <TabsTrigger value="cv" data-testid="tab-cv">{t(lang, "cv_recommendation")}</TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="mt-5 space-y-4">
          <Input
            data-testid="company-filter"
            placeholder={lang === "id" ? "Filter lokasi atau nama perusahaan..." : "Filter by location or company name..."}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white max-w-md"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCompanies.map((c) => (
              <article key={c.id} className="card-base p-5" data-testid={`company-${c.id}`}>
                <div className="flex items-start gap-3">
                  <img src={c.logo} alt={c.name} className="h-12 w-12 rounded-lg bg-stone object-contain p-1.5" onError={(e) => { e.target.style.display = 'none'; }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-heading text-lg text-ink">{c.name}</h3>
                      <div className="flex items-center gap-1">
                        <BookmarkButton kind="company" itemId={c.id} payload={{ name: c.name, location: c.location, industry: c.industry }} testId={`bookmark-company-${c.id}`} />
                        {c.remote && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#E5EFE7] text-forest">{t(lang, "remote")}</span>}
                      </div>
                    </div>
                    <p className="text-xs text-ink-muted">{c.industry}</p>
                    <div className="flex items-center gap-1 text-xs text-ink-muted mt-1">
                      <MapPin size={12} /> {c.location}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted">{t(lang, "salary")}</div>
                    <div className="text-ink font-medium">${c.salary_usd}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted">Roles</div>
                    <div className="text-ink text-xs">{c.roles.slice(0, 2).join(", ")}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-forest hover:underline" data-testid={`company-link-${c.id}`}>{t(lang, "visit")} →</a>
                  <AIInsightButton topic="salary" context={{ company: c.name, industry: c.industry, location: c.location, roles: c.roles }} testId={`ai-company-${c.id}`} />
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="freelance" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sites.map((s) => (
              <article key={s.id} className="card-base p-5" data-testid={`freelance-${s.id}`}>
                <div className="flex items-start gap-3">
                  <img src={s.logo} alt={s.name} className="h-10 w-10 rounded-lg bg-stone object-contain p-1.5" onError={(e) => { e.target.style.display = 'none'; }} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-base text-ink">{s.name}</h3>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${riskTone[s.scam_risk] || "bg-stone"}`}>★ {s.rating}</span>
                    </div>
                    <p className="text-xs text-ink-muted">{s.category}</p>
                  </div>
                </div>
                <p className="text-sm text-ink-body mt-3 leading-relaxed">{s.description}</p>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-ink-muted">{t(lang, "scam_risk")}: <span className="text-ink">{s.scam_risk}</span></span>
                  <div className="flex gap-2">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-forest hover:underline">{t(lang, "visit")} →</a>
                  </div>
                </div>
                <div className="mt-3">
                  <AIInsightButton topic="freelance_profile" context={{ platform: s.name, category: s.category }} testId={`ai-freelance-${s.id}`} />
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="mt-5 space-y-6">
          {trends && (
            <>
              <section className="card-base p-6">
                <h3 className="font-heading text-lg text-ink flex items-center gap-2 mb-4"><TrendUp size={20} weight="duotone" className="text-forest" />{lang === "id" ? "Tahun Ini" : "This Year"}</h3>
                <div className="space-y-3">
                  {trends.current_year.map((r, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-[#E8E6E1] last:border-0 pb-2 last:pb-0">
                      <div>
                        <div className="font-medium text-ink text-sm">{r.role}</div>
                        <div className="text-xs text-ink-muted">{r.demand} demand · {t(lang, "salary")}: ${r.median_salary_usd}</div>
                      </div>
                      <span className="text-sm font-heading text-forest">{r.growth}</span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="card-base p-6">
                <h3 className="font-heading text-lg text-ink flex items-center gap-2 mb-4"><ChartBar size={20} weight="duotone" className="text-bronze" />{t(lang, "next_5y")}</h3>
                <div className="space-y-3">
                  {trends.five_year.map((r, i) => (
                    <div key={i} className="border-b border-[#E8E6E1] last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-ink text-sm">{r.role}</span>
                        <span className="text-xs bg-stone text-ink-body px-2 py-0.5 rounded-full">{r.outlook}</span>
                      </div>
                      <p className="text-xs text-ink-muted mt-1">{r.note}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5">
                  <AIInsightButton topic="trend_advice" context={trends} label={lang === "id" ? "AI Advice Karir" : "AI Career Advice"} testId="ai-trend-advice" />
                </div>
              </section>
            </>
          )}
        </TabsContent>

        <TabsContent value="cv" className="mt-5 space-y-5">
          <CVGenerator />
          <div className="card-base p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={22} weight="duotone" className="text-bronze" />
              <h2 className="font-heading text-xl text-ink">{lang === "id" ? "Konsultasi AI CV" : "AI CV Consult"}</h2>
            </div>
            <p className="text-sm text-ink-body mb-4 leading-relaxed">
              {lang === "id" ? "Pilih target spesifik untuk dapat rekomendasi mendalam, atau buat CV PDF di atas." : "Pick a specific target for deep AI advice, or generate PDF above."}
            </p>
            <div className="flex flex-wrap gap-2">
              {["Software Engineer at Google", "Product Manager at Meta", "Data Scientist - remote", "UX Designer freelance"].map((tg) => (
                <AIInsightButton
                  key={tg}
                  topic="cv_recommendation"
                  context={{ target: tg }}
                  label={tg}
                  testId={`ai-cv-${tg.replace(/\s+/g, '-')}`}
                />
              ))}
            </div>
            <div className="mt-5">
              <h3 className="font-heading text-base text-ink mb-2">{t(lang, "portfolio_tips")} - Job</h3>
              <ul className="text-sm list-disc pl-5 space-y-1">
                {tips?.job?.map((tx, i) => <li key={i}>{tx}</li>)}
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
