// --write refreshes FAQ JSON-LD from the visible FAQ; default verifies without changes.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const file = 'site/www.yanghat.cn/index.html';
let html = await readFile(file, 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage();
  // DOMParser gives browser text/entity handling without running landing page scripts or requests.
  const head = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const meta = Object.fromEntries([...doc.head.querySelectorAll('meta[name], meta[property]')].map(node => [node.getAttribute('name') || node.getAttribute('property'), node.content]));
    return { title: doc.title, meta };
  }, html);
  assert.equal(head.title, '开窍数学练习_小学1-6年级人教版跟练｜养习');
  assert.ok(head.meta.description.length <= 80);
  for (const key of ['og:title', 'twitter:title']) assert.equal(head.meta[key], head.title);
  for (const key of ['og:description', 'twitter:description']) assert.equal(head.meta[key], head.meta.description);
  assert.equal(head.meta['og:url'], 'https://www.yanghat.cn/');
  assert.equal(head.meta['og:type'], 'website');
  assert.equal(head.meta['og:site_name'], '养习');
  assert.equal(head.meta['og:image'], 'https://www.yanghat.cn/assets/og-cover-20261029.jpg');
  assert.equal(head.meta['twitter:image'], head.meta['og:image']);
  assert.equal(head.meta['og:image:width'], '1200');
  assert.equal(head.meta['og:image:height'], '630');
  assert.ok(head.meta['og:image:alt']);
  assert.equal(head.meta['twitter:card'], 'summary_large_image');
  console.log('SEO/share head verified');
  const faq = await page.evaluate((source) => {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    return [...doc.querySelectorAll('.faq-list details')].map(detail => {
      const summary = detail.querySelector('summary').cloneNode(true);
      summary.querySelectorAll('.faq-number, svg').forEach(node => node.remove());
      const clean = node => node.textContent.replace(/\s+/g, ' ').trim();
      // Keep only anchors, resolving the visible page href against its canonical URL.
      // Escape text before serializing HTML so literal angle brackets remain text.
      const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const answerHTML = node => {
        if (node.nodeType === Node.TEXT_NODE) return escape(node.textContent);
        const contents = [...node.childNodes].map(answerHTML).join('');
        if (node.nodeName !== 'A') return contents;
        const href = new URL(node.getAttribute('href'), doc.querySelector('link[rel="canonical"]').href);
        if (href.protocol !== 'https:' || !['www.yanghat.cn', 'yanghat.cn'].includes(href.hostname) || href.pathname.startsWith('/app')) {
          throw new Error('FAQ link must use the public HTTPS entry');
        }
        return `<a href="${escape(href.href)}">${contents}</a>`;
      };
      const answer = answerHTML(detail.querySelector('.faq-answer')).replace(/\s+/g, ' ').trim();
      return { '@type': 'Question', name: clean(summary), acceptedAnswer: { '@type': 'Answer', text: answer } };
    });
  }, html);
  assert.ok(faq.length > 0);
  const schema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq };
  const pattern = /  <script type="application\/ld\+json" id="faq-schema">[\s\S]*?<\/script>\n/;
  if (process.argv.includes('--write')) {
    const tag = `  <script type="application/ld+json" id="faq-schema">\n${JSON.stringify(schema, null, 2).replace(/</g, '\\u003c')}\n  </script>\n`;
    html = html.replace(pattern, '').replace('</head>', tag + '</head>');
    await writeFile(file, html);
  }
  const match = html.match(pattern);
  assert.ok(match, 'FAQ JSON-LD missing');
  const parsed = JSON.parse(match[0].replace(/^.*?>/, '').replace(/<\/script>\s*$/, ''));
  assert.deepEqual(parsed, schema, 'FAQ JSON-LD must match every visible question and complete answer');
  console.log(`FAQPage verified: ${faq.length} questions, exact question/answer text and structure`);
} finally { await browser.close(); }
