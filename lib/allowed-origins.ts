// Marketing sites (and previews) permitted to call the CRM's public API
// (lead submission, page-view tracking) from the browser.
export const ALLOWED_ORIGINS = [
  // CRM itself
  "https://crm.bookmymoment.in",

  // ── FRIENDS FACTORY (Vadodara) ──────────────────────────────────────────
  "https://friendsfactorycafe.com",
  "https://www.friendsfactorycafe.com",
  "https://candlelightdinnervadodara.com",
  "https://www.candlelightdinnervadodara.com",
  "https://anniversarydinnervadodara.com",
  "https://www.anniversarydinnervadodara.com",
  "https://birthdaysurprisevadodara.com",
  "https://www.birthdaysurprisevadodara.com",
  "https://surprisedatevadodara.com",
  "https://www.surprisedatevadodara.com",
  "https://rooftopdatevadodara.com",
  "https://www.rooftopdatevadodara.com",

  // ── HIVY (Surat) ────────────────────────────────────────────────────────
  "https://hivy.co.in",
  "https://www.hivy.co.in",
  "https://candlelightdinnersurat.com",
  "https://www.candlelightdinnersurat.com",
  "https://anniversarydinnersurat.com",
  "https://www.anniversarydinnersurat.com",
  "https://birthdaysurprisesurat.com",
  "https://www.birthdaysurprisesurat.com",
  "https://surprisedatesurat.com",
  "https://www.surprisedatesurat.com",

  // ── Shared booking portal ───────────────────────────────────────────────
  "https://bookmymoment.in",
  "https://www.bookmymoment.in",

  // ── Vercel preview domains ──────────────────────────────────────────────
  "https://friends-factory-cafe.vercel.app",
  "https://hivy.vercel.app",
  "https://bookmymoment.vercel.app",
];

export function isOriginAllowed(origin: string | null): boolean {
  return !!origin && ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
}

export function corsHeaders(origin: string | null) {
  const allowed = isOriginAllowed(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin! : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // navigator.sendBeacon() (used by the tracking script) always sends as
    // a credentialed request - the browser silently blocks the response
    // unless this is explicitly "true". Safe here since Allow-Origin above
    // is always one specific origin, never "*".
    "Access-Control-Allow-Credentials": "true",
  };
}
