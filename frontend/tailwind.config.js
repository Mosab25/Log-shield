/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#060B13",
          surface: "#0B1220",
          elevated: "#111827",
          cyan: "#22D3EE",
          violet: "#8B5CF6",
          green: "#22C55E",
          amber: "#F59E0B",
          red: "#EF4444",
          text: "#E5F4FF",
          muted: "#94A3B8",
          "border-cyan": "rgba(34, 211, 238, 0.18)",
          "border-violet": "rgba(139, 92, 246, 0.18)",
        },
      },
    },
  },
  plugins: [],
};
