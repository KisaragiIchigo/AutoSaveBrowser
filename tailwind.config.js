/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          app: "#12161f",
          surface: "#181f2c",
          elevated: "#212b3d",
          acrylic: "#1c2434",
          overlay: "rgba(10, 14, 20, 0.75)",
        },
        border: {
          subtle: "rgba(255, 255, 255, 0.07)",
          base: "rgba(255, 255, 255, 0.12)",
          strong: "rgba(255, 255, 255, 0.22)",
          accent: "#10b981",
        },
        text: {
          primary: "#f3f6f9",
          secondary: "#9aa6b8",
          muted: "#627187",
          accent: "#34d399",
          inverse: "#0f172a",
        },
        accent: {
          primary: "#059669",
          hover: "#047857",
          active: "#065f46",
          cyan: "#0ea5e9",
          emerald: "#10b981",
          amber: "#d97706",
          rose: "#e11d48",
        },
        status: {
          success: "#10b981",
          warning: "#f59e0b",
          error: "#f43f5e",
          info: "#0ea5e9",
          saving: "#10b981",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"BIZ UDPGothic"', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      boxShadow: {
        glass: "0 4px 20px 0 rgba(0, 0, 0, 0.35)",
        glow: "0 0 12px rgba(16, 185, 129, 0.2)",
      },
      borderRadius: {
        card: "0.5rem",
        btn: "0.375rem",
      },
    },
  },
  plugins: [],
}
