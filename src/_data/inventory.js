import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";

// Published CSVs from the Sheet (File > Share > Publish to web):
//   SHEET_CSV_URL    the "Public" tab: copies in stock, listed or sold
//   CATALOGUE_CSV_URL  the "Public catalogue" tab: everything on the want list (title, author, section)
// Without them, the build uses data/inventory.csv and data/catalogue.csv.
const { SHEET_CSV_URL, CATALOGUE_CSV_URL } = process.env;

const slug = (s) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const key = (title) => slug(title || "").slice(0, 60);

// Want-list sections are working headings; these are the shelf names shown on the site.
const SHELVES = [
  [/^esoteric/i, "Esoteric and occult"],
  [/^myth/i, "Myth and mysticism"],
  [/^goddess/i, "Goddess and earth-based"],
  [/^psychedelic/i, "Psychedelics"],
  [/^earth mysteries/i, "Earth mysteries"],
  [/^art/i, "Art and visionary"],
  [/rave|electronic/i, "Rave and electronic music"],
  [/cyber|sci-fi/i, "Cyberculture and sci-fi"],
  [/^velocity/i, "Rave and electronic music"],
  [/^masala/i, "Rave and electronic music"],
  [/^vhs|video/i, "VHS and video"],
  [/^magazine/i, "Magazines"],
];
const shelfName = (section) => (SHELVES.find(([re]) => re.test(section || "")) || [null, section || "Other"])[1];

// Drive share links become direct thumbnail URLs
function photo(url) {
  const id = url && (url.match(/\/d\/([\w-]+)/) || url.match(/[?&]id=([\w-]+)/));
  return id ? `https://drive.google.com/thumbnail?id=${id[1]}&sz=w800` : url;
}

async function load(url, file) {
  const csv = url ? await (await fetch(url)).text() : await readFile(new URL(`../../data/${file}`, import.meta.url), "utf8");
  return parse(csv, { columns: true, skip_empty_lines: true, trim: true, relax_column_count: true });
}

export default async function () {
  const [stockRows, wantRows] = await Promise.all([
    load(SHEET_CSV_URL, "inventory.csv"),
    load(CATALOGUE_CSV_URL, "catalogue.csv"),
  ]);

  const stocked = stockRows
    .filter((r) => r.SKU && ["listed", "in stock", "sold"].includes((r.Status || "").toLowerCase()))
    .map((r) => ({
      id: r.SKU.toLowerCase(),
      sku: r.SKU,
      isbn: r.ISBN,
      title: r.Title,
      author: r.Author,
      year: r.Year,
      category: shelfName(r.Category),
      condition: r.Condition,
      price: r.Price,
      format: r.Format,
      status: r.Status.toLowerCase() === "in stock" ? "stock" : r.Status.toLowerCase(),
      image: photo(r.Photo_URL) || r.Cover_URL,
      blurb: r.Blurb,
      buy: r.Stripe_Link,
    }));

  // Want-list titles marked "in stock" or "out of stock" that have no priced Inventory row yet. No buy button.
  const have = new Set(stocked.map((b) => key(b.title)));
  const ids = new Set();
  const wanted = wantRows
    .filter((r) => r.Title && ["in stock", "out of stock"].includes((r.Status || "").toLowerCase()) && !have.has(key(r.Title)))
    .map((r) => {
      let id = slug(`${r.Title} ${r.Author || ""}`).slice(0, 70).replace(/-$/, "");
      while (ids.has(id)) id += "-2";
      ids.add(id);
      return { id, title: r.Title, author: r.Author, category: shelfName(r.Section), status: r.Status.toLowerCase() === "in stock" ? "stock" : "out", image: r.Cover_URL };
    });

  const books = [...stocked, ...wanted].map((b) => ({ ...b, categorySlug: slug(b.category) }));
  const order = SHELVES.map(([, name]) => name);
  const rank = (n) => (order.includes(n) ? order.indexOf(n) : order.length);

  const categories = [...new Set(books.map((b) => b.category))]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((name) => {
      const items = books.filter((b) => b.category === name);
      return {
        name,
        slug: slug(name),
        items,
        listed: items.filter((b) => b.status === "listed"),
        sold: items.filter((b) => b.status === "sold"),
        stock: items.filter((b) => b.status === "stock").sort((a, b) => a.title.localeCompare(b.title)),
        out: items.filter((b) => b.status === "out").sort((a, b) => a.title.localeCompare(b.title)),
      };
    });

  // Catalogue numbers run through the whole list in display order: for sale, in stock, out of stock, then sold.
  let no = 0;
  for (const c of categories) {
    c.entries = [...c.listed, ...c.stock, ...c.out, ...c.sold];
    for (const b of c.entries) b.no = ++no;
  }

  return { books, categories, total: books.length, inStock: books.filter((b) => b.status === "listed" || b.status === "stock") };
}
