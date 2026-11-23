/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D6A4F',
          light:   '#40916C',
          dark:    '#1B4332',
        },
        accent: {
          DEFAULT: '#52B788',
          light:   '#74C69D',
        },
        surface: '#F8FAF9',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}
