import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookmarkSimple, GraduationCap, Briefcase, ArrowRight } from "@phosphor-icons/react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { t } from "@/lib/i18n";

export default function Bookmarks() {
  const { lang } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/bookmarks").then((r) => setItems(r.data.items || [])).finally(() => setLoading(false));
  }, []);

  const scholarships = items.filter((x) => x.kind === "scholarship");
  const companies = items.filter((x) => x.kind === "company");

  return (
    <div className="px-5 lg:px-10 py-6 lg:py-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.15em] text-ink-muted">{t(lang, "bookmarks")}</p>
        <h1 className="font-editorial text-3xl text-ink mt-1 flex items-center gap-2">
          <BookmarkSimple size={28} weight="fill" className="text-bronze" />
          {t(lang, "bookmarks")}
        </h1>
      </div>

      {loading && <div className="text-sm text-ink-muted">{t(lang, "loading")}</div>}
      {!loading && items.length === 0 && (
        <div className="card-base p-10 text-center" data-testid="bookmarks-empty">
          <p className="text-sm text-ink-muted">{t(lang, "no_bookmarks")}</p>
        </div>
      )}

      {scholarships.length > 0 && (
        <section className="mb-8" data-testid="bookmarks-scholarships">
          <h2 className="font-heading text-lg text-ink mb-3 flex items-center gap-2">
            <GraduationCap size={20} weight="duotone" className="text-forest" />
            {t(lang, "scholarships")} ({scholarships.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {scholarships.map((b) => (
              <Link key={b.id} to="/app/education" className="card-base p-4 flex items-center justify-between gap-3" data-testid={`bm-scholarship-${b.item_id}`}>
                <div>
                  <div className="font-medium text-ink">{b.payload?.name || b.item_id}</div>
                  <div className="text-xs text-ink-muted">{b.payload?.country} {b.payload?.deadline && `· ${t(lang, "deadline")}: ${b.payload.deadline}`}</div>
                </div>
                <ArrowRight size={16} className="text-ink-muted" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {companies.length > 0 && (
        <section data-testid="bookmarks-companies">
          <h2 className="font-heading text-lg text-ink mb-3 flex items-center gap-2">
            <Briefcase size={20} weight="duotone" className="text-forest" />
            {t(lang, "top_companies")} ({companies.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {companies.map((b) => (
              <Link key={b.id} to="/app/job" className="card-base p-4 flex items-center justify-between gap-3" data-testid={`bm-company-${b.item_id}`}>
                <div>
                  <div className="font-medium text-ink">{b.payload?.name || b.item_id}</div>
                  <div className="text-xs text-ink-muted">{b.payload?.industry} · {b.payload?.location}</div>
                </div>
                <ArrowRight size={16} className="text-ink-muted" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
