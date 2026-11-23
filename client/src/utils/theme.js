const STORAGE_KEY = "pmo_pilot_theme";

// The saved choice, else the OS preference.
export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // storage unavailable (private mode etc.) — fall through
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Dark mode is just html.dark — index.css redefines the colour tokens there.
// Only an explicit toggle persists, so an unset preference keeps following
// the OS.
export function applyTheme(theme, { persist = false } = {}) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  if (!persist) return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // not persisted; still applied for this session
  }
}
