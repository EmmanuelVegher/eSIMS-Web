/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wine: {
          50: '#FDF2F4',
          100: '#FBE6EA',
          200: '#F7CBD2',
          300: '#F09AA7',
          400: '#E55D75',
          500: '#D13251',
          600: '#B21E3B',
          700: '#95142E',
          800: '#800020', // HEX Seed 1 (#800020)
          900: '#4E1A22', // HEX Seed 2 (#4E1A22)
          950: '#2A0A0F',
        },
        rosegold: {
          50: '#FAF4F5',
          100: '#F4E7E8',
          200: '#EAD1D3',
          300: '#D8B1B5',
          400: '#C28990',
          500: '#B76E79', // Rose Gold accent
          600: '#9F535D',
          700: '#834049',
          800: '#6C343D',
          900: '#5B2C33',
        }
      }
    },
  },
  plugins: [],
}
