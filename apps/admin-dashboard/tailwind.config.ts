import type { Config } from "tailwindcss";

const c = (v: string) => `rgb(var(--c-${v}) / <alpha-value>)`;
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { ink: c("ink"), charcoal: c("charcoal"), graphite: c("graphite"), line: c("line"), bone: c("bone"), mute: c("mute"), gold: { DEFAULT: c("gold"), soft: c("gold-soft") }, ok: c("ok"), warn: c("warn"), bad: c("bad") },
      fontFamily: { display: ["var(--font-display)", "serif"], sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
    },
  },
} satisfies Config;
