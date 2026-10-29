import { track } from "@/lib/telemetry";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { createPracticeBackup, readPracticeBackup, backupFilename, BACKUP_LIMIT, type PracticeImport } from "@/lib/math/practice-backup";
import { CLASS_LOG_KEY } from "@/lib/lesson/class-log";
import { ACTIVITY_KEY } from "@/lib/activity";
import { REVIEW_CONTENT_KEY, REVIEW_SCHEDULE_KEY } from "@/lib/math/review";
import { useRef, useState, type ChangeEvent } from "react";
import { Download, FolderOpen, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/download";
import { readStoredActivity } from "@/lib/activity";
import { readStoredClassLog } from "@/lib/lesson/class-log";
import { SAVE_KEY, UNREADABLE_KEY } from "@/lib/math/save";
import { todayStamp } from "@/lib/math/progress";
import { useMath } from "@/store/math";

export function Backup() {
  const [pending, setPending] = useState<PracticeImport | null>(null);
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
    track("backup_export_click", useMath.getState().selectedGrade);
    try {
      const store = window.localStorage;
      const log = readStoredClassLog(store), activity = readStoredActivity(store);
      if (!log.ok || !activity.ok || storageBlocked) throw new Error("存档无法完整读取，请先下载原始存档，避免导出不完整备份。");
      const state = useMath.getState();
      const data = { [SAVE_KEY]: state, [CLASS_LOG_KEY]: JSON.parse(store.getItem(CLASS_LOG_KEY) ?? "{}"), [ACTIVITY_KEY]: JSON.parse(store.getItem(ACTIVITY_KEY) ?? "{}"),
        [REVIEW_CONTENT_KEY]: state.reviewData.content, [REVIEW_SCHEDULE_KEY]: state.reviewData.schedule };
      const backup = createPracticeBackup(data, location.origin);
      const text = JSON.stringify(backup, null, 2);
      if (new TextEncoder().encode(text).length > BACKUP_LIMIT) throw new Error("备份超过 2 MB，未导出，请联系反馈邮箱协助。");
      downloadText(backupFilename(), text, "application/json;charset=utf-8");
      note("已生成备份文件，请妥善保存。建议定期导出备份。");
    } catch (error) { note(error instanceof Error ? error.message : "无法读取本机记录。", true); }
  };
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReading(true); setPending(null); note("");
    try {
      if (file.size > BACKUP_LIMIT) throw new Error("文件超过 2 MB，请选择开窍导出的 JSON 备份。");
      const parsed = readPracticeBackup(await file.text());
      setPending(parsed);
      if (parsed.ignored) note(`已忽略 ${parsed.ignored} 个未知存储键，不会写入本机。`);
    } catch (error) {
      note(error instanceof Error ? error.message : "读取失败，原有记录未改变。", true);
    } finally { setReading(false); }
  };
  return (
    <section className="surface-card mt-5" aria-labelledby="backup-title">
      <a className="text-xs underline" href="mailto:hello@yanghat.cn?subject=%E5%BC%80%E7%AA%8D%E5%8F%8D%E9%A6%88">意见反馈：hello@yanghat.cn</a>
      <p className="text-xs leading-relaxed text-muted-foreground">不用注册，不收集个人信息；练习记录只保存在本机浏览器，换设备或清理浏览器数据前请先导出备份。默认不启用联网 AI；主动使用 AI 时会发送课堂内容、提问及相关错题作答，请勿在提问中填写个人信息。自备接口会向所填服务商发送请求；平台 AI 会同时发送随机账号标识。</p>
      <h3 id="backup-title" className="flex items-center gap-2 text-[15px]"><ShieldCheck size={17} className="text-primary" />备份与恢复</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">记录只在本机浏览器，建议定期导出备份。备份包含今日复习题目与到期日、练习、课堂记录和最近 60 天的每日题数。换设备或清理浏览器前，先保存一份。</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="secondary" className="text-xs" onClick={exportCurrent}><Download />导出备份</Button>
        <Button variant="outline" className="text-xs" disabled={reading} onClick={() => fileInput.current?.click()}><FolderOpen />{reading ? "正在读取…" : "导入备份"}</Button>
        {storageBlocked ? <Button variant="outline" onClick={() => {
          try { downloadText(`开窍-原始复习存档-${todayStamp()}.json`, JSON.stringify({ content: localStorage.getItem(REVIEW_CONTENT_KEY), schedule: localStorage.getItem(REVIEW_SCHEDULE_KEY) }, null, 2), "application/json;charset=utf-8"); }
          catch { note("浏览器不允许读取复习存档。", true); }
        }}>下载原始复习存档</Button> : null}
        {rawCopy ? <Button variant="outline" className="text-xs" onClick={() => { downloadText(`开窍-原始存档-${todayStamp()}.json`, rawCopy, "application/json;charset=utf-8"); note("已下载无法完整读取的原始存档，请保存好；需要修复时把它发给开发者。"); }}><Download />下载原始存档</Button> : null}
        <input ref={fileInput} aria-label="选择备份文件" className="hidden" type="file" accept=".json,application/json" disabled={reading} onChange={(e) => void onFile(e)} />
      </div>
      {pending ? (
        <div className="mt-3 rounded-xl bg-secondary p-3">
          <p className="text-sm">备份：{pending.data.selectedGrade} 年级 · 累计 {pending.data.stats.answered} 题 · {pending.data.wrong.length} 道错题</p>
          <p className="mt-2 text-xs leading-relaxed">{pending.extras ? <>同时包含课堂记录 {Object.keys(pending.extras?.classLog ?? {}).length} 节、最近有答题的 {Object.values(pending.extras?.activity ?? {}).filter((d) => d.n > 0).length} 天。</> : <>旧备份没有课堂和每日题数，将保留本机这两项记录。</>}导入会替换本机所有年级的练习记录，不会合并。请先导出当前备份。</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <ConfirmAction title="导入备份？" description={`导入会覆盖本机现有练习记录，不会合并。备份时间：${pending.exportedAt ? new Date(pending.exportedAt).toLocaleString('zh-CN') : '旧备份未记录时间'}；累计 ${pending.data.stats.answered} 题，${pending.data.wrong.length} 道错题，课堂 ${Object.keys(pending.extras?.classLog ?? {}).length} 节，复习 ${Object.keys(pending.extras?.review?.schedule ?? {}).length} 道。确定导入？`} confirmLabel="确认导入" onConfirm={() => {
              if (restore(pending.data, pending.extras)) { setPending(null); note("已恢复备份。"); }
              else note("恢复失败，请检查浏览器存储空间；已尝试回滚原有记录。", true);
            }}><Button>确认替换并恢复</Button></ConfirmAction>
            <Button variant="ghost" onClick={() => setPending(null)}>取消</Button>
          </div>
        </div>
      ) : null}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground" role={messageError ? "alert" : "status"}>{message}</p>
    </section>
  );
}
