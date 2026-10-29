import {handleHelp} from '../../../workers/help/handler.js';
export const onRequest = (ctx) => handleHelp(ctx.request, ctx.env);
