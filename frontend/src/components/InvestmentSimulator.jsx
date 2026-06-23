import { useState } from "react";
import { Calculator, Sparkle, TrendUp, ArrowsClockwise, Warning } from "@phosphor-icons/react";
import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const RISK_OPTIONS = [
  { value: "conservative", label: { id: "Konservatif", en: "Conservative" }, desc: { id: "Prioritas keamanan, return stabil 6–8%/thn", en: "Safety first, stable 6–8%/yr returns" }, color: "#60a5fa" },
  { value: "moderate", label: { id: "Moderat", en: "Moderate" }, desc: { id: "Seimbang, target return 8–12%/thn", en: "Balanced, target 8–12%/yr returns" }, color: "#10b981" },
  { value: "aggressive", label: { id: "Agresif", en: "Aggressive" }, desc: { id: "Maksimalkan return, toleransi volatilitas tinggi", en: "Maximize returns, high volatility tolerance" }, color: "#f59e0b" },
];

const HORIZON_OPTIONS = [1, 3, 5, 10, 20];

function fmtRp(n) {
  if (n >= 1e12) return `Rp ${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} jt`;
  return `Rp ${Number(n).toLocaleString("id-ID")}`;
}

export default function InvestmentSimulator() {
  const { lang } = useAuth();
  const [capital, setCapital] = useState("");
  const [risk, setRisk] = useState("moderate");
  const [horizon, setHorizon] = useState(5);
  const [goals, setGoals] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    const cap = parseFloat(capital.replace(/[^0-9]/g, "")) * 1_000_000;
    if (!cap || cap < 1_000_000) {
      setError(lang === "id" ? "Masukkan modal minimal Rp 1 juta" : "Enter at least Rp 1 million");
      return;
    }
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/ai/investment-simulator", {
        capital_idr: cap,
        risk_profile: risk,
        horizon_years: horizon,
        goals,
        language: lang,
      });
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.detail || (lang === "id" ? "Gagal membuat simulasi. Coba lagi." : "Simulation failed. Try again."));
    } finally {
      setLoading(false);
    }
  };

  const riskInfo = RISK_OPTIONS.find(r => r.value === risk);

  return (
    <div className="space-y-5">
      {/* Input card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={18} weight="duotone" className="text-[#2c4a3b]"/>
          <h2 className="font-bold text-slate-800">{lang === "id" ? "Parameter Simulasi" : "Simulation Parameters"}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Capital */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              {lang === "id" ? "💰 Modal Investasi (juta Rp)" : "💰 Investment Capital (million Rp)"}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">Rp</span>
              <input
                type="number"
                value={capital}
                onChange={e => setCapital(e.target.value)}
                placeholder="50"
                className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2c4a3b] focus:ring-1 focus:ring-[#2c4a3b]/20"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">juta</span>
            </div>
            {capital && <p className="text-[11px] text-slate-400 mt-1">{fmtRp(parseFloat(capital || 0) * 1e6)}</p>}
          </div>

          {/* Horizon */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              {lang === "id" ? "📅 Horizon Investasi" : "📅 Investment Horizon"}
            </label>
            <div className="flex gap-2 flex-wrap">
              {HORIZON_OPTIONS.map(h => (
                <button key={h} onClick={() => setHorizon(h)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    horizon === h ? "bg-[#2c4a3b] text-white border-[#2c4a3b]" : "border-slate-200 text-slate-600 hover:border-[#2c4a3b]/40"
                  }`}>
                  {h} {lang === "id" ? "thn" : "yr"}
                </button>
              ))}
            </div>
          </div>

          {/* Risk profile */}
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              {lang === "id" ? "⚡ Profil Risiko" : "⚡ Risk Profile"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {RISK_OPTIONS.map(r => (
                <button key={r.value} onClick={() => setRisk(r.value)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    risk === r.value ? "border-2" : "border border-slate-200 hover:border-slate-300"
                  }`}
                  style={risk === r.value ? { borderColor: r.color, background: `${r.color}12` } : {}}>
                  <div className="font-bold text-xs" style={{ color: risk === r.value ? r.color : "#64748b" }}>{r.label[lang] || r.label.id}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">{r.desc[lang] || r.desc.id}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Goals */}
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              🎯 {lang === "id" ? "Tujuan Investasi (opsional)" : "Investment Goals (optional)"}
            </label>
            <input
              type="text"
              value={goals}
              onChange={e => setGoals(e.target.value)}
              placeholder={lang === "id" ? "Mis: DP rumah 5 tahun, dana pensiun, atau biaya S2..." : "E.g: house down payment in 5 years, retirement fund..."}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#2c4a3b] focus:ring-1 focus:ring-[#2c4a3b]/20"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">
            <Warning size={15}/> {error}
          </div>
        )}

        <button onClick={run} disabled={loading || !capital}
          className="mt-4 w-full py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #2c4a3b 0%, #1e3328 100%)" }}>
          {loading
            ? <><ArrowsClockwise size={16} className="animate-spin"/> {lang === "id" ? "Menganalisa..." : "Analyzing..."}</>
            : <><Sparkle size={16} weight="fill"/> {lang === "id" ? "Analisa dengan AI" : "Analyze with AI"}</>}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-gradient-to-br from-[#1a2f24] to-[#2c4a3b] rounded-2xl p-5 text-white">
            <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">
              <Sparkle size={11} weight="fill" className="inline mr-1"/>
              {lang === "id" ? "Ringkasan Strategi AI" : "AI Strategy Summary"}
            </div>
            <p className="text-sm leading-relaxed text-white/90">{result.summary}</p>
          </div>

          {/* Allocation */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">
              📊 {lang === "id" ? "Alokasi Optimal" : "Optimal Allocation"}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.allocation} margin={{ top: 4, right: 4, left: -10, bottom: 40 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} angle={-35} textAnchor="end" interval={0}/>
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={v => `${v}%`}/>
                    <Tooltip formatter={(v, _, p) => [`${v}% · ${fmtRp(p.payload.amount_idr)}`, "Alokasi"]} contentStyle={{ fontSize: 11, borderRadius: 8 }}/>
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]} isAnimationActive>
                      {result.allocation?.map((_, i) => (
                        <Cell key={i} fill={["#2c4a3b","#4ade80","#f59e0b","#60a5fa","#a78bfa","#fb923c","#f472b6"][i % 7]}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {result.allocation?.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1" style={{ background: ["#2c4a3b","#4ade80","#f59e0b","#60a5fa","#a78bfa","#fb923c","#f472b6"][i % 7] }}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">{a.name}</span>
                        <span className="text-xs font-bold text-slate-700">{a.pct}% · {fmtRp(a.amount_idr)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{a.rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Projections */}
          {result.projections?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-1">📈 {lang === "id" ? "Proyeksi Pertumbuhan" : "Growth Projections"}</h3>
              <p className="text-xs text-slate-400 mb-4">{lang === "id" ? "3 skenario: konservatif, moderat, optimis" : "3 scenarios: conservative, moderate, optimistic"}</p>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.projections} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="year" tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={v => `Thn ${v}`}/>
                    <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} tickFormatter={fmtRp}/>
                    <Tooltip formatter={v => fmtRp(v)} contentStyle={{ fontSize: 10, borderRadius: 8 }}/>
                    <Legend iconSize={8} formatter={v => <span style={{ fontSize: 10, color: "#64748b" }}>{v}</span>}/>
                    <Line type="monotone" dataKey="conservative" stroke="#60a5fa" strokeWidth={2} dot={false} name="Konservatif"/>
                    <Line type="monotone" dataKey="moderate" stroke="#10b981" strokeWidth={2.5} dot={false} name="Moderat"/>
                    <Line type="monotone" dataKey="optimistic" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" name="Optimis"/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* DCA + Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.monthly_dca && (
              <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4">
                <h3 className="font-bold text-emerald-700 mb-2 text-sm">💸 {lang === "id" ? "Strategi DCA Bulanan" : "Monthly DCA Strategy"}</h3>
                <div className="text-2xl font-bold text-emerald-800 mb-1">{fmtRp(result.monthly_dca.amount)}</div>
                <p className="text-xs text-emerald-600">{result.monthly_dca.schedule}</p>
                <p className="text-xs text-emerald-600 mt-1">{result.monthly_dca.note}</p>
              </div>
            )}
            {result.key_actions?.length > 0 && (
              <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
                <h3 className="font-bold text-blue-700 mb-2 text-sm">🎯 {lang === "id" ? "Langkah Pertama" : "Key Actions"}</h3>
                <ol className="space-y-1">
                  {result.key_actions.map((a, i) => (
                    <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                      <span className="font-bold flex-shrink-0">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {result.risks?.length > 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
              <h3 className="font-bold text-amber-700 mb-2 text-sm">⚠️ {lang === "id" ? "Risiko yang Perlu Diperhatikan" : "Key Risks"}</h3>
              <ul className="space-y-1">
                {result.risks.map((r, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <span className="flex-shrink-0">•</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.disclaimer && (
            <p className="text-[11px] text-slate-400 text-center leading-relaxed">{result.disclaimer}</p>
          )}

          <button onClick={() => { setResult(null); setCapital(""); setGoals(""); }}
            className="w-full py-2.5 border border-slate-200 rounded-xl text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">
            {lang === "id" ? "🔄 Simulasi Ulang" : "🔄 New Simulation"}
          </button>
        </div>
      )}
    </div>
  );
}
