"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "trackvitals_theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const isDark = theme === "dark";

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme: ThemeMode = savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light";
    applyTheme(initialTheme);
    setTheme(initialTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: ThemeMode = isDark ? "light" : "dark";
    applyTheme(nextTheme, true);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-pressed={isDark}
      title={isDark ? "Modo claro" : "Modo oscuro"}
    >
      <span className="theme-toggle-icon theme-toggle-sun" aria-hidden="true">
        <SunIcon />
      </span>
      <span className="theme-toggle-icon theme-toggle-moon" aria-hidden="true">
        <MoonIcon />
      </span>
    </button>
  );
}

function applyTheme(theme: ThemeMode, animated = false) {
  if (animated) {
    document.documentElement.classList.add("theme-transition");
  }

  document.documentElement.dataset.theme = theme;

  if (animated) {
    window.setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 560);
  }
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 4V2" />
      <path d="M12 22v-2" />
      <path d="m4.93 4.93-1.41-1.41" />
      <path d="m20.48 20.48-1.41-1.41" />
      <path d="M4 12H2" />
      <path d="M22 12h-2" />
      <path d="m4.93 19.07-1.41 1.41" />
      <path d="m20.48 3.52-1.41 1.41" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path className="moon-shape" d="M17.9 15.9A7.7 7.7 0 0 1 8.1 6.1 7.8 7.8 0 1 0 17.9 15.9Z" />
      <path className="moon-star moon-star-large" d="M17.7 4.2v3.2M16.1 5.8h3.2" />
      <path className="moon-star moon-star-small" d="M20.2 9.4v2M19.2 10.4h2" />
    </svg>
  );
}
