// lib/blog.ts
// -----------------------------------------------------------------------------
// Liest die Blog-Artikel aus content/blog/*.mdx (Frontmatter via gray-matter).
// Wird ausschließlich zur Build-Zeit (SSG) im Node-Runtime ausgeführt.
// -----------------------------------------------------------------------------
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { PostMeta } from "./blog-shared";

// Client-sichere Typen/Helfer hier durchreichen (Server-Importe bleiben bequem).
export type { PostMeta } from "./blog-shared";
export { formatDate } from "./blog-shared";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface Post extends PostMeta {
  content: string;
}

function readFileSlugs(): string[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));
}

function estimateReadingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function toMeta(slug: string, data: Record<string, unknown>, content: string): PostMeta {
  return {
    slug,
    title: String(data.title ?? slug),
    lead: String(data.lead ?? ""),
    category: String(data.category ?? "Allgemein"),
    date: String(data.date ?? "1970-01-01"),
    cover: data.cover ? String(data.cover) : undefined,
    readingMinutes: data.readingMinutes ? Number(data.readingMinutes) : estimateReadingMinutes(content),
  };
}

export function getAllSlugs(): string[] {
  return readFileSlugs();
}

/** Alle Artikel-Metadaten, neueste zuerst. */
export function getAllPostsMeta(): PostMeta[] {
  return readFileSlugs()
    .map((slug) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, `${slug}.mdx`), "utf8");
      const { data, content } = matter(raw);
      return toMeta(slug, data, content);
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Alle vorkommenden Kategorien (eindeutig, stabil sortiert). */
export function getAllCategories(): string[] {
  const set = new Set(getAllPostsMeta().map((p) => p.category));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "de"));
}

/** Einzelner Artikel inkl. MDX-Quelltext. null, wenn nicht vorhanden. */
export function getPost(slug: string): Post | null {
  const file = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  return { ...toMeta(slug, data, content), content };
}
