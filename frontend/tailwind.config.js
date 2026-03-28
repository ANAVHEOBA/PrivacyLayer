/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stellar: {
          primary: "#14B8E7", // Stellar blue
          dark: "#0C4A6E",
        },
      },
    },
  },
  plugins: [],
};
