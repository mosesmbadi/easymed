import * as Yup from "yup";

// Matches MAX_RICH_TEXT_LENGTH in backend/laboratory/rich_text.py.
const MAX_LENGTH = 2 * 1024 * 1024;

// An emptied editor still holds markup such as <p><br></p>.
const hasContent = (html = "") =>
  /<img\b/i.test(html) || html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() !== "";

export const richTextSchema = (requiredMessage) =>
  Yup.string()
    .test("has-content", requiredMessage, hasContent)
    .test(
      "not-too-large",
      "This is too large to save. Use smaller images, up to about 1.5 MB in total.",
      (html = "") => html.length <= MAX_LENGTH
    );
