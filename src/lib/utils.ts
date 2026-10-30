import { clsx, type ClassValue } from "clsx";

// 只处理本项目真正会互相覆盖的几组 Tailwind 类（后写的赢），代替约 100KB 的 tailwind-merge。
// 新增会互相覆盖的类组时，在这里补一条规则，并在 utils.test.ts 加用例。
const FONT_SIZE = /^text-(xs|sm|base|lg|[2-9]?xl|\[[^\]]*(px|rem|em)\])$/;
const GROUPS: [string, RegExp][] = [
  ["font-size", FONT_SIZE],
  ["text-color", /^text-(?!left$|center$|right$|justify$|start$|end$|wrap$|nowrap$|balance$|pretty$|ellipsis$|clip$)/],
  ["size", /^size-/], ["h", /^h-/], ["w", /^w-/], ["min-w", /^min-w-/],
  ["px", /^px-/], ["py", /^py-/], ["justify", /^justify-/], ["leading", /^leading-/], ["bg", /^bg-/], ["rounded", /^rounded(-|$)/],
];

function groupKey(cls: string): string | null {
  const cut = cls.lastIndexOf(":");
  const variant = cls.slice(0, cut + 1), base = cls.slice(cut + 1);
  if (FONT_SIZE.test(base)) return variant + "font-size";
  for (const [name, re] of GROUPS) if (name !== "font-size" && re.test(base)) return variant + name;
  return null;
}

export function cn(...inputs: ClassValue[]) {
  const classes = clsx(inputs).split(/\s+/).filter(Boolean);
  const seen = new Set<string>(), out: string[] = [];
  for (let i = classes.length - 1; i >= 0; i--) {
    const key = groupKey(classes[i]) ?? "=" + classes[i];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(classes[i]);
  }
  return out.reverse().join(" ");
}

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** i;
  const fixed = value >= 100 || i === 0 ? value.toFixed(0) : value.toFixed(digits);
  return `${fixed} ${units[i]}`;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("zh-CN").format(n);
}

export function formatDate(ts: number): string {
  if (!ts) return "未知";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

export function daysAgo(ts: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - ts) / 86_400_000));
}

export function formatAge(ts: number, now = Date.now()): string {
  const days = daysAgo(ts, now);
  if (days < 1) return "今天";
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  const years = Math.floor(days / 365);
  const rem = Math.floor((days % 365) / 30);
  return rem > 0 ? `${years} 年 ${rem} 个月前` : `${years} 年前`;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
