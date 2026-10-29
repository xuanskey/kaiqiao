import type { Grade } from "./types.ts";

/** Query wins over hash parameters; only a single digit 1–6 is a valid grade. */
export function entryGrade(search: string, hash = ""): Grade | null {
  const query = new URLSearchParams(search);
  const fragment = hash.replace(/^#/, "");
  const hashQuery = new URLSearchParams(fragment.includes("?") ? fragment.slice(fragment.indexOf("?") + 1) : fragment);
  const value = query.has("grade") ? query.get("grade") : hashQuery.get("grade");
  return value !== null && /^[1-6]$/.test(value) ? Number(value) as Grade : null;
}
