import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0f172a',
      },
      boxShadow: {
        glow: '0 24px 80px rgba(59, 130, 246, 0.18)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
