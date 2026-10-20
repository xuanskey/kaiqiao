import { DEMOS, earth, friction, lever, plant, slope, sound } from "@/lib/lesson/demos";
import type { StageProps } from "./stages-math";

const C = { ink: "#285847", soft: "#e5eed9", line: "#cad9bc", gold: "#dfbd76", goldDark: "#bf9d50", red: "#c8553d", blue: "#4b6fa8", sky: "#eaf3f7" };

/** 钩码一串 */
function Weights({ x, y, n, label }: { x: number; y: number; n: number; label?: string }) {
  return <g>
    <line x1={x} y1={y} x2={x} y2={y + 10} stroke="#555" />
    {Array.from({ length: n }, (_, i) => <rect key={i} x={x - 9} y={y + 10 + i * 13} width="18" height="12" rx="2" fill={C.gold} stroke={C.goldDark} />)}
    {label ? <text x={x} y={y + 10 + n * 13 + 14} textAnchor="middle" className="stage-label">{label}</text> : null}
  </g>;
}

/** 六年级：杠杆尺。点刻度可以改变用力点位置。 */
export function LeverStage({ params, scene, interactive, setParam }: StageProps) {
  const r = lever(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const cx = 220, y = 70, unit = 30;
  const effortBlocks = r.exact ? r.effortNum : Math.ceil(r.effortNum);
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`阻力 ${params.load} 个钩码在第 ${params.ld} 格，用力点在第 ${params.ed} 格，需要约 ${r.effort} 个钩码的力，${r.kind}`}>
    <polygon points={`${cx},${y + 4} ${cx - 16},${y + 34} ${cx + 16},${y + 34}`} fill={C.ink} />
    <rect x={cx - 190} y={y - 4} width="380" height="8" rx="3" fill="#b9874f" />
    {Array.from({ length: 13 }, (_, i) => i - 6).map((k) => <g key={k} onClick={() => interactive && k > 0 && setParam("ed", k)} style={interactive && k > 0 ? { cursor: "pointer" } : undefined}>
      <line x1={cx + k * unit} y1={y - 8} x2={cx + k * unit} y2={y + 8} stroke="#6b4a26" />
      {k !== 0 ? <text x={cx + k * unit} y={y - 12} textAnchor="middle" fontSize="10" fill="#6b4a26">{Math.abs(k)}</text> : null}
      {interactive && k > 0 ? <rect x={cx + k * unit - 12} y={y - 26} width="24" height="40" fill="transparent" role="button" aria-label={`用力点移到第 ${k} 格`} /> : null}
    </g>)}
    {reveal >= 1 ? <text x={cx} y={y + 52} textAnchor="middle" className="stage-label">支点</text> : null}
    {reveal >= 2 ? <Weights x={cx - params.ld * unit} y={y + 4} n={params.load} label="阻力" /> : null}
    {reveal >= 3 ? <g>
      <Weights x={cx + params.ed * unit} y={y + 4} n={Math.min(8, effortBlocks)} label={`用力 ${r.exact ? "" : "约 "}${r.effort} 个`} />
      <text x={cx} y="220" textAnchor="middle" className="stage-result">{params.load}×{params.ld} = {r.effort}×{params.ed}　{r.kind}</text>
    </g> : null}
    {interactive ? <text x="430" y="20" textAnchor="end" className="stage-hint">点右边的刻度移动用力点</text> : null}
  </svg></figure>;
}

/** 六年级：斜面。 */
export function SlopeStage({ params, scene, interactive }: StageProps) {
  const r = slope(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const k = 2.2, x0 = 60, ground = 190;
  const hh = params.h * k, run = Math.sqrt(Math.max(0, params.len * params.len - params.h * params.h)) * k;
  const top = { x: x0 + run, y: ground - hh };
  const ang = Math.atan2(hh, run);
  const cart = { x: x0 + run * 0.55, y: ground - hh * 0.55 };
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`物重 ${params.g} 牛，斜面高 ${params.h} 厘米、长 ${params.len} 厘米，拉力约 ${r.force} 牛`}>
    <rect y={ground} width="440" height="40" fill="#e7dcc0" />
    <polygon points={`${x0},${ground} ${top.x},${ground} ${top.x},${top.y}`} fill="#d9c49a" stroke="#a9894f" strokeWidth="2" />
    {reveal >= 1 ? <g><line x1={top.x + 14} y1={ground} x2={top.x + 14} y2={top.y} stroke={C.blue} strokeDasharray="4 3" /><text x={top.x + 20} y={(ground + top.y) / 2} className="stage-label">高 {params.h}</text></g> : null}
    {reveal >= 2 ? <text x={x0 + run * 0.25} y={ground - hh * 0.25 + 18} textAnchor="middle" className="stage-label" transform={`rotate(${(-ang * 180) / Math.PI} ${x0 + run * 0.25} ${ground - hh * 0.25 + 18})`}>长 {params.len}</text> : null}
    <g transform={`translate(${cart.x} ${cart.y}) rotate(${(-ang * 180) / Math.PI})`}>
      <rect x="-18" y="-22" width="36" height="18" rx="3" fill={C.red} /><circle cx="-10" cy="-3" r="4" fill="#333" /><circle cx="10" cy="-3" r="4" fill="#333" />
      {reveal >= 3 ? <g><line x1="18" y1="-13" x2="62" y2="-13" stroke={C.ink} strokeWidth="2" markerEnd="url(#arr)" /><text x="40" y="-20" textAnchor="middle" className="stage-label">{r.force} 牛</text></g> : null}
    </g>
    <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill={C.ink} /></marker></defs>
    <text x="20" y="28" className="stage-label">直接提起：{params.g} 牛</text>
    {reveal >= 3 ? <text x="20" y="52" className="stage-result">沿斜面拉：约 {r.force} 牛（坡角约 {r.angle}°）</text> : null}
  </svg></figure>;
}

/** 四年级：钢尺振动与声音。 */
export function SoundStage({ params, scene, interactive, setParam, reduceMotion }: StageProps) {
  const r = sound(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const edge = 150, rulerLen = params.len * 9;
  const pts: string[] = [];
  for (let i = 0; i <= 200; i++) { const x = 220 + i; const y = 175 - Math.sin((i / 200) * r.cycles * 2 * Math.PI) * (r.amp * 0.8); pts.push(`${x},${y.toFixed(1)}`); }
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`钢尺伸出 ${params.len} 厘米，拨得${DEMOS.sound.params[0].options![params.force]}，声音${r.loud}，音调${r.pitch}`}>
    <rect x="20" y="70" width={edge - 20} height="70" fill="#c9a77a" />
    <rect x="20" y="64" width={edge - 20} height="5" fill="#9aa5ad" />
    <rect x="40" y="52" width="40" height="18" fill="#888" rx="3" />
    <g className={reveal >= 1 && !reduceMotion ? "ruler-vibrate" : undefined} style={{ transformOrigin: `${edge}px 66px` }}>
      <rect x={edge} y="64" width={rulerLen} height="5" fill="#9aa5ad" />
    </g>
    {reveal >= 1 ? <g opacity=".5">
      <line x1={edge} y1="66" x2={edge + rulerLen} y2={66 - r.amp} stroke="#9aa5ad" strokeWidth="2" />
      <line x1={edge} y1="66" x2={edge + rulerLen} y2={66 + r.amp} stroke="#9aa5ad" strokeWidth="2" />
    </g> : null}
    <text x={edge + rulerLen / 2} y="104" textAnchor="middle" className="stage-label">伸出 {params.len} 厘米</text>
    {reveal >= 2 ? <g><rect x="215" y="135" width="210" height="80" rx="8" fill="#f6f9f3" stroke={C.line} /><polyline points={pts.join(" ")} fill="none" stroke={C.ink} strokeWidth="2" /></g> : null}
    {reveal >= 3 ? <text x="320" y="128" textAnchor="middle" className="stage-result">声音{r.loud}，音调{r.pitch}</text> : null}
    {interactive ? <foreignObject x="10" y="190" width="200" height="34"><label className="stage-slider">长度：<input type="range" min="5" max="20" value={params.len} onChange={(e) => setParam("len", Number(e.target.value))} aria-label="钢尺伸出长度" /></label></foreignObject> : null}
  </svg></figure>;
}

/** 五、六年级：地球自转与昼夜。从北极上空看，太阳在左边。 */
export function EarthStage({ params, scene, interactive, setParam }: StageProps) {
  const r = earth(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const cx = 250, cy = 112, R = 78;
  const a = (r.angle * Math.PI) / 180;
  const pt = { x: cx + R * 0.82 * Math.cos(a), y: cy - R * 0.82 * Math.sin(a) };
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`北京时间 ${params.hour} 时，北京是${r.day ? "白天" : "黑夜"}`}>
    <rect width="440" height="230" fill="#1f2d3d" />
    <circle cx="34" cy={cy} r="22" fill="#f5c542" />
    {[-40, -15, 15, 40].map((d) => <line key={d} x1="64" y1={cy + d} x2={cx - R - 10} y2={cy + d} stroke="#f5c542" strokeOpacity=".5" strokeDasharray="6 6" />)}
    <circle cx={cx} cy={cy} r={R} fill="#3b5f8a" />
    {reveal >= 1 ? <path d={`M${cx} ${cy - R} A${R} ${R} 0 0 0 ${cx} ${cy + R} Z`} fill="#8fc1e3" /> : <path d={`M${cx} ${cy - R} A${R} ${R} 0 0 0 ${cx} ${cy + R} Z`} fill="#5d84ad" />}
    <circle cx={cx} cy={cy} r="4" fill="#fff" />
    {reveal >= 1 ? <g><text x={cx - R / 2} y={cy + 44} textAnchor="middle" fill="#1f2d3d" fontSize="13">白天</text><text x={cx + R / 2} y={cy + 44} textAnchor="middle" fill="#dce6f0" fontSize="13">黑夜</text></g> : null}
    {reveal >= 2 ? <path d={`M${cx + R + 14} ${cy + 30} A${R + 14} ${R + 14} 0 0 0 ${cx + R + 14} ${cy - 30}`} fill="none" stroke="#dce6f0" strokeWidth="2" markerEnd="url(#earr)" /> : null}
    <defs><marker id="earr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10z" fill="#dce6f0" /></marker></defs>
    <circle cx={pt.x} cy={pt.y} r="7" fill={C.red} stroke="#fff" strokeWidth="2" />
    <text x={pt.x} y={pt.y - 12} textAnchor="middle" fill="#fff" fontSize="12">北京</text>
    <text x="430" y="22" textAnchor="end" fill="#dce6f0" fontSize="12">从北极上空看，地球逆时针（自西向东）转</text>
    {reveal >= 3 ? <text x="430" y="210" textAnchor="end" fill="#ffe27a" fontSize="15" fontWeight="650">{params.hour} 时：{r.day ? `白天，太阳在${r.dir}` : "黑夜"}</text> : null}
    {interactive ? <foreignObject x="8" y="192" width="190" height="34"><label className="stage-slider" style={{ color: "#dce6f0" }}>时间：<input type="range" min="0" max="23" value={params.hour} onChange={(e) => setParam("hour", Number(e.target.value))} aria-label="北京时间" /></label></foreignObject> : null}
  </svg></figure>;
}

/** 四年级：测力计拉木块。 */
export function FrictionStage({ params, scene, interactive }: StageProps) {
  const r = friction(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const ground = 150;
  const fill = ["#d4ecf4", "#d9b98a", "#e6a3a3"][params.surf] ?? "#d9b98a";
  const stretch = Math.min(110, r.tenths * 3);
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`木块在${r.surface}上，压力 ${r.weight} 牛，摩擦力约 ${r.force} 牛`}>
    <rect x="20" y={ground} width="400" height="18" fill={fill} stroke="#9a8a6a" />
    {params.surf === 2 ? Array.from({ length: 40 }, (_, i) => <line key={i} x1={24 + i * 10} y1={ground} x2={28 + i * 10} y2={ground - 4} stroke="#b06c6c" />) : null}
    <text x="30" y={ground + 34} className="stage-label">{r.surface}</text>
    <rect x="70" y={ground - 40} width="80" height="40" fill="#c08a52" stroke="#7a5228" rx="3" />
    {Array.from({ length: params.n }, (_, i) => <rect key={i} x={82 + i * 16} y={ground - 54} width="14" height="14" rx="2" fill={C.gold} stroke={C.goldDark} />)}
    {reveal >= 1 ? <g>
      <line x1="150" y1={ground - 20} x2={200 + stretch} y2={ground - 20} stroke="#555" strokeWidth="2" />
      <rect x={200 + stretch} y={ground - 32} width="90" height="24" rx="5" fill="#f4f4f4" stroke="#666" />
      <text x={245 + stretch} y={ground - 15} textAnchor="middle" fontSize="11">测力计</text>
    </g> : null}
    {reveal >= 2 ? <text x="110" y={ground - 62 - (params.n ? 4 : -10)} textAnchor="middle" className="stage-label">重 {r.weight} 牛</text> : null}
    {reveal >= 3 ? <text x="420" y="40" textAnchor="end" className="stage-result">读数（摩擦力）≈ {r.force} 牛</text> : null}
  </svg></figure>;
}

/** 三、四年级：绿豆发芽和生长。 */
export function PlantStage({ params, scene, interactive, setParam }: StageProps) {
  const r = plant(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const potY = 160, h = r.mm * 0.6;
  const green = r.leaf === "绿色" ? "#5c9c3c" : "#d7c25a";
  const stemColor = params.light ? "#7fb04f" : "#e9e2b4";
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`第 ${params.day} 天，${r.status}${r.sprout ? `，豆苗约 ${r.height} 厘米` : ""}`}>
    <rect width="440" height="230" fill={params.light ? "#fdf8e4" : "#4a4a52"} />
    {params.light ? <circle cx="400" cy="34" r="18" fill="#f5c542" /> : null}
    <path d={`M150 ${potY} h140 l-14 50 h-112 z`} fill="#c97a4a" />
    <rect x="152" y={potY - 8} width="136" height="10" fill={params.water === 2 ? "#8fc6e8" : params.water === 1 ? "#a07b5a" : "#d9c39e"} />
    {params.water === 2 ? <rect x="152" y={potY - 22} width="136" height="16" fill="#8fc6e8" opacity=".8" /> : null}
    {reveal >= 1 ? [190, 220, 250].map((x, i) => <g key={x}>
      <ellipse cx={x} cy={potY - 10} rx={params.water >= 1 && params.day >= 1 ? 7 : 5} ry={params.water >= 1 && params.day >= 1 ? 5 : 4} fill="#5f8f3a" />
      {reveal >= 2 && r.sprout ? <g>
        <path d={`M${x} ${potY - 12} q${i % 2 ? 4 : -4} ${-h / 2} 0 ${-h}`} fill="none" stroke={stemColor} strokeWidth={params.light ? 4 : 2.5} />
        {r.leaf !== "还没有叶子" ? <g><ellipse cx={x - 8} cy={potY - 12 - h} rx="9" ry="5" fill={green} transform={`rotate(-25 ${x - 8} ${potY - 12 - h})`} /><ellipse cx={x + 8} cy={potY - 12 - h} rx="9" ry="5" fill={green} transform={`rotate(25 ${x + 8} ${potY - 12 - h})`} /></g> : null}
      </g> : null}
    </g>) : null}
    <text x="20" y="28" className="stage-label" style={{ fill: params.light ? undefined : "#e8e8e8" }}>第 {params.day} 天</text>
    {reveal >= 3 ? <text x="20" y="52" className="stage-result" style={{ fill: params.light ? undefined : "#ffe27a" }}>{r.status}{r.sprout && params.day > 2 ? `，高约 ${r.height} 厘米` : ""}</text> : null}
    {interactive ? <foreignObject x="250" y="196" width="185" height="32"><label className="stage-slider" style={{ color: params.light ? undefined : "#e8e8e8" }}>天数：<input type="range" min="0" max="14" value={params.day} onChange={(e) => setParam("day", Number(e.target.value))} aria-label="天数" /></label></foreignObject> : null}
  </svg></figure>;
}
