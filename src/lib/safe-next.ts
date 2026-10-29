/**
 * Where to go after signing in, from `?next=`. Only a path on this site is
 * accepted: anything else (`https://evil.example`, `//evil.example`,
 * `/\evil.example`) would make the login page an open redirect.
 */
export function safeNext(raw: string | null | undefined, fallback = "/dashboard"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\"))
    return fallback;
  try {
    const url = new URL(raw, "https://nasuru.invalid");
    return url.origin === "https://nasuru.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Every app route must live behind `/ai`; anything else is redirected to the
 * equivalent path under the AI app shell. Internal framework and API routes are
 * kept out of that redirect so Next and the backend can keep functioning.
 */
export function redirectToAi(pathname: string | null | undefined): string | null {
  if (!pathname) return "/ai";

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/.well-known") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return null;
  }

  if (pathname.startsWith("/ai")) return null;
  return pathname === "/" ? "/ai" : `/ai${pathname}`;
}
