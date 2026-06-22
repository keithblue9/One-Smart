import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  GraduationCap, Briefcase, ChartLineUp, Globe, NotePencil,
  BookmarkSimple, ArrowRight, TrendUp, TrendDown, Sparkle, X, ArrowSquareOut,
} from "@phosphor-icons/react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import SmartMorningBrief from "@/components/SmartMorningBrief";

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

function fmt(n, dec = 0) {
  if (n == null) return "—";
  return Number(n).toLocaleString("id-ID", { maximumFractionDigits: dec });
}

// ── Market Card ──────────────────────────────────────────────────────────────
function MktCard({ label, value, delta, sub }) {
  const up = (delta ?? 0) >= 0;
  const clr = delta == null ? "#94a3b8" : up ? "#10b981" : "#ef4444";
  const sparkData = [50-8,50-3,50+2,50-1,50+5, up ? 59 : 41].map(v => ({ v }));
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 min-w-[155px] flex-shrink-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-1">{label}</div>
      <div className="font-bold text-xl text-slate-800 leading-tight">{value}</div>
      {sub && <div className="text-[10px] text-slate-400 mt-0.5">{sub}</div>}
      {delta !== undefined && (
        <div className="flex items-center gap-0.5 text-xs font-bold mt-1" style={{ color: clr }}>
          {delta != null ? (up ? <TrendUp size={11} weight="bold" /> : <TrendDown size={11} weight="bold" />) : null}
          {delta != null ? `${up ? "+" : ""}${Number(delta).toFixed(2)}%` : "—"}
        </div>
      )}
      <div className="mt-2 h-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{top:0,right:0,left:0,bottom:0}}>
            <defs>
              <linearGradient id={`sg${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={clr} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={clr} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={clr} strokeWidth={2} fill={`url(#sg${label})`} dot={false} isAnimationActive={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Asset Allocation Donut ────────────────────────────────────────────────────
const ALLOC = [
  { name: "Saham IDX", pct: 30, color: "#2c4a3b" },
  { name: "Reksa Dana", pct: 25, color: "#4ade80" },
  { name: "Emas", pct: 20, color: "#f59e0b" },
  { name: "Obligasi/SBN", pct: 15, color: "#60a5fa" },
  { name: "Kripto", pct: 10, color: "#a78bfa" },
];

// ── OWID Global Trends ────────────────────────────────────────────────────────
const OWID_CHARTS = [
  {
    title: "Pangsa EV dari Penjualan Mobil Baru Global",
    unit: "%", color: "#10b981",
    source: "ourworldindata.org/electric-car-sales",
    current: "22% (2024)",
    data: [
      { year: "2018", val: 2.2 }, { year: "2019", val: 2.5 }, { year: "2020", val: 4.2 },
      { year: "2021", val: 8.3 }, { year: "2022", val: 14 }, { year: "2023", val: 18 },
      { year: "2024", val: 22 }, { year: "2029*", val: 45 },
    ],
    insight: "China memimpin 60% pasar EV global. Indonesia baru ~1% tapi tumbuh cepat karena insentif nikel. Cadangan nikel RI terbesar dunia (24% global) menjadi kunci rantai pasok baterai EV Asia.",
  },
  {
    title: "Energi Terbarukan: % Listrik Global",
    unit: "%", color: "#f59e0b",
    source: "ourworldindata.org/renewable-energy",
    current: "33% (2024)",
    data: [
      { year: "2015", val: 22 }, { year: "2017", val: 25 }, { year: "2019", val: 27 },
      { year: "2021", val: 29 }, { year: "2023", val: 30 }, { year: "2024", val: 33 },
      { year: "2029*", val: 45 },
    ],
    insight: "Solar photovoltaic turun harga 90% dalam 15 tahun. IEA proyeksi 45% pada 2030. Indonesia target 23% EBT 2025 namun baru ~13% — gap ini menciptakan peluang besar di sektor energi hijau.",
  },
  {
    title: "Pengguna Internet Global (miliar)",
    unit: "Miliar", color: "#60a5fa",
    source: "ourworldindata.org/internet",
    current: "5.5 miliar (2024)",
    data: [
      { year: "2015", val: 3.2 }, { year: "2017", val: 3.9 }, { year: "2019", val: 4.1 },
      { year: "2021", val: 4.9 }, { year: "2023", val: 5.4 }, { year: "2024", val: 5.5 },
      { year: "2029*", val: 6.5 },
    ],
    insight: "~2.5 miliar manusia masih unconnected, mayoritas di Afrika & Asia Selatan. Starlink LEO satellite mempercepat konektivitas. Indonesia masih ~20 juta warga tanpa broadband terutama di Papua & Maluku.",
  },
];

const RADIAL_DATA = [
  { name: "Life Expectancy Progress", val: 91, fill: "#10b981" },
  { name: "Literacy Rate Global", val: 87, fill: "#60a5fa" },
  { name: "Extreme Poverty Reduction", val: 78, fill: "#f59e0b" },
  { name: "Clean Water Access", val: 74, fill: "#a78bfa" },
];

// ── Market 24h Change Bar ─────────────────────────────────────────────────────
function MarketBar({ market }) {
  if (!market) return null;
  const data = [
    { name: "IHSG", val: market.ihsg?.change_pct ?? 0 },
    { name: "Emas", val: market.gold_idr_gram?.change_pct ?? 0 },
    { name: "BTC", val: market.btc_usd?.change_pct ?? 0 },
    { name: "ETH", val: market.eth_usd?.change_pct ?? 0 },
  ];
  return (
    <ResponsiveContainer width="100%" height={110}>
      <BarChart data={data} margin={{top:4,right:4,left:-24,bottom:0}}>
        <XAxis dataKey="name" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v>0?"+":""}${v.toFixed(1)}%`}/>
        <Tooltip formatter={v=>`${v>0?"+":""}${Number(v).toFixed(2)}%`} contentStyle={{fontSize:11,borderRadius:8}}/>
        <Bar dataKey="val" radius={[4,4,0,0]} isAnimationActive>
          {data.map((d,i) => <Cell key={i} fill={d.val>=0?"#10b981":"#ef4444"}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SH({ icon: Icon, label, sub }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="h-8 w-8 rounded-lg bg-[#2c4a3b]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} weight="duotone" className="text-[#2c4a3b]"/>
      </div>
      <div>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Feature Tiles ─────────────────────────────────────────────────────────────
const tiles = [
  { to:"/app/education", icon:GraduationCap, key:"education", gradient:"from-emerald-50 to-teal-50", iconBg:"bg-emerald-100", iconColor:"text-emerald-700", accent:"#059669",
    desc_id:"Temukan beasiswa S2 luar negeri — Chevening, LPDP, DAAD, dan lebih banyak. Filter eligibility otomatis sesuai usia & background.",
    desc_en:"Discover master's scholarships abroad — Chevening, LPDP, DAAD, and more. Automatic eligibility filter by age & background." },
  { to:"/app/job", icon:Briefcase, key:"job", gradient:"from-blue-50 to-indigo-50", iconBg:"bg-blue-100", iconColor:"text-blue-700", accent:"#2563eb",
    desc_id:"Eksplorasi top perusahaan global dengan estimasi gaji, tren pekerjaan masa depan, dan platform freelance terbaik untuk karier kamu.",
    desc_en:"Explore top global companies with salary estimates, future job trends, and the best freelance platforms for your career." },
  { to:"/app/investment", icon:ChartLineUp, key:"investment", gradient:"from-amber-50 to-orange-50", iconBg:"bg-amber-100", iconColor:"text-amber-700", accent:"#d97706",
    desc_id:"Pantau harga saham IDX & global secara live, investasi alternatif, dan dapatkan analisa AI teknikal + fundamental per saham.",
    desc_en:"Track IDX & global stock prices live, alternative investments, and get AI technical + fundamental analysis per stock." },
  { to:"/app/world", icon:Globe, key:"world", gradient:"from-purple-50 to-violet-50", iconBg:"bg-purple-100", iconColor:"text-purple-700", accent:"#7c3aed",
    desc_id:"Berita global aktual hari ini, statistik dunia dari Our World in Data, kota paling nyaman untuk tinggal & travel Indonesia.",
    desc_en:"Today's live world news, global statistics from Our World in Data, most liveable cities & Indonesia travel." },
  { to:"/app/quick", icon:NotePencil, key:"quick", gradient:"from-rose-50 to-pink-50", iconBg:"bg-rose-100", iconColor:"text-rose-700", accent:"#e11d48",
    desc_id:"Catatan cepat dengan reminder. Buat to-do list, bullet journal, atau sekedar parkir ide penting sebelum hilang.",
    desc_en:"Quick notes with reminders. Create to-dos, bullet journals, or just park important ideas before they're gone." },
  { to:"/app/bookmarks", icon:BookmarkSimple, key:"bookmarks", gradient:"from-cyan-50 to-sky-50", iconBg:"bg-cyan-100", iconColor:"text-cyan-700", accent:"#0891b2",
    desc_id:"Simpan konten menarik dari seluruh One Smart — beasiswa, saham, kota, berita — semuanya dalam satu tempat yang rapi.",
    desc_en:"Save interesting content from across One Smart — scholarships, stocks, cities, news — all in one organized place." },
];

// ── OWID Section with clickable detail modal ──────────────────────────────────
function OwidSection({ lang }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      {/* 3 chart cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {OWID_CHARTS.map((c, i) => (
          <button key={i} onClick={() => setSelected(c)}
            className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm text-left hover:shadow-md hover:border-slate-200 transition-all group cursor-pointer w-full">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-xs font-bold text-slate-700 leading-snug flex-1">{c.title}</h3>
              <ArrowSquareOut size={13} className="text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-0.5 transition-colors"/>
            </div>
            {/* Insight — max 2 lines */}
            <p className="text-[11px] text-slate-500 leading-relaxed mb-3 overflow-hidden" style={{display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
              {c.insight}
            </p>
            {/* Chart — fixed 120px, no text overlap */}
            <div style={{height:120}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={c.data} margin={{top:4,right:4,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id={`owg${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c.color} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={c.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tick={{fontSize:8,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:8,fill:"#94a3b8"}} axisLine={false} tickLine={false} width={26}/>
                  <Tooltip formatter={v=>`${v}${c.unit}`} contentStyle={{fontSize:10,borderRadius:6}}/>
                  <Area type="monotone" dataKey="val" stroke={c.color} strokeWidth={2} fill={`url(#owg${i})`} dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-[10px] font-semibold" style={{color:c.color}}>
              {lang==="id"?"Tap untuk detail →":"Tap for details →"}
            </div>
          </button>
        ))}
      </div>

      {/* Progress bars */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-0.5">{lang==="id"?"Kemajuan Kemanusiaan Global":"Global Human Progress"}</h3>
        <p className="text-xs text-slate-400 mb-4">{lang==="id"?"% target tercapai sejak 1990 — dunia lebih baik dari yang dikira":"% of target achieved since 1990 — the world is better than you think"}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {RADIAL_DATA.map(d => (
            <div key={d.name}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs text-slate-600">{d.name}</span>
                <span className="text-sm font-bold" style={{color:d.fill}}>{d.val}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{width:`${d.val}%`,background:d.fill,transition:"width 1s ease"}}/>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-4">*{lang==="id"?"Skala relatif terhadap baseline 1990. Sumber: Our World in Data.":"Scale relative to 1990 baseline. Source: Our World in Data."}</p>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={()=>setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Our World in Data</div>
                <h2 className="font-bold text-slate-800 text-lg leading-snug">{selected.title}</h2>
              </div>
              <button onClick={()=>setSelected(null)} className="text-slate-400 hover:text-slate-600 ml-3 flex-shrink-0 mt-1"><X size={20}/></button>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 p-5 pb-0">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Saat Ini</div>
                <div className="font-bold text-slate-700">{selected.current || selected.data[selected.data.length-2]?.val + selected.unit}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3" style={{borderLeft:`3px solid ${selected.color}`}}>
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Proyeksi 2029</div>
                <div className="font-bold" style={{color:selected.color}}>{selected.data[selected.data.length-1]?.val}{selected.unit}</div>
              </div>
            </div>
            {/* Chart big */}
            <div className="px-5 pt-4" style={{height:200}}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={selected.data} margin={{top:4,right:4,left:0,bottom:0}}>
                  <defs>
                    <linearGradient id="modalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={selected.color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={selected.color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:10,fill:"#94a3b8"}} axisLine={false} tickLine={false} width={32}/>
                  <Tooltip formatter={v=>`${v}${selected.unit}`} contentStyle={{fontSize:11,borderRadius:8}}/>
                  <Area type="monotone" dataKey="val" stroke={selected.color} strokeWidth={2.5} fill="url(#modalGrad)" dot={{r:3,fill:selected.color}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {/* Detail text */}
            <div className="p-5 pt-3 space-y-3">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">📊 Analisa & Konteks</div>
                <p className="text-sm text-slate-700 leading-relaxed">{selected.insight}</p>
              </div>
              <a href={`https://${selected.source}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                <ArrowSquareOut size={13}/> Baca data lengkap di ourworldindata.org
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Hub() {
  const { user, lang } = useAuth();
  const [market, setMarket] = useState(null);

  useEffect(() => {
    api.get("/investment/market-overview").then(r => setMarket(r.data)).catch(() => {});
  }, []);

  const firstName = user?.name?.split(" ")[0] || (lang === "id" ? "Kamu" : "You");

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto space-y-8">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1a2f24] via-[#2c4a3b] to-[#1e3d2f] p-6 lg:p-8 shadow-xl">
        <div className="absolute top-0 right-0 h-56 w-56 rounded-full bg-white/5 translate-x-14 -translate-y-14"/>
        <div className="absolute bottom-0 left-0 h-36 w-36 rounded-full bg-white/5 -translate-x-8 translate-y-8"/>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-white/50 text-sm">
              {new Date().toLocaleDateString(lang==="id"?"id-ID":"en-US",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
            </p>
            <h1 className="text-3xl lg:text-4xl font-bold text-white mt-1 leading-tight">
              {greeting(lang)}, {firstName}! 👋
            </h1>
            <p className="text-white/60 text-sm mt-2 max-w-md">
              {lang==="id"
                ? "Satu platform untuk beasiswa, karier, investasi, dan dunia — semuanya diperkuat AI."
                : "One platform for scholarships, careers, investments, and the world — all AI-powered."}
            </p>
          </div>
          <SmartMorningBrief market={market}/>
        </div>
      </div>

      {/* ── MARKET CARDS ── */}
      <section>
        <SH icon={ChartLineUp} label={lang==="id"?"Pasar Hari Ini":"Today's Market"} sub={lang==="id"?"Live dari Yahoo Finance & Binance":"Live from Yahoo Finance & Binance"}/>
        {market ? (
          <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 lg:mx-0 px-4 lg:px-0 pb-1">
            <MktCard label="IHSG" value={fmt(market.ihsg?.value)} delta={market.ihsg?.change_pct} sub="Jakarta Composite"/>
            <MktCard label="USD/IDR" value={`Rp ${fmt(market.usd_idr?.value)}`} sub="Kurs tengah"/>
            <MktCard label="Emas/gram" value={`Rp ${fmt(market.gold_idr_gram?.value)}`} delta={market.gold_idr_gram?.change_pct} sub="Harga spot"/>
            <MktCard label="Bitcoin" value={`$${fmt(market.btc_usd?.value)}`} delta={market.btc_usd?.change_pct} sub="USD"/>
            <MktCard label="Ethereum" value={`$${fmt(market.eth_usd?.value)}`} delta={market.eth_usd?.change_pct} sub="USD"/>
          </div>
        ) : (
          <div className="flex gap-3">{[1,2,3,4,5].map(i=><div key={i} className="h-32 w-40 rounded-2xl bg-slate-100 animate-pulse flex-shrink-0"/>)}</div>
        )}
      </section>

      {/* ── INFOGRAFIS: MARKET + ALOKASI ── */}
      <section>
        <SH icon={ChartLineUp} label={lang==="id"?"Infografis Pasar & Portofolio":"Market & Portfolio Infographics"} sub={lang==="id"?"Visualisasi data aktual untuk keputusan lebih cerdas":"Actual data visualization for smarter decisions"}/>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Donut */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-1">{lang==="id"?"Alokasi Aset Ideal — Millennial Indonesia":"Ideal Asset Allocation — Indonesian Millennial"}</h3>
            <p className="text-xs text-slate-400 mb-4">{lang==="id"?"Diversifikasi growth + stability + hedge inflasi":"Diversification: growth + stability + inflation hedge"}</p>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={ALLOC} cx="50%" cy="50%" innerRadius={34} outerRadius={56} dataKey="pct" strokeWidth={2} stroke="white">
                    {ALLOC.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip formatter={v=>`${v}%`} contentStyle={{fontSize:11,borderRadius:8}}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 flex-1">
                {ALLOC.map(a=>(
                  <div key={a.name} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{background:a.color}}/>
                    <span className="text-xs text-slate-600 flex-1">{a.name}</span>
                    <span className="text-xs font-bold text-slate-700">{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* 24h bar */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 mb-1">{lang==="id"?"Perubahan Aset 24 Jam":"Asset 24h Change"}</h3>
            <p className="text-xs text-slate-400 mb-3">{lang==="id"?"Hijau = naik, merah = turun hari ini":"Green = up, red = down today"}</p>
            <MarketBar market={market}/>
            {!market && <div className="h-28 bg-slate-50 rounded-xl animate-pulse"/>}
          </div>
        </div>
      </section>

      {/* ── INFOGRAFIS: OWID DUNIA ── */}
      <section>
        <SH icon={Globe} label={lang==="id"?"Tren Global — Our World in Data":"Global Trends — Our World in Data"} sub={lang==="id"?"Klik kartu untuk baca detail & konteks Indonesia":"Click a card to read details & Indonesia context"}/>
        <OwidSection lang={lang}/>
      </section>

      {/* ── FEATURE TILES ── */}
      <section>
        <SH icon={Sparkle} label={lang==="id"?"Jelajahi Fitur":"Explore Features"} sub={lang==="id"?"Tap untuk masuk ke tiap modul":"Tap to enter each module"}/>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiles.map((tile,idx)=>(
            <Link key={tile.to} to={tile.to}
              className={`group relative overflow-hidden rounded-2xl border border-[#E8E6E1] bg-gradient-to-br ${tile.gradient} p-5 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
              style={{animationDelay:`${idx*60}ms`}}>
              <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full opacity-15" style={{background:tile.accent}}/>
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${tile.iconBg} shadow-sm z-10`}>
                <tile.icon size={26} weight="duotone" className={tile.iconColor}/>
              </div>
              <div className="z-10">
                <div className="font-bold text-lg text-slate-800">{t(lang,tile.key)}</div>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{lang==="id"?tile.desc_id:tile.desc_en}</p>
              </div>
              <div className="flex items-center gap-2 mt-auto z-10">
                <span className="text-xs font-semibold" style={{color:tile.accent}}>{lang==="id"?"Buka modul":"Open module"}</span>
                <ArrowRight size={14} weight="bold" style={{color:tile.accent}} className="group-hover:translate-x-1 transition-transform"/>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
