import { useEffect } from "react";

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

const LAST_ACTIVITY_KEY = "lastActivity";
const CHECK_EVERY_MS = 15 * 1000;
const RECORD_AT_MOST_EVERY_MS = 10 * 1000;

// What a person does. API calls are left out on purpose: a page polling in the
// background must not keep an unattended session open.
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "wheel", "touchstart", "scroll"];

// Kept in localStorage so that every tab shares it, and so that it survives the
// browser being closed.
const lastActivity = () => Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || null;

export const recordActivity = () => localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));

export const clearActivity = () => localStorage.removeItem(LAST_ACTIVITY_KEY);

export const hasTimedOut = () => {
    if (typeof window === "undefined") return false;
    const last = lastActivity();
    return last !== null && Date.now() - last >= IDLE_TIMEOUT_MS;
};

const isLoggedIn = () => Boolean(localStorage.getItem("token"));

// Declare this before any effect that renews the session: effects run in order,
// and a timed out session has to be gone before those effects look for it.
export const useIdleLogout = ({ onTimeout, onLoggedOutElsewhere }) => {
    useEffect(() => {
        const check = () => {
            if (isLoggedIn() && hasTimedOut()) onTimeout();
        };

        const handleActivity = () => {
            if (!isLoggedIn()) return;
            // Timers stop while a computer sleeps, so the first movement after it
            // wakes may arrive before the next check. It must not restart the clock.
            if (hasTimedOut()) {
                onTimeout();
            } else if (Date.now() - (lastActivity() ?? 0) >= RECORD_AT_MOST_EVERY_MS) {
                recordActivity();
            }
        };

        const handleStorage = (event) => {
            if (event.key === null || (event.key === "token" && !event.newValue)) {
                onLoggedOutElsewhere();
            }
        };

        // Opening or reloading the page counts as use, unless the time is already up.
        if (isLoggedIn()) {
            if (hasTimedOut()) onTimeout();
            else recordActivity();
        }

        const listenerOptions = { capture: true, passive: true };
        ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, handleActivity, listenerOptions));
        window.addEventListener("storage", handleStorage);
        window.addEventListener("focus", check);
        document.addEventListener("visibilitychange", check);
        const timer = window.setInterval(check, CHECK_EVERY_MS);

        return () => {
            ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, handleActivity, listenerOptions));
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("focus", check);
            document.removeEventListener("visibilitychange", check);
            window.clearInterval(timer);
        };
    }, []);
};
