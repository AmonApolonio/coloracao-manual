import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        fraunces: ['Fraunces', 'sans-serif'],
      },
      colors: {
        secondary: '#947B62',
        background: '#ffffff',
        selected: '#F5F0EA',
      },
    },
  },
  plugins: [],
}
export default config
