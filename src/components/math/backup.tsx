import { useRef, useState, type ChangeEvent } from "react";
import { Download, FolderOpen, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/download";
import { readStoredActivity } from "@/lib/activity";
import { readStoredClassLog } from "@/lib/lesson/class-log";
import { exportBackup, readBackup, MAX_BACKUP_BYTES, SAVE_KEY, UNREADABLE_KEY, type BackupExtras, type PersistShape } from "@/lib/math/save";
import { todayStamp } from "@/lib/math/progress";
import { useMath } from "@/store/math";

export function Backup() {
  const [pending, setPending] = useState<{ data: PersistShape; extras: BackupExtras | null } | null>(null);
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [reading, setReading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const restore = useMath((s) => s.restore);
  const storageBlocked = useMath((s) => s.storageBlocked);
  const note = (text: string, error = false) => { setMessage(text); setMessageError(error); };
  // 读不懂的原始存档：被保护的主存档，或容错读取时另存的副本。可以下载下来，交给开发者帮忙修复。
  const rawCopy = (() => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(UNREADABLE_KEY)).sort();
      if (storageBlocked) return localStorage.getItem(SAVE_KEY);
      return keys.length ? localStorage.getItem(keys[keys.length - 1]) : null;
    } catch { return null; }
  })();
  const exportCurrent = () => {
    const store = window.localStorage;
    const log = readStoredClassLog(store);
    const activity = readStoredActivity(store);
    if (!log.ok || !activity.ok) {
      note("课堂记录或每日题数读不懂，没有导出。请先下载原始存档，不要用空备份覆盖。", true);
      return;
    }
    downloadText(`开窍-备份-${todayStamp()}.json`, exportBackup(useMath.getState(), { classLog: log.log, activity: activity.activity }), "application/json;charset=utf-8");
    const days = Object.values(activity.activity).filter((d) => d.n > 0).length;
    note(`已生成备份文件，请保存到文件或云盘。含答题与错题，以及课堂记录 ${Object.keys(log.log).length} 节、最近有答题的 ${days} 天。`);
  };
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true); setPending(null); note("");
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("文件超过 1 MB，请选择开窍导出的 JSON 备份。");
      setPending(readBackup(await file.text()));
    } catch (error) {
      note(error instanceof Error ? error.message : "读取失败，原有记录未改变。", true);
    } finally { setReading(false); }
  };
  return (
    <section className="surface-card mt-5" aria-labelledby="backup-title">
      <h3 id="backup-title" className="flex items-center gap-2 text-[15px]"><ShieldCheck size={17} className="text-primary" />备份与恢复</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">进度保存在当前浏览器。备份包含练习、课堂记录和最近 60 天的每日题数。换设备或清理浏览器前，先保存一份。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" className="text-xs" onClick={exportCurrent}><Download />导出备份</Button>
        <Button variant="outline" className="text-xs" disabled={reading} onClick={() => fileInput.current?.click()}><FolderOpen />{reading ? "正在读取…" : "恢复备份"}</Button>
        {rawCopy ? <Button variant="outline" className="text-xs" onClick={() => { downloadText(`开窍-原始存档-${todayStamp()}.json`, rawCopy, "application/json;charset=utf-8"); note("已下载无法完整读取的原始存档，请保存好；需要修复时把它发给开发者。"); }}><Download />下载原始存档</Button> : null}
        <input ref={fileInput} aria-label="选择备份文件" className="hidden" type="file" accept=".json,application/json" disabled={reading} onChange={(e) => void onFile(e)} />
      </div>
      {pending ? (
        <div className="mt-3 rounded-xl bg-secondary p-3">
          <p className="text-sm">备份：{pending.data.selectedGrade} 年级 · 累计 {pending.data.stats.answered} 题 · {pending.data.wrong.length} 道错题</p>
          <p className="mt-2 text-xs leading-relaxed">{pending.extras ? `同时包含课堂记录 ${Object.keys(pending.extras.classLog).length} 节、最近有答题的 ${Object.values(pending.extras.activity).filter((d) => d.n > 0).length} 天。恢复会替换这些记录。` : "这是旧版备份，不含课堂练习记录和每日题数。恢复后这两项保持本机原样。"}</p>
          <p className="mt-2 text-xs leading-relaxed">恢复会替换本机所有年级的练习记录，不会合并。请先导出当前备份。{storageBlocked ? "原存档读取失败，导出的仅是当前练习数据。" : ""}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => {
              if (restore(pending.data, pending.extras)) { setPending(null); note("已恢复备份。"); }
              else note("恢复失败，当前记录未改变。", true);
            }}>确认替换并恢复</Button>
            <Button variant="ghost" onClick={() => setPending(null)}>取消</Button>
          </div>
        </div>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground" role={messageError ? "alert" : "status"}>{message}</p>
    </section>
  );
}
