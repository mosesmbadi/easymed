/**
 * The user guide as a PDF, written as real text with jsPDF from the same
 * parsed guide the page renders, so it can be searched and copied from and
 * stays small. Each chapter starts on a new page.
 */
import { parseInline } from "./markdown";

const PAGE = { margin: 50, top: 56, bottom: 60 };
const PRIMARY = [3, 105, 161];
const TEXT = [33, 37, 41];
const MUTED = [110, 110, 110];

// jsPDF's built-in fonts only cover Windows-1252. Swap what the guide uses
// outside it, one character for one where alignment matters (code diagrams).
const REPLACEMENTS = {
  "→": "->", "≠": "is not", "−": "-", "►": ">", "─": "-", "┬": "+",
  "├": "+", "└": "+", "│": "|", "≥": ">=", "≤": "<=", " ": " ",
};
const clean = (text) => text.replace(/[→≠−►─┬├└│≥≤ ]/g, (ch) => REPLACEMENTS[ch]);

const fontFor = (style) => {
  if (style.code) return ["courier", "normal"];
  if (style.bold && style.italic) return ["helvetica", "bolditalic"];
  if (style.bold) return ["helvetica", "bold"];
  if (style.italic) return ["helvetica", "italic"];
  return ["helvetica", "normal"];
};

/** Inline markdown as styled runs of text. */
const toRuns = (text, base = {}) => {
  const runs = [];
  const walk = (tokens, style) =>
    tokens.forEach((token) => {
      if (token.type === "text") runs.push({ text: clean(token.text), style });
      else if (token.type === "code") runs.push({ text: clean(token.text), style: { ...style, code: true } });
      else if (token.type === "strong") walk(token.children, { ...style, bold: true });
      else if (token.type === "em") walk(token.children, { ...style, italic: true });
      else if (token.type === "link") walk(token.children, { ...style, link: true });
    });
  walk(parseInline(text), base);
  return runs;
};

const plain = (text) => toRuns(text).map((run) => run.text).join("");

export function buildGuidePdf(JsPDF, guide) {
  const doc = new JsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const limit = pageHeight - PAGE.bottom;
  const ctx = { y: PAGE.top, bars: [], marker: null };

  const setStyle = (style, size) => {
    const [family, weight] = fontFor(style);
    doc.setFont(family, weight);
    doc.setFontSize(size);
    doc.setTextColor(...(style.link ? PRIMARY : style.color || TEXT));
  };

  const newPage = () => {
    doc.addPage();
    ctx.y = PAGE.top;
  };
  const ensure = (height) => {
    if (ctx.y + height > limit) newPage();
  };

  /** Word-wrap styled runs into lines no wider than `width`. */
  const layout = (runs, width, size) => {
    const lines = [];
    let line = [];
    let lineWidth = 0;
    let space = null;
    runs.forEach(({ text, style }) => {
      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        setStyle(style, size);
        if (/^\s+$/.test(part)) {
          if (line.length) space = { text: " ", style, w: doc.getTextWidth(" ") };
          return;
        }
        const w = doc.getTextWidth(part);
        const extra = space ? space.w : 0;
        if (line.length && lineWidth + extra + w > width) {
          lines.push(line);
          line = [];
          lineWidth = 0;
        } else if (space) {
          line.push(space);
          lineWidth += space.w;
        }
        space = null;
        line.push({ text: part, style, w });
        lineWidth += w;
      });
    });
    if (line.length) lines.push(line);
    return lines;
  };

  const drawLine = (pieces, x, size, lineHeight) => {
    ensure(lineHeight);
    ctx.y += lineHeight;
    ctx.bars.forEach((barX) => {
      doc.setDrawColor(...PRIMARY);
      doc.setLineWidth(2);
      doc.line(barX, ctx.y - lineHeight + 2, barX, ctx.y + 4);
    });
    if (ctx.marker) {
      setStyle({}, size);
      doc.text(ctx.marker.text, ctx.marker.x, ctx.y);
      ctx.marker = null;
    }
    let cursor = x;
    pieces.forEach((piece) => {
      setStyle(piece.style, size);
      doc.text(piece.text, cursor, ctx.y);
      cursor += piece.w;
    });
  };

  const paragraph = (runs, x, width, { size = 10, lineHeight = 14, after = 5 } = {}) => {
    layout(runs, width, size).forEach((pieces) => drawLine(pieces, x, size, lineHeight));
    ctx.y += after;
  };

  const HEADINGS = { 2: 17, 3: 13, 4: 11 };

  const heading = (block, x, width) => {
    const size = HEADINGS[block.level] || 11;
    if (block.level === 2) {
      if (ctx.y > PAGE.top) newPage();
    } else {
      ctx.y += 8;
      // Keep a heading with the start of what follows it.
      ensure(size * 1.4 + 42);
    }
    const color = block.level === 2 ? PRIMARY : TEXT;
    paragraph(toRuns(block.text, { bold: true, color }), x, width, {
      size, lineHeight: size * 1.35, after: block.level === 2 ? 4 : 3,
    });
    if (block.level === 2) {
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.75);
      doc.line(x, ctx.y, x + width, ctx.y);
      ctx.y += 10;
    }
  };

  const table = (block, x, width) => {
    const size = 8;
    const lineHeight = 10.5;
    const pad = 4;
    const columns = block.header.length;
    const rows = block.rows.map((row) => Array.from({ length: columns }, (_, i) => row[i] || ""));

    // Columns share the width by how much they hold, within limits.
    setStyle({}, size);
    const natural = block.header.map((_, col) =>
      Math.min(
        width * 0.6,
        Math.max(40, ...[block.header[col], ...rows.map((row) => row[col])].map((cell) => doc.getTextWidth(plain(cell)) + pad * 2))
      )
    );
    const total = natural.reduce((sum, w) => sum + w, 0);
    const widths = natural.map((w) => (w / total) * width);

    const measure = (cells, base) => {
      const laidOut = cells.map((cell, col) => layout(toRuns(cell, base), widths[col] - pad * 2, size));
      return { laidOut, height: Math.max(...laidOut.map((lines) => lines.length)) * lineHeight + pad * 2 };
    };

    const drawRow = ({ laidOut, height }, header) => {
      let cellX = x;
      laidOut.forEach((lines, col) => {
        if (header) {
          doc.setFillColor(240, 242, 245);
          doc.rect(cellX, ctx.y, widths[col], height, "F");
        }
        doc.setDrawColor(215, 215, 215);
        doc.setLineWidth(0.5);
        doc.rect(cellX, ctx.y, widths[col], height);
        lines.forEach((pieces, i) => {
          let cursor = cellX + pad;
          pieces.forEach((piece) => {
            setStyle(piece.style, size);
            doc.text(piece.text, cursor, ctx.y + pad + size + i * lineHeight);
            cursor += piece.w;
          });
        });
        cellX += widths[col];
      });
      ctx.y += height;
    };

    const header = measure(block.header, { bold: true });
    ctx.y += 4;
    ensure(header.height + 20);
    drawRow(header, true);
    rows.forEach((row) => {
      const measured = measure(row, {});
      if (ctx.y + measured.height > limit) {
        newPage();
        drawRow(header, true);
      }
      drawRow(measured, false);
    });
    ctx.y += 10;
  };

  const code = (block, x, width) => {
    const lines = clean(block.text).split("\n");
    const longest = Math.max(...lines.map((line) => line.length), 1);
    // Courier is 0.6 em wide: shrink a wide diagram rather than wrap it.
    const size = Math.min(8.5, (width - 12) / (longest * 0.6));
    const lineHeight = size * 1.45;
    ctx.y += 2;
    lines.forEach((line) => {
      ensure(lineHeight);
      doc.setFillColor(243, 244, 246);
      doc.rect(x, ctx.y, width, lineHeight + 1, "F");
      ctx.y += lineHeight;
      setStyle({ code: true }, size);
      doc.text(line, x + 6, ctx.y - lineHeight * 0.25);
    });
    ctx.y += 10;
  };

  const blocks = (list, x, width, tight = false) => {
    list.forEach((block) => {
      if (block.type !== "paragraph" && block.type !== "list" && ctx.marker) {
        // A list item that opens with something other than text.
        ensure(14);
        setStyle({}, 10);
        doc.text(ctx.marker.text, ctx.marker.x, ctx.y + 10);
        ctx.marker = null;
      }
      switch (block.type) {
        case "heading":
          heading(block, x, width);
          break;
        case "paragraph":
          paragraph(toRuns(block.text), x, width, { after: tight ? 2 : 5 });
          break;
        case "list": {
          const indent = block.ordered ? 18 : 13;
          block.items.forEach((item, i) => {
            ctx.marker = { text: block.ordered ? `${(block.start || 1) + i}.` : "•", x: x + 2 };
            blocks(item, x + indent, width - indent, item.length === 1);
          });
          ctx.y += tight ? 0 : 3;
          break;
        }
        case "table":
          table(block, x, width);
          break;
        case "quote":
          ctx.y += 2;
          ctx.bars.push(x + 1);
          blocks(block.blocks, x + 12, width - 12);
          ctx.bars.pop();
          ctx.y += 4;
          break;
        case "code":
          code(block, x, width);
          break;
        default:
          break;
      }
    });
  };

  const left = PAGE.margin;
  const width = pageWidth - PAGE.margin * 2;

  // Title page: the title, the introduction and the contents.
  ctx.y = PAGE.top + 40;
  paragraph(toRuns(guide.title, { bold: true, color: PRIMARY }), left, width, { size: 26, lineHeight: 32, after: 6 });
  paragraph(
    [{ text: `Downloaded ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`, style: { color: MUTED } }],
    left, width, { size: 10, after: 18 }
  );
  blocks(guide.intro, left, width);
  ctx.y += 10;
  paragraph(toRuns("Contents", { bold: true }), left, width, { size: 13, lineHeight: 18, after: 4 });
  guide.chapters.forEach((chapter) => paragraph(toRuns(chapter.title), left + 4, width - 4, { size: 10, after: 1 }));

  guide.chapters.forEach((chapter) => blocks(chapter.blocks, left, width));

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(clean(guide.title), left, pageHeight - 30);
    doc.text(`Page ${page} of ${pages}`, pageWidth - PAGE.margin, pageHeight - 30, { align: "right" });
  }

  return doc;
}
