import { test } from 'node:test';
import assert from 'node:assert/strict';

class FakeWorker extends EventTarget { state = 'installing'; posted: unknown[] = []; postMessage(m: unknown) { this.posted.push(m); } go(state: string) { this.state = state; this.dispatchEvent(new Event('statechange')); } }
class FakeReg extends EventTarget { waiting: FakeWorker | null = null; installing: FakeWorker | null = null; updates = 0; async update() { this.updates++; } }
class FakeContainer extends EventTarget { controller: object | null = {}; }
(globalThis as any).document = Object.assign(new EventTarget(), { visibilityState: 'visible' });

test('首次安装（没有旧版本在控制）不提示；有旧版本时新版本装好才提示；点更新才发 SKIP_WAITING，接管后本页刷新一次', async () => {
  const { watchServiceWorker, updateStore, applyUpdate } = await import('./sw-update.ts');
  const reg = new FakeReg(), first = new FakeContainer(); first.controller = null;
  let reloads = 0;
  reg.installing = new FakeWorker();
  watchServiceWorker(reg as any, first as any, () => reloads++);
  reg.installing.go('installed');
  assert.equal(updateStore.ready(), false, '首次安装不提示');

  const reg2 = new FakeReg(), box = new FakeContainer();
  watchServiceWorker(reg2 as any, box as any, () => reloads++);
  const next = new FakeWorker(); reg2.installing = next; reg2.dispatchEvent(new Event('updatefound'));
  assert.equal(updateStore.ready(), false);
  next.go('installed');
  assert.equal(updateStore.ready(), true);
  assert.deepEqual(next.posted, [], '不自动接管');
  applyUpdate();
  assert.deepEqual(next.posted, ['SKIP_WAITING']);
  box.dispatchEvent(new Event('controllerchange'));
  assert.equal(updateStore.ready(), false);
  assert.equal(reloads, 1);
  (globalThis as any).document.dispatchEvent(new Event('visibilitychange'));
  assert.equal(reg2.updates, 1, '回到前台检查一次更新');
});
