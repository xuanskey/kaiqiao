// 课堂（含课程演示与随堂练习组件）按需加载：首页、题库和练习不必先下载它。离线单文件版
// offline.html 构建时把本模块替换为 screens.static.ts（见 vite.config.ts 的 KAIQIAO_SINGLE_FILE），保持一个文件能用。
// 理解页 learning.tsx 很小且 UnitProgress 被学情页静态使用，拆出来几乎不省体积，不拆。
import { lazy } from "react";

export const Classroom = lazy(() => import("@/components/lesson/classroom").then((m) => ({ default: m.Classroom })));
