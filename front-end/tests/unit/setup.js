import { afterEach, beforeEach, vi } from "vitest";

import { unmountAll } from "./helpers";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  localStorage.clear();
  // jsdom can't navigate. forceLogout assigns to this, so tests can read it back.
  vi.stubGlobal("location", { href: "http://localhost/", pathname: "/" });
});

afterEach(async () => {
  await unmountAll();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
