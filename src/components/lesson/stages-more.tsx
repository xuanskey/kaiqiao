import { useEffect, useState, type ReactElement } from "react";
import { SHAPES, chanceWord, clock, fmtSigned, lineRelation, numberLine, percent, pigeonhole, rmb, ruler, scale, water } from "@/lib/lesson/demos";
import type { StageProps } from "./stages-math";
import { useSvgDrag } from "./svg-drag";

const C = { ink: "#285847", leaf: "#456e40", soft: "#e5eed9", line: "#cad9bc", gold: "#dfbd76", goldDark: "#bf9d50", red: "#c8553d", blue: "#4b6fa8", paper: "#fffdf7" };

/** 浏览器自带的安全随机数，用于真实的随机试验。 */
function randomInt(n: number): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; }
  return Math.floor(Math.random() * n);
}

function ShapeIcon({ name, x, y, size = 34 }: { name: string; x: number; y: number; size?: number }) {
  const h = size / 2;
  switch (name) {
    case "三角形": return <polygon points={`${x},${y - h} ${x - h},${y + h} ${x + h},${y + h}`} fill="#f4e2b5" stroke={C.ink} strokeWidth="2" />;
    case "正方形": return <rect x={x - h} y={y - h} width={size} height={size} fill="#d9e7c7" stroke={C.ink} strokeWidth="2" />;
    case "长方形": return <rect x={x - h * 1.4} y={y - h * 0.7} width={size * 1.4} height={size * 0.7} fill="#dbe7f5" stroke={C.ink} strokeWidth="2" />;
    case "圆": return <circle cx={x} cy={y} r={h} fill="#f6d0c6" stroke={C.ink} strokeWidth="2" />;
    case "长方体": return <g fill="#dbe7f5" stroke={C.ink} strokeWidth="1.6"><rect x={x - h * 1.3} y={y - h * 0.4} width={size * 1.1} height={size * 0.75} /><path d={`M${x - h * 1.3} ${y - h * 0.4} l${h * 0.6} ${-h * 0.6} h${size * 1.1} l${-h * 0.6} ${h * 0.6}z`} fill="#eef3fa" /><path d={`M${x + h * 0.9} ${y - h * 0.4} l${h * 0.6} ${-h * 0.6} v${size * 0.75} l${-h * 0.6} ${h * 0.6}z`} fill="#c7d6ea" /></g>;
    case "正方体": return <g fill="#d9e7c7" stroke={C.ink} strokeWidth="1.6"><rect x={x - h} y={y - h * 0.6} width={size * 0.8} height={size * 0.8} /><path d={`M${x - h} ${y - h * 0.6} l${h * 0.5} ${-h * 0.5} h${size * 0.8} l${-h * 0.5} ${h * 0.5}z`} fill="#eaf2e0" /><path d={`M${x + h * 0.6} ${y - h * 0.6} l${h * 0.5} ${-h * 0.5} v${size * 0.8} l${-h * 0.5} ${h * 0.5}z`} fill="#c6d9b3" /></g>;
    case "圆柱": return <g fill="#f4e2b5" stroke={C.ink} strokeWidth="1.6"><rect x={x - h * 0.8} y={y - h * 0.7} width={size * 0.8} height={size * 0.9} stroke="none" /><line x1={x - h * 0.8} y1={y - h * 0.7} x2={x - h * 0.8} y2={y + h * 1.1} /><line x1={x + h * 0.8} y1={y - h * 0.7} x2={x + h * 0.8} y2={y + h * 1.1} /><ellipse cx={x} cy={y + h * 1.1} rx={h * 0.8} ry={h * 0.3} /><ellipse cx={x} cy={y - h * 0.7} rx={h * 0.8} ry={h * 0.3} fill="#fbefd1" /></g>;
    default: return <g><circle cx={x} cy={y} r={h} fill="#f6d0c6" stroke={C.ink} strokeWidth="2" /><ellipse cx={x - h * 0.3} cy={y - h * 0.35} rx={h * 0.3} ry={h * 0.18} fill="#fff" opacity=".7" /></g>;
  }
}

/** 一年级：认识图形，拖进对应的格子 */
export function ShapesStage({ params, scene, interactive }: StageProps) {
  const list = SHAPES[(params.kind === 1 ? 1 : 0) as 0 | 1];
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const items = list.flatMap((x) => [x.name, x.name]);
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const [drag, setDrag] = useState<{ i: number; x: number; y: number } | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  useEffect(() => { setPlaced({}); setWrong(null); }, [params.kind, interactive]);
  const binX = (b: number) => 55 + b * 110;
  const handlers = useSvgDrag((p) => setDrag((d) => (d ? { ...d, ...p } : d)), (p) => {
    if (!drag) return;
    const bin = list.findIndex((_, b) => Math.abs(p.x - binX(b)) < 52 && p.y > 140);
    if (bin >= 0) {
      if (list[bin].name === items[drag.i]) { setPlaced((pl) => ({ ...pl, [drag.i]: bin })); setWrong(null); }
      else setWrong(`${items[drag.i]}不是${list[bin].name}，再看看它的样子。`);
    }
    setDrag(null);
  });
  const done = Object.keys(placed).length === items.length;
  return <figure className="stage"><svg viewBox="0 0 440 250" role="img" aria-label={`把${params.kind ? "立体" : "平面"}图形分一分：${list.map((x) => x.name).join("、")}`} {...(interactive ? { onPointerMove: handlers.onPointerMove, onPointerUp: handlers.onPointerUp, onPointerCancel: handlers.onPointerCancel } : {})}>
    {list.map((x, b) => <g key={x.name}><rect x={binX(b) - 50} y="150" width="100" height="90" rx="10" fill={reveal >= b + 2 ? "#f3f7ec" : "#fafbf7"} stroke={reveal === b + 2 ? C.goldDark : C.line} strokeWidth={reveal === b + 2 ? 3 : 1.5} /><text x={binX(b)} y="234" textAnchor="middle" className="stage-label">{x.name}</text>
      {items.map((n, i) => (interactive ? placed[i] === b : reveal >= b + 2 && n === x.name) ? <ShapeIcon key={i} name={n} x={binX(b) + (i % 2 ? 22 : -22)} y={190} size={28} /> : null)}</g>)}
    {items.map((n, i) => {
      const inBin = interactive ? placed[i] !== undefined : reveal >= list.findIndex((x) => x.name === n) + 2;
      if (inBin || (reveal < 1 && !interactive)) return null;
      const x = 35 + i * 52, y = 70;
      const isDrag = drag?.i === i;
      return <g key={i} style={interactive ? { cursor: "grab", touchAction: "none" } : undefined} onPointerDown={interactive ? (e) => { setDrag({ i, x, y }); handlers.onPointerDown(e); } : undefined}>
        <ShapeIcon name={n} x={isDrag ? drag.x : x} y={isDrag ? drag.y : y} />
      </g>;
    })}
    <text x="220" y="22" textAnchor="middle" className={done ? "stage-result" : "stage-hint"}>{interactive ? (done ? "全部分对了！" : wrong ?? "把上面的图形拖进下面对应的格子") : ""}</text>
  </svg></figure>;
}

function Note({ value, x, y }: { value: number; x: number; y: number }) {
  const coin = value === 1;
  const color = value >= 50 ? "#4f8a6e" : value >= 20 ? "#a8774f" : value >= 10 ? "#4b6fa8" : value >= 5 ? "#8a5fa8" : "#c9a640";
  return coin ? <g transform={`translate(${x} ${y})`}><circle r="14" fill="#e8d9a8" stroke="#a88a3a" strokeWidth="2" /><text y="5" textAnchor="middle" fontSize="11">1元</text></g>
    : <g transform={`translate(${x} ${y})`}><rect x="-30" y="-15" width="60" height="30" rx="4" fill={color} opacity=".85" /><text y="5" textAnchor="middle" fill="#fff" fontSize="13">{value} 元</text></g>;
}

/** 一年级：欢乐购物街 */
export function RmbStage({ params, scene, interactive, setParam }: StageProps) {
  const r = rmb(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const goods = ["✏️", "📒", "🧸", "⚽", "🎒"];
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`商品 ${params.price} 元，付 ${r.pay} 元，找回 ${r.change} 元`}>
    {reveal >= 1 ? <g><rect x="30" y="30" width="120" height="110" rx="12" fill={C.soft} stroke={C.line} /><text x="90" y="85" textAnchor="middle" fontSize="40">{goods[params.price % goods.length]}</text><text x="90" y="128" textAnchor="middle" className="stage-result">{params.price} 元</text></g> : null}
    {reveal >= 2 ? <g><text x="250" y="45" textAnchor="middle" className="stage-label">付钱</text><Note value={r.pay} x={250} y={75} /></g> : null}
    {reveal >= 3 ? <text x="250" y="125" textAnchor="middle" className="stage-label">{`${r.pay} − ${params.price} = ${r.change}`}</text> : null}
    {reveal >= 4 ? <g><text x="220" y="160" textAnchor="middle" className="stage-label">找回</text>{(() => { const out: ReactElement[] = []; let i = 0; for (const part of r.parts) for (let k = 0; k < part.count; k++) { out.push(<Note key={`${part.note}-${k}`} value={part.note} x={60 + i * 68} y={195} />); i++; } return out.length ? out : <text x="220" y="200" textAnchor="middle" className="stage-label">正好，不用找钱</text>; })()}</g> : null}
    {interactive ? <foreignObject x="300" y="20" width="135" height="110"><div className="stage-buttons" style={{ flexDirection: "column" }}>{[5, 10, 20, 50].map((n, i) => <button key={n} type="button" disabled={n < params.price} aria-pressed={params.pay === i} onClick={() => setParam("pay", i)}>付 {n} 元</button>)}</div></foreignObject> : null}
  </svg></figure>;
}

/** 二年级：用尺子量长度（可拖动铅笔） */
export function RulerStage({ params, scene, interactive, setParam }: StageProps) {
  const r = ruler(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const unit = 30, x0 = 40, y = 140;
  const handlers = useSvgDrag((p) => setParam("start", Math.round(Math.min(5, Math.max(0, (p.x - x0) / unit)))));
  const px = x0 + params.start * unit, pw = params.len * unit;
  return <figure className="stage"><svg viewBox="0 0 440 220" role="img" aria-label={`铅笔左端对着 ${params.start}，右端对着 ${r.end}，长 ${r.length} 厘米`}>
    <rect x={x0 - 10} y={y} width={unit * 12 + 20} height="46" rx="4" fill="#fbf3dc" stroke={C.goldDark} />
    {Array.from({ length: 121 }, (_, i) => <line key={i} x1={x0 + i * unit / 10} y1={y} x2={x0 + i * unit / 10} y2={y + (i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6)} stroke="#6b5a2a" strokeWidth={i % 10 === 0 ? 1.4 : 0.6} />)}
    {Array.from({ length: 13 }, (_, i) => <text key={i} x={x0 + i * unit} y={y + 32} textAnchor="middle" fontSize="12" fill="#6b5a2a">{i}</text>)}
    <text x={x0 + unit * 12 + 4} y={y + 44} fontSize="10" fill="#6b5a2a">厘米</text>
    <g {...(interactive ? handlers : {})} style={interactive ? { cursor: "grab", touchAction: "none" } : undefined}>
      <rect x={px} y={y - 34} width={pw - 16} height="22" fill="#f2c94c" stroke="#a8780a" />
      <polygon points={`${px + pw - 16},${y - 34} ${px + pw},${y - 23} ${px + pw - 16},${y - 12}`} fill="#f6dfb0" stroke="#a8780a" />
      <rect x={px} y={y - 34} width="10" height="22" fill="#e48b8b" />
    </g>
    {reveal >= 1 ? <line x1={px} y1={y - 40} x2={px} y2={y + 18} stroke={C.red} strokeDasharray="3 3" /> : null}
    {reveal >= 2 ? <line x1={px + pw} y1={y - 40} x2={px + pw} y2={y + 18} stroke={C.red} strokeDasharray="3 3" /> : null}
    {reveal >= 3 ? <text x="220" y="40" textAnchor="middle" className="stage-result">{params.start ? `${r.end} − ${params.start} = ${r.length} 厘米` : `${r.length} 厘米`}</text> : interactive ? <text x="220" y="40" textAnchor="middle" className="stage-hint">左右拖动铅笔</text> : null}
  </svg></figure>;
}

/** 二年级：拖动分针认识时间 */
export function ClockStage({ params, scene, interactive, setParam }: StageProps) {
  const r = clock(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const cx = 140, cy = 115, R = 92;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const handlers = useSvgDrag((p) => {
    let a = (Math.atan2(p.x - cx, cy - p.y) * 180) / Math.PI; if (a < 0) a += 360;
    const m = (Math.round(a / 30) * 5) % 60;
    setParam("m", m);
  });
  const mEnd = { x: cx + 72 * Math.sin(rad(r.minuteAngle)), y: cy - 72 * Math.cos(rad(r.minuteAngle)) };
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`钟面显示 ${r.text}`}>
    <circle cx={cx} cy={cy} r={R} fill={C.paper} stroke={C.ink} strokeWidth="3" />
    {Array.from({ length: 60 }, (_, i) => <line key={i} x1={cx + (R - (i % 5 ? 5 : 10)) * Math.sin(rad(i * 6))} y1={cy - (R - (i % 5 ? 5 : 10)) * Math.cos(rad(i * 6))} x2={cx + R * Math.sin(rad(i * 6))} y2={cy - R * Math.cos(rad(i * 6))} stroke="#8aa07a" strokeWidth={i % 5 ? 0.8 : 2} />)}
    {Array.from({ length: 12 }, (_, i) => <text key={i} x={cx + 72 * Math.sin(rad((i + 1) * 30))} y={cy - 72 * Math.cos(rad((i + 1) * 30)) + 5} textAnchor="middle" fontSize="15" fill={C.ink}>{i + 1}</text>)}
    <line x1={cx} y1={cy} x2={cx + 48 * Math.sin(rad(r.hourAngle))} y2={cy - 48 * Math.cos(rad(r.hourAngle))} stroke={C.ink} strokeWidth={reveal === 2 ? 9 : 7} strokeLinecap="round" />
    <line x1={cx} y1={cy} x2={mEnd.x} y2={mEnd.y} stroke={C.goldDark} strokeWidth={reveal === 3 ? 6 : 4} strokeLinecap="round" />
    <circle cx={cx} cy={cy} r="5" fill={C.ink} />
    {interactive ? <circle cx={mEnd.x} cy={mEnd.y} r="14" fill={C.gold} fillOpacity=".7" stroke={C.goldDark} strokeWidth="2" style={{ cursor: "grab", touchAction: "none" }} {...handlers} /> : null}
    <rect x="270" y="80" width="140" height="56" rx="10" fill="#24402a" />
    <text x="340" y="117" textAnchor="middle" fill="#ffe7a3" fontSize="26" fontFamily="monospace">{r.digital}</text>
    {reveal >= 4 || interactive ? <text x="340" y="165" textAnchor="middle" className="stage-result">{r.text}</text> : null}
    {interactive ? <text x="340" y="195" textAnchor="middle" className="stage-hint">拖动黄色圆点转分针</text> : null}
  </svg></figure>;
}

/** 四年级：旋转直线看平行与垂直 */
export function ParallelStage({ params, scene, interactive, setParam }: StageProps) {
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const rel = lineRelation(params.deg);
  const cx = 220, cy = 120;
  const rad = (params.deg * Math.PI) / 180;
  const dx = Math.cos(rad), dy = -Math.sin(rad);
  const handlers = useSvgDrag((p) => { let a = (Math.atan2(cy + 30 - p.y, p.x - cx) * 180) / Math.PI; if (a < 0) a += 180; setParam("deg", Math.round(a / 5) * 5 % 181); });
  const offset = rel === "平行" ? -40 : 30;
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`两条直线夹角 ${params.deg} 度，${rel}`}>
    <line x1="20" y1={cy + 30} x2="420" y2={cy + 30} stroke={C.ink} strokeWidth="3" />
    <line x1={cx - 210 * dx} y1={cy + offset - 210 * dy} x2={cx + 210 * dx} y2={cy + offset + 210 * dy} stroke={rel === "相交" ? C.blue : C.red} strokeWidth="3" />
    {rel === "互相垂直" && reveal >= 3 ? <path d={`M${cx + 14} ${cy + 30} v-14 h-14`} fill="none" stroke={C.red} strokeWidth="2" /> : null}
    {interactive ? <circle cx={cx + 150 * dx} cy={cy + offset + 150 * dy} r="14" fill={C.gold} fillOpacity=".7" stroke={C.goldDark} strokeWidth="2" style={{ cursor: "grab", touchAction: "none" }} {...handlers} /> : null}
    {reveal >= 3 ? <text x="20" y="218" className="stage-result">{rel === "相交" ? `相交，夹角 ${Math.min(params.deg, 180 - params.deg)}°` : rel}</text> : null}
  </svg></figure>;
}

/** 五年级：真实随机摸球试验 */
export function ChanceStage({ params, scene, interactive }: StageProps) {
  const w = chanceWord(params.red, params.white);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const [tally, setTally] = useState({ red: 0, white: 0 });
  useEffect(() => setTally({ red: 0, white: 0 }), [params.red, params.white]);
  const total = params.red + params.white;
  const draw = (n: number) => setTally((t) => { let red = t.red, white = t.white; for (let i = 0; i < n; i++) { if (randomInt(total) < params.red) red++; else white++; } return { red, white }; });
  const n = tally.red + tally.white;
  const barMax = Math.max(1, tally.red, tally.white);
  return <figure className="stage"><svg viewBox="0 0 440 240" role="img" aria-label={`红球 ${params.red} 个，白球 ${params.white} 个；已摸 ${n} 次，红 ${tally.red} 次，白 ${tally.white} 次`}>
    <path d="M40 60 q60 -40 120 0 l-10 120 q-50 20 -100 0z" fill="#f4e2b5" stroke={C.goldDark} strokeWidth="2" />
    {Array.from({ length: total }, (_, i) => <circle key={i} cx={62 + (i % 5) * 19} cy={88 + Math.floor(i / 5) * 20} r="8" fill={i < params.red ? C.red : "#fff"} stroke="#999" />)}
    {reveal >= 2 ? <text x="100" y="215" textAnchor="middle" className="stage-label">红：{w.red}　白：{w.white}</text> : null}
    <g transform="translate(220 40)">
      <text x="0" y="0" className="stage-label">已摸 {n} 次</text>
      <rect x="0" y="20" width={n ? (170 * tally.red) / barMax : 0} height="26" fill={C.red} /><text x="0" y="64" className="stage-label">红 {tally.red} 次{n ? `（约 ${Math.round((100 * tally.red) / n)}%）` : ""}</text>
      <rect x="0" y="80" width={n ? (170 * tally.white) / barMax : 0} height="26" fill="#ddd" stroke="#999" /><text x="0" y="124" className="stage-label">白 {tally.white} 次{n ? `（约 ${Math.round((100 * tally.white) / n)}%）` : ""}</text>
    </g>
    {reveal >= 3 ? <text x="320" y="192" textAnchor="middle" className="stage-result" fontSize="14">{w.more}</text> : null}
    <foreignObject x="200" y="200" width="235" height="36"><div className="stage-buttons"><button type="button" onClick={() => draw(1)}>摸 1 次</button><button type="button" onClick={() => draw(10)}>摸 10 次</button><button type="button" onClick={() => draw(100)}>摸 100 次</button><button type="button" onClick={() => setTally({ red: 0, white: 0 })}>清空</button></div></foreignObject>
  </svg></figure>;
}

/** 六年级：数轴与负数（可拖动点） */
export function NumberLineStage({ params, scene, interactive, setParam }: StageProps) {
  const r = numberLine(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const x = (n: number) => 220 + n * 19, y = 120;
  const dragA = useSvgDrag((p) => setParam("a", Math.round(Math.max(-10, Math.min(10, (p.x - 220) / 19)))));
  const dragB = useSvgDrag((p) => setParam("b", Math.round(Math.max(-10, Math.min(10, (p.x - 220) / 19)))));
  return <figure className="stage"><svg viewBox="0 0 440 220" role="img" aria-label={`数轴上 ${fmtSigned(params.a)} 和 ${fmtSigned(params.b)}，${r.text}`}>
    {reveal >= 2 ? <><rect x={x(-10.5)} y={y - 12} width={19 * 10.5} height="24" fill="#dbe7f5" opacity=".6" /><rect x={x(0)} y={y - 12} width={19 * 10.5} height="24" fill="#f6d0c6" opacity=".5" /><text x={x(-5)} y={y + 46} textAnchor="middle" className="stage-label">负数</text><text x={x(5)} y={y + 46} textAnchor="middle" className="stage-label">正数</text></> : null}
    <line x1="10" y1={y} x2="428" y2={y} stroke={C.ink} strokeWidth="2.5" /><polygon points={`428,${y} 418,${y - 6} 418,${y + 6}`} fill={C.ink} />
    {Array.from({ length: 21 }, (_, i) => i - 10).map((n) => <g key={n}><line x1={x(n)} y1={y - 6} x2={x(n)} y2={y + 6} stroke={C.ink} strokeWidth={n === 0 ? 2.5 : 1} /><text x={x(n)} y={y + 24} textAnchor="middle" fontSize="11" fill={n === 0 ? C.red : C.ink}>{fmtSigned(n)}</text></g>)}
    {reveal >= 3 ? <g {...(interactive ? dragA : {})} style={interactive ? { cursor: "grab", touchAction: "none" } : undefined}><circle cx={x(params.a)} cy={y} r="10" fill={C.blue} /><text x={x(params.a)} y={y - 18} textAnchor="middle" className="stage-label">{fmtSigned(params.a)}</text></g> : null}
    {reveal >= 3 ? <g {...(interactive ? dragB : {})} style={interactive ? { cursor: "grab", touchAction: "none" } : undefined}><circle cx={x(params.b)} cy={y} r="10" fill={C.goldDark} /><text x={x(params.b)} y={y - 18} textAnchor="middle" className="stage-label">{fmtSigned(params.b)}</text></g> : null}
    {reveal >= 4 ? <text x="220" y="40" textAnchor="middle" className="stage-result">{r.text}</text> : interactive ? <text x="220" y="40" textAnchor="middle" className="stage-hint">拖动两个点</text> : null}
  </svg></figure>;
}

/** 六年级：打折购物 */
export function PercentStage({ params, scene, interactive }: StageProps) {
  const r = percent(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const w = 340;
  return <figure className="stage"><svg viewBox="0 0 440 210" role="img" aria-label={`原价 ${r.price} 元打 ${params.zhe} 折，现价 ${r.sale} 元`}>
    <text x="50" y="40" className="stage-label">原价 {r.price} 元（100%）</text>
    <rect x="50" y="50" width={w} height="34" fill="#eef3e6" stroke={C.ink} />
    {Array.from({ length: 10 }, (_, i) => <line key={i} x1={50 + (w / 10) * i} y1="50" x2={50 + (w / 10) * i} y2="84" stroke={C.line} />)}
    {reveal >= 2 ? <rect x="50" y="50" width={(w * params.zhe) / 10} height="34" fill={C.gold} opacity=".85" style={{ transition: "width .4s" }} /> : null}
    {reveal >= 2 ? <text x={50 + (w * params.zhe) / 20} y="72" textAnchor="middle" fontSize="13">{params.zhe} 折 = {r.pct}%</text> : null}
    {reveal >= 3 ? <text x="220" y="125" textAnchor="middle" className="stage-label">{`${r.price} × ${r.pct}% = ${r.sale}（元）`}</text> : null}
    {reveal >= 4 ? <text x="220" y="165" textAnchor="middle" className="stage-result">现价 {r.sale} 元，便宜 {r.saved} 元</text> : null}
  </svg></figure>;
}

/** 六年级：鸽巢问题（可随机放） */
export function PigeonholeStage({ params, scene, interactive }: StageProps) {
  const r = pigeonhole(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const even = Array.from({ length: params.boxes }, (_, i) => r.q + (i < r.r ? 1 : 0));
  const [counts, setCounts] = useState<number[] | null>(null);
  useEffect(() => setCounts(null), [params.items, params.boxes]);
  const shown = counts ?? (reveal >= 2 ? even : Array(params.boxes).fill(0));
  const shuffle = () => { const c = Array(params.boxes).fill(0); for (let i = 0; i < params.items; i++) c[randomInt(params.boxes)]++; setCounts(c); };
  const bw = Math.min(90, 400 / params.boxes);
  const max = Math.max(...shown);
  return <figure className="stage"><svg viewBox="0 0 440 240" role="img" aria-label={`${params.items} 个苹果放进 ${params.boxes} 个抽屉，最多的抽屉有 ${max} 个，至少 ${r.atLeast} 个`}>
    {shown.map((c, i) => { const x = 20 + i * (bw + 4); return <g key={i}><rect x={x} y="80" width={bw} height="110" rx="6" fill={c === max && (counts || reveal >= 4) ? "#fbefd1" : C.soft} stroke={C.ink} strokeWidth="1.5" />
      {Array.from({ length: c }, (_, k) => <circle key={k} cx={x + 12 + (k % Math.max(1, Math.floor((bw - 8) / 16))) * 16} cy={176 - Math.floor(k / Math.max(1, Math.floor((bw - 8) / 16))) * 16} r="6.5" fill={C.red} />)}
      <text x={x + bw / 2} y="208" textAnchor="middle" className="stage-label">{c} 个</text></g>; })}
    {counts ? <text x="220" y="40" textAnchor="middle" className="stage-result">这次最多的抽屉有 {max} 个，{max >= r.atLeast ? `确实不少于 ${r.atLeast} 个` : "（不可能出现）"}</text>
      : reveal >= 4 ? <text x="220" y="40" textAnchor="middle" className="stage-result">总有一个抽屉至少 {r.atLeast} 个</text> : null}
    <foreignObject x="120" y="212" width="200" height="28"><div className="stage-buttons"><button type="button" onClick={shuffle}>随便放一次</button><button type="button" onClick={() => setCounts(null)}>平均放</button></div></foreignObject>
  </svg></figure>;
}

/** 六年级：比例尺（拖动图上距离） */
export function ScaleStage({ params, scene, interactive, setParam }: StageProps) {
  const r = scale(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const unit = 18, x0 = 30, y = 120;
  const handlers = useSvgDrag((p) => setParam("cm", Math.round(Math.max(1, Math.min(20, (p.x - x0) / unit)))));
  return <figure className="stage"><svg viewBox="0 0 440 220" role="img" aria-label={`比例尺 1∶${r.denom}，图上 ${params.cm} 厘米，实际 ${r.text}`}>
    <rect x="10" y="40" width="420" height="130" rx="8" fill="#f0f5ea" stroke={C.line} />
    <circle cx={x0} cy={y} r="8" fill={C.blue} /><text x={x0} y={y - 16} textAnchor="middle" className="stage-label">学校</text>
    <line x1={x0} y1={y} x2={x0 + params.cm * unit} y2={y} stroke={C.red} strokeWidth="3" strokeDasharray="6 4" />
    <g {...(interactive ? handlers : {})} style={interactive ? { cursor: "grab", touchAction: "none" } : undefined}><circle cx={x0 + params.cm * unit} cy={y} r={interactive ? 12 : 8} fill={C.goldDark} /><text x={x0 + params.cm * unit} y={y - 16} textAnchor="middle" className="stage-label">公园</text></g>
    {reveal >= 1 ? <g><line x1="30" y1="155" x2={30 + unit} y2="155" stroke={C.ink} strokeWidth="3" /><text x={36 + unit} y="159" fontSize="11" fill={C.ink}>1 厘米 = 实际 {r.denom >= 100000 ? `${r.denom / 100000} 千米` : `${r.denom / 100} 米`}</text></g> : null}
    {reveal >= 2 ? <text x={x0 + (params.cm * unit) / 2} y={y + 22} textAnchor="middle" className="stage-label">图上 {params.cm} 厘米</text> : null}
    {reveal >= 3 ? <text x="220" y="26" textAnchor="middle" className="stage-result">实际距离 {r.text}</text> : null}
  </svg></figure>;
}

/** 中年级科学：水的三态 */
export function WaterStage({ params, scene, interactive, setParam }: StageProps) {
  const r = water(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const level = 30 + ((params.t + 20) / 140) * 140;
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`${fmtSigned(params.t)} ℃，${r.state}`}>
    <rect x="60" y="20" width="16" height="170" rx="8" fill="#fff" stroke="#999" />
    <rect x="63" y={190 - level} width="10" height={level} rx="5" fill={C.red} />
    <circle cx="68" cy="198" r="14" fill={C.red} />
    {[-20, 0, 50, 100].map((t) => <g key={t}><line x1="80" y1={190 - (30 + ((t + 20) / 140) * 140)} x2="90" y2={190 - (30 + ((t + 20) / 140) * 140)} stroke="#555" /><text x="94" y={194 - (30 + ((t + 20) / 140) * 140)} fontSize="11">{fmtSigned(t)}℃</text></g>)}
    <g transform="translate(260 120)">
      <path d="M-70 -50 v100 q0 14 14 14 h112 q14 0 14 -14 v-100" fill="none" stroke="#7a8a8a" strokeWidth="3" />
      {r.state === "冰" ? <rect x="-50" y="-10" width="100" height="56" rx="6" fill="#d8eefa" stroke="#9cc8e0" /> : null}
      {r.state === "冰水混合" ? <><rect x="-66" y="10" width="132" height="50" fill="#bfe1f5" /><rect x="-40" y="-6" width="40" height="30" rx="4" fill="#e8f6fd" stroke="#9cc8e0" /><rect x="10" y="0" width="34" height="26" rx="4" fill="#e8f6fd" stroke="#9cc8e0" /></> : null}
      {r.state === "水" || r.state === "沸腾" ? <rect x="-66" y="0" width="132" height="60" fill="#bfe1f5" /> : null}
      {r.state === "沸腾" ? Array.from({ length: 8 }, (_, i) => <circle key={i} cx={-50 + i * 14} cy={40 - (i % 3) * 14} r="4" fill="#fff" opacity=".9" />) : null}
      {r.state === "沸腾" || r.state === "水蒸气" ? Array.from({ length: 4 }, (_, i) => <path key={i} d={`M${-40 + i * 26} -60 q8 -14 0 -28 q-8 -14 0 -28`} fill="none" stroke="#cfd8dc" strokeWidth="4" strokeLinecap="round" />) : null}
    </g>
    {reveal >= 3 ? <text x="300" y="30" textAnchor="middle" className="stage-result">{r.state}（{r.phase}）</text> : null}
    {interactive ? <foreignObject x="120" y="196" width="300" height="32"><label className="stage-slider">温度：<input type="range" min="-20" max="120" value={params.t} onChange={(e) => setParam("t", Number(e.target.value))} aria-label="温度" /><b>{fmtSigned(params.t)}℃</b></label></foreignObject> : null}
  </svg></figure>;
}
