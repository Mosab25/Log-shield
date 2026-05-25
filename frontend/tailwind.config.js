/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#05070D",
          surface: "#101826",
          elevated: "#131D2E",
          cyan: "#00D8FF",
          violet: "#33E6FF",
          green: "#7CFF6B",
          amber: "#F59E0B",
          red: "#FF3B3B",
          text: "#EAF6FF",
          muted: "#8FA3B8",
          "border-cyan": "rgba(0, 216, 255, 0.25)",
          "border-violet": "rgba(51, 230, 255, 0.16)",
        },
      },
    },
  },
  plugins: [],
};
