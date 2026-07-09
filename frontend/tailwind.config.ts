import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './config/**/*.{js,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          500: '#1677ff',
          700: '#0958d9',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

