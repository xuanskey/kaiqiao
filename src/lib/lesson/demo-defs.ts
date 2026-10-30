import type { Grade } from "../math/types.ts";
import { fmtScaled } from "./num.ts";
import { PLUS_DEMOS, normalizePlus, type PlusId } from "./demo-defs-plus.ts";

// 课程的“目录信息”（名称、年级、参数）：首页、今日推荐和课堂记录只需要这些，放在主包里。
// 讲课脚本、计算和舞台在 demos.ts 与课堂组件里，随课堂按需加载。

export type Subject = "math" | "science";

export type DemoId =
  | "add-sub" | "group-share" | "fraction" | "perimeter-area" | "angle" | "law"
  | "decimal-mul" | "balance" | "circle" | "cylinder"
  | "shapes" | "rmb" | "ruler" | "clock" | "parallel" | "chance" | "number-line" | "percent" | "pigeonhole" | "scale"
  | "make-ten" | "bar-chart" | "poly-area"
  | "decimal-div" | "fraction-mul"
  | "magnet" | "shadow" | "circuit" | "pendulum" | "water"
  | "lever" | "slope" | "sound" | "earth" | "friction" | "plant"
  | PlusId;

export type ParamSpec = {
  key: string;
  label: string;
  min: number;
  max: number;
  /** 所有参数都是整数；display = value / scale */
  scale?: number;
  /** display = value × mul（例如原价以 10 元为一档） */
  mul?: number;
  unit?: string;
  default: number;
  /** 0/1 开关或选项 */
  options?: string[];
  /** 只在另一个参数取这些值时显示（例如只有“亿以内”才显示万级的数位） */
  when?: [string, number[]];
};

export type Experiment = {
  goal: string;
  tools: string[];
  steps: string[];
  observe: string;
  explain: string;
  safety?: string;
  think: string;
  virtualNote: string;
};

export type DemoDef = {
  id: DemoId;
  subject: Subject;
  title: string;
  /** 正常课程适用年级 */
  grades: Grade[];
  summary: string;
  params: ParamSpec[];
  experiment?: Experiment;
};

export type Params = Record<string, number>;

export const DEMOS: Record<DemoId, DemoDef> = {
  "add-sub": { id: "add-sub", subject: "math", title: "摆一摆：加法和减法", grades: [1], summary: "拖动苹果，看合起来和拿走以后各有多少。",
    params: [
      { key: "op", label: "算法", min: 0, max: 1, default: 0, options: ["合起来（加法）", "拿走（减法）"] },
      { key: "a", label: "第一盘", min: 0, max: 10, default: 3, unit: "个" },
      { key: "b", label: "第二盘 / 拿走", min: 0, max: 10, default: 2, unit: "个" },
    ] },
  "group-share": { id: "group-share", subject: "math", title: "分一分：乘法与平均分", grades: [2], summary: "几个几用乘法；平均分给几个小朋友用除法。",
    params: [
      { key: "mode", label: "看什么", min: 0, max: 1, default: 0, options: ["几个几（乘法）", "平均分（除法）"] },
      { key: "groups", label: "几组 / 几人", min: 1, max: 9, default: 3 },
      { key: "each", label: "每组几个", min: 1, max: 9, default: 4, unit: "个" },
      { key: "total", label: "一共几个", min: 1, max: 40, default: 12, unit: "个" },
    ] },
  fraction: { id: "fraction", subject: "math", title: "分数的初步认识", grades: [3], summary: "把一个整体平均分，改变份数，看每一份和涂色部分怎样变化。",
    params: [
      { key: "parts", label: "平均分成几份", min: 2, max: 12, default: 4, unit: "份" },
      { key: "shaded", label: "涂色几份", min: 0, max: 12, default: 1, unit: "份" },
      { key: "shape", label: "图形", min: 0, max: 1, default: 0, options: ["长条", "圆"] },
    ] },
  "perimeter-area": { id: "perimeter-area", subject: "math", title: "周长和面积", grades: [3], summary: "沿边走一圈是周长，用方格铺满是面积。",
    params: [
      { key: "l", label: "长", min: 1, max: 12, default: 5, unit: "厘米" },
      { key: "w", label: "宽", min: 1, max: 8, default: 3, unit: "厘米" },
    ] },
  angle: { id: "angle", subject: "math", title: "量角器量角", grades: [2, 3, 4], summary: "拖动角的一条边，用量角器读出度数，判断是什么角。",
    params: [{ key: "deg", label: "角的度数", min: 0, max: 180, default: 60, unit: "°" }] },
  law: { id: "law", subject: "math", title: "乘法分配律", grades: [4], summary: "把一个长方形拆成两块，看 a×(b+c) 和 a×b+a×c 为什么相等。",
    params: [
      { key: "a", label: "a（宽）", min: 1, max: 9, default: 4 },
      { key: "b", label: "b", min: 1, max: 9, default: 3 },
      { key: "c", label: "c", min: 1, max: 9, default: 5 },
    ] },
  "decimal-mul": { id: "decimal-mul", subject: "math", title: "小数乘小数", grades: [5], summary: "先把小数看成整数相乘，再数一数积有几位小数。",
    params: [
      { key: "a", label: "第一个因数", min: 1, max: 99, scale: 10, default: 12 },
      { key: "b", label: "第二个因数", min: 1, max: 99, scale: 10, default: 5 },
    ] },
  balance: { id: "balance", subject: "math", title: "天平与等式的性质", grades: [5], summary: "知道 x 是多少，代入算出左边有多重；两边同时加上或减去同样多，天平仍然平衡。（解方程到初中再系统学习）",
    params: [
      { key: "a", label: "x 的个数 a", min: 1, max: 6, default: 3 },
      { key: "b", label: "另放的砝码 b", min: 0, max: 20, default: 4, unit: "g" },
      { key: "x", label: "每个 x 的质量", min: 1, max: 12, default: 5, unit: "g" },
    ] },
  circle: { id: "circle", subject: "math", title: "圆的周长和面积", grades: [6], summary: "改变半径，周长和面积实时计算；把圆切开拼成近似长方形。",
    params: [
      { key: "r", label: "半径 r", min: 1, max: 10, default: 3, unit: "厘米" },
      { key: "n", label: "切成几份", min: 4, max: 32, default: 8, unit: "份" },
    ] },
  cylinder: { id: "cylinder", subject: "math", title: "圆柱展开与体积", grades: [6], summary: "把圆柱侧面展开成长方形；等底等高的圆锥体积是圆柱的三分之一。",
    params: [
      { key: "r", label: "底面半径 r", min: 1, max: 6, default: 2, unit: "厘米" },
      { key: "h", label: "高 h", min: 1, max: 10, default: 5, unit: "厘米" },
      { key: "open", label: "展开程度", min: 0, max: 10, default: 0 },
    ] },
  shapes: { id: "shapes", subject: "math", title: "认识图形：分一分", grades: [1], summary: "把图形拖进对应的格子，说一说它们的样子。",
    params: [{ key: "kind", label: "看哪一类", min: 0, max: 1, default: 0, options: ["平面图形", "立体图形"] }] },
  rmb: { id: "rmb", subject: "math", title: "欢乐购物街：认识人民币", grades: [1], summary: "选一件商品，付钱、找零，看看找回的钱怎么凑。",
    params: [
      { key: "price", label: "商品价格", min: 1, max: 20, default: 7, unit: "元" },
      { key: "pay", label: "付的钱", min: 0, max: 3, default: 1, options: ["5 元", "10 元", "20 元", "50 元"] },
    ] },
  ruler: { id: "ruler", subject: "math", title: "用尺子量长度", grades: [2], summary: "拖动铅笔，看左端没对准 0 时怎样读出长度。",
    params: [
      { key: "start", label: "左端对着", min: 0, max: 5, default: 0, unit: "厘米" },
      { key: "len", label: "铅笔长", min: 1, max: 10, default: 6, unit: "厘米" },
    ] },
  clock: { id: "clock", subject: "math", title: "认识时间：几时几分", grades: [1, 2, 3], summary: "拖动分针，看时针怎样跟着慢慢走。",
    params: [
      { key: "h", label: "时", min: 1, max: 12, default: 3 },
      { key: "m", label: "分", min: 0, max: 55, default: 30 },
    ] },
  parallel: { id: "parallel", subject: "math", title: "平行与垂直", grades: [4], summary: "旋转一条直线，看两条直线什么时候平行、什么时候垂直。",
    params: [{ key: "deg", label: "两条直线的夹角", min: 0, max: 180, default: 60, unit: "°" }] },
  chance: { id: "chance", subject: "math", title: "可能性：摸球试验", grades: [5], summary: "改变袋子里的球，真的随机摸很多次，看结果和猜的一样吗。",
    params: [
      { key: "red", label: "红球", min: 0, max: 10, default: 7, unit: "个" },
      { key: "white", label: "白球", min: 0, max: 10, default: 3, unit: "个" },
    ] },
  "number-line": { id: "number-line", subject: "math", title: "生活中的负数：数轴", grades: [6], summary: "在数轴上找正数、0 和负数，比较它们的大小。",
    params: [
      { key: "a", label: "第一个数", min: -10, max: 10, default: -3 },
      { key: "b", label: "第二个数", min: -10, max: 10, default: 2 },
    ] },
  percent: { id: "percent", subject: "math", title: "百分数：打折购物", grades: [6], summary: "改变原价和折扣，算出现价和便宜了多少。",
    params: [
      { key: "price", label: "原价", min: 1, max: 50, mul: 10, default: 20, unit: "元" },
      { key: "zhe", label: "打几折", min: 1, max: 9, default: 8, unit: "折" },
    ] },
  pigeonhole: { id: "pigeonhole", subject: "math", title: "鸽巢问题", grades: [6], summary: "把东西放进抽屉，无论怎么放，总有一个抽屉至少放几个？",
    params: [
      { key: "items", label: "苹果", min: 3, max: 20, default: 7, unit: "个" },
      { key: "boxes", label: "抽屉", min: 2, max: 9, default: 3, unit: "个" },
    ] },
  scale: { id: "scale", subject: "math", title: "比例尺", grades: [6], summary: "改变比例尺和图上距离，看实际距离怎样变化。",
    params: [
      { key: "s", label: "比例尺", min: 0, max: 3, default: 2, options: ["1∶1000", "1∶10000", "1∶100000", "1∶1000000"] },
      { key: "cm", label: "图上距离", min: 1, max: 20, default: 5, unit: "厘米" },
    ] },
  "make-ten": { id: "make-ten", subject: "math", title: "凑十法：20 以内进位加法", grades: [1], summary: "把小的数分一分，先凑满 10，再加剩下的。",
    params: [
      { key: "a", label: "第一个加数", min: 5, max: 9, default: 9 },
      { key: "b", label: "第二个加数", min: 2, max: 9, default: 4 },
    ] },
  "bar-chart": { id: "bar-chart", subject: "math", title: "条形统计图：最喜欢的水果", grades: [4], summary: "调整每种水果的票数，看条形怎样变化；读出最多、最少、相差多少。",
    params: [
      { key: "c0", label: "苹果", min: 0, max: 12, default: 8, unit: "票" },
      { key: "c1", label: "香蕉", min: 0, max: 12, default: 5, unit: "票" },
      { key: "c2", label: "橙子", min: 0, max: 12, default: 10, unit: "票" },
      { key: "c3", label: "葡萄", min: 0, max: 12, default: 3, unit: "票" },
      { key: "unit", label: "每格表示", min: 0, max: 1, default: 0, options: ["1 票", "2 票"] },
    ] },
  "poly-area": { id: "poly-area", subject: "math", title: "多边形的面积：剪一剪、拼一拼", grades: [5], summary: "把平行四边形剪拼成长方形，两个一样的三角形或梯形拼成平行四边形，推出面积公式。",
    params: [
      { key: "shape", label: "图形", min: 0, max: 2, default: 0, options: ["平行四边形", "三角形", "梯形"] },
      { key: "a", label: "底（下底）", min: 2, max: 12, default: 8, unit: "厘米" },
      { key: "b", label: "上底（梯形）", min: 1, max: 10, default: 4, unit: "厘米" },
      { key: "h", label: "高", min: 2, max: 7, default: 5, unit: "厘米" },
    ] },
  "decimal-div": { id: "decimal-div", subject: "math", title: "小数除法：除数是小数怎么办", grades: [5], summary: "除数是整数时，商的小数点和被除数的小数点对齐；除数是小数时，先把除数变成整数，被除数跟着扩大同样的倍数，商不变。",
    params: [
      { key: "a", label: "被除数", min: 1, max: 999, scale: 10, default: 72 },
      { key: "b", label: "除数", min: 1, max: 99, scale: 10, default: 4 },
    ] },
  "fraction-mul": { id: "fraction-mul", subject: "math", title: "分数乘法：求一个数的几分之几", grades: [6], summary: "分数乘整数就是求几个相同分数的和；分数乘分数，在长方形里先取几分之几，再取它的几分之几。",
    params: [
      { key: "mode", label: "算式", min: 0, max: 1, default: 1, options: ["分数 × 整数", "分数 × 分数"] },
      { key: "n1", label: "第一个分数的分子", min: 1, max: 8, default: 3 },
      { key: "d1", label: "第一个分数的分母", min: 2, max: 9, default: 4 },
      { key: "k", label: "整数", min: 2, max: 9, default: 3 },
      { key: "n2", label: "第二个分数的分子", min: 1, max: 8, default: 2 },
      { key: "d2", label: "第二个分数的分母", min: 2, max: 9, default: 3 },
    ] },
  water: { id: "water", subject: "science", title: "水的三态变化", grades: [3, 4], summary: "改变温度，看水什么时候结冰、什么时候沸腾。",
    params: [{ key: "t", label: "温度", min: -20, max: 120, default: 25, unit: "℃" }],
    experiment: { goal: "观察水在不同温度下的状态变化。", tools: ["烧杯", "冰块", "温度计", "酒精灯或电热水壶（老师操作）"], steps: ["把冰块放进烧杯，用温度计测温度。", "让冰块慢慢融化，观察温度。", "在老师帮助下加热到沸腾，观察水蒸气。"], observe: "冰在 0 ℃ 左右融化成水；水加热到约 100 ℃ 沸腾，变成水蒸气。", explain: "水有固态（冰）、液态（水）和气态（水蒸气）三种状态，温度变化会让它们互相转化。", safety: "加热和沸水实验必须由老师或家长操作，小心烫伤；不要用手摸刚加热过的器材。", think: "冬天窗户上的冰花和夏天冰饮料瓶外的水珠，分别是怎么来的？", virtualNote: "模拟按一个标准大气压设定：0 ℃ 结冰、100 ℃ 沸腾。真实情况下，水在低于 100 ℃ 时也会慢慢蒸发；高原上水的沸点会低一些。" } },
  magnet: { id: "magnet", subject: "science", title: "磁铁能吸住什么", grades: [1, 2], summary: "把磁铁靠近不同物品，看哪些会被吸住。",
    params: [
      { key: "dist", label: "磁铁离物品的距离", min: 1, max: 10, default: 6, unit: "厘米" },
      { key: "power", label: "磁铁大小", min: 1, max: 3, default: 2, options: ["小磁铁", "中磁铁", "大磁铁"] },
    ],
    experiment: { goal: "找出哪些物品能被磁铁吸引。", tools: ["条形磁铁", "回形针", "铁钉", "橡皮", "木块", "塑料尺", "铝制易拉罐"], steps: ["先猜一猜每样东西会不会被吸住。", "把磁铁慢慢靠近物品。", "记下被吸住的物品。"], observe: "铁做的回形针、铁钉会被吸住；橡皮、木块、塑料尺和铝罐不会。", explain: "磁铁能吸引铁一类的材料，不能吸引木头、塑料、橡胶，也不吸引铝。", safety: "不要把磁铁靠近手机、银行卡；小磁铁不能放进嘴里。", think: "磁铁离得越远，还吸得住吗？", virtualNote: "屏幕里的“吸引距离”只是示意，真实磁铁的力量要动手试一试才知道。" } },
  shadow: { id: "shadow", subject: "science", title: "太阳高度与影子", grades: [3, 4, 5, 6], summary: "改变太阳的高度，看木棍影子的长短和方向。",
    params: [
      { key: "sun", label: "太阳高度角", min: 10, max: 80, default: 45, unit: "°" },
      { key: "h", label: "木棍高度", min: 10, max: 100, default: 50, unit: "厘米" },
    ],
    experiment: { goal: "研究影子长短和太阳高度的关系。", tools: ["一根竖直的木棍", "卷尺", "记录表", "阳光"], steps: ["把木棍竖直插在空地上。", "上午、中午、下午各量一次影子长度。", "记录时间、太阳的位置和影子长度。"], observe: "太阳越高，影子越短；影子总在太阳的对面。", explain: "光沿直线传播，木棍挡住了光，后面就形成影子。太阳高了，被挡住的光落在近处，影子就短。", safety: "不要直接用眼睛看太阳。", think: "一天中什么时候影子最短？", virtualNote: "动画用简化的几何关系计算影子；真实测量会受地面是否平整、木棍是否竖直影响。" } },
  circuit: { id: "circuit", subject: "science", title: "简单电路", grades: [4, 5, 6], summary: "连接电池、开关和小灯泡，比较串联与并联。",
    params: [
      { key: "bulbs", label: "小灯泡个数", min: 1, max: 3, default: 2, unit: "个" },
      { key: "parallel", label: "连接方式", min: 0, max: 1, default: 0, options: ["串联", "并联"] },
      { key: "closed", label: "开关", min: 0, max: 1, default: 1, options: ["断开", "闭合"] },
      { key: "broken", label: "坏掉的灯泡", min: 0, max: 3, default: 0, options: ["没有", "第 1 个", "第 2 个", "第 3 个"] },
    ],
    experiment: { goal: "让小灯泡亮起来，比较串联和并联。", tools: ["1 节电池和电池盒", "开关", "小灯泡和灯座", "导线"], steps: ["用导线把电池、开关、灯泡连成一个闭合的圈。", "闭合开关，观察灯泡。", "增加灯泡，分别试试串联和并联。", "拧下一个灯泡，看其他灯泡还亮不亮。"], observe: "串联时一个灯坏了，其他灯都不亮；并联时互不影响。", explain: "电流要沿着闭合的回路流动。串联只有一条路，并联有几条路。", safety: "只用干电池做实验，绝不能用家里的插座；不要让导线直接连接电池两端（短路）。", think: "家里的电灯是串联还是并联？为什么？", virtualNote: "模拟按理想电池和相同灯泡计算亮度，真实灯泡亮度还会受电池电量影响。" } },
  pendulum: { id: "pendulum", subject: "science", title: "摆的研究", grades: [5, 6], summary: "改变摆长、摆锤质量和摆角，测量摆动快慢。",
    params: [
      { key: "len", label: "摆长", min: 10, max: 100, default: 50, unit: "厘米" },
      { key: "mass", label: "摆锤质量", min: 10, max: 100, default: 50, unit: "克" },
      { key: "amp", label: "摆角", min: 5, max: 15, default: 10, unit: "°" },
    ],
    experiment: { goal: "研究摆动快慢和哪些因素有关。", tools: ["细线", "摆锤（垫圈）", "铁架台", "秒表", "记录表"], steps: ["一次只改变一个条件，其他条件保持不变。", "数 10 次摆动所用的时间。", "每个条件测 3 次，取中间的数。"], observe: "摆长越长，摆得越慢；改变摆锤质量或小摆角，快慢几乎不变。", explain: "在摆角较小时，摆动一次的时间主要由摆长决定。", safety: "摆锤不要甩得太高，注意别碰到同学。", think: "想让摆 1 秒摆一次（单程），摆长大约要多长？", virtualNote: "动画使用小摆角下的理想公式，不考虑空气阻力；真实测量会有误差，所以要多测几次。" } },
  lever: { id: "lever", subject: "science", title: "杠杆的科学", grades: [6], summary: "移动支点两边的距离和钩码，找出什么时候省力、什么时候费力。",
    params: [
      { key: "load", label: "阻力（钩码）", min: 1, max: 6, default: 3, unit: "个" },
      { key: "ld", label: "阻力点到支点", min: 1, max: 6, default: 2, unit: "格" },
      { key: "ed", label: "用力点到支点", min: 1, max: 6, default: 4, unit: "格" },
    ],
    experiment: { goal: "研究杠杆在什么情况下省力、什么情况下费力。", tools: ["杠杆尺和支架", "钩码若干", "记录表"], steps: ["先把杠杆尺调到水平平衡。", "在支点一侧某一格挂上钩码（阻力）。", "在另一侧不同格挂钩码，直到杠杆尺重新平衡。", "记录两边的钩码数和格数，找规律。"], observe: "用力点离支点越远，需要的钩码越少；用力点比阻力点离支点近时，需要更多钩码。", explain: "杠杆平衡时，左边“钩码数 × 格数”等于右边“钩码数 × 格数”。用力点到支点的距离大于阻力点到支点的距离，就省力。", safety: "钩码要挂牢，不要让钩码掉下砸到脚。", think: "剪刀、筷子、开瓶器，哪个是省力杠杆，哪个是费力杠杆？", virtualNote: "模拟忽略杠杆尺本身的重量和摩擦；真实实验要先调平，读数可能有小误差。" } },
  slope: { id: "slope", subject: "science", title: "斜面的作用", grades: [6], summary: "改变斜面的长和高，看沿斜面拉物体需要多大的力。",
    params: [
      { key: "g", label: "物体重", min: 2, max: 10, default: 6, unit: "牛" },
      { key: "h", label: "斜面高", min: 10, max: 50, default: 30, unit: "厘米" },
      { key: "len", label: "斜面长", min: 60, max: 150, default: 90, unit: "厘米" },
    ],
    experiment: { goal: "研究斜面能不能省力，坡度和用力大小有什么关系。", tools: ["木板（做斜面）", "几块书或木块（垫高）", "带钩小车或木块", "测力计", "直尺"], steps: ["用测力计直接提起小车，记下读数。", "用木板搭一个斜面，沿斜面匀速拉小车上去，记下读数。", "高度不变，换长一点的木板（坡度变缓）再测一次。"], observe: "沿斜面拉比直接提起用的力小；高度相同时，斜面越长（坡越缓）越省力。", explain: "斜面把“直接举高”变成“沿着坡慢慢上”，走的路更长，用的力就更小。", safety: "斜面要放稳，小车滑下来时不要用手硬挡。", think: "盘山公路为什么要修得弯弯曲曲？", virtualNote: "模拟按没有摩擦的理想斜面计算，真实测量时读数会比模拟大一些。" } },
  sound: { id: "sound", subject: "science", title: "声音的高低和强弱", grades: [4], summary: "改变拨钢尺的力度和钢尺伸出的长度，听声音的强弱和高低。",
    params: [
      { key: "force", label: "拨动的力", min: 0, max: 4, default: 2, options: ["很轻", "轻", "中等", "重", "很重"] },
      { key: "len", label: "钢尺伸出桌面", min: 5, max: 20, default: 12, unit: "厘米" },
    ],
    experiment: { goal: "研究声音的强弱、高低和什么有关。", tools: ["钢尺", "桌子", "直尺"], steps: ["把钢尺一端压在桌边，另一端伸出桌面。", "长度不变，分别轻拨和重拨，听声音并看振动的幅度。", "力度不变，改变伸出的长度，听声音的高低。"], observe: "用力越大，钢尺振动幅度越大，声音越响；伸出越短，振动越快，声音越高。", explain: "声音是由物体振动产生的。振动幅度大小决定声音强弱，振动快慢决定声音高低。", safety: "压紧钢尺，拨动时不要把脸凑得太近。", think: "吉他上的弦按得越短，声音会怎样变化？", virtualNote: "屏幕上的波形只是示意，真实的声音要动手拨一拨、用耳朵听。" } },
  earth: { id: "earth", subject: "science", title: "昼夜交替与地球自转", grades: [5, 6], summary: "转动地球，看北京什么时候是白天、什么时候是黑夜，太阳在哪个方向。",
    params: [{ key: "hour", label: "北京时间", min: 0, max: 23, default: 8, unit: "时" }],
    experiment: { goal: "用模拟实验理解昼夜交替是怎样产生的。", tools: ["地球仪", "手电筒（代表太阳）", "小贴纸（标出北京）"], steps: ["在暗处用手电筒照着地球仪。", "在北京的位置贴上小贴纸。", "按从西向东（从北极上空看逆时针）的方向慢慢转动地球仪，观察贴纸经过亮面和暗面。"], observe: "被照亮的一半是白天，另一半是黑夜；转动地球仪，白天和黑夜不断交替。", explain: "地球是一个不透明的球体，太阳只能照亮一半；地球自西向东自转，约 24 小时转一圈，就产生了昼夜交替。", safety: "手电筒不要对着眼睛照。", think: "为什么我们看到太阳东升西落？", virtualNote: "模拟按春分、秋分前后简化（约 6 时日出、18 时日落）；真实日出日落时间随季节和地点变化。" } },
  friction: { id: "friction", subject: "science", title: "摩擦力的秘密", grades: [4], summary: "换不同的表面、加钩码，看用测力计拉动木块需要多大的力。",
    params: [
      { key: "surf", label: "接触面", min: 0, max: 2, default: 1, options: ["玻璃", "木板", "毛巾"] },
      { key: "n", label: "木块上加的钩码", min: 0, max: 4, default: 1, unit: "个" },
    ],
    experiment: { goal: "研究摩擦力的大小和什么有关。", tools: ["带钩木块", "测力计", "钩码", "玻璃板、木板、毛巾"], steps: ["把木块放在木板上，用测力计水平匀速拉动，读数。", "表面不变，在木块上加钩码再拉。", "钩码不变，换成玻璃、毛巾表面再拉。", "每次测 3 次，记录读数。"], observe: "表面越粗糙，拉力越大；压在表面上的物体越重，拉力越大。", explain: "匀速拉动时，测力计的读数就等于摩擦力。接触面越粗糙、压得越紧，摩擦力越大。", safety: "拉动时手要稳，不要突然用力把测力计拉坏。", think: "冬天下雪后，为什么要在路面上撒沙子？", virtualNote: "模拟用示意性的摩擦系数（玻璃 0.2、木板 0.4、毛巾 0.7）计算，真实读数和材料、拉法都有关系。" } },
  plant: { id: "plant", subject: "science", title: "绿豆种子发芽和生长", grades: [3, 4], summary: "改变水分和光照，看绿豆种子会不会发芽、豆苗长成什么样。",
    params: [
      { key: "water", label: "水分", min: 0, max: 2, default: 1, options: ["不浇水（干燥）", "湿润（适量）", "泡在水里（太多）"] },
      { key: "light", label: "放在", min: 0, max: 1, default: 1, options: ["暗处", "有光的窗台"] },
      { key: "day", label: "天数", min: 0, max: 14, default: 6, unit: "天" },
    ],
    experiment: { goal: "研究绿豆种子发芽和豆苗生长需要什么条件。", tools: ["绿豆种子", "几个小杯子", "纸巾或棉花", "水", "直尺和记录表"], steps: ["每个杯子放同样多的种子，只改变一个条件（水分或光照）。", "放在温暖的地方，每天同一时间观察。", "用直尺量豆苗高度，记录叶子颜色。"], observe: "干燥的种子不发芽，完全泡在水里的种子也不容易发芽；湿润的种子 2—3 天发芽。暗处的豆苗又细又长、叶子发黄，有光处的豆苗叶子是绿色的。", explain: "种子发芽需要适量的水、充足的空气和适宜的温度；长出叶子以后，豆苗需要阳光才能变绿、制造养料。", safety: "不要吃实验用的种子；实验后洗手。", think: "种子发芽一定需要阳光吗？怎样设计实验来证明？", virtualNote: "豆苗高度是按常见观察结果设定的示意数字，真实生长速度会受温度、种子品质影响。" } },
  ...PLUS_DEMOS,
};

export const DEMO_LIST = Object.values(DEMOS);

export function isDemoId(x: unknown): x is DemoId {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(DEMOS, x);
}

export function defaultParams(id: DemoId): Params {
  return Object.fromEntries(DEMOS[id].params.map((p) => [p.key, p.default]));
}

export function displayParam(spec: ParamSpec, value: number): string {
  if (spec.options) return spec.options[value] ?? String(value);
  const text = spec.scale ? fmtScaled(value, Math.round(Math.log10(spec.scale))) : spec.mul ? String(value * spec.mul) : String(value);
  return spec.unit ? `${text} ${spec.unit}` : text;
}

/** 让互相关联的参数保持合理：减数不大于被减数、涂色份数不超过总份数等。 */
export function normalizeParams(id: DemoId, input: Params): Params {
  const p: Params = { ...defaultParams(id) };
  for (const spec of DEMOS[id].params) {
    const v = input[spec.key];
    if (typeof v === "number" && Number.isFinite(v)) p[spec.key] = Math.min(spec.max, Math.max(spec.min, Math.round(v)));
  }
  if (id === "add-sub" && p.op === 1 && p.b > p.a) p.b = p.a;
  if (id === "fraction" && p.shaded > p.parts) p.shaded = p.parts;
  if (id === "circle" && p.n % 2 === 1) p.n += p.n < 32 ? 1 : -1;
  if (id === "circuit" && p.broken > p.bulbs) p.broken = 0;
  if (id === "rmb") { while (p.pay < 3 && RMB_NOTES[p.pay] < p.price) p.pay += 1; }
  if (id === "pigeonhole" && p.items <= p.boxes) p.items = Math.min(20, p.boxes + 1);
  if (id === "chance" && p.red + p.white === 0) p.red = 1;
  if (id === "poly-area" && p.b >= p.a) p.b = Math.max(1, p.a - 1);
  if (id === "fraction-mul") { if (p.n1 >= p.d1) p.n1 = p.d1 - 1; if (p.n2 >= p.d2) p.n2 = p.d2 - 1; }
  normalizePlus(id, p);
  return p;
}

// ———————————— 计算（所有结果都由参数实时算出） ————————————

export const RMB_NOTES = [5, 10, 20, 50] as const;
