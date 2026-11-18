import React from "react";

/** Wraps every case-insensitive match of `query` inside `text` in a <mark>. */
export function HighlightText({ text, query }: { text: string; query: string }) {
  const needle = query.trim().toLowerCase();
  const haystack = text.toLowerCase();
  if (!needle || haystack.length !== text.length) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let index = haystack.indexOf(needle, cursor);
  while (index !== -1) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark
        key={index}
        className="rounded bg-primary/25 px-0.5 text-foreground"
      >
        {text.slice(index, index + needle.length)}
      </mark>,
    );
    cursor = index + needle.length;
    index = haystack.indexOf(needle, cursor);
  }
  parts.push(text.slice(cursor));
  return <>{parts}</>;
}
