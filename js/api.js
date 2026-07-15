const RatesAPI = (function () {
  const ENDPOINT = "https://open.er-api.com/v6/latest/";

  const REQUEST_TIMEOUT_MS = 8000;
  const MAX_RETRIES = 2;
  const RETRY_BACKOFF_MS = 800;
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  // In-memory cache only — no localStorage/sessionStorage dependency.
  const cache = {};

  function fetchWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    return fetch(url, { signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function fetchOnce(base, attempt = 0) {
    try {
      const response = await fetchWithTimeout(ENDPOINT + encodeURIComponent(base), REQUEST_TIMEOUT_MS);

      if (!response.ok) {
        throw new Error("Server responded with status " + response.status);
      }

      const data = await response.json();

      if (!data || data.result !== "success" || !data.rates) {
        throw new Error("Malformed response from rate provider.");
      }

      return data.rates;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BACKOFF_MS * (attempt + 1));
        return fetchOnce(base, attempt + 1);
      }
      throw err;
    }
  }

  async function getRates(base) {
    const cached = cache[base];
    const isFresh = cached && (Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS);

    if (isFresh) {
      return { rates: cached.rates, fromCache: true, stale: false, fetchedAt: cached.fetchedAt };
    }

    try {
      const rates = await fetchOnce(base);
      const fetchedAt = new Date();
      cache[base] = { rates, fetchedAt };
      return { rates, fromCache: false, stale: false, fetchedAt };
    } catch (err) {
      if (cached) {
        return { rates: cached.rates, fromCache: true, stale: true, fetchedAt: cached.fetchedAt };
      }
      throw err;
    }
  }

  function hasAnyCache(base) {
    return Boolean(cache[base]);
  }

  return { getRates, hasAnyCache };
})();