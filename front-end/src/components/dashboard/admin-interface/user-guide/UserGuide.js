import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import guideMarkdown from "@/content/user-guide.md";
import { chapterText, parseGuide, parseInline } from "./markdown";

// Parsed once: the guide is part of the build.
const GUIDE = parseGuide(guideMarkdown);
const SEARCHABLE = GUIDE.chapters.map((chapter) => ({
  id: chapter.id,
  text: chapterText(chapter.blocks).toLowerCase(),
}));

const scrollToId = (id) => {
  const target = typeof document !== "undefined" && document.getElementById(id);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
};

const Inline = ({ text, onAnchor }) => {
  const render = (tokens) =>
    tokens.map((token, index) => {
      switch (token.type) {
        case "code":
          return (
            <code key={index} className="bg-gray-100 text-xs px-1.5 py-0.5 rounded font-mono">
              {token.text}
            </code>
          );
        case "strong":
          return <strong key={index} className="font-semibold">{render(token.children)}</strong>;
        case "em":
          return <em key={index}>{render(token.children)}</em>;
        case "link":
          if (token.href.startsWith("#")) {
            return (
              <a
                key={index}
                href={token.href}
                className="text-primary hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  onAnchor(token.href.slice(1));
                }}
              >
                {render(token.children)}
              </a>
            );
          }
          if (/^https?:\/\//.test(token.href)) {
            return (
              <a key={index} href={token.href} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                {render(token.children)}
              </a>
            );
          }
          // Links into the code repository mean nothing in the app.
          return <span key={index}>{render(token.children)}</span>;
        default:
          return <React.Fragment key={index}>{token.text}</React.Fragment>;
      }
    });
  return <>{render(parseInline(text))}</>;
};

const HEADING_STYLES = {
  2: "text-xl font-bold text-primary mt-2 mb-3 pb-1 border-b",
  3: "text-lg font-semibold mt-6 mb-2",
  4: "font-semibold mt-4 mb-2",
};

const Blocks = ({ blocks, onAnchor, tight = false }) =>
  blocks.map((block, index) => {
    switch (block.type) {
      case "heading": {
        const Tag = `h${Math.min(block.level, 6)}`;
        return (
          <Tag key={index} id={block.id} className={`scroll-mt-4 ${HEADING_STYLES[block.level] || "font-semibold mt-4 mb-2"}`}>
            <Inline text={block.text} onAnchor={onAnchor} />
          </Tag>
        );
      }
      case "paragraph":
        return tight ? (
          <span key={index} className="block">
            <Inline text={block.text} onAnchor={onAnchor} />
          </span>
        ) : (
          <p key={index} className="my-2 leading-relaxed">
            <Inline text={block.text} onAnchor={onAnchor} />
          </p>
        );
      case "list": {
        const Tag = block.ordered ? "ol" : "ul";
        return (
          <Tag
            key={index}
            start={block.start}
            className={`${block.ordered ? "list-decimal" : "list-disc"} pl-6 my-2 space-y-1`}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="leading-relaxed">
                <Blocks blocks={item} onAnchor={onAnchor} tight={item.length === 1} />
              </li>
            ))}
          </Tag>
        );
      }
      case "table":
        return (
          <div key={index} className="overflow-x-auto my-3">
            <table className="min-w-full text-xs border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {block.header.map((cell, cellIndex) => (
                    <th key={cellIndex} className="text-left px-3 py-2 font-semibold border-b align-top">
                      <Inline text={cell} onAnchor={onAnchor} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-3 py-2 border-b align-top">
                        <Inline text={cell} onAnchor={onAnchor} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "quote":
        return (
          <div key={index} className="border-l-4 border-primary bg-gray-50 px-4 py-1 my-3 rounded-r">
            <Blocks blocks={block.blocks} onAnchor={onAnchor} />
          </div>
        );
      case "code":
        return (
          <pre key={index} className="bg-gray-100 rounded p-3 my-3 text-xs font-mono overflow-x-auto whitespace-pre">
            {block.text}
          </pre>
        );
      default:
        return null;
    }
  });

/** The user guide (src/content/user-guide.md), for Settings → User Guide. */
const UserGuide = () => {
  const [query, setQuery] = useState("");
  const [downloading, setDownloading] = useState(false);

  // Loaded on demand: jsPDF is large and only needed for this button.
  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const [{ jsPDF }, { buildGuidePdf }] = await Promise.all([import("jspdf"), import("./pdf")]);
      buildGuidePdf(jsPDF, GUIDE).save("easymed-user-guide.pdf");
    } catch (error) {
      console.error("Could not build the user guide PDF", error);
      toast.error("Could not create the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };
  const term = query.trim().toLowerCase();

  const visibleIds = useMemo(
    () => new Set(SEARCHABLE.filter((chapter) => !term || chapter.text.includes(term)).map((chapter) => chapter.id)),
    [term]
  );
  const chapters = GUIDE.chapters.filter((chapter) => visibleIds.has(chapter.id));

  // A link may point into a chapter the search has hidden: show it all first.
  const goTo = (id) => {
    if (term) {
      setQuery("");
      setTimeout(() => scrollToId(id), 50);
    } else {
      scrollToId(id);
    }
  };

  return (
    <div className="flex gap-8 items-start text-sm text-gray-800">
      <nav className="hidden lg:block w-64 shrink-0 sticky top-4 max-h-[85vh] overflow-y-auto bg-white rounded shadow p-3">
        <p className="font-semibold mb-2">Contents</p>
        <ul className="space-y-1">
          {chapters.map((chapter) => (
            <li key={chapter.id}>
              <a
                href={`#${chapter.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(chapter.id);
                }}
                className="block text-xs text-gray-600 hover:text-primary"
              >
                {chapter.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <article className="flex-1 min-w-0 max-w-4xl bg-white rounded shadow p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl font-bold">{GUIDE.title}</h1>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the guide"
              aria-label="Search the guide"
              className="border border-gray rounded-xl py-2 px-3 text-sm w-full sm:w-64 focus:outline-none"
            />
            <button
              type="button"
              onClick={downloadPdf}
              disabled={downloading}
              className="bg-primary text-white rounded-xl px-4 py-2 text-sm whitespace-nowrap disabled:opacity-60"
            >
              {downloading ? "Preparing PDF..." : "Download PDF"}
            </button>
          </div>
        </div>

        {term ? (
          <p className="text-xs text-gray-500 mb-4">
            {chapters.length === 0
              ? `No chapter mentions "${query.trim()}".`
              : `${chapters.length} chapter${chapters.length === 1 ? "" : "s"} mention "${query.trim()}".`}
          </p>
        ) : (
          <Blocks blocks={GUIDE.intro} onAnchor={goTo} />
        )}

        {chapters.map((chapter) => (
          <section key={chapter.id} className="mt-8">
            <Blocks blocks={chapter.blocks} onAnchor={goTo} />
          </section>
        ))}
      </article>
    </div>
  );
};

export default UserGuide;
