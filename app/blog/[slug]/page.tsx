// app/blog/[slug]/page.tsx – einzelner Artikel (statisch generiert)
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllSlugs, getPost, formatDate } from "@/lib/blog";
import { SITE_URL } from "@/lib/blog-shared";
import { SiteHeader } from "@/components/blog/SiteHeader";
import { CtaBlock } from "@/components/blog/CtaBlock";
import { mdxComponents } from "@/components/blog/mdx";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Artikel nicht gefunden" };

  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.lead,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.lead,
      url,
      publishedTime: post.date,
      section: post.category,
      tags: post.keywords,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.lead },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  // Structured Data (JSON-LD) für Rich Results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.lead,
    datePublished: post.date,
    articleSection: post.category,
    keywords: post.keywords?.join(", "),
    inLanguage: "de-DE",
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    author: { "@type": "Organization", name: "Inkasso·Defense" },
    publisher: { "@type": "Organization", name: "Inkasso·Defense" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:pt-20">
        {/* Zurück */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 transition hover:text-mint-light"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Alle Artikel
        </Link>

        {/* Kopf */}
        <header className="mt-8">
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center rounded-full bg-mint/15 px-3 py-1 font-bold uppercase tracking-[0.16em] text-mint-light">
              {post.category}
            </span>
            <span className="text-slate-500">
              <time dateTime={post.date}>{formatDate(post.date)}</time> · {post.readingMinutes} Min. Lesezeit
            </span>
          </div>

          <h1 className="font-display mt-5 text-4xl font-semibold leading-[1.1] tracking-tightest text-white sm:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 max-w-[60ch] text-xl leading-relaxed text-slate-400">{post.lead}</p>
        </header>

        {/* Titelbild (Hero) – Aspect-Container verhindert Layout-Shift (CLS) */}
        {post.cover ? (
          <div className="mt-10 aspect-[16/9] overflow-hidden rounded-3xl border border-white/10 bezel-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover}
              alt={post.title}
              width={1600}
              height={900}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="mt-10 flex aspect-[16/9] items-center justify-center rounded-3xl border border-white/10 bg-gradient-to-br from-mint/15 via-night-surface to-night-inset bezel-soft">
            <svg className="h-12 w-12 text-white/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 15l5-4 4 3 3-4 6 6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="8.5" cy="9" r="1.5" />
            </svg>
          </div>
        )}

        {/* Inhalt */}
        <article className="mt-10">
          <MDXRemote source={post.content} components={mdxComponents} />
        </article>

        {/* Call-to-Action zum Analyse-Tool */}
        <CtaBlock />
      </main>
    </>
  );
}
