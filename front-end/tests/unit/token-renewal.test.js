/**
 * Keeping someone logged in while their access token comes and goes. These run the
 * real axios and interceptor against a backend that accepts a refresh token once.
 */
import axios from "axios";
import { toast } from "react-toastify";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UseAxios, { renewSession, TOKEN_REFRESHED_EVENT } from "@/assets/hooks/use-axios";
import { fakeBackend, makeToken, storeSession } from "./helpers";

vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

const stored = (key) => JSON.parse(localStorage.getItem(key));
const loggedOut = () => localStorage.getItem("token") === null && window.location.href === "/auth/login";

describe("an access token the backend no longer accepts", () => {
  let expired;

  beforeEach(() => {
    expired = storeSession({ token: makeToken({ minutesLeft: -1 }) });
  });

  it("renews once however many requests fail together, and retries them all", async () => {
    const backend = fakeBackend();
    const client = UseAxios({ token: expired });

    const responses = await Promise.all(
      ["/a", "/b", "/c", "/d", "/e", "/f"].map((url) => client.get(url))
    );

    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200, 200]);
    expect(backend.renewalsTried).toBe(1);
    expect(loggedOut()).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("keeps working across two rotations in a row", async () => {
    const backend = fakeBackend();
    await UseAxios({ token: expired }).get("/a");

    backend.access = "revoked";
    await UseAxios({ token: stored("token") }).get("/b");

    expect(backend.renewalsAccepted).toBe(2);
    expect(stored("refresh")).toBe("refresh-3");
    expect(loggedOut()).toBe(false);
  });

  it("stores both new tokens, and tells the rest of the app", async () => {
    const backend = fakeBackend();
    const announced = vi.fn();
    window.addEventListener(TOKEN_REFRESHED_EVENT, announced);

    await UseAxios({ token: expired }).get("/a");

    window.removeEventListener(TOKEN_REFRESHED_EVENT, announced);
    expect(stored("token")).toBe(backend.access);
    expect(stored("refresh")).toBe(backend.refresh);
    expect(announced).toHaveBeenCalledTimes(1);
    expect(announced.mock.calls[0][0].detail.token).toBe(backend.access);
  });

  it("reuses a token already replaced, when a response arrives after the renewal", async () => {
    const backend = fakeBackend();
    await UseAxios({ token: expired }).get("/a");
    expect(backend.renewalsTried).toBe(1);

    const response = await UseAxios({ token: expired }).get("/late");

    expect(response.status).toBe(200);
    expect(backend.renewalsTried).toBe(1);
  });

  it("uses the token another tab just renewed instead of spending the refresh token again", async () => {
    const backend = fakeBackend({ access: makeToken({ jti: "other-tab" }), refresh: "refresh-from-other-tab" });
    localStorage.setItem("token", JSON.stringify(backend.access));
    localStorage.setItem("refresh", JSON.stringify(backend.refresh));

    const response = await UseAxios({ token: expired }).get("/a");

    expect(response.status).toBe(200);
    expect(backend.renewalsTried).toBe(0);
  });

  it("takes the shared lock while renewing, so tabs take turns", async () => {
    fakeBackend();
    const request = vi.fn((name, work) => work());
    vi.stubGlobal("navigator", { locks: { request } });

    await UseAxios({ token: expired }).get("/a");

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe("easymed-token-refresh");
  });

  it("still works where the browser has no locks, as over plain HTTP", async () => {
    const backend = fakeBackend();
    vi.stubGlobal("navigator", {});

    await UseAxios({ token: expired }).get("/a");

    expect(backend.renewalsAccepted).toBe(1);
  });

  it("gives up after one retry rather than looping", async () => {
    const backend = fakeBackend();
    axios.defaults.adapter = ((real) => async (config) => {
      if (!config.url.endsWith("/api/auth/refresh")) backend.access = "always-something-else";
      return real(config);
    })(axios.defaults.adapter);

    await expect(UseAxios({ token: expired }).get("/a")).rejects.toMatchObject({ response: { status: 401 } });

    expect(backend.renewalsTried).toBe(1);
  });
});

describe("when the session really is over", () => {
  it("logs out when the backend refuses the refresh token, showing the message once", async () => {
    const expired = storeSession({ token: makeToken({ minutesLeft: -1 }), refresh: "already-used" });
    fakeBackend({ refresh: "something-else" });
    const client = UseAxios({ token: expired });

    const results = await Promise.allSettled([client.get("/a"), client.get("/b"), client.get("/c")]);

    expect(results.map((result) => result.status)).toEqual(["rejected", "rejected", "rejected"]);
    expect(loggedOut()).toBe(true);
    expect(localStorage.getItem("refresh")).toBeNull();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("logs out when there is no refresh token to renew with", async () => {
    const expired = storeSession({ token: makeToken({ minutesLeft: -1 }), refresh: null });
    fakeBackend();

    await expect(UseAxios({ token: expired }).get("/a")).rejects.toThrow("No refresh token");

    expect(loggedOut()).toBe(true);
  });
});

describe("a problem that says nothing about the session", () => {
  const failRenewalWith = (status) => {
    const backend = fakeBackend();
    const real = axios.defaults.adapter;
    axios.defaults.adapter = async (config) => {
      if (config.url.endsWith("/api/auth/refresh")) {
        if (status === null) throw new axios.AxiosError("Network Error", "ERR_NETWORK", config);
        const response = { data: {}, status, statusText: "", headers: {}, config };
        throw new axios.AxiosError("Failed", "ERR_BAD_RESPONSE", config, null, response);
      }
      return real(config);
    };
    return backend;
  };

  it.each([
    ["the network dropping", null],
    ["the backend restarting", 502],
    ["a server error", 500],
    ["the service being unavailable", 503],
  ])("stays logged in through %s, and can renew afterwards", async (_, status) => {
    const expired = storeSession({ token: makeToken({ minutesLeft: -1 }) });
    failRenewalWith(status);

    await expect(UseAxios({ token: expired }).get("/a")).rejects.toBeDefined();

    expect(loggedOut()).toBe(false);
    expect(stored("refresh")).toBe("refresh-1");
    expect(toast.error).not.toHaveBeenCalled();

    const backend = fakeBackend();
    await expect(UseAxios({ token: expired }).get("/b")).resolves.toMatchObject({ status: 200 });
    expect(backend.renewalsAccepted).toBe(1);
  });
});

describe("logging out while a renewal is on its way", () => {
  it("does not log the user back in when it arrives", async () => {
    const expired = storeSession({ token: makeToken({ minutesLeft: -1 }) });
    const backend = fakeBackend();
    backend.onRefresh = async () => {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
    };

    await expect(renewSession(expired)).rejects.toThrow("Logged out during token renewal");

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("refresh")).toBeNull();
  });

  it("does not tell the app there is a new token", async () => {
    const expired = storeSession({ token: makeToken({ minutesLeft: -1 }) });
    const backend = fakeBackend();
    backend.onRefresh = async () => localStorage.clear();
    const announced = vi.fn();
    window.addEventListener(TOKEN_REFRESHED_EVENT, announced);

    await expect(renewSession(expired)).rejects.toBeDefined();

    window.removeEventListener(TOKEN_REFRESHED_EVENT, announced);
    expect(announced).not.toHaveBeenCalled();
  });
});
