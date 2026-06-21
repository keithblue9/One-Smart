import { useEffect, useState } from "react";
import { Newspaper, Buildings, DeviceMobile, Airplane, MapPin, ChartBar } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import AIInsightButton from "@/components/AIInsightButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const catTone = {
  Geopolitics: "bg-[#EFF3F1] text-forest",
  Economy: "bg-[#F4E8D9] text-bronze",
  Politics: "bg-stone text-ink-body",
  Tech: "bg-[#EBF1ED] text-forest",
};

export default function World() {
  const { lang } = useAuth();
  const [news, setNews] = useState([]);
  const [owid, setOwid] = useState([]);
  const [cities, setCities] = useState([]);
  const [tech, setTech] = useState([]);
  const [travel, setTravel] = useState([]);
  const [jak, setJak] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/world/news"),
      api.get("/world/owid"),
      api.get("/world/cities"),
      api.get("/world/tech"),
      api.get("/world/travel-id"),
      api.get("/world/jakarta"),
    ]).then(([n, o, c, t, tr, j]) => {
      setNews(n.data.items);
      setOwid(o.data.items);
      setCities(c.data.items);
      setTech(t.data.items);
      setTravel(tr.data.items);
      setJak(j.data.items);
    });
  }, []);

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">{t(lang, "world")}</p>
        <h1 className="font-editorial text-3xl text-ink mt-1">{lang === "id" ? "Dunia Hari Ini" : "World Today"}</h1>
      </div>

      <Tabs defaultValue="news">
        <TabsList className="bg-stone flex flex-wrap h-auto" data-testid="world-tabs">
          <TabsTrigger value="news" data-testid="tab-news">{t(lang, "news")}</TabsTrigger>
          <TabsTrigger value="owid" data-testid="tab-owid">{t(lang, "owid")}</TabsTrigger>
          <TabsTrigger value="tech" data-testid="tab-tech">{t(lang, "tech_gadgets")}</TabsTrigger>
          <TabsTrigger value="cities" data-testid="tab-cities">{t(lang, "cities")}</TabsTrigger>
          <TabsTrigger value="travel" data-testid="tab-travel">{t(lang, "travel_id")}</TabsTrigger>
          <TabsTrigger value="jakarta" data-testid="tab-jakarta">{t(lang, "jakarta_today")}</TabsTrigger>
        </TabsList>

        <TabsContent value="news" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {news.map((n, i) => (
              <article key={i} className="card-base p-5" data-testid={`news-${i}`}>
                <span className={`text-[11px] px-2 py-0.5 rounded-full ${catTone[n.category] || "bg-stone"}`}>{n.category}</span>
                <h3 className="font-editorial text-lg text-ink mt-2">{n.title}</h3>
                <p className="text-sm text-ink-body mt-2 leading-relaxed">{n.summary}</p>
                <div className="mt-3">
                  <AIInsightButton topic="general" context={{ headline: n.title, summary: n.summary, ask: "Berikan analisa mendalam dan dampaknya ke investor Indonesia & ekonomi global." }} testId={`ai-news-${i}`} />
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="owid" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {owid.map((o, i) => (
              <article key={i} className="card-base p-5" data-testid={`owid-${i}`}>
                <div className="flex items-start gap-3">
                  <ChartBar size={22} weight="duotone" className="text-forest mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-heading text-base text-ink">{o.topic}</h3>
                    <div className="text-xs text-ink-muted mt-1">
                      <span>{t(lang, "current")}: <strong className="text-ink">{o.current}</strong></span>
                    </div>
                    <div className="text-xs text-ink-muted">
                      <span>{t(lang, "next_5y")}: <strong className="text-ink">{o.five_year_projection}</strong></span>
                    </div>
                    <p className="text-sm text-ink-body mt-2 leading-relaxed">{o.insight}</p>
                    <a href={`https://${o.source}`} target="_blank" rel="noopener noreferrer" className="text-[11px] text-forest hover:underline">{o.source}</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tech" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {tech.map((g, i) => (
              <article key={i} className="card-base p-5" data-testid={`tech-${i}`}>
                <div className="flex items-start gap-3">
                  <DeviceMobile size={22} weight="duotone" className="text-bronze mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-heading text-base text-ink">{g.name}</h3>
                      <span className="text-xs text-ink-muted">{g.year}</span>
                    </div>
                    <div className="text-xs text-ink-muted">{g.category} · ${g.price_usd.toLocaleString()}</div>
                    <p className="text-sm text-ink-body mt-2 leading-relaxed">{g.highlight}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cities" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cities.map((c) => (
              <article key={c.city} className="card-base overflow-hidden" data-testid={`city-${c.city}`}>
                <div className="aspect-[16/9] bg-stone overflow-hidden">
                  <img src={c.image} alt={c.city} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-lg text-ink">{c.city}, {c.country}</h3>
                    <span className="text-xs text-forest font-medium">★ {c.score}</span>
                  </div>
                  <ul className="text-sm text-ink-body mt-2 list-disc pl-5 space-y-0.5">
                    {c.highlights.slice(0, 3).map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                  <div className="flex items-center justify-between mt-3 text-xs text-ink-muted">
                    <span>{t(lang, "avg_salary")}: ${c.avg_salary_usd.toLocaleString()}</span>
                    <span><Airplane size={11} className="inline" /> {c.flight_from_jkt}</span>
                  </div>
                  <div className="mt-3">
                    <AIInsightButton topic="city_insight" context={c} testId={`ai-city-${c.city}`} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="travel" className="mt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {travel.map((t, i) => (
              <article key={i} className="card-base overflow-hidden" data-testid={`travel-${i}`}>
                <div className="aspect-[16/9] bg-stone overflow-hidden">
                  <img src={t.image} alt={t.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-lg text-ink">{t.name}</h3>
                    <span className="text-[11px] bg-stone text-ink-body px-2 py-0.5 rounded-full">{t.type}</span>
                  </div>
                  <div className="text-xs text-ink-muted mt-0.5 flex items-center gap-1"><MapPin size={11} /> {t.region}</div>
                  <p className="text-sm text-ink-body mt-2 leading-relaxed">{t.highlight}</p>
                </div>
              </article>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="jakarta" className="mt-5">
          <div className="card-base p-5">
            <p className="text-xs text-ink-muted mb-3">
              {lang === "id"
                ? "Ringkasan agenda Jakarta — sumber dari berbagai akun IG/Twitter dan event resmi."
                : "Jakarta agenda summary — sourced from IG/Twitter accounts and official events."}
            </p>
            <div className="space-y-3">
              {jak.map((j, i) => (
                <div key={i} className="border-b border-[#E8E6E1] last:border-0 pb-3 last:pb-0" data-testid={`jak-${i}`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-medium text-ink text-sm">{j.title}</span>
                    <span className="text-[11px] bg-stone text-ink-body px-2 py-0.5 rounded-full">{j.category}</span>
                  </div>
                  <div className="text-xs text-ink-muted mt-1 flex items-center gap-2 flex-wrap">
                    <span>📅 {j.date}</span>
                    <span>📍 {j.location}</span>
                    <span className="text-bronze">{j.source}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <AIInsightButton topic="general" context={{ city: "Jakarta", ask: "Buatkan ringkasan apa yang menarik di Jakarta minggu ini, top 5 event/aktivitas, dan tips transportasi" }} label={lang === "id" ? "AI Ringkas Jakarta" : "AI Jakarta Summary"} testId="ai-jakarta" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
