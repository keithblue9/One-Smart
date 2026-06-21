import { useEffect, useState } from "react";
import { CalendarBlank, CheckCircle, XCircle, Lightbulb } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import AIInsightButton from "@/components/AIInsightButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function Pill({ children, tone = "default" }) {
  const tones = {
    default: "bg-stone text-ink-body",
    ok: "bg-[#E5EFE7] text-forest",
    no: "bg-red-50 text-red-700",
    bronze: "bg-[#F3E8DD] text-[#B76E38]",
  };
  return <span className={`text-[11px] px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>;
}

export default function Education() {
  const { user, lang } = useAuth();
  const [list, setList] = useState([]);
  const [age, setAge] = useState(null);
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/education/scholarships"),
      api.get("/education/portfolio-tips"),
    ]).then(([s, p]) => {
      setList(s.data.items);
      setAge(s.data.age);
      setTips(p.data.tips);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = eligibleOnly ? list.filter(x => x.eligible) : list;

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">{t(lang, "education")}</p>
        <h1 className="font-editorial text-3xl text-ink mt-1">{t(lang, "scholarships")}</h1>
        {age != null ? (
          <p className="text-sm text-ink-muted mt-2">{t(lang, "age")}: <strong className="text-ink">{age}</strong></p>
        ) : (
          <p className="text-sm text-bronze mt-2">{t(lang, "set_age_for_eligibility")}</p>
        )}
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="bg-stone" data-testid="education-tabs">
          <TabsTrigger value="list" data-testid="tab-scholarships">{t(lang, "scholarships")}</TabsTrigger>
          <TabsTrigger value="tips" data-testid="tab-portfolio-tips">{t(lang, "portfolio_tips")}</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-5">
          <div className="flex items-center gap-2 mb-4">
            <button
              data-testid="toggle-eligible-only"
              onClick={() => setEligibleOnly(v => !v)}
              className={`text-xs px-3 py-1.5 rounded-full border ${eligibleOnly ? "bg-forest text-white border-forest" : "bg-white text-ink-body border-[#E8E6E1]"}`}
            >
              {t(lang, "eligible_only")}
            </button>
            <span className="text-xs text-ink-muted">{filtered.length} {t(lang, "scholarships").toLowerCase()}</span>
          </div>

          {loading && <div className="text-sm text-ink-muted">{t(lang, "loading")}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((s) => (
              <article key={s.id} className="card-base p-5 flex flex-col gap-3" data-testid={`scholarship-${s.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-lg text-ink leading-tight">{s.name}</h3>
                    <p className="text-xs text-ink-muted mt-0.5">{s.country}</p>
                  </div>
                  {s.eligible ? (
                    <Pill tone="ok"><CheckCircle size={12} weight="fill" className="inline mr-1" />{t(lang, "eligible")}</Pill>
                  ) : (
                    <Pill tone="no"><XCircle size={12} weight="fill" className="inline mr-1" />{t(lang, "not_eligible")}</Pill>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <CalendarBlank size={14} className="text-ink-muted" />
                  <span className="text-ink-muted">{t(lang, "deadline")}:</span>
                  <span className="text-ink font-medium">{s.deadline}</span>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-ink-muted mb-1">{t(lang, "benefits")}</p>
                  <ul className="text-sm text-ink-body list-disc pl-5 space-y-0.5">
                    {s.benefits.slice(0, 3).map((b, i) => <li key={i}>{b}</li>)}
                  </ul>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.1em] text-ink-muted mb-1">{t(lang, "requirements")}</p>
                  <ul className="text-sm text-ink-body list-disc pl-5 space-y-0.5">
                    {s.requirements.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>

                <div className="flex items-center justify-between mt-1">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`scholarship-link-${s.id}`}
                    className="text-xs text-forest underline-offset-2 hover:underline"
                  >
                    {t(lang, "visit")} →
                  </a>
                  <AIInsightButton
                    topic="scholarship"
                    context={{ name: s.name, country: s.country, deadline: s.deadline, benefits: s.benefits, requirements: s.requirements, user_age: age }}
                    testId={`ai-scholarship-${s.id}`}
                  />
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tips" className="mt-5">
          <div className="card-base p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb size={22} weight="duotone" className="text-bronze" />
              <h2 className="font-heading text-xl text-ink">{t(lang, "portfolio_tips")}</h2>
            </div>
            <ol className="space-y-3 list-decimal pl-5">
              {tips.map((tip, i) => <li key={i} className="text-sm leading-relaxed">{tip}</li>)}
            </ol>
            <div className="mt-5 flex gap-2">
              <AIInsightButton
                topic="general"
                context={{ goal: "Membangun portofolio kuat untuk beasiswa S2 luar negeri", current_age: age }}
                label={lang === "id" ? "Insight Personal" : "Personal Insight"}
                testId="ai-portfolio-personal"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
