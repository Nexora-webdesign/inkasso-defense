"use client";

import { useMemo, useState } from "react";
import type { PostMeta } from "@/lib/blog-shared";
import { ArticleCard } from "./ArticleCard";

export function BlogExplorer({ posts, categories }: { posts: PostMeta[]; categories: string[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("Alle");

  const filters = useMemo(() => ["Alle", ...categories], [categories]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const byCat = active === "Alle" || p.category === active;
      const byText =
        q === "" ||
        p.title.toLowerCase().includes(q) ||
        p.lead.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return byCat && byText;
    });
  }, [posts, query, active]);

  return (
    <div>
      {/* Suche */}
      <div className="relative mx-auto max-w-xl">
        <svg
          className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artikel suchen…"
          aria-label="Artikel suchen"
          className="w-full rounded-full border border-white/10 bg-night-surface/70 py-3.5 pl-12 pr-5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-mint/50 focus:ring-2 focus:ring-mint/20"
        />
      </div>

      {/* Filter-Pills */}
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        {filters.map((cat) => {
          const on = cat === active;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActive(cat)}
              aria-pressed={on}
              className={
                "btn-press rounded-full px-4 py-2 text-sm font-semibold transition " +
                (on
                  ? "bg-mint text-night shadow-float"
                  : "border border-white/10 bg-night-surface/60 text-slate-300 hover:border-mint/40 hover:text-white")
              }
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {visible.length > 0 ? (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((post) => (
            <ArticleCard key={post.slug} post={post} />
          ))}
        </div>
      ) : (
        <p className="mt-16 text-center text-slate-500">
          Keine Artikel gefunden. Versuche einen anderen Suchbegriff.
        </p>
      )}
    </div>
  );
}
