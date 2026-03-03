/**
 * Fetch a URL through a chain of CORS proxies, returning the raw response text.
 * Tries each proxy in order and returns the first successful result.
 */
async function fetchViaProxy(targetUrl: string): Promise<string | null> {
  // Proxy 1: allorigins (wraps response in JSON { contents: "..." })
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const data = await res.json();
      const contents = (data?.contents ?? "").trim();
      if (contents) return contents;
    }
  } catch {
    // fall through to next proxy
  }

  // Proxy 2: corsproxy.io (transparent proxy — returns raw response)
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text) return text;
    }
  } catch {
    // fall through to next proxy
  }

  // Proxy 3: thingproxy (transparent proxy)
  try {
    const proxyUrl = `https://thingproxy.freeboard.io/fetch/${targetUrl}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text) return text;
    }
  } catch {
    // all proxies failed
  }

  return null;
}

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
 * Fetch latest NAV for an NPS scheme from npsnav.in/api
 * API: GET https://npsnav.in/api/{pfmId}
 * Response: plain number string e.g. "55.074"
 * Fetched via CORS proxies to avoid CORS restrictions.
 */
export async function fetchNPSNav(pfmId: string): Promise<number | null> {
  try {
    const targetUrl = `https://npsnav.in/api/${encodeURIComponent(pfmId)}`;
    const raw = await fetchViaProxy(targetUrl);
    if (!raw) return null;
    // The API returns a plain number string like "55.074"
    // but may also return JSON – handle both cases
    let navStr: string = raw;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try {
        const json = JSON.parse(raw);
        const item = Array.isArray(json) ? json[0] : json;
        navStr = String(
          item?.nav ?? item?.NAV ?? item?.currentNav ?? item?.navValue ?? "",
        );
      } catch {
        navStr = raw;
      }
    }
    const nav = Number.parseFloat(navStr);
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
 * Fetch current stock/ETF price via CORS proxies → Yahoo Finance.
 * Tries multiple Yahoo Finance endpoints and multiple proxies for resilience.
 */
export async function fetchStockPrice(symbol: string): Promise<number | null> {
  // Try v7 endpoint first, then v8 as fallback
  const yahooUrls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
    `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${encodeURIComponent(symbol)}`,
  ];

  for (const yahooUrl of yahooUrls) {
    try {
      const raw = await fetchViaProxy(yahooUrl);
      if (!raw) continue;
      // raw may itself be a JSON string
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        continue;
      }
      const price = (
        parsed as {
          quoteResponse?: { result?: { regularMarketPrice?: number }[] };
        }
      )?.quoteResponse?.result?.[0]?.regularMarketPrice;
      if (typeof price === "number") return price;
    } catch {
      // try next URL
    }
  }

  return null;
}
