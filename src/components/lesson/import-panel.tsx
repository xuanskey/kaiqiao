import { useState } from "react";
import { Camera, FileText, Loader2, Presentation } from "lucide-react";
import { MAX_TEXT, analyzeText, type ImportResult } from "@/lib/lesson/importer";
import { extractText } from "@/lib/lesson/file-extract";
import { DEMOS, type DemoId } from "@/lib/lesson/demos";
import { GRADE_LABEL } from "@/lib/math/chapters";
import type { Grade } from "@/lib/math/types";

const STATUS: Record<string, string> = { ok: "可以用", "needs-confirm": "请确认", "above-grade": "超出年级", "beyond-primary": "超出小学" };

/** 导入 Markdown / 纯文本资料：识别题目和算式，独立计算答案，标出超纲和识别不清的内容。 */
export function ImportPanel({ grade, onOpen }: { grade: Grade; onOpen: (demo: DemoId) => void }) {
  const [g, setG] = useState<Grade>(grade);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file || busy) return;
    setBusy("正在读取…");
    try {
      const { text: t, kind } = await extractText(file, (m) => setBusy(m));
      setName(`${file.name}${kind === "image" ? "（拍照识别）" : ""}`);
      setText(t.length > MAX_TEXT ? t.slice(0, MAX_TEXT) : t);
      if (t.length > MAX_TEXT) setError(`内容较长，只保留了前 ${MAX_TEXT} 字，剩下的可以分批导入。`);
      else if (kind === "image") setError("图片文字由程序识别，可能有错字，请先对照原图改一改，再点“识别内容”。");
      setResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取文件失败。");
    } finally {
      setBusy(null);
    }
  };
  return <section className="import-panel" aria-label="导入学习资料">
    <header><FileText size={18} /><strong>导入学习资料</strong><small>支持粘贴文字，或导入 .txt、.md、PDF、Word（.docx）、PPT（.pptx）和拍照图片；只读取文字，不执行文件里的任何代码</small></header>
    <div className="import-row">
      <label>适用年级<select value={g} onChange={(e) => { setG(Number(e.target.value) as Grade); setResult(null); }}>{([1, 2, 3, 4, 5, 6] as Grade[]).map((x) => <option key={x} value={x}>{GRADE_LABEL[x]}</option>)}</select></label>
      <label className="import-file" aria-disabled={!!busy}>选择文件<input type="file" disabled={!!busy} accept=".md,.markdown,.txt,.pdf,.docx,.pptx,image/*,text/plain,text/markdown,application/pdf" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
      <label className="import-file import-camera" aria-disabled={!!busy}><Camera size={14} />拍照识别<input type="file" disabled={!!busy} accept="image/*" capture="environment" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} /></label>
      {name ? <span className="import-name">{name}</span> : null}
    </div>
    <textarea value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder={"把题目或课文粘贴到这里，例如：\n# 小数乘法\n1.2×0.5=\n一件衣服打八折，现价多少？"} aria-label="资料内容" rows={6} />
    {busy ? <p className="import-busy" role="status"><Loader2 size={14} className="spin" />{busy}</p> : null}
    {error ? <p className="import-error" role="alert">{error}</p> : null}
    <button type="button" className="import-go" disabled={!text.trim()} onClick={() => { setResult(analyzeText(text, g)); setConfirmed({}); }}>识别内容</button>
    {result ? <div className="import-result">
      <p className="import-summary">共 {result.summary.total} 行：可以用 {result.summary.ok}，请确认 {result.summary.confirm}，超出年级 {result.summary.above}，超出小学 {result.summary.beyond}。答案由程序计算，请家长再核对一遍。</p>
      <ol>{result.items.map((it) => <li key={it.line} className={`import-item is-${it.status}`}>
        <span className="import-line">第 {it.line} 行</span>
        <div>
          <p className="import-source">{it.source}</p>
          {it.answer && (it.status !== "needs-confirm" || confirmed[it.line]) ? <p className="import-answer">答案：{it.answer}{it.steps ? `（${it.steps.join("；")}）` : ""}</p> : null}
          {it.reason ? <p className="import-reason">{it.reason}</p> : null}
          {it.status === "needs-confirm" ? <label className="import-confirm"><input type="checkbox" checked={!!confirmed[it.line]} onChange={(e) => setConfirmed((c) => ({ ...c, [it.line]: e.target.checked }))} />我已核对原文无误</label> : null}
        </div>
        <span className="import-badge">{STATUS[it.status]}</span>
        {it.demo && it.status === "ok" ? <button type="button" className="import-open" onClick={() => onOpen(it.demo!)}><Presentation size={14} />{DEMOS[it.demo].title}</button> : null}
      </li>)}</ol>
    </div> : null}
  </section>;
}
