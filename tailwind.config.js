/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        headz: {
          black: 'var(--headz-black)',
          red: 'var(--headz-red)',
          redDark: 'var(--headz-red-dark)',
          cream: 'var(--headz-cream)',
          gray: 'var(--headz-gray)',
        },
      },
    },
  },
  plugins: [],
}
