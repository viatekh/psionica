import { readFile } from "node:fs/promises";
import { parse } from "csv-parse/sync";

// Published CSVs from the Sheet (File > Share > Publish to web):
//   SHEET_CSV_URL      the "Public" tab: copies in stock, listed or sold
//   CATALOGUE_CSV_URL  the "Public catalogue" tab: want-list titles marked in stock or out of stock
// Without them, the build uses data/inventory.csv and data/catalogue.csv (made by tools/sync-stock.py).
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
  [/rave|electronic|^velocity|^masala/i, "Rave and electronic music"],
  [/cyber|sci-fi/i, "Cyberculture and sci-fi"],
  [/^sound/i, "Sound and production"],
  [/^fiction/i, "Fiction"],
  [/^vhs|video/i, "VHS and video"],
  [/^magazine/i, "Magazines"],
];
const shelfName = (section) => (SHELVES.find(([re]) => re.test(section || "")) || [null, section || "Other"])[1];
const byTitle = (a, b) => a.title.localeCompare(b.title, "en", { numeric: true });

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

  // A page's address comes from its title and author, so it stays the same when a wanted
  // title comes into stock, sells, and is restocked. A second copy of a title gets its SKU added.
  const ids = new Set();
  const pageId = (title, author, sku) => {
    let id = slug(`${title} ${author || ""}`).slice(0, 70).replace(/-$/, "");
    if (ids.has(id)) id += sku ? `-${sku.toLowerCase()}` : "-2";
    ids.add(id);
    return id;
  };

  const stocked = stockRows
    .filter((r) => r.SKU && ["listed", "in stock", "sold"].includes((r.Status || "").toLowerCase()))
    .map((r) => ({
      id: pageId(r.Title, r.Author, r.SKU),
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

  // Want-list titles marked "in stock" or "out of stock" that have no Inventory row. No price, no buy button.
  const have = new Set(stocked.map((b) => key(b.title)));
  const wanted = wantRows
    .filter((r) => r.Title && ["in stock", "out of stock"].includes((r.Status || "").toLowerCase()) && !have.has(key(r.Title)))
    .map((r) => ({
      id: pageId(r.Title, r.Author),
      title: r.Title,
      author: r.Author,
      category: shelfName(r.Section),
      status: r.Status.toLowerCase() === "in stock" ? "stock" : "out",
      image: r.Cover_URL,
      blurb: (r.Notes || "").replace(/^POA when in;\s*/, ""),
    }));

  const books = [...stocked, ...wanted].map((b) => ({ ...b, categorySlug: slug(b.category) }));
  const order = SHELVES.map(([, name]) => name);
  const rank = (n) => (order.includes(n) ? order.indexOf(n) : order.length);

  const categories = [...new Set(books.map((b) => b.category))]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((name) => {
      const items = books.filter((b) => b.category === name);
      const of = (...statuses) => items.filter((b) => statuses.includes(b.status)).sort(byTitle);
      return {
        name,
        slug: slug(name),
        items,
        available: of("listed", "stock").length,
        // display order: for sale, then out of stock, then sold
        entries: [...of("listed", "stock"), ...of("out"), ...of("sold")],
      };
    });

  return {
    books,
    categories,
    skus: books.filter((b) => b.sku), // for the short /p/<sku>/ addresses printed on stickers
    inStock: books.filter((b) => b.status === "listed" || b.status === "stock"),
  };
}
