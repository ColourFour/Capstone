import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        sky: "#f4fbff",
        accent: "#0ea5e9",
        success: "#0f766e",
        warning: "#d97706",
        danger: "#dc2626",
        sand: "#fff7ed"
      },
      boxShadow: {
        card: "0 18px 40px rgba(23, 32, 51, 0.08)"
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
