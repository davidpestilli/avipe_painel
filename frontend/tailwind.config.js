/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        shell: "#f3efe6",
        panel: "#fffdf8",
        line: "#d9cfbe",
        ink: "#1f2a32",
        muted: "#5e6a73",
        accent: "#0d6a63",
        blue: "#1f577e",
        accentSoft: "#d8efe7",
        blueSoft: "#dcebf8",
        amberSoft: "#f8edd6",
        dangerSoft: "#f8e1e1",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "Times New Roman", "serif"],
        body: ["Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["Consolas", "Courier New", "monospace"],
      },
      boxShadow: {
        panel: "0 18px 50px rgba(44, 50, 54, 0.12)",
      },
    },
  },
  plugins: [],
};
