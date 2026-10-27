/** Worker 独立净化：仅返回有限长度的纯文本，调用方仍须以文本渲染。 */
export function sanitizeText(text: unknown, maxLen = 400): string {
  if (typeof text !== 'string') return '';
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\bhttps?:\/\/\S+/gi, '')
    .replace(/[*#<>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}
