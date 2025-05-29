/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#F5F5F5',
        'card-white': '#FFFFFF',
        'primary-blue': '#2563EB',
        'primary-text': '#111827',
        'secondary-text': '#6B7280',
        'accent-blue': '#3B82F6',
        'success-green': '#10B981',
        'warning-yellow': '#F59E0B',
        'error-red': '#EF4444',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      },
      borderRadius: {
        'card': '0.75rem',
      },
    },
  },
  plugins: [],
} 