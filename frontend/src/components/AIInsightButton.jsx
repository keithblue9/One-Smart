import { useState } from "react";
import { Sparkle, ArrowRight, WarningCircle, ArrowClockwise } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import Markdown from "@/lib/markdown";

export default function AIInsightButton({ topic, context, label, testId = "ai-insight-button" }) {
  const { lang } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState(null);
  const [err, setErr] = useState(null);

  const fetchInsight = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.post("/ai/insight", { topic, context, language: lang });
      setInsight(data.insight);
    } catch (e) {
      setErr(e?.response?.data?.detail || t(lang, "ai_error_friendly"));
    } finally {
      setLoading(false);
    }
  };

  const trigger = () => {
    setOpen(true);
    if (insight) return;
    fetchInsight();
  };

  return (
    <>
      <button
        data-testid={testId}
        onClick={trigger}
        className="ai-pill transition-transform active:scale-95 hover:shadow-sm"
      >
        <Sparkle size={16} weight="fill" />
        {label || t(lang, "ai_insight")}
        <ArrowRight size={14} />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <Sparkle size={20} weight="fill" className="text-[#B76E38]" />
              {t(lang, "ai_insight")}
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">
              Powered by Perplexity Sonar
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {loading && (
              <div className="ai-panel flex items-center gap-3 py-6 animate-in fade-in duration-300">
                <div className="h-2.5 w-2.5 rounded-full bg-[#B76E38] animate-pulse" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#B76E38] animate-pulse [animation-delay:150ms]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#B76E38] animate-pulse [animation-delay:300ms]" />
                <span className="text-sm text-ink-body">{t(lang, "generating")}</span>
              </div>
            )}
            {err && !loading && (
              <div className="flex flex-col items-center text-center gap-3 py-8 animate-in fade-in duration-300">
                <WarningCircle size={32} className="text-red-400" />
                <p className="text-sm text-slate-500 max-w-xs">{err}</p>
                <button
                  onClick={fetchInsight}
                  className="flex items-center gap-2 text-sm font-medium text-[#B76E38] border border-[#B76E38]/30 rounded-full px-4 py-2 hover:bg-[#B76E38]/5 transition-colors"
                >
                  <ArrowClockwise size={15} /> {t(lang, "retry")}
                </button>
              </div>
            )}
            {insight && !loading && (
              <div className="ai-panel animate-in fade-in duration-300">
                <Markdown text={insight} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
