/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b0f",
        panel: "#16161c",
        border: "#24242d",
        profit: "#00ff7b",
        warning: "#ffd400",
        danger: "#ff2e2e",
        text: "#eaeaf0",
        muted: "#9aa0a6",
        accent: "#38d9ff"
      },
      boxShadow: {
        telemetry: "0 0 0 1px rgba(36,36,45,0.8), 0 16px 40px rgba(0,0,0,0.35)"
      },
      fontFamily: {
        display: ["Rajdhani", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};
