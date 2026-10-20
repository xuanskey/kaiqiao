/**
 * 把 PDF、Word（.docx）、PPT（.pptx）和图片里的文字读出来，交给 analyzeText 识别。
 * 这些解析库体积较大，只在家长真的选择了对应文件时才按需加载，不影响首页打开速度。
 * 只读取文字，不执行文件里的宏、脚本或链接。
 */

export type ExtractKind = "text" | "pdf" | "docx" | "pptx" | "image";
export type Progress = (message: string, ratio?: number) => void;

export const MAX_FILE_BYTES: Record<ExtractKind, number> = {
  text: 200_000,
  pdf: 20_000_000,
  docx: 10_000_000,
  pptx: 30_000_000,
  image: 8_000_000,
};
export const MAX_PDF_PAGES = 30;

export function kindOf(name: string, type = ""): ExtractKind | null {
  const n = name.toLowerCase();
  if (/\.(md|markdown|txt)$/.test(n)) return "text";
  if (n.endsWith(".pdf") || type === "application/pdf") return "pdf";
  if (n.endsWith(".docx")) return "docx";
  if (n.endsWith(".pptx")) return "pptx";
  if (/\.(png|jpe?g|webp|bmp|gif)$/.test(n) || type.startsWith("image/")) return "image";
  return null;
}

export function unsupportedReason(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".doc")) return "这是旧版 Word（.doc）文件，请在 Word 里“另存为 .docx”后再导入。";
  if (n.endsWith(".ppt")) return "这是旧版 PPT（.ppt）文件，请在 PowerPoint 里“另存为 .pptx”后再导入。";
  return "暂不支持这种文件。可以导入 .txt、.md、.pdf、.docx、.pptx 或图片（拍照）。";
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
export function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") { const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(code) ? String.fromCodePoint(code) : ""; }
    return ENTITIES[e.toLowerCase()] ?? "";
  });
}

/** 一页幻灯片的 XML → 文字：每个段落 <a:p> 一行，段内的 <a:t> 拼起来。 */
export function slideXmlToText(xml: string): string {
  const lines: string[] = [];
  for (const para of xml.split(/<\/a:p>/)) {
    const parts = [...para.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1]));
    const line = parts.join("").trim();
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

/** 按 ppt/slides/slide10.xml 里的数字排序，而不是按字符串排序。 */
export function slideOrder(paths: string[]): string[] {
  const num = (p: string) => Number(/slide(\d+)\.xml$/.exec(p)?.[1] ?? 0);
  return paths.filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => num(a) - num(b));
}

export type PdfItem = { str: string; x: number; y: number };
/** PDF 文本片段按行合并：y 坐标相近的算同一行，行内按 x 排序；PDF 坐标 y 向上，所以从大到小排。 */
export function pdfItemsToLines(items: PdfItem[], tolerance = 3): string[] {
  const rows: { y: number; parts: PdfItem[] }[] = [];
  for (const it of items) {
    if (!it.str.trim()) continue;
    const row = rows.find((r) => Math.abs(r.y - it.y) <= tolerance);
    if (row) row.parts.push(it); else rows.push({ y: it.y, parts: [it] });
  }
  return rows.sort((a, b) => b.y - a.y).map((r) => r.parts.sort((a, b) => a.x - b.x).map((p) => p.str).join("").replace(/\s{2,}/g, " ").trim()).filter(Boolean);
}

/** OCR 结果整理：去掉汉字之间多余的空格（识别中文时常见），合并多余空行。 */
export function tidyOcr(text: string): string {
  return text
    .replace(/([\u4e00-\u9fa5，。？！：；、（）])\s+(?=[\u4e00-\u9fa5，。？！：；、（）])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let t = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  if (t.includes("\uFFFD")) { try { t = new TextDecoder("gb18030").decode(buf); } catch { /* 浏览器不支持 GB18030 时保留 UTF-8 结果 */ } }
  return t;
}

async function readPdf(file: File, progress: Progress): Promise<string> {
  progress("正在加载 PDF 解析组件…");
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const total = Math.min(doc.numPages, MAX_PDF_PAGES);
  const out: string[] = [];
  for (let i = 1; i <= total; i++) {
    progress(`正在读取第 ${i}/${total} 页…`, i / total);
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = (content.items as { str?: string; transform?: number[] }[]).filter((it) => typeof it.str === "string" && it.transform).map((it) => ({ str: it.str!, x: it.transform![4], y: it.transform![5] }));
    out.push(...pdfItemsToLines(items));
  }
  await (doc as unknown as { cleanup?: () => Promise<void> }).cleanup?.();
  if (doc.numPages > MAX_PDF_PAGES) out.push(`（只读取了前 ${MAX_PDF_PAGES} 页，共 ${doc.numPages} 页）`);
  return out.join("\n");
}

async function readDocx(file: File, progress: Progress): Promise<string> {
  progress("正在加载 Word 解析组件…");
  const mod = await import("mammoth");
  const mammoth = (mod as unknown as { default?: typeof mod }).default ?? mod;
  progress("正在读取 Word 文字…", 0.5);
  const r = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return r.value;
}

async function readPptx(file: File, progress: Progress): Promise<string> {
  progress("正在加载 PPT 解析组件…");
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = slideOrder(Object.keys(zip.files));
  const out: string[] = [];
  for (let i = 0; i < slides.length; i++) {
    progress(`正在读取第 ${i + 1}/${slides.length} 页幻灯片…`, (i + 1) / slides.length);
    const text = slideXmlToText(await zip.file(slides[i])!.async("string"));
    if (text) out.push(`# 第 ${i + 1} 页`, text);
  }
  return out.join("\n");
}

async function readImage(file: File, progress: Progress): Promise<string> {
  progress("正在加载文字识别组件（第一次使用要下载约 8 MB，之后会快很多）…");
  const { createWorker } = await import("tesseract.js");
  // 识别组件和中文、英文模型都放在本站 /ocr/ 目录下，不依赖境外 CDN
  const base = new URL("ocr/", document.baseURI).href;
  const worker = await createWorker(["chi_sim", "eng"], 1, {
    workerPath: `${base}worker.min.js`,
    corePath: base,
    langPath: `${base}lang`,
    gzip: true,
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") progress(`正在识别图片中的文字… ${Math.round(m.progress * 100)}%`, m.progress);
      else if (/loading|initializ/.test(m.status)) progress("正在准备识别模型…", m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return tidyOcr(data.text);
  } finally {
    await worker.terminate();
  }
}

/** 读取文件文字；出错时抛出带中文说明的 Error。 */
export async function extractText(file: File, progress: Progress = () => {}): Promise<{ text: string; kind: ExtractKind }> {
  const kind = kindOf(file.name, file.type);
  if (!kind) throw new Error(unsupportedReason(file.name));
  if (file.size > MAX_FILE_BYTES[kind]) throw new Error(`文件太大了（上限约 ${Math.round(MAX_FILE_BYTES[kind] / 1_000_000) || 0.2} MB），请拆成几份再导入。`);
  try {
    const text = kind === "text" ? await readText(file) : kind === "pdf" ? await readPdf(file, progress) : kind === "docx" ? await readDocx(file, progress) : kind === "pptx" ? await readPptx(file, progress) : await readImage(file, progress);
    if (!text.trim()) throw new Error(kind === "pdf" ? "这个 PDF 里没有可复制的文字（可能是扫描件）。可以截图后按“图片”导入。" : kind === "image" ? "没有从图片中识别出文字。请拍得更清楚、正一些再试。" : "文件里没有读到文字。");
    return { text, kind };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/没有|太大|旧版|暂不支持/.test(msg)) throw e;
    if (kind === "image") throw new Error("文字识别失败：识别组件没有加载成功。请检查网络后重试，或直接把文字粘贴进来。");
    if (/password/i.test(msg)) throw new Error("这个文件有密码保护，请先取消密码再导入。");
    throw new Error(`读取文件失败：文件可能已损坏或格式不对。（${msg.slice(0, 80)}）`);
  }
}
