import { useState } from "react";
import { FileText, Presentation } from "lucide-react";
import { analyzeText, type ImportResult } from "@/lib/lesson/importer";
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
  const onFile = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) { setError("这个版本只能读取 .md 和 .txt 文件。PDF、Word、PPT 和图片可以先把文字复制进来。"); return; }
    if (file.size > 200_000) { setError("文件太大了，请分段粘贴（最多约 20000 字）。"); return; }
    const buf = await file.arrayBuffer();
    let t = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    if (t.includes("\uFFFD")) { try { t = new TextDecoder("gb18030").decode(buf); } catch { /* 浏览器不支持 GB18030 时保留 UTF-8 结果 */ } }
    setName(file.name); setText(t); setResult(null);
  };
  return <section className="import-panel" aria-label="导入学习资料">
    <header><FileText size={18} /><strong>导入学习资料</strong><small>支持粘贴文字、.md、.txt；不会执行资料里的任何代码</small></header>
    <div className="import-row">
      <label>适用年级<select value={g} onChange={(e) => { setG(Number(e.target.value) as Grade); setResult(null); }}>{([1, 2, 3, 4, 5, 6] as Grade[]).map((x) => <option key={x} value={x}>{GRADE_LABEL[x]}</option>)}</select></label>
      <label className="import-file">选择文件<input type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={(e) => void onFile(e.target.files?.[0])} /></label>
      {name ? <span className="import-name">{name}</span> : null}
    </div>
    <textarea value={text} onChange={(e) => { setText(e.target.value); setResult(null); }} placeholder={"把题目或课文粘贴到这里，例如：\n# 小数乘法\n1.2×0.5=\n一件衣服打八折，现价多少？"} aria-label="资料内容" rows={6} />
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
