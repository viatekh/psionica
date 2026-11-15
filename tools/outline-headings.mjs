// Draws the words set in the logo typeface (the About and Events links) and saves them as shapes,
// so the font file itself is never published. Run from site/ after changing the list below:
//   node tools/outline-headings.mjs ../brand/fonts/evanescent.ttf
import opentype from "opentype.js";
import { readFileSync, writeFileSync } from "node:fs";

const words = ["About", "Events"];
const buf = readFileSync(process.argv[2]);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const out = {};
for (const label of words) {
  const text = label.toLowerCase();
  if ([...text].some((ch) => ch !== " " && font.charToGlyph(ch).index === 0)) continue; // falls back to plain text
  const bb = font.getPath(text, 0, 0, 100).getBoundingBox();
  out[text] = { vb: `0 0 ${Math.ceil(bb.x2 - bb.x1 + 4)} ${Math.ceil(bb.y2 - bb.y1 + 4)}`, d: font.getPath(text, 2 - bb.x1, 2 - bb.y1, 100).toPathData(1) };
}
writeFileSync(new URL("../src/_data/headings.json", import.meta.url), JSON.stringify(out));
console.log(Object.keys(out).length, "headings drawn:", Object.keys(out).join(", "));
