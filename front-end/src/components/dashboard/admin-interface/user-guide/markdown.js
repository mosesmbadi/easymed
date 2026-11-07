/**
 * Just enough Markdown for the user guide: headings, paragraphs, nested
 * lists, tables, block quotes, fenced code, rules, and inline bold, italics,
 * code and links. Parsed into plain objects that UserGuide renders; text is
 * never injected as HTML.
 */

const FENCE = /^```/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^-{3,}\s*$/;
const LIST_ITEM = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

const startsBlock = (line) =>
  FENCE.test(line) || HEADING.test(line) || RULE.test(line) ||
  line.startsWith("|") || line.startsWith(">") || LIST_ITEM.test(line);

const indentOf = (line) => line.match(/^\s*/)[0].length;

/** The text a heading shows, without its inline markers. */
export const plainText = (text) =>
  text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*`]/g, "");

/** GitHub's anchor for a heading, so the guide's own #links keep working. */
export const slugify = (text) =>
  plainText(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s/g, "-");

const splitRow = (line) =>
  line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());

function parseList(lines) {
  const base = indentOf(lines[0]);
  const ordered = /\d/.test(lines[0].match(LIST_ITEM)[2]);
  const items = [];
  let current = null;

  lines.forEach((line) => {
    const match = line.match(LIST_ITEM);
    if (match && match[1].length === base) {
      current = { offset: base + match[2].length + 1, lines: [match[3]] };
      items.push(current);
    } else if (current) {
      const strip = Math.min(indentOf(line), current.offset);
      current.lines.push(line.slice(strip));
    }
  });

  return {
    type: "list",
    ordered,
    start: ordered ? parseInt(lines[0].match(LIST_ITEM)[2], 10) : undefined,
    items: items.map((item) => parseBlocks(item.lines)),
  };
}

export function parseBlocks(lines) {
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (FENCE.test(line)) {
      const body = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) body.push(lines[i++]);
      i += 1;
      blocks.push({ type: "code", text: body.join("\n") });
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2], id: slugify(heading[2]) });
      i += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ type: "rule" });
      i += 1;
      continue;
    }

    if (line.startsWith("|")) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const [header, , ...body] = rows;
      blocks.push({ type: "table", header: splitRow(header), rows: body.map(splitRow) });
      continue;
    }

    if (line.startsWith(">")) {
      const body = [];
      while (i < lines.length && lines[i].startsWith(">")) body.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push({ type: "quote", blocks: parseBlocks(body) });
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const base = indentOf(line);
      const body = [line];
      i += 1;
      while (i < lines.length) {
        const next = lines[i];
        if (next.trim() === "") {
          // A blank line ends the list unless the list carries on after it.
          const following = lines.slice(i + 1).find((l) => l.trim() !== "");
          if (following === undefined) break;
          const continues = indentOf(following) > base ||
            (LIST_ITEM.test(following) && indentOf(following) === base);
          if (!continues) break;
          body.push(next);
          i += 1;
        } else if (indentOf(next) > base || (LIST_ITEM.test(next) && indentOf(next) === base)) {
          body.push(next);
          i += 1;
        } else {
          break;
        }
      }
      blocks.push(parseList(body));
      continue;
    }

    const body = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) body.push(lines[i++].trim());
    blocks.push({ type: "paragraph", text: body.join(" ") });
  }

  return blocks;
}

const INLINE = /(`[^`]+`)|(\*\*.+?\*\*)|(\*[^*\s][^*]*?\*)|(\[[^\]]+\]\([^)\s]+\))/;

/** Inline text as a list of {type, text, children?, href?} tokens. */
export function parseInline(text) {
  const tokens = [];
  let rest = text;
  while (rest) {
    const match = rest.match(INLINE);
    if (!match) {
      tokens.push({ type: "text", text: rest });
      break;
    }
    if (match.index > 0) tokens.push({ type: "text", text: rest.slice(0, match.index) });
    const [found] = match;
    if (match[1]) {
      tokens.push({ type: "code", text: found.slice(1, -1) });
    } else if (match[2]) {
      tokens.push({ type: "strong", children: parseInline(found.slice(2, -2)) });
    } else if (match[3]) {
      tokens.push({ type: "em", children: parseInline(found.slice(1, -1)) });
    } else {
      const [, label, href] = found.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      tokens.push({ type: "link", href, children: parseInline(label) });
    }
    rest = rest.slice(match.index + found.length);
  }
  return tokens;
}

/**
 * The guide split into its title, intro and chapters (one per ## heading).
 * The written Contents chapter is dropped: the page builds its own.
 */
export function parseGuide(markdown) {
  const blocks = parseBlocks(markdown.replace(/\r\n/g, "\n").split("\n"));
  const guide = { title: "", intro: [], chapters: [] };
  let current = null;

  blocks.forEach((block) => {
    if (block.type === "heading" && block.level === 1 && !guide.title) {
      guide.title = block.text;
      return;
    }
    if (block.type === "heading" && block.level === 2) {
      current = { id: block.id, title: plainText(block.text), blocks: [block] };
      guide.chapters.push(current);
      return;
    }
    if (block.type === "rule") return;
    (current ? current.blocks : guide.intro).push(block);
  });

  guide.chapters = guide.chapters.filter((chapter) => chapter.id !== "contents");
  return guide;
}

/** Everything a chapter says, flattened, for searching. */
export function chapterText(blocks) {
  return blocks
    .map((block) => {
      switch (block.type) {
        case "heading":
        case "paragraph":
        case "code":
          return plainText(block.text);
        case "table":
          return [block.header, ...block.rows].flat().map(plainText).join(" ");
        case "quote":
          return chapterText(block.blocks);
        case "list":
          return block.items.map(chapterText).join(" ");
        default:
          return "";
      }
    })
    .join(" ");
}
