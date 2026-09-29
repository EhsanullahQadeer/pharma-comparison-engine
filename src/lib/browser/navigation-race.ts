// Unlike auto-retrying locator reads (innerText, click), a page.evaluate/evaluateAll throws if the
// tab navigates while it runs — a submitted AI prompt, a client-side redirect, a consent reload.
// Treat that race as "nothing read yet" so the caller's next read picks up the new page.
export async function ignoreNavigationRace<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (error instanceof Error && /execution context was destroyed|cannot find context with specified id/i.test(error.message)) return fallback;
    throw error;
  }
}
