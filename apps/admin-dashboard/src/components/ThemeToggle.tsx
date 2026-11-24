"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);
  useEffect(() => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"), []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    setTheme(next);
  };
  return (
    <button type="button" onClick={toggle} aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} className="btn btn-ghost !px-2.5">
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
