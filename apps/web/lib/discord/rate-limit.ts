import "server-only";

/**
 * Discord API Rate Limiting Utilities
 *
 * Provides a fetch wrapper that automatically handles 429 (Too Many Requests)
 * responses from the Discord API by waiting the specified retry_after duration
 * and retrying the request.
 *
 * Also provides a sleep helper for spacing out batch operations.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default delay between batch Discord API calls (ms) */
export const DISCORD_BATCH_DELAY_MS = 500;

/** Maximum number of retries on 429 responses */
const MAX_RETRIES = 3;

/** Buffer added to retry_after to avoid hitting the limit again immediately (ms) */
const RETRY_BUFFER_MS = 500;

/** Default retry_after if Discord doesn't provide one (ms) */
const DEFAULT_RETRY_AFTER_MS = 5000;

// ─── Sleep ────────────────────────────────────────────────────────────────────

/**
 * Simple sleep utility.
 * @param ms Milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Discord Fetch Wrapper ────────────────────────────────────────────────────

/**
 * Wrapper around fetch() for Discord API calls that handles 429 rate limiting.
 *
 * On a 429 response:
 * 1. Reads the `retry_after` field from the JSON body (seconds)
 * 2. Waits `retry_after * 1000 + RETRY_BUFFER_MS` milliseconds
 * 3. Retries the request (up to MAX_RETRIES times)
 *
 * On success or non-429 error, returns the Response as-is.
 *
 * @param url The Discord API URL
 * @param init Standard fetch RequestInit options
 * @returns The final Response object
 */
export async function discordFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, init);

    if (response.status !== 429) {
      return response;
    }

    // 429 — Rate limited
    lastResponse = response;

    if (attempt === MAX_RETRIES) {
      // Exhausted retries, return the 429 response
      console.error(
        `[discord/rate-limit] Exhausted ${MAX_RETRIES} retries for ${init?.method ?? "GET"} ${url}`
      );
      return response;
    }

    // Parse retry_after from the response body
    let retryAfterMs = DEFAULT_RETRY_AFTER_MS;
    try {
      const body = await response.json();
      if (typeof body.retry_after === "number") {
        // Discord returns retry_after in seconds (can be fractional)
        retryAfterMs = Math.ceil(body.retry_after * 1000);
      }
      console.warn(
        `[discord/rate-limit] 429 rate limited on ${init?.method ?? "GET"} ${url} — retry_after=${body.retry_after}s, attempt ${attempt + 1}/${MAX_RETRIES}`
      );
    } catch {
      console.warn(
        `[discord/rate-limit] 429 rate limited (could not parse body) — using default ${DEFAULT_RETRY_AFTER_MS}ms delay`
      );
    }

    // Wait the specified duration + buffer
    await sleep(retryAfterMs + RETRY_BUFFER_MS);
  }

  // Should never reach here, but return the last response as a safety net
  return lastResponse!;
}
