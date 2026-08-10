import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        stage: {
          950: "#050506",
          900: "#0b0b0e",
          850: "#111116",
          800: "#17171d",
          700: "#22222b",
          600: "#33333f",
          500: "#4a4a59",
          400: "#6b6b7d",
          300: "#9797a6",
        },
        marquee: {
          DEFAULT: "#ff3d68",
          muted: "#ff6b8a",
        },
        spotlight: {
          DEFAULT: "#ffd166",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};

export default config;
