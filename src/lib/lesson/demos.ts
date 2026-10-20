import type { Grade } from "../math/types.ts";
import { bandOf, stepDurationMs, type GradeBand } from "./grade-style.ts";
import type { BoardItem, LessonStep } from "./timeline.ts";
import { fmtScaled, gcd, roundTo } from "./num.ts";

export type Subject = "math" | "science";

export type DemoId =
  | "add-sub" | "group-share" | "fraction" | "perimeter-area" | "angle" | "law"
  | "decimal-mul" | "balance" | "circle" | "cylinder"
  | "shapes" | "rmb" | "ruler" | "clock" | "parallel" | "chance" | "number-line" | "percent" | "pigeonhole" | "scale"
  | "make-ten" | "bar-chart" | "poly-area"
  | "magnet" | "shadow" | "circuit" | "pendulum" | "water"
  | "lever" | "slope" | "sound" | "earth" | "friction" | "plant";

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
  angle: { id: "angle", subject: "math", title: "量角器量角", grades: [4], summary: "拖动角的一条边，用量角器读出度数，判断是什么角。",
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
  clock: { id: "clock", subject: "math", title: "认识时间：几时几分", grades: [2], summary: "拖动分针，看时针怎样跟着慢慢走。",
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
  return p;
}

// ———————————— 计算（所有结果都由参数实时算出） ————————————

export function addSub(p: Params) {
  const result = p.op === 0 ? p.a + p.b : p.a - p.b;
  return { result, expr: `${p.a} ${p.op === 0 ? "+" : "−"} ${p.b} = ${result}` };
}

export function groupShare(p: Params) {
  if (p.mode === 0) return { product: p.groups * p.each, expr: `${p.groups} × ${p.each} = ${p.groups * p.each}`, add: Array(p.groups).fill(p.each).join(" + ") };
  const q = Math.floor(p.total / p.groups), r = p.total % p.groups;
  return { quotient: q, remainder: r, expr: r ? `${p.total} ÷ ${p.groups} = ${q}……${r}` : `${p.total} ÷ ${p.groups} = ${q}` };
}

export function fraction(p: Params) {
  const g = gcd(p.shaded, p.parts) || 1;
  return { text: `${p.shaded}/${p.parts}`, unit: `1/${p.parts}`, simplest: p.shaded === 0 ? "0" : `${p.shaded / g}/${p.parts / g}`, whole: p.shaded === p.parts,
    vsHalf: p.shaded * 2 === p.parts ? "等于" : p.shaded * 2 > p.parts ? "大于" : "小于" };
}

export function perimeterArea(p: Params) {
  return { perimeter: 2 * (p.l + p.w), area: p.l * p.w };
}

export function angleKind(deg: number): string {
  if (deg === 0) return "还没有张开";
  if (deg < 90) return "锐角";
  if (deg === 90) return "直角";
  if (deg < 180) return "钝角";
  return "平角";
}

export function law(p: Params) {
  const left = p.a * (p.b + p.c), ab = p.a * p.b, ac = p.a * p.c;
  return { left, ab, ac, right: ab + ac, equal: left === ab + ac };
}

export function decimalMul(p: Params) {
  // a、b 都是“十分之几”的整数表示
  const int = p.a * p.b; // 积放大了 100 倍
  return { aText: fmtScaled(p.a, 1), bText: fmtScaled(p.b, 1), intProduct: int, product: fmtScaled(int, 2), raw: `${Math.floor(int / 100)}.${String(int % 100).padStart(2, "0")}` };
}

export function balance(p: Params) {
  const c = p.a * p.x + p.b;
  return { c, left: `${p.a === 1 ? "" : p.a}x + ${p.b}`, afterSub: c - p.b, x: (c - p.b) / p.a, eq: `${p.a === 1 ? "" : p.a}x + ${p.b} = ${c}` };
}

/** 圆：π 取 3.14，用整数运算得到精确结果。 */
export function circle(p: Params) {
  return { d: 2 * p.r, perimeter: fmtScaled(628 * p.r, 2), area: fmtScaled(314 * p.r * p.r, 2), halfC: fmtScaled(314 * p.r, 2) };
}

export function cylinder(p: Params) {
  const side = 628 * p.r * p.h; // ×100
  const base = 314 * p.r * p.r; // ×100
  const volume = base * p.h; // ×100
  return { circumference: fmtScaled(628 * p.r, 2), side: fmtScaled(side, 2), base: fmtScaled(base, 2), surface: fmtScaled(side + 2 * base, 2), volume: fmtScaled(volume, 2),
    cone: volume % 3 === 0 ? fmtScaled(volume / 3, 2) : `约 ${roundTo(volume / 300, 2)}`, coneExact: volume % 3 === 0 };
}

export const MAGNET_ITEMS = [
  { name: "回形针", iron: true, emoji: "📎" },
  { name: "铁钉", iron: true, emoji: "🔩" },
  { name: "橡皮", iron: false, emoji: "🧽" },
  { name: "木块", iron: false, emoji: "🪵" },
  { name: "塑料尺", iron: false, emoji: "📏" },
  { name: "铝制易拉罐", iron: false, emoji: "🥫" },
] as const;

export function magnet(p: Params) {
  const reach = p.power * 3; // 示意：小 3 厘米、中 6 厘米、大 9 厘米
  return { reach, items: MAGNET_ITEMS.map((it) => ({ ...it, pulled: it.iron && p.dist <= reach })) };
}

export function shadow(p: Params) {
  const len = p.h / Math.tan((p.sun * Math.PI) / 180);
  return { length: roundTo(len, 1), lengthNum: len, longer: len > p.h };
}

export function circuit(p: Params) {
  const n = p.bulbs;
  const bulbs = Array.from({ length: n }, (_, i) => {
    const broken = p.broken === i + 1;
    let lit: boolean;
    if (!p.closed) lit = false;
    else if (p.parallel) lit = !broken;
    else lit = p.broken === 0;
    // 理想电池、相同灯泡：串联每个灯功率为单灯的 1/n²，并联不变
    const brightness = lit ? (p.parallel ? 1 : 1 / (n * n)) : 0;
    return { broken, lit, brightness };
  });
  return { bulbs, anyLit: bulbs.some((b) => b.lit) };
}

/** 单摆：T = 2π√(L/g)，g 取 9.8 m/s²。返回往返一次的周期（秒）。 */
export function pendulum(p: Params) {
  const T = 2 * Math.PI * Math.sqrt(p.len / 100 / 9.8);
  return { period: roundTo(T, 2), ten: roundTo(T * 10, 1), periodNum: T };
}


// ———————— 新增演示的计算 ————————

export const SHAPES = {
  0: [
    { name: "三角形", trait: "3 条边，3 个角" },
    { name: "正方形", trait: "4 条边一样长，4 个直角" },
    { name: "长方形", trait: "对边一样长，4 个直角" },
    { name: "圆", trait: "没有角，边是弯弯的" },
  ],
  1: [
    { name: "长方体", trait: "6 个面，相对的面一样大" },
    { name: "正方体", trait: "6 个面都是一样大的正方形" },
    { name: "圆柱", trait: "上下两个面是一样大的圆，放倒能滚动" },
    { name: "球", trait: "圆圆的，能向各个方向滚动" },
  ],
} as const;

export const RMB_NOTES = [5, 10, 20, 50] as const;

/** 找零：用 10 元、5 元、1 元凑出找回的钱（尽量用面额大的）。 */
export function rmb(p: Params) {
  const pay = RMB_NOTES[p.pay] ?? 10;
  const change = pay - p.price;
  const parts: { note: number; count: number }[] = [];
  let left = change;
  for (const note of [20, 10, 5, 1]) { const c = Math.floor(left / note); if (c) { parts.push({ note, count: c }); left -= c * note; } }
  return { pay, change, parts, text: parts.map((x) => `${x.count} 张 ${x.note} 元`).join("、") || "不用找钱" };
}

export function ruler(p: Params) {
  return { end: p.start + p.len, length: p.len };
}

export function clock(p: Params) {
  const hourAngle = ((p.h % 12) + p.m / 60) * 30;
  const minuteAngle = p.m * 6;
  return { hourAngle, minuteAngle, text: `${p.h} 时${p.m === 0 ? "整" : ` ${p.m} 分`}`, digital: `${p.h}:${String(p.m).padStart(2, "0")}`, minuteNumber: p.m / 5 };
}

export function lineRelation(deg: number): "平行" | "互相垂直" | "相交" {
  if (deg === 0 || deg === 180) return "平行";
  if (deg === 90) return "互相垂直";
  return "相交";
}

export function chanceWord(red: number, white: number): { red: string; white: string; more: string } {
  const w = (n: number, total: number) => (n === 0 ? "不可能" : n === total ? "一定" : "可能");
  const total = red + white;
  return { red: w(red, total), white: w(white, total), more: red === white ? "一样大" : red > white ? "红球的可能性大" : "白球的可能性大" };
}

export function numberLine(p: Params) {
  const cmp = p.a === p.b ? "=" : p.a > p.b ? ">" : "<";
  return { cmp, text: `${fmtSigned(p.a)} ${cmp} ${fmtSigned(p.b)}` };
}

export function fmtSigned(n: number): string { return n < 0 ? `−${-n}` : String(n); }

export function percent(p: Params) {
  const price = p.price * 10; // 元
  const sale = price * p.zhe / 10; // 整数元
  return { price, sale, saved: price - sale, pct: p.zhe * 10 };
}

export function pigeonhole(p: Params) {
  const q = Math.floor(p.items / p.boxes), r = p.items % p.boxes;
  return { q, r, atLeast: r ? q + 1 : q };
}

export const SCALE_DENOMS = [1000, 10000, 100000, 1000000] as const;

export function scale(p: Params) {
  const denom = SCALE_DENOMS[p.s] ?? 100000;
  const realCm = p.cm * denom;
  const m = realCm / 100;
  return { denom, realCm, m, text: m >= 1000 ? `${m / 1000} 千米` : `${m} 米` };
}

export function water(p: Params): { state: "冰" | "冰水混合" | "水" | "沸腾" | "水蒸气"; phase: string } {
  if (p.t < 0) return { state: "冰", phase: "固态" };
  if (p.t === 0) return { state: "冰水混合", phase: "固态和液态" };
  if (p.t < 100) return { state: "水", phase: "液态" };
  if (p.t === 100) return { state: "沸腾", phase: "液态正在变成气态" };
  return { state: "水蒸气", phase: "气态" };
}

// ———————— v0.9 科学实验的计算 ————————

/** 杠杆：平衡时 阻力 × 阻力臂 = 动力 × 动力臂（忽略杠杆自重）。 */
export function lever(p: Params) {
  const effortNum = (p.load * p.ld) / p.ed;
  const exact = (p.load * p.ld) % p.ed === 0;
  const effort = exact ? String(effortNum) : roundTo(effortNum, 1);
  const kind = p.ed > p.ld ? "省力" : p.ed < p.ld ? "费力" : "不省力也不费力";
  return { effortNum, effort, exact, kind, left: p.load * p.ld };
}

/** 理想斜面（不计摩擦）：拉力 = 物重 × 高 ÷ 长。 */
export function slope(p: Params) {
  const forceNum = (p.g * p.h) / p.len;
  return { forceNum, force: roundTo(forceNum, 1), saved: roundTo(p.g - forceNum, 1), angle: Math.round((Math.asin(Math.min(1, p.h / p.len)) * 180) / Math.PI) };
}

/** 钢尺发声：力度决定振幅（响度），伸出长度决定振动快慢（音高）。频率与长度平方成反比，这里只给相对快慢。 */
export function sound(p: Params) {
  const loud = ["很轻", "轻", "中等", "响", "很响"][p.force] ?? "中等";
  const pitch = p.len <= 8 ? "高" : p.len <= 14 ? "中" : "低";
  const rate = 100 / (p.len * p.len);
  return { loud, pitch, rate, amp: 6 + p.force * 9, cycles: Math.max(2, Math.min(14, Math.round(180 / p.len / 1.5))) };
}

/** 昼夜：按春分、秋分简化，北京约 6 时日出、18 时日落；北半球正午太阳在南方。 */
export function earth(p: Params) {
  const h = ((p.hour % 24) + 24) % 24;
  const day = h >= 6 && h < 18;
  const dir = !day ? "看不到太阳" : h < 10 ? "东方（偏东南）" : h <= 14 ? "南方" : "西方（偏西南）";
  const part = h < 5 ? "深夜" : h < 6 ? "黎明前" : h < 8 ? "早晨" : h < 11 ? "上午" : h < 13 ? "中午" : h < 17 ? "下午" : h < 18 ? "傍晚" : h < 22 ? "晚上" : "深夜";
  return { day, dir, part, angle: 180 + (h - 12) * 15 };
}

export const SURFACES = [{ name: "玻璃", mu: 2 }, { name: "木板", mu: 4 }, { name: "毛巾", mu: 7 }] as const;

/** 摩擦力（示意）：木块重 1 牛，每个钩码 1 牛；摩擦力 = 摩擦系数 × 压力，用“十分之一牛”整数计算。 */
export function friction(p: Params) {
  const s = SURFACES[p.surf] ?? SURFACES[1];
  const weight = 1 + p.n;
  const tenths = s.mu * weight;
  return { surface: s.name, weight, tenths, force: fmtScaled(tenths, 1) };
}

/** 绿豆发芽与生长（示意）：适量水分 2 天发芽；干燥缺水、泡水缺空气都不发芽；暗处细长发黄。 */

export const FRUITS = ["苹果", "香蕉", "橙子", "葡萄"] as const;

/** 凑十法：a + b，把 b 分成 (10 − a) 和剩下的数。 */
export function makeTen(p: Params) {
  const sum = p.a + p.b;
  const carry = sum > 10;
  const need = 10 - p.a;
  const rest = p.b - need;
  return { sum, carry, need, rest, expr: `${p.a} + ${p.b} = ${sum}`, split: carry ? `${p.b} 分成 ${need} 和 ${rest}` : "" };
}

/** 条形统计图：读最多、最少、合计和相差。 */
export function barChart(p: Params) {
  const counts = [p.c0, p.c1, p.c2, p.c3];
  const per = p.unit === 1 ? 2 : 1;
  const max = Math.max(...counts), min = Math.min(...counts);
  const total = counts.reduce((a, b) => a + b, 0);
  const names = (v: number) => FRUITS.filter((_, i) => counts[i] === v).join("、");
  return { counts, per, max, min, total, diff: max - min, maxName: names(max), minName: names(min), cells: counts.map((c) => c / per), tie: counts.filter((c) => c === max).length > 1 };
}

/** 多边形面积（单位：平方厘米）。面积 ×2 一定是整数，用 fmtScaled 精确显示 .5。 */
export function polyArea(p: Params) {
  const twice = p.shape === 0 ? 2 * p.a * p.h : p.shape === 1 ? p.a * p.h : (p.a + p.b) * p.h;
  const area = fmtScaled(twice * 5, 1);
  const name = (["平行四边形", "三角形", "梯形"] as const)[p.shape];
  const formula = p.shape === 0 ? "底 × 高" : p.shape === 1 ? "底 × 高 ÷ 2" : "(上底 + 下底) × 高 ÷ 2";
  const calc = p.shape === 0 ? `${p.a} × ${p.h} = ${area}` : p.shape === 1 ? `${p.a} × ${p.h} ÷ 2 = ${area}` : `(${p.b} + ${p.a}) × ${p.h} ÷ 2 = ${area}`;
  return { twice, area, name, formula, calc };
}

export function plant(p: Params) {
  const sprout = p.water === 1;
  const grownDays = sprout ? Math.max(0, p.day - 2) : 0;
  const mm = sprout ? Math.min(p.light ? 120 : 200, grownDays * (p.light ? 9 : 14)) : 0;
  const leaf = !sprout || grownDays < 2 ? "还没有叶子" : p.light ? "绿色" : "发黄";
  const status = p.water === 0 ? "种子太干，没有发芽" : p.water === 2 ? "种子泡在水里缺少空气，没有发芽" : p.day < 2 ? "种子吸水膨胀，还没发芽" : p.day === 2 ? "种子刚刚发芽" : p.light ? "豆苗长得壮，叶子绿" : "豆苗又细又长，叶子发黄";
  return { sprout: sprout && p.day >= 2, mm, height: fmtScaled(mm, 1), leaf, status, reason: p.water === 0 ? "缺水" : p.water === 2 ? "缺空气" : "" };
}

// ———————————— 讲解脚本：按学段生成 ————————————

let seq = 0;
const T = (text: string, tone?: "title" | "note" | "result" | "warn"): BoardItem => ({ kind: "text", id: `t${seq++}`, text, tone });

type Draft = { say: string; board?: BoardItem[]; highlight?: string[]; scene?: Params };

function steps(grade: Grade, drafts: Draft[]): LessonStep[] {
  return drafts.map((d, i) => ({ id: `s${i}`, say: d.say, board: d.board ?? [], highlight: d.highlight, scene: d.scene, durationMs: stepDurationMs(d.say, grade) }));
}

/**
 * 生成一节演示课的分步讲解。
 * variant 0：标准讲法；1：换一种方法讲；2：生活例子。
 */
export function lessonScript(id: DemoId, raw: Params, grade: Grade, variant = 0): LessonStep[] {
  seq = 0;
  const p = normalizeParams(id, raw);
  const band: GradeBand = bandOf(grade);
  const v = Math.max(0, Math.min(2, variant));
  switch (id) {
    case "add-sub": {
      const r = addSub(p);
      const f = { kind: "formula" as const, id: "f", text: r.expr } as BoardItem;
      if (p.op === 0) return steps(grade, v === 2 ? [
        { say: `小明有 ${p.a} 颗糖。`, board: [T(`小明：${p.a} 颗`)], scene: { reveal: 1 } },
        { say: `妈妈又给他 ${p.b} 颗。`, board: [T(`妈妈给：${p.b} 颗`)], scene: { reveal: 2 } },
        { say: "现在一共几颗？合起来数一数。", scene: { reveal: 3 } },
        { say: `一共 ${r.result} 颗。`, board: [f], highlight: ["f"] },
      ] : v === 1 ? [
        { say: `先记住大一点的数 ${Math.max(p.a, p.b)}。`, board: [T(`先想 ${Math.max(p.a, p.b)}`)], scene: { reveal: 1 } },
        { say: `再往后数 ${Math.min(p.a, p.b)} 个。`, board: [T(`往后数 ${Math.min(p.a, p.b)} 个`)], scene: { reveal: 2 } },
        { say: `数到了 ${r.result}。`, board: [f], highlight: ["f"], scene: { reveal: 3 } },
      ] : [
        { say: `左边盘子有 ${p.a} 个苹果。`, board: [T(`左边 ${p.a} 个`)], scene: { reveal: 1 } },
        { say: `右边盘子有 ${p.b} 个苹果。`, board: [T(`右边 ${p.b} 个`)], scene: { reveal: 2 } },
        { say: "把它们放在一起。", scene: { reveal: 3 } },
        { say: `一个一个数，一共 ${r.result} 个。`, board: [f], highlight: ["f"] },
        { say: "合起来，用加法。", board: [T("合起来 → 加法", "result")] },
      ]);
      return steps(grade, v === 2 ? [
        { say: `你有 ${p.a} 元钱。`, board: [T(`有 ${p.a} 元`)], scene: { reveal: 1 } },
        { say: `买橡皮花了 ${p.b} 元。`, board: [T(`花了 ${p.b} 元`)], scene: { reveal: 2 } },
        { say: `还剩 ${r.result} 元。`, board: [f], highlight: ["f"], scene: { reveal: 3 } },
      ] : v === 1 ? [
        { say: `想一想：${p.b} 加几等于 ${p.a}？`, board: [T(`${p.b} + ? = ${p.a}`)], scene: { reveal: 1 } },
        { say: `${p.b} 加 ${r.result} 等于 ${p.a}。`, scene: { reveal: 2 } },
        { say: `所以 ${p.a} 减 ${p.b} 等于 ${r.result}。`, board: [f], highlight: ["f"], scene: { reveal: 3 } },
      ] : [
        { say: `篮子里有 ${p.a} 个苹果。`, board: [T(`原来 ${p.a} 个`)], scene: { reveal: 1 } },
        { say: `拿走 ${p.b} 个。`, board: [T(`拿走 ${p.b} 个`)], scene: { reveal: 2 } },
        { say: `数一数，还剩 ${r.result} 个。`, board: [f], highlight: ["f"], scene: { reveal: 3 } },
        { say: "拿走以后还剩几个，用减法。", board: [T("拿走 → 减法", "result")] },
      ]);
    }
    case "group-share": {
      const r = groupShare(p) as ReturnType<typeof groupShare> & Record<string, unknown>;
      if (p.mode === 0) return steps(grade, v === 1 ? [
        { say: `每组 ${p.each} 个，一共 ${p.groups} 组。`, board: [T(`${p.groups} 个 ${p.each}`)], scene: { reveal: 1 } },
        { say: `用加法：${r.add}。`, board: [{ kind: "formula" as const, id: "add", text: `${r.add} = ${r.product}` }], scene: { reveal: 2 } },
        { say: "相同的数连加，可以写成乘法。", board: [{ kind: "formula" as const, id: "f", text: r.expr }], highlight: ["f"], scene: { reveal: 3 } },
      ] : [
        { say: `每盘放 ${p.each} 个草莓。`, board: [T(`每盘 ${p.each} 个`)], scene: { reveal: 1 } },
        { say: `一共有 ${p.groups} 盘。`, board: [T(`${p.groups} 盘`)], scene: { reveal: 2 } },
        { say: `${p.groups} 个 ${p.each} 相加，就是 ${p.groups} 乘 ${p.each}。`, board: [{ kind: "formula" as const, id: "f", text: r.expr }], highlight: ["f"], scene: { reveal: 3 } },
        { say: v === 2 ? `就像 ${p.groups} 个同学，每人带 ${p.each} 本书，一共 ${r.product} 本。` : `一共 ${r.product} 个。`, board: [T(`一共 ${r.product} 个`, "result")] },
      ]);
      const q = r.quotient as number, rem = r.remainder as number;
      return steps(grade, [
        { say: `一共有 ${p.total} 块饼干。`, board: [T(`一共 ${p.total} 块`)], scene: { reveal: 1 } },
        { say: `平均分给 ${p.groups} 个小朋友。`, board: [T(`平均分给 ${p.groups} 人`)], scene: { reveal: 2 } },
        { say: v === 1 ? `想乘法口诀：${p.groups} 乘几最接近 ${p.total}？` : "一人一块，轮流分，分到不够分为止。", scene: { reveal: 3 } },
        { say: rem ? `每人 ${q} 块，还剩 ${rem} 块。` : `每人正好 ${q} 块。`, board: [{ kind: "formula" as const, id: "f", text: r.expr }], highlight: ["f"] },
        ...(rem ? [{ say: `剩下的 ${rem} 块比 ${p.groups} 少，不够再分。`, board: [T("余数要比除数小", "note")] }] : []),
      ]);
    }
    case "fraction": {
      const r = fraction(p);
      return steps(grade, [
        { say: "这是一个整体。", board: [T("一个整体 = 1")], scene: { reveal: 1 } },
        { say: `把它平均分成 ${p.parts} 份。`, board: [T(`平均分成 ${p.parts} 份`)], scene: { reveal: 2 } },
        { say: `每一份是它的 ${p.parts} 分之一。`, board: [{ kind: "formula" as const, id: "u", text: `每份 = ${r.unit}` }], highlight: ["u"], scene: { reveal: 3 } },
        { say: `涂色的有 ${p.shaded} 份，就是 ${p.parts} 分之 ${p.shaded}。`, board: [{ kind: "formula" as const, id: "f", text: `涂色 = ${r.text}` }], highlight: ["f"], scene: { reveal: 4 } },
        v === 1
          ? { say: `分母 ${p.parts} 表示平均分的份数，分子 ${p.shaded} 表示取的份数。`, board: [T("分母：平均分几份；分子：取几份", "note")] }
          : v === 2
            ? { say: `一个比萨平均切成 ${p.parts} 块，吃了 ${p.shaded} 块，吃了 ${r.text}。`, board: [T(`比萨：${r.text}`)] }
            : { say: r.whole ? "全部涂满，就是整个 1。" : `${r.text} ${r.vsHalf} 一半。`, board: [T(r.whole ? `${r.text} = 1` : `${r.text} ${r.vsHalf} 1/2`, "result")] },
        ...(band !== "low" ? [{ say: "份数越多，每一份就越小。", board: [T("平均分的份数越多，每份越小", "note")] }] : []),
      ]);
    }
    case "perimeter-area": {
      const r = perimeterArea(p);
      return steps(grade, [
        { say: `长方形长 ${p.l} 厘米，宽 ${p.w} 厘米。`, board: [T(`长 ${p.l} 厘米，宽 ${p.w} 厘米`)], scene: { reveal: 1 } },
        { say: "沿着边走一圈，走过的长度就是周长。", scene: { reveal: 2 } },
        v === 1
          ? { say: `四条边加起来：${p.l}+${p.w}+${p.l}+${p.w}。`, board: [{ kind: "formula" as const, id: "c", text: `${p.l}+${p.w}+${p.l}+${p.w} = ${r.perimeter}（厘米）` }], highlight: ["c"] }
          : { say: `一条长加一条宽，再乘 2。`, board: [{ kind: "formula" as const, id: "c", text: `(${p.l}+${p.w})×2 = ${r.perimeter}（厘米）` }], highlight: ["c"] },
        { say: "再用 1 平方厘米的小方格把它铺满。", scene: { reveal: 3 } },
        { say: `每行 ${p.l} 个，有 ${p.w} 行，一共 ${r.area} 个方格。`, board: [{ kind: "formula" as const, id: "s", text: `${p.l}×${p.w} = ${r.area}（平方厘米）` }], highlight: ["s"] },
        { say: "周长量的是一圈有多长，面积量的是占了多大地方。", board: [T("周长：厘米；面积：平方厘米", "note")] },
      ]);
    }
    case "angle": {
      const k = angleKind(p.deg);
      return steps(grade, [
        { say: "角有一个顶点和两条边。", board: [T("角 = 顶点 + 两条边")], scene: { reveal: 1 } },
        { say: "量角器的中心对准角的顶点。", board: [T("① 中心对顶点")], scene: { reveal: 2 } },
        { say: "零刻度线和角的一条边重合。", board: [T("② 0° 线对一条边")], scene: { reveal: 3 } },
        { say: `另一条边对着 ${p.deg} 度，这个角是 ${p.deg} 度。`, board: [{ kind: "formula" as const, id: "f", text: `∠ = ${p.deg}°` }], highlight: ["f"], scene: { reveal: 4 } },
        { say: v === 1 ? "读数时看从 0 度开始的那一圈刻度，不要看反了。" : `${p.deg} 度是${k}。`, board: [T(v === 1 ? "从 0° 开始的那圈读" : `${p.deg}° 是${k}`, "result")] },
        { say: "锐角小于 90 度，直角等于 90 度，钝角在 90 度和 180 度之间。", board: [T("锐角 < 90° = 直角 < 钝角 < 180°", "note")] },
      ]);
    }
    case "law": {
      const r = law(p);
      return steps(grade, [
        { say: `一个长方形宽 ${p.a}，长是 ${p.b} 加 ${p.c}。`, board: [T(`宽 ${p.a}，长 ${p.b}+${p.c}`)], scene: { reveal: 1 } },
        { say: "整体算：宽乘长。", board: [{ kind: "formula" as const, id: "l", text: `${p.a}×(${p.b}+${p.c}) = ${p.a}×${p.b + p.c} = ${r.left}` }], highlight: ["l"], scene: { reveal: 2 } },
        { say: "把它切成两块，分别算再相加。", board: [{ kind: "formula" as const, id: "r", text: `${p.a}×${p.b} + ${p.a}×${p.c} = ${r.ab}+${r.ac} = ${r.right}` }], highlight: ["r"], scene: { reveal: 3 } },
        { say: "面积是同一个长方形，所以两边相等。", board: [{ kind: "formula" as const, id: "eq", text: `${p.a}×(${p.b}+${p.c}) = ${p.a}×${p.b} + ${p.a}×${p.c}` }], highlight: ["eq"] },
        { say: v === 2 ? `买 ${p.a} 件上衣和 ${p.a} 条裤子，可以先算一套的价钱再乘 ${p.a}。` : "这叫乘法分配律：(a+b)×c = a×c + b×c。", board: [T("乘法分配律", "result")] },
      ]);
    }
    case "decimal-mul": {
      const r = decimalMul(p);
      const intA = p.a, intB = p.b;
      return steps(grade, [
        { say: `计算 ${r.aText} 乘 ${r.bText}。`, board: [T(`${r.aText} × ${r.bText} = ?`, "title")], scene: { reveal: 1 } },
        { say: `先把 ${r.aText} 看成 ${intA}，${r.bText} 看成 ${intB}，都扩大到原来的 10 倍。`, board: [T(`${r.aText} → ${intA}（×10）`), T(`${r.bText} → ${intB}（×10）`)], scene: { reveal: 2 } },
        { say: `按整数乘：${intA} 乘 ${intB} 等于 ${r.intProduct}。`, board: [{ kind: "column" as const, id: "col", lines: [String(intA), `× ${intB}`, "────", String(r.intProduct)] }], highlight: ["col"], scene: { reveal: 3 } },
        { say: v === 1 ? "两个因数一共扩大了 100 倍，积就要缩小到原来的 100 分之一。" : "两个因数一共有两位小数，就从积的右边数出两位，点上小数点。", board: [T(v === 1 ? `${r.intProduct} ÷ 100` : "因数共 2 位小数 → 积 2 位小数", "note")], scene: { reveal: 4 } },
        { say: r.raw !== r.product ? `得到 ${r.raw}，末尾的 0 可以去掉，写成 ${r.product}。` : `得到 ${r.product}。`, board: [{ kind: "formula" as const, id: "f", text: `${r.aText} × ${r.bText} = ${r.product}` }], highlight: ["f"] },
      ]);
    }
    case "balance": {
      const r = balance(p);
      const ax = p.a === 1 ? "x" : `${p.a}x`;
      return steps(grade, [
        { say: `左边放 ${p.a} 个同样重的 x 和 ${p.b} 克砝码，右边放 ${r.c} 克，天平平衡。`, board: [{ kind: "formula" as const, id: "e0", text: r.eq }], scene: { reveal: 1 } },
        { say: v === 1 ? `x 是一个字母，可以表示一个数。这里每个 x 重 ${p.x} 克。` : `把 x = ${p.x} 代入：左边一共 ${p.a}×${p.x}+${p.b} = ${r.c} 克，和右边一样重。`, board: [{ kind: "formula" as const, id: "e1", text: `${p.a === 1 ? "" : `${p.a}×`}${p.x} + ${p.b} = ${r.c}` }], highlight: ["e1"], scene: { reveal: 2 } },
        { say: `两边同时拿走 ${p.b} 克，天平仍然平衡。`, board: [{ kind: "formula" as const, id: "e2", text: `${ax} + ${p.b} − ${p.b} = ${r.c} − ${p.b}` }], highlight: ["e2"], scene: { reveal: 3 } },
        { say: "等式两边同时加上或减去同一个数，等式仍然成立。这就是等式的性质。", board: [T("等式两边同时 + 或 − 同一个数，仍然相等", "result")], scene: { reveal: 4 } },
        { say: v === 2 ? `买 ${p.a} 本一样的本子，每本 x 元，再买 ${p.b} 元的笔，一共 ${ax}+${p.b} 元。` : "用这个性质一步步求出 x，叫解方程，到初中会系统学习。", board: [T(v === 2 ? `一共 ${ax}+${p.b} 元` : "解方程：初中学习（课外拓展）", "note")] },
      ]);
    }
    case "circle": {
      const r = circle(p);
      return steps(grade, [
        { say: `圆的半径是 ${p.r} 厘米，直径是 ${r.d} 厘米。`, board: [T(`r = ${p.r} 厘米，d = ${r.d} 厘米`)], scene: { reveal: 1, cut: 0 } },
        { say: "周长约是直径的 3.14 倍。", board: [{ kind: "formula" as const, id: "c", text: `C = 2πr ≈ 2×3.14×${p.r} = ${r.perimeter}（厘米）` }], highlight: ["c"], scene: { reveal: 2 } },
        { say: `把圆平均切成 ${p.n} 份，拼起来。`, scene: { reveal: 3, cut: 1 } },
        { say: v === 1 ? "切得越细，拼成的图形越接近长方形。" : "拼成的图形接近长方形：长是周长的一半，宽是半径。", board: [T(`长 ≈ πr = ${r.halfC}，宽 = r = ${p.r}`)], scene: { reveal: 4, cut: 1 } },
        { say: "长方形面积等于长乘宽，所以圆面积等于 π 乘 r 的平方。", board: [{ kind: "formula" as const, id: "s", text: `S = πr² ≈ 3.14×${p.r}² = ${r.area}（平方厘米）` }], highlight: ["s"] },
        { say: v === 2 ? `给半径 ${p.r} 米的圆形花坛围栏杆要 ${r.perimeter} 米，铺草坪要 ${r.area} 平方米。` : "注意：周长用 2πr，面积用 πr²，单位不一样。", board: [T(v === 2 ? "围一圈 → 周长；铺满 → 面积" : "周长：厘米；面积：平方厘米", "note")] },
      ]);
    }
    case "cylinder": {
      const r = cylinder(p);
      return steps(grade, [
        { say: `圆柱底面半径 ${p.r} 厘米，高 ${p.h} 厘米。`, board: [T(`r = ${p.r}，h = ${p.h}`)], scene: { open: 0 } },
        { say: "沿着高把侧面剪开、展开。", scene: { open: 5 } },
        { say: "展开后是一个长方形：长是底面周长，宽是圆柱的高。", board: [T(`长 = 2πr ≈ ${r.circumference}，宽 = ${p.h}`)], scene: { open: 10 } },
        { say: "侧面积等于底面周长乘高。", board: [{ kind: "formula" as const, id: "side", text: `S侧 = 2πrh ≈ ${r.side}（平方厘米）` }], highlight: ["side"] },
        { say: "体积等于底面积乘高。", board: [{ kind: "formula" as const, id: "v", text: `V = πr²h ≈ ${r.base}×${p.h} = ${r.volume}（立方厘米）` }], highlight: ["v"] },
        { say: "等底等高的圆锥，体积是圆柱的三分之一。", board: [{ kind: "formula" as const, id: "cone", text: `V锥 = ⅓πr²h ${r.coneExact ? "≈ " : ""}${r.cone}（立方厘米）` }], highlight: ["cone"] },
      ]);
    }
    case "shapes": {
      const list = SHAPES[(p.kind === 1 ? 1 : 0) as 0 | 1];
      return steps(grade, [
        { say: p.kind ? "这些是立体图形，能拿在手里摸一摸。" : "这些是平面图形，是物体的一个面。", board: [T(p.kind ? "立体图形" : "平面图形", "title")], scene: { reveal: 1 } },
        ...list.map((x, i) => ({ say: `${x.name}：${x.trait}。`, board: [T(`${x.name}：${x.trait}`)], scene: { reveal: i + 2 } })),
        { say: v === 2 ? (p.kind ? "魔方像正方体，罐头像圆柱，皮球是球。" : "红领巾像三角形，钟面像圆，黑板像长方形。") : "把它们拖进对应的格子里试一试。", board: [T("分一分：形状一样的放一起", "note")] },
      ]);
    }
    case "rmb": {
      const r = rmb(p);
      return steps(grade, [
        { say: `一个玩具 ${p.price} 元。`, board: [T(`价格：${p.price} 元`)], scene: { reveal: 1 } },
        { say: `付了一张 ${r.pay} 元。`, board: [T(`付：${r.pay} 元`)], scene: { reveal: 2 } },
        { say: v === 1 ? `想：${p.price} 加几等于 ${r.pay}？` : `找回的钱：${r.pay} 减 ${p.price}。`, board: [{ kind: "formula" as const, id: "f", text: `${r.pay} − ${p.price} = ${r.change}（元）` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: r.change ? `可以找回 ${r.text}。` : "正好付清，不用找钱。", board: [T(r.change ? `找回：${r.text}` : "不用找钱", "result")], scene: { reveal: 4 } },
        { say: "记住：1 元 = 10 角，1 角 = 10 分。", board: [T("1 元 = 10 角", "note")] },
      ]);
    }
    case "ruler": {
      const r = ruler(p);
      return steps(grade, [
        { say: "量长度时，先看铅笔的左端对着几。", board: [T(`左端对着 ${p.start}`)], scene: { reveal: 1 } },
        { say: `右端对着 ${r.end}。`, board: [T(`右端对着 ${r.end}`)], scene: { reveal: 2 } },
        p.start === 0
          ? { say: `左端对准 0，右端对着几就是几厘米：${r.length} 厘米。`, board: [{ kind: "formula" as const, id: "f", text: `长 ${r.length} 厘米` }], highlight: ["f"], scene: { reveal: 3 } }
          : { say: v === 1 ? `数一数中间有几个 1 厘米：${r.length} 个。` : `没对准 0，就用右端减左端：${r.end} 减 ${p.start}。`, board: [{ kind: "formula" as const, id: "f", text: `${r.end} − ${p.start} = ${r.length}（厘米）` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: "1 米 = 100 厘米。量长的东西用米，量短的东西用厘米。", board: [T("1 米 = 100 厘米", "note")] },
      ]);
    }
    case "clock": {
      const r = clock(p);
      return steps(grade, [
        { say: "短的是时针，长的是分针。", board: [T("短：时针　长：分针")], scene: { reveal: 1 } },
        { say: p.m === 0 ? `分针指着 12，时针指着 ${p.h}。` : `时针走过了 ${p.h}，还没到 ${p.h % 12 + 1}。`, board: [T(`时针：${p.h} 时${p.m ? "多" : ""}`)], scene: { reveal: 2 } },
        { say: p.m === 0 ? "分针指着 12，就是整时。" : `分针指着 ${r.minuteNumber}，一大格是 5 分，${r.minuteNumber} 大格就是 ${p.m} 分。`, board: [T(`分针：${p.m} 分`)], scene: { reveal: 3 } },
        { say: `现在是 ${r.text}，也写作 ${r.digital}。`, board: [{ kind: "formula" as const, id: "f", text: `${r.text}（${r.digital}）` }], highlight: ["f"] },
        { say: v === 1 ? "分针走一圈，时针走一大格，就是 1 时 = 60 分。" : "1 时 = 60 分。", board: [T("1 时 = 60 分", "note")] },
      ]);
    }
    case "parallel": {
      const rel = lineRelation(p.deg);
      return steps(grade, [
        { say: "在同一个平面上，画两条直线。", board: [T("同一平面内的两条直线")], scene: { reveal: 1 } },
        { say: "转动其中一条，看它们会不会相交。", scene: { reveal: 2 } },
        { say: rel === "平行" ? "现在两条直线怎么延长都不相交，它们互相平行。" : rel === "互相垂直" ? "两条直线相交成直角，它们互相垂直。" : `两条直线相交，夹角是 ${Math.min(p.deg, 180 - p.deg)} 度。`, board: [T(`现在：${rel}`, "result")], scene: { reveal: 3 } },
        { say: "同一平面内不相交的两条直线叫平行线；相交成直角的两条直线互相垂直。", board: [T("平行：不相交　垂直：成直角", "note")] },
      ]);
    }
    case "chance": {
      const w = chanceWord(p.red, p.white);
      return steps(grade, [
        { say: `袋子里有 ${p.red} 个红球、${p.white} 个白球。`, board: [T(`红 ${p.red} 个，白 ${p.white} 个`)], scene: { reveal: 1 } },
        { say: `任意摸一个，${w.red}摸到红球，${w.white}摸到白球。`, board: [T(`红球：${w.red}　白球：${w.white}`)], scene: { reveal: 2 } },
        { say: p.red === p.white ? "两种球一样多，摸到的可能性一样大。" : `${w.more}，因为它更多。`, board: [T(w.more, "result")], scene: { reveal: 3 } },
        { say: v === 1 ? "摸一次的结果说不准，摸很多次，结果就会接近我们猜的。" : "动手摸 100 次，看看实际结果。", board: [T("次数越多，越接近猜测", "note")] },
      ]);
    }
    case "number-line": {
      const r = numberLine(p);
      return steps(grade, [
        { say: "数轴上，0 在中间。0 既不是正数，也不是负数。", board: [T("0 是正数和负数的分界")], scene: { reveal: 1 } },
        { say: "0 右边是正数，左边是负数。", board: [T("右：正数　左：负数")], scene: { reveal: 2 } },
        { say: `在数轴上找到 ${fmtSigned(p.a)} 和 ${fmtSigned(p.b)}。`, scene: { reveal: 3 } },
        { say: "数轴上，越往右的数越大。", board: [{ kind: "formula" as const, id: "f", text: r.text }], highlight: ["f"], scene: { reveal: 4 } },
        { say: v === 2 ? "零下 3 ℃ 记作 −3 ℃，比零上 2 ℃ 冷。" : "所以负数都比 0 小，正数都比 0 大。", board: [T(v === 2 ? "零下 3 ℃ 记作 −3 ℃" : "负数 < 0 < 正数", "note")] },
      ]);
    }
    case "percent": {
      const r = percent(p);
      return steps(grade, [
        { say: `一件衣服原价 ${r.price} 元，现在打 ${p.zhe} 折。`, board: [T(`原价 ${r.price} 元，${p.zhe} 折`)], scene: { reveal: 1 } },
        { say: `打 ${p.zhe} 折，就是按原价的 ${r.pct}% 出售。`, board: [T(`${p.zhe} 折 = ${r.pct}%`)], scene: { reveal: 2 } },
        { say: v === 1 ? `也可以先算便宜的部分：原价的 ${100 - r.pct}%。` : `现价 = 原价 × ${r.pct}%。`, board: [{ kind: "formula" as const, id: "f", text: v === 1 ? `${r.price} × ${100 - r.pct}% = ${r.saved}（元），${r.price} − ${r.saved} = ${r.sale}（元）` : `${r.price} × ${r.pct}% = ${r.sale}（元）` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: `现价 ${r.sale} 元，便宜了 ${r.saved} 元。`, board: [T(`现价 ${r.sale} 元，便宜 ${r.saved} 元`, "result")], scene: { reveal: 4 } },
      ]);
    }
    case "pigeonhole": {
      const r = pigeonhole(p);
      return steps(grade, [
        { say: `把 ${p.items} 个苹果放进 ${p.boxes} 个抽屉。`, board: [T(`${p.items} 个苹果，${p.boxes} 个抽屉`)], scene: { reveal: 1 } },
        { say: "先尽量平均放，这样最多的那个抽屉放得最少。", board: [{ kind: "formula" as const, id: "d", text: r.r ? `${p.items} ÷ ${p.boxes} = ${r.q}……${r.r}` : `${p.items} ÷ ${p.boxes} = ${r.q}` }], scene: { reveal: 2 } },
        r.r ? { say: `每个抽屉放 ${r.q} 个，还剩 ${r.r} 个，不管放进哪个，那个抽屉就有 ${r.atLeast} 个。`, board: [T(`${r.q} + 1 = ${r.atLeast}`)], scene: { reveal: 3 } }
          : { say: `正好每个抽屉 ${r.q} 个。`, scene: { reveal: 3 } },
        { say: `所以总有一个抽屉至少放 ${r.atLeast} 个。`, board: [T(`至少 ${r.atLeast} 个`, "result")], highlight: [], scene: { reveal: 4 } },
        { say: "点“随便放一次”，怎么放都逃不出这个结论。", board: [T("至少数 = 商 + 1（有余数时）", "note")] },
      ]);
    }
    case "scale": {
      const r = scale(p);
      return steps(grade, [
        { say: `比例尺 1∶${r.denom}，表示图上 1 厘米代表实际 ${r.denom} 厘米。`, board: [T(`1∶${r.denom}`)], scene: { reveal: 1 } },
        { say: `图上量得 ${p.cm} 厘米。`, board: [T(`图上 ${p.cm} 厘米`)], scene: { reveal: 2 } },
        { say: "实际距离 = 图上距离 ÷ 比例尺，也就是乘比例尺的后项。", board: [{ kind: "formula" as const, id: "f", text: `${p.cm} × ${r.denom} = ${r.realCm}（厘米）` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: `换算一下：${r.realCm} 厘米 = ${r.text}。`, board: [T(`实际距离 ${r.text}`, "result")] },
        { say: "1 米 = 100 厘米，1 千米 = 1000 米。", board: [T("厘米 → 米 → 千米", "note")] },
      ]);
    }
    case "water": {
      const r = water(p);
      return steps(grade, [
        { say: "水有三种样子：冰、水和水蒸气。", board: [T("固态 · 液态 · 气态")], scene: { reveal: 1 } },
        { say: `现在温度是 ${fmtSigned(p.t)} ℃。`, board: [T(`温度 ${fmtSigned(p.t)} ℃`)], scene: { reveal: 2 } },
        { say: `这时是${r.state}，${r.phase}。`, board: [T(`${r.state}（${r.phase}）`, "result")], scene: { reveal: 3 } },
        { say: "0 ℃ 左右冰会融化，水会结冰；约 100 ℃ 水会沸腾。", board: [T("0 ℃ 结冰　100 ℃ 沸腾（一个大气压下）", "note")] },
      ]);
    }
    case "magnet": {
      const r = magnet(p);
      const pulled = r.items.filter((i) => i.pulled).map((i) => i.name);
      return steps(grade, [
        { say: "猜一猜，磁铁能吸住哪些东西？", board: [T("我猜……")] },
        { say: "把磁铁慢慢靠近。", scene: { reveal: 1 } },
        { say: pulled.length ? `${pulled.join("、")}被吸住了。` : "现在离得太远，什么都没吸住。", board: [T(pulled.length ? `吸住：${pulled.join("、")}` : "没吸住", "result")], scene: { reveal: 2 } },
        { say: "它们都是铁做的。", board: [T("磁铁能吸铁", "note")] },
        { say: "木头、塑料、橡皮和铝罐，都吸不住。", board: [T("吸不住：木头、塑料、橡皮、铝")] },
      ]);
    }
    case "shadow": {
      const r = shadow(p);
      return steps(grade, [
        { say: "阳光照到木棍上，木棍后面出现影子。", board: [T("挡住光 → 形成影子")], scene: { reveal: 1 } },
        { say: "影子总在太阳的对面。", board: [T("影子方向与太阳相反")], scene: { reveal: 2 } },
        { say: `现在太阳高度是 ${p.sun} 度，影子大约长 ${r.length} 厘米。`, board: [{ kind: "formula" as const, id: "f", text: `影长 ≈ ${r.length} 厘米` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: "太阳越高，影子越短；太阳越低，影子越长。", board: [T("太阳越高，影子越短", "result")] },
        ...(band === "high" ? [{ say: `可以记录不同时刻的影长，画成统计图找规律。`, board: [T("记录 → 画图 → 找规律", "note")] }] : []),
      ]);
    }
    case "circuit": {
      const r = circuit(p);
      return steps(grade, [
        { say: "电池、导线、开关、灯泡连成一个圈，叫闭合电路。", board: [T("闭合回路才有电流")], scene: { reveal: 1 } },
        { say: p.parallel ? "并联：每个灯泡各有一条路。" : "串联：所有灯泡在同一条路上。", board: [T(p.parallel ? "并联：多条路" : "串联：一条路")], scene: { reveal: 2 } },
        { say: !p.closed ? "开关断开，电路不通，灯不亮。" : r.anyLit ? "开关闭合，灯泡亮了。" : "开关闭合了，但电路中有断开的地方，灯不亮。", board: [T(r.anyLit ? "灯亮" : "灯不亮", r.anyLit ? "result" : "warn")], scene: { reveal: 3 } },
        { say: p.parallel ? "并联时，一个灯坏了，其他灯照样亮。" : "串联时，一个灯坏了，整条路断开，所有灯都灭。", board: [T(p.parallel ? "并联互不影响" : "串联一断全断", "note")] },
      ]);
    }
    case "pendulum": {
      const r = pendulum(p);
      return steps(grade, [
        { say: "摆锤来回摆动一次，叫一个周期。", board: [T("来回一次 = 一个周期")], scene: { reveal: 1 } },
        { say: `摆长 ${p.len} 厘米时，来回一次约 ${r.period} 秒，10 次约 ${r.ten} 秒。`, board: [{ kind: "formula" as const, id: "f", text: `10 次 ≈ ${r.ten} 秒` }], highlight: ["f"], scene: { reveal: 2 } },
        { say: "只改变摆锤质量，快慢几乎不变。", board: [T("质量 → 几乎无影响")] },
        { say: "摆长越长，摆得越慢。", board: [T("摆长越长 → 越慢", "result")] },
        { say: "做实验时一次只改变一个条件，这叫控制变量。", board: [T("一次只改变一个条件", "note")] },
      ]);
    }
    case "lever": {
      const r = lever(p);
      return steps(grade, [
        { say: "杠杆有三个点：支点、用力点和阻力点。", board: [T("支点 · 用力点 · 阻力点")], scene: { reveal: 1 } },
        { say: `阻力点挂 ${p.load} 个钩码，离支点 ${p.ld} 格；用力点离支点 ${p.ed} 格。`, board: [T(`阻力 ${p.load} 个 × ${p.ld} 格`)], scene: { reveal: 2 } },
        { say: `要平衡，用力点需要 ${r.exact ? "" : "约 "}${r.effort} 个钩码的力。`, board: [{ kind: "formula" as const, id: "f", text: `${p.load} × ${p.ld} = ${r.effort} × ${p.ed}` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: r.kind === "省力" ? "用力点离支点比阻力点远，这是省力杠杆。" : r.kind === "费力" ? "用力点离支点比阻力点近，这是费力杠杆，但能少移动一些距离。" : "两边一样远，不省力也不费力。", board: [T(r.kind, "result")] },
        { say: "用力点离支点越远，越省力。", board: [T("动力臂越长越省力", "note")] },
      ]);
    }
    case "slope": {
      const r = slope(p);
      return steps(grade, [
        { say: `直接把 ${p.g} 牛的物体提高 ${p.h} 厘米，要用 ${p.g} 牛的力。`, board: [T(`直接提起：${p.g} 牛`)], scene: { reveal: 1 } },
        { say: `换成沿 ${p.len} 厘米长的斜面拉上去。`, board: [T(`斜面长 ${p.len} 厘米，高 ${p.h} 厘米`)], scene: { reveal: 2 } },
        { say: `不计摩擦时，拉力约 ${r.force} 牛，比直接提起省了约 ${r.saved} 牛。`, board: [{ kind: "formula" as const, id: "f", text: `${p.g} × ${p.h} ÷ ${p.len} ≈ ${r.force}（牛）` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: "高度不变时，斜面越长、坡越缓，越省力。", board: [T("坡越缓越省力", "result")] },
        { say: "省了力，但要多走一段路。", board: [T("省力不省距离", "note")] },
      ]);
    }
    case "sound": {
      const r = sound(p);
      return steps(grade, [
        { say: "把钢尺压在桌边，拨一下，钢尺在振动，就发出了声音。", board: [T("声音由振动产生")], scene: { reveal: 1 } },
        { say: `这次拨得${DEMOS.sound.params[0].options![p.force]}，声音${r.loud}。`, board: [T(`振动幅度 → 声音${r.loud}`)], scene: { reveal: 2 } },
        { say: `钢尺伸出 ${p.len} 厘米，振动${r.pitch === "高" ? "快" : r.pitch === "低" ? "慢" : "不快不慢"}，音调${r.pitch}。`, board: [T(`伸出 ${p.len} 厘米 → 音调${r.pitch}`, "result")], scene: { reveal: 3 } },
        { say: "用力大小改变的是强弱；伸出长短改变的是高低。", board: [T("幅度大→响　振动快→高", "note")] },
      ]);
    }
    case "earth": {
      const r = earth(p);
      return steps(grade, [
        { say: "太阳只能照亮地球的一半，亮的一半是白天，暗的一半是黑夜。", board: [T("一半白天，一半黑夜")], scene: { reveal: 1 } },
        { say: "地球自西向东自转，大约 24 小时转一圈。", board: [T("自西向东，约 24 小时一圈")], scene: { reveal: 2 } },
        { say: `北京时间 ${p.hour} 时，北京是${r.day ? "白天" : "黑夜"}，正是${r.part}。${r.day ? `太阳在${r.dir}。` : ""}`, board: [T(`${p.hour} 时：${r.day ? "白天" : "黑夜"}${r.day ? `，太阳在${r.dir}` : ""}`, "result")], scene: { reveal: 3 } },
        { say: "地球不停地转，白天和黑夜就不断交替。", board: [T("自转 → 昼夜交替", "note")] },
        ...(band === "high" ? [{ say: "因为地球自西向东转，我们看到太阳东升西落。", board: [T("太阳东升西落", "note")] }] : []),
      ]);
    }
    case "friction": {
      const r = friction(p);
      return steps(grade, [
        { say: "用测力计水平匀速拉木块，读数就是摩擦力的大小。", board: [T("匀速拉动：拉力 = 摩擦力")], scene: { reveal: 1 } },
        { say: `木块和钩码一共重 ${r.weight} 牛，放在${r.surface}上。`, board: [T(`${r.surface}，压力 ${r.weight} 牛`)], scene: { reveal: 2 } },
        { say: `测力计读数约 ${r.force} 牛。`, board: [{ kind: "formula" as const, id: "f", text: `摩擦力 ≈ ${r.force} 牛` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: "表面越粗糙、压得越重，摩擦力越大。", board: [T("越粗糙、越重 → 摩擦力越大", "result")] },
        { say: "一次只改变一个条件，比较才公平。", board: [T("控制变量", "note")] },
      ]);
    }
    case "make-ten": {
      const r = makeTen(p);
      if (!r.carry) return steps(grade, [
        { say: `${p.a} 加 ${p.b}，一共 ${r.sum}，没有超过 10。`, board: [{ kind: "formula" as const, id: "f", text: r.expr }], highlight: ["f"], scene: { reveal: 1 } },
        { say: "加起来不满十，直接数就可以，不用凑十。换大一点的数试试。", board: [T("不满 10：直接加", "note")], scene: { reveal: 1 } },
      ]);
      return steps(grade, [
        { say: `${p.a} 加 ${p.b}，十格框里先放 ${p.a} 个红圆片。`, board: [T(`${p.a} + ${p.b} = ?`, "title")], scene: { reveal: 1 } },
        { say: v === 1 ? `看大数 ${p.a}，还差几个满十？差 ${r.need} 个。` : `${p.a} 和几凑成 10？${p.a} 和 ${r.need} 凑成 10。`, board: [T(`${p.a} + ${r.need} = 10`)], scene: { reveal: 2 } },
        { say: `把 ${p.b} 分成 ${r.need} 和 ${r.rest}。`, board: [{ kind: "formula" as const, id: "s", text: `${p.b} → ${r.need} 和 ${r.rest}` }], highlight: ["s"], scene: { reveal: 3 } },
        { say: `先算 ${p.a} 加 ${r.need} 等于 10，再算 10 加 ${r.rest} 等于 ${r.sum}。`, board: [{ kind: "formula" as const, id: "f", text: `${p.a} + ${r.need} = 10，10 + ${r.rest} = ${r.sum}` }], highlight: ["f"], scene: { reveal: 4 } },
        { say: "看大数，分小数，凑成十，再加几。", board: [T("看大数 → 分小数 → 凑成十 → 加剩下", "note")] },
      ]);
    }
    case "bar-chart": {
      const r = barChart(p);
      return steps(grade, [
        { say: `调查同学们最喜欢的水果，每格表示 ${r.per} 票。`, board: [T(`1 格 = ${r.per} 票`, "title")], scene: { reveal: 1 } },
        { say: r.per === 2 ? "一格表示 2 票时，半格就是 1 票。" : "数一数每个条形有几格，就是几票。", board: [T(FRUITS.map((f, i) => `${f} ${r.counts[i]}`).join("　"))], scene: { reveal: 2 } },
        { say: `${r.maxName}的条形最长，${r.max} 票；${r.minName}的最短，${r.min} 票。`, board: [T(`最多：${r.maxName} ${r.max} 票　最少：${r.minName} ${r.min} 票`, "result")], scene: { reveal: 3 } },
        { say: `最多的比最少的多 ${r.max} 减 ${r.min}，等于 ${r.diff} 票。`, board: [{ kind: "formula" as const, id: "d", text: `${r.max} − ${r.min} = ${r.diff}（票）` }], highlight: ["d"], scene: { reveal: 3 } },
        { say: `一共调查了 ${r.total} 人。条形统计图能一眼看出谁多谁少。`, board: [{ kind: "formula" as const, id: "t", text: `${r.counts.join(" + ")} = ${r.total}（人）` }], highlight: ["t"] },
      ]);
    }
    case "poly-area": {
      const r = polyArea(p);
      if (p.shape === 0) return steps(grade, [
        { say: `一个平行四边形，底 ${p.a} 厘米，高 ${p.h} 厘米。`, board: [T(`平行四边形：底 ${p.a}，高 ${p.h}`, "title")], scene: { reveal: 1 } },
        { say: "沿着高剪下左边的直角三角形。", board: [T("沿高剪开")], scene: { reveal: 2 } },
        { say: "把它平移到右边，拼成一个长方形。", board: [T("平移，拼成长方形")], scene: { reveal: 3 } },
        { say: `长方形的长就是底，宽就是高，面积不变：${r.calc} 平方厘米。`, board: [{ kind: "formula" as const, id: "f", text: `S = 底 × 高 = ${r.calc}（cm²）` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: "平行四边形的面积等于底乘高。", board: [T("S = ah", "note")] },
      ]);
      if (p.shape === 1) return steps(grade, [
        { say: `一个三角形，底 ${p.a} 厘米，高 ${p.h} 厘米。`, board: [T(`三角形：底 ${p.a}，高 ${p.h}`, "title")], scene: { reveal: 1 } },
        { say: "再拿一个完全一样的三角形，旋转后拼在一起。", board: [T("两个完全一样的三角形")], scene: { reveal: 2 } },
        { say: `拼成一个平行四边形，面积是 ${p.a} 乘 ${p.h}，等于 ${p.a * p.h}。`, board: [T(`平行四边形：${p.a} × ${p.h} = ${p.a * p.h}`)], scene: { reveal: 3 } },
        { say: `三角形是它的一半：${r.calc} 平方厘米。`, board: [{ kind: "formula" as const, id: "f", text: `S = 底 × 高 ÷ 2 = ${r.calc}（cm²）` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: "别忘了除以 2。", board: [T("S = ah ÷ 2", "note")] },
      ]);
      return steps(grade, [
        { say: `一个梯形，上底 ${p.b} 厘米，下底 ${p.a} 厘米，高 ${p.h} 厘米。`, board: [T(`梯形：上底 ${p.b}，下底 ${p.a}，高 ${p.h}`, "title")], scene: { reveal: 1 } },
        { say: "再拿一个完全一样的梯形，倒过来拼在一起。", board: [T("两个完全一样的梯形")], scene: { reveal: 2 } },
        { say: `拼成平行四边形，底是上底加下底：${p.b} 加 ${p.a} 等于 ${p.a + p.b}。`, board: [T(`平行四边形：(${p.b} + ${p.a}) × ${p.h} = ${(p.a + p.b) * p.h}`)], scene: { reveal: 3 } },
        { say: `梯形是它的一半：${r.calc} 平方厘米。`, board: [{ kind: "formula" as const, id: "f", text: `S = (上底 + 下底) × 高 ÷ 2 = ${r.calc}（cm²）` }], highlight: ["f"], scene: { reveal: 3 } },
        { say: "梯形面积 =（上底 + 下底）× 高 ÷ 2。", board: [T("S = (a + b)h ÷ 2", "note")] },
      ]);
    }
    case "plant": {
      const r = plant(p);
      const water = DEMOS.plant.params[0].options![p.water];
      return steps(grade, [
        { say: `杯子里的绿豆：${water}，放在${p.light ? "有光的窗台" : "暗处"}。`, board: [T(`${water} · ${p.light ? "有光" : "暗处"}`)], scene: { reveal: 1 } },
        { say: `过了 ${p.day} 天，${r.status}。`, board: [T(`第 ${p.day} 天：${r.status}`, "result")], scene: { reveal: 2 } },
        ...(r.sprout && p.day > 2 ? [{ say: `豆苗高约 ${r.height} 厘米，叶子${r.leaf}。`, board: [{ kind: "formula" as const, id: "f", text: `高 ≈ ${r.height} 厘米，叶子${r.leaf}` }], highlight: ["f"], scene: { reveal: 3 } }] : [{ say: r.reason ? `没发芽的原因是${r.reason}。` : "再等一等，种子正在吸水。", board: [T(r.reason ? `原因：${r.reason}` : "种子在吸水膨胀", "warn")], scene: { reveal: 3 } }]),
        { say: "种子发芽需要适量的水、充足的空气和适宜的温度。", board: [T("发芽：水 + 空气 + 温度", "note")] },
        { say: "长出叶子后，豆苗要晒到阳光，叶子才会变绿。", board: [T("生长：还需要阳光", "note")] },
      ]);
    }
  }
}

/** 按年级给出生活中的例子。 */
export function lifeExample(id: DemoId, grade: Grade): string {
  const low = bandOf(grade) === "low";
  const map: Record<DemoId, string> = {
    "add-sub": "早上有 3 只小鸟，又飞来 2 只，一共几只？",
    "group-share": "6 个同学分 18 支铅笔，每人分得同样多，每人几支？",
    fraction: "一块蛋糕平均切成 8 块，你吃了 3 块，就是吃了 3/8。",
    "perimeter-area": "给相框镶边看周长；给桌面铺桌布看面积。",
    angle: "打开的门和门框之间、剪刀的两片刀刃之间，都有角。",
    law: "4 个同学每人买一支 3 元的笔和一本 5 元的本子，可以算 4×(3+5)。",
    "decimal-mul": "每千克苹果 1.2 元，买 0.5 千克，要付 1.2×0.5 元。",
    balance: "一盒笔 x 支，3 盒再加 4 支，一共 3x+4 支；知道 x=5，就是 19 支。",
    shapes: "魔方像正方体，硬币的面是圆，三角尺是三角形。",
    rmb: "用 10 元买一支 7 元的笔，售货员要找回 3 元。",
    ruler: "量橡皮时，左端没对准 0 也没关系，用右端读数减左端读数。",
    clock: "早上 7 时 30 分出门，分针指着 6，时针在 7 和 8 中间。",
    parallel: "铁轨的两条钢轨互相平行，十字路口的两条路常常互相垂直。",
    chance: "抽奖箱里中奖券很少，所以抽中的可能性小。",
    "number-line": "冬天北方气温零下 10 ℃，记作 −10 ℃。",
    percent: "商场“满 100 元打八折”，100 元的东西付 80 元。",
    pigeonhole: "13 个同学中，至少有 2 个人的生日在同一个月。",
    "make-ten": "盘子里有 9 个饺子，又端来 4 个：先拿 1 个凑满 10，再加 3 个，一共 13 个。",
    "bar-chart": low ? "班里投票选春游地点，画成条形图，一眼就能看出去哪里的人最多。" : "体检后把全班身高分段统计，画成条形统计图，就能看出哪一段的人最多。",
    "poly-area": "一块梯形的菜地，上底 6 米、下底 10 米、高 5 米，面积是 (6+10)×5÷2 = 40 平方米。",
    scale: "地图上两地相距 5 厘米，比例尺 1∶1000000，实际相距 50 千米。",
    water: "冬天湖面结冰，烧开水时冒出“白气”。",
    circle: "自行车轮子转一圈走的路，就是轮子的周长。",
    cylinder: "做一个圆柱形笔筒要多少纸，看侧面积；能装多少水，看体积。",
    magnet: "冰箱贴能贴在冰箱门上，因为门是铁做的。",
    shadow: low ? "中午操场上的影子短，傍晚影子长。" : "旗杆的影子早晚长、中午短，古人用日晷看时间。",
    circuit: "手电筒里有电池、开关和灯泡，就是一个简单电路。",
    pendulum: "老式摆钟就是利用摆来计时的。",
    lever: "撬棍撬石头、开瓶器开瓶盖都是省力杠杆；用筷子夹菜是费力杠杆，但很灵活。",
    slope: "轮椅坡道、盘山公路都是斜面，坡越缓越省力。",
    sound: "敲鼓用力越大声音越响；吉他的弦按得越短声音越高。",
    earth: "我们这里是白天时，美国正是黑夜，所以打视频电话要算好时间。",
    friction: "鞋底有花纹是为了增大摩擦；给自行车链条加油是为了减小摩擦。",
    plant: low ? "家里泡的豆芽放在暗处，所以又白又长。" : "超市卖的豆芽是在暗处长的，所以细长发黄；放到窗台晒几天，叶子就会变绿。",
  };
  return map[id];
}
