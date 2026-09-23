import { collectPublicWebsite } from "./public-web";

function isTimeout(error: unknown) {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

function isExpiredCertificate(error: unknown): boolean {
  const seen = new Set<Error>();
  while (error instanceof Error && !seen.has(error)) {
    seen.add(error);
    if (("code" in error && error.code === "CERT_HAS_EXPIRED") || /certificate has expired/i.test(error.message)) {
      return true;
    }
    error = error.cause;
  }
  return false;
}

// Each collection attempt has its own deadline and repeats all URL/robots checks.
export async function collectDiscoveryHomepage(
  origin: string,
  collect = collectPublicWebsite,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await collect(origin);
    } catch (error) {
      if (isExpiredCertificate(error)) {
        throw new Error("Homepage certificate has expired. Review the page manually.", { cause: error });
      }
      if (!isTimeout(error)) throw error;
      if (attempt === 1) {
        throw new Error("Homepage verification timed out twice. Review the page manually.", { cause: error });
      }
    }
  }
  throw new Error("Homepage collection attempts exhausted.");
}
