import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Briefcase, ChartLineUp, Globe, NotePencil, ArrowRight, TrendUp, TrendDown } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

const tiles = [
  { to: "/app/education", icon: GraduationCap, key: "education", desc: "scholarships", color: "bg-[#EFF3F1]", testId: "tile-education" },
  { to: "/app/job", icon: Briefcase, key: "job", desc: "top_companies", color: "bg-[#F3EFEA]", testId: "tile-job" },
  { to: "/app/investment", icon: ChartLineUp, key: "investment", desc: "market_overview", color: "bg-[#F0EDE8]", testId: "tile-investment" },
  { to: "/app/world", icon: Globe, key: "world", desc: "news", color: "bg-[#EBF1ED]", testId: "tile-world" },
  { to: "/app/quick", icon: NotePencil, key: "quick", desc: "notes", color: "bg-[#F4EFE6]", testId: "tile-quick" },
];

function StatChip({ label, value, delta }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl border border-[#E8E6E1] bg-white min-w-[140px]">
      <span className="text-[10px] uppercase tracking-[0.1em] text-ink-muted">{label}</span>
      <span className="font-heading text-lg text-ink">{value}</span>
      {delta !== undefined && (
        <span className={`text-xs flex items-center gap-1 ${up ? "text-forest" : "text-red-600"}`}>
          {up ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
          {(delta >= 0 ? "+" : "") + Number(delta).toFixed(2)}%
        </span>
      )}
    </div>
  );
}

export default function Hub() {
  const { user, lang } = useAuth();
  const [market, setMarket] = useState(null);

  useEffect(() => {
    api.get("/investment/market-overview").then((r) => setMarket(r.data)).catch(() => {});
  }, []);

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">{t(lang, "welcome")}</p>
        <h1 className="font-editorial text-3xl lg:text-4xl text-ink mt-1">{t(lang, "your_hub")}</h1>
        <p className="text-sm text-ink-muted mt-1">{new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* Market strip */}
      <div className="flex gap-3 mb-8 overflow-x-auto hide-scrollbar -mx-5 lg:mx-0 px-5 lg:px-0" data-testid="market-strip">
        {market ? (
          <>
            <StatChip label="IHSG" value={market.ihsg.value.toLocaleString()} delta={market.ihsg.change_pct} />
            <StatChip label="USD/IDR" value={Math.round(market.usd_idr.value).toLocaleString()} />
            <StatChip label={lang === "id" ? "Emas (gr)" : "Gold (gr)"} value={`Rp ${market.gold_idr_gram.value.toLocaleString()}`} delta={market.gold_idr_gram.change_pct} />
            <StatChip label="BTC" value={market.btc_usd ? `$${Math.round(market.btc_usd.value).toLocaleString()}` : "—"} delta={market.btc_usd?.change_pct} />
            <StatChip label="ETH" value={market.eth_usd ? `$${Math.round(market.eth_usd.value).toLocaleString()}` : "—"} delta={market.eth_usd?.change_pct} />
          </>
        ) : (
          <div className="text-sm text-ink-muted py-4">{t(lang, "loading")}</div>
        )}
      </div>

      {/* Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile, idx) => (
          <Link
            key={tile.to}
            to={tile.to}
            data-testid={tile.testId}
            className={`group card-base p-5 lg:p-6 flex flex-col gap-3 animate-fade-up`}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${tile.color}`}>
              <tile.icon size={26} weight="duotone" className="text-forest" />
            </div>
            <div>
              <div className="font-heading text-lg text-ink">{t(lang, tile.key)}</div>
              <div className="text-xs text-ink-muted">{t(lang, tile.desc)}</div>
            </div>
            <ArrowRight size={18} className="text-ink-muted group-hover:text-forest transition-colors mt-auto" />
          </Link>
        ))}
      </div>
    </div>
  );
}
