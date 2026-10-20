import { useEffect, useRef, useState } from "react";
import { circuit, magnet, pendulum, shadow } from "@/lib/lesson/demos";
import type { StageProps } from "./stages-math";

const C = { ink: "#285847", soft: "#e5eed9", line: "#cad9bc", gold: "#dfbd76", goldDark: "#bf9d50", red: "#c8553d", sky: "#eaf3f7" };

/** 低年级：磁铁吸铁 */
export function MagnetStage({ params, scene, interactive }: StageProps) {
  const r = magnet(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const near = reveal >= 1;
  const mx = 30, magnetRight = mx + 70 + params.power * 10;
  return <figure className="stage"><svg viewBox="0 0 440 220" role="img" aria-label={`磁铁离物品 ${params.dist} 厘米，吸住了：${r.items.filter((i) => i.pulled).map((i) => i.name).join("、") || "没有"}`}>
    <g transform={`translate(${near ? 0 : -20} 0)`} style={{ transition: "transform .6s" }}>
      <rect x={mx} y="90" width={(magnetRight - mx) / 2} height="40" fill={C.red} rx="4" /><rect x={mx + (magnetRight - mx) / 2} y="90" width={(magnetRight - mx) / 2} height="40" fill="#4b6fa8" rx="4" />
      <text x={mx + (magnetRight - mx) / 4} y="116" textAnchor="middle" fill="#fff" fontSize="15">N</text><text x={mx + (3 * (magnetRight - mx)) / 4} y="116" textAnchor="middle" fill="#fff" fontSize="15">S</text>
    </g>
    {r.items.map((it, i) => {
      const baseX = magnetRight + 20 + params.dist * 12 + (i % 3) * 70, y = i < 3 ? 60 : 160;
      const pulled = reveal >= 2 && it.pulled;
      return <g key={it.name} transform={`translate(${pulled ? magnetRight + 18 + (i % 3) * 6 : baseX} ${pulled ? 110 - 8 + (i % 2) * 14 : y})`} style={{ transition: "transform .6s" }}>
        <text textAnchor="middle" fontSize="26" y="8">{it.emoji}</text>
        {!pulled ? <text textAnchor="middle" y="34" className="stage-label">{it.name}</text> : null}
      </g>;
    })}
    <text x="430" y="22" textAnchor="end" className="stage-hint">距离 {params.dist} 厘米</text>
  </svg></figure>;
}

/** 中年级：太阳高度与影子 */
export function ShadowStage({ params, scene, interactive, setParam }: StageProps) {
  const r = shadow(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const groundY = 190, stickX = 150, scale = 1.3;
  const stickH = params.h * scale;
  const shadowLen = Math.min(270, r.lengthNum * scale);
  const a = (params.sun * Math.PI) / 180;
  const sun = { x: stickX - 120 * Math.cos(a), y: groundY - 160 * Math.sin(a) };
  return <figure className="stage"><svg viewBox="0 0 440 220" role="img" aria-label={`太阳高度 ${params.sun} 度，木棍 ${params.h} 厘米，影子约 ${r.length} 厘米`}>
    <rect width="440" height={groundY} fill={C.sky} />
    <rect y={groundY} width="440" height="30" fill="#e7dcc0" />
    <path d={`M${stickX - 120} ${groundY} A120 160 0 0 1 ${stickX + 120} ${groundY}`} fill="none" stroke="#c9d9e0" strokeDasharray="4 5" />
    <g style={interactive ? { cursor: "grab" } : undefined}>
      <circle cx={sun.x} cy={sun.y} r="16" fill="#f5c542" />
    </g>
    {reveal >= 1 ? <rect x={stickX} y={groundY - 3} width={shadowLen} height="6" fill="#4a4a4a" opacity=".55" /> : null}
    {reveal >= 2 ? <line x1={sun.x} y1={sun.y} x2={stickX + shadowLen} y2={groundY} stroke="#f0b429" strokeWidth="1.5" strokeDasharray="5 4" /> : null}
    <rect x={stickX - 3} y={groundY - stickH} width="6" height={stickH} fill="#8a5a2b" />
    {reveal >= 3 ? <text x={stickX + shadowLen / 2} y={groundY + 22} textAnchor="middle" className="stage-label">影长 ≈ {r.length} 厘米</text> : null}
    {r.lengthNum * scale > 270 ? <text x="430" y={groundY - 8} textAnchor="end" className="stage-hint">影子太长，画面外还有一段</text> : null}
    {interactive ? <foreignObject x="250" y="8" width="185" height="34"><label className="stage-slider">太阳：<input type="range" min="10" max="80" value={params.sun} onChange={(e) => setParam("sun", Number(e.target.value))} aria-label="太阳高度角" /></label></foreignObject> : null}
  </svg></figure>;
}

/** 中高年级：串联与并联 */
export function CircuitStage({ params, scene, interactive, setParam, reduceMotion }: StageProps) {
  const r = circuit(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const n = params.bulbs;
  const flow = r.anyLit && !reduceMotion ? "circuit-flow" : undefined;
  const Bulb = ({ x, y, i }: { x: number; y: number; i: number }) => {
    const b = r.bulbs[i];
    return <g transform={`translate(${x} ${y})`} onClick={() => interactive && setParam("broken", params.broken === i + 1 ? 0 : i + 1)} style={interactive ? { cursor: "pointer" } : undefined}>
      {b.lit ? <circle r={26} fill="#ffe27a" opacity={0.25 + 0.6 * b.brightness} /> : null}
      <circle r="14" fill={b.lit ? "#ffd84d" : "#f1f1ec"} stroke={C.ink} strokeWidth="2" />
      <path d="M-6 4 l3 -8 l3 6 l3 -6 l3 8" fill="none" stroke={b.lit ? "#a8780a" : "#999"} strokeWidth="1.5" />
      {b.broken ? <path d="M-12 -12 L12 12 M12 -12 L-12 12" stroke={C.red} strokeWidth="3" /> : null}
      <text y="34" textAnchor="middle" className="stage-label">{i + 1}</text>
    </g>;
  };
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`${n} 个灯泡${params.parallel ? "并联" : "串联"}，开关${params.closed ? "闭合" : "断开"}，${r.anyLit ? "有灯亮" : "灯不亮"}`}>
    {/* 电池 */}
    <g transform="translate(40 110)"><rect x="-14" y="-34" width="28" height="68" rx="4" fill="#f4e2b5" stroke={C.ink} strokeWidth="2" /><rect x="-6" y="-40" width="12" height="6" fill={C.ink} /><text y="5" textAnchor="middle" fontSize="11">电池</text></g>
    {/* 开关 */}
    <g transform="translate(220 200)" onClick={() => interactive && setParam("closed", params.closed ? 0 : 1)} style={interactive ? { cursor: "pointer" } : undefined}>
      <circle cx="-20" r="4" fill={C.ink} /><circle cx="20" r="4" fill={C.ink} />
      <line x1="-20" y1="0" x2={params.closed ? 20 : 14} y2={params.closed ? 0 : -18} stroke={C.ink} strokeWidth="4" strokeLinecap="round" style={{ transition: "all .3s" }} />
      <text y="24" textAnchor="middle" className="stage-label">开关（{params.closed ? "闭合" : "断开"}）</text>
    </g>
    <path d="M40 70 V30 H400 V200 H240 M200 200 H40 V150" fill="none" stroke={C.ink} strokeWidth="3" className={flow} />
    {params.parallel
      ? Array.from({ length: n }, (_, i) => { const x = 140 + i * 90; return <g key={i}><line x1={x} y1="30" x2={x} y2="200" stroke={C.ink} strokeWidth="2" className={flow} /><Bulb x={x} y={115} i={i} /></g>; })
      : Array.from({ length: n }, (_, i) => <Bulb key={i} x={150 + i * 90} y={30} i={i} />)}
    {reveal >= 3 ? <text x="220" y="18" textAnchor="middle" className="stage-result" fontSize="13">{r.anyLit ? (params.parallel ? (params.broken ? "坏的灯不亮，其他灯照样亮" : "每个灯一样亮") : n > 1 ? "灯亮了，但比一个灯时暗" : "灯亮了") : params.closed ? "电路中有断开的地方，灯不亮" : "开关断开，灯不亮"}</text> : null}
    {interactive ? <text x="430" y="226" textAnchor="end" className="stage-hint">点开关或灯泡试试</text> : null}
  </svg></figure>;
}

/** 高年级：单摆。按真实周期摆动，可暂停；卸载时停止动画循环。 */
export function PendulumStage({ params, scene, interactive, reduceMotion }: StageProps) {
  const r = pendulum(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const [angle, setAngle] = useState((params.amp * Math.PI) / 180);
  const [count, setCount] = useState(0);
  const [running, setRunning] = useState(false);
  const raf = useRef(0);
  const t0 = useRef(0);
  useEffect(() => { setCount(0); setAngle((params.amp * Math.PI) / 180); setRunning(false); }, [params.len, params.amp, params.mass]);
  useEffect(() => {
    if (!running || reduceMotion) return;
    t0.current = performance.now();
    const amp = (params.amp * Math.PI) / 180;
    const loop = (now: number) => {
      const t = (now - t0.current) / 1000;
      setAngle(amp * Math.cos((2 * Math.PI * t) / r.periodNum));
      setCount(Math.floor(t / r.periodNum));
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [running, reduceMotion, params.amp, r.periodNum]);
  const L = 40 + params.len * 1.4, px = 220, py = 20;
  const bob = { x: px + L * Math.sin(angle), y: py + L * Math.cos(angle) };
  const bobR = 7 + params.mass / 14;
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`摆长 ${params.len} 厘米，摆动一次约 ${r.period} 秒`}>
    <line x1="150" y1={py} x2="290" y2={py} stroke={C.ink} strokeWidth="5" />
    <line x1={px} y1={py} x2={bob.x} y2={bob.y} stroke="#555" strokeWidth="1.5" />
    <circle cx={bob.x} cy={bob.y} r={bobR} fill={C.gold} stroke={C.goldDark} strokeWidth="2" />
    {reveal >= 2 ? <text x="20" y="40" className="stage-label">来回一次 ≈ {r.period} 秒</text> : null}
    {reveal >= 2 ? <text x="20" y="62" className="stage-label">10 次 ≈ {r.ten} 秒</text> : null}
    <text x="420" y="40" textAnchor="end" className="stage-label">已摆 {count} 次</text>
    <foreignObject x="290" y="190" width="145" height="36"><div className="stage-buttons">
      {reduceMotion ? <span className="stage-hint">已减少动态效果</span> : <button type="button" onClick={() => setRunning((x) => !x)}>{running ? "暂停计时" : "开始摆动"}</button>}
    </div></foreignObject>
  </svg></figure>;
}
