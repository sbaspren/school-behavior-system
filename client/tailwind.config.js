/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#4f46e5', light: '#eef2ff', dark: '#3730a3' },
      },
      fontFamily: {
        cairo: ['Cairo', 'IBM Plex Sans Arabic', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
