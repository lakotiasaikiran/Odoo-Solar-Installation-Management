"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("photonix_theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = prefersDark ? "dark" : "light";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("photonix_theme", next);
  }

  if (!mounted) {
    return (
      <button
        type="button"
        className={`btn btn-secondary btn-sm ${className}`.trim()}
        style={{ padding: "6px 10px", color: "var(--color-text-muted)" }}
        aria-label="Toggle theme"
      >
        <span style={{ width: 15, height: 15, display: "inline-block" }} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn btn-secondary btn-sm ${className}`.trim()}
      style={{ padding: "6px 10px", color: "var(--color-text)" }}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      <span style={{ fontSize: "var(--text-xs)", fontWeight: 600 }}>
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}
