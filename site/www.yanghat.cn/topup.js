import config from './topup-config.js';
import open from './topup-open.js';
import { STORAGE_KEY, createOrder, readState, verifyCode, projectCreate, projectDelete, projectRedeem, reconcileRedeem, transact } from './topup-core.js';
const $ = selector => document.querySelector(selector);
const message = text => { $('#topup-message').textContent = text; };
function load() {
  let raw;
  try { raw = localStorage.getItem(STORAGE_KEY); }
  catch { throw Error('浏览器无法读取本机订单，请允许本站保存数据，或请家长联系客服。'); }
  return readState(raw);
}
function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { throw Error('浏览器未能保存，请不要付款或清理数据，先联系客服。'); }
}
function listen(notify) {
  const onStorage = event => { if (event.key === STORAGE_KEY) notify(event.key); };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}
const io = () => ({ load, save, listen, locks: navigator.locks });
function render() {
  const state = load(); $('#balance').textContent = String(state.balance);
  $('#orders').replaceChildren();
  if(!state.orders.length) $('#orders').textContent = '还没有订单。';
  for(const order of [...state.orders].reverse()) {
    const card=document.createElement('article');card.className='topup-order';
    const title=document.createElement('h3');title.textContent=`订单号：${order.id}`;
    const info=document.createElement('p');info.textContent=`${order.points} 点 · 应付金额：${(order.payableFen/100).toFixed(2)} 元 · ${order.redeemed?'已兑换':'待处理'}`;
    const time=document.createElement('p');time.textContent=`创建时间：${new Date(order.createdAt).toLocaleString('zh-CN')}`;
    card.append(title,info,time);
    if(!order.redeemed){
      const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='删除订单';
      const warning=document.createElement('p');warning.textContent='已经付款的订单请保留，删除后充值码无法兑换。';
      const remove=document.createElement('button');remove.type='button';remove.textContent='确认删除未付款订单';
      remove.addEventListener('click',()=>{ removeOrder(order.id); });
      details.append(summary,warning,remove);card.append(details);
    }
    $('#orders').append(card);
  }
}
let busy=false;
async function change(work) {
  if (busy) return;
  busy = true;
  const button = $('#redeem-form button');
  if (button) button.disabled = true;
  try { await work(); }
  catch (error) { message(error.message); }
  finally { busy = false; if (button) button.disabled = false; }
}
async function removeOrder(id) {
  await change(async () => {
    const produced = await transact(io(), ({ commit }) => commit(latest => projectDelete(latest, id)));
    render();
    message(produced.status === 'redeemed' ? '该订单已兑换，未删除' : produced.status === 'deleted' ? '已删除订单。' : '没有找到这个订单。');
  });
}
if (!open) {
  $('#topup-closed').hidden = false;
  for (const section of document.querySelectorAll('[data-topup-flow]')) section.hidden = true;
} else {
  $('#topup-closed').hidden = true;
  for (const section of document.querySelectorAll('[data-topup-flow]')) section.hidden = false;
  $('#order-form').addEventListener('submit', event => {
    event.preventDefault();
    change(async () => {
      const yuan = $('#yuan').value;
      let order;
      await transact(io(), ({ commit }) => commit(latest => {
        order = createOrder(yuan, latest.orders);
        const produced = projectCreate(latest, order);
        return { ...produced, reconcile: after => after.orders.some(item => item.id === order.id) ? null : { state: projectCreate(after, order).state } };
      }));
      render();
      message(`订单 ${order.id} 已生成，请按应付金额付款，付款备注填订单号。`);
    });
  });
  $('#redeem-form').addEventListener('submit', event => {
    event.preventDefault();
    change(async () => {
      const code = $('#code').value;
      await transact(io(), async ({ commit }) => {
        const payload = await verifyCode(code, config.publicKeyJwk);
        await commit(latest => {
          const produced = projectRedeem(latest, payload);
          return { ...produced, reconcile: after => reconcileRedeem(after, produced.order, produced.expected) };
        });
      });
      render();
      message('兑换成功，点数已存入本机余额。');
    });
  });
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) { try { render(); } catch (error) { message(error.message); } } });
  try { render(); } catch (error) { message(error.message); }
}
