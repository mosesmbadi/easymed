/** Thirty minutes without using the platform ends the session, on any computer. */
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearActivity,
  hasTimedOut,
  IDLE_TIMEOUT_MS,
  recordActivity,
  useIdleLogout,
} from "@/assets/hooks/use-idle-logout";
import { makeToken, render, storeSession } from "./helpers";

const MINUTE = 60 * 1000;
const lastActivity = () => Number(localStorage.getItem("lastActivity"));

const setUp = async () => {
  // As the real one does: once it has run, no one is logged in.
  const onTimeout = vi.fn(() => localStorage.removeItem("token"));
  const onLoggedOutElsewhere = vi.fn();
  const Host = () => {
    useIdleLogout({ onTimeout, onLoggedOutElsewhere });
    return null;
  };
  const view = await render(<Host />);
  return { onTimeout, onLoggedOutElsewhere, ...view };
};

const wait = (minutes) => act(async () => vi.advanceTimersByTime(minutes * MINUTE));

// A computer asleep: the clock moves on, but no timer gets to run.
const sleep = (minutes) => vi.setSystemTime(Date.now() + minutes * MINUTE);

const userDoes = (event) => act(async () => window.dispatchEvent(new Event(event)));

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-06T09:00:00Z"));
  storeSession({ token: makeToken() });
});

describe("the limit", () => {
  it("is 30 minutes", () => {
    expect(IDLE_TIMEOUT_MS).toBe(30 * MINUTE);
  });

  it("is not up at 29 minutes 59 seconds, and is at 30 minutes", () => {
    recordActivity();

    vi.setSystemTime(Date.now() + 30 * MINUTE - 1000);
    expect(hasTimedOut()).toBe(false);

    vi.setSystemTime(Date.now() + 1000);
    expect(hasTimedOut()).toBe(true);
  });

  it("does not count as timed out with no activity on record", () => {
    clearActivity();
    expect(hasTimedOut()).toBe(false);
  });
});

describe("leaving it alone", () => {
  it("logs out once 30 minutes have passed, and only once", async () => {
    const { onTimeout } = await setUp();

    await wait(29);
    expect(onTimeout).not.toHaveBeenCalled();

    await wait(2);
    expect(onTimeout).toHaveBeenCalledTimes(1);

    await wait(60);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does nothing when no one is logged in", async () => {
    localStorage.removeItem("token");
    const { onTimeout } = await setUp();

    await wait(120);
    await userDoes("mousemove");

    expect(onTimeout).not.toHaveBeenCalled();
    expect(localStorage.getItem("lastActivity")).toBeNull();
  });
});

describe("using it", () => {
  it.each(["mousedown", "mousemove", "keydown", "wheel", "touchstart", "scroll"])(
    "%s restarts the 30 minutes",
    async (event) => {
      const { onTimeout } = await setUp();

      await wait(29);
      await userDoes(event);
      await wait(29);

      expect(onTimeout).not.toHaveBeenCalled();

      await wait(2);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    }
  );

  it("notices scrolling inside a grid or dialog, which doesn't bubble", async () => {
    const { onTimeout, container } = await setUp();
    const grid = container.appendChild(document.createElement("div"));

    await wait(29);
    await act(async () => grid.dispatchEvent(new Event("scroll", { bubbles: false })));
    await wait(29);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("counts opening or reloading the page as use", async () => {
    recordActivity();
    vi.setSystemTime(Date.now() + 29 * MINUTE);

    const { onTimeout } = await setUp();
    await wait(29);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("does not write to storage on every mouse movement", async () => {
    await setUp();
    const setItem = vi.spyOn(Storage.prototype, "setItem");

    for (let moves = 0; moves < 50; moves += 1) await userDoes("mousemove");

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});

describe("with several tabs open", () => {
  it("stays logged in while another tab is being used", async () => {
    const { onTimeout } = await setUp();

    await wait(29);
    recordActivity(); // what the other tab does, in the storage they share
    await wait(29);

    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("follows a logout in another tab", async () => {
    const { onLoggedOutElsewhere } = await setUp();

    await act(async () => window.dispatchEvent(new StorageEvent("storage", { key: "token", newValue: null })));

    expect(onLoggedOutElsewhere).toHaveBeenCalledTimes(1);
  });

  it("follows storage being cleared in another tab", async () => {
    const { onLoggedOutElsewhere } = await setUp();

    await act(async () => window.dispatchEvent(new StorageEvent("storage", { key: null })));

    expect(onLoggedOutElsewhere).toHaveBeenCalledTimes(1);
  });

  it("ignores a renewal in another tab, and other storage changes", async () => {
    const { onLoggedOutElsewhere } = await setUp();

    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: "token", newValue: "new-token" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "lastActivity", newValue: "1" }));
    });

    expect(onLoggedOutElsewhere).not.toHaveBeenCalled();
  });
});

describe("coming back after time away", () => {
  it("logs out on opening the page after 30 minutes with the browser closed", async () => {
    recordActivity();
    vi.setSystemTime(Date.now() + 31 * MINUTE);

    const { onTimeout } = await setUp();

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not let the first mouse movement after sleeping restart the clock", async () => {
    const { onTimeout } = await setUp();

    sleep(45);
    await userDoes("mousemove");

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it.each(["focus", "visibilitychange"])("checks straight away on %s", async (event) => {
    const { onTimeout } = await setUp();

    sleep(45);
    await act(async () => {
      if (event === "focus") window.dispatchEvent(new Event("focus"));
      else document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not log out a short sleep", async () => {
    const { onTimeout } = await setUp();

    sleep(10);
    await userDoes("mousemove");

    expect(onTimeout).not.toHaveBeenCalled();
    expect(lastActivity()).toBe(Date.now());
  });
});

describe("leaving the page", () => {
  it("stops watching once unmounted", async () => {
    const { onTimeout, unmount } = await setUp();

    await unmount();
    sleep(45);
    await userDoes("mousemove");
    await wait(60);

    expect(onTimeout).not.toHaveBeenCalled();
  });
});
