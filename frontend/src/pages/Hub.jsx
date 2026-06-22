import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap, Briefcase, ChartLineUp, Globe, NotePencil,
  BookmarkSimple, ArrowRight, TrendUp, TrendDown, Sparkle,
  Lightning, Target, Rocket,
} from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import SmartMorningBrief from "@/components/SmartMorningBrief";

const tiles = [
  {
    to: "/app/education", icon: GraduationCap, key: "education",
    desc: "scholarships", gradient: "from-emerald-50 to-teal-50",
    iconBg: "bg-emerald-100", iconColor: "text-emerald-700",
    accent: "#059669",
  },
  {
    to: "/app/job", icon: Briefcase, key: "job",
    desc: "top_companies", gradient: "from-blue-50 to-indigo-50",
    iconBg: "bg-blue-100", iconColor: "text-blue-700",
    accent: "#2563eb",
  },
  {
    to: "/app/investment", icon: ChartLineUp, key: "investment",
    desc: "market_overview", gradient: "from-amber-50 to-orange-50",
    iconBg: "bg-amber-100", iconColor: "text-amber-700",
    accent: "#d97706",
  },
  {
    to: "/app/world", icon: Globe, key: "world",
    desc: "news", gradient: "from-purple-50 to-violet-50",
    iconBg: "bg-purple-100", iconColor: "text-purple-700",
    accent: "#7c3aed",
  },
  {
    to: "/app/quick", icon: NotePencil, key: "quick",
    desc: "notes", gradient: "from-rose-50 to-pink-50",
    iconBg: "bg-rose-100", iconColor: "text-rose-700",
    accent: "#e11d48",
  },
  {
    to: "/app/bookmarks", icon: BookmarkSimple, key: "bookmarks",
    desc: "bookmarks", gradient: "from-cyan-50 to-sky-50",
    iconBg: "bg-cyan-100", iconColor: "text-cyan-700",
    accent: "#0891b2",
  },
];

function MarketCard({ label, value, delta, sub }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="flex-shrink-0 bg-white rounded-2xl border border-[#E8E6E1] px-5 py-4 min-w-[160px] shadow-sm hover:shadow-md transition-shadow">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted mb-2">{label}</div>
      <div className="font-heading text-xl text-ink leading-tight">{value}</div>
      {sub && <div className="text-[11px] text-ink-muted mt-0.5">{sub}</div>}
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-semibold mt-2 ${up ? "text-emerald-600" : "text-red-500"}`}>
          {up ? <TrendUp size={13} weight="bold" /> : <TrendDown size={13} weight="bold" />}
          {(delta >= 0 ? "+" : "") + Number(delta).toFixed(2)}%
        </div>
      )}
    </div>
  );
}

function QuickStatBar({ market, lang }) {
  if (!market) return (
    <div className="flex gap-2 items-center py-3 text-sm text-ink-muted animate-pulse">
      <div className="h-3 w-24 bg-[#E8E6E1] rounded" />
      <div className="h-3 w-20 bg-[#E8E6E1] rounded" />
      <div className="h-3 w-28 bg-[#E8E6E1] rounded" />
    </div>
  );
  return (
    <div className="flex items-center gap-4 text-[11px] font-medium overflow-x-auto hide-scrollbar py-1">
      <span className="text-ink-muted whitespace-nowrap">
        IHSG <span className={market.ihsg.change_pct >= 0 ? "text-emerald-600" : "text-red-500"}>
          {market.ihsg.value.toLocaleString()} ({market.ihsg.change_pct >= 0 ? "+" : ""}{market.ihsg.change_pct?.toFixed(2)}%)
        </span>
      </span>
      <span className="text-[#E8E6E1]">·</span>
      <span className="text-ink-muted whitespace-nowrap">
        USD/IDR <span className="text-ink">{Math.round(market.usd_idr.value).toLocaleString()}</span>
      </span>
      <span className="text-[#E8E6E1]">·</span>
      <span className="text-ink-muted whitespace-nowrap">
        BTC <span className={market.btc_usd?.change_pct >= 0 ? "text-emerald-600" : "text-red-500"}>
          ${Math.round(market.btc_usd?.value || 0).toLocaleString()}
        </span>
      </span>
    </div>
  );
}

function InfoCard({ icon: Icon, title, value, color, bg }) {
  return (
    <div className={`rounded-2xl p-4 ${bg} flex items-center gap-4`}>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color} bg-white shadow-sm flex-shrink-0`}>
        <Icon size={22} weight="duotone" />
      </div>
      <div>
        <div className="text-[11px] text-ink-muted font-medium uppercase tracking-wider">{title}</div>
        <div className="font-heading text-lg text-ink">{value}</div>
      </div>
    </div>
  );
}

export default function Hub() {
  const { user, lang } = useAuth();
  const [market, setMarket] = useState(null);

  useEffect(() => {
    api.get("/investment/market-overview").then((r) => setMarket(r.data)).catch(() => {});
  }, []);

  const hour = new Date().getHours();
  const greeting = lang === "id"
    ? hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 19 ? "Selamat sore" : "Selamat malam"
    : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const firstName = user?.name?.split(" ")[0] || "Kamu";

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto space-y-8">

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2c4a3b] via-[#1e3328] to-[#162b21] p-6 lg:p-8 text-white">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white/60 text-sm font-medium">
                {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              <h1 className="font-bold text-3xl lg:text-4xl mt-1 leading-tight">
                {greeting}, {firstName}! 👋
              </h1>
              <p className="text-white/60 text-sm mt-2">
                {lang === "id" ? "Semua yang kamu butuhkan, dalam satu tempat." : "Everything you need, in one place."}
              </p>
            </div>
            <SmartMorningBrief market={market} />
          </div>

          {/* Ticker */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <QuickStatBar market={market} lang={lang} />
          </div>
        </div>
      </div>

      {/* Market cards */}
      {market && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ChartLineUp size={16} weight="bold" className="text-ink-muted" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              {lang === "id" ? "Pasar Hari Ini" : "Today's Market"}
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 lg:mx-0 px-4 lg:px-0 pb-1">
            <MarketCard label="IHSG" value={market.ihsg.value.toLocaleString()} delta={market.ihsg.change_pct} sub="Jakarta Composite" />
            <MarketCard label="USD / IDR" value={`Rp ${Math.round(market.usd_idr.value).toLocaleString()}`} sub="Kurs tengah" />
            <MarketCard label={lang === "id" ? "Emas (per gram)" : "Gold (per gram)"} value={`Rp ${market.gold_idr_gram.value.toLocaleString()}`} delta={market.gold_idr_gram.change_pct} />
            {market.btc_usd && <MarketCard label="Bitcoin (BTC)" value={`$${Math.round(market.btc_usd.value).toLocaleString()}`} delta={market.btc_usd.change_pct} sub="USD" />}
            {market.eth_usd && <MarketCard label="Ethereum (ETH)" value={`$${Math.round(market.eth_usd.value).toLocaleString()}`} delta={market.eth_usd.change_pct} sub="USD" />}
          </div>
        </div>
      )}

      {/* Info strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InfoCard icon={Rocket} title={lang === "id" ? "Fitur Aktif" : "Active Features"} value="6 Modul" color="text-[#2c4a3b]" bg="bg-emerald-50" />
        <InfoCard icon={Target} title={lang === "id" ? "Dipersonalisasi" : "Personalized"} value={lang === "id" ? "Untuk Anda" : "For You"} color="text-[#7c3aed]" bg="bg-purple-50" />
        <InfoCard icon={Lightning} title="AI Powered" value="Claude Sonnet" color="text-[#d97706]" bg="bg-amber-50" />
      </div>

      {/* Section heading */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkle size={16} weight="fill" className="text-[#B76E38]" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            {lang === "id" ? "Jelajahi Fitur" : "Explore Features"}
          </h2>
        </div>

        {/* Tiles grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((tile, idx) => (
            <Link
              key={tile.to}
              to={tile.to}
              data-testid={`tile-${tile.key}`}
              className={`group relative overflow-hidden rounded-2xl border border-[#E8E6E1] bg-gradient-to-br ${tile.gradient} p-5 lg:p-6 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-fade-up`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* Icon */}
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${tile.iconBg} shadow-sm`}>
                <tile.icon size={26} weight="duotone" className={tile.iconColor} />
              </div>

              {/* Text */}
              <div className="flex-1">
                <div className="font-heading text-lg text-ink">{t(lang, tile.key)}</div>
                <div className="text-xs text-ink-muted mt-0.5">{t(lang, tile.desc)}</div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-between">
                <div className="h-px flex-1 mr-3" style={{ background: `${tile.accent}22` }} />
                <ArrowRight
                  size={18}
                  className="text-ink-muted group-hover:translate-x-1 transition-transform"
                  style={{ color: tile.accent }}
                />
              </div>

              {/* Decorative dot */}
              <div
                className="absolute -top-3 -right-3 h-14 w-14 rounded-full opacity-20"
                style={{ background: tile.accent }}
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
