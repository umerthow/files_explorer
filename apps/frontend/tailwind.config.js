/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        explorer: {
          bg: '#1e1e1e',
          panel: '#252526',
          border: '#3c3c3c',
          accent: '#0e639c',
          hover: '#2a2d2e',
          selected: '#094771',
          text: '#cccccc',
          muted: '#858585',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['Cascadia Code', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};
