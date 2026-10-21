import { useRef, useState, type ChangeEvent } from "react";
import { Download, FolderOpen, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/download";
import { exportBackup, importBackup, MAX_BACKUP_BYTES, SAVE_KEY, UNREADABLE_KEY, type PersistShape } from "@/lib/math/save";
import { todayStamp } from "@/lib/math/progress";
import { useMath } from "@/store/math";

export function Backup() {
  const [pending, setPending] = useState<PersistShape | null>(null);
  const [message, setMessage] = useState("");
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const restore = useMath((s) => s.restore);
  const storageBlocked = useMath((s) => s.storageBlocked);
  // 读不懂的原始存档：被保护的主存档，或容错读取时另存的副本。可以下载下来，交给开发者帮忙修复。
  const rawCopy = (() => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(UNREADABLE_KEY)).sort();
      if (storageBlocked) return localStorage.getItem(SAVE_KEY);
      return keys.length ? localStorage.getItem(keys[keys.length - 1]) : null;
    } catch { return null; }
  })();
  const exportCurrent = () => {
    downloadText(`开窍-备份-${todayStamp()}.json`, exportBackup(useMath.getState()), "application/json;charset=utf-8");
    setMessage("已生成备份文件，请保存到文件或云盘。备份含答题与错题记录。");
  };
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true); setPending(null); setMessage("");
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("文件超过 1 MB，请选择开窍导出的 JSON 备份。");
      setPending(importBackup(await file.text()));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取失败，原有记录未改变。");
    } finally { setReading(false); }
  };
  return (
    <section className="surface-card mt-5" aria-labelledby="backup-title">
      <h3 id="backup-title" className="flex items-center gap-2 text-[15px]"><ShieldCheck size={17} className="text-primary" />备份与恢复</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">进度保存在当前浏览器。换设备或清理浏览器前，先保存一份备份。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" className="text-xs" onClick={exportCurrent}><Download />导出备份</Button>
        <Button variant="outline" className="text-xs" disabled={reading} onClick={() => fileInput.current?.click()}><FolderOpen />{reading ? "正在读取…" : "恢复备份"}</Button>
        {rawCopy ? <Button variant="outline" className="text-xs" onClick={() => { downloadText(`开窍-原始存档-${todayStamp()}.json`, rawCopy, "application/json;charset=utf-8"); setMessage("已下载无法完整读取的原始存档，请保存好；需要修复时把它发给开发者。"); }}><Download />下载原始存档</Button> : null}
        <input ref={fileInput} aria-label="选择备份文件" className="hidden" type="file" accept=".json,application/json" disabled={reading} onChange={(e) => void onFile(e)} />
      </div>
      {pending ? (
        <div className="mt-3 rounded-xl bg-secondary p-3">
          <p className="text-sm">备份：{pending.selectedGrade} 年级 · 累计 {pending.stats.answered} 题 · {pending.wrong.length} 道错题</p>
          <p className="mt-2 text-xs leading-relaxed">恢复会替换本机所有年级的记录，不会合并。请先导出当前备份。{storageBlocked ? "原存档读取失败，导出的仅是当前练习数据。" : ""}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => {
              if (restore(pending)) { setPending(null); setMessage("已恢复备份。"); }
              else setMessage("恢复失败，当前记录未改变。");
            }}>确认替换并恢复</Button>
            <Button variant="ghost" onClick={() => setPending(null)}>取消</Button>
          </div>
        </div>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground" role="status">{message}</p>
    </section>
  );
}
