import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import Link from "@/components/Link";

import type { Components } from "react-markdown";

// Article bodies are staff-written markdown. Raw HTML is dropped (skipHtml) and every element maps
// to theme-styled markup; a body "#" heading is demoted so each page keeps a single <h1>.
const components: Components = {
  h1: ({ children }) => <h2 className="mt-12 text-2xl font-semibold tracking-tight">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-12 text-2xl font-semibold tracking-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 text-lg font-semibold">{children}</h3>,
  p: ({ children }) => <p className="mt-4 leading-relaxed text-foreground/90">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6 marker:text-primary">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6 marker:text-muted-foreground">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  blockquote: ({ children }) => <blockquote className="mt-6 rounded-2xl border border-border bg-card px-5 py-1 text-sm">{children}</blockquote>,
  hr: () => <hr className="my-10 border-border" />,
  a: ({ href = "", children }) => href.startsWith("/")
    ? <Link href={href} className="font-medium underline underline-offset-4 hover:text-muted-foreground">{children}</Link>
    : <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-4 hover:text-muted-foreground">{children}</a>,
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-3 font-semibold">{children}</th>,
  td: ({ children }) => <td className="border-t border-border px-4 py-3 align-top text-foreground/90">{children}</td>,
  img: () => null,
};

export function ArticleMarkdown({ children }: { children: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} skipHtml components={components}>
      {children}
    </Markdown>
  );
}
