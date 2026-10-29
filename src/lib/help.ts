export const helpEndpoint = import.meta.env.VITE_HELP_ENDPOINT ?? '';
export async function askHelp(q: string, signal: AbortSignal): Promise<string> {
  if (helpEndpoint !== '/api/help') throw new Error('Help disabled');
  const response = await fetch(helpEndpoint, {method:'POST',credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({v:1,q:q.trim()}),signal});
  const data = await response.json();
  if (!response.ok || data.v !== 1 || typeof data.answer !== 'string') throw new Error('Help unavailable');
  return data.answer;
}
