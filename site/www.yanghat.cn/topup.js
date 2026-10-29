import config from './topup-config.js';
import { STORAGE_KEY, createOrder, readState, verifyCode, applyRedemption } from './topup-core.js';
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
      remove.addEventListener('click',()=>{try{const latest=load();save({...latest,orders:latest.orders.filter(o=>o.id!==order.id||o.redeemed)});render();message('已删除订单。');}catch(e){message(e.message);}});
      details.append(summary,warning,remove);card.append(details);
    }
    $('#orders').append(card);
  }
}
$('#order-form').addEventListener('submit',event=>{
  event.preventDefault();
  try { const state=load(),order=createOrder($('#yuan').value,state.orders);save({...state,orders:[...state.orders,order]});render();message(`订单 ${order.id} 已生成，请按应付金额付款，付款备注填订单号。`); }
  catch(e){ message(e.message); }
});
let busy=false;
$('#redeem-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;busy=true;const button=$('#redeem-form button');button.disabled=true;
  try {
    const payload=await verifyCode($('#code').value,config.publicKeyJwk);
    // Read the latest state AFTER verification, then write balance + redeemed in one operation.
    const commit=()=>{save(applyRedemption(load(),payload));render();};
    if(navigator.locks)await navigator.locks.request(STORAGE_KEY,commit);else commit();
    message('兑换成功，点数已存入本机余额。');
  }catch(e){message(e.message);}
  finally{busy=false;button.disabled=false;}
});
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY){try{render();}catch(e){message(e.message);}}});
try { render(); } catch(e) { message(e.message); }
