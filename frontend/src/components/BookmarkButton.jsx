import { useEffect, useState } from "react";
import { BookmarkSimple } from "@phosphor-icons/react";
import { api } from "@/lib/api";

// Lightweight in-memory bookmark store synced via API
let bookmarksCache = null;
const listeners = new Set();

async function ensureLoaded() {
  if (bookmarksCache) return bookmarksCache;
  const { data } = await api.get("/bookmarks");
  bookmarksCache = data.items || [];
  return bookmarksCache;
}

function notify() {
  listeners.forEach((l) => l(bookmarksCache));
}

export function useBookmarks(kind) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let mounted = true;
    ensureLoaded().then((arr) => {
      if (!mounted) return;
      setItems(kind ? arr.filter((b) => b.kind === kind) : arr);
    });
    const listener = (arr) => {
      if (!mounted) return;
      setItems(kind ? arr.filter((b) => b.kind === kind) : arr);
    };
    listeners.add(listener);
    return () => { mounted = false; listeners.delete(listener); };
  }, [kind]);
  return items;
}

export function refreshBookmarks() {
  bookmarksCache = null;
  ensureLoaded().then(notify);
}

export default function BookmarkButton({ kind, itemId, payload, testId }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    ensureLoaded().then((arr) => {
      if (!mounted) return;
      setSaved(arr.some((b) => b.kind === kind && b.item_id === itemId));
    });
    const l = (arr) => mounted && setSaved(arr.some((b) => b.kind === kind && b.item_id === itemId));
    listeners.add(l);
    return () => { mounted = false; listeners.delete(l); };
  }, [kind, itemId]);

  const toggle = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const { data } = await api.post("/bookmarks/toggle", { kind, item_id: itemId, payload });
    setSaved(data.bookmarked);
    // refresh cache
    bookmarksCache = null;
    ensureLoaded().then(notify);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid={testId || `bookmark-${kind}-${itemId}`}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-full transition-colors ${saved ? "text-bronze bg-[#F4E8D9]" : "text-ink-muted hover:bg-stone hover:text-bronze"}`}
      aria-label={saved ? "Remove bookmark" : "Add bookmark"}
    >
      <BookmarkSimple size={18} weight={saved ? "fill" : "regular"} />
    </button>
  );
}
