import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Productory Brand Colors
        'productory-white': '#FFFFFF',
        'productory-surface-light': '#FFFCFE',
        'productory-surface-tinted': '#F6F2F8',
        'productory-purple-1': '#491A73',
        'productory-purple-2': '#830F70',
        'productory-purple-3': '#B50864',
        'productory-grey': '#475467',
        // Brand Aliases
        'brand-primary': '#491A73',
        'brand-primary-hover': '#3a1459',
        'brand-secondary': '#830F70',
        'brand-secondary-hover': '#6b0c5a',
        'brand-accent': '#B50864',
        'brand-accent-hover': '#9a0555',
      },
      fontFamily: {
        'sofia-sans': ['var(--font-sofia-sans)', 'sans-serif'],
        'geist-mono': ['var(--font-geist-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config