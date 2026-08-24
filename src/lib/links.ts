export interface LinkToken {
  text: string;
  url?: string;
}

const URL_RE =
  /((?:https?:\/\/|www\.)[^\s<>"')\]},;]+[^\s<>"')\]},;.:!?])/gi;

export function normalizeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function linkTokens(text: string): LinkToken[] {
  const tokens: LinkToken[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const idx = m.index ?? 0;
    if (idx > last) tokens.push({ text: text.slice(last, idx) });
    tokens.push({ text: m[0], url: normalizeUrl(m[0]) });
    last = idx + m[0].length;
  }
  if (last < text.length) tokens.push({ text: text.slice(last) });
  if (tokens.length === 0) tokens.push({ text });
  return tokens;
}

export function findUrls(text: string): string[] {
  return [...text.matchAll(URL_RE)].map((m) => normalizeUrl(m[0]));
}

export function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
