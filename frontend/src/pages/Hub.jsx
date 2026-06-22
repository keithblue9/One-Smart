import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap, Briefcase, ChartLineUp, Globe, NotePencil,
  BookmarkSimple, ArrowRight, TrendUp, TrendDown, Sparkle,
  ArrowUpRight, Fire, Target, Brain, Wallet,
} from "@phosphor-icons/react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import SmartMorningBrief from "@/components/SmartMorningBrief";

// ─── helpers ──────────────────────────────────────────────────────────────────
function greeting(lang) {
  const h = new Date().getHours();
  if (lang === "id") {
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 19) return "Selamat sore";
    return "Selamat malam";
  }
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function fmt(n, dec = 2) {
  if (n == null) return "—";
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: dec });
}

// ─── mini sparkline (fake trend curve from delta) ────────────────────────────
function Spark({ delta, color }) {
  const up = (delta ?? 0) >= 0;
  const base = 50;
  const data = [
    { v: base - 8 }, { v: base - 3 }, { v: base + 2 },
    { v: base - 1 }, { v: base + 5 }, { v: up ? base + 9 : base - 9 },
  ];
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
          fill={`url(#sg-${color.replace("#","")})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── market card ─────────────────────────────────────────────────────────────
function MktCard({ label, value, delta, sub, color }) {
  const up = (delta ?? 0) >= 0;
  const clr = delta == null ? "#94a3b8" : up ? "#10b981" : "#ef4444";
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6E1] p-4 min-w-[160px] flex-shrink-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-1">{label}</div>
      <div className="font-bold text-xl text-slate-800 leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      {delta !== undefined && (
        <div className={`flex items-center gap-0.5 text-xs font-bold mt-1`} style={{ color: clr }}>
          {delta == null ? null : up ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
          {delta != null ? `${up ? "+" : ""}${Number(delta).toFixed(2)}%` : "—"}
        </div>
      )}
      <div className="mt-2">
        <Spark delta={delta} color={clr} />
      </div>
    </div>
  );
}

// ─── asset allocation donut ───────────────────────────────────────────────────
const ALLOC = [
  { name: "Saham IDX", pct: 30, color: "#2c4a3b" },
  { name: "Reksa Dana", pct: 25, color: "#4ade80" },
  { name: "Emas", pct: 20, color: "#f59e0b" },
  { name: "Obligasi", pct: 15, color: "#60a5fa" },
  { name: "Kripto", pct: 10, color: "#a78bfa" },
];

function AllocChart({ lang }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6E1] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Wallet size={16} weight="duotone" className="text-[#2c4a3b]" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {lang === "id" ? "Alokasi Aset Ideal" : "Ideal Asset Allocation"}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <ResponsiveContainer width={110} height={110}>
          <PieChart>
            <Pie data={ALLOC} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
              dataKey="pct" strokeWidth={2} stroke="white" isAnimationActive>
              {ALLOC.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip formatter={(v) => `${v}%`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-col gap-1.5 flex-1">
          {ALLOC.map((a) => (
            <div key={a.name} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: a.color }} />
              <span className="text-xs text-slate-600 flex-1">{a.name}</span>
              <span className="text-xs font-bold text-slate-700">{a.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
        {lang === "id"
          ? "Diversifikasi cerdas untuk millennial Indonesia: growth + stability + hedge inflasi."
          : "Smart diversification for Indonesian millennials: growth + stability + inflation hedge."}
      </p>
    </div>
  );
}

// ─── market bar chart ─────────────────────────────────────────────────────────
function MarketBar({ market, lang }) {
  if (!market) return null;
  const data = [
    { name: "IHSG", val: market.ihsg?.change_pct ?? 0 },
    { name: "Emas", val: market.gold_idr_gram?.change_pct ?? 0 },
    { name: "BTC", val: market.btc_usd?.change_pct ?? 0 },
    { name: "ETH", val: market.eth_usd?.change_pct ?? 0 },
  ];
  return (
    <div className="bg-white rounded-2xl border border-[#E8E6E1] p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <ChartLineUp size={16} weight="duotone" className="text-[#2c4a3b]" />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
          {lang === "id" ? "Perubahan 24 Jam (%)" : "24h Change (%)"}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`} />
          <Tooltip formatter={(v) => `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}%`} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
          <Bar dataKey="val" radius={[4, 4, 0, 0]} isAnimationActive>
            {data.map((d, i) => <Cell key={i} fill={d.val >= 0 ? "#10b981" : "#ef4444"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
        {lang === "id"
          ? "Bandingkan pergerakan aset sekaligus — mana yang outperform hari ini?"
          : "Compare all asset movements at once — which outperformed today?"}
      </p>
    </div>
  );
}

// ─── feature tiles ────────────────────────────────────────────────────────────
const tiles = [
  {
    to: "/app/education", icon: GraduationCap, key: "education",
    gradient: "from-emerald-50 to-teal-50", iconBg: "bg-emerald-100", iconColor: "text-emerald-700",
    accent: "#059669",
    desc_id: "Temukan beasiswa S2 luar negeri — Chevening, LPDP, DAAD, dan lebih banyak lagi. Filter sesuai usiamu.",
    desc_en: "Discover master's scholarships abroad — Chevening, LPDP, DAAD, and more. Filter by your eligibility.",
  },
  {
    to: "/app/job", icon: Briefcase, key: "job",
    gradient: "from-blue-50 to-indigo-50", iconBg: "bg-blue-100", iconColor: "text-blue-700",
    accent: "#2563eb",
    desc_id: "Explore top perusahaan global, tren gaji, dan platform freelance terbaik untuk kamu.",
    desc_en: "Explore top global companies, salary trends, and the best freelance platforms for you.",
  },
  {
    to: "/app/investment", icon: ChartLineUp, key: "investment",
    gradient: "from-amber-50 to-orange-50", iconBg: "bg-amber-100", iconColor: "text-amber-700",
    accent: "#d97706",
    desc_id: "Pantau saham IDX & global, investasi alternatif, dan dapatkan rekomendasi strategi dari AI.",
    desc_en: "Track IDX & global stocks, alternative investments, and get AI-powered strategy recommendations.",
  },
  {
    to: "/app/world", icon: Globe, key: "world",
    gradient: "from-purple-50 to-violet-50", iconBg: "bg-purple-100", iconColor: "text-purple-700",
    accent: "#7c3aed",
    desc_id: "Berita global terkini, kota paling nyaman di dunia, data statistik dunia dari OWID.",
    desc_en: "Latest world news, most liveable cities globally, world statistics from OWID.",
  },
  {
    to: "/app/quick", icon: NotePencil, key: "quick",
    gradient: "from-rose-50 to-pink-50", iconBg: "bg-rose-100", iconColor: "text-rose-700",
    accent: "#e11d48",
    desc_id: "Catatan cepat dengan reminder. Jangan biarkan ide atau to-do penting hilang begitu saja.",
    desc_en: "Quick notes with reminders. Never let important ideas or to-dos slip through the cracks.",
  },
  {
    to: "/app/bookmarks", icon: BookmarkSimple, key: "bookmarks",
    gradient: "from-cyan-50 to-sky-50", iconBg: "bg-cyan-100", iconColor: "text-cyan-700",
    accent: "#0891b2",
    desc_id: "Simpan konten menarik dari seluruh One Smart — beasiswa, saham, kota — dalam satu tempat.",
    desc_en: "Save interesting content from across One Smart — scholarships, stocks, cities — in one place.",
  },
];

// ─── main ─────────────────────────────────────────────────────────────────────
export default function Hub() {
  const { user, lang } = useAuth();
  const [market, setMarket] = useState(null);

  useEffect(() => {
    api.get("/investment/market-overview").then((r) => setMarket(r.data)).catch(() => {});
  }, []);

  const firstName = user?.name?.split(" ")[0] || (lang === "id" ? "Kamu" : "You");

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto space-y-8">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a2f24] via-[#2c4a3b] to-[#1e3d2f] p-6 lg:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/5 translate-x-16 -translate-y-16" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/5 -translate-x-10 translate-y-10" />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-white/50 text-sm">
                {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </p>
              <h1 className="text-3xl lg:text-4xl font-bold mt-1 leading-tight">
                {greeting(lang)}, {firstName}! 👋
              </h1>
              <p className="text-white/60 text-sm mt-2 max-w-md leading-relaxed">
                {lang === "id"
                  ? "Satu platform untuk beasiswa, karier, investasi, dan dunia — semuanya diperkuat AI."
                  : "One platform for scholarships, careers, investments, and the world — all AI-powered."}
              </p>
            </div>
            <SmartMorningBrief market={market} />
          </div>

          {/* market ticker */}
          {market ? (
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-4">
              {[
                { label: "IHSG", val: fmt(market.ihsg?.value, 0), delta: market.ihsg?.change_pct },
                { label: "USD/IDR", val: fmt(market.usd_idr?.value, 0) },
                { label: "Emas/gr", val: `Rp ${fmt(market.gold_idr_gram?.value, 0)}`, delta: market.gold_idr_gram?.change_pct },
                { label: "BTC", val: `$${fmt(market.btc_usd?.value, 0)}`, delta: market.btc_usd?.change_pct },
              ].map((m) => {
                const up = (m.delta ?? 0) >= 0;
                return (
                  <div key={m.label} className="flex items-center gap-2">
                    <span className="text-white/40 text-xs font-semibold">{m.label}</span>
                    <span className="text-white text-sm font-bold">{m.val}</span>
                    {m.delta != null && (
                      <span className={`text-xs font-bold ${up ? "text-emerald-400" : "text-red-400"}`}>
                        {up ? "▲" : "▼"}{Math.abs(m.delta).toFixed(2)}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 pt-4 border-t border-white/10 flex gap-3">
              {[1,2,3,4].map(i => <div key={i} className="h-4 w-24 bg-white/10 rounded animate-pulse" />)}
            </div>
          )}
        </div>
      </div>

      {/* ── MARKET CARDS ── */}
      <section>
        <SectionHeader icon={ChartLineUp} label={lang === "id" ? "Pasar Hari Ini" : "Today's Market"}
          sub={lang === "id" ? "Data live dari Yahoo Finance & Binance" : "Live data from Yahoo Finance & Binance"} />
        {market ? (
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 lg:mx-0 px-4 lg:px-0 pb-1">
            <MktCard label="IHSG" value={fmt(market.ihsg?.value, 0)} delta={market.ihsg?.change_pct} sub="Jakarta Composite" />
            <MktCard label="USD / IDR" value={`Rp ${fmt(market.usd_idr?.value, 0)}`} sub="Kurs tengah" />
            <MktCard label="Emas / gram" value={`Rp ${fmt(market.gold_idr_gram?.value, 0)}`} delta={market.gold_idr_gram?.change_pct} sub="Harga spot" />
            <MktCard label="Bitcoin" value={`$${fmt(market.btc_usd?.value, 0)}`} delta={market.btc_usd?.change_pct} sub="USD" />
            <MktCard label="Ethereum" value={`$${fmt(market.eth_usd?.value, 0)}`} delta={market.eth_usd?.change_pct} sub="USD" />
          </div>
        ) : (
          <div className="flex gap-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-32 w-40 rounded-2xl bg-slate-100 animate-pulse flex-shrink-0" />)}
          </div>
        )}
      </section>

      {/* ── INFOGRAPHICS ROW ── */}
      <section>
        <SectionHeader icon={Brain} label={lang === "id" ? "Infografis Investasi" : "Investment Infographics"}
          sub={lang === "id" ? "Visualisasi data pasar & alokasi aset" : "Market data & asset allocation visualized"} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AllocChart lang={lang} />
          <MarketBar market={market} lang={lang} />
        </div>
      </section>

      {/* ── WHY ONE SMART ── */}
      <section>
        <SectionHeader icon={Fire} label={lang === "id" ? "Kenapa One Smart?" : "Why One Smart?"}
          sub={lang === "id" ? "Dirancang khusus untuk generasi millennial Indonesia" : "Built for Indonesian millennials"} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: Brain, color: "text-violet-600", bg: "bg-violet-50",
              title: lang === "id" ? "AI yang Benar-benar Pintar" : "Actually Smart AI",
              body: lang === "id"
                ? "Setiap modul diperkuat Claude (Anthropic). Insight bukan sekadar data — tapi analisis mendalam yang bisa langsung kamu aksi."
                : "Every module powered by Claude (Anthropic). Insights go beyond data — actionable analysis you can act on immediately.",
            },
            {
              icon: Target, color: "text-emerald-600", bg: "bg-emerald-50",
              title: lang === "id" ? "Satu Platform, Semua Kebutuhan" : "One Platform, All Needs",
              body: lang === "id"
                ? "Dari cari beasiswa sampai pantau portofolio, dari baca berita dunia sampai generate CV — semuanya ada di sini."
                : "From scholarship hunting to portfolio tracking, from world news to CV generation — it's all here.",
            },
            {
              icon: ArrowUpRight, color: "text-blue-600", bg: "bg-blue-50",
              title: lang === "id" ? "Data Real-time" : "Real-time Data",
              body: lang === "id"
                ? "Harga pasar langsung dari Binance, Yahoo Finance & sumber terpercaya — bukan data kemarin yang sudah basi."
                : "Market prices direct from Binance, Yahoo Finance & trusted sources — not yesterday's stale data.",
            },
          ].map((c, i) => (
            <div key={i} className={`rounded-2xl p-5 ${c.bg} border border-white`}>
              <div className={`h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm mb-3`}>
                <c.icon size={20} weight="duotone" className={c.color} />
              </div>
              <h3 className="font-bold text-slate-800 mb-1.5">{c.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURE TILES ── */}
      <section>
        <SectionHeader icon={Sparkle} label={lang === "id" ? "Jelajahi Fitur" : "Explore Features"}
          sub={lang === "id" ? "Tap untuk masuk ke tiap modul" : "Tap to enter each module"} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((tile, idx) => (
            <Link key={tile.to} to={tile.to}
              className={`group relative overflow-hidden rounded-2xl border border-[#E8E6E1] bg-gradient-to-br ${tile.gradient} p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
              style={{ animationDelay: `${idx * 60}ms` }}>
              {/* decorative blob */}
              <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full opacity-15"
                style={{ background: tile.accent }} />

              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${tile.iconBg} shadow-sm z-10`}>
                <tile.icon size={26} weight="duotone" className={tile.iconColor} />
              </div>

              <div className="z-10">
                <div className="font-bold text-lg text-slate-800">{t(lang, tile.key)}</div>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  {lang === "id" ? tile.desc_id : tile.desc_en}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-auto z-10">
                <span className="text-xs font-semibold" style={{ color: tile.accent }}>
                  {lang === "id" ? "Buka modul" : "Open module"}
                </span>
                <ArrowRight size={14} weight="bold" style={{ color: tile.accent }}
                  className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}

// ─── section header helper ────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, sub }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="h-8 w-8 rounded-lg bg-[#2c4a3b]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} weight="duotone" className="text-[#2c4a3b]" />
      </div>
      <div>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">{label}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
