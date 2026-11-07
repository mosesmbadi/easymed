/**
 * Answers the browser's /api calls, so these tests run with no backend or database,
 * as they do in CI. real-stack.spec.mjs checks the same flows against the real one.
 *
 * Like the real backend it accepts a refresh token once, and rejects any access
 * token but the current one.
 */
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

export const makeToken = ({ minutesLeft = 30, ...claims } = {}) =>
  [
    encode({ alg: "none" }),
    encode({
      exp: Math.floor(Date.now() / 1000) + minutesLeft * 60,
      user_id: 1,
      role: "sysadmin",
      first_name: "Test",
      ...claims,
    }),
    "signature",
  ].join(".");

const PERMISSIONS = [
  "CAN_ACCESS_LABORATORY_DASHBOARD",
  "CAN_ACCESS_GENERAL_DASHBOARD",
  "CAN_ACCESS_ADMIN_DASHBOARD",
];

export const LAB_SETTINGS = "/dashboard/laboratory/lab-settings";

export const installFakeBackend = async (context, { interpretations = [] } = {}) => {
  const backend = {
    access: makeToken({ jti: "first" }),
    refresh: "refresh-1",
    renewalsTried: 0,
    renewalsAccepted: 0,
    refreshStatus: null,
    calls: [],
    saved: [],
    interpretations: [...interpretations],
  };

  const json = (route, status, body) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    backend.calls.push(`${method} ${path}`);

    if (path === "/api/register/login") {
      return json(route, 200, { access: backend.access, refresh: backend.refresh });
    }
    if (path === "/api/auth/refresh") {
      backend.renewalsTried += 1;
      if (backend.refreshStatus) return json(route, backend.refreshStatus, {});
      if (request.postDataJSON().refresh !== backend.refresh) {
        return json(route, 401, { detail: "Token is blacklisted" });
      }
      backend.renewalsAccepted += 1;
      backend.access = makeToken({ jti: `renewed-${backend.renewalsAccepted}` });
      backend.refresh = `refresh-${backend.renewalsAccepted + 1}`;
      return json(route, 200, { access: backend.access, refresh: backend.refresh });
    }
    if (path === "/api/auth/user-permissions") return json(route, 200, PERMISSIONS);

    const authorization = request.headers().authorization;
    if (authorization && authorization !== `Bearer ${backend.access}`) {
      return json(route, 401, { detail: "Token is invalid or expired" });
    }

    // Left to fail on purpose: the layout then shows every module.
    if (path === "/api/company/facility") return json(route, 500, {});
    if (path === "/api/laboratory/get-lab-test-profile") {
      return json(route, 200, [{ id: 1, name: "UEC", full_name: "UEC", sort_order: 0 }]);
    }
    if (path === "/api/laboratory/lab-test-interpretations") {
      if (method === "GET") return json(route, 200, backend.interpretations);
      const body = request.postDataJSON();
      backend.saved.push({ method, ...body });
      if (method === "POST") {
        const row = { id: backend.interpretations.length + 1, ...body };
        backend.interpretations.push(row);
        return json(route, 201, row);
      }
      const row = backend.interpretations.find((item) => String(item.id) === url.searchParams.get("id"));
      Object.assign(row, body);
      return json(route, 200, row);
    }
    return json(route, 200, []);
  });

  return backend;
};

// Sets the browser up as if already logged in. Once only, so that a test can log
// out and reload without being logged straight back in.
export const startLoggedIn = (context, { token, refresh = "refresh-1", lastActivity = "now" }) =>
  context.addInitScript(
    ([storedToken, storedRefresh, activity]) => {
      if (localStorage.getItem("e2e-seeded")) return;
      localStorage.setItem("e2e-seeded", "1");
      localStorage.setItem("token", JSON.stringify(storedToken));
      if (storedRefresh) localStorage.setItem("refresh", JSON.stringify(storedRefresh));
      localStorage.setItem("lastActivity", String(activity === "now" ? Date.now() : activity));
    },
    [token, refresh, lastActivity]
  );

export const openLabSettings = async (page) => {
  await page.goto(LAB_SETTINGS);
  await page.getByText("Professional Interpretation", { exact: true }).waitFor();
};

export const openInterpretations = async (page) => {
  await page.getByText("Professional Interpretation", { exact: true }).click();
  await page.getByRole("heading", { name: "Add Professional Interpretation" }).waitFor();
};
