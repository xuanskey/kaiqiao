import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const TEST_POINTS = Object.freeze([
 Object.freeze({timestamp:'2026-10-29 12:58:07',event:'backup_export_click',grade:'6',env:'prod'}),
 Object.freeze({timestamp:'2026-10-29 13:55:51',event:'visit',grade:'none',env:'prod'}),
 Object.freeze({timestamp:'2026-10-29 13:56:37',event:'visit',grade:'none',env:'prod'})
]);
export function buildEventCountsSql({days=7}={}) {
 if(!Number.isSafeInteger(days)||days<1)throw Error('days 必须为正安全整数');
 const exclusions=TEST_POINTS.map(p=>`  AND NOT (timestamp = toDateTime('${p.timestamp}') AND blob1='${p.event}' AND blob2='${p.grade}' AND blob3='${p.env}')`).join('\n');
 return `SELECT toStartOfDay(timestamp) AS day, blob1 AS event, blob2 AS grade,\n       SUM(_sample_interval) AS n\nFROM kaiqiao_metrics\nWHERE blob3='prod' AND timestamp > NOW() - INTERVAL '${days}' DAY\n${exclusions}\nGROUP BY day, event, grade\nORDER BY day, event, grade;\n`;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{const args=process.argv.slice(2);if(args.length&&!(args.length===2&&args[0]==='--days'))throw Error('用法：node scripts/metrics-sql.mjs [--days 正整数]');process.stdout.write(buildEventCountsSql({days:args.length?Number(args[1]):7}));}
 catch(error){console.error(error.message);process.exitCode=1;}
}
