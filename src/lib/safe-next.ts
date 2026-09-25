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
