/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--surface)",
        elevated: "var(--surface-elevated)",
        border: "var(--border)",
        profit: "var(--success)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
        text: "var(--text)",
        muted: "var(--muted)",
        accent: "var(--accent)"
      },
      boxShadow: {
        telemetry: "var(--shadow-shell)"
      },
      fontFamily: {
        display: ["Inter", "IBM Plex Sans", "system-ui", "sans-serif"],
        body: ["Inter", "IBM Plex Sans", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
