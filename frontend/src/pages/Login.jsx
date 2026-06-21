import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Backspace } from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

export default function Login() {
  const { login, lang, switchLang } = useAuth();
  const nav = useNavigate();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const press = async (d) => {
    if (busy) return;
    setErr("");
    const next = (pin + d).slice(0, 6);
    setPin(next);
    if (next.length === 6) {
      setBusy(true);
      try {
        await login(next);
        nav("/app");
      } catch (e) {
        setErr(t(lang, "wrong_passcode"));
        setPin("");
      } finally {
        setBusy(false);
      }
    }
  };

  const back = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="min-h-screen bg-linen flex flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="absolute top-6 right-6 flex gap-1">
        <button
          data-testid="login-lang-id"
          onClick={() => switchLang("id")}
          className={`text-xs px-3 py-1 rounded-full ${lang === "id" ? "bg-forest text-white" : "bg-white text-ink-muted border border-[#E8E6E1]"}`}
        >
          ID
        </button>
        <button
          data-testid="login-lang-en"
          onClick={() => switchLang("en")}
          className={`text-xs px-3 py-1 rounded-full ${lang === "en" ? "bg-forest text-white" : "bg-white text-ink-muted border border-[#E8E6E1]"}`}
        >
          EN
        </button>
      </div>

      <div className="text-center mb-10">
        <div className="font-editorial text-5xl text-ink leading-none">One Smart</div>
        <div className="text-xs uppercase tracking-[0.2em] text-ink-muted mt-3">{t(lang, "your_hub")}</div>
      </div>

      <div className="flex gap-3 mb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            data-testid={`pin-dot-${i}`}
            className={`dot-indicator ${i < pin.length ? "filled" : ""}`}
          />
        ))}
      </div>
      <div className="text-sm text-ink-muted mb-6 min-h-[20px]">
        {err ? <span className="text-red-600" data-testid="login-error">{err}</span> : t(lang, "enter_passcode")}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <button
            key={n}
            data-testid={`key-${n}`}
            onClick={() => press(String(n))}
            className="keypad-key"
          >
            {n}
          </button>
        ))}
        <div />
        <button data-testid="key-0" onClick={() => press("0")} className="keypad-key">0</button>
        <button
          data-testid="key-back"
          onClick={back}
          className="keypad-key !bg-transparent !border-transparent"
        >
          <Backspace size={24} weight="duotone" className="text-ink-muted" />
        </button>
      </div>
    </div>
  );
}
