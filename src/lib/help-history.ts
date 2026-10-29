export type HelpMessage = {role: 'user' | 'assistant'; content: string};

// History contains complete successful pairs. Drop pairs, never the current question.
export function trimHelpHistory(history: readonly HelpMessage[], question: string): HelpMessage[] {
  const messages: HelpMessage[] = [...history, {role:'user',content:question.trim()}];
  while (messages.length > 12 || messages.reduce((sum,item)=>sum+Array.from(item.content).length,0) > 2000 || new TextEncoder().encode(JSON.stringify({v:2,messages})).byteLength > 8000) {
    if (messages.length === 1) break;
    messages.splice(0,2);
  }
  return messages;
}
