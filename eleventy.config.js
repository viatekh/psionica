export default function (config) {
  config.addPassthroughCopy({ "src/assets": "assets" });

  // "£12" from a number or numeric string; blank stays blank
  config.addFilter("gbp", (v) => {
    const n = Number(v);
    return Number.isFinite(n) && v !== "" ? `£${n % 1 ? n.toFixed(2) : n}` : "";
  });

  return {
    dir: { input: "src", output: "_site" },
    pathPrefix: process.env.PATH_PREFIX || "/",
  };
}
