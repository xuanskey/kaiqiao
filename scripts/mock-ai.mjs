import { createServer } from 'node:http';
import { createApi } from '../workers/ai/api.ts';
const api = createApi({ adminToken: process.env.AI_ADMIN_TOKEN });
createServer(async (req, res) => {
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 16000) { res.writeHead(413); res.end(); return; }
      chunks.push(chunk);
    }
    const result = await api.handle(new Request(`http://127.0.0.1:8787${req.url}`, {
      method: req.method, headers: req.headers,
      ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }),
    }));
    res.writeHead(result.status, Object.fromEntries(result.headers));
    res.end(await result.text());
  } catch { res.writeHead(500); res.end(); }
}).listen(8787, '127.0.0.1', () => console.log('Mock AI: http://127.0.0.1:8787 (内存账本，重启清空)'));
