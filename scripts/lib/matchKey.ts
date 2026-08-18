// Builds a normalised match key used to identify "the same sponsor" across
// sync runs, independent of cosmetic differences (casing, punctuation, legal
// suffix, "&" vs "and"). This is NOT a display name - see text.ts for that.

const LEGAL_SUFFIXES = [
  "LIMITED",
  "LTD",
  "PLC",
  "LLP",
  "LLC",
  "THE",
  "CIC",
  "CIO",
];

export function buildMatchKey(rawName: string): string {
  let s = rawName
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9\s]/g, " ") // strip punctuation/quotes/apostrophes
    .replace(/\s+/g, " ")
    .trim();

  // Drop legal suffixes as whole words, wherever they appear (leading "THE",
  // trailing "LTD"/"LIMITED", etc.), then re-collapse whitespace.
  const words = s.split(" ").filter((w) => w && !LEGAL_SUFFIXES.includes(w));
  s = words.join(" ");

  return s;
}

// Levenshtein-based similarity in [0, 1], 1 = identical. Used for the
// rename/relocate heuristic - deliberately simple and dependency-free so its
// behaviour is easy to reason about and test.
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = new Array(n + 1);
  let currRow = new Array(n + 1);
  for (let j = 0; j <= n; j++) prevRow[j] = j;

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }
  return prevRow[n];
}
