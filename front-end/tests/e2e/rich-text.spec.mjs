/** The Professional Interpretation editor, in the real page, with real Chrome. */
import { expect, test } from "@playwright/test";

import { installFakeBackend, openInterpretations, openLabSettings, startLoggedIn } from "./fake-backend.mjs";

// A real 1x1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

const tool = (scope, name) => scope.locator(`.dx-${name}-format`).first();

const pickProfile = async (scope, page, name = "UEC") => {
  await scope.getByRole("combobox").first().click();
  await page.getByRole("option", { name }).click();
};

const insertTable = async (scope, page, { rows, columns }) => {
  await tool(scope, "inserttable").click();
  const dialog = page.locator(".dx-formdialog .dx-overlay-content:visible").last();
  const inputs = dialog.locator("input.dx-texteditor-input");
  await inputs.nth(0).click();
  await inputs.nth(0).fill(String(rows));
  await inputs.nth(1).click();
  await inputs.nth(1).fill(String(columns));
  // A dialog that can't take focus would leave these empty: see disableEnforceFocus.
  await expect(inputs.nth(0)).toHaveValue(String(rows));
  await expect(inputs.nth(1)).toHaveValue(String(columns));
  await dialog.getByRole("button", { name: "OK" }).click();
};

const insertImage = async (scope, page, file) => {
  await tool(scope, "image").click();
  const dialog = page.locator(".dx-formdialog .dx-overlay-content:visible").last();
  await dialog.locator('input[type="file"]').setInputFiles(file);
  await dialog.getByRole("button", { name: /add/i }).click();
};

const setUp = async (page, context, options) => {
  const backend = await installFakeBackend(context, options);
  await startLoggedIn(context, { token: backend.access });
  await openLabSettings(page);
  await openInterpretations(page);
  return backend;
};

const editor = (scope) => scope.locator(".dx-htmleditor-content").first();

test("a table, a numbered list and an uploaded image are saved as formatted HTML", async ({ page, context }) => {
  const backend = await setUp(page, context);
  await pickProfile(page, page);

  await editor(page).click();
  await page.keyboard.type("GFR stages");
  await page.keyboard.press("Enter");
  await tool(page, "orderedlist").click();
  await page.keyboard.type("Normal");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Mildly reduced");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");

  await insertTable(page, page, { rows: 2, columns: 3 });
  await expect(editor(page).locator("table tr")).toHaveCount(2);
  await editor(page).locator("td").first().click();
  await page.keyboard.type("Stage 1");

  await editor(page).locator("ol li").last().click();
  await insertImage(page, page, { name: "chart.png", mimeType: "image/png", buffer: PNG });
  await expect(editor(page).locator('img[src^="data:image/png;base64,"]')).toHaveCount(1);

  await page.getByRole("button", { name: "Add Interpretation" }).click();
  await expect.poll(() => backend.saved.length).toBe(1);

  const saved = backend.saved[0].interpretation;
  expect(saved).toContain("GFR stages");
  expect(saved).toMatch(/<ol[\s>]/);
  expect(saved).toContain("Mildly reduced");
  expect(saved).toMatch(/<table[\s>]/);
  expect(saved).toContain("Stage 1");
  expect(saved).toContain("data:image/png;base64,");
  expect(backend.saved[0].test_profile).toBe(1);

  // On the page straight away, as formatting rather than as tags.
  await expect(page.getByText("Interpretation created successfully")).toBeVisible();
  const cell = page.locator(".dx-datagrid .rich-text").first();
  await expect(cell.locator("ol li").first()).toHaveText("Normal");
  await expect(cell.locator("table")).toHaveCount(1);
  await expect(cell).not.toContainText("<ol");

  // And the form is ready for the next one.
  await expect(editor(page)).not.toContainText("GFR stages");
});

test("an empty editor is refused, with the message showing", async ({ page, context }) => {
  const backend = await setUp(page, context);
  await pickProfile(page, page);

  await page.getByRole("button", { name: "Add Interpretation" }).click();
  await expect(page.getByText("Interpretation text is required!")).toBeVisible();

  await editor(page).click();
  await page.keyboard.type("x");
  await page.keyboard.press("Backspace");
  await page.getByRole("button", { name: "Add Interpretation" }).click();

  await expect(page.getByText("Interpretation text is required!")).toBeVisible();
  expect(backend.saved).toEqual([]);
});

test("an image too large to save gets a clear message and is not sent", async ({ page, context }) => {
  const backend = await setUp(page, context);
  await pickProfile(page, page);

  await editor(page).click();
  await insertImage(page, page, { name: "scan.png", mimeType: "image/png", buffer: Buffer.alloc(2 * 1024 * 1024, 7) });
  await expect(editor(page).locator("img")).toHaveCount(1);

  await page.getByRole("button", { name: "Add Interpretation" }).click();

  await expect(page.getByText(/too large to save/)).toBeVisible();
  expect(backend.saved).toEqual([]);
});

test.describe("editing an existing interpretation in the dialog", () => {
  const existing = {
    id: 7,
    test_profile: 1,
    test_profile_name: "UEC",
    interpretation: "<p>Existing text</p>",
    clinical_action: "Repeat in 3 months",
    requires_immediate_attention: false,
  };

  const openEdit = async (page, context) => {
    const backend = await setUp(page, context, { interpretations: [existing] });
    await page.locator(".dx-datagrid .dx-data-row svg").last().click();
    await page.getByText("Edit Item").click();
    const dialog = page.getByRole("dialog").filter({ hasText: "Edit Interpretation" });
    await expect(editor(dialog)).toContainText("Existing text");
    return { backend, dialog };
  };

  test("its table and image pop-ups accept input, and the update saves them", async ({ page, context }) => {
    const { backend, dialog } = await openEdit(page, context);

    await editor(dialog).click();
    await page.keyboard.press("Control+End");
    await page.keyboard.press("Enter");
    await insertTable(dialog, page, { rows: 3, columns: 2 });
    await expect(editor(dialog).locator("table tr")).toHaveCount(3);

    await editor(dialog).locator("p").first().click();
    await insertImage(dialog, page, { name: "chart.png", mimeType: "image/png", buffer: PNG });
    await expect(editor(dialog).locator("img")).toHaveCount(1);

    await dialog.getByRole("button", { name: "Update" }).click();
    await expect.poll(() => backend.saved.length).toBe(1);

    const saved = backend.saved[0];
    expect(saved.method).toBe("PATCH");
    expect(saved.interpretation).toContain("Existing text");
    expect(saved.interpretation).toMatch(/<table[\s>]/);
    expect(saved.interpretation).toContain("data:image/png;base64,");
    expect(saved.clinical_action).toBe("Repeat in 3 months");
    await expect(dialog).toHaveCount(0);
  });

  test("opening and saving unchanged keeps the text", async ({ page, context }) => {
    const { backend, dialog } = await openEdit(page, context);

    await dialog.getByRole("button", { name: "Update" }).click();
    await expect.poll(() => backend.saved.length).toBe(1);

    expect(backend.saved[0].interpretation).toContain("Existing text");
  });
});
