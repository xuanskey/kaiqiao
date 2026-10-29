const EVENTS = new Set(['visit', 'enter', 'grade_select', 'lesson_start', 'quiz_complete', 'backup_export_click']);
const headers = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer'};
const reply = (status, extra = {}) => new Response(null, {status, headers: {...headers, ...extra}});

/** @param {Request} request @param {{METRICS?: {writeDataPoint: Function}}} env */
export async function handleEvent(request, env) {
  if (request.method !== 'POST') return reply(405, {Allow: 'POST'});
  const url = new URL(request.url);
  const host = url.hostname;
  const prod = host === 'www.yanghat.cn' || host === 'yanghat.cn';
  const preview = host === 'yanghat-cn.pages.dev' || host.endsWith('.yanghat-cn.pages.dev');
  const dev = host === 'localhost' || host === '127.0.0.1';
  // fetch() defaults to mode "cors". Current Fetch still sends the real Origin for that
  // mode, even with referrerPolicy "no-referrer" (this client, confirmed in Chromium).
  // The literal Origin value "null" applies to non-cors non-GET requests such as form posts.
  // Accept that opaque value only when Sec-Fetch-Site is same-origin.
  const origin = request.headers.get('Origin');
  const site = request.headers.get('Sec-Fetch-Site');
  const opaque = origin === null || origin === 'null';
  if ((site !== null && site !== 'same-origin') ||
      (opaque ? site !== 'same-origin' : origin !== url.origin) ||
      !(prod || preview || dev)) return reply(403);
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415);
  if (Number(request.headers.get('Content-Length')) > 512) return reply(413);
  const chunks = [];
  let size = 0;
  const reader = request.body?.getReader();
  if (reader) {
    try {
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 512) {
          void reader.cancel().catch(() => {});
          return reply(413);
        }
        chunks.push(value);
      }
    } catch { return reply(400); }
    finally { reader.releaseLock(); }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let data;
  try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply(400); }
  if (data === null || typeof data !== 'object' || Array.isArray(data) ||
      Object.getPrototypeOf(data) !== Object.prototype ||
      Object.keys(data).sort().join(',') !== 'count,event,grade,v' ||
      data.v !== 1 || !EVENTS.has(data.event) || data.count !== 1 ||
      !(data.grade === null || (Number.isInteger(data.grade) && data.grade >= 1 && data.grade <= 6))) return reply(400);
  if (typeof env?.METRICS?.writeDataPoint !== 'function') return reply(503);
  try {
    env.METRICS.writeDataPoint({indexes: [data.event], blobs: [data.event, data.grade === null ? 'none' : String(data.grade), prod ? 'prod' : preview ? 'preview' : 'dev'], doubles: [1]});
  } catch { /* Best effort; never retry. */ }
  return reply(204);
}
