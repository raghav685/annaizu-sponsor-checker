// Display-casing and slug helpers for the messy free-text register data.

const KEEP_UPPER = new Set([
  "LTD", "LTD.", "LLP", "LLC", "PLC", "CIC", "CIO", "UK", "US", "USA", "GB",
  "NHS", "IT", "T/A", "&", "UK.", "LLP.", "PLC.",
]);

// A small number of organisation names in the source CSV are already mojibake
// in the Home Office's own export (UTF-8 apostrophes/currency symbols that were
// lossily re-encoded, landing as literal "?" runs - e.g. "ANKâ??S Beauty" or
// "Reddy?¢????s"). This can't be perfectly reversed, but the common apostrophe-s
// pattern is recoverable, and stray "?" runs read as broken UI, not real content,
// so they're stripped rather than displayed verbatim. Affects ~40 of 127k rows.
function fixMojibake(raw: string): string {
  return raw
    .replace(/â\?\?/g, "'")
    .replace(/[?¢£¥€±§]{2,}/g, "")
    .trim();
}

export function cleanWhitespace(raw: string): string {
  return fixMojibake(raw.replace(/["]/g, "")).replace(/\s+/g, " ").trim();
}

export function titleCaseDisplay(raw: string): string {
  const cleaned = cleanWhitespace(raw);
  if (!cleaned) return cleaned;
  return cleaned
    .split(" ")
    .map((word) => {
      if (!word) return word;
      if (KEEP_UPPER.has(word.toUpperCase())) return word.toUpperCase();
      // Preserve already-mixed-case words (e.g. "McDonald", "iCare") and anything
      // containing digits (e.g. "3M", "24/7") as-is.
      const isAllCaps = word === word.toUpperCase() && word !== word.toLowerCase();
      if (!isAllCaps) return word;
      return word
        .split("-")
        .map((part) => (part.length ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
        .join("-");
    })
    .join(" ");
}

export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
