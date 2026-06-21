// Simple markdown renderer for AI insights — supports headings, bold, lists, paragraphs, code, links.
import React from "react";

function inline(text) {
  // **bold**
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // *italic*
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // `code`
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  // [text](url)
  text = text.replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  return text;
}

export default function Markdown({ text = "" }) {
  if (!text) return null;
  const lines = text.split(/\r?\n/);
  const out = [];
  let listBuf = null; // {type:'ul'|'ol', items:[]}
  const flushList = () => {
    if (!listBuf) return;
    const Tag = listBuf.type;
    out.push(
      <Tag key={`list-${out.length}`}>
        {listBuf.items.map((it, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inline(it) }} />
        ))}
      </Tag>
    );
    listBuf = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) { flushList(); continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushList();
      const lvl = h[1].length;
      const Tag = `h${lvl}`;
      out.push(<Tag key={i} dangerouslySetInnerHTML={{ __html: inline(h[2]) }} />);
      continue;
    }
    const ul = /^[-*]\s+(.*)$/.exec(line);
    const ol = /^\d+\.\s+(.*)$/.exec(line);
    if (ul) {
      if (!listBuf || listBuf.type !== "ul") { flushList(); listBuf = { type: "ul", items: [] }; }
      listBuf.items.push(ul[1]);
      continue;
    }
    if (ol) {
      if (!listBuf || listBuf.type !== "ol") { flushList(); listBuf = { type: "ol", items: [] }; }
      listBuf.items.push(ol[1]);
      continue;
    }
    if (/^---+$/.test(line)) {
      flushList();
      out.push(<hr key={i} />);
      continue;
    }
    flushList();
    out.push(<p key={i} dangerouslySetInnerHTML={{ __html: inline(line) }} />);
  }
  flushList();
  return <div className="markdown-body">{out}</div>;
}
