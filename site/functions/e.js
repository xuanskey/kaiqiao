import {handleEvent} from '../../workers/metrics/handler.js';
export const onRequest = (ctx) => handleEvent(ctx.request, ctx.env);
