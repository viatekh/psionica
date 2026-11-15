export default function (config) {
  config.addPassthroughCopy({ "src/assets": "assets" });

  // "£12" from a number or numeric string; text such as "POA" passes through; blank stays blank
  config.addFilter("gbp", (v) => {
    const n = Number(v);
    if (v === "" || v == null) return "";
    return Number.isFinite(n) ? `£${n % 1 ? n.toFixed(2) : n}` : String(v);
  });

  return {
    dir: { input: "src", output: "_site" },
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}
