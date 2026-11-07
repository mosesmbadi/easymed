/**
 * The auth context and route guard together: when does someone stay logged in, when
 * are they sent to the login page, and what shows on the way.
 */
import { useContext } from "react";
import { toast } from "react-toastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProtectedRoute from "@/assets/hoc/protected-route";
import { authContext, AuthProvider } from "@/components/use-context";
import { act, fakeBackend, makeToken, render, storeSession } from "./helpers";

const router = vi.hoisted(() => ({ push: vi.fn(), asPath: "/dashboard" }));

vi.mock("next/router", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({ default: ({ children }) => children }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));
vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
  useSelector: (select) => select({ auth: { userPermissions: ["CAN_ACCESS_LABORATORY_DASHBOARD"] } }),
}));
vi.mock("@/redux/features/auth", () => ({ getAllUserPermissions: vi.fn(() => () => {}) }));
vi.mock("@/redux/features/patients", () => ({ getAllPatients: vi.fn(() => () => {}) }));

const MINUTE = 60 * 1000;

let context;
const Spy = () => {
  context = useContext(authContext);
  return null;
};

const mount = (children = <Spy />) => render(<AuthProvider>{children}</AuthProvider>);
const settle = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  router.asPath = "/dashboard";
  context = undefined;
});

describe("opening or reloading the page", () => {
  it("keeps the session of someone with a live token, without renewing", async () => {
    const token = storeSession();
    const backend = fakeBackend({ access: token });

    await mount();
    await settle();

    expect(context.user.token).toBe(token);
    expect(backend.renewalsTried).toBe(0);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("renews an expired access token rather than logging out", async () => {
    storeSession({ token: makeToken({ minutesLeft: -5 }) });
    const backend = fakeBackend();

    await mount();
    await settle();

    expect(backend.renewalsTried).toBe(1);
    expect(context.user.token).toBe(backend.access);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("logs out when the backend refuses the refresh token", async () => {
    storeSession({ token: makeToken({ minutesLeft: -5 }), refresh: "already-used" });
    fakeBackend({ refresh: "something-else" });

    await mount();
    await settle();

    expect(localStorage.getItem("token")).toBeNull();
    expect(window.location.href).toBe("/auth/login");
  });

  it("stays logged in when the renewal fails for a temporary reason", async () => {
    storeSession({ token: makeToken({ minutesLeft: -5 }) });
    const backend = fakeBackend();
    backend.onRefresh = () => {
      throw new Error("Network Error");
    };

    await mount();
    await settle();

    expect(localStorage.getItem("refresh")).not.toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    expect(window.location.href).not.toBe("/auth/login");
  });

  it("logs out an expired token with nothing to renew it", async () => {
    storeSession({ token: makeToken({ minutesLeft: -5 }), refresh: null });
    fakeBackend();

    await mount();
    await settle();

    expect(context.user).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/auth/login");
  });

  it("does nothing for someone who isn't logged in", async () => {
    const backend = fakeBackend();

    await mount();
    await settle();

    expect(context.user).toBeNull();
    expect(backend.renewalsTried).toBe(0);
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("coming back after 30 minutes away", () => {
  beforeEach(() => {
    localStorage.setItem("lastActivity", String(Date.now() - 31 * MINUTE));
  });

  it("logs out and says why", async () => {
    storeSession();
    fakeBackend();

    await mount();
    await settle();

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refresh")).toBeNull();
    expect(localStorage.getItem("lastActivity")).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/auth/login");
    expect(toast.info).toHaveBeenCalledWith("You were logged out after 30 minutes of inactivity.");
  });

  it("never hands the page a user, so nothing loads first", async () => {
    storeSession();
    fakeBackend();
    const usersSeen = [];
    const Watcher = () => {
      usersSeen.push(useContext(authContext).user);
      return null;
    };

    await mount(<Watcher />);
    await settle();

    expect(usersSeen.length).toBeGreaterThan(0);
    expect(usersSeen.every((user) => user === null)).toBe(true);
  });

  it("does not renew a session it is about to end, even with an expired token", async () => {
    storeSession({ token: makeToken({ minutesLeft: -5 }) });
    const backend = fakeBackend();

    await mount();
    await settle();

    expect(backend.renewalsTried).toBe(0);
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("moving to another page", () => {
  it("renews an access token that expired while the page sat open", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-06T09:00:00Z"));
    const token = storeSession({ token: makeToken({ minutesLeft: 30 }) });
    const backend = fakeBackend({ access: token });
    const view = await mount();
    await settle();
    expect(backend.renewalsTried).toBe(0);

    vi.setSystemTime(Date.now() + 31 * MINUTE);
    localStorage.setItem("lastActivity", String(Date.now()));
    router.asPath = "/dashboard/laboratory";
    await view.rerender(<AuthProvider><Spy /></AuthProvider>);
    await settle();

    expect(backend.renewalsTried).toBe(1);
    expect(context.user.token).toBe(backend.access);
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("the login and logout buttons", () => {
  it("does not let a time left over from an earlier session end a new one", async () => {
    localStorage.setItem("lastActivity", String(Date.now() - 120 * MINUTE));
    const backend = fakeBackend();
    const axios = (await import("axios")).default;
    const real = axios.defaults.adapter;
    axios.defaults.adapter = async (config) =>
      config.url.endsWith("/api/register/login")
        ? { data: { access: makeToken(), refresh: "refresh-1" }, status: 200, statusText: "OK", headers: {}, config }
        : real(config);

    await mount();
    await act(async () => context.loginUser("a@b.c", "secret"));
    await settle();

    expect(context.user).not.toBeNull();
    expect(router.push).toHaveBeenCalledWith("/dashboard");
    expect(toast.info).not.toHaveBeenCalled();
    expect(Number(localStorage.getItem("lastActivity"))).toBeGreaterThan(Date.now() - MINUTE);
    expect(backend.renewalsTried).toBe(0);
  });

  it("clears everything on logout", async () => {
    const token = storeSession();
    fakeBackend({ access: token });
    await mount();
    await settle();

    await act(async () => context.logoutUser());

    expect(context.user).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refresh")).toBeNull();
    expect(localStorage.getItem("lastActivity")).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/auth/login");
  });

  it("logs this tab out too when another tab logs out", async () => {
    const token = storeSession();
    fakeBackend({ access: token });
    await mount();
    await settle();

    localStorage.removeItem("token");
    await act(async () => window.dispatchEvent(new StorageEvent("storage", { key: "token", newValue: null })));

    expect(context.user).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/auth/login");
  });
});

describe("the route guard while a session renews", () => {
  const guarded = (
    <ProtectedRoute permission="CAN_ACCESS_LABORATORY_DASHBOARD">
      <p>The page</p>
    </ProtectedRoute>
  );

  it("shows neither the page nor 'session expired' until the new token arrives, then the page", async () => {
    storeSession({ token: makeToken({ minutesLeft: -5 }) });
    const backend = fakeBackend();
    let finishRenewal;
    backend.onRefresh = () => new Promise((resolve) => { finishRenewal = resolve; });

    const { container } = await mount(guarded);
    await settle();

    expect(container.textContent).not.toContain("Authentication Required");
    expect(container.textContent).not.toContain("The page");

    await act(async () => finishRenewal());
    await settle();

    expect(container.textContent).toContain("The page");
    expect(container.textContent).not.toContain("Authentication Required");
  });

  it("shows the page straight away for a live token", async () => {
    const token = storeSession();
    fakeBackend({ access: token });

    const { container } = await mount(guarded);

    expect(container.textContent).toContain("The page");
  });

  it("asks for a login when there is no session", async () => {
    fakeBackend();

    const { container } = await mount(guarded);
    await settle();

    expect(container.textContent).toContain("Authentication Required");
    expect(container.textContent).not.toContain("The page");
  });
});
