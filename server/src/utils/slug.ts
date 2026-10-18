const DIACRITICS = /[\u0300-\u036f]/g;
const MAX_SLUG_LENGTH = 120;

/**
 * Converts arbitrary text into a URL-safe slug: lowercased, diacritics stripped,
 * runs of non-alphanumeric characters collapsed into single hyphens. Returns an
 * empty string when the input has no slug-worthy characters, so callers can pick
 * a fallback before resolving uniqueness.
 */
export function slugify(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "");
}
