import { useEffect, useState } from "react";
import { TrendUp, TrendDown, Coins, ChartLineUp, ArrowsClockwise } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import AIInsightButton from "@/components/AIInsightButton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const recTone = {
  BUY: "bg-[#E5EFE7] text-forest",
  HOLD: "bg-stone text-ink-body",
  SELL: "bg-red-50 text-red-700",
  "SPECULATIVE BUY": "bg-[#F4E8D9] text-bronze",
};

function StockRow({ s, currency, lang, locale }) {
  const up = s.change_pct >= 0;
  const price = currency === "IDR" ? `Rp ${s.price_idr.toLocaleString()}` : `$${s.price_usd}`;
  return (
    <div className="border-b border-[#E8E6E1] last:border-0 py-3" data-testid={`stock-${s.ticker}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-heading text-base text-ink">{s.ticker}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full text-ink-muted bg-stone">{s.sector}</span>
          </div>
          <div className="text-xs text-ink-muted truncate">{s.name}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-ink">{price}</div>
          <div className={`text-xs flex items-center justify-end gap-0.5 ${up ? "text-forest" : "text-red-600"}`}>
            {up ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
            {(s.change_pct >= 0 ? "+" : "") + s.change_pct}%
          </div>
        </div>
        <span className={`text-[11px] px-2 py-0.5 rounded-full ${recTone[s.rec] || "bg-stone"}`}>{s.rec}</span>
      </div>
      <p className="text-xs text-ink-body mt-2 leading-relaxed">{s.rationale}</p>
      <div className="mt-2">
        <AIInsightButton topic="stock" context={{ ticker: s.ticker, name: s.name, sector: s.sector, rec: s.rec, rationale: s.rationale, currency }} testId={`ai-stock-${s.ticker}`} />
      </div>
    </div>
  );
}

export default function Investment() {
  const { lang } = useAuth();
  const [market, setMarket] = useState(null);
  const [stocksId, setStocksId] = useState([]);
  const [stocksGl, setStocksGl] = useState([]);
  const [alts, setAlts] = useState([]);

  const fetchAll = () => {
    Promise.all([
      api.get("/investment/market-overview"),
      api.get("/investment/stocks-id"),
      api.get("/investment/stocks-global"),
      api.get("/investment/alternatives"),
    ]).then(([m, si, sg, a]) => {
      setMarket(m.data);
      setStocksId(si.data.items);
      setStocksGl(sg.data.items);
      setAlts(a.data.items);
    });
  };

  useEffect(() => { fetchAll(); }, []);

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">{t(lang, "investment")}</p>
          <h1 className="font-editorial text-3xl text-ink mt-1">{t(lang, "market_overview")}</h1>
        </div>
        <button data-testid="refresh-market" onClick={fetchAll} className="text-sm flex items-center gap-1.5 text-ink-muted hover:text-forest">
          <ArrowsClockwise size={16} /> {t(lang, "refresh")}
        </button>
      </div>

      {/* Market overview cards */}
      {market && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {[
            { label: "IHSG", value: market.ihsg.value.toLocaleString(), delta: market.ihsg.change_pct },
            { label: "USD/IDR", value: Math.round(market.usd_idr.value).toLocaleString() },
            { label: lang === "id" ? "Emas/gr (IDR)" : "Gold/gr (IDR)", value: `Rp ${market.gold_idr_gram.value.toLocaleString()}`, delta: market.gold_idr_gram.change_pct },
            { label: "BTC (USD)", value: market.btc_usd ? `$${Math.round(market.btc_usd.value).toLocaleString()}` : "—", delta: market.btc_usd?.change_pct },
            { label: "ETH (USD)", value: market.eth_usd ? `$${Math.round(market.eth_usd.value).toLocaleString()}` : "—", delta: market.eth_usd?.change_pct },
          ].map((m, i) => {
            const up = (m.delta ?? 0) >= 0;
            return (
              <div key={i} className="card-base p-4">
                <div className="text-[10px] uppercase tracking-[0.1em] text-ink-muted">{m.label}</div>
                <div className="font-heading text-lg text-ink mt-1">{m.value}</div>
                {m.delta !== undefined && (
                  <div className={`text-xs ${up ? "text-forest" : "text-red-600"}`}>{(m.delta >= 0 ? "+" : "") + Number(m.delta).toFixed(2)}%</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Tabs defaultValue="id">
        <TabsList className="bg-stone flex flex-wrap h-auto" data-testid="investment-tabs">
          <TabsTrigger value="id" data-testid="tab-stocks-id">{t(lang, "stocks_id")}</TabsTrigger>
          <TabsTrigger value="global" data-testid="tab-stocks-global">{t(lang, "stocks_global")}</TabsTrigger>
          <TabsTrigger value="alt" data-testid="tab-alternatives">{t(lang, "alternatives")}</TabsTrigger>
        </TabsList>

        <TabsContent value="id" className="mt-5">
          <div className="card-base p-5">
            {stocksId.map((s) => <StockRow key={s.ticker} s={s} currency="IDR" lang={lang} />)}
            <div className="mt-4">
              <AIInsightButton topic="investment_strategy" context={{ market: "Indonesia", overview: market, picks: stocksId.map(x => x.ticker) }} label={lang === "id" ? "AI Strategi Pasar ID" : "AI Strategy: ID Market"} testId="ai-strategy-id" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="global" className="mt-5">
          <div className="card-base p-5">
            {stocksGl.map((s) => <StockRow key={s.ticker} s={s} currency="USD" lang={lang} />)}
            <div className="mt-4">
              <AIInsightButton topic="investment_strategy" context={{ market: "Global", overview: market, picks: stocksGl.map(x => x.ticker) }} label={lang === "id" ? "AI Strategi Global" : "AI Strategy: Global"} testId="ai-strategy-global" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="alt" className="mt-5 space-y-5">
          {alts.map((group) => (
            <section key={group.horizon} className="card-base p-5" data-testid={`alt-${group.horizon}`}>
              <h3 className="font-heading text-lg text-ink mb-4 flex items-center gap-2">
                <Coins size={20} weight="duotone" className="text-bronze" />
                {group.horizon}
              </h3>
              <div className="space-y-3">
                {group.options.map((o, i) => (
                  <div key={i} className="border-b border-[#E8E6E1] last:border-0 pb-3 last:pb-0">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="font-medium text-ink">{o.name}</span>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-stone px-2 py-0.5 rounded-full">{t(lang, "yield")}: {o.yield}</span>
                        <span className="bg-[#F4E8D9] text-bronze px-2 py-0.5 rounded-full">{t(lang, "risk")}: {o.risk}</span>
                      </div>
                    </div>
                    <p className="text-xs text-ink-muted mt-1">{o.note}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <AIInsightButton topic="investment_strategy" context={{ horizon: group.horizon, options: group.options }} label={lang === "id" ? "AI Strategi" : "AI Strategy"} testId={`ai-alt-${group.horizon}`} />
              </div>
            </section>
          ))}
        </TabsContent>
      </Tabs>

      <p className="text-[11px] text-ink-muted mt-6 text-center">
        {lang === "id"
          ? "Disclaimer: Konten edukasi, bukan saran investasi personal. DYOR."
          : "Disclaimer: Educational content, not personal financial advice. DYOR."}
      </p>
    </div>
  );
}
