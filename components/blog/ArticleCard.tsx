// components/blog/ArticleCard.tsx
import Link from "next/link";
import type { PostMeta } from "@/lib/blog-shared";
import { formatDate } from "@/lib/blog-shared";

// Cover-Platzhalter: ausschließlich App-Tokens (night/mint), dezent variiert.
function coverGradient(seed: string): string {
  const palettes = [
    "from-mint/20 via-night-surface to-night-inset",
    "from-mint/10 via-night-surface to-night-inset",
    "from-night-surface via-night-inset to-night",
    "from-mint/15 via-night-inset to-night",
  ];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[h % palettes.length];
}

export function ArticleCard({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-4xl border border-white/10 bg-night-surface/70 bezel-soft outline-none transition-transform duration-300 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:ring-2 focus-visible:ring-mint/60 focus-visible:ring-offset-2 focus-visible:ring-offset-night"
    >
      {/* Cover / Bild-Platzhalter */}
      <div className={`relative aspect-[16/10] overflow-hidden bg-gradient-to-br ${coverGradient(post.slug)}`}>
        {post.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="h-10 w-10 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 15l5-4 4 3 3-4 6 6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8.5" cy="9" r="1.5" />
            </svg>
          </div>
        )}
        <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-night/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-mint-light backdrop-blur">
          {post.category}
        </span>
      </div>

      {/* Text */}
      <div className="flex flex-1 flex-col p-6">
        <h2 className="text-lg font-extrabold leading-snug tracking-tight text-white transition-colors group-hover:text-mint-light">
          {post.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">{post.lead}</p>
        <div className="mt-5 flex items-center gap-2 text-xs text-slate-500">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden="true">·</span>
          <span>{post.readingMinutes} Min. Lesezeit</span>
          <svg
            className="btn-icon ml-auto h-4 w-4 text-mint-light"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}
