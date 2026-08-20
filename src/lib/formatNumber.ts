const formatter = new Intl.NumberFormat("en-GB");

// Bare toLocaleString() picks up the device/browser locale (e.g. hi-IN's lakh
// grouping renders 127,111 as 1,27,111) and can cause an SSR/client hydration
// mismatch when the server and client locales differ. Always pin explicitly.
export function formatNumber(value: number): string {
  return formatter.format(value);
}
