/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-vietnamese)', '"Segoe UI"', 'Arial', 'sans-serif'],
        title: ['var(--font-vietnamese)', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#FCF5F5',
          100: '#F5E7E8',
          200: '#E8CBCD',
          300: '#D8AEB1',
          400: '#BD7378',
          500: '#A94A50',
          600: '#A2262D',
          700: '#8B1E24',
          800: '#74151C',
          900: '#5E1016',
        },
      },
    },
  },
  plugins: [],
};
