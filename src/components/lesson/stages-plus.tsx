import type { ReactElement } from "react";
import {
  PEOPLE, PLACES8, TALLY_NAMES, VIEW_SHAPES, WEEK, WEEKDAYS, abacus, barModel, calendar, chickenRabbit, columnAdd, columnMul, combos, cuboid, decimal, factors,
  fractionAdd, fractionDiv, idCode, lineChart, logic, longDiv, mixedOps, oddOne, optimize, pattern, position, squareNumbers, sticks, tally, tallyMarks, transform,
  treePlant, triangle, units, venn, views,
} from "@/lib/lesson/plus";
import { UNIT_KINDS } from "@/lib/lesson/demo-defs-plus";
import type { StageProps } from "./stages-math";

const C = { ink: "#285847", line: "#cad9bc", soft: "#eef4e6", red: "#c8553d", blue: "#4b6fa8", gold: "#dfbd76", goldDark: "#bf9d50", paper: "#fffdf7", muted: "#8a9a86" };
const rv = (p: StageProps) => (p.interactive ? 9 : p.scene.reveal ?? 0);
const Fig = ({ label, children, h = 230 }: { label: string; children: React.ReactNode; h?: number }) => <figure className="stage"><svg viewBox={`0 0 440 ${h}`} role="img" aria-label={label}>{children}</svg></figure>;
const Txt = ({ x, y, children, c = "stage-label", anchor = "start", fill }: { x: number; y: number; children: React.ReactNode; c?: string; anchor?: "start" | "middle" | "end"; fill?: string }) => <text x={x} y={y} textAnchor={anchor} className={c} style={fill ? { fill } : undefined}>{children}</text>;
const Mono = ({ x, y, children, fill = C.ink, size = 18, anchor = "end" }: { x: number; y: number; children: React.ReactNode; fill?: string; size?: number; anchor?: "start" | "middle" | "end" }) => <text x={x} y={y} textAnchor={anchor} fontSize={size} fontFamily="ui-monospace, Menlo, monospace" fill={fill}>{children}</text>;

/** 一年级：小棒，10 根一捆 */
export function SticksStage(props: StageProps) {
  const { params } = props, r = sticks(params), reveal = rv(props);
  const bundle = (i: number) => <g key={`b${i}`} transform={`translate(${30 + i * 30} 30)`}>{Array.from({ length: 10 }, (_, k) => <rect key={k} x={k * 2} y="0" width="2" height="80" fill={C.goldDark} />)}<rect x="-2" y="36" width="24" height="7" rx="2" fill={C.red} /></g>;
  return <Fig label={`${params.tens} 捆 ${params.ones} 根小棒，是 ${r.n}`}>
    {Array.from({ length: params.tens }, (_, i) => bundle(i))}
    {Array.from({ length: params.ones }, (_, i) => <rect key={`o${i}`} x={310 + i * 12} y="30" width="3" height="80" fill={C.gold} />)}
    {reveal >= 2 ? <><Txt x={30} y={128}>{params.tens} 捆 = {params.tens} 个十</Txt><Txt x={310} y={128}>{params.ones} 根 = {params.ones} 个一</Txt></> : null}
    {reveal >= 3 ? <g>
      <rect x="140" y="140" width="80" height="56" fill={C.soft} stroke={C.ink} /><rect x="220" y="140" width="80" height="56" fill={C.paper} stroke={C.ink} />
      <Txt x={180} y={156} anchor="middle">十位</Txt><Txt x={260} y={156} anchor="middle">个位</Txt>
      <Txt x={180} y={188} c="stage-result" anchor="middle">{params.tens}</Txt><Txt x={260} y={188} c="stage-result" anchor="middle">{params.ones}</Txt>
    </g> : null}
    {reveal >= 4 ? <Txt x={220} y={220} c="stage-result" anchor="middle">{r.n}　读作：{r.read}</Txt> : null}
  </Fig>;
}

/** 二、四年级：计数器 */
export function AbacusStage(props: StageProps) {
  const { params } = props, r = abacus(params), reveal = rv(props);
  const n = r.digits.length, gap = n === 8 ? 46 : 70, x0 = 220 - ((n - 1) * gap) / 2;
  return <Fig label={`计数器上是 ${r.n}，读作${r.read}`}>
    <rect x={x0 - 30} y="132" width={(n - 1) * gap + 60} height="14" rx="4" fill={C.goldDark} />
    {r.digits.map((d, i) => { const x = x0 + (n - 1 - i) * gap; return <g key={i}>
      <line x1={x} y1="20" x2={x} y2="132" stroke={C.ink} strokeWidth="3" />
      {Array.from({ length: d }, (_, k) => <ellipse key={k} cx={x} cy={124 - k * 11} rx="15" ry="5.5" fill={i >= 4 ? C.blue : C.red} />)}
      {reveal >= 1 ? <Txt x={x} y={164} anchor="middle">{PLACES8[i].replace("位", "")}</Txt> : null}
      {reveal >= 2 ? <Txt x={x} y={186} c="stage-result" anchor="middle">{d}</Txt> : null}
    </g>; })}
    {reveal >= 3 ? <Txt x={220} y={212} c="stage-result" anchor="middle">写作 {r.n}{reveal >= 4 ? `　读作 ${r.read}` : ""}</Txt> : null}
  </Fig>;
}

/** 竖式加减法：按列逐位显示 */
export function ColumnAddStage(props: StageProps) {
  const { params } = props, r = columnAdd(params), reveal = rv(props);
  const W = Math.max(String(params.a).length, String(params.b).length, String(r.result).length), cw = 34, right = 300;
  const cell = (n: number, row: number, fill = C.ink) => String(n).split("").reverse().map((d, i) => <Mono key={`${row}-${i}`} x={right - i * cw} y={60 + row * 44} size={28} fill={fill} anchor="middle">{d}</Mono>);
  const shown = Math.min(reveal, 9);
  const digits = String(r.result).split("").reverse();
  return <Fig label={`${r.expr} = ${r.result}`}>
    {Array.from({ length: W }, (_, i) => <Txt key={i} x={right - i * cw} y={22} anchor="middle">{["个", "十", "百", "千", "万"][i]}</Txt>)}
    {cell(params.a, 0)}{cell(params.b, 1)}
    <Mono x={right - W * cw} y={104} size={26} anchor="middle">{r.sub ? "−" : "+"}</Mono>
    <line x1={right - W * cw - 14} y1="116" x2={right + 18} y2="116" stroke={C.ink} strokeWidth="2" />
    {r.cols.map((c, i) => c.out && shown > i ? <Mono key={`c${i}`} x={right - (i + 1) * cw + (r.sub ? 0 : 0)} y={r.sub ? 30 : 128} size={13} fill={C.red} anchor="middle">{r.sub ? "·" : "1"}</Mono> : null)}
    {digits.map((d, i) => (shown > i || shown >= 9 || (r.carryTop && shown >= 5 && i === digits.length - 1)) ? <Mono key={`r${i}`} x={right - i * cw} y={152} size={28} fill={C.blue} anchor="middle">{d}</Mono> : null)}
    {reveal >= 9 ? <Txt x={220} y={204} c="stage-result" anchor="middle">{r.expr} = {r.result}</Txt> : <Txt x={220} y={204} c="stage-hint" anchor="middle">{r.sub ? "不够减，向前一位借 1 当 10" : "满十，向前一位进 1"}</Txt>}
  </Fig>;
}

/** 竖式乘法 */
export function ColumnMulStage(props: StageProps) {
  const { params } = props, r = columnMul(params), reveal = rv(props);
  const right = 300, cw = 30;
  const row = (text: string, y: number, fill = C.ink, shift = 0) => text.split("").reverse().map((d, i) => <Mono key={`${y}-${i}`} x={right - (i + shift) * cw} y={y} size={24} fill={fill} anchor="middle">{d}</Mono>);
  return <Fig label={`${params.a} × ${params.b} = ${r.product}`}>
    {row(String(params.a), 40)}{row(String(params.b), 72)}
    <Mono x={right - 4 * cw} y={72} size={22} anchor="middle">×</Mono>
    <line x1={right - 4.5 * cw} y1="82" x2={right + 16} y2="82" stroke={C.ink} strokeWidth="2" />
    {r.twoDigit ? <>
      {reveal >= 2 ? row(String(r.p1), 110, C.blue) : null}
      {reveal >= 3 ? row(String(r.p2), 140, C.red, 1) : null}
      {reveal >= 4 ? <><line x1={right - 4.5 * cw} y1="150" x2={right + 16} y2="150" stroke={C.ink} strokeWidth="2" />{row(String(r.product), 178, C.ink)}</> : null}
      {reveal >= 3 ? <Txt x={30} y={140} c="stage-hint">{r.p2} 个十，末位对齐十位</Txt> : null}
    </> : <>
      {reveal >= 2 ? row(String(r.product).slice(-Math.min(reveal - 1, String(r.product).length)), 110, C.blue) : null}
    </>}
    {reveal >= 9 ? <Txt x={220} y={214} c="stage-result" anchor="middle">{params.a} × {params.b} = {r.product}</Txt> : null}
  </Fig>;
}

/** 竖式除法（长除法） */
export function LongDivStage(props: StageProps) {
  const { params } = props, r = longDiv(params), reveal = rv(props);
  const ds = String(params.a), cw = 24, x0 = 200, endX = x0 + ds.length * cw;
  const shownSteps = reveal >= 9 ? r.steps.length : Math.max(0, Math.min(r.steps.length, reveal - 1));
  const lines: ReactElement[] = [];
  r.steps.slice(0, Math.min(shownSteps, 3)).forEach((s, i) => {
    const colEnd = x0 + (s.at + 1) * cw, y = 68 + i * 48;
    lines.push(<Mono key={`p${i}`} x={colEnd - cw / 2 + 8} y={y} size={18} fill={C.blue}>{s.prod}</Mono>);
    lines.push(<line key={`l${i}`} x1={colEnd - String(s.prod).length * cw - 4} y1={y + 5} x2={colEnd + 2} y2={y + 5} stroke={C.ink} />);
    const next = r.steps[i + 1];
    lines.push(<Mono key={`r${i}`} x={(next ? x0 + (next.at + 1) * cw : colEnd) - cw / 2 + 8} y={y + 24} size={18}>{next ? next.cur : s.rem}</Mono>);
  });
  return <Fig label={`${params.a} ÷ ${params.b} = ${r.text}`}>
    <Mono x={x0 - 16} y={42} size={22}>{params.b}</Mono>
    <path d={`M${x0 - 8} 22 q 10 10 0 26 M${x0 - 8} 22 H ${endX + 6}`} fill="none" stroke={C.ink} strokeWidth="2" />
    {ds.split("").map((d, i) => <Mono key={i} x={x0 + i * cw + cw / 2} y={42} size={22} anchor="middle">{d}</Mono>)}
    {r.steps.slice(0, shownSteps).map((s, i) => <Mono key={`q${i}`} x={x0 + s.at * cw + cw / 2} y={16} size={20} fill={C.red} anchor="middle">{s.q}</Mono>)}
    {lines}
    {reveal >= 9 ? <Txt x={30} y={214} c="stage-result">{params.a} ÷ {params.b} = {r.text}</Txt> : <Txt x={30} y={214} c="stage-hint">除到哪一位，商就写在哪一位上</Txt>}
  </Fig>;
}

/** 混合运算：递等式 */
export function MixedOpsStage(props: StageProps) {
  const { params } = props, r = mixedOps(params), reveal = rv(props);
  return <Fig label={`${r.expr} = ${r.result}`}>
    <Txt x={40} y={34} c="stage-hint">{r.rule}</Txt>
    <Mono x={60} y={84} size={26} anchor="start">{r.expr}</Mono>
    {reveal >= 2 ? <><rect x={56} y={92} width={Math.max(60, r.expr.length * 16 * (r.first.length / r.expr.length))} height="4" fill={C.gold} /><Txt x={60} y={116} fill={C.red}>先算 {r.first} = {r.mid}</Txt></> : null}
    {reveal >= 2 ? <Mono x={60} y={150} size={24} anchor="start" fill={C.blue}>= {r.line}</Mono> : null}
    {reveal >= 3 ? <Mono x={60} y={190} size={24} anchor="start" fill={C.ink}>= {r.result}</Mono> : null}
  </Fig>;
}

/** 线段图 */
export function BarModelStage(props: StageProps) {
  const { params } = props, r = barModel(params), reveal = rv(props);
  const max = params.mode === 2 ? params.a * params.k : Math.max(params.a, params.b, params.mode === 1 ? params.a + params.b : 0);
  const unit = 320 / Math.max(max, 1), x0 = 80;
  const bar = (y: number, len: number, color: string) => <g><line x1={x0} y1={y} x2={x0 + len * unit} y2={y} stroke={color} strokeWidth="4" /><line x1={x0} y1={y - 8} x2={x0} y2={y + 8} stroke={color} strokeWidth="2" /><line x1={x0 + len * unit} y1={y - 8} x2={x0 + len * unit} y2={y + 8} stroke={color} strokeWidth="2" /></g>;
  if (params.mode === 2) return <Fig label={`黄花是红花的 ${params.k} 倍：${params.a} × ${params.k} = ${r.times}`}>
    <Txt x={20} y={64}>红花</Txt>{bar(60, params.a, C.red)}<Txt x={x0 + params.a * unit + 8} y={64}>{params.a} 朵</Txt>
    {reveal >= 2 ? <><Txt x={20} y={124}>黄花</Txt>{Array.from({ length: params.k }, (_, i) => <g key={i} transform={`translate(${i * params.a * unit} 0)`}>{bar(120, params.a, C.goldDark)}</g>)}</> : null}
    {reveal >= 3 ? <Txt x={220} y={172} c="stage-result" anchor="middle">{params.a} × {params.k} = {r.times}（朵）</Txt> : null}
    {reveal >= 2 ? <Txt x={220} y={204} c="stage-hint" anchor="middle">黄花有 {params.k} 个 {params.a} 朵</Txt> : null}
  </Fig>;
  if (params.mode === 1) return <Fig label={`${params.a} + ${params.b} = ${r.total}`}>
    {bar(90, params.a, C.red)}<g transform={`translate(${params.a * unit} 0)`}>{bar(90, params.b, C.goldDark)}</g>
    <Txt x={x0 + (params.a * unit) / 2} y={78} anchor="middle">红花 {params.a}</Txt><Txt x={x0 + params.a * unit + (params.b * unit) / 2} y={78} anchor="middle">黄花 {params.b}</Txt>
    {reveal >= 2 ? <><path d={`M${x0} 104 q ${(r.total * unit) / 2} 30 ${r.total * unit} 0`} fill="none" stroke={C.ink} /><Txt x={x0 + (r.total * unit) / 2} y={140} c="stage-result" anchor="middle">一共 {r.total} 朵</Txt></> : null}
  </Fig>;
  const big = Math.max(params.a, params.b), small = Math.min(params.a, params.b);
  return <Fig label={`红花 ${params.a} 朵，黄花 ${params.b} 朵，相差 ${r.diff} 朵`}>
    <Txt x={20} y={64}>红花</Txt>{bar(60, params.a, C.red)}<Txt x={x0 + params.a * unit + 8} y={64}>{params.a}</Txt>
    <Txt x={20} y={124}>黄花</Txt>{bar(120, params.b, C.goldDark)}<Txt x={x0 + params.b * unit + 8} y={124}>{params.b}</Txt>
    {reveal >= 2 && r.diff ? <><line x1={x0 + small * unit} y1={params.a > params.b ? 72 : 132} x2={x0 + big * unit} y2={params.a > params.b ? 72 : 132} stroke={C.blue} strokeWidth="6" opacity=".5" /><Txt x={x0 + ((small + big) / 2) * unit} y={params.a > params.b ? 92 : 152} anchor="middle" fill={C.blue}>多 {r.diff}</Txt></> : null}
    {reveal >= 3 ? <Txt x={220} y={196} c="stage-result" anchor="middle">{big} − {small} = {r.diff}</Txt> : null}
  </Fig>;
}

/** 单位换算：单位阶梯 */
export function UnitsStage(props: StageProps) {
  const { params } = props, r = units(params), reveal = rv(props);
  const ladder = UNIT_KINDS[params.kind].ladder as readonly string[], w = 400 / ladder.length;
  return <Fig label={`1 ${r.big} = ${r.rate} ${r.small}，${params.v} ${r.big} = ${r.value} ${r.small}`}>
    {ladder.map((u, i) => { const on = reveal >= 2 && (u === r.big || u === r.small); return <g key={u}>
      <rect x={20 + i * w} y={30 + i * 12} width={w - 10} height="38" rx="8" fill={on ? C.gold : C.soft} stroke={C.ink} />
      <Txt x={20 + i * w + (w - 10) / 2} y={54 + i * 12} anchor="middle">{u}</Txt>
    </g>; })}
    {reveal >= 2 ? <Txt x={220} y={124} c="stage-result" anchor="middle">1 {r.big} = {r.rate} {r.small}</Txt> : null}
    {reveal >= 3 ? <Txt x={220} y={160} c="stage-result" anchor="middle">{params.v} {r.big} = {params.v} × {r.rate} = {r.value} {r.small}</Txt> : null}
    {reveal >= 3 ? <Txt x={220} y={196} c="stage-hint" anchor="middle">大单位 → 小单位：乘进率；小单位 → 大单位：除以进率</Txt> : null}
  </Fig>;
}

/** 年月日：月历 */
export function CalendarStage(props: StageProps) {
  const { params } = props, r = calendar(params), reveal = rv(props);
  const cw = 46, ch = 22, x0 = 60, y0 = 60;
  return <Fig label={`${params.year} 年 ${params.month} 月有 ${r.days} 天，${r.leap ? "闰年" : "平年"}`} h={240}>
    <Txt x={220} y={22} c="stage-result" anchor="middle">{params.year} 年 {params.month} 月{reveal >= 3 ? `（${r.leap ? "闰年" : "平年"}）` : ""}</Txt>
    {[...WEEK].map((w, i) => <Txt key={w} x={x0 + i * cw + cw / 2} y={48} anchor="middle" fill={i === 0 || i === 6 ? C.red : undefined}>{w}</Txt>)}
    {Array.from({ length: r.days }, (_, d) => { const k = d + r.first, col = k % 7, row = Math.floor(k / 7); return <g key={d}>
      <rect x={x0 + col * cw + 2} y={y0 + row * ch} width={cw - 4} height={ch - 3} rx="4" fill={reveal >= 4 && d === r.days - 1 ? C.gold : C.paper} stroke={C.line} />
      <text x={x0 + col * cw + cw / 2} y={y0 + row * ch + 14} textAnchor="middle" fontSize="12" fill={C.ink}>{d + 1}</text>
    </g>; })}
    {reveal >= 1 ? <Txt x={220} y={234} c="stage-hint" anchor="middle">{r.kind}：{r.days} 天</Txt> : null}
  </Fig>;
}

/** 观察物体：小正方体 + 三视图 */
export function ViewsStage(props: StageProps) {
  const { params } = props, r = views(params), reveal = rv(props), s = 26;
  const cubes = [...VIEW_SHAPES[params.shape].cubes].sort((a, b) => b[1] - a[1] || a[2] - b[2] || a[0] - b[0]);
  const cube = ([x, y, z]: [number, number, number], i: number) => { const px = 40 + x * s + y * s * 0.5, py = 150 - z * s - y * s * 0.5;
    return <g key={i}><polygon points={`${px},${py} ${px + s},${py} ${px + s},${py - s} ${px},${py - s}`} fill="#f2d48f" stroke={C.ink} /><polygon points={`${px},${py - s} ${px + s},${py - s} ${px + s * 1.5},${py - s * 1.5} ${px + s * 0.5},${py - s * 1.5}`} fill="#fbecc4" stroke={C.ink} /><polygon points={`${px + s},${py} ${px + s * 1.5},${py - s * 0.5} ${px + s * 1.5},${py - s * 1.5} ${px + s},${py - s}`} fill="#d9b25d" stroke={C.ink} /></g>; };
  const grid = (cells: [number, number][], x0: number, label: string, show: boolean) => { const c = 14; return <g>
    <Txt x={x0 + 20} y={210} anchor="middle">{label}</Txt>
    {show ? cells.map(([a, b], i) => <rect key={i} x={x0 + a * c} y={190 - (b + 1) * c - 4} width={c} height={c} fill={C.soft} stroke={C.ink} />) : null}
  </g>; };
  return <Fig label={`${r.n} 个小正方体：正面 ${r.front.length} 个、上面 ${r.top.length} 个、左面 ${r.left.length} 个正方形`}>
    {cubes.map(cube)}
    <Txt x={40} y={190} c="stage-hint">正面 ↑</Txt>
    {grid(r.front, 230, "正面", reveal >= 2)}{grid(r.top, 300, "上面", reveal >= 3)}{grid(r.left, 370, "左面", reveal >= 4)}
  </Fig>;
}

/** 位置与方向 */
export function PositionStage(props: StageProps) {
  const { params } = props, r = position(params), reveal = rv(props), c = 26, x0 = 70, y0 = 196;
  const P = (x: number, y: number) => ({ x: x0 + x * c, y: y0 - y * c });
  const flag = P(params.x, params.y), o = P(4, 3);
  return <Fig label={params.mode === 0 ? `小旗在 ${r.pair}` : params.mode === 1 ? `小旗在学校的${r.dir}方向` : `小旗在小猫的${r.relText}`}>
    {Array.from({ length: 9 }, (_, i) => <line key={`v${i}`} x1={x0 + i * c} y1={y0} x2={x0 + i * c} y2={y0 - 6 * c} stroke={C.line} />)}
    {Array.from({ length: 7 }, (_, j) => <line key={`h${j}`} x1={x0} y1={y0 - j * c} x2={x0 + 8 * c} y2={y0 - j * c} stroke={C.line} />)}
    {params.mode === 0 ? <>{Array.from({ length: 8 }, (_, i) => <Txt key={i} x={x0 + (i + 1) * c} y={y0 + 18} anchor="middle">{i + 1}</Txt>)}{Array.from({ length: 6 }, (_, j) => <Txt key={j} x={x0 - 12} y={y0 - (j + 1) * c + 4} anchor="middle">{j + 1}</Txt>)}<Txt x={x0 + 8 * c + 6} y={y0 + 18}>列</Txt><Txt x={x0 - 18} y={y0 - 6 * c - 6}>行</Txt></> : null}
    {params.mode === 1 ? <><Txt x={400} y={40} anchor="middle">北 ↑</Txt><rect x={o.x - 14} y={o.y - 10} width="28" height="20" fill={C.soft} stroke={C.ink} /><Txt x={o.x} y={o.y + 4} anchor="middle">校</Txt></> : null}
    {params.mode === 2 ? <><circle cx={o.x} cy={o.y} r="11" fill={C.gold} /><Txt x={o.x} y={o.y + 4} anchor="middle">猫</Txt></> : null}
    {reveal >= 1 ? <g><line x1={flag.x} y1={flag.y} x2={flag.x} y2={flag.y - 22} stroke={C.ink} strokeWidth="2" /><polygon points={`${flag.x},${flag.y - 22} ${flag.x + 16},${flag.y - 17} ${flag.x},${flag.y - 12}`} fill={C.red} /><circle cx={flag.x} cy={flag.y} r="3" fill={C.ink} /></g> : null}
    {reveal >= 3 && params.mode === 1 && (r.dx || r.dy) ? <path d={`M${o.x} ${o.y} H ${flag.x} V ${flag.y}`} fill="none" stroke={C.blue} strokeWidth="2.5" strokeDasharray="5 4" /> : null}
    {reveal >= 3 && params.mode === 0 ? <><line x1={flag.x} y1={flag.y} x2={flag.x} y2={y0} stroke={C.blue} strokeDasharray="4 3" /><line x1={x0} y1={flag.y} x2={flag.x} y2={flag.y} stroke={C.blue} strokeDasharray="4 3" /></> : null}
    {reveal >= 2 ? <Txt x={330} y={110} c="stage-result">{params.mode === 0 ? r.pair : params.mode === 1 ? `${r.dir}方向` : `在${r.relText}`}</Txt> : null}
  </Fig>;
}

/** 图形的运动 */
export function TransformStage(props: StageProps) {
  const { params } = props, r = transform(params), reveal = rv(props), c = 22, x0 = 20, y0 = 190;
  const cells = (list: [number, number][], fill: string, op = 1) => list.map(([x, y], i) => <rect key={`${fill}${i}`} x={x0 + x * c} y={y0 - (y + 1) * c} width={c} height={c} fill={fill} opacity={op} stroke={C.ink} />);
  return <Fig label={params.kind === 0 ? `向右平移 ${params.n} 格` : params.kind === 1 ? r.turnName : "画出轴对称图形"}>
    {Array.from({ length: 19 }, (_, i) => <line key={`v${i}`} x1={x0 + i * c} y1={y0} x2={x0 + i * c} y2={y0 - 8 * c} stroke={C.line} />)}
    {Array.from({ length: 9 }, (_, j) => <line key={`h${j}`} x1={x0} y1={y0 - j * c} x2={x0 + 18 * c} y2={y0 - j * c} stroke={C.line} />)}
    {params.kind === 2 && reveal >= 1 ? <line x1={x0 + r.axis * c} y1={y0 + 6} x2={x0 + r.axis * c} y2={y0 - 8 * c - 6} stroke={C.red} strokeWidth="2" strokeDasharray="6 4" /> : null}
    {cells(r.base, C.gold)}
    {params.kind === 1 && reveal >= 1 ? <circle cx={x0 + 2 * c} cy={y0 - c} r="4" fill={C.red} /> : null}
    {reveal >= 2 ? cells(r.moved, C.blue, 0.55) : null}
    {params.kind === 1 && reveal >= 2 ? <Txt x={x0 + 2 * c + 6} y={y0 - c + 16}>O</Txt> : null}
    {reveal >= 3 ? <Txt x={220} y={222} c="stage-result" anchor="middle">{params.kind === 0 ? `每个点都向右移动了 ${params.n} 格` : params.kind === 1 ? `${r.turnName}（示意），形状大小不变` : "对应点到对称轴的距离相等"}</Txt> : null}
  </Fig>;
}

/** 三角形 */
export function TriangleStage(props: StageProps) {
  const { params } = props, r = triangle(params), reveal = rv(props);
  const A = { x: 90, y: 180 }, B = { x: 350, y: 180 }, ra = (params.a * Math.PI) / 180, rb = (params.b * Math.PI) / 180;
  const t = (B.x - A.x) * Math.sin(rb) / Math.sin(ra + rb), Cp = { x: A.x + t * Math.cos(ra), y: A.y - t * Math.sin(ra) };
  const scale = Cp.y < 20 ? (A.y - 20) / (A.y - Cp.y) : 1, Cs = { x: A.x + (Cp.x - A.x) * scale, y: A.y - (A.y - Cp.y) * scale }, Bs = { x: A.x + (B.x - A.x) * scale, y: B.y };
  return <Fig label={`三个角是 ${params.a}°、${params.b}°、${r.c}°，是${r.kind}`}>
    <polygon points={`${A.x},${A.y} ${Bs.x},${Bs.y} ${Cs.x},${Cs.y}`} fill={C.soft} stroke={C.ink} strokeWidth="2" />
    <Txt x={A.x + 22} y={A.y - 6} fill={C.red}>{params.a}°</Txt><Txt x={Bs.x - 22} y={Bs.y - 6} anchor="end" fill={C.blue}>{params.b}°</Txt>
    <Txt x={Cs.x} y={Cs.y + 26} anchor="middle" fill={C.goldDark}>{reveal >= 3 ? `${r.c}°` : "?"}</Txt>
    {reveal >= 1 ? <g transform="translate(300 40)"><path d={`M-50 0 H 50`} stroke={C.ink} /><path d={`M0 0 L ${-40 * Math.cos(ra)} ${-40 * Math.sin(ra)}`} stroke={C.red} /><path d={`M0 0 L ${40 * Math.cos(Math.PI - rb - ra)} ${-40 * Math.sin(Math.PI - rb - ra)}`} stroke={C.blue} /><Txt x={0} y={18} anchor="middle" c="stage-hint">拼成平角 180°</Txt></g> : null}
    {reveal >= 4 ? <Txt x={220} y={214} c="stage-result" anchor="middle">{r.kind}{r.side ? `（${r.side}）` : ""}</Txt> : null}
  </Fig>;
}

/** 小数：百格图 / 竖式 */
export function DecimalStage(props: StageProps) {
  const { params } = props, r = decimal(params), reveal = rv(props);
  if (params.mode === 0) { const frac = params.a % 100, c = 15, x0 = 230, y0 = 30;
    return <Fig label={`${r.aText} 是 ${params.a} 个 0.01`}>
      {Array.from({ length: Math.min(r.ones, 6) }, (_, i) => <rect key={`w${i}`} x={20 + (i % 3) * 64} y={30 + Math.floor(i / 3) * 64} width="60" height="60" fill={C.gold} stroke={C.ink} />)}
      {r.ones ? <Txt x={20} y={176}>{r.ones} 个整 1</Txt> : null}
      {Array.from({ length: 100 }, (_, k) => <rect key={k} x={x0 + (k % 10) * c} y={y0 + Math.floor(k / 10) * c} width={c} height={c} fill={reveal >= 1 && k < frac ? (k < r.tenths * 10 ? C.blue : "#9fb7dd") : C.paper} stroke={C.line} />)}
      {reveal >= 2 ? <Txt x={x0 + 75} y={196} anchor="middle">{r.tenths} 个 0.1 + {r.hundredths} 个 0.01</Txt> : null}
      {reveal >= 3 ? <Txt x={220} y={222} c="stage-result" anchor="middle">{r.aText}　读作 {r.read}</Txt> : null}
    </Fig>; }
  const W = 7, right = 280, cw = 24, sign = params.mode === 1 ? "+" : "−";
  const row = (t: string, y: number, fill = C.ink) => { const [i, f = ""] = t.split("."); const s = `${i}.${f.padEnd(2, "0")}`; return s.split("").reverse().map((ch, k) => <Mono key={`${y}-${k}`} x={right - k * cw} y={y} size={24} fill={fill} anchor="middle">{ch}</Mono>); };
  return <Fig label={`${r.aText} ${sign} ${r.bText} = ${r.result}`}>
    {row(r.aText, 50)}{row(r.bText, 86)}<Mono x={right - W * cw + 40} y={86} size={22} anchor="middle">{sign}</Mono>
    <line x1={right - W * cw + 26} y1="98" x2={right + 16} y2="98" stroke={C.ink} strokeWidth="2" />
    {reveal >= 1 ? <line x1={right - 2 * cw} y1="24" x2={right - 2 * cw} y2="140" stroke={C.red} strokeDasharray="3 3" /> : null}
    {reveal >= 3 ? row(r.result, 130, C.blue) : null}
    {reveal >= 1 ? <Txt x={60} y={190} c="stage-hint">小数点对齐（红色虚线）</Txt> : null}
    {reveal >= 3 ? <Txt x={220} y={216} c="stage-result" anchor="middle">{r.aText} {sign} {r.bText} = {r.result}</Txt> : null}
  </Fig>;
}

/** 分类与整理：正字统计 */
export function TallyStage(props: StageProps) {
  const { params } = props, r = tally(params), reveal = rv(props);
  const icon = (i: number, x: number, y: number) => i === 0 ? <circle cx={x} cy={y} r="7" fill={C.gold} /> : i === 1 ? <ellipse cx={x} cy={y} rx="9" ry="6" fill="#b9c3cc" /> : <path d={`M${x} ${y - 8} q 7 9 0 14 q -7 -5 0 -14`} fill={C.blue} />;
  return <Fig label={`晴天 ${params.c0}、阴天 ${params.c1}、雨天 ${params.c2}，共 ${r.total} 天`}>
    {r.counts.map((n, i) => <g key={i}>
      <Txt x={20} y={46 + i * 52}>{TALLY_NAMES[i]}</Txt>
      {Array.from({ length: n }, (_, k) => <g key={k}>{icon(i, (reveal >= 1 ? 80 : 80 + ((k * 37 + i * 61) % 140)) + (reveal >= 1 ? k * 14 : 0), 42 + i * 52)}</g>)}
      {reveal >= 2 ? <text x={300} y={48 + i * 52} fontSize="20" fill={C.red}>{tallyMarks(n)}</text> : null}
      {reveal >= 3 ? <Txt x={420} y={48 + i * 52} c="stage-result" anchor="end">{n}</Txt> : null}
    </g>)}
    {reveal >= 3 ? <Txt x={220} y={212} c="stage-result" anchor="middle">一共 {r.total} 天{reveal >= 4 && !r.same ? `，${r.maxName}最多` : ""}</Txt> : null}
  </Fig>;
}

/** 折线统计图 */
export function LineChartStage(props: StageProps) {
  const { params } = props, r = lineChart(params), reveal = rv(props), x0 = 60, y0 = 190, sx = 74, sy = 5;
  const pt = (i: number) => ({ x: x0 + 20 + i * sx, y: y0 - r.v[i] * sy });
  return <Fig label={`一周气温：${r.v.join("、")} ℃`}>
    {[0, 10, 20, 30].map((t) => <g key={t}><line x1={x0} y1={y0 - t * sy} x2={420} y2={y0 - t * sy} stroke={C.line} /><Txt x={x0 - 6} y={y0 - t * sy + 4} anchor="end">{t}</Txt></g>)}
    {WEEKDAYS.map((w, i) => <Txt key={w} x={pt(i).x} y={y0 + 18} anchor="middle">{w.slice(2)}</Txt>)}
    <Txt x={20} y={24}>℃</Txt>
    {reveal >= 1 ? r.v.map((_, i) => <circle key={i} cx={pt(i).x} cy={pt(i).y} r="4" fill={C.red} />) : null}
    {reveal >= 1 ? <polyline points={r.v.map((_, i) => `${pt(i).x},${pt(i).y}`).join(" ")} fill="none" stroke={C.red} strokeWidth="2" /> : null}
    {reveal >= 2 ? r.v.map((v, i) => <Txt key={`t${i}`} x={pt(i).x} y={pt(i).y - 8} anchor="middle">{v}</Txt>) : null}
    {reveal >= 4 && r.rise > 0 ? <line x1={pt(r.at).x} y1={pt(r.at).y} x2={pt(r.at + 1).x} y2={pt(r.at + 1).y} stroke={C.blue} strokeWidth="5" opacity=".6" /> : null}
  </Fig>;
}

/** 因数：拼长方形 */
export function FactorsStage(props: StageProps) {
  const { params } = props, r = factors(params), reveal = rv(props);
  const pairs = r.pairs.slice(-4);
  let x = 20;
  return <Fig label={`${params.n} 的因数：${r.list.join("、")}`}>
    {reveal >= 1 ? pairs.map(([a, b]) => { const c = Math.min(8, 150 / b, 110 / a), g = <g key={`${a}x${b}`} transform={`translate(${x} 20)`}>
      {Array.from({ length: a * b }, (_, k) => <rect key={k} x={(k % b) * c} y={Math.floor(k / b) * c} width={c} height={c} fill={C.soft} stroke={C.ink} strokeWidth="0.6" />)}
      <Txt x={0} y={a * c + 16}>{b} × {a}</Txt></g>; x += b * c + 22; return g; }) : null}
    {reveal >= 3 ? <Txt x={220} y={180} c="stage-result" anchor="middle">{params.n} 的因数：{r.list.join("、")}</Txt> : null}
    {reveal >= 3 ? <Txt x={220} y={210} c="stage-hint" anchor="middle">{r.prime ? "只有两个因数：质数" : "不止两个因数：合数"}</Txt> : null}
  </Fig>;
}

/** 长方体 */
export function CuboidStage(props: StageProps) {
  const { params } = props, r = cuboid(params), reveal = rv(props);
  const s = Math.min(24, 200 / (params.l + params.w * 0.6)), x0 = 60, y0 = 190, dx = s * 0.6, dy = s * 0.45;
  const L = params.l * s, H = params.h * s, Wx = params.w * dx, Wy = params.w * dy;
  return <Fig label={`长 ${params.l}、宽 ${params.w}、高 ${params.h} 厘米，体积 ${r.volume} 立方厘米`}>
    <polygon points={`${x0},${y0} ${x0 + L},${y0} ${x0 + L},${y0 - H} ${x0},${y0 - H}`} fill="#f2d48f" stroke={C.ink} />
    <polygon points={`${x0},${y0 - H} ${x0 + L},${y0 - H} ${x0 + L + Wx},${y0 - H - Wy} ${x0 + Wx},${y0 - H - Wy}`} fill="#fbecc4" stroke={C.ink} />
    <polygon points={`${x0 + L},${y0} ${x0 + L + Wx},${y0 - Wy} ${x0 + L + Wx},${y0 - H - Wy} ${x0 + L},${y0 - H}`} fill="#d9b25d" stroke={C.ink} />
    {reveal >= 4 ? <g stroke={C.ink} strokeWidth="0.5" opacity=".6">
      {Array.from({ length: params.l - 1 }, (_, i) => <line key={`a${i}`} x1={x0 + (i + 1) * s} y1={y0} x2={x0 + (i + 1) * s} y2={y0 - H} />)}
      {Array.from({ length: params.h - 1 }, (_, i) => <line key={`b${i}`} x1={x0} y1={y0 - (i + 1) * s} x2={x0 + L} y2={y0 - (i + 1) * s} />)}
    </g> : null}
    <Txt x={x0 + L / 2} y={y0 + 18} anchor="middle">长 {params.l}</Txt><Txt x={x0 - 6} y={y0 - H / 2} anchor="end">高 {params.h}</Txt><Txt x={x0 + L + Wx / 2 + 8} y={y0 - Wy / 2 + 10}>宽 {params.w}</Txt>
    {reveal >= 2 ? <Txt x={300} y={60}>棱长和 {r.edge} cm</Txt> : null}
    {reveal >= 3 ? <Txt x={300} y={90}>表面积 {r.area} cm²</Txt> : null}
    {reveal >= 4 ? <Txt x={300} y={120} c="stage-result">体积 {r.volume} cm³</Txt> : null}
  </Fig>;
}

const FracBar = ({ y, n, d, color, label }: { y: number; n: number; d: number; color: string; label: string }) => { const w = 300 / d; return <g>
  {Array.from({ length: d }, (_, i) => <rect key={i} x={110 + i * w} y={y} width={w} height="26" fill={i < n ? color : C.paper} stroke={C.ink} />)}
  <Txt x={100} y={y + 18} anchor="end">{label}</Txt></g>; };

/** 分数加减 */
export function FractionAddStage(props: StageProps) {
  const { params } = props, r = fractionAdd(params), reveal = rv(props);
  return <Fig label={`${params.n1}/${params.d1} ${r.sign} ${params.n2}/${params.d2} = ${r.result}`}>
    <FracBar y={20} n={params.n1} d={params.d1} color={C.red} label={`${params.n1}/${params.d1}`} />
    <FracBar y={56} n={params.n2} d={params.d2} color={C.blue} label={`${params.n2}/${params.d2}`} />
    {reveal >= 2 && !r.same ? <><FracBar y={104} n={r.m1} d={r.l} color={C.red} label={`${r.m1}/${r.l}`} /><FracBar y={140} n={r.m2} d={r.l} color={C.blue} label={`${r.m2}/${r.l}`} /></> : null}
    {reveal >= 3 ? <Txt x={220} y={198} c="stage-result" anchor="middle">{r.m1}/{r.l} {r.sign} {r.m2}/{r.l} = {r.rn}/{r.l}{reveal >= 4 && r.reduced ? ` = ${r.result}` : ""}</Txt> : null}
  </Fig>;
}

/** 分数除法 */
export function FractionDivStage(props: StageProps) {
  const { params } = props, r = fractionDiv(params), reveal = rv(props);
  return <Fig label={`${r.expr} = ${r.mul} = ${r.result}`}>
    <Txt x={220} y={34} c="stage-result" anchor="middle">{r.expr}</Txt>
    {params.mode !== 1 ? <FracBar y={56} n={params.n1} d={params.d1} color={C.gold} label={r.a} /> : <FracBar y={56} n={params.k} d={params.k} color={C.gold} label={r.a} />}
    {reveal >= 2 && params.mode === 0 ? <g>{Array.from({ length: params.k - 1 }, (_, i) => <line key={i} x1={110} x2={410} y1={56 + ((i + 1) * 26) / params.k} y2={56 + ((i + 1) * 26) / params.k} stroke={C.red} strokeDasharray="4 3" />)}<Txt x={220} y={104} c="stage-hint" anchor="middle">平均分成 {params.k} 份，取 1 份</Txt></g> : null}
    {reveal >= 2 && params.mode !== 0 ? <FracBar y={92} n={params.n2} d={params.d2} color={C.blue} label={r.b} /> : null}
    {reveal >= 3 ? <Txt x={220} y={150} anchor="middle">{r.b} 的倒数是 {r.recip}</Txt> : null}
    {reveal >= 4 ? <Txt x={220} y={190} c="stage-result" anchor="middle">{r.expr} = {r.mul} = {r.result}</Txt> : null}
  </Fig>;
}

/** 搭配 */
export function CombosStage(props: StageProps) {
  const { params } = props, r = combos(params), reveal = rv(props);
  if (params.mode === 1) return <Fig label={`能组成 ${r.total} 个两位数：${r.list.join("、")}`}>
    <Txt x={20} y={30}>数字：{Array.from({ length: params.a }, (_, i) => i + 1).join("　")}</Txt>
    {reveal >= 2 ? r.list.map((t, i) => <g key={t}><rect x={20 + (i % 6) * 68} y={50 + Math.floor(i / 6) * 44} width="56" height="32" rx="6" fill={i < (reveal >= 3 ? 99 : params.a - 1) ? C.soft : C.paper} stroke={C.ink} /><Txt x={48 + (i % 6) * 68} y={72 + Math.floor(i / 6) * 44} anchor="middle" c="stage-result">{t}</Txt></g>) : null}
    {reveal >= 3 ? <Txt x={220} y={200} c="stage-result" anchor="middle">{params.a} × {params.a - 1} = {r.total}（个）</Txt> : null}
  </Fig>;
  if (params.mode === 2) { const pts = Array.from({ length: params.a }, (_, i) => ({ x: 150 + 80 * Math.cos((2 * Math.PI * i) / params.a - Math.PI / 2), y: 105 + 80 * Math.sin((2 * Math.PI * i) / params.a - Math.PI / 2) }));
    return <Fig label={`${params.a} 人每两人握一次手，共 ${r.total} 次`}>
      {reveal >= 2 ? pts.flatMap((p, i) => pts.slice(i + 1).map((q, j) => <line key={`${i}-${j}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={C.blue} />)) : null}
      {pts.map((p, i) => <g key={i}><circle cx={p.x} cy={p.y} r="13" fill={C.gold} stroke={C.ink} /><Txt x={p.x} y={p.y + 4} anchor="middle">{i + 1}</Txt></g>)}
      {reveal >= 3 ? <Txt x={330} y={110} c="stage-result" anchor="middle">{params.a} × {params.a - 1} ÷ 2 = {r.total}</Txt> : null}
    </Fig>; }
  const shirts = Array.from({ length: params.a }, (_, i) => ({ x: 60, y: 30 + i * (170 / params.a) })), pants = Array.from({ length: params.b }, (_, i) => ({ x: 260, y: 30 + i * (170 / params.b) }));
  return <Fig label={`${params.a} 件上衣、${params.b} 条裤子，共 ${r.total} 种穿法`}>
    {shirts.map((s, i) => pants.map((p, j) => (reveal >= 3 || (reveal >= 2 && i === 0)) ? <line key={`${i}-${j}`} x1={s.x + 30} y1={s.y + 12} x2={p.x} y2={p.y + 12} stroke={C.blue} /> : null))}
    {shirts.map((s, i) => <g key={`s${i}`}><path d={`M${s.x} ${s.y} h30 l6 8 -6 4 v14 h-30 v-14 l-6 -4 z`} fill={[C.red, C.gold, C.blue, "#7c5aa6", C.goldDark][i]} stroke={C.ink} /></g>)}
    {pants.map((p, j) => <g key={`p${j}`}><path d={`M${p.x} ${p.y} h26 v26 h-10 v-14 h-6 v14 h-10 z`} fill={["#5a6d8c", "#8c6b4a", "#4a7c59", "#999"][j]} stroke={C.ink} /></g>)}
    {reveal >= 3 ? <Txt x={370} y={110} c="stage-result" anchor="middle">{params.a} × {params.b} = {r.total}</Txt> : null}
  </Fig>;
}

/** 鸡兔同笼 */
export function ChickenRabbitStage(props: StageProps) {
  const { params } = props, r = chickenRabbit(params), reveal = rv(props), per = Math.min(10, params.heads), cw = 40;
  return <Fig label={`鸡 ${r.chickens} 只，兔 ${params.rabbits} 只，共 ${r.legs} 只脚`}>
    {Array.from({ length: params.heads }, (_, i) => { const x = 30 + (i % per) * cw, y = 40 + Math.floor(i / per) * 70, rabbit = reveal >= 3 && i >= r.chickens;
      return <g key={i}>
        <circle cx={x + 14} cy={y} r="12" fill={rabbit ? "#e9e2d6" : C.gold} stroke={C.ink} />
        {rabbit ? <><ellipse cx={x + 9} cy={y - 16} rx="3" ry="8" fill="#e9e2d6" stroke={C.ink} /><ellipse cx={x + 19} cy={y - 16} rx="3" ry="8" fill="#e9e2d6" stroke={C.ink} /></> : <polygon points={`${x + 24},${y} ${x + 32},${y + 3} ${x + 24},${y + 5}`} fill={C.red} />}
        {[0, 1, ...(rabbit ? [2, 3] : [])].map((k) => <line key={k} x1={x + 6 + k * 5} y1={y + 12} x2={x + 6 + k * 5} y2={y + 26} stroke={rabbit && k > 1 ? C.red : C.ink} strokeWidth="2" />)}
      </g>; })}
    {reveal >= 2 ? <Txt x={20} y={190} c="stage-hint">假设全是鸡：{params.heads} × 2 = {r.allChicken} 只脚，少了 {r.short} 只</Txt> : null}
    {reveal >= 3 ? <Txt x={20} y={214} c="stage-result">兔 {r.short} ÷ 2 = {params.rabbits} 只，鸡 {r.chickens} 只</Txt> : null}
  </Fig>;
}

/** 植树问题 */
export function TreePlantStage(props: StageProps) {
  const { params } = props, r = treePlant(params), reveal = rv(props);
  const tree = (x: number, y: number, k: string) => <g key={k}><rect x={x - 2} y={y - 6} width="4" height="12" fill="#8c6b4a" /><circle cx={x} cy={y - 14} r="9" fill="#5c9a5a" /></g>;
  if (params.ends === 3) { const cx = 220, cy = 110, R = 70; return <Fig label={`围成一圈，${r.seg} 个间隔，种 ${r.trees} 棵`}>
    <circle cx={cx} cy={cy} r={R} fill={C.soft} stroke={C.ink} />
    {reveal >= 1 ? Array.from({ length: r.trees }, (_, i) => tree(cx + R * Math.cos((2 * Math.PI * i) / r.trees), cy + R * Math.sin((2 * Math.PI * i) / r.trees) + 10, `t${i}`)) : null}
    {reveal >= 3 ? <Txt x={220} y={214} c="stage-result" anchor="middle">{r.seg} 个间隔，{r.trees} 棵树</Txt> : null}
  </Fig>; }
  const x0 = 30, w = 380, step = w / r.seg;
  return <Fig label={`${r.seg} 个间隔，${ENDS_LABEL[params.ends]}，种 ${r.trees} 棵`}>
    <line x1={x0} y1="120" x2={x0 + w} y2="120" stroke={C.ink} strokeWidth="3" />
    {Array.from({ length: r.seg + 1 }, (_, i) => <line key={i} x1={x0 + i * step} y1="114" x2={x0 + i * step} y2="126" stroke={C.ink} />)}
    {reveal >= 2 ? Array.from({ length: r.seg }, (_, i) => <Txt key={`g${i}`} x={x0 + (i + 0.5) * step} y={146} anchor="middle" c="stage-hint">{r.seg <= 12 ? params.gap : ""}</Txt>) : null}
    {reveal >= 1 ? Array.from({ length: r.seg + 1 }, (_, i) => (params.ends === 0 || (params.ends === 1 && i < r.seg) || (params.ends === 2 && i > 0 && i < r.seg)) ? tree(x0 + i * step, 110, `t${i}`) : null) : null}
    <Txt x={220} y={40} anchor="middle">全长 {params.len} 米，每隔 {params.gap} 米</Txt>
    {reveal >= 3 ? <Txt x={220} y={196} c="stage-result" anchor="middle">{r.seg} 个间隔，种 {r.trees} 棵</Txt> : null}
  </Fig>;
}
const ENDS_LABEL = ["两端都种", "只种一端", "两端都不种", "围成一圈"];

/** 找次品：天平 */
export function OddOneStage(props: StageProps) {
  const { params } = props, r = oddOne(params), reveal = rv(props);
  const pile = (n: number, x: number, y: number, k: string) => <g key={k}>{Array.from({ length: n }, (_, i) => <circle key={i} cx={x + (i % 5) * 12} cy={y - Math.floor(i / 5) * 12} r="5" fill={C.gold} stroke={C.ink} />)}<Txt x={x + 24} y={y + 34} anchor="middle">{n} 个</Txt></g>;
  return <Fig label={`${params.n} 个零件，最少称 ${r.k} 次`}>
    <line x1="220" y1="150" x2="220" y2="70" stroke={C.ink} strokeWidth="3" /><line x1="110" y1="70" x2="330" y2="70" stroke={C.ink} strokeWidth="3" />
    <line x1="110" y1="70" x2="110" y2="100" stroke={C.ink} /><line x1="330" y1="70" x2="330" y2="100" stroke={C.ink} />
    <path d="M70 100 h80 l-10 12 h-60 z" fill={C.soft} stroke={C.ink} /><path d="M290 100 h80 l-10 12 h-60 z" fill={C.soft} stroke={C.ink} />
    <rect x="200" y="150" width="40" height="8" fill={C.ink} />
    {reveal >= 2 ? <>{pile(r.groups[0], 86, 94, "a")}{pile(r.groups[1], 306, 94, "b")}{r.groups[2] ? pile(r.groups[2], 196, 196, "c") : null}</> : pile(params.n, 196, 196, "all")}
    {reveal >= 4 ? <Txt x={220} y={30} c="stage-result" anchor="middle">最少称 {r.k} 次</Txt> : null}
  </Fig>;
}

/** 集合：两个圈 */
export function VennStage(props: StageProps) {
  const { params } = props, r = venn(params), reveal = rv(props);
  return <Fig label={`只跳绳 ${r.onlyA}，两项都参加 ${params.both}，只踢毽 ${r.onlyB}，共 ${r.total} 人`}>
    <circle cx="170" cy="110" r="80" fill={C.red} opacity=".18" stroke={C.red} /><circle cx="270" cy="110" r="80" fill={C.blue} opacity=".18" stroke={C.blue} />
    <Txt x={120} y={24} anchor="middle">跳绳 {params.a} 人</Txt><Txt x={320} y={24} anchor="middle">踢毽 {params.b} 人</Txt>
    {reveal >= 2 ? <Txt x={220} y={116} c="stage-result" anchor="middle">{params.both}</Txt> : null}
    {reveal >= 3 ? <><Txt x={135} y={116} c="stage-result" anchor="middle">{r.onlyA}</Txt><Txt x={305} y={116} c="stage-result" anchor="middle">{r.onlyB}</Txt></> : null}
    {reveal >= 4 ? <Txt x={220} y={216} c="stage-result" anchor="middle">{params.a} + {params.b} − {params.both} = {r.total}（人）</Txt> : null}
  </Fig>;
}

/** 数字编码：身份证号 */
export function IdCodeStage(props: StageProps) {
  const { params } = props, r = idCode(params), reveal = rv(props);
  const seg = (i: number) => (i < 6 ? 0 : i < 14 ? 1 : i < 17 ? 2 : 3), colors = ["#dfe8f5", "#fbecc4", "#e5eed9", "#f3d9d3"], names = ["地址码", "出生日期码", "顺序码", "校验码"];
  return <Fig label={`身份证号码示意：出生日期 ${r.date}，第 17 位 ${r.g}`}>
    {r.code.split("").map((ch, i) => <g key={i}><rect x={14 + i * 23} y="50" width="21" height="34" fill={reveal >= seg(i) + 1 ? colors[seg(i)] : C.paper} stroke={C.ink} /><text x={24.5 + i * 23} y="73" textAnchor="middle" fontSize="15" fill={i === 16 && reveal >= 4 ? C.red : C.ink}>{ch}</text></g>)}
    {names.map((n, k) => reveal >= k + 1 ? <Txt key={n} x={[14 + 3 * 23, 14 + 10 * 23, 14 + 15.5 * 23, 14 + 17.5 * 23][k]} y={k % 2 ? 110 : 130} anchor="middle">{n}</Txt> : null)}
    {reveal >= 3 ? <Txt x={220} y={176} c="stage-result" anchor="middle">{params.year} 年 {params.month} 月 {params.day} 日出生</Txt> : null}
    {reveal >= 4 ? <Txt x={220} y={204} anchor="middle">第 17 位 {r.g}：{params.gender === 0 ? "单数，男" : "双数，女"}</Txt> : null}
    <Txt x={220} y={24} c="stage-hint" anchor="middle">示意号码：地址码和校验码用 × 表示</Txt>
  </Fig>;
}

/** 数与形 */
export function SquareNumbersStage(props: StageProps) {
  const { params } = props, r = squareNumbers(params), reveal = rv(props);
  if (params.mode === 1) { const rects: ReactElement[] = []; let x = 120, y = 20, w = 180, h = 180;
    for (let i = 0; i < params.n; i++) { const vertical = i % 2 === 0, part = vertical ? { x, y, w: w / 2, h } : { x, y, w, h: h / 2 };
      rects.push(<rect key={i} x={part.x} y={part.y} width={part.w} height={part.h} fill={reveal >= 2 || i === 0 ? [C.red, C.gold, C.blue, "#7c5aa6", C.goldDark, "#5c9a5a", "#d9574a", "#999"][i] : C.paper} opacity=".7" stroke={C.ink} />);
      if (vertical) { x += w / 2; w /= 2; } else { y += h / 2; h /= 2; } }
    return <Fig label={`${r.list} = ${r.result}`}><rect x="120" y="20" width="180" height="180" fill={C.paper} stroke={C.ink} />{rects}{reveal >= 3 ? <Txt x={220} y={222} c="stage-result" anchor="middle">= 1 − 1/{r.last} = {r.result}</Txt> : null}</Fig>; }
  const c = Math.min(22, 180 / params.n);
  return <Fig label={`${r.list} = ${r.result}`}>
    {Array.from({ length: params.n * params.n }, (_, k) => { const i = k % params.n, j = Math.floor(k / params.n), layer = Math.max(i, j);
      return <rect key={k} x={40 + i * c} y={200 - (j + 1) * c} width={c} height={c} fill={reveal >= 2 ? [C.red, C.gold, C.blue, "#7c5aa6", C.goldDark, "#5c9a5a", "#d9574a", "#999"][layer % 8] : C.soft} stroke={C.paper} />; })}
    {reveal >= 2 ? <Txt x={260} y={80}>{r.list}</Txt> : null}
    {reveal >= 3 ? <Txt x={260} y={120} c="stage-result">= {params.n} × {params.n} = {r.result}</Txt> : null}
  </Fig>;
}

/** 优化：烙饼 */
export function OptimizeStage(props: StageProps) {
  const { params } = props, r = optimize(params), reveal = rv(props);
  // 偶数张两张一组；奇数张最后 3 张用“轮换”烙法，3 次烙完
  const plan: string[][] = [];
  if (params.cakes === 1) plan.push(["1 正"], ["1 反"]);
  else {
    const paired = params.cakes % 2 ? params.cakes - 3 : params.cakes;
    for (let i = 0; i < paired; i += 2) plan.push([`${i + 1} 正`, `${i + 2} 正`], [`${i + 1} 反`, `${i + 2} 反`]);
    if (params.cakes % 2) { const [a, b, c] = [params.cakes - 2, params.cakes - 1, params.cakes]; plan.push([`${a} 正`, `${b} 正`], [`${a} 反`, `${c} 正`], [`${b} 反`, `${c} 反`]); }
  }
  return <Fig label={`烙 ${params.cakes} 张饼最少 ${r.time} 分钟`}>
    {plan.slice(0, 9).map((pan, i) => <g key={i} opacity={reveal >= 3 || i < 1 ? 1 : 0.35}>
      <circle cx={40 + i * 46} cy="90" r="20" fill="#555" /><Txt x={40 + i * 46} y={60} anchor="middle" c="stage-hint">第 {i + 1} 次</Txt>
      {pan.map((s, k) => <text key={k} x={40 + i * 46} y={86 + k * 12} textAnchor="middle" fontSize="10" fill="#fff">{s}</text>)}
    </g>)}
    {reveal >= 4 ? <Txt x={220} y={170} c="stage-result" anchor="middle">{r.rounds} 次 × 3 分 = {r.time} 分</Txt> : null}
  </Fig>;
}

/** 找规律 */
export function PatternStage(props: StageProps) {
  const { params } = props, r = pattern(params), reveal = rv(props);
  const item = (t: string, x: number, k: string, ghost = false) => <g key={k} opacity={ghost ? 0.9 : 1}>
    {t === "红" || t === "黄" ? <circle cx={x} cy="90" r="18" fill={t === "红" ? C.red : C.gold} stroke={ghost ? C.ink : "none"} strokeDasharray={ghost ? "4 3" : undefined} />
      : t === "○" ? <circle cx={x} cy="90" r="16" fill="none" stroke={C.ink} strokeWidth="2.5" /> : t === "△" ? <polygon points={`${x},72 ${x + 17},104 ${x - 17},104`} fill="none" stroke={C.ink} strokeWidth="2.5" />
        : <Txt x={x} y={98} c="stage-result" anchor="middle">{t}</Txt>}
  </g>;
  const n = r.seq.length, gap = 340 / (n + 1);
  return <Fig label={`${r.seq.join("、")}，下一个是 ${r.next}`}>
    {r.seq.map((t, i) => item(t, 50 + i * gap, `i${i}`))}
    {reveal >= 2 && params.kind !== 2 ? Array.from({ length: Math.floor(n / r.group.length) }, (_, g) => <rect key={g} x={50 + g * r.group.length * gap - gap / 2 + 4} y="62" width={r.group.length * gap - 8} height="56" rx="10" fill="none" stroke={C.blue} strokeDasharray="5 4" />) : null}
    {reveal >= 2 && params.kind === 2 ? r.seq.slice(1).map((_, i) => <Txt key={`s${i}`} x={50 + (i + 0.5) * gap} y={60} anchor="middle" fill={C.blue}>+{params.step}</Txt>) : null}
    {reveal >= 3 ? item(r.next, 50 + n * gap, "next", true) : <Txt x={50 + n * gap} y={98} c="stage-result" anchor="middle">?</Txt>}
  </Fig>;
}

/** 推理：表格 */
export function LogicStage(props: StageProps) {
  const { params } = props, r = logic(params), reveal = rv(props), cw = 90, x0 = 110, y0 = 50;
  const known = (who: number, item: number) => { const step = reveal >= 4 ? 3 : reveal - 1; const order = r.order.slice(0, Math.max(0, step)); return order.includes(who) || order.some((w) => r.answer[w] === item) ? (r.answer[who] === item ? "√" : "×") : ""; };
  return <Fig label={r.pairs.join("，")}>
    {r.items.map((it, j) => <Txt key={it} x={x0 + j * cw + cw / 2} y={y0 - 12} anchor="middle">{it}</Txt>)}
    {PEOPLE.map((who, i) => <g key={who}><Txt x={x0 - 12} y={y0 + i * 40 + 26} anchor="end">{who}</Txt>
      {r.items.map((_, j) => { const m = known(i, j); return <g key={j}><rect x={x0 + j * cw} y={y0 + i * 40} width={cw} height="40" fill={m === "√" ? C.soft : C.paper} stroke={C.ink} /><Txt x={x0 + j * cw + cw / 2} y={y0 + i * 40 + 27} c="stage-result" anchor="middle" fill={m === "×" ? C.red : undefined}>{m}</Txt></g>; })}
    </g>)}
    <Txt x={20} y={200} c="stage-hint">{r.clues.join(" ")}</Txt>
  </Fig>;
}
