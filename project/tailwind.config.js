/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navigant: {
          blue: '#2E3192',
          navy: '#2E3192',
          cyan: '#00C5B8',
          'dark-blue': '#1a1f5c',
        },
      },
    },
  },
  plugins: [],
};
