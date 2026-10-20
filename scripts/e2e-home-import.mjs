// 可选的浏览器交互测试（不在 CI 中运行）：首页“今日计划/推荐”与 PDF、Word、PPT、图片导入。
// npm run build && npx vite preview --port 4173 &
// npm i --no-save playwright && CHROMIUM_PATH=/path/to/chromium node scripts/e2e-home-import.mjs
// 图片文字识别需要联网下载识别模型；设置 SKIP_OCR=1 可跳过这一项。
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
const out = process.env.SHOT_DIR || 'e2e-shots';
const BASE = process.env.BASE_URL || 'http://localhost:4173/';
await import('node:fs').then((fs) => fs.mkdirSync(out, { recursive: true }));
const results = [];
const ok = (name) => { results.push(name); console.log('✓', name); };

function minimalPdf(lines) {
  const content = `BT /F1 18 Tf 50 750 Td 24 TL ${lines.map((l) => `(${l}) Tj T*`).join(' ')} ET`;
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', `<< /Length ${content.length} >>\nstream\n${content}\nendstream`, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let pdf = '%PDF-1.4\n'; const offs = [];
  objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}
async function minimalDocx(paras) {
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paras.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
  return z.generateAsync({ type: 'nodebuffer' });
}
async function minimalPptx(slides) {
  const z = new JSZip();
  slides.forEach((lines, i) => z.file(`ppt/slides/slide${i + 1}.xml`, `<p:sld xmlns:a="a" xmlns:p="p"><p:cSld><p:spTree>${lines.map((l) => `<a:p><a:r><a:t>${l}</a:t></a:r></a:p>`).join('')}</p:spTree></p:cSld></p:sld>`));
  return z.generateAsync({ type: 'nodebuffer' });
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript(() => { window.__said = []; const ss = window.speechSynthesis; if (ss) { ss.speak = (u) => window.__said.push(u.text); ss.cancel = () => {}; } });
  await page.goto(BASE);
  await page.getByRole('heading', { name: '今天的学习计划' }).waitFor();
  assert.ok(await page.getByRole('img', { name: /今日计划完成 \d\/3/ }).isVisible());
  for (const t of ['上一节互动课', '完成每日练习']) await page.locator('.plan-step', { hasText: t }).waitFor();
  ok('首页显示今日学习计划三步与完成进度环');
  await page.screenshot({ path: `${out}/home-desktop.png`, fullPage: true });
  const pickTitle = (await page.locator('.pick-science strong').innerText()).trim();
  await page.locator('.pick-science').click();
  await page.getByRole('heading', { name: pickTitle }).waitFor();
  ok(`点“今日推荐”科学实验，直接打开《${pickTitle}》`);
  await page.getByLabel('语音朗读老师的话').check();
  await page.getByRole('button', { name: '下一步' }).click();
  const said = await page.evaluate(() => window.__said);
  assert.ok(said.length >= 2, `应朗读至少两句：${said.length}`);
  ok(`语音朗读：勾选后读出当前一步，点“下一步”读出新的一句（共 ${said.length} 句）`);
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('heading', { name: '互动课堂' }).waitFor();
  ok('从推荐课返回课程目录正常');
  // v0.11 新演示：凑十法、条形统计图、多边形面积
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '一年级' }).click();
  await page.locator('li', { hasText: '20 以内的进位加法' }).getByRole('button', { name: '上课' }).first().click();
  await page.getByRole('heading', { name: '凑十法：20 以内进位加法' }).waitFor();
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  await page.getByRole('button', { name: '第二个加数加 1' }).click();
  await page.locator('.stage text', { hasText: '10 + 4 = 14' }).waitFor();
  ok('凑十法：动手把 9+4 改成 9+5，画面显示 10 + 4 = 14');
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '四年级' }).click();
  await page.locator('li', { hasText: '条形统计图' }).getByRole('button', { name: '上课' }).first().click();
  await page.getByRole('button', { name: '让我自己试试' }).first().click();
  await page.getByRole('button', { name: '葡萄加 1 票' }).click();
  await page.locator('.stage text', { hasText: '相差 6 票' }).waitFor();
  ok('条形统计图：给葡萄加 1 票，相差从 7 票变为 6 票');
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '五年级' }).click();
  await page.locator('li', { hasText: '多边形的面积' }).getByRole('button', { name: '上课' }).first().click();
  await page.getByRole('button', { name: '完整过程' }).click();
  await page.locator('.stage text', { hasText: 'S = 8 × 5 = 40 cm²' }).waitFor();
  ok('多边形面积：完整过程显示平行四边形剪拼与 S = 8 × 5 = 40 cm²');
  await page.getByRole('button', { name: '返回课程目录' }).click();
  await page.getByRole('group', { name: '年级' }).getByRole('button', { name: '三年级' }).click();
  // 导入
  const fileInput = page.locator('.import-panel input[type=file]').first();
  await fileInput.setInputFiles({ name: 'lesson.pdf', mimeType: 'application/pdf', buffer: minimalPdf(['12+35=', '48-19=']) });
  await page.getByLabel('资料内容').and(page.locator('textarea')).waitFor();
  await page.waitForFunction(() => document.querySelector('.import-panel textarea')?.value.includes('12+35='), null, { timeout: 30000 });
  assert.ok((await page.locator('.import-panel textarea').inputValue()).includes('48-19='));
  await page.getByRole('button', { name: '识别内容' }).click();
  await page.locator('.import-answer', { hasText: '47' }).waitFor();
  ok('导入 PDF：读出 12+35= 和 48-19=，识别后算出 47');
  await fileInput.setInputFiles({ name: '练习.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: await minimalDocx(['小数乘法', '1.2×0.5=']) });
  await page.waitForFunction(() => document.querySelector('.import-panel textarea')?.value.includes('1.2×0.5='), null, { timeout: 30000 });
  await page.getByRole('button', { name: '识别内容' }).click();
  await page.locator('.import-answer', { hasText: '0.6' }).waitFor();
  ok('导入 Word（.docx）：读出“1.2×0.5=”，算出 0.6');
  await fileInput.setInputFiles({ name: '课件.pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: await minimalPptx([['杠杆的支点在哪里？'], ['25×4=']]) });
  await page.waitForFunction(() => document.querySelector('.import-panel textarea')?.value.includes('25×4='), null, { timeout: 30000 });
  const pptText = await page.locator('.import-panel textarea').inputValue();
  assert.ok(pptText.indexOf('第 1 页') < pptText.indexOf('第 2 页'));
  ok('导入 PPT（.pptx）：按页读出文字，保留页码顺序');
  await fileInput.setInputFiles({ name: '旧文件.doc', mimeType: 'application/msword', buffer: Buffer.from('x') });
  await page.locator('.import-error', { hasText: '另存为 .docx' }).waitFor();
  ok('旧版 .doc 给出“另存为 .docx”提示，不会乱码');
  if (!process.env.SKIP_OCR) {
    const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 520; c.height = 140; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 520, 140); g.fillStyle = '#000'; g.font = 'bold 64px sans-serif'; g.fillText('36+27=', 40, 95); return c.toDataURL('image/png').split(',')[1]; });
    await fileInput.setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    try {
      await page.waitForFunction(() => /36\s*\+\s*27/.test(document.querySelector('.import-panel textarea')?.value ?? ''), null, { timeout: 90000 });
      ok('拍照识别：从图片中识别出 36+27=');
    } catch {
      const msg = await page.locator('.import-error, .import-busy').allInnerTexts();
      console.log('⚠ 图片识别未完成（多为无法联网下载识别模型）：', msg.join(' | '));
    }
  }
  await page.screenshot({ path: `${out}/import-desktop.png`, fullPage: true });
  await page.evaluate(() => { const d = new Date(); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; localStorage.setItem('kaiqiao-activity', JSON.stringify({ [k]: { n: 12, ok: 9 } })); });
  await page.reload();
  await page.locator('.week-card').waitFor();
  assert.equal(await page.locator('.week-copy strong').innerText(), '12 题');
  assert.ok((await page.locator('.week-copy span').innerText()).includes('答对 75%'));
  ok('首页“这一周”：读取本机记录，显示 12 题、答对 75%，今天的柱子高亮');
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(BASE);
  await m.getByRole('heading', { name: '今天的学习计划' }).waitFor();
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `手机宽度不应横向溢出：${overflow}`);
  ok('手机 390px 宽首页无横向溢出');
  await m.screenshot({ path: `${out}/home-mobile.png`, fullPage: true });
  assert.deepEqual(errors, [], errors.join('\n'));
  ok('全程无页面错误');
  console.log(`${results.length} 项首页与导入检查通过`);
} finally { await browser.close(); }
