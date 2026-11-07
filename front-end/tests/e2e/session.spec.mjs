/** Staying logged in, and being logged out, in a real browser on the real pages. */
import { expect, test } from "@playwright/test";

import { installFakeBackend, LAB_SETTINGS, makeToken, openInterpretations, openLabSettings, startLoggedIn } from "./fake-backend.mjs";

const LOGIN = /\/auth\/login/;
const IDLE_MESSAGE = "You were logged out after 30 minutes of inactivity.";
const EXPIRED_MESSAGE = "Your session has expired. Please login again.";

test.describe("logging in", () => {
  test("goes to the dashboard and survives a reload", async ({ page, context }) => {
    await installFakeBackend(context);

    await page.goto("/auth/login");
    await page.getByPlaceholder("Email").fill("tech@lab.test");
    await page.getByPlaceholder("Password").fill("secret");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/);

    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL(/\/dashboard/);
    expect(await page.evaluate(() => localStorage.getItem("lastActivity"))).not.toBeNull();
  });
});

test.describe("token renewal", () => {
  test("a busy page opened with an expired token renews once and stays open", async ({ page, context }) => {
    const backend = await installFakeBackend(context);
    await startLoggedIn(context, { token: makeToken({ minutesLeft: -5 }) });

    await openLabSettings(page);
    await openInterpretations(page);

    await expect(page).toHaveURL(LAB_SETTINGS);
    expect(backend.renewalsTried).toBe(1);
    await expect(page.getByText(EXPIRED_MESSAGE)).toHaveCount(0);
  });

  test("the bug: requests all rejected at once while working still renew only once", async ({ page, context }) => {
    const backend = await installFakeBackend(context);
    await startLoggedIn(context, { token: backend.access });
    await openLabSettings(page);
    await page.getByText("Test Profiles", { exact: true }).waitFor();
    expect(backend.renewalsTried).toBe(0);

    // The token still looks live to the browser, but the backend has moved on, as
    // when it expires between checks. This tab fires several requests together.
    backend.access = makeToken({ jti: "backend-moved-on" });
    await openInterpretations(page);
    await page.getByText("Test Panels", { exact: true }).click();
    await page.getByText("Create Test Panel").waitFor();
    await expect.poll(() => backend.renewalsAccepted).toBe(1);

    expect(backend.renewalsTried).toBe(1);
    await expect(page).toHaveURL(LAB_SETTINGS);
    await expect(page.getByText(EXPIRED_MESSAGE)).toHaveCount(0);
    const refresh = await page.evaluate(() => JSON.parse(localStorage.getItem("refresh")));
    expect(refresh).toBe(backend.refresh);
  });

  test("a refused refresh token ends the session, and says so", async ({ page, context }) => {
    const backend = await installFakeBackend(context);
    await startLoggedIn(context, { token: makeToken({ minutesLeft: -5 }), refresh: "already-used" });

    await page.goto(LAB_SETTINGS);

    await page.waitForURL(LOGIN);
    expect(backend.renewalsTried).toBeGreaterThan(0);
    expect(await page.evaluate(() => localStorage.getItem("refresh"))).toBeNull();
  });

  test("a failing server does not log anyone out", async ({ page, context }) => {
    const backend = await installFakeBackend(context);
    backend.refreshStatus = 502;
    await startLoggedIn(context, { token: makeToken({ minutesLeft: -5 }) });

    await page.goto(LAB_SETTINGS);
    await expect.poll(() => backend.renewalsTried).toBeGreaterThan(0);
    await page.waitForTimeout(1500);

    await expect(page).not.toHaveURL(LOGIN);
    expect(await page.evaluate(() => localStorage.getItem("refresh"))).toBe('"refresh-1"');
  });
});

test.describe("the 30 minute idle logout", () => {
  const setUp = async (page, context) => {
    const backend = await installFakeBackend(context);
    await startLoggedIn(context, { token: backend.access });
    await page.clock.install();
    await openLabSettings(page);
    return backend;
  };

  test("leaving it alone logs out and explains why", async ({ page, context }) => {
    await setUp(page, context);

    await page.clock.fastForward("29:00");
    await expect(page).toHaveURL(LAB_SETTINGS);

    await page.clock.fastForward("02:00");
    await page.waitForURL(LOGIN);
    await expect(page.getByText(IDLE_MESSAGE)).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("token"))).toBeNull();
  });

  for (const [name, act] of [
    ["moving the mouse", (page) => page.mouse.move(300, 300)],
    ["typing", (page) => page.keyboard.press("Shift")],
    ["scrolling", (page) => page.mouse.wheel(0, 200)],
    ["clicking", (page) => page.mouse.click(5, 5)],
  ]) {
    test(`${name} keeps the session going`, async ({ page, context }) => {
      await setUp(page, context);
      await page.mouse.move(100, 100);

      await page.clock.fastForward("29:00");
      await act(page);
      await page.clock.fastForward("29:00");
      await page.waitForTimeout(300);

      await expect(page).toHaveURL(LAB_SETTINGS);
      expect(await page.evaluate(() => localStorage.getItem("token"))).not.toBeNull();
    });
  }

  test("background API calls do not keep it alive", async ({ page, context }) => {
    await setUp(page, context);

    await page.clock.fastForward("20:00");
    await page.evaluate(() => fetch("/api/laboratory/get-lab-test-profile"));
    await page.clock.fastForward("11:00");

    await page.waitForURL(LOGIN);
  });

  test("coming back to a closed browser after 30 minutes loads nothing first", async ({ page, context }) => {
    const backend = await installFakeBackend(context);
    await startLoggedIn(context, { token: backend.access, lastActivity: Date.now() - 31 * 60 * 1000 });

    await page.goto(LAB_SETTINGS);

    await page.waitForURL(LOGIN);
    await expect(page.getByText(IDLE_MESSAGE)).toBeVisible();
    expect(backend.calls.filter((call) => call.includes("/api/laboratory/"))).toEqual([]);
    expect(backend.renewalsTried).toBe(0);
  });

  test("logging in again afterwards gets a full 30 minutes", async ({ page, context }) => {
    await setUp(page, context);
    await page.clock.fastForward("31:00");
    await page.waitForURL(LOGIN);

    await page.getByPlaceholder("Email").fill("tech@lab.test");
    await page.getByPlaceholder("Password").fill("secret");
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/);

    await page.clock.fastForward("29:00");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});

test.describe("with two tabs open", () => {
  const twoTabs = async (page, context) => {
    const backend = await installFakeBackend(context);
    await startLoggedIn(context, { token: backend.access });
    await page.clock.install();
    await openLabSettings(page);
    const second = await context.newPage();
    await openLabSettings(second);
    return { backend, second };
  };

  test("working in one keeps the other logged in", async ({ page, context }) => {
    const { second } = await twoTabs(page, context);
    await page.mouse.move(50, 50);

    await page.clock.fastForward("29:00");
    await second.bringToFront();
    await second.mouse.move(200, 200);
    await second.mouse.move(210, 210);
    await page.clock.fastForward("29:00");
    await page.waitForTimeout(300);

    await expect(page).toHaveURL(LAB_SETTINGS);
    await expect(second).toHaveURL(LAB_SETTINGS);
  });

  test("logging out in one logs out the other", async ({ page, context }) => {
    const { second } = await twoTabs(page, context);

    await page.evaluate(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
    });

    await second.waitForURL(LOGIN);
  });

  test("both tabs renewing at once spend the refresh token only once", async ({ page, context }) => {
    const { backend, second } = await twoTabs(page, context);
    await expect.poll(() => backend.calls.length).toBeGreaterThan(0);

    backend.access = makeToken({ jti: "backend-moved-on" });
    await Promise.all([openInterpretations(page), openInterpretations(second)]);
    await expect.poll(() => backend.renewalsAccepted).toBe(1);
    await page.waitForTimeout(500);

    expect(backend.renewalsTried).toBe(1);
    await expect(page).toHaveURL(LAB_SETTINGS);
    await expect(second).toHaveURL(LAB_SETTINGS);
  });
});
