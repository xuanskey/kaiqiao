import {createTracker} from './metrics.js';
import endpoint from './metrics-config.js';
const track=createTracker(endpoint);
if(new URLSearchParams(location.search).get('practice')!=='1'){
  track('visit');
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    if(!link)return;
    const url=new URL(link.href);
    if(url.origin!==location.origin || url.pathname!=='/' || url.searchParams.get('practice')!=='1')return;
    if(link.hasAttribute('data-grade'))track('grade_select',Number(link.dataset.grade));
    else if(link.matches('[data-primary-cta],.nav-practice'))track('enter');
  });
}
