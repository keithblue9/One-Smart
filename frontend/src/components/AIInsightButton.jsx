import { useState } from "react";
import { Sparkle, ArrowRight, X } from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const trigger = async () => {
    setOpen(true);
    if (insight) return;
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.post("/ai/insight", { topic, context, language: lang });
      setInsight(data.insight);
    } catch (e) {
      setErr(e?.response?.data?.detail || "AI error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        data-testid={testId}
        onClick={trigger}
        className="ai-pill"
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
          </DialogHeader>
          <div className="mt-2">
            {loading && (
              <div className="ai-panel flex items-center gap-3 py-6">
                <div className="h-2.5 w-2.5 rounded-full bg-[#B76E38] animate-pulse" />
                <span className="text-sm text-ink-body">{t(lang, "generating")}</span>
              </div>
            )}
            {err && <div className="text-red-600 text-sm">{err}</div>}
            {insight && (
              <div className="ai-panel">
                <Markdown text={insight} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
