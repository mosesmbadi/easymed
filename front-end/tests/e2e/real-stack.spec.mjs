/**
 * The same flows against the real backend and database, to catch what a fake can't.
 * Not for CI. With the local stack up:
 *
 *   E2E_REAL=1 npx playwright test real-stack
 *
 * Log in with E2E_EMAIL and E2E_PASSWORD, or the demo admin by default. Everything
 * it creates is on a temporary profile, and removed at the end.
 */
import fs from "node:fs";

import { expect, test } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL || "admin@mail.com";
const PASSWORD = process.env.E2E_PASSWORD || "admin";
const LAB_SETTINGS = "/dashboard/laboratory/lab-settings";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
);

test.skip(!process.env.E2E_REAL, "Needs the real stack: set E2E_REAL=1");

const logIn = async (page) => {
  await page.goto("/auth/login");
  await page.getByPlaceholder("Email").fill(EMAIL);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard/);
};

const stored = (page, key) => page.evaluate((name) => JSON.parse(localStorage.getItem(name)), key);

test("the real backend's refresh token blacklist does not log out a user with many requests failing", async ({ page }) => {
  await logIn(page);
  await page.goto(LAB_SETTINGS);
  await page.getByText("Professional Interpretation", { exact: true }).waitFor();

  const firstRefresh = await stored(page, "refresh");
  const renewals = [];
  page.on("response", (response) => {
    if (response.url().endsWith("/api/auth/refresh")) renewals.push(response.status());
  });

  // An access token the backend rejects, but that still looks live to the browser.
  await page.evaluate(() => {
    const [header, , signature] = JSON.parse(localStorage.getItem("token")).split(".");
    const payload = JSON.parse(atob(JSON.parse(localStorage.getItem("token")).split(".")[1]));
    payload.exp = Math.floor(Date.now() / 1000) + 3600;
    localStorage.setItem("token", JSON.stringify(`${header}.${btoa(JSON.stringify(payload)).replace(/=+$/, "")}.${signature}`));
  });
  await page.reload();
  await page.getByText("Professional Interpretation", { exact: true }).click();
  await page.getByRole("heading", { name: "Add Professional Interpretation" }).waitFor();
  await expect.poll(() => renewals.length).toBeGreaterThan(0);
  await page.waitForTimeout(2000);

  // Exactly one renewal, accepted, and the session carries on with a rotated token.
  expect(renewals).toEqual([200]);
  await expect(page).toHaveURL(LAB_SETTINGS);
  expect(await stored(page, "refresh")).not.toBe(firstRefresh);

  // And the rotated token works: a second reload is still logged in.
  await page.reload();
  await page.getByText("Professional Interpretation", { exact: true }).waitFor();
  await expect(page).toHaveURL(LAB_SETTINGS);
});

test("a formatted interpretation saves, comes back cleaned, and shows in the page", async ({ page, request, baseURL }) => {
  await logIn(page);
  const token = await stored(page, "token");
  const api = process.env.E2E_BACKEND || "http://localhost:8080";
  const headers = { Authorization: `Bearer ${token}` };
  const name = `E2E temporary ${Date.now()}`;

  const created = await request.post(`${api}/lab/lab-test-profile/`, { headers, data: { name } });
  expect(created.ok(), await created.text()).toBe(true);
  const profile = await created.json();

  let interpretationId;
  try {
    await page.goto(LAB_SETTINGS);
    await page.getByText("Professional Interpretation", { exact: true }).click();
    await page.getByRole("heading", { name: "Add Professional Interpretation" }).waitFor();

    await page.getByRole("combobox").first().click();
    await page.getByRole("option", { name }).click();

    const content = page.locator(".dx-htmleditor-content").first();
    await content.click();
    await page.keyboard.type("GFR stages");
    await page.keyboard.press("Enter");
    await page.locator(".dx-orderedlist-format").first().click();
    await page.keyboard.type("Normal: 90 or above");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Mildly reduced: 60-89");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");

    await page.locator(".dx-inserttable-format").first().click();
    const tableDialog = page.locator(".dx-formdialog .dx-overlay-content:visible").last();
    const inputs = tableDialog.locator("input.dx-texteditor-input");
    await inputs.nth(0).fill("2");
    await inputs.nth(1).fill("2");
    await tableDialog.getByRole("button", { name: "OK" }).click();
    await content.locator("td").nth(0).click();
    await page.keyboard.type("Stage");
    await content.locator("td").nth(1).click();
    await page.keyboard.type("Range");
    await content.locator("td").nth(2).click();
    await page.keyboard.type("Stage 1");
    await content.locator("td").nth(3).click();
    await page.keyboard.type(">= 90");

    await content.locator("ol li").first().click();
    await page.locator(".dx-image-format").first().click();
    const imageDialog = page.locator(".dx-formdialog .dx-overlay-content:visible").last();
    await imageDialog.locator('input[type="file"]').setInputFiles({ name: "dot.png", mimeType: "image/png", buffer: PNG });
    await imageDialog.getByRole("button", { name: /add/i }).click();
    await expect(content.locator("img")).toHaveCount(1);

    const saved = page.waitForResponse(
      (response) => response.url().includes("/api/laboratory/lab-test-interpretations") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Add Interpretation" }).click();
    const response = await saved;
    const row = await response.json();
    interpretationId = row.id;
    expect(response.ok()).toBe(true);

    // What the real sanitizer kept.
    expect(row.interpretation).toMatch(/<ol[\s>]/);
    expect(row.interpretation).toContain("Mildly reduced");
    expect(row.interpretation).toMatch(/<table[\s>]/);
    expect(row.interpretation).toContain("&gt;= 90");
    expect(row.interpretation).toContain("data:image/png;base64,");
    expect(row.interpretation).not.toMatch(/<script|onerror|javascript:/i);

    if (process.env.E2E_SAVE_HTML) fs.writeFileSync(process.env.E2E_SAVE_HTML, row.interpretation);

    await expect(page.getByText("Interpretation created successfully")).toBeVisible();
    await page.reload();
    await page.getByText("Professional Interpretation", { exact: true }).click();
    await expect(page.locator(".dx-datagrid .rich-text").filter({ hasText: "GFR stages" }).locator("ol li").first()).toBeVisible();
    expect(baseURL).toBeTruthy();
  } finally {
    if (interpretationId) {
      const removed = await request.delete(`${api}/lab/lab-test-interpretations/${interpretationId}/`, { headers });
      expect(removed.ok()).toBe(true);
    }
    const removed = await request.delete(`${api}/lab/lab-test-profile/${profile.id}/`, { headers });
    expect(removed.ok(), await removed.text()).toBe(true);
  }
});
