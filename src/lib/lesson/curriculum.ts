import type { Grade } from "../math/types.ts";
import type { DemoId, Subject } from "./demos.ts";

/**
 * 教材目录配置。每个版本独立维护，不同版本的单元不会混在一起。
 * 新增教材版本时，只需添加一个 Edition 对象。
 */
export type Term = "上" | "下";

export type CourseUnit = {
  id: string;
  title: string;
  /** 本单元可用的互动演示 */
  demos?: DemoId[];
  /** 对应题库中的章节，可直接去练习 */
  practiceGrade?: Grade;
};

export type Edition = {
  id: string;
  name: string;
  subject: Subject;
  /** 来源与核对说明 */
  note: string;
  /** 是否已经录入目录 */
  ready: boolean;
  catalog: Partial<Record<`${Grade}${Term}`, CourseUnit[]>>;
};

const U = (grade: Grade, term: Term, titles: (string | [string, DemoId[]])[]): CourseUnit[] =>
  titles.map((t, i) => {
    const [title, demos] = typeof t === "string" ? [t, undefined] : t;
    return { id: `pep-${grade}${term === "上" ? "a" : "b"}-${i + 1}`, title, demos, practiceGrade: grade };
  });

export const PEP_MATH: Edition = {
  id: "pep-math",
  name: "人教版",
  subject: "math",
  ready: true,
  note: "按人教版小学数学（2012 年起使用的版本）单元目录整理；2024 年起各地陆续换用新修订教材，目录可能不同，请以孩子手中的课本为准。",
  catalog: {
    "1上": U(1, "上", ["准备课", "位置", ["1～5 的认识和加减法", ["add-sub"]], "认识图形（一）", ["6～10 的认识和加减法", ["add-sub"]], "11～20 各数的认识", "认识钟表", ["20 以内的进位加法", ["add-sub"]]]),
    "1下": U(1, "下", ["认识图形（二）", ["20 以内的退位减法", ["add-sub"]], "分类与整理", "100 以内数的认识", "认识人民币", "100 以内的加法和减法（一）", "找规律"]),
    "2上": U(2, "上", ["长度单位", "100 以内的加法和减法（二）", "角的初步认识", ["表内乘法（一）", ["group-share"]], "观察物体（一）", ["表内乘法（二）", ["group-share"]], "认识时间", "数学广角——搭配（一）"]),
    "2下": U(2, "下", ["数据收集整理", ["表内除法（一）", ["group-share"]], "图形的运动（一）", ["表内除法（二）", ["group-share"]], "混合运算", ["有余数的除法", ["group-share"]], "万以内数的认识", "克和千克", "数学广角——推理"]),
    "3上": U(3, "上", ["时、分、秒", "万以内的加法和减法（一）", "测量", "万以内的加法和减法（二）", "倍的认识", "多位数乘一位数", ["长方形和正方形", ["perimeter-area"]], ["分数的初步认识", ["fraction"]], "数学广角——集合"]),
    "3下": U(3, "下", ["位置与方向（一）", "除数是一位数的除法", "复式统计表", "两位数乘两位数", ["面积", ["perimeter-area"]], "年、月、日", "小数的初步认识", "数学广角——搭配（二）"]),
    "4上": U(4, "上", ["大数的认识", "公顷和平方千米", ["角的度量", ["angle"]], "三位数乘两位数", "平行四边形和梯形", "除数是两位数的除法", "条形统计图", "数学广角——优化"]),
    "4下": U(4, "下", ["四则运算", "观察物体（二）", ["运算定律", ["law"]], "小数的意义和性质", "三角形", "小数的加法和减法", "图形的运动（二）", "平均数与条形统计图", "数学广角——鸡兔同笼"]),
    "5上": U(5, "上", [["小数乘法", ["decimal-mul"]], "位置", "小数除法", "可能性", ["简易方程", ["balance"]], "多边形的面积", "数学广角——植树问题"]),
    "5下": U(5, "下", ["观察物体（三）", "因数与倍数", "长方体和正方体", "分数的意义和性质", "图形的运动（三）", "分数的加法和减法", "折线统计图", "数学广角——找次品"]),
    "6上": U(6, "上", ["分数乘法", "位置与方向（二）", "分数除法", "比", ["圆", ["circle"]], "百分数（一）", "扇形统计图", "数学广角——数与形"]),
    "6下": U(6, "下", ["负数", "百分数（二）", ["圆柱与圆锥", ["cylinder"]], "比例", "数学广角——鸽巢问题", "整理和复习"]),
  },
};

/** 科学课的演示按学段归类，标注对应的教科版单元主题，未逐课核对。 */
const S = (id: string, title: string, demos: DemoId[]): CourseUnit => ({ id, title, demos });
export const JK_SCIENCE: Edition = {
  id: "jk-science",
  name: "教科版",
  subject: "science",
  ready: true,
  note: "只收录已有互动实验的主题，对应教科版相关单元，未逐课核对；屏幕实验不能代替真实动手实验。",
  catalog: {
    "2下": [S("jk-2b-magnet", "磁铁", ["magnet"])],
    "3下": [S("jk-3b-shadow", "太阳、地球和月球（影子的变化）", ["shadow"])],
    "4下": [S("jk-4b-circuit", "电路", ["circuit"])],
    "5上": [S("jk-5a-pendulum", "计量时间（摆的研究）", ["pendulum"])],
  },
};

/** 预留的其他版本：目录尚未录入，界面会如实显示“暂未录入”，不会借用别的版本的目录。 */
export const PLACEHOLDER_EDITIONS: Edition[] = [
  { id: "bsd-math", name: "北师大版", subject: "math", ready: false, note: "目录尚未录入。", catalog: {} },
  { id: "sj-math", name: "苏教版", subject: "math", ready: false, note: "目录尚未录入。", catalog: {} },
];

export const EDITIONS: Edition[] = [PEP_MATH, ...PLACEHOLDER_EDITIONS, JK_SCIENCE];

export function editionsFor(subject: Subject): Edition[] {
  return EDITIONS.filter((e) => e.subject === subject);
}

export function unitsOf(edition: Edition, grade: Grade, term: Term): CourseUnit[] {
  return edition.catalog[`${grade}${term}`] ?? [];
}

export const SUBJECT_LABEL: Record<Subject, string> = { math: "数学", science: "科学" };
