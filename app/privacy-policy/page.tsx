import { promises as fs } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const segments: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    const matched = match[0];
    if (matched.startsWith("**")) {
      segments.push(
        <strong key={`${keyPrefix}-strong-${index}`}>
          {matched.slice(2, -2)}
        </strong>,
      );
    } else {
      segments.push(
        <em key={`${keyPrefix}-em-${index}`}>{matched.slice(1, -1)}</em>,
      );
    }

    index += 1;
    lastIndex = match.index + matched.length;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments;
}

function renderMarkdown(markdown: string): ReactNode[] {
  const lines = markdown.split(/\r?\n/);
  const elements: ReactNode[] = [];
  let i = 0;
  let elementIndex = 0;

  const nextKey = (type: string) => `${type}-${elementIndex++}`;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={nextKey("hr")} className="border-border" />);
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const inline = renderInlineMarkdown(text, nextKey("heading-inline"));

      if (level === 1) {
        elements.push(
          <h1 key={nextKey("h1")} className="text-3xl font-semibold tracking-tight">
            {inline}
          </h1>,
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={nextKey("h2")} className="text-2xl font-semibold tracking-tight">
            {inline}
          </h2>,
        );
      } else {
        elements.push(
          <h3 key={nextKey("h3")} className="text-xl font-semibold tracking-tight">
            {inline}
          </h3>,
        );
      }

      i += 1;
      continue;
    }

    if (/^\*\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\*\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\*\s+/, ""));
        i += 1;
      }

      elements.push(
        <ul key={nextKey("ul")} className="list-disc space-y-2 pl-6">
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item, `${elementIndex}-ul-${idx}`)}</li>
          ))}
        </ul>,
      );

      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }

      elements.push(
        <ol key={nextKey("ol")} className="list-decimal space-y-2 pl-6">
          {items.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item, `${elementIndex}-ol-${idx}`)}</li>
          ))}
        </ol>,
      );

      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      paragraphLines.push(lines[i]);
      i += 1;
    }

    const paragraphText = paragraphLines.join(" ").trim();
    elements.push(
      <p key={nextKey("p")} className="text-base leading-relaxed text-muted-foreground">
        {renderInlineMarkdown(paragraphText, `${elementIndex}-p-inline`)}
      </p>,
    );
  }

  return elements;
}

export default async function PrivacyPolicyPage() {
  const filePath = path.join(process.cwd(), "data", "privacy-policy.md");
  const markdown = await fs.readFile(filePath, "utf8");
  const content = renderMarkdown(markdown);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <article className="space-y-6 text-foreground">
        {content}
      </article>
    </div>
  );
}
