import { FRUITS, barChart, makeTen, polyArea, polyShapes } from "@/lib/lesson/demos";
import type { StageProps } from "./stages-math";

const C = { ink: "#285847", line: "#cad9bc", soft: "#eef4e6", red: "#c8553d", blue: "#4b6fa8", gold: "#dfbd76", goldDark: "#bf9d50", paper: "#fffdf7" };

/** 一年级：凑十法。十格框里放第一个加数，第二个加数分成“凑十的”和“剩下的”。 */
export function MakeTenStage({ params, scene, interactive, setParam, reduceMotion }: StageProps) {
  const r = makeTen(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const cell = 34, fx = 40, fy = 50;
  const frame = (i: number) => ({ x: fx + (i % 5) * cell + cell / 2, y: fy + Math.floor(i / 5) * cell + cell / 2 });
  // 第二个加数的圆片：凑十的那部分在 reveal ≥ 3 时移进十格框
  const blue = Array.from({ length: params.b }, (_, j) => {
    // 进位时凑十的那几个移进十格框；正好等于 10 时全部放进去
    const moved = r.carry ? j < r.need && reveal >= 3 : r.sum === 10 && reveal >= 1;
    const home = { x: 260 + (j % 5) * 30, y: 62 + Math.floor(j / 5) * 30 };
    const target = frame(params.a + j);
    return { j, ...(moved ? target : home), moved, part: r.carry ? (j < r.need ? "need" : "rest") : "all" };
  });
  return <figure className="stage"><svg viewBox="0 0 440 230" role="img" aria-label={`${params.a} 加 ${params.b}：${r.carry ? `把 ${params.b} 分成 ${r.need} 和 ${r.rest}，先凑成 10，再加 ${r.rest}，得 ${r.sum}` : `一共 ${r.sum}`}`}>
    <text x="40" y="34" className="stage-label">十格框</text>
    {Array.from({ length: 10 }, (_, i) => <rect key={i} x={fx + (i % 5) * cell} y={fy + Math.floor(i / 5) * cell} width={cell} height={cell} fill={reveal >= 4 && r.carry ? "#f3f8ea" : C.paper} stroke={C.ink} strokeWidth="1.5" />)}
    {Array.from({ length: params.a }, (_, i) => { const p = frame(i); return <circle key={`a${i}`} cx={p.x} cy={p.y} r="12" fill={C.red} />; })}
    {reveal >= 1 ? blue.map((c) => <circle key={`b${c.j}`} cx={c.x} cy={c.y} r="12" fill={C.blue} stroke={reveal === 3 && c.part === "need" ? C.goldDark : "none"} strokeWidth="3" style={reduceMotion ? undefined : { transition: "cx .6s ease, cy .6s ease" }} />) : null}
    {reveal >= 2 && r.carry ? <text x="40" y="146" className="stage-hint">{params.a} 还差 {r.need} 个满十</text> : null}
    {reveal >= 3 && r.carry ? <g>
      <text x="300" y="150" textAnchor="middle" className="stage-label">{params.b}</text>
      <line x1="300" y1="156" x2="270" y2="176" stroke={C.ink} strokeWidth="1.5" /><line x1="300" y1="156" x2="330" y2="176" stroke={C.ink} strokeWidth="1.5" />
      <text x="266" y="194" textAnchor="middle" className="stage-label" style={{ fill: C.blue }}>{r.need}</text><text x="334" y="194" textAnchor="middle" className="stage-label" style={{ fill: C.blue }}>{r.rest}</text>
    </g> : null}
    {reveal >= 4 || (!r.carry && reveal >= 1) ? <text x="40" y="186" className="stage-result">{r.carry ? `10 + ${r.rest} = ${r.sum}` : r.expr}</text> : null}
    {interactive ? <foreignObject x="20" y="196" width="400" height="32"><div className="stage-steppers">
      <label>第一个加数 <button type="button" aria-label="第一个加数减 1" onClick={() => setParam("a", params.a - 1)}>−</button><b>{params.a}</b><button type="button" aria-label="第一个加数加 1" onClick={() => setParam("a", params.a + 1)}>＋</button></label>
      <label>第二个加数 <button type="button" aria-label="第二个加数减 1" onClick={() => setParam("b", params.b - 1)}>−</button><b>{params.b}</b><button type="button" aria-label="第二个加数加 1" onClick={() => setParam("b", params.b + 1)}>＋</button></label>
    </div></foreignObject> : null}
  </svg></figure>;
}

/** 三、四年级：条形统计图。动手时点条形上方的 ＋/− 改票数。 */
export function BarChartStage({ params, scene, interactive, setParam, reduceMotion }: StageProps) {
  const r = barChart(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const ox = 70, oy = 190, gridH = 12, maxCells = 12, barW = 46, gap = 34;
  const colors = ["#d9574a", "#e3b23c", "#e88a3a", "#7c5aa6"];
  const grow = reveal >= 2 ? 1 : 0;
  return <figure className="stage"><svg viewBox="0 0 440 240" role="img" aria-label={`条形统计图，每格表示 ${r.per} 票：${FRUITS.map((f, i) => `${f} ${r.counts[i]} 票`).join("，")}。最多的是${r.maxName}，最少的是${r.minName}`}>
    <text x="220" y="20" textAnchor="middle" className="stage-label">{`最喜欢的水果（每格 ${r.per} 票）`}</text>
    {Array.from({ length: maxCells + 1 }, (_, i) => <g key={i}><line x1={ox} y1={oy - i * gridH} x2={ox + 4 * (barW + gap)} y2={oy - i * gridH} stroke={i ? "#e4ebdc" : C.ink} strokeWidth={i ? 1 : 2} />{i % 2 === 0 ? <text x={ox - 8} y={oy - i * gridH + 4} textAnchor="end" fontSize="10" fill="#6d7b73">{i * r.per}</text> : null}</g>)}
    <line x1={ox} y1={oy} x2={ox} y2={oy - maxCells * gridH - 6} stroke={C.ink} strokeWidth="2" />
    <text x={ox - 8} y={oy - maxCells * gridH - 12} textAnchor="end" fontSize="10" fill="#6d7b73">票</text>
    {FRUITS.map((f, i) => {
      const x = ox + gap / 2 + i * (barW + gap);
      const h = Math.min(maxCells, r.cells[i]) * gridH * grow;
      const isMax = reveal >= 3 && r.counts[i] === r.max, isMin = reveal >= 3 && r.counts[i] === r.min;
      return <g key={f}>
        <rect x={x} y={oy - h} width={barW} height={h} fill={colors[i]} opacity={reveal >= 3 && !isMax && !isMin ? 0.45 : 0.9} stroke={isMax ? C.goldDark : "none"} strokeWidth="3" style={reduceMotion ? undefined : { transition: "height .5s ease, y .5s ease" }} />
        {reveal >= 2 ? <text x={x + barW / 2} y={oy - h - 6} textAnchor="middle" fontSize="12" fontWeight="650" fill={C.ink}>{r.counts[i]}</text> : null}
        <text x={x + barW / 2} y={oy + 16} textAnchor="middle" className="stage-label">{f}</text>
        {interactive ? <g>
          <g role="button" tabIndex={0} aria-label={`${f}加 1 票`} style={{ cursor: "pointer" }} onClick={() => setParam(`c${i}`, r.counts[i] + 1)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setParam(`c${i}`, r.counts[i] + 1); } }}><rect x={x} y={oy + 22} width={22} height={18} rx="5" fill={C.soft} stroke={C.line} /><text x={x + 11} y={oy + 35} textAnchor="middle" fontSize="13" fill={C.ink}>＋</text></g>
          <g role="button" tabIndex={0} aria-label={`${f}减 1 票`} style={{ cursor: "pointer" }} onClick={() => setParam(`c${i}`, r.counts[i] - 1)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setParam(`c${i}`, r.counts[i] - 1); } }}><rect x={x + 24} y={oy + 22} width={22} height={18} rx="5" fill={C.soft} stroke={C.line} /><text x={x + 35} y={oy + 35} textAnchor="middle" fontSize="13" fill={C.ink}>−</text></g>
        </g> : null}
      </g>;
    })}
    {reveal >= 3 ? <text x="425" y="40" textAnchor="end" className="stage-result" fontSize="13">{r.diff === 0 ? "一样多" : `相差 ${r.diff} 票`}</text> : null}
    {reveal >= 4 || interactive ? <text x="425" y="58" textAnchor="end" className="stage-label">{`共 ${r.total} 人`}</text> : null}
  </svg></figure>;
}

/** 五年级：多边形面积。网格上 1 格 = 1 厘米；剪拼过程用 reveal 分步展示。 */
export function PolyAreaStage({ params, scene, interactive, reduceMotion }: StageProps) {
  const r = polyArea(params);
  const reveal = interactive ? 9 : scene.reveal ?? 0;
  const { a, h } = params, b = params.b;
  // 顶点来自 polyShapes：测试用鞋带公式核对过，画出来的图形面积与公式一致
  const g = polyShapes(params);
  const u = Math.min(20, Math.floor(380 / g.width)), ox = 30, oy = 200;
  const cols = Math.floor(400 / u);
  const P = (x: number, y: number) => `${ox + x * u},${oy - y * u}`;
  const pts = (list: [number, number][]) => list.map(([x, y]) => P(x, y)).join(" ");
  const anim = reduceMotion ? undefined : { transition: "transform .8s ease" };
  const grid = <g>{Array.from({ length: cols + 1 }, (_, i) => <line key={`v${i}`} x1={ox + i * u} y1={oy} x2={ox + i * u} y2={oy - 8 * u} stroke="#edf1e8" />)}{Array.from({ length: 9 }, (_, i) => <line key={`h${i}`} x1={ox} y1={oy - i * u} x2={ox + cols * u} y2={oy - i * u} stroke="#edf1e8" />)}</g>;
  const heightLine = (x: number) => <g><line x1={ox + x * u} y1={oy} x2={ox + x * u} y2={oy - h * u} stroke={C.red} strokeWidth="1.5" strokeDasharray="4 3" /><text x={ox + x * u + 4} y={oy - h * u / 2} fontSize="11" fill={C.red}>高 {h}</text></g>;
  let body;
  if (params.shape === 0) {
    // 平行四边形：剪下左侧三角形（cut），平移 a 格补到右边，拼成长方形
    const moved = reveal >= 3;
    const rest: [number, number][] = [[g.off, 0], [a, 0], [a + g.off, h], [g.off, h]];
    body = <g>
      <polygon points={pts(rest)} fill="#dbe7f5" stroke={C.ink} strokeWidth="2" />
      <polygon points={pts(g.cut!)} fill={reveal >= 2 ? "#f4e2b5" : "#dbe7f5"} stroke={C.ink} strokeWidth="2" style={{ ...anim, transform: moved ? `translateX(${a * u}px)` : "none" }} />
      {reveal >= 2 ? heightLine(g.heightX) : null}
      <text x={ox + (a / 2) * u} y={oy + 16} textAnchor="middle" className="stage-label">底 {a}</text>
    </g>;
  } else if (params.shape === 1) {
    // 三角形：再拿一个完全一样的（copy，旋转 180°）拼成平行四边形
    body = <g>
      <polygon points={pts(g.shape)} fill="#dbe7f5" stroke={C.ink} strokeWidth="2" />
      {reveal >= 2 ? <polygon points={pts(g.copy!)} fill="#f4e2b5" stroke={C.ink} strokeWidth="2" strokeDasharray={reveal >= 3 ? "none" : "5 4"} opacity={reveal >= 3 ? 1 : 0.7} /> : null}
      {heightLine(g.heightX)}
      <text x={ox + (a / 2) * u} y={oy + 16} textAnchor="middle" className="stage-label">底 {a}</text>
    </g>;
  } else {
    // 梯形：下底 a 在下，上底 b 在上；第二个倒过来拼在右边成平行四边形，底 a+b
    body = <g>
      <polygon points={pts(g.shape)} fill="#dbe7f5" stroke={C.ink} strokeWidth="2" />
      {reveal >= 2 ? <polygon points={pts(g.copy!)} fill="#f4e2b5" stroke={C.ink} strokeWidth="2" strokeDasharray={reveal >= 3 ? "none" : "5 4"} opacity={reveal >= 3 ? 1 : 0.7} /> : null}
      {heightLine(g.heightX)}
      <text x={ox + (a / 2) * u} y={oy + 16} textAnchor="middle" className="stage-label">下底 {a}</text>
      <text x={ox + (g.s + b / 2) * u} y={oy - h * u - 6} textAnchor="middle" className="stage-label">上底 {b}</text>
      {reveal >= 3 ? <text x={ox + ((a + b) / 2) * u} y={oy + 32} textAnchor="middle" className="stage-hint">拼成的底 = {b} + {a} = {a + b}</text> : null}
    </g>;
  }
  return <figure className="stage"><svg viewBox="0 0 440 240" role="img" aria-label={`${r.name}，面积 ${r.calc} 平方厘米`}>
    {grid}{body}
    <text x="425" y="24" textAnchor="end" className="stage-label">每小格边长 1 厘米</text>
    {reveal >= 3 ? <text x="425" y="46" textAnchor="end" className="stage-result" fontSize="14">{`S = ${r.calc} cm²`}</text> : null}
  </svg></figure>;
}
