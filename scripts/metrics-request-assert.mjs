import assert from 'node:assert/strict';

export async function recordMetrics(route, events) {
  const request = route.request();
  const headers = await request.allHeaders();
  events.push({
    url: request.url(),
    method: request.method(),
    body: request.postData(),
    cookie: headers.cookie,
    referer: headers.referer,
  });
  await route.fulfill({ status: 204 });
}

export function assertSameOriginMetrics(events, origin) {
  assert.ok(events.length > 0, '开启后应有同源 /e 请求');
  for (const event of events) {
    const url = new URL(event.url);
    assert.equal(url.origin, origin, event.url);
    assert.equal(url.pathname, '/e');
    assert.equal(url.search, '');
    assert.equal(event.method, 'POST');
    assert.equal(event.cookie, undefined, 'cookie');
    assert.equal(event.referer, undefined, 'referer');
    const body = JSON.parse(event.body);
    assert.deepEqual(Object.keys(body), ['v', 'event', 'grade', 'count']);
  }
}
