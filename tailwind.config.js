/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "cm-bg": "#F8F9FA",
        "cm-surface": "#FFFFFF",
        "cm-text": "#111827",
        "cm-text-secondary": "#6B7280",
        "cm-border": "#E5E7EB",
        "cm-danger": "#EF4444",
        "cm-warning": "#F59E0B",
        "cm-success": "#10B981",
        "cm-primary": "#2563EB",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Roboto Mono", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
