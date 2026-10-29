import type {HelpMessage} from './help-history';
export const helpEndpoint = import.meta.env.VITE_HELP_ENDPOINT ?? '';
export async function askHelp(messages: HelpMessage[], signal: AbortSignal): Promise<{answer: string; source: 'ai' | 'fallback'}> {
  if (helpEndpoint !== '/api/help') throw new Error('Help disabled');
  const response = await fetch(helpEndpoint, {method:'POST',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({v:2,messages}),signal});
  const data = await response.json();
  if (!response.ok || data.v !== 1 || typeof data.answer !== 'string' || !['ai','fallback'].includes(data.source)) throw new Error('Help unavailable');
  return {answer:data.answer,source:data.source};
}
