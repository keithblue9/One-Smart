import { useState, useRef, useEffect } from "react";
import { X, PaperPlaneTilt, Sparkle, Star, ArrowsClockwise } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Markdown from "@/lib/markdown";

const SUGGESTIONS = {
  id: [
    "Saya mau FIRE (Financial Independence) sebelum 40. Dari mana mulai?",
    "Pilih S2 ke luar negeri atau langsung kerja & invest sendiri?",
    "Gaji saya Rp 15 juta/bulan. Bagaimana alokasi idealnya?",
    "Saya bosan kerja kantoran. Mau side hustle tapi bingung mulai dari mana.",
    "Skill apa yang harus saya pelajari sekarang untuk 5 tahun ke depan?",
    "Apakah saya harus pindah ke Singapura untuk karier yang lebih baik?",
  ],
  en: [
    "I want FIRE (Financial Independence) before 40. Where to start?",
    "Should I pursue a master's abroad or work & invest instead?",
    "My salary is $3,000/month. What's the ideal allocation?",
    "I'm bored of my 9-5. Want a side hustle but don't know where to start.",
    "What skills should I learn now for the next 5 years?",
    "Should I relocate to Singapore for better career prospects?",
  ],
};

export default function LifeGoalAssistant() {
  const { lang } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setShowSuggestions(false);
    const newMessages = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/ai/life-goal-chat", {
        messages: newMessages,
        language: lang,
      });
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages([...newMessages, {
        role: "assistant",
        content: lang === "id"
          ? "Maaf, terjadi error. Coba lagi ya 🙏"
          : "Sorry, an error occurred. Please try again 🙏",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setShowSuggestions(true);
    setInput("");
  };

  return (
    <>
      {/* Floating bubble FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-5 z-50 h-14 w-14 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all flex items-center justify-center"
          style={{background:"linear-gradient(135deg, #2c4a3b 0%, #1e3328 100%)"}}
          title="Life Goal Assistant"
        >
          <Star size={24} weight="fill" className="text-amber-300"/>
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse"/>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col sm:bottom-6 sm:right-6"
          style={{width:"min(420px, calc(100vw - 2rem))", height:"min(600px, 80vh)"}}>
          <div className="flex flex-col h-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">

            {/* Header */}
            <div className="flex-shrink-0 p-4 flex items-center justify-between"
              style={{background:"linear-gradient(135deg, #1a2f24 0%, #2c4a3b 100%)"}}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{background:"rgba(255,255,255,0.15)"}}>
                  <Star size={20} weight="fill" className="text-amber-300"/>
                </div>
                <div>
                  <div className="text-white font-bold text-sm">Life Goal Assistant</div>
                  <div className="text-white/60 text-[11px] flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                    {lang === "id" ? "Siap membantu perjalanan hidupmu" : "Ready to help your life journey"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button onClick={reset} className="text-white/50 hover:text-white/80 transition-colors p-1">
                    <ArrowsClockwise size={16}/>
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white/80 transition-colors p-1">
                  <X size={18}/>
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {messages.length === 0 && (
                <div className="flex flex-col items-center text-center py-4">
                  <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-3"
                    style={{background:"linear-gradient(135deg, #2c4a3b20 0%, #2c4a3b10 100%)"}}>
                    <Sparkle size={32} weight="duotone" className="text-[#2c4a3b]"/>
                  </div>
                  <h3 className="font-bold text-slate-800 text-base mb-1">
                    {lang === "id" ? "Halo! Ada yang mau kamu raih? 🎯" : "Hello! What do you want to achieve? 🎯"}
                  </h3>
                  <p className="text-xs text-slate-500 mb-5 max-w-[280px] leading-relaxed">
                    {lang === "id"
                      ? "Diskusikan karier, finansial, pendidikan, relokasi, atau apapun tentang hidupmu. Aku di sini untuk membantu kamu berpikir lebih jernih."
                      : "Discuss career, finances, education, relocation, or anything about your life. I'm here to help you think more clearly."}
                  </p>
                  {showSuggestions && (
                    <div className="space-y-2 w-full text-left">
                      {(SUGGESTIONS[lang] || SUGGESTIONS.id).map((s, i) => (
                        <button key={i} onClick={() => send(s)}
                          className="w-full text-left text-xs px-3 py-2.5 rounded-xl border border-slate-200 hover:border-[#2c4a3b] hover:bg-[#2c4a3b]/5 transition-all text-slate-700 leading-relaxed">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                  {m.role === "assistant" && (
                    <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                      style={{background:"linear-gradient(135deg, #2c4a3b 0%, #1e3328 100%)"}}>
                      <Star size={13} weight="fill" className="text-amber-300"/>
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "text-white rounded-tr-sm"
                      : "bg-slate-100 text-slate-800 rounded-tl-sm"
                  }`} style={m.role === "user" ? {background:"linear-gradient(135deg, #2c4a3b 0%, #1e3328 100%)"} : {}}>
                    {m.role === "user" ? m.content : <Markdown text={m.content}/>}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start gap-2">
                  <div className="h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{background:"linear-gradient(135deg, #2c4a3b 0%, #1e3328 100%)"}}>
                    <Star size={13} weight="fill" className="text-amber-300"/>
                  </div>
                  <div className="bg-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                    {[0,1,2].map(i => (
                      <div key={i} className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
                        style={{animationDelay:`${i*150}ms`}}/>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 p-3 border-t border-slate-100">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  rows={1}
                  placeholder={lang === "id" ? "Cerita atau tanya apa saja..." : "Ask or share anything..."}
                  className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#2c4a3b] focus:ring-1 focus:ring-[#2c4a3b]/20 max-h-28 leading-relaxed"
                />
                <button onClick={() => send()} disabled={!input.trim() || loading}
                  className="h-10 w-10 rounded-xl flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition-all flex-shrink-0"
                  style={{background:"linear-gradient(135deg, #2c4a3b 0%, #1e3328 100%)"}}>
                  <PaperPlaneTilt size={17} weight="fill" className="text-white"/>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                Powered by Perplexity · {lang === "id" ? "Bukan pengganti profesional berlisensi" : "Not a substitute for licensed professionals"}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
