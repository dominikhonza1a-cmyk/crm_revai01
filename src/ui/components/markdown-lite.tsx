"use client";

import type { ReactNode } from "react";

/**
 * Lehký markdown pro Nápady a popisy: # / ## nadpisy (Bebas Neue), - odrážky,
 * **tučně**, *kurzíva*, `kód`, [text](url) i holé URL jako klikací odkazy.
 * Žádné závislosti — řádkový parser.
 */
const URL_RE = /(https?:\/\/[^\s)\]]+|www\.[^\s)\]]+)/g;

function inline(text: string, keyBase: string): ReactNode[] {
  // 1) markdown odkazy [text](url), 2) tučně, 3) kurzíva, 4) kód, 5) holé URL
  const parts: ReactNode[] = [];
  let rest = text;
  let k = 0;
  const push = (n: ReactNode) => parts.push(<span key={`${keyBase}-${k++}`}>{n}</span>);

  while (rest.length) {
    const md = rest.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const bold = rest.match(/\*\*([^*]+)\*\*/);
    const ital = rest.match(/(^|[^*])\*([^*\n]+)\*/);
    const code = rest.match(/`([^`]+)`/);
    const url = URL_RE.exec(rest); URL_RE.lastIndex = 0;

    const candidates = [
      md && { i: md.index!, len: md[0].length, node: <a href={md[2]} target="_blank" rel="noreferrer" className="text-accent underline decoration-accent/40 hover:decoration-accent">{md[1]}</a> },
      bold && { i: bold.index!, len: bold[0].length, node: <strong className="font-semibold text-ink">{bold[1]}</strong> },
      ital && { i: ital.index! + (ital[1]?.length ?? 0), len: ital[0].length - (ital[1]?.length ?? 0), node: <em>{ital[2]}</em> },
      code && { i: code.index!, len: code[0].length, node: <code className="rounded bg-white/10 px-1 py-0.5 text-[0.85em]">{code[1]}</code> },
      url && { i: url.index, len: url[0].length, node: <a href={url[0].startsWith("http") ? url[0] : `https://${url[0]}`} target="_blank" rel="noreferrer" className="break-all text-accent underline decoration-accent/40 hover:decoration-accent">{url[0]}</a> },
    ].filter(Boolean) as { i: number; len: number; node: ReactNode }[];

    if (!candidates.length) { push(rest); break; }
    const first = candidates.sort((a, b) => a.i - b.i)[0]!;
    if (first.i > 0) push(rest.slice(0, first.i));
    push(first.node);
    rest = rest.slice(first.i + first.len);
  }
  return parts;
}

export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: ReactNode[] = [];
  let inCode = false;
  let codeBuf: string[] = [];

  const flushList = (key: string) => {
    if (list.length) { out.push(<ul key={key} className="my-1.5 ml-5 list-disc space-y-1 marker:text-accent/70">{list}</ul>); list = []; }
  };

  lines.forEach((line, i) => {
    const key = `l${i}`;
    if (line.trim().startsWith("```")) {
      if (inCode) { out.push(<pre key={key} className="my-2 overflow-x-auto rounded-xl bg-black/30 p-3 text-xs leading-relaxed text-muted">{codeBuf.join("\n")}</pre>); codeBuf = []; }
      inCode = !inCode;
      return;
    }
    if (inCode) { codeBuf.push(line); return; }

    if (/^\s*([-•·]|\[[ x]\])\s+/.test(line)) {
      list.push(<li key={key}>{inline(line.replace(/^\s*([-•·]|\[[ x]\])\s+/, ""), key)}</li>);
      return;
    }
    flushList(`ul${i}`);

    if (line.startsWith("## ")) out.push(<h2 key={key} className="mt-4 mb-1 font-display text-xl tracking-wide text-ink">{line.slice(3)}</h2>);
    else if (line.startsWith("# ")) out.push(<h1 key={key} className="mt-4 mb-1.5 font-display text-2xl tracking-wide text-ink">{line.slice(2)}</h1>);
    else if (line.trim() === "") out.push(<div key={key} className="h-2.5" />);
    else out.push(<p key={key} className="leading-relaxed">{inline(line, key)}</p>);
  });
  flushList("ul-end");
  if (inCode && codeBuf.length) out.push(<pre key="code-end" className="my-2 overflow-x-auto rounded-xl bg-black/30 p-3 text-xs text-muted">{codeBuf.join("\n")}</pre>);

  return <div className="text-sm text-muted">{out}</div>;
}
