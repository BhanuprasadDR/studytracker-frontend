/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'segoe': ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};