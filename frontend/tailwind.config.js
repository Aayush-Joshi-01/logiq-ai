/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'ink-black':   '#0D1321',
        'space-blue':  '#1D2D44',
        'blue-slate':  '#3E5C76',
        'dusty-denim': '#748CAB',
        eggshell:      '#F0EBD8',
        'mid-navy':    '#2A3A5C',
        'warm-white':  '#F7F4EE',
      },
    },
  },
  plugins: [],
}
