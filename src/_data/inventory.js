import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";

// The Sheet's "Public" tab, published as CSV (File > Share > Publish to web).
// Without it, the build uses the example rows in data/sample-inventory.csv.
const SHEET_CSV_URL = process.env.SHEET_CSV_URL;

const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Drive share links become direct thumbnail URLs
function photo(url) {
  const id = url && (url.match(/\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/));
  return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w800` : url;
}

export default async function () {
  const csv = SHEET_CSV_URL
    ? await (await fetch(SHEET_CSV_URL)).text()
    : await readFile(new URL("../../data/sample-inventory.csv", import.meta.url), "utf8");

  const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
  const books = rows
    .filter((r) => r.SKU && ["listed", "sold"].includes((r.Status || "").toLowerCase()))
    .map((r) => ({
      sku: r.SKU,
      isbn: r.ISBN,
      title: r.Title,
      author: r.Author,
      year: r.Year,
      category: r.Category || "Other",
      categorySlug: slug(r.Category || "Other"),
      condition: r.Condition,
      price: r.Price,
      format: r.Format,
      status: r.Status.toLowerCase(),
      image: photo(r.Photo_URL) || r.Cover_URL,
      blurb: r.Blurb,
      buy: r.Stripe_Link,
    }));

  const categories = [...new Set(books.map((b) => b.category))]
    .sort()
    .map((name) => {
      const items = books.filter((b) => b.category === name);
      return { name, slug: slug(name), items, listed: items.filter((b) => b.status === "listed").length };
    });

  return { books, categories, example: !SHEET_CSV_URL };
}
