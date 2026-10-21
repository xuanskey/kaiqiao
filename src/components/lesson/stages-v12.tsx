import { decimalDiv, fractionMul } from "@/lib/lesson/demos";
import type { StageProps } from "./stages-math";

const C = { ink: "#285847", line: "#cad9bc", soft: "#eef4e6", red: "#c8553d", blue: "#4b6fa8", gold: "#dfbd76", goldDark: "#bf9d50", paper: "#fffdf7", sky: "#dbe7f5", sun: "#f4e2b5" };

function Stepper({ label, value, onDown, onUp, small }: { label: string; value: string; onDown: () => void; onUp: () => void; small?: [() => void, () => void] }) {
  return <div className="ddiv-stepper" role="group" aria-label={label}>
    <span>{label}</span>
    {small ? <button type="button" aria-label={`${label}减 1`} onClick={small[0]}>−1</button> : null}
    <button type="button" aria-label={`${label}减 0.1`} onClick={onDown}>−0.1</button>
    <b>{value}</b>
    <button type="button" aria-label={`${label}加 0.1`} onClick={onUp}>＋0.1</button>
    {small ? <button type="button" aria-label={`${label}加 1`} onClick={small[1]}>＋1</button> : null}
  </div>;
}

/** 五年级上册：小数除法。看除数是不是整数 → 必要时同时 ×10 → 竖式逐位除 → 商（或循环小数）。 */
export function DecimalDivStage({ params, scene, interactive, setParam }: StageProps) {
  const r = decimalDiv(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const rows = r.rows.slice(0, 6);
  const answer = r.recurring ? `${r.shown} ≈ ${r.approx2}` : r.exact;
  return <figure className="stage stage-html ddiv" aria-label={`${r.expr} = ${answer}`}>
    <div className="dec-row"><span className="dec-card">{r.aText}</span><b>÷</b><span className="dec-card">{r.bText}</span><b>=</b><span className="dec-card dec-answer">{reveal >= 4 ? answer : "?"}</span></div>
    {reveal >= 2 ? r.intDivisor
      ? <p className="ddiv-tip">除数是整数：直接除，<em>商的小数点和被除数的小数点对齐</em></p>
      : <div className="ddiv-shift">
          <p className="ddiv-tip">除数是小数：被除数和除数<em>同时 ×10</em>，商不变{r.padZero ? "（被除数末尾添 0）" : ""}</p>
          <div className="dec-row"><span className="dec-card">{r.newA}</span><b>÷</b><span className="dec-card">{r.newB}</span></div>
        </div> : null}
    {reveal >= 3 ? <ol className="ddiv-rows" aria-label="竖式每一步">
      {rows.map((x, i) => <li key={i} className={x.zero ? "is-zero" : undefined}><span>{`${x.cur} ÷ ${r.D}`}</span><b>{`商 ${x.q}`}</b><small>{`余 ${x.rem}${x.zero ? "（添 0）" : ""}`}</small></li>)}
      {r.rows.length > 6 ? <li className="is-more">……</li> : null}
    </ol> : null}
    {reveal >= 4 && r.recurring && r.cycle ? <p className="ddiv-tip">余数重复出现，商是<em>循环小数</em>{`，循环节是 ${r.cycle}`}</p> : null}
    {reveal >= 5 && !r.recurring ? <p className="ddiv-check">{`验算：${r.exact} × ${r.bText} = ${r.aText}`}</p> : null}
    {interactive ? <div className="ddiv-controls">
      <Stepper label="被除数" value={r.aText} onDown={() => setParam("a", params.a - 1)} onUp={() => setParam("a", params.a + 1)} small={[() => setParam("a", params.a - 10), () => setParam("a", params.a + 10)]} />
      <Stepper label="除数" value={r.bText} onDown={() => setParam("b", params.b - 1)} onUp={() => setParam("b", params.b + 1)} small={[() => setParam("b", params.b - 10), () => setParam("b", params.b + 10)]} />
    </div> : null}
  </figure>;
}

/** 六年级上册：分数乘法。分数 × 整数：几个相同分数相加；分数 × 分数：长方形面积模型，点列、点行直接改分子。 */
export function FractionMulStage({ params, scene, interactive, setParam, reduceMotion }: StageProps) {
  const r = fractionMul(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const result = r.mixed ? `${r.simplest}（${r.mixed}）` : r.simplest;
  const anim = reduceMotion ? undefined : { transition: "fill .4s ease, opacity .4s ease" };
  const key = (fn: () => void) => (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn(); } };
  if (r.isInt) {
    const k = params.k, d = params.d1, n = params.n1;
    const W = 240, gap = 4, h = Math.min(18, Math.floor(150 / k) - gap), ox = 40, oy = 40;
    return <figure className="stage"><svg viewBox="0 0 440 240" role="img" aria-label={`${k} 个 ${r.a} 相加，${r.expr} = ${result}`}>
      <text x="40" y="24" className="stage-label">{`${k} 个 ${r.a}`}</text>
      {Array.from({ length: k }, (_, row) => <g key={row} opacity={reveal >= 2 || row === 0 ? 1 : 0.25}>
        {Array.from({ length: d }, (_, i) => {
          const on = i < n;
          const pick = () => setParam("n1", i + 1);
          return <rect key={i} x={ox + (i * W) / d} y={oy + row * (h + gap)} width={W / d} height={h} fill={on ? C.sky : C.paper} stroke={C.ink} strokeWidth="1.2" style={{ ...anim, cursor: interactive ? "pointer" : undefined }}
            {...(interactive && row === 0 ? { role: "button", tabIndex: 0, "aria-label": `分子改成 ${i + 1}`, onClick: pick, onKeyDown: key(pick) } : {})} />;
        })}
      </g>)}
      {reveal >= 3 ? <text x="300" y="70" className="stage-label">{`共 ${r.num} 个 1/${d}`}</text> : null}
      {reveal >= 3 ? <text x="300" y="94" className="stage-label">{`${r.calc} = ${r.raw}`}</text> : null}
      {reveal >= 4 ? <text x="300" y="124" className="stage-result">{`= ${result}`}</text> : null}
      {interactive ? <foreignObject x="20" y="200" width="400" height="34"><div className="stage-steppers">
        <label>整数 <button type="button" aria-label="整数减 1" onClick={() => setParam("k", k - 1)}>−</button><b>{k}</b><button type="button" aria-label="整数加 1" onClick={() => setParam("k", k + 1)}>＋</button></label>
        <label>分母 <button type="button" aria-label="分母减 1" onClick={() => setParam("d1", d - 1)}>−</button><b>{d}</b><button type="button" aria-label="分母加 1" onClick={() => setParam("d1", d + 1)}>＋</button></label>
      </div></foreignObject> : null}
    </svg></figure>;
  }
  const { n1, d1, n2, d2 } = params;
  const ox = 40, oy = 34, W = 220, H = 160, cw = W / d1, ch = H / d2;
  return <figure className="stage"><svg viewBox="0 0 440 240" role="img" aria-label={`面积模型：先取 ${r.a}，再取它的 ${r.b}，重叠 ${r.num} 格，共 ${r.den} 格，${r.expr} = ${result}`}>
    <text x={ox} y="22" className="stage-label">{reveal >= 2 ? `单位“1”：${d1} 列 × ${d2} 行` : `单位“1”平均分成 ${d1} 份`}</text>
    {Array.from({ length: d1 }, (_, i) => Array.from({ length: d2 }, (_, j) => {
      const col = i < n1, row = j < n2;
      const fill = reveal >= 2 && col && row ? C.gold : col ? C.sky : C.paper;
      return <rect key={`${i}-${j}`} x={ox + i * cw} y={oy + j * ch} width={cw} height={ch} fill={fill} stroke={reveal >= 2 ? C.line : "none"} style={anim} />;
    }))}
    {Array.from({ length: d1 + 1 }, (_, i) => <line key={`v${i}`} x1={ox + i * cw} y1={oy} x2={ox + i * cw} y2={oy + H} stroke={C.ink} strokeWidth={i % d1 === 0 ? 2 : 1.2} />)}
    {reveal >= 2 ? Array.from({ length: d2 - 1 }, (_, j) => <line key={`h${j}`} x1={ox} y1={oy + (j + 1) * ch} x2={ox + W} y2={oy + (j + 1) * ch} stroke={C.red} strokeWidth="1.2" strokeDasharray="5 3" />) : null}
    <rect x={ox} y={oy} width={W} height={H} fill="none" stroke={C.ink} strokeWidth="2" />
    {interactive ? <g>
      {Array.from({ length: d1 - 1 }, (_, i) => { const pick = () => setParam("n1", i + 1); return <g key={`c${i}`} role="button" tabIndex={0} aria-label={`第一个分数取 ${i + 1}/${d1}`} onClick={pick} onKeyDown={key(pick)} style={{ cursor: "pointer" }}><rect x={ox + i * cw + 2} y={oy + H + 6} width={cw - 4} height="16" rx="4" fill={i < n1 ? C.sky : C.soft} stroke={C.line} /><text x={ox + i * cw + cw / 2} y={oy + H + 18} textAnchor="middle" fontSize="10" fill={C.ink}>{i + 1}</text></g>; })}
      {Array.from({ length: d2 - 1 }, (_, j) => { const pick = () => setParam("n2", j + 1); return <g key={`r${j}`} role="button" tabIndex={0} aria-label={`第二个分数取 ${j + 1}/${d2}`} onClick={pick} onKeyDown={key(pick)} style={{ cursor: "pointer" }}><rect x={ox + W + 6} y={oy + j * ch + 2} width="18" height={ch - 4} rx="4" fill={j < n2 ? C.gold : C.soft} stroke={C.line} /><text x={ox + W + 15} y={oy + j * ch + ch / 2 + 4} textAnchor="middle" fontSize="10" fill={C.ink}>{j + 1}</text></g>; })}
    </g> : null}
    <text x="425" y="56" textAnchor="end" className="stage-label">{`先取 ${r.a}`}</text>
    {reveal >= 2 ? <text x="425" y="80" textAnchor="end" className="stage-label">{`再取它的 ${r.b}`}</text> : null}
    {reveal >= 3 ? <text x="425" y="112" textAnchor="end" className="stage-label">{`${r.num} 格 / ${r.den} 格`}</text> : null}
    {reveal >= 3 ? <text x="425" y="136" textAnchor="end" className="stage-label">{`= ${r.raw}`}</text> : null}
    {reveal >= 4 ? <text x="425" y="166" textAnchor="end" className="stage-result">{`${r.expr} = ${result}`}</text> : null}
    {interactive ? <text x="425" y="226" textAnchor="end" className="stage-hint">点下面的格改分子 · 点右边的格改第二个分子</text> : null}
  </svg></figure>;
}
