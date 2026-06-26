import { useEffect, useState } from "react";
import { TrendUp, TrendDown, Coins, ChartLineUp, ArrowsClockwise,
         Lightning, Shield, Rocket, ArrowUpRight, Info } from "@phosphor-icons/react";
import { BarChart, Bar, Cell, PieChart, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import AIInsightButton from "@/components/AIInsightButton";
import ChatBox from "@/components/ChatBox";
import InvestmentSimulator from "@/components/InvestmentSimulator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const recStyle = {
  BUY: { bg:"bg-emerald-50 text-emerald-700 border-emerald-200", dot:"bg-emerald-500" },
  HOLD: { bg:"bg-amber-50 text-amber-700 border-amber-200", dot:"bg-amber-500" },
  SELL: { bg:"bg-red-50 text-red-700 border-red-200", dot:"bg-red-500" },
  "SPECULATIVE BUY": { bg:"bg-violet-50 text-violet-700 border-violet-200", dot:"bg-violet-500" },
};

const SECTOR_COLORS = { Banking:"#2c4a3b", Tech:"#60a5fa", Telco:"#f59e0b", Conglomerate:"#a78bfa",
  Consumer:"#f472b6", "Consumer Staples":"#fb923c", "Mining (Gold/Nickel)":"#fcd34d",
  "Semiconductor / AI":"#38bdf8", "Cloud / AI":"#818cf8", "Search / Cloud":"#34d399",
  "Hardware / Services":"#f87171", "E-commerce / AWS":"#fb923c", "EV / Energy":"#4ade80", Foundry:"#94a3b8" };

function fmt(n, dec=0) { return n == null ? "—" : Number(n).toLocaleString("id-ID", {maximumFractionDigits:dec}); }

function StockCard({ s, currency, lang }) {
  const [expanded, setExpanded] = useState(false);
  const up = (s.change_pct ?? 0) >= 0;
  const priceVal = currency==="IDR" ? s.price_idr : s.price_usd;
  const price = currency==="IDR" ? `Rp ${fmt(priceVal)}` : `$${fmt(priceVal,2)}`;
  const rs = recStyle[s.rec] || recStyle.HOLD;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 text-lg">{s.ticker}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{s.sector}</span>
            {s.live && <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/>LIVE</span>}
            {s.dividend && <span className="flex items-center gap-1 text-[10px] text-violet-600 font-bold bg-violet-50 px-1.5 py-0.5 rounded-full">🔔 Dividen {s.dividend.yield_pct}%</span>}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{s.name}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-slate-800 text-lg">{price}</div>
          <div className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${up?"text-emerald-600":"text-red-500"}`}>
            {up ? <TrendUp size={11} weight="bold"/> : <TrendDown size={11} weight="bold"/>}
            {(s.change_pct>=0?"+":"") + fmt(s.change_pct,2)}%
          </div>
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold flex-shrink-0 ${rs.bg}`}>{s.rec}</span>
      </div>

      <p className="text-sm text-slate-600 mt-3 leading-relaxed">{s.rationale}</p>

      <div className="flex items-center gap-3 mt-3">
        <AIInsightButton topic="stock" context={{ticker:s.ticker, name:s.name, sector:s.sector, rec:s.rec, rationale:s.rationale, price:priceVal, currency}} testId={`ai-stock-${s.ticker}`}/>
        <button onClick={()=>setExpanded(!expanded)} className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-700">
          <Info size={13}/> {expanded?(lang==="id"?"Sembunyikan":"Hide"):(lang==="id"?"Detail analisa":"Details")}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Valuasi & Fundamental */}
          {s.fundamental && (
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
              <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-2">📊 Valuasi & Fundamental</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {s.fundamental.pe_trailing && <div className="bg-white rounded-lg p-2"><div className="text-slate-400">P/E Trailing</div><div className="font-bold text-slate-800">{s.fundamental.pe_trailing}x</div></div>}
                {s.fundamental.pe_forward && <div className="bg-white rounded-lg p-2"><div className="text-slate-400">P/E Forward</div><div className="font-bold text-slate-800">{s.fundamental.pe_forward}x</div></div>}
                {s.fundamental.pb && <div className="bg-white rounded-lg p-2"><div className="text-slate-400">P/B Ratio</div><div className="font-bold text-slate-800">{s.fundamental.pb}x</div></div>}
                {s.fundamental.eps_idr && <div className="bg-white rounded-lg p-2"><div className="text-slate-400">EPS (IDR)</div><div className="font-bold text-slate-800">Rp {s.fundamental.eps_idr?.toLocaleString()}</div></div>}
                {s.fundamental.eps_usd && <div className="bg-white rounded-lg p-2"><div className="text-slate-400">EPS (USD)</div><div className="font-bold text-slate-800">${s.fundamental.eps_usd}</div></div>}
                {s.fundamental.roe_pct && <div className="bg-white rounded-lg p-2"><div className="text-slate-400">ROE</div><div className="font-bold text-slate-800">{s.fundamental.roe_pct}%</div></div>}
                {s.fundamental.der && <div className="bg-white rounded-lg p-2"><div className="text-slate-400">DER</div><div className="font-bold text-slate-800">{s.fundamental.der}x</div></div>}
                {s.fundamental.npm_pct && <div className="bg-white rounded-lg p-2"><div className="text-slate-400">Net Margin</div><div className="font-bold text-slate-800">{s.fundamental.npm_pct}%</div></div>}
                {s.fundamental.market_cap_t && <div className="bg-white rounded-lg p-2"><div className="text-slate-400">Market Cap</div><div className="font-bold text-slate-800">Rp {s.fundamental.market_cap_t}T</div></div>}
                {s.fundamental.market_cap_b && <div className="bg-white rounded-lg p-2"><div className="text-slate-400">Market Cap</div><div className="font-bold text-slate-800">${s.fundamental.market_cap_b}B</div></div>}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-emerald-50 rounded-lg p-2"><div className="text-slate-400">Harga Beli Ideal</div><div className="font-bold text-emerald-700">{s.fundamental.beli_ideal_idr || s.fundamental.beli_ideal_usd}</div></div>
                <div className="bg-amber-50 rounded-lg p-2"><div className="text-slate-400">Target Price</div><div className="font-bold text-amber-700">{s.fundamental.target_price_idr ? "Rp "+s.fundamental.target_price_idr?.toLocaleString() : "$"+s.fundamental.target_price_usd}</div></div>
              </div>
              <div className="mt-1 text-[10px]"><span className="text-slate-400">Risk Level: </span><span className="font-medium text-slate-600">{s.fundamental.risk}</span></div>
            </div>
          )}
          {/* Dividend info */}
          {s.dividend && (
            <div className="bg-violet-50 rounded-xl p-3 border border-violet-100">
              <div className="text-[10px] font-bold text-violet-700 uppercase tracking-wider mb-2">🔔 Info Dividen</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-[11px] mb-2">
                <span className="bg-white rounded-lg p-1.5">Yield: <strong>{s.dividend.yield_pct}%</strong></span>
                <span className="bg-white rounded-lg p-1.5">Freq: <strong>{s.dividend.freq}</strong></span>
                {s.dividend.cum_date && <span className="bg-white rounded-lg p-1.5">Cum: <strong>{s.dividend.cum_date}</strong></span>}
                {s.dividend.ex_date && <span className="bg-white rounded-lg p-1.5">Ex-Date: <strong>{s.dividend.ex_date}</strong></span>}
                {s.dividend.payment_date && <span className="bg-white rounded-lg p-1.5">Bayar: <strong>{s.dividend.payment_date}</strong></span>}
              </div>
              {s.dividend.note && <p className="text-[10px] text-violet-600 mb-2">{s.dividend.note}</p>}
              {/* 5yr history */}
              {s.dividend.history && (
                <div>
                  <div className="text-[10px] font-bold text-violet-600 mb-1">📅 Histori Dividen 5 Tahun</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead><tr className="text-violet-500"><th className="text-left py-1">Tahun</th><th className="text-right">Ex-Date</th><th className="text-right">Dividen</th><th className="text-right">Yield</th></tr></thead>
                      <tbody>
                        {s.dividend.history.map((h,i) => (
                          <tr key={i} className="border-t border-violet-100">
                            <td className="py-1 font-bold text-violet-700">{h.year}</td>
                            <td className="text-right text-slate-600">{h.ex_date || "—"}</td>
                            <td className="text-right font-medium text-slate-700">{s.dividend.history[0].amount_idr !== undefined ? "Rp "+h.amount_idr?.toLocaleString() : "$"+h.amount_usd}</td>
                            <td className="text-right text-emerald-600 font-bold">{h.yield_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          <p className="text-[10px] text-slate-400">⚠️ Data fundamental bersifat indikatif. Harga live dari Yahoo Finance. Selalu lakukan riset mandiri (DYOR) sebelum investasi.</p>
        </div>
      )}
    </div>
  );
}

const ALT_DETAIL = {
  "Short Term (< 1 thn)": {
    icon: Shield, color:"text-blue-600", bg:"bg-blue-50",
    overview: "Ideal untuk dana darurat, parking cash, atau tujuan finansial kurang dari 12 bulan. Prioritas: likuiditas tinggi + keamanan modal.",
  },
  "Mid Term (1–5 thn)": {
    icon: Lightning, color:"text-amber-600", bg:"bg-amber-50",
    overview: "Cocok untuk tujuan seperti DP rumah, pernikahan, atau pendidikan. Bisa ambil risiko sedikit lebih tinggi untuk return lebih baik.",
  },
  "Long Term (> 5 thn)": {
    icon: Rocket, color:"text-emerald-600", bg:"bg-emerald-50",
    overview: "Untuk pensiun, kebebasan finansial, atau warisan. Waktu adalah sekutu terbesar — biarkan compound interest bekerja. Fluktuasi jangka pendek tidak relevan.",
  },
};

export default function Investment() {
  const { lang } = useAuth();
  const [market, setMarket] = useState(null);
  const [stocksId, setStocksId] = useState([]);
  const [stocksGl, setStocksGl] = useState([]);
  const [alts, setAlts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      api.get("/investment/market-overview"),
      api.get("/investment/stocks-id"),
      api.get("/investment/stocks-global"),
      api.get("/investment/alternatives"),
    ]).then(([m,si,sg,a]) => {
      setMarket(m.data); setStocksId(si.data.items); setStocksGl(sg.data.items); setAlts(a.data.items);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const sectorChartId = stocksId.map(s=>({ name:s.ticker, pct:s.change_pct??0 }));
  const sectorChartGl = stocksGl.map(s=>({ name:s.ticker, pct:s.change_pct??0 }));

  const allocData = [
    {name:"Saham IDX",v:30,fill:"#2c4a3b"},{name:"Reksa Dana",v:25,fill:"#4ade80"},
    {name:"Emas",v:20,fill:"#f59e0b"},{name:"Obligasi",v:15,fill:"#60a5fa"},{name:"Kripto",v:10,fill:"#a78bfa"},
  ];

  return (
    <div className="px-4 lg:px-10 py-6 lg:py-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Investasi</p>
          <h1 className="text-3xl font-bold text-slate-800 mt-1">Market Overview</h1>
          <p className="text-sm text-slate-500 mt-1">{lang==="id"?"Data harga live · Analisa AI per saham · ChatBot diskusi portofolio":"Live prices · AI analysis per stock · Portfolio chatbot"}</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="text-sm flex items-center gap-1.5 text-slate-500 hover:text-slate-700 disabled:opacity-50 bg-white border border-slate-200 px-3 py-2 rounded-xl">
          <ArrowsClockwise size={15} className={loading?"animate-spin":""}/> Refresh
        </button>
      </div>

      {/* Market Cards */}
      {market ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          {[
            {label:"IHSG", value:fmt(market.ihsg?.value), delta:market.ihsg?.change_pct, sub:"Jakarta Composite"},
            {label:"USD/IDR", value:`Rp ${fmt(market.usd_idr?.value)}`, sub:"Kurs tengah"},
            {label:"Emas/gr", value:`Rp ${fmt(market.gold_idr_gram?.value)}`, delta:market.gold_idr_gram?.change_pct, sub:"Harga spot"},
            {label:"Bitcoin", value:`$${fmt(market.btc_usd?.value)}`, delta:market.btc_usd?.change_pct, sub:"USD"},
            {label:"Ethereum", value:`$${fmt(market.eth_usd?.value)}`, delta:market.eth_usd?.change_pct, sub:"USD"},
          ].map((m,i)=>{
            const up=(m.delta??0)>=0;
            return (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{m.label}</div>
                <div className="font-bold text-lg text-slate-800 mt-1 leading-tight">{m.value}</div>
                <div className="text-[10px] text-slate-400">{m.sub}</div>
                {m.delta!=null && <div className={`text-xs font-bold mt-1 ${up?"text-emerald-600":"text-red-500"}`}>{up?"+":""}{fmt(m.delta,2)}%</div>}
              </div>
            );
          })}
        </div>
      ) : <div className="grid grid-cols-5 gap-3 mb-6">{[1,2,3,4,5].map(i=><div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse"/>)}</div>}

      {/* Visual row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Pergerakan hari ini */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">📉 Pergerakan Saham IDX Hari Ini</div>
          {stocksId.length>0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={sectorChartId} margin={{top:0,right:0,left:-24,bottom:0}}>
                <XAxis dataKey="name" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false} tickFormatter={v=>`${v>0?"+":""}${v.toFixed(1)}%`}/>
                <Tooltip formatter={v=>`${v>0?"+":""}${Number(v).toFixed(2)}%`} contentStyle={{fontSize:10,borderRadius:8}}/>
                <Bar dataKey="pct" radius={[3,3,0,0]} isAnimationActive>
                  {sectorChartId.map((d,i)=><Cell key={i} fill={d.pct>=0?"#10b981":"#ef4444"}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-36 bg-slate-50 rounded-xl animate-pulse"/>}
        </div>
        {/* Alokasi ideal */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">🥧 Alokasi Portofolio Ideal — Millennial</div>
          <div className="flex items-center gap-3">
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={allocData} cx="50%" cy="50%" innerRadius={28} outerRadius={48} dataKey="v" strokeWidth={2} stroke="white">
                  {allocData.map((e,i)=><Cell key={i} fill={e.fill}/>)}
                </Pie>
                <Tooltip formatter={v=>`${v}%`} contentStyle={{fontSize:10,borderRadius:8}}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {allocData.map(a=>(
                <div key={a.name} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full flex-shrink-0" style={{background:a.fill}}/>
                  <span className="text-xs text-slate-600 flex-1">{a.name}</span>
                  <span className="text-xs font-bold text-slate-700">{a.v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="id">
        <TabsList className="bg-slate-100 flex flex-wrap h-auto gap-1 p-1 rounded-xl mb-4">
          <TabsTrigger value="id" className="rounded-lg text-xs">🇮🇩 Saham Indonesia</TabsTrigger>
          <TabsTrigger value="global" className="rounded-lg text-xs">🌍 Saham Global</TabsTrigger>
          <TabsTrigger value="alt" className="rounded-lg text-xs">💰 Investasi Alternatif</TabsTrigger>
          <TabsTrigger value="simulator" className="rounded-lg text-xs">🧮 Simulasi Investasi</TabsTrigger>
        </TabsList>

        <TabsContent value="id">
          <div className="mb-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-xs text-emerald-700">🟢 <strong>Saham IDX pilihan</strong> — harga live dari Yahoo Finance (update 2 menit). Tap "AI Insight" untuk analisa teknikal + fundamental + makro per saham.</p>
          </div>
          <div className="space-y-3">
            {stocksId.map(s=><StockCard key={s.ticker} s={s} currency="IDR" lang={lang}/>)}
          </div>
          {stocksId.length>0 && (
            <div className="mt-4">
              <AIInsightButton topic="investment_strategy" context={{market:"Indonesia", overview:market, picks:stocksId.map(x=>x.ticker)}} label={lang==="id"?"🤖 AI Strategi Pasar Indonesia":"🤖 AI Indonesia Market Strategy"} testId="ai-strategy-id"/>
            </div>
          )}
        </TabsContent>

        <TabsContent value="global">
          <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs text-blue-700">🌍 <strong>Saham global pilihan</strong> — harga live dari Yahoo Finance (USD). Cocok untuk diversifikasi portofolio ke luar IDX. Tap "AI Insight" untuk analisa mendalam.</p>
          </div>
          {stocksGl.length>0 && (
            <div className="mb-4 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">📊 Pergerakan Global Hari Ini</div>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={sectorChartGl} margin={{top:0,right:0,left:-24,bottom:0}}>
                  <XAxis dataKey="name" tick={{fontSize:9,fill:"#94a3b8"}} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={v=>`${v>0?"+":""}${Number(v).toFixed(2)}%`} contentStyle={{fontSize:10,borderRadius:8}}/>
                  <Bar dataKey="pct" radius={[3,3,0,0]} isAnimationActive>
                    {sectorChartGl.map((d,i)=><Cell key={i} fill={d.pct>=0?"#10b981":"#ef4444"}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="space-y-3">
            {stocksGl.map(s=><StockCard key={s.ticker} s={s} currency="USD" lang={lang}/>)}
          </div>
          {stocksGl.length>0 && (
            <div className="mt-4">
              <AIInsightButton topic="investment_strategy" context={{market:"Global",overview:market,picks:stocksGl.map(x=>x.ticker)}} label={lang==="id"?"🤖 AI Strategi Global":"🤖 AI Global Strategy"} testId="ai-strategy-global"/>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alt">
          <div className="mb-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
            <p className="text-xs text-amber-700">💡 <strong>Instrumen investasi alternatif</strong> — pilihan di luar saham, sesuai horizon & risiko kamu. Data yield bersifat indikatif berdasarkan kondisi pasar Indonesia.</p>
          </div>
          <div className="space-y-4">
            {alts.map((group)=>{
              const detail = Object.values(ALT_DETAIL).find((d,i)=>i===alts.indexOf(group)) || ALT_DETAIL["Short Term (< 1 thn)"];
              const Icon = [Shield,Lightning,Rocket][alts.indexOf(group)] || Shield;
              const colors = [
                {bg:"bg-blue-50",text:"text-blue-700",border:"border-blue-100"},
                {bg:"bg-amber-50",text:"text-amber-700",border:"border-amber-100"},
                {bg:"bg-emerald-50",text:"text-emerald-700",border:"border-emerald-100"},
              ][alts.indexOf(group)] || {bg:"bg-slate-50",text:"text-slate-600",border:"border-slate-100"};
              return (
                <section key={group.horizon} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className={`${colors.bg} px-5 py-4 flex items-center gap-3 border-b ${colors.border}`}>
                    <Icon size={22} weight="duotone" className={colors.text}/>
                    <div>
                      <h3 className={`font-bold ${colors.text}`}>{group.horizon}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {[
                          "Ideal untuk dana darurat & parking cash. Prioritas: likuiditas + keamanan modal.",
                          "Untuk DP rumah, pernikahan, pendidikan. Return lebih baik dengan risiko terukur.",
                          "Untuk pensiun & kebebasan finansial. Biarkan compound interest bekerja selama bertahun-tahun.",
                        ][alts.indexOf(group)]}
                      </p>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    {group.options.map((o,i)=>(
                      <div key={i} className={`p-3 rounded-xl border ${colors.border} ${colors.bg}`}>
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <span className={`font-bold text-sm ${colors.text}`}>{o.name}</span>
                          <div className="flex gap-2">
                            <span className="text-[11px] bg-white/70 px-2 py-0.5 rounded-full font-medium text-slate-600">Yield: {o.yield}</span>
                            <span className="text-[11px] bg-white/70 px-2 py-0.5 rounded-full font-medium text-slate-600">Risiko: {o.risk}</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{o.note}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 pb-4">
                    <AIInsightButton topic="investment_strategy" context={{horizon:group.horizon, options:group.options}} label={lang==="id"?"🤖 AI Strategi Horizon Ini":"🤖 AI Strategy for This Horizon"} testId={`ai-alt-${alts.indexOf(group)}`}/>
                  </div>
                </section>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="simulator">
          <InvestmentSimulator/>
        </TabsContent>
      </Tabs>

      <p className="text-[11px] text-slate-400 mt-6 text-center">⚠️ Disclaimer: Konten edukasi, bukan saran investasi personal. DYOR (Do Your Own Research) sebelum mengambil keputusan.</p>

      <ChatBox context={{market,stocks_id:stocksId,stocks_global:stocksGl}} contextLabel={lang==="id"?"Diskusi investasi & portofolio":"Investment & portfolio chat"}/>
    </div>
  );
}
