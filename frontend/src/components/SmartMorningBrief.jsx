import { useState, useEffect } from "react";
import { SunHorizon, Sparkle, X, ArrowClockwise, Spinner } from "@phosphor-icons/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Markdown from "@/lib/markdown";

const STORAGE_KEY = "smb_last_shown";
const COOLDOWN_MS = 8 * 60 * 60 * 1000; // 8 jam

function getGreeting(lang) {
  const h = new Date().getHours();
  if (lang === "id") {
    if (h < 11) return "Selamat pagi";
    if (h < 15) return "Selamat siang";
    if (h < 19) return "Selamat sore";
    return "Selamat malam";
  }
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function SmartMorningBrief({ market }) {
  const { lang, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Auto-open once per 8 jam
  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY);
    if (!last || Date.now() - Number(last) > COOLDOWN_MS) {
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const fetchBrief = async () => {
    setLoading(true);
    setErr(null);
    try {
      const now = new Date();
      const context = {
        date: now.toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        }),
        time: now.toLocaleTimeString(lang === "id" ? "id-ID" : "en-US", { hour: "2-digit", minute: "2-digit" }),
        market: market ? {
          ihsg: market.ihsg,
          usd_idr: market.usd_idr,
          gold: market.gold_idr_gram,
          btc: market.btc_usd,
        } : "unavailable",
      };
      const { data } = await api.post("/ai/insight", {
        topic: "general",
        context,
        language: lang,
      });
      setBrief(data.insight);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch (e) {
      setErr(e?.response?.data?.detail || "Gagal memuat brief");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setBrief(null);
    setOpen(true);
    fetchBrief();
  };

  return (
    <>
      {/* Trigger button on Hub */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E8E6E1] bg-white hover:border-[#2c4a3b] hover:shadow-sm transition-all text-sm font-medium text-ink-body group"
      >
        <SunHorizon size={18} weight="duotone" className="text-[#B76E38] group-hover:scale-110 transition-transform" />
        Smart Morning Brief
        <Sparkle size={14} weight="fill" className="text-[#B76E38] ml-auto" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-white p-0 gap-0 rounded-2xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#2c4a3b] to-[#1e3328] p-6 rounded-t-2xl relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 text-white/70 text-xs font-medium uppercase tracking-widest mb-2">
              <SunHorizon size={14} weight="fill" />
              Smart Morning Brief
            </div>
            <h2 className="text-white text-2xl font-bold leading-tight">
              {getGreeting(lang)}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! ☀️
            </h2>
            <p className="text-white/60 text-sm mt-1">
              {new Date().toLocaleDateString(lang === "id" ? "id-ID" : "en-US", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>

            {/* Market mini strip */}
            {market && (
              <div className="flex gap-3 mt-4 flex-wrap">
                {[
                  { label: "IHSG", val: market.ihsg?.value?.toLocaleString(), delta: market.ihsg?.change_pct },
                  { label: "USD/IDR", val: Math.round(market.usd_idr?.value || 0).toLocaleString() },
                  { label: "BTC", val: market.btc_usd ? `$${Math.round(market.btc_usd.value).toLocaleString()}` : "—", delta: market.btc_usd?.change_pct },
                ].map((m) => (
                  <div key={m.label} className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5">
                    <div className="text-white/50 text-[10px] uppercase tracking-wider">{m.label}</div>
                    <div className="text-white text-sm font-semibold">{m.val}</div>
                    {m.delta !== undefined && (
                      <div className={`text-[10px] font-medium ${m.delta >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {m.delta >= 0 ? "▲" : "▼"} {Math.abs(m.delta).toFixed(2)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-6">
            {loading && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Spinner size={32} weight="duotone" className="text-[#B76E38] animate-spin" />
                <p className="text-sm text-ink-muted">
                  {lang === "id" ? "Menyeduh briefing hari ini..." : "Brewing your daily brief..."}
                </p>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="h-1.5 w-1.5 rounded-full bg-[#B76E38] animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  ))}
                </div>
              </div>
            )}
            {err && (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-sm text-red-500">{err}</p>
                <button onClick={fetchBrief} className="flex items-center gap-2 text-sm text-[#2c4a3b] font-medium hover:underline">
                  <ArrowClockwise size={14} /> Coba lagi
                </button>
              </div>
            )}
            {brief && (
              <div className="prose prose-sm max-w-none">
                <Markdown text={brief} />
              </div>
            )}
          </div>

          {/* Footer */}
          {brief && (
            <div className="px-6 pb-5 flex items-center justify-between">
              <span className="text-[11px] text-ink-muted flex items-center gap-1">
                <Sparkle size={11} weight="fill" className="text-[#B76E38]" />
                Powered by Claude
              </span>
              <button
                onClick={fetchBrief}
                className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-body transition-colors"
              >
                <ArrowClockwise size={13} />
                {lang === "id" ? "Refresh" : "Refresh"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
