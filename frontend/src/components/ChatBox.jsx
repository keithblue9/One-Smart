import { useState, useRef, useEffect } from "react";
import { ChatCircleDots, X, PaperPlaneTilt, Sparkle, Robot } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Markdown from "@/lib/markdown";

export default function ChatBox({ context = {}, contextLabel }) {
  const { lang } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const suggestions = lang === "id"
    ? ["Bagaimana cara mulai bangun portofolio dengan modal Rp 5 juta?", "Saham mana yang cocok untuk pemula?", "Jelaskan strategi DCA untuk saya"]
    : ["How do I start a portfolio with $300?", "Which stocks suit a beginner?", "Explain DCA strategy for me"];

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const newMessages = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/ai/chat", {
        messages: newMessages,
        context,
        language: lang,
      });
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setMessages([...newMessages, {
        role: "assistant",
        content: lang === "id" ? "Maaf, terjadi error. Coba lagi ya." : "Sorry, an error occurred. Please try again.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3.5 rounded-full bg-gradient-to-r from-[#2c4a3b] to-[#1e3328] text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        >
          <ChatCircleDots size={22} weight="fill" />
          <span className="font-semibold text-sm">{lang === "id" ? "Tanya AI" : "Ask AI"}</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[calc(100vw-3rem)] sm:w-[420px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-[#E8E6E1] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2c4a3b] to-[#1e3328] p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center">
                <Robot size={20} weight="duotone" className="text-white" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">AI Advisor</div>
                <div className="text-white/60 text-[11px]">{contextLabel || (lang === "id" ? "Penasihat finansial & karier" : "Financial & career advisor")}</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center text-center py-6">
                <div className="h-14 w-14 rounded-2xl bg-[#2c4a3b]/10 flex items-center justify-center mb-3">
                  <Sparkle size={28} weight="duotone" className="text-[#2c4a3b]" />
                </div>
                <h3 className="font-bold text-slate-800 mb-1">{lang === "id" ? "Diskusi apa hari ini?" : "What's on your mind?"}</h3>
                <p className="text-xs text-slate-500 mb-4 max-w-[260px]">
                  {lang === "id"
                    ? "Tanya apa saja soal investasi, portofolio, karier, atau keuangan pribadi."
                    : "Ask anything about investing, portfolios, careers, or personal finance."}
                </p>
                <div className="space-y-2 w-full">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      className="w-full text-left text-xs px-3 py-2.5 rounded-xl border border-[#E8E6E1] hover:border-[#2c4a3b] hover:bg-[#2c4a3b]/5 transition-all text-slate-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.role === "user"
                    ? "bg-[#2c4a3b] text-white"
                    : "bg-slate-100 text-slate-800"
                }`}>
                  {m.role === "user" ? m.content : <Markdown text={m.content} />}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl px-4 py-3 flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[#E8E6E1]">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                rows={1}
                placeholder={lang === "id" ? "Ketik pesan..." : "Type a message..."}
                className="flex-1 resize-none rounded-xl border border-[#E8E6E1] px-3 py-2.5 text-sm focus:outline-none focus:border-[#2c4a3b] max-h-24"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="h-10 w-10 rounded-xl bg-[#2c4a3b] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#1e3328] transition-colors flex-shrink-0"
              >
                <PaperPlaneTilt size={18} weight="fill" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              {lang === "id" ? "AI bisa keliru. Bukan ajakan jual/beli." : "AI can make mistakes. Not financial advice."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
