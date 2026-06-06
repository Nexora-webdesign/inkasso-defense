// app/blog/page.tsx – Artikel-Übersicht (statisch generiert)
import type { Metadata } from "next";
import { getAllPostsMeta, getAllCategories } from "@/lib/blog";
import { SiteHeader } from "@/components/blog/SiteHeader";
import { BlogExplorer } from "@/components/blog/BlogExplorer";

export const metadata: Metadata = {
  title: "Blog – Inkasso, Gebühren & Verbraucherrecht",
  description:
    "Artikel rund um Inkasso-Forderungen, Gebühren und Verbraucherrecht – verständlich erklärt, damit du weißt, was du wirklich zahlen musst.",
};

export default function BlogIndexPage() {
  const posts = getAllPostsMeta();
  const categories = getAllCategories();

  return (
    <>
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-14 sm:pt-20">
        {/* Hero */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-bold uppercase tracking-[0.25em] text-mint-light">Blog</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tightest text-white sm:text-6xl">
            Inkasso, Gebühren &amp;{" "}
            <span className="bg-gradient-to-r from-mint-light to-mint bg-clip-text text-transparent">
              Verbraucher-Wissen
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
            Artikel rund um Inkasso-Forderungen, Gebühren und deine Rechte – verständlich erklärt,
            damit du weißt, welche Posten wirklich berechtigt sind.
          </p>
        </div>

        {/* Suche + Filter + Karten */}
        <div className="mt-12">
          <BlogExplorer posts={posts} categories={categories} />
        </div>
      </main>
    </>
  );
}
