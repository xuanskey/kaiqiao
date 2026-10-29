import { useSyncExternalStore } from "react";
import { applyUpdate, updateStore } from "@/lib/sw-update";

/** 有新版本时的提示条。固定定位、不挤动页面；只在用户点按钮时更新。 */
export function UpdatePrompt() {
  const ready = useSyncExternalStore(updateStore.subscribe, updateStore.ready, () => false);
  if (!ready) return null;
  return <div role="status" className="update-prompt">
    <span>有新版本，完成当前练习后点此更新</span>
    <button type="button" onClick={applyUpdate}>更新</button>
  </div>;
}
