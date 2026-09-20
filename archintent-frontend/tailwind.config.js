/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#3525cd',
          container: '#4F46E5',
          'on-container': '#ffffff',
        },
        secondary: {
          DEFAULT: '#712ae2',
          container: '#8a4cfc',
        },
        tertiary: {
          DEFAULT: '#7e3000',
        },
        surface: {
          lowest: '#ffffff',
          low: '#f8fafc',
          DEFAULT: '#f1f5f9',
          high: '#e2e8f0',
          highest: '#cbd5e1',
        },
      },
      fontSize: {
        'display': ['2.25rem', { lineHeight: '2.75rem', fontWeight: '800' }],
        'h1': ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700' }],
        'h2': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'body-md': ['1rem', { lineHeight: '1.5rem' }],
        'label-sm': ['0.625rem', { lineHeight: '0.75rem', fontWeight: '700' }],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}