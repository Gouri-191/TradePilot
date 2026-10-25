/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.75)',
          'light-border': 'rgba(255, 255, 255, 0.6)',
          dark: 'rgba(15, 23, 42, 0.7)',
          'dark-border': 'rgba(255, 255, 255, 0.08)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-dark': 'radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.15) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.12) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.08) 0px, transparent 50%)',
        'mesh-light': 'radial-gradient(at 0% 0%, rgba(219, 234, 254, 0.6) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(243, 232, 255, 0.5) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(209, 250, 229, 0.4) 0px, transparent 50%)',
      }
    },
  },
  plugins: [],
}
