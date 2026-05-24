/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          900: "#0f1117",
          800: "#1a1d27",
          700: "#242736",
          600: "#2e3347",
        },
      },
    },
  },
  plugins: [],
};
