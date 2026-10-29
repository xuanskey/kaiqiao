/** Offline top-up protocol. No storage, UI, network, or signing capability here. */
export const MAX_YUAN = 50;
export const ORDER_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const STORAGE_KEY = 'kaiqiao.topup.v1';
const BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ORDER = /^KQ[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;
export function validateYuan(value) {
  if (!/^[1-9]\d*$/.test(String(value))) throw Error(`请输入 1–${MAX_YUAN} 之间的整数元，不要填小数。`);
  const yuan = Number(value);
  if (!Number.isSafeInteger(yuan) || yuan > MAX_YUAN) throw Error(`请输入 1–${MAX_YUAN} 之间的整数元。`);
  return yuan;
}
/** Rejection sampling avoids modulo bias. */
export function randomBelow(limit, rng = crypto) {
  const byte = new Uint8Array(1), ceiling = 256 - 256 % limit;
  do { rng.getRandomValues(byte); } while (byte[0] >= ceiling);
  return byte[0] % limit;
}
export function createOrder(value, existing = [], rng = crypto, now = Date.now()) {
  const yuan = validateYuan(value);
  let id;
  do { id = 'KQ' + Array.from({length:4}, () => ORDER_ALPHABET[randomBelow(ORDER_ALPHABET.length,rng)]).join(''); }
  while (existing.some(order => order.id === id));
  return {id, points:yuan*100, payableFen:yuan*100+1+randomBelow(9,rng), createdAt:now, redeemed:false};
}
export function encodeBase32(bytes) {
  let bits=0, value=0, out='';
  for (const byte of bytes) { value=(value<<8)|byte; bits+=8; while(bits>=5){ bits-=5;out+=BASE32[(value>>>bits)&31]; } }
  if(bits) out+=BASE32[(value<<(5-bits))&31];
  return out.match(/.{1,5}/g)?.join('-') || '';
}
export function decodeBase32(input) {
  const raw=String(input).toUpperCase().replace(/[\s-]/g,'').replace(/O/g,'0').replace(/[IL]/g,'1');
  if(!raw || raw.length>256) throw Error('请检查充值码是否完整，或请家长联系客服。');
  let bits=0,value=0;const bytes=[];
  for(const char of raw){const n=BASE32.indexOf(char);if(n<0)throw Error('请检查充值码是否完整，或请家长联系客服。');value=(value<<5)|n;bits+=5;if(bits>=8){bits-=8;bytes.push((value>>>bits)&255);}}
  const result=new Uint8Array(bytes);
  if(encodeBase32(result).replace(/-/g,'')!==raw)throw Error('请检查充值码是否完整，或请家长联系客服。');
  return result;
}
/** Beijing civil days since 1970-01-01; unsigned integers use network byte order. */
export function beijingDay(now = Date.now()) { return Math.floor((now + 8*3600000)/86400000); }
export function encodePayload(id, points, day = beijingDay(), version = 1) {
  if(!ORDER.test(id)||!Number.isInteger(points)||points<1||points>0xffffffff||!Number.isInteger(day)||day<0||day>0xffffffff)throw Error('订单信息不正确。');
  const payload=new Uint8Array(15);payload[0]=version;
  for(let i=0;i<6;i++)payload[1+i]=id.charCodeAt(i);
  const view=new DataView(payload.buffer);view.setUint32(7,points);view.setUint32(11,day);
  return payload;
}
export async function verifyCode(code, publicKeyJwk, subtle = crypto.subtle) {
  try {
    const bytes=decodeBase32(code);
    if(bytes.length!==79)throw Error();
    const payload=bytes.slice(0,15);
    const key=await subtle.importKey('jwk',publicKeyJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    if(!await subtle.verify({name:'ECDSA',hash:'SHA-256'},key,bytes.slice(15),payload)||payload[0]!==1)throw Error();
    const id=String.fromCharCode(...payload.slice(1,7)),view=new DataView(payload.buffer);
    if(!ORDER.test(id))throw Error();
    return {id,points:view.getUint32(7),day:view.getUint32(11)};
  } catch { throw Error('充值码暂时无法兑换。请检查是否复制完整，或请家长联系客服。'); }
}
export function emptyState() { return {balance:0,orders:[]}; }
/** Reject corrupt storage rather than silently overwriting a paid order. */
export function readState(raw) {
  if(raw===null)return emptyState();
  try {
    const s=JSON.parse(raw);
    if(!Number.isSafeInteger(s.balance)||s.balance<0||!Array.isArray(s.orders))throw Error();
    const seen=new Set();
    for(const o of s.orders){if(!ORDER.test(o.id)||seen.has(o.id)||!Number.isInteger(o.points)||o.points<100||o.points>MAX_YUAN*100||o.points%100||!Number.isInteger(o.payableFen)||o.payableFen-o.points<1||o.payableFen-o.points>9||!Number.isSafeInteger(o.createdAt)||typeof o.redeemed!=='boolean')throw Error();seen.add(o.id);}
    return s;
  }catch{throw Error('本机订单记录无法读取，请先联系客服，不要清理浏览器数据。');}
}
/** Atomic single-object update, to be persisted once by the caller. */
export function applyRedemption(state, payload) {
  const order=state.orders.find(o=>o.id===payload.id);
  if(!order)throw Error('这张码对应的订单不在本机，请在生成订单的浏览器兑换。');
  if(order.redeemed)throw Error('这个订单已经兑换过了，不能重复兑换。');
  if(order.points!==payload.points)throw Error('充值码与订单点数不一致，请家长联系客服核对。');
  if(!Number.isSafeInteger(state.balance+order.points))throw Error('余额暂时无法增加，请联系客服。');
  return {balance:state.balance+order.points,orders:state.orders.map(o=>o.id===order.id?{...o,redeemed:true}:o)};
}
export async function redeem(state, code, publicKeyJwk, subtle = crypto.subtle) {
  return applyRedemption(state,await verifyCode(code,publicKeyJwk,subtle));
}
/** Append an order onto the newest state. Balance and existing orders stay as they are. */
export function projectCreate(latest, order) {
  if (latest.orders.some(item => item.id === order.id)) return { state: latest, status: 'exists' };
  return { state: { balance: latest.balance, orders: [...latest.orders, order] }, status: 'created' };
}
/** Drop an unpaid order. A redeemed order is left untouched. */
export function projectDelete(latest, id) {
  const order = latest.orders.find(item => item.id === id);
  if (!order) return { state: latest, status: 'missing' };
  if (order.redeemed) return { state: latest, status: 'redeemed' };
  return { state: { balance: latest.balance, orders: latest.orders.filter(item => item.id !== id) }, status: 'deleted' };
}
/** Credit one order onto the newest state. Refuses a code that is already redeemed. */
export function projectRedeem(latest, payload) {
  const order = latest.orders.find(item => item.id === payload.id);
  if (!order) throw Error('这张码对应的订单不在本机，请在生成订单的浏览器兑换。');
  if (order.redeemed) throw Error('这个订单已经兑换过了，不能重复兑换。');
  if (order.points !== payload.points) throw Error('充值码与订单点数不一致，请家长联系客服核对。');
  const expected = latest.balance + order.points;
  return { state: applyRedemption(latest, payload), expected, order: { ...order, redeemed: true } };
}
/**
 * Read-back after a redeem write.
 * Same-code double credit (balance exactly one extra copy) is rolled back.
 * A stale overwrite that dropped the credit is written back onto the newest orders.
 */
export function reconcileRedeem(after, redeemedOrder, expectedBalance) {
  const points = redeemedOrder.points;
  const found = after.orders.find(item => item.id === redeemedOrder.id);
  if (found?.redeemed && after.balance - expectedBalance === points) {
    return { state: { balance: expectedBalance, orders: after.orders }, error: Error('这个订单已经兑换过了，不能重复兑换。') };
  }
  if (!found || !found.redeemed || after.balance < expectedBalance) {
    const orders = found
      ? after.orders.map(item => item.id === redeemedOrder.id ? { ...item, redeemed: true } : item)
      : [...after.orders, redeemedOrder];
    return { state: { balance: Math.max(after.balance, expectedBalance), orders } };
  }
  return null;
}
/**
 * One critical section for create, delete, and redeem.
 * With Web Locks the whole callback, including verification, holds the lock.
 * Without locks, a storage listener marks foreign writes; commit reloads immediately
 * before saving, then read-back can roll a duplicate credit back.
 */
export async function transact(io, run) {
  const exec = async () => {
    let foreign = false;
    const stop = io.listen?.(key => { if (key === STORAGE_KEY) foreign = true; });
    try {
      return await run({
        load: io.load,
        sawForeign: () => foreign,
        commit(project) {
          const replay = () => {
            const produced = project(io.load());
            if (produced.error && produced.state === undefined) throw produced.error;
            return produced;
          };
          let produced;
          try { produced = replay(); }
          catch (error) {
            if (io.locks?.request || !foreign) throw error;
            foreign = false;
            produced = replay();
          }
          // No Web Locks: another tab wrote. Drop the stale result, load again, replay this increment, then save.
          if (!io.locks?.request && foreign) {
            foreign = false;
            produced = replay();
          }
          io.save(produced.state);
          const after = io.load();
          const fixed = produced.reconcile?.(after);
          if (fixed?.state) io.save(fixed.state);
          if (fixed?.error) throw fixed.error;
          return produced;
        },
      });
    } finally { stop?.(); }
  };
  if (io.locks?.request) return io.locks.request(STORAGE_KEY, exec);
  return exec();
}
