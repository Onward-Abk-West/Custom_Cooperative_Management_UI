import { useSyncExternalStore } from "react";

/**
 * "Hide amounts" state for the member screens.
 *
 * Two layers, like the native-app pattern this mirrors:
 *  - the persisted DEFAULT ("Hide amounts by default", a Settings
 *    switch, kept in localStorage) decides whether every page load
 *    starts masked;
 *  - the eye button in a page header flips the CURRENT visibility for
 *    the rest of this page load only, without changing the default.
 *
 * Both live outside React (storage + a module variable), so the hook
 * reads them with useSyncExternalStore, and changes are broadcast with
 * a same-tab custom event (the `storage` event only fires in OTHER
 * tabs). Server snapshot is "visible": the real value is applied on
 * the client right after hydration.
 */
const DEFAULT_KEY = "onward-hide-amounts-default";
const CHANGE_EVENT = "onward-hide-amounts-change";

let current: boolean | null = null;

function readDefault(): boolean {
  try {
    return window.localStorage.getItem(DEFAULT_KEY) === "1";
  } catch {
    return false;
  }
}

function getHidden(): boolean {
  if (current === null) current = readDefault();
  return current;
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function emit() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function toggleHidden() {
  current = !getHidden();
  emit();
}

function setDefaultHidden(next: boolean) {
  try {
    window.localStorage.setItem(DEFAULT_KEY, next ? "1" : "0");
  } catch {
    // Blocked storage — the switch still applies for this page load.
  }
  current = next;
  emit();
}

export function useAmountVisibility() {
  const hidden = useSyncExternalStore(subscribe, getHidden, () => false);
  const defaultHidden = useSyncExternalStore(subscribe, readDefault, () => false);
  return { hidden, defaultHidden, toggleHidden, setDefaultHidden };
}
