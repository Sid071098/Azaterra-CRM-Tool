import type { Config } from "tailwindcss";

/**
 * Palette and type tokens lifted from azaterra.com (assets/css/main.css).
 * Primary: #669C41  · Primary-dark: #527C39  · Deep: #1a3a1f  · Light: #ABD37C
 * Cream surface: #faf7f0  · Gray surface: #f4f6f2  · Border: rgba(102,156,65,0.15)
 * Fonts: Cinzel (display) + Montserrat (body)
 */
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f4f6f2",
          100: "#e7efe0",
          200: "#cfe3bd",
          300: "#ABD37C",
          400: "#86b85b",
          500: "#669C41",
          600: "#527C39",
          700: "#3f5f2c",
          800: "#2d6a35",
          900: "#1a3a1f",
        },
        cream: "#faf7f0",
        ink: "#1c1c1c",
        muted: "#5a5a5a",
        amber: {
          DEFAULT: "#c8860a",
          light: "#f5c842",
        },
      },
      fontFamily: {
        display: ['"Cinzel"', "serif"],
        sans: ['"Montserrat"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        sm: "0 2px 12px rgba(0,0,0,0.07)",
        md: "0 8px 32px rgba(0,0,0,0.10)",
        lg: "0 16px 48px rgba(0,0,0,0.14)",
        green: "0 8px 24px rgba(102, 156, 65, 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
