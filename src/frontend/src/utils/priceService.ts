/**
 * Fetch latest NAV for a mutual fund scheme from mfapi.in
 */
export async function fetchMFNAV(schemeCode: string): Promise<number | null> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Response: { data: [{ nav: "58.75", date: "..." }, ...] }
    const navStr = json?.data?.[0]?.nav;
    if (!navStr) return null;
    const nav = Number.parseFloat(navStr);
    return Number.isNaN(nav) ? null : nav;
  } catch {
    return null;
  }
}

export interface MFSearchResult {
  schemeCode: string;
  schemeName: string;
}

/**
 * Search mutual funds by query from mfapi.in
 */
export async function searchMutualFunds(
  query: string,
): Promise<MFSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!res.ok) return [];
    const json = await res.json();
    // Response: [{ schemeCode: "120503", schemeName: "..." }]
    if (!Array.isArray(json)) return [];
    return json
      .slice(0, 20)
      .map((item: { schemeCode?: string | number; schemeName?: string }) => ({
        schemeCode: String(item.schemeCode ?? ""),
        schemeName: String(item.schemeName ?? ""),
      }))
      .filter((r) => r.schemeCode && r.schemeName);
  } catch {
    return [];
  }
}

/**
 * Fetch latest NAV for an NPS scheme via the backend canister (server-side HTTP outcall).
 * API: GET https://npsnav.in/api/{pfmId}
 * The canister returns a plain number string e.g. "55.074"
 */
export async function fetchNPSNav(pfmId: string): Promise<number | null> {
  try {
    const { createActorWithConfig } = await import("@/config");
    const actor = await createActorWithConfig();
    const raw = await actor.fetchNPSNav(pfmId);
    if (!raw) return null;
    const nav = Number.parseFloat(raw.trim());
    return Number.isNaN(nav) ? null : nav;
  } catch {
    return null;
  }
}

/**
 * Fetch current price for an SGB symbol from the CloudFront SGB JSON.
 * API: GET https://d1rkri6jugbbi2.cloudfront.net/sgb.json
 * Response: { ibjaPrice, marketStatus, issues: [{ symbol, ltp, ... }] }
 */
export async function fetchSGBPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch("https://d1rkri6jugbbi2.cloudfront.net/sgb.json", {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    // The actual list is nested under the "issues" key
    const issues: Record<string, unknown>[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.issues)
        ? json.issues
        : [];
    const entry = issues.find(
      (item) =>
        typeof item.symbol === "string" &&
        item.symbol.toLowerCase() === symbol.toLowerCase(),
    );
    if (!entry) return null;
    // Primary field is "ltp" (last traded price); fall back to other names
    const rawPrice =
      entry.ltp ??
      entry.nav ??
      entry.price ??
      entry.currentPrice ??
      entry.lastPrice;
    if (rawPrice === undefined || rawPrice === null) return null;
    const price = Number.parseFloat(String(rawPrice));
    return Number.isNaN(price) ? null : price;
  } catch {
    return null;
  }
}

/**
 * Fetch current stock/ETF price via the backend canister (server-side HTTP outcall).
 * The canister calls Yahoo Finance and returns the raw JSON string.
 */
export async function fetchStockPrice(symbol: string): Promise<number | null> {
  try {
    const { createActorWithConfig } = await import("@/config");
    const actor = await createActorWithConfig();
    const raw = await actor.fetchStockPrice(symbol);
    if (!raw) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    const price = (
      parsed as {
        quoteResponse?: { result?: { regularMarketPrice?: number }[] };
      }
    )?.quoteResponse?.result?.[0]?.regularMarketPrice;
    return typeof price === "number" ? price : null;
  } catch {
    return null;
  }
}
