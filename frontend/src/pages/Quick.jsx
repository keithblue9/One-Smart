import { useEffect, useState } from "react";
import { Plus, Trash, Bell, BellSlash, ListBullets, ListNumbers, TextT, Check, CheckCircle, Circle } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function urlBase64ToUint8Array(b64) {
  const padding = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export default function Quick() {
  const { lang } = useAuth();
  const [notes, setNotes] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [pushReady, setPushReady] = useState(false);

  const fetchNotes = () => api.get("/notes").then((r) => setNotes(r.data.items));
  useEffect(() => { fetchNotes(); }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "granted") setPushReady(true);
  }, []);

  const enablePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Browser tidak mendukung notifikasi");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return toast.error("Izin notifikasi ditolak");
    const reg = await navigator.serviceWorker.ready;
    const { data } = await api.get("/push/public-key");
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.key),
    });
    const json = sub.toJSON();
    await api.post("/push/subscribe", { endpoint: json.endpoint, keys: json.keys });
    setPushReady(true);
    toast.success(t(lang, "enable_notif") + " ✓");
  };

  const sendTest = async () => {
    try {
      const r = await api.post("/push/test");
      toast.success(`${t(lang, "test_notif")}: ${r.data.sent}/${r.data.total}`);
    } catch (e) {
      toast.error(t(lang, "failed"));
    }
  };

  const startNew = () => {
    setEditing({ title: "", content: "", list_type: "bullet", items: [{ text: "", done: false }], reminder_at: "", recurrence: "none" });
    setOpen(true);
  };
  const startEdit = (n) => { setEditing({ ...n, reminder_at: n.reminder_at || "", recurrence: n.recurrence || "none" }); setOpen(true); };

  const save = async () => {
    if (!editing.title.trim()) return toast.error("Judul wajib");
    const payload = {
      title: editing.title,
      content: editing.content || "",
      list_type: editing.list_type,
      items: editing.items.filter((i) => i.text?.trim()),
      reminder_at: editing.reminder_at || null,
      recurrence: editing.recurrence === "none" ? null : editing.recurrence,
    };
    if (editing.id) {
      await api.patch(`/notes/${editing.id}`, payload);
    } else {
      await api.post("/notes", payload);
    }
    toast.success(t(lang, "saved"));
    setOpen(false);
    setEditing(null);
    fetchNotes();
  };

  const remove = async (id) => {
    await api.delete(`/notes/${id}`);
    fetchNotes();
  };

  const toggleItem = async (n, idx) => {
    const items = n.items.map((it, i) => i === idx ? { ...it, done: !it.done } : it);
    await api.patch(`/notes/${n.id}`, { items });
    fetchNotes();
  };

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">{t(lang, "quick")}</p>
          <h1 className="font-editorial text-3xl text-ink mt-1">{t(lang, "notes")}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!pushReady ? (
            <Button data-testid="enable-push" variant="outline" onClick={enablePush} className="border-[#E8E6E1]">
              <Bell size={16} weight="duotone" className="mr-1" />{t(lang, "enable_notif")}
            </Button>
          ) : (
            <Button data-testid="test-push" variant="outline" onClick={sendTest} className="border-[#E8E6E1]">
              <Bell size={16} weight="duotone" className="mr-1" />{t(lang, "test_notif")}
            </Button>
          )}
          <Button data-testid="new-note" onClick={startNew} className="bg-forest hover:bg-forest-hover">
            <Plus size={16} className="mr-1" />{t(lang, "new_note")}
          </Button>
        </div>
      </div>

      {notes.length === 0 && <div className="text-sm text-ink-muted py-10 text-center">{t(lang, "no_items")}</div>}

      <div className="space-y-4">
        {notes.map((n) => (
          <article key={n.id} className="card-base p-5" data-testid={`note-${n.id}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-heading text-lg text-ink">{n.title}</h3>
                {n.content && <p className="text-sm text-ink-body mt-1 whitespace-pre-wrap">{n.content}</p>}
                {n.items?.length > 0 && (
                  <ul className={`mt-2 space-y-1 ${n.list_type === "numbered" ? "list-decimal pl-5" : n.list_type === "bullet" ? "list-disc pl-5" : ""}`}>
                    {n.items.map((it, i) => (
                      <li key={i} className={`text-sm ${n.list_type === "plain" ? "flex items-center gap-2" : ""}`}>
                        {n.list_type === "plain" ? (
                          <button onClick={() => toggleItem(n, i)} data-testid={`toggle-${n.id}-${i}`} className="flex items-center gap-2 text-left">
                            {it.done ? <CheckCircle size={16} weight="fill" className="text-forest" /> : <Circle size={16} className="text-ink-muted" />}
                            <span className={it.done ? "line-through text-ink-muted" : ""}>{it.text}</span>
                          </button>
                        ) : (
                          <span className={it.done ? "line-through text-ink-muted" : ""} onClick={() => toggleItem(n, i)} style={{ cursor: "pointer" }}>{it.text}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {n.reminder_at && (
                  <div className="mt-2 text-xs flex items-center gap-1.5 text-bronze">
                    <Bell size={12} weight="fill" />
                    {new Date(n.reminder_at).toLocaleString(lang === "id" ? "id-ID" : "en-US")}
                    {n.recurrence && n.recurrence !== "none" && <span className="bg-[#F4E8D9] px-1.5 rounded">{t(lang, n.recurrence)}</span>}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button data-testid={`edit-${n.id}`} onClick={() => startEdit(n)} className="text-xs text-forest hover:underline">Edit</button>
                <button data-testid={`delete-${n.id}`} onClick={() => remove(n.id)} className="text-xs text-red-600 hover:underline"><Trash size={14} className="inline" /></button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Editor dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing?.id ? "Edit" : t(lang, "new_note")}</DialogTitle>
            <DialogDescription className="text-xs text-ink-muted">{lang === "id" ? "Atur judul, item, dan reminder" : "Set title, items, and reminder"}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-ink-muted">{t(lang, "title")}</label>
                <Input data-testid="note-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="bg-white" />
              </div>

              <div className="flex gap-2">
                {[
                  { v: "bullet", I: ListBullets, label: t(lang, "bullet_list") },
                  { v: "numbered", I: ListNumbers, label: t(lang, "numbered_list") },
                  { v: "plain", I: TextT, label: t(lang, "plain_text") },
                ].map(({ v, I, label }) => (
                  <button
                    key={v}
                    type="button"
                    data-testid={`list-type-${v}`}
                    onClick={() => setEditing({ ...editing, list_type: v })}
                    className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg border ${editing.list_type === v ? "border-forest bg-[#EFF3F1] text-forest" : "border-[#E8E6E1]"}`}
                  >
                    <I size={14} /> {label}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs text-ink-muted">Items</label>
                <div className="space-y-2">
                  {editing.items.map((it, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        data-testid={`note-item-${i}`}
                        value={it.text}
                        onChange={(e) => {
                          const items = [...editing.items];
                          items[i] = { ...items[i], text: e.target.value };
                          setEditing({ ...editing, items });
                        }}
                        className="bg-white"
                      />
                      <button type="button" onClick={() => {
                        const items = editing.items.filter((_, idx) => idx !== i);
                        setEditing({ ...editing, items: items.length ? items : [{ text: "", done: false }] });
                      }} className="text-red-600 px-2"><Trash size={16} /></button>
                    </div>
                  ))}
                </div>
                <Button data-testid="add-item" type="button" variant="outline" size="sm" className="mt-2 border-[#E8E6E1]" onClick={() => setEditing({ ...editing, items: [...editing.items, { text: "", done: false }] })}>
                  <Plus size={14} className="mr-1" /> {t(lang, "add_item")}
                </Button>
              </div>

              <div>
                <label className="text-xs text-ink-muted">{t(lang, "set_reminder")}</label>
                <Input
                  data-testid="reminder-at"
                  type="datetime-local"
                  value={editing.reminder_at ? editing.reminder_at.slice(0, 16) : ""}
                  onChange={(e) => setEditing({ ...editing, reminder_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                  className="bg-white"
                />
              </div>

              <div>
                <label className="text-xs text-ink-muted">{t(lang, "recurrence")}</label>
                <Select value={editing.recurrence} onValueChange={(v) => setEditing({ ...editing, recurrence: v })}>
                  <SelectTrigger data-testid="recurrence-select" className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t(lang, "none")}</SelectItem>
                    <SelectItem value="daily">{t(lang, "daily")}</SelectItem>
                    <SelectItem value="weekly">{t(lang, "weekly")}</SelectItem>
                    <SelectItem value="monthly">{t(lang, "monthly")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} className="border-[#E8E6E1]">{t(lang, "cancel")}</Button>
            <Button data-testid="save-note" onClick={save} className="bg-forest hover:bg-forest-hover">{t(lang, "save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
