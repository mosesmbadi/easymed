/** What the interpretation forms accept, and how saved text comes back on screen. */
import { describe, expect, it } from "vitest";

import RichTextView from "@/components/common/RichTextView";
import { richTextSchema } from "@/utils/rich-text";
import { render } from "./helpers";

const MESSAGE = "Interpretation text is required!";
const schema = richTextSchema(MESSAGE);

const errorFor = async (value) => {
  try {
    await schema.validate(value);
    return null;
  } catch (error) {
    return error.message;
  }
};

describe("an empty editor", () => {
  it.each([
    ["nothing", ""],
    ["undefined", undefined],
    ["what the editor leaves when emptied", "<p><br></p>"],
    ["spaces", "<p>   </p>"],
    ["non-breaking spaces", "<p>&nbsp;&nbsp;</p>"],
    ["an empty list", "<ul><li><br></li></ul>"],
    ["an empty table", "<table><tbody><tr><td><br></td></tr></tbody></table>"],
  ])("refuses %s", async (_, value) => {
    expect(await errorFor(value)).toBe(MESSAGE);
  });
});

describe("real content", () => {
  it.each([
    ["plain text", "Normal kidney function"],
    ["a paragraph", "<p>Normal</p>"],
    ["a list", "<ol><li>Stage 1</li></ol>"],
    ["a table", "<table><tbody><tr><td>Stage 1</td></tr></tbody></table>"],
    ["an image with no text", '<p><img src="data:image/png;base64,AAAA"></p>'],
  ])("accepts %s", async (_, value) => {
    expect(await errorFor(value)).toBeNull();
  });
});

describe("the size limit", () => {
  const text = (length) => `<p>${"x".repeat(length - 7)}</p>`;

  it("accepts exactly the limit the backend allows", async () => {
    expect(await errorFor(text(2 * 1024 * 1024))).toBeNull();
  });

  it("refuses one character over, saying what to do", async () => {
    expect(await errorFor(text(2 * 1024 * 1024 + 1))).toMatch(/smaller images/);
  });
});

describe("displaying saved text", () => {
  it("shows the formatting as formatting, not as tags", async () => {
    const { container } = await render(
      <RichTextView html="<ol><li>First</li></ol><table><tbody><tr><td>Cell</td></tr></tbody></table>" />
    );

    expect(container.querySelector("ol li").textContent).toBe("First");
    expect(container.querySelector("td").textContent).toBe("Cell");
    expect(container.textContent).not.toContain("<ol>");
  });

  it("carries the class that restores lists and table borders", async () => {
    const { container } = await render(<RichTextView html="<p>x</p>" className="text-gray-600" />);

    expect(container.firstChild.className).toContain("rich-text");
    expect(container.firstChild.className).toContain("text-gray-600");
  });

  it.each([[null], [undefined], [""]])("shows nothing for %s", async (html) => {
    const { container } = await render(<RichTextView html={html} />);

    expect(container.firstChild.textContent).toBe("");
  });
});
