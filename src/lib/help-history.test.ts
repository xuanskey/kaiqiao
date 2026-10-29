import test from 'node:test';
import assert from 'node:assert/strict';
import {trimHelpHistory, type HelpMessage} from './help-history.ts';
const pair=(q='问',a='答'):HelpMessage[]=>[{role:'user',content:q},{role:'assistant',content:a}];
test('first question is trimmed; original history unchanged',()=>{
 const history=pair();assert.deepEqual(trimHelpHistory([], ' 😀 '),[{role:'user',content:'😀'}]);
 assert.deepEqual(trimHelpHistory(history,'新'),[...pair(),{role:'user',content:'新'}]);assert.deepEqual(history,pair());
});
test('count limit drops oldest complete pair',()=>{
 const history=Array.from({length:6},(_,i)=>pair(String(i))).flat();const result=trimHelpHistory(history,'当前');
 assert.equal(result.length,11);assert.equal(result[0].content,'1');assert.equal(result.at(-1)?.content,'当前');
});
test('total counts Unicode code points and keeps boundary',()=>{
 const history=[...pair('😀'.repeat(300),'答'.repeat(600)),...pair('问'.repeat(300),'答'.repeat(600))];
 assert.equal(trimHelpHistory(history,'新'.repeat(200)).length,5);
 const result=trimHelpHistory(history,'新'.repeat(201));assert.equal(result.length,3);assert.equal(result.at(-1)?.content,'新'.repeat(201));
});
