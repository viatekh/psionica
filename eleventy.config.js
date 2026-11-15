import { readFileSync } from "node:fs";

const headings = JSON.parse(readFileSync(new URL("./src/_data/headings.json", import.meta.url), "utf8"));

export default function (config) {
  config.addPassthroughCopy({ "src/assets": "assets" });

  // "£12" from a number or numeric string; text such as "POA" passes through; blank stays blank
  config.addFilter("gbp", (v) => {
    const n = Number(v);
    if (v === "" || v == null) return "";
    return Number.isFinite(n) ? `£${n % 1 ? n.toFixed(2) : n}` : String(v);
  });

  // Covers kept in the site are stored as "/assets/covers/x.jpg"; outside addresses pass through.
  config.addFilter("asset", (v) => (v && v.startsWith("/") ? config.getFilter("url")(v) : v));

  // A heading in the logo lettering (shapes made by tools/outline-headings.mjs); plain text if not drawn.
  config.addShortcode("heading", (label) => {
    const h = headings[String(label).toLowerCase()];
    return h
      ? `<svg class="hd-svg" viewBox="${h.vb}" role="img" aria-label="${label}"><path fill="currentColor" d="${h.d}"/></svg>`
      : `<span class="hd-txt">${label}</span>`;
  });

  config.addGlobalData("build", Date.now().toString(36));

  // Number for the home page filters: 0 for POA or unpriced.
  config.addFilter("num", (v) => (Number.isFinite(Number(v)) && v !== "" && v != null ? Number(v) : 0));

  return {
    dir: { input: "src", output: "_site" },
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}
