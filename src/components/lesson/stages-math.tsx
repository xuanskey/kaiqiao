import { useEffect, useMemo, useState } from "react";
import { addSub, angleKind, balance, circle, cylinder, decimalMul, fraction, groupShare, law, perimeterArea, type Params } from "@/lib/lesson/demos";
import { useSvgDrag } from "./svg-drag";

export type StageProps = {
  params: Params;
  scene: Record<string, number>;
  /** 学生自己动手模式：允许拖动、点击 */
  interactive: boolean;
  setParam: (key: string, value: number) => void;
  reduceMotion: boolean;
};

const C = { ink: "#285847", leaf: "#456e40", soft: "#e5eed9", line: "#cad9bc", gold: "#dfbd76", goldDark: "#bf9d50", red: "#c8553d", paper: "#fffdf7" };

function Apple({ x, y, faded, onPointerDown }: { x: number; y: number; faded?: boolean; onPointerDown?: (e: React.PointerEvent<SVGGElement>) => void }) {
  return <g transform={`translate(${x} ${y})`} opacity={faded ? 0.25 : 1} onPointerDown={onPointerDown} style={onPointerDown ? { cursor: "grab", touchAction: "none" } : undefined}>
    <circle r="13" fill={C.red} />
    <path d="M0 -13 q3 -8 9 -9" stroke={C.leaf} strokeWidth="3" fill="none" strokeLinecap="round" />
    {faded ? <path d="M-14 -14 L14 14" stroke="#555" strokeWidth="3" /> : null}
  </g>;
}

const slot = (i: number, cx: number, cy: number) => ({ x: cx - 52 + (i % 5) * 26, y: cy - 16 + Math.floor(i / 5) * 30 });

/** 一年级：拖动苹果理解加减法 */
export function AddSubStage({ params, scene, interactive }: StageProps) {
  const r = addSub(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const [moved, setMoved] = useState(0);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => { setMoved(0); setDrag(null); }, [params.a, params.b, params.op, interactive]);
  const isAdd = params.op === 0;
  const done = interactive ? moved >= params.b : reveal >= 3;
  const handlers = useSvgDrag((p) => setDrag(p), (p) => {
    setDrag(null);
    if (isAdd ? p.x < 220 : p.x > 330) setMoved((m) => Math.min(params.b, m + 1));
  });
  const leftCount = isAdd ? params.a + (interactive ? moved : done ? params.b : 0) : params.a;
  return <figure className="stage">
    <svg viewBox="0 0 440 210" role="img" aria-label={isAdd ? `左盘 ${params.a} 个苹果，右盘 ${params.b} 个，合起来 ${r.result} 个` : `原来 ${params.a} 个苹果，拿走 ${params.b} 个，还剩 ${r.result} 个`} {...(interactive ? { onPointerMove: handlers.onPointerMove, onPointerUp: handlers.onPointerUp, onPointerCancel: handlers.onPointerCancel } : {})}>
      <ellipse cx="110" cy="120" rx="100" ry="62" fill={C.soft} stroke={C.line} strokeWidth="2" />
      <ellipse cx="330" cy="120" rx="100" ry="62" fill={isAdd ? C.soft : "#f4efe2"} stroke={C.line} strokeWidth="2" strokeDasharray={isAdd ? undefined : "6 5"} />
      <text x="110" y="200" textAnchor="middle" className="stage-label">{isAdd ? "第一盘" : "篮子"}</text>
      <text x="330" y="200" textAnchor="middle" className="stage-label">{isAdd ? "第二盘" : "拿走的放这里"}</text>
      {isAdd ? <>
        {Array.from({ length: leftCount }, (_, i) => { const s = slot(i, 110, 112); return reveal >= 1 || i >= params.a ? <Apple key={`l${i}`} {...s} /> : null; })}
        {Array.from({ length: params.b - (interactive ? moved : done ? params.b : 0) }, (_, i) => { const s = slot(i, 330, 112); return reveal >= 2 ? <Apple key={`r${i}`} {...s} onPointerDown={interactive && i === params.b - moved - 1 ? handlers.onPointerDown : undefined} /> : null; })}
      </> : <>
        {Array.from({ length: params.a }, (_, i) => {
          const removedCount = interactive ? moved : reveal >= 2 ? params.b : 0;
          const removed = i >= params.a - removedCount;
          if (removed) { const s = slot(i - (params.a - removedCount), 330, 112); return <Apple key={i} {...s} faded />; }
          const s = slot(i, 110, 112);
          return reveal >= 1 ? <Apple key={i} {...s} onPointerDown={interactive && i === params.a - moved - 1 && moved < params.b ? handlers.onPointerDown : undefined} /> : null;
        })}
      </>}
      {drag ? <Apple x={drag.x} y={drag.y} /> : null}
      {done ? <text x="220" y="30" textAnchor="middle" className="stage-result">{r.expr}</text> : <text x="220" y="30" textAnchor="middle" className="stage-hint">{interactive ? (isAdd ? `把右边的苹果拖到左边（还剩 ${params.b - moved} 个）` : `拖走 ${params.b - moved} 个苹果`) : ""}</text>}
    </svg>
  </figure>;
}

/** 二年级：分组与平均分 */
export function GroupShareStage({ params, scene, interactive }: StageProps) {
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const [dealt, setDealt] = useState(0);
  useEffect(() => setDealt(0), [params.total, params.groups, params.mode, interactive]);
  if (params.mode === 0) {
    const r = groupShare(params);
    const cols = Math.min(params.groups, 5);
    const w = 440 / cols;
    return <figure className="stage"><svg viewBox={`0 0 440 ${params.groups > 5 ? 250 : 150}`} role="img" aria-label={`${params.groups} 盘，每盘 ${params.each} 个`}>
      {Array.from({ length: params.groups }, (_, g) => {
        const cx = w * (g % cols) + w / 2, cy = 70 + Math.floor(g / cols) * 105;
        const show = reveal >= 2 || (reveal >= 1 && g === 0);
        return show ? <g key={g}><ellipse cx={cx} cy={cy} rx={Math.min(40, w / 2 - 4)} ry="32" fill={C.soft} stroke={C.line} />
          {Array.from({ length: params.each }, (_, i) => <circle key={i} cx={cx - 18 + (i % 3) * 18} cy={cy - 16 + Math.floor(i / 3) * 16} r="6.5" fill={C.red} />)}</g> : null;
      })}
      {reveal >= 3 ? <text x="220" y="22" textAnchor="middle" className="stage-result">{r.expr}</text> : null}
    </svg></figure>;
  }
  const r = groupShare(params) as { quotient: number; remainder: number; expr: string };
  const rounds = interactive ? dealt : reveal >= 3 ? r.quotient : 0;
  const left = params.total - rounds * params.groups;
  const kidW = 440 / params.groups;
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`${params.total} 块饼干平均分给 ${params.groups} 人`}>
    {reveal >= 1 ? Array.from({ length: left }, (_, i) => <circle key={i} cx={20 + (i % 20) * 21} cy={22 + Math.floor(i / 20) * 20} r="8" fill={C.gold} stroke={C.goldDark} />) : null}
    {reveal >= 2 ? Array.from({ length: params.groups }, (_, k) => <g key={k}>
      <circle cx={kidW * k + kidW / 2} cy="120" r="16" fill="#f6d9b8" stroke={C.goldDark} />
      <text x={kidW * k + kidW / 2} y="125" textAnchor="middle" fontSize="13">{k + 1}</text>
      {Array.from({ length: rounds }, (_, i) => <circle key={i} cx={kidW * k + kidW / 2 - 12 + (i % 3) * 12} cy={150 + Math.floor(i / 3) * 12} r="5" fill={C.gold} stroke={C.goldDark} />)}
    </g>) : null}
    {interactive ? <foreignObject x="0" y="196" width="440" height="34"><div className="stage-buttons">
      <button type="button" disabled={left < params.groups} onClick={() => setDealt((d) => d + 1)}>每人分一块</button>
      <button type="button" onClick={() => setDealt(0)}>收回重分</button>
    </div></foreignObject> : null}
    {(interactive ? left < params.groups : reveal >= 4) ? <text x="220" y="100" textAnchor="middle" className="stage-result">{r.expr}</text> : null}
  </svg></figure>;
}

/** 三年级：分数（点一块就涂到这一块） */
export function FractionStage({ params, scene, interactive, setParam }: StageProps) {
  const r = fraction(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const n = params.parts, k = reveal >= 4 ? params.shaded : 0;
  const divided = reveal >= 2;
  const pick = (i: number) => { if (interactive) setParam("shaded", params.shaded === i + 1 ? i : i + 1); };
  return <figure className="stage"><svg viewBox="0 0 440 220" role="img" aria-label={`平均分成 ${n} 份，涂色 ${params.shaded} 份，是 ${r.text}`}>
    {params.shape === 1 ? (() => {
      const cx = 220, cy = 112, R = 90;
      if (!divided) return <circle cx={cx} cy={cy} r={R} fill={C.paper} stroke={C.ink} strokeWidth="2" />;
      return Array.from({ length: n }, (_, i) => {
        const a0 = (i / n) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
        const d = `M${cx} ${cy} L${cx + R * Math.cos(a0)} ${cy + R * Math.sin(a0)} A${R} ${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${cx + R * Math.cos(a1)} ${cy + R * Math.sin(a1)} Z`;
        return <path key={i} d={d} fill={i < k ? C.gold : C.paper} stroke={C.ink} strokeWidth="1.5" onClick={() => pick(i)} style={interactive ? { cursor: "pointer" } : undefined} className={reveal === 3 && i === 0 ? "stage-pulse" : undefined} />;
      });
    })() : (() => {
      const x0 = 30, w = 380, h = 70, y = 70;
      if (!divided) return <rect x={x0} y={y} width={w} height={h} fill={C.paper} stroke={C.ink} strokeWidth="2" rx="4" />;
      return Array.from({ length: n }, (_, i) => <rect key={i} x={x0 + (w / n) * i} y={y} width={w / n} height={h} fill={i < k ? C.gold : C.paper} stroke={C.ink} strokeWidth="1.5" onClick={() => pick(i)} style={interactive ? { cursor: "pointer" } : undefined} className={reveal === 3 && i === 0 ? "stage-pulse" : undefined} />);
    })()}
    {reveal >= 3 && params.shape !== 1 ? <text x="220" y="170" textAnchor="middle" className="stage-label">每份是 {r.unit}</text> : null}
    {reveal >= 4 ? <text x="220" y={params.shape === 1 ? 214 : 205} textAnchor="middle" className="stage-result">涂色部分 {r.text}</text> : null}
    {interactive ? <text x="220" y="30" textAnchor="middle" className="stage-hint">点一点格子来涂色</text> : null}
  </svg></figure>;
}

/** 三年级：周长与面积 */
export function PerimeterAreaStage({ params, scene, interactive, reduceMotion }: StageProps) {
  const r = perimeterArea(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const unit = Math.min(300 / params.l, 150 / params.w, 34);
  const W = params.l * unit, H = params.w * unit, x0 = (440 - W) / 2, y0 = 30 + (160 - H) / 2;
  const perim = 2 * (W + H);
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`长 ${params.l} 厘米，宽 ${params.w} 厘米，周长 ${r.perimeter} 厘米，面积 ${r.area} 平方厘米`}>
    {reveal >= 3 ? Array.from({ length: params.l * params.w }, (_, i) => <rect key={i} x={x0 + (i % params.l) * unit} y={y0 + Math.floor(i / params.l) * unit} width={unit} height={unit} fill="#d9e7c7" stroke="#9ab184" strokeWidth="1" style={reduceMotion ? undefined : { animation: `stage-fade .3s ${Math.min(i * 0.02, 1.5)}s both` }} />) : null}
    <rect x={x0} y={y0} width={W} height={H} fill="none" stroke={C.ink} strokeWidth="2" />
    {reveal >= 2 ? <rect x={x0} y={y0} width={W} height={H} fill="none" stroke={C.red} strokeWidth="4" strokeDasharray={perim} strokeDashoffset={reduceMotion ? 0 : undefined} style={reduceMotion ? undefined : { animation: "stage-draw 1.8s ease forwards", ["--len" as string]: perim }} /> : null}
    <text x={x0 + W / 2} y={y0 - 8} textAnchor="middle" className="stage-label">{params.l} 厘米</text>
    <text x={x0 - 8} y={y0 + H / 2} textAnchor="end" className="stage-label">{params.w} 厘米</text>
    <text x="220" y="222" textAnchor="middle" className="stage-result">{reveal >= 2 ? `周长 ${r.perimeter} 厘米` : ""}{reveal >= 3 ? `　面积 ${r.area} 平方厘米` : ""}</text>
  </svg></figure>;
}

/** 四年级：拖动角的一边，用量角器读数 */
export function AngleStage({ params, scene, interactive, setParam }: StageProps) {
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const cx = 220, cy = 190, R = 150;
  const deg = params.deg;
  const rad = (deg * Math.PI) / 180;
  const end = { x: cx + R * Math.cos(rad), y: cy - R * Math.sin(rad) };
  const handlers = useSvgDrag((p) => {
    let a = (Math.atan2(cy - p.y, p.x - cx) * 180) / Math.PI;
    if (a < 0) a = a < -90 ? 180 : 0;
    setParam("deg", Math.round(Math.min(180, Math.max(0, a))));
  });
  return <figure className="stage"><svg viewBox="0 0 440 215" role="img" aria-label={`角的度数 ${deg} 度，是${angleKind(deg)}`}>
    {reveal >= 2 ? <g>
      <path d={`M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy} Z`} fill="#f3f7ec" stroke={C.line} />
      {Array.from({ length: 181 }, (_, d) => {
        const a = (d * Math.PI) / 180, len = d % 10 === 0 ? 14 : d % 5 === 0 ? 9 : 5;
        return <line key={d} x1={cx + R * Math.cos(a)} y1={cy - R * Math.sin(a)} x2={cx + (R - len) * Math.cos(a)} y2={cy - (R - len) * Math.sin(a)} stroke="#8aa07a" strokeWidth={d % 10 === 0 ? 1.4 : 0.7} />;
      })}
      {Array.from({ length: 19 }, (_, i) => { const d = i * 10, a = (d * Math.PI) / 180; return <g key={d}>
        <text x={cx + (R - 26) * Math.cos(a)} y={cy - (R - 26) * Math.sin(a) + 4} textAnchor="middle" className="protractor-in">{d}</text>
        <text x={cx + (R - 44) * Math.cos(a)} y={cy - (R - 44) * Math.sin(a) + 4} textAnchor="middle" className="protractor-out">{180 - d}</text>
      </g>; })}
      <circle cx={cx} cy={cy} r="4" fill={C.red} />
    </g> : null}
    <line x1={cx} y1={cy} x2={cx + R + 10} y2={cy} stroke={C.ink} strokeWidth={reveal === 3 ? 5 : 3} strokeLinecap="round" />
    <line x1={cx} y1={cy} x2={cx + (R + 10) * Math.cos(rad)} y2={cy - (R + 10) * Math.sin(rad)} stroke={C.ink} strokeWidth="3" strokeLinecap="round" />
    {deg > 0 ? <path d={`M${cx + 30} ${cy} A30 30 0 0 0 ${cx + 30 * Math.cos(rad)} ${cy - 30 * Math.sin(rad)}`} fill="none" stroke={C.goldDark} strokeWidth="3" /> : null}
    {interactive ? <circle cx={end.x} cy={end.y} r="16" fill={C.gold} fillOpacity="0.7" stroke={C.goldDark} strokeWidth="2" style={{ cursor: "grab", touchAction: "none" }} {...handlers} /> : null}
    {reveal >= 4 ? <text x="20" y="28" className="stage-result">{deg}° · {angleKind(deg)}</text> : null}
    {interactive ? <text x="420" y="28" textAnchor="end" className="stage-hint">拖动黄色圆点</text> : null}
  </svg></figure>;
}

/** 四年级：用长方形面积理解乘法分配律 */
export function LawStage({ params, scene, interactive }: StageProps) {
  const r = law(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const unit = Math.min(360 / (params.b + params.c), 150 / params.a);
  const x0 = (440 - unit * (params.b + params.c)) / 2, y0 = 40;
  const wb = unit * params.b, wc = unit * params.c, h = unit * params.a;
  const split = reveal >= 3;
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`${params.a}×(${params.b}+${params.c}) = ${params.a}×${params.b}+${params.a}×${params.c} = ${r.left}`}>
    <rect x={x0} y={y0} width={wb} height={h} fill="#d9e7c7" stroke={C.ink} strokeWidth="2" />
    <rect x={x0 + wb + (split ? 14 : 0)} y={y0} width={wc} height={h} fill={split ? "#f4e2b5" : "#d9e7c7"} stroke={C.ink} strokeWidth="2" style={{ transition: "x .5s" }} />
    <text x={x0 + wb / 2} y={y0 - 8} textAnchor="middle" className="stage-label">{params.b}</text>
    <text x={x0 + wb + (split ? 14 : 0) + wc / 2} y={y0 - 8} textAnchor="middle" className="stage-label">{params.c}</text>
    <text x={x0 - 10} y={y0 + h / 2} textAnchor="end" className="stage-label">{params.a}</text>
    {split ? <><text x={x0 + wb / 2} y={y0 + h / 2 + 5} textAnchor="middle" className="stage-label">{r.ab}</text><text x={x0 + wb + 14 + wc / 2} y={y0 + h / 2 + 5} textAnchor="middle" className="stage-label">{r.ac}</text></> : reveal >= 2 ? <text x={x0 + (wb + wc) / 2} y={y0 + h / 2 + 5} textAnchor="middle" className="stage-label">{r.left}</text> : null}
    <text x="220" y="222" textAnchor="middle" className="stage-result">{reveal >= 2 ? `${params.a}×(${params.b}+${params.c}) = ${r.left}` : ""}{split ? `　${params.a}×${params.b}+${params.a}×${params.c} = ${r.right}` : ""}</text>
  </svg></figure>;
}

/** 五年级：小数乘小数，小数点移动 */
export function DecimalMulStage({ params, scene, interactive }: StageProps) {
  const r = decimalMul(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const digits = r.raw.replace(".", "");
  return <figure className="stage stage-html" aria-label={`${r.aText}×${r.bText}=${r.product}`}>
    <div className="dec-row"><span className="dec-card">{r.aText}</span><b>×</b><span className="dec-card">{r.bText}</span><b>=</b><span className="dec-card dec-answer">{reveal >= 5 ? r.product : "?"}</span></div>
    {reveal >= 2 ? <div className="dec-row dec-small"><span>×10 → {params.a}</span><span>×10 → {params.b}</span></div> : null}
    {reveal >= 3 ? <div className="dec-row"><span className="dec-card">{params.a}</span><b>×</b><span className="dec-card">{params.b}</span><b>=</b><span className="dec-card">{r.intProduct}</span></div> : null}
    {reveal >= 4 ? <div className="dec-digits" aria-hidden="true">{digits.split("").map((d, i) => <span key={i}>{d}{i === digits.length - 3 ? <i className="dec-point">.</i> : null}</span>)}<small>从右往左数 2 位，点上小数点</small></div> : null}
  </figure>;
}

/** 五年级：天平与方程；动手模式可以猜 x，天平会倾斜 */
export function BalanceStage({ params, scene, interactive }: StageProps) {
  const r = balance(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const [guess, setGuess] = useState(1);
  useEffect(() => setGuess(1), [params.a, params.b, params.x]);
  const removed = !interactive && reveal >= 2;
  const leftMass = interactive ? params.a * guess + params.b : params.a * params.x + (removed ? 0 : params.b);
  const rightMass = interactive ? r.c : removed ? r.afterSub : r.c;
  const tilt = Math.max(-12, Math.min(12, (rightMass - leftMass) * 1.5));
  const boxes = reveal >= 4 && !interactive ? 1 : params.a;
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`方程 ${r.eq}`}>
    <polygon points="220,200 200,225 240,225" fill={C.ink} />
    <line x1="220" y1="200" x2="220" y2="70" stroke={C.ink} strokeWidth="4" />
    <g transform={`rotate(${tilt} 220 70)`} style={{ transition: "transform .5s" }}>
      <line x1="60" y1="70" x2="380" y2="70" stroke={C.ink} strokeWidth="5" strokeLinecap="round" />
      <g transform="translate(100 70)">
        <line x1="0" y1="0" x2="0" y2="40" stroke="#888" /><path d="M-62 40 h124 l-12 14 h-100z" fill={C.soft} stroke={C.line} />
        {Array.from({ length: boxes }, (_, i) => <g key={i} transform={`translate(${-54 + i * 22} 12)`}><rect width="20" height="26" rx="3" fill={C.leaf} /><text x="10" y="18" textAnchor="middle" fill="#fff" fontSize="12">x</text></g>)}
        {!removed ? <g transform={`translate(${-50 + params.a * 22} 18)`}><rect width="30" height="20" rx="3" fill={C.gold} stroke={C.goldDark} /><text x="15" y="15" textAnchor="middle" fontSize="11">{params.b}g</text></g> : null}
      </g>
      <g transform="translate(340 70)">
        <line x1="0" y1="0" x2="0" y2="40" stroke="#888" /><path d="M-62 40 h124 l-12 14 h-100z" fill={C.soft} stroke={C.line} />
        <g transform="translate(-24 16)"><rect width="48" height="22" rx="3" fill={C.gold} stroke={C.goldDark} /><text x="24" y="16" textAnchor="middle" fontSize="12">{reveal >= 4 && !interactive ? r.x : rightMass}g</text></g>
      </g>
    </g>
    <text x="220" y="26" textAnchor="middle" className="stage-result">{interactive ? (leftMass === rightMass ? `平衡了！x = ${guess}` : leftMass > rightMass ? "左边重了，x 猜大了" : "右边重了，x 猜小了") : reveal >= 5 ? `x = ${r.x}` : r.eq}</text>
    {interactive ? <foreignObject x="80" y="196" width="280" height="34"><label className="stage-slider">猜 x：<input type="range" min="1" max="12" value={guess} onChange={(e) => setGuess(Number(e.target.value))} aria-label="猜 x 的值" /><b>{guess}</b></label></foreignObject> : null}
  </svg></figure>;
}

/** 六年级：圆的周长与面积，切开拼成近似长方形；可以拖动半径 */
export function CircleStage({ params, scene, interactive, setParam }: StageProps) {
  const r = circle(params);
  const reveal = interactive ? 9 : scene.reveal ?? 1;
  const cut = interactive ? 1 : scene.cut ?? 0;
  const R = 12 + params.r * 8.5; // 最大约 97
  const n = params.n;
  const handlers = useSvgDrag((p) => {
    const d = Math.hypot(p.x - 110, p.y - 115);
    setParam("r", Math.round(Math.min(10, Math.max(1, (d - 12) / 8.5))));
  });
  const sectors = useMemo(() => {
    // 拼成近似平行四边形：总长 = 半个周长 πR，高 = R；按比例缩放以放进画面
    const s = Math.min(1, 175 / (Math.PI * R + R / 2));
    const Rs = R * s, L = Math.PI * Rs, step = (2 * L) / n;
    const x0 = 240, bottom = 115 + Rs / 2, top = bottom - Rs;
    const list = Array.from({ length: n }, (_, i) => {
      const j = Math.floor(i / 2);
      if (i % 2 === 0) {
        const a = x0 + j * step, b = a + step;
        return `M${(a + b) / 2} ${top} L${a} ${bottom} A${Rs} ${Rs} 0 0 0 ${b} ${bottom} Z`;
      }
      const a = x0 + (j + 0.5) * step, b = a + step;
      return `M${(a + b) / 2} ${bottom} L${a} ${top} A${Rs} ${Rs} 0 0 1 ${b} ${top} Z`;
    });
    return { list, labelY: bottom + 18, mid: x0 + L / 2 + step / 4 };
  }, [n, R]);
  return <figure className="stage"><svg viewBox="0 0 440 240" role="img" aria-label={`半径 ${params.r} 厘米，周长约 ${r.perimeter} 厘米，面积约 ${r.area} 平方厘米`}>
    {Array.from({ length: n }, (_, i) => {
      const a0 = (i / n) * 2 * Math.PI, a1 = ((i + 1) / n) * 2 * Math.PI;
      return <path key={i} d={`M110 115 L${110 + R * Math.cos(a0)} ${115 + R * Math.sin(a0)} A${R} ${R} 0 0 1 ${110 + R * Math.cos(a1)} ${115 + R * Math.sin(a1)} Z`} fill={i % 2 ? "#d9e7c7" : "#f4e2b5"} stroke={cut ? C.ink : "none"} strokeWidth="1" />;
    })}
    <circle cx="110" cy="115" r={R} fill="none" stroke={C.ink} strokeWidth={reveal === 2 ? 4 : 2} />
    <line x1="110" y1="115" x2={110 + R} y2="115" stroke={C.red} strokeWidth="2.5" />
    <text x={110 + R / 2} y="108" textAnchor="middle" className="stage-label">r={params.r}</text>
    {interactive ? <circle cx={110 + R} cy="115" r="12" fill={C.gold} fillOpacity=".75" stroke={C.goldDark} strokeWidth="2" style={{ cursor: "ew-resize", touchAction: "none" }} {...handlers} /> : null}
    {cut && reveal >= 3 ? <g>{sectors.list.map((d, i) => <path key={i} d={d} fill={i % 2 ? "#d9e7c7" : "#f4e2b5"} stroke={C.ink} strokeWidth="0.8" />)}
      <text x={sectors.mid} y={sectors.labelY} textAnchor="middle" className="stage-label">长 ≈ πr = {r.halfC}，宽 = r</text></g> : null}
    <text x="220" y="232" textAnchor="middle" className="stage-result">{reveal >= 2 ? `C ≈ ${r.perimeter} 厘米` : ""}{reveal >= 4 || interactive ? `　S ≈ ${r.area} 平方厘米` : ""}</text>
  </svg></figure>;
}

/** 六年级：圆柱侧面展开 */
export function CylinderStage({ params, scene, interactive, setParam }: StageProps) {
  const r = cylinder(params);
  const open = interactive ? params.open : scene.open ?? params.open;
  const R = 10 + params.r * 7, H = 20 + params.h * 13, ry = R * 0.32;
  const cx = 95, top = 115 - H / 2;
  const t = open / 10;
  const fullW = 2 * Math.PI * R;
  const scale = Math.min(1, 230 / fullW);
  const rectW = fullW * scale * t;
  return <figure className="stage"><svg viewBox="0 0 440 240" role="img" aria-label={`底面半径 ${params.r}，高 ${params.h}，侧面展开是长 ${r.circumference}、宽 ${params.h} 的长方形，体积约 ${r.volume}`}>
    <ellipse cx={cx} cy={top + H} rx={R} ry={ry} fill="#d9e7c7" stroke={C.ink} />
    <rect x={cx - R} y={top} width={2 * R} height={H} fill={t > 0 ? "#eef3e6" : "#d9e7c7"} stroke="none" />
    <line x1={cx - R} y1={top} x2={cx - R} y2={top + H} stroke={C.ink} /><line x1={cx + R} y1={top} x2={cx + R} y2={top + H} stroke={C.ink} />
    <ellipse cx={cx} cy={top} rx={R} ry={ry} fill="#f4e2b5" stroke={C.ink} />
    {t > 0 ? <g><rect x={200} y={top} width={rectW} height={H} fill="#d9e7c7" stroke={C.ink} strokeWidth="1.5" />
      <text x={200 + rectW / 2} y={top - 8} textAnchor="middle" className="stage-label">{t === 1 ? `长 = 2πr ≈ ${r.circumference}` : "展开中……"}</text>
      <text x={204 + rectW} y={top + H / 2} className="stage-label">宽 = {params.h}</text></g> : null}
    <text x="220" y="232" textAnchor="middle" className="stage-result">V柱 ≈ {r.volume}　V锥 = ⅓V柱 {r.coneExact ? "≈" : ""} {r.cone}</text>
    {interactive ? <foreignObject x="200" y="10" width="230" height="34"><label className="stage-slider">展开：<input type="range" min="0" max="10" value={params.open} onChange={(e) => setParam("open", Number(e.target.value))} aria-label="展开程度" /></label></foreignObject> : null}
  </svg></figure>;
}
