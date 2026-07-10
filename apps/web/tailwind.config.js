/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B0E14',
          800: '#11141C',
        },
        accent: {
          start: '#3B5BFE',
          end: '#8B3BFE',
        },
      },
    },
  },
  plugins: [],
}
