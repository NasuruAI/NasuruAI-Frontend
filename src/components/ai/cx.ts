/** Join class names, skipping anything that isn't a non-empty string. */
export function cx(...parts: unknown[]): string {
  return parts.filter((part): part is string => typeof part === "string" && part !== "").join(" ");
}
