import { QueryClient, isServer } from '@tanstack/react-query';

/**
 * One QueryClient factory, used by both the server and the browser.
 *
 * `staleTime` is deliberately non-zero: with SSR, a client that considers
 * everything stale refetches immediately on mount and throws away the data the
 * server just streamed, so every page load hits the API twice.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        // Retrying a 401/403/404 wastes time and delays the real message; only
        // genuine transport failures are worth a second attempt.
        retry: (failureCount, error) => {
          const status = (error as { status?: number } | null)?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * The server gets a fresh client per request — a shared one would leak one
 * user's cached data into another's response. The browser keeps a single
 * client, created lazily, so React's suspense retries do not discard the cache
 * mid-render.
 */
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
