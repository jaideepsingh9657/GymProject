import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        charcoal: "rgb(var(--c-charcoal) / <alpha-value>)",
        graphite: "rgb(var(--c-graphite) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        bone: "rgb(var(--c-bone) / <alpha-value>)",
        mute: "rgb(var(--c-mute) / <alpha-value>)",
        gold: { DEFAULT: "rgb(var(--c-gold) / <alpha-value>)", soft: "rgb(var(--c-gold-soft) / <alpha-value>)" },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: { wider2: "0.22em" },
    },
  },
  plugins: [],
};
export default config;
