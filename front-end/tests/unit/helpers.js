import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import axios from "axios";

const encode = (value) => btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

// Signature not checked: the browser only ever decodes a token.
export const makeToken = ({ minutesLeft = 30, ...claims } = {}) =>
  [
    encode({ alg: "none" }),
    encode({ exp: Math.floor(Date.now() / 1000) + minutesLeft * 60, user_id: 1, role: "sysadmin", ...claims }),
    "signature",
  ].join(".");

export const storeSession = ({ token = makeToken(), refresh = "refresh-1" } = {}) => {
  localStorage.setItem("token", JSON.stringify(token));
  if (refresh) localStorage.setItem("refresh", JSON.stringify(refresh));
  return token;
};

const mounted = new Set();

export const render = async (element) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const unmount = async () => {
    if (mounted.delete(unmount)) {
      await act(async () => root.unmount());
      container.remove();
    }
  };
  mounted.add(unmount);
  await act(async () => root.render(element));
  return { container, rerender: (next) => act(async () => root.render(next)), unmount };
};

// Listeners left behind by one test would otherwise fire during the next.
export const unmountAll = () => Promise.all([...mounted].map((unmount) => unmount()));

const respond = (config, status, data = {}) => {
  const response = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 200 && status < 300) return response;
  const error = new axios.AxiosError(`Request failed with status code ${status}`, "ERR_BAD_RESPONSE", config, null, response);
  throw error;
};

/**
 * Stands in for the backend behind axios, with the one rule that matters here:
 * ROTATE_REFRESH_TOKENS and BLACKLIST_AFTER_ROTATION mean a refresh token works
 * once. A second renewal sending the same one is refused, which is what used to
 * log people out, so a kinder fake would let that bug pass.
 */
export const fakeBackend = ({ access, refresh = "refresh-1" } = {}) => {
  const backend = {
    access,
    refresh,
    renewalsTried: 0,
    renewalsAccepted: 0,
    calls: [],
    onRefresh: null,
    rotates: true,
  };

  axios.defaults.adapter = async (config) => {
    await Promise.resolve();
    if (config.url.endsWith("/api/auth/refresh")) {
      backend.renewalsTried += 1;
      if (backend.onRefresh) await backend.onRefresh(config);
      const sent = JSON.parse(config.data).refresh;
      if (sent !== backend.refresh) return respond(config, 401, { detail: "Token is blacklisted" });
      backend.renewalsAccepted += 1;
      backend.access = makeToken({ jti: `access-${backend.renewalsAccepted}` });
      backend.refresh = `refresh-${backend.renewalsAccepted + 1}`;
      return respond(config, 200, { access: backend.access, refresh: backend.refresh });
    }
    backend.calls.push(`${config.url} ${config.headers.Authorization ?? config.headers.get?.("Authorization")}`);
    const sentToken = (config.headers.Authorization ?? config.headers.get?.("Authorization") ?? "").replace("Bearer ", "");
    if (sentToken !== backend.access) return respond(config, 401, { detail: "Token is invalid or expired" });
    return respond(config, 200, { url: config.url });
  };
  return backend;
};

export { React, act };
