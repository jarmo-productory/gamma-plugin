/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './packages/web/src/**/*.{html,js,ts,jsx,tsx}',
    './packages/web/pages/**/*.{html,js,ts,jsx,tsx}',
    './packages/web/components/**/*.{html,js,ts,jsx,tsx}',
    './packages/extension/sidebar/**/*.{html,js,ts}',
    './packages/extension/popup/**/*.{html,js,ts}',
    './packages/shared/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // === GAMMA TIMETABLE DESIGN SYSTEM ===
      // Design tokens extracted from production dashboard and extension CSS
      
      colors: {
        // === Primary Brand Colors ===
        brand: {
          primary: '#4f46e5',      // Indigo - Primary buttons, brand elements
          'primary-hover': '#4338ca',
          'primary-light': '#e0e7ff',
          'primary-lighter': '#c7d2fe',
          secondary: '#3b82f6',     // Blue - Secondary actions, links, sliders
          'secondary-hover': '#2563eb',
        },
        
        // === Semantic Colors ===
        success: {
          50: '#ecfdf5',
          100: '#dcfce7',
          500: '#10b981',           // Green - Success states, sync confirmation
          600: '#059669',
          700: '#047857',
          900: '#166534',
        },
        
        warning: {
          50: '#fef3c7',
          100: '#fef3c7',
          500: '#f59e0b',           // Amber - Warning states, syncing
          600: '#d97706',
        },
        
        destructive: {
          50: '#fef2f2',
          100: '#fecaca',
          500: '#ef4444',           // Red - Error states, destructive actions
          600: '#dc2626',
          700: '#dc3545',           // Alternative red from legacy
        },
        
        // === Neutral Grays ===
        gray: {
          50: '#f9fafb',            // Background
          100: '#f3f4f6',           // Card backgrounds, subtle backgrounds
          200: '#e5e7eb',           // Borders, dividers
          300: '#d1d5db',           // Form borders, button borders
          400: '#9ca3af',           // Placeholder text, disabled states
          500: '#6b7280',           // Secondary text
          600: '#475569',           // Primary text (slightly warmer than 900)
          700: '#374151',           // Content text
          800: '#1f2937',           // Headings, high contrast text
          900: '#111827',           // Primary headings, brand text
        },
        
        // === Component-Specific Colors ===
        sidebar: {
          background: '#f9fafb',    // Extension sidebar background
          card: '#ffffff',          // Slide item cards
          'card-hover': 'rgba(0, 0, 0, 0.1)', // Hover shadow overlay
        },
        
        sync: {
          green: '#10b981',         // Save to cloud
          blue: '#3b82f6',          // Load from cloud
          purple: '#8b5cf6',        // Auto sync toggle active
          'purple-hover': '#7c3aed',
        },
        
        // === shadcn/ui Compatible Color System ===
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      
      // === Typography System ===
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
        mono: [
          '"SF Mono"',
          'Monaco',
          'Inconsolata',
          'monospace',
        ],
      },
      
      fontSize: {
        '2xs': '11px',             // Debug info, small labels
        'xs': '12px',              // Small UI text, sync controls
        'sm': '13px',              // Sub-items, secondary text
        'base': '14px',            // Primary UI text, buttons
        'lg': '16px',              // Body text, larger buttons
        'xl': '18px',              // Section headers, sidebar title
        '2xl': '20px',             // Landing page subtitle, brand
        '3xl': '24px',             // Time display
        '4xl': '28px',             // Dashboard titles
        '5xl': '32px',             // Main headings
        '6xl': '48px',             // Landing page hero
      },
      
      fontWeight: {
        normal: '400',
        medium: '500',             // Buttons, form labels
        semibold: '600',           // Section headers, important UI
        bold: '700',               // Main headings, time display
      },
      
      // === Spacing System (8px base grid) ===
      spacing: {
        '0.5': '2px',
        '1': '4px',
        '1.5': '6px',
        '2': '8px',                // Base unit
        '3': '12px',               // Small gaps, button padding
        '4': '16px',               // Standard padding, margins
        '5': '20px',
        '6': '24px',               // Large padding, section spacing
        '8': '32px',               // Section dividers
        '10': '40px',
        '12': '48px',              // Page sections
        '16': '64px',              // Large sections
        '20': '80px',
      },
      
      // === Border Radius System ===
      borderRadius: {
        'none': '0',
        'sm': '4px',               // Small elements, thumbnails
        DEFAULT: '6px',            // Buttons, inputs, cards
        'md': '8px',               // Larger cards, feature sections
        'lg': '16px',              // Duration badges
        'xl': '20px',              // Major sections
        'full': '9999px',          // Circular elements, slider thumbs
      },
      
      // === Box Shadow System ===
      boxShadow: {
        'xs': '0 1px 3px rgba(0, 0, 0, 0.05)',     // Slide items
        'sm': '0 2px 4px rgba(0, 0, 0, 0.05)',     // Header shadow
        'md': '0 2px 4px rgba(0, 0, 0, 0.1)',      // Hover states
        'lg': '0 20px 60px rgba(0,0,0,0.1)',       // Dashboard cards
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      },
      
      // === Animation & Transitions ===
      transitionDuration: {
        '150': '0.15s',            // Fast interactions
        '200': '0.2s',             // Button hovers
        '300': '0.3s',             // Sync status changes
      },
      
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      // === Component-Specific Utilities ===
      maxWidth: {
        'dashboard': '1200px',     // Main dashboard container
        'content': '600px',        // Content areas
      },
      
      minWidth: {
        'sync-btn': '120px',       // Sync button minimum width
      },
      
      width: {
        'time-segment': '2ch',     // Time input segments
        'sidebar': '400px',        // Extension sidebar width
      },
      
      height: {
        'button-sm': '28px',       // Small buttons (settings)
        'button-md': '32px',       // Standard buttons
        'thumbnail': '64px',       // Image thumbnails
      },
      
      // === CSS Grid Extensions ===
      gridTemplateColumns: {
        'auto-fit-200': 'repeat(auto-fit, minmax(200px, 1fr))',
        'auto-fit-300': 'repeat(auto-fit, minmax(300px, 1fr))',
        'auto-fill-300': 'repeat(auto-fill, minmax(300px, 1fr))',
      },
      
      // === Animation Extensions ===
      keyframes: {
        'pulse-sync': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-down': {
          'from': { height: '0' },
          'to': { height: 'var(--radix-accordion-content-height)' },
        },
        'slide-up': {
          'from': { height: 'var(--radix-accordion-content-height)' },
          'to': { height: '0' },
        },
      },
      animation: {
        'pulse-sync': 'pulse-sync 1.5s ease-in-out infinite',
        'slide-down': 'slide-down 0.2s ease-out',
        'slide-up': 'slide-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    // Custom plugin for component utilities
    function({ addUtilities, theme }) {
      const newUtilities = {
        // === Extension Sidebar Utilities ===
        '.sidebar-header': {
          position: 'sticky',
          top: '0',
          backgroundColor: theme('colors.white'),
          zIndex: '1000',
          padding: theme('spacing.4') + ' ' + theme('spacing.6'),
          borderBottom: '1px solid ' + theme('colors.gray.200'),
          boxShadow: theme('boxShadow.sm'),
        },
        
        '.slide-card': {
          backgroundColor: theme('colors.white'),
          borderRadius: theme('borderRadius.md'),
          marginBottom: theme('spacing.3'),
          boxShadow: theme('boxShadow.xs'),
          padding: theme('spacing.3') + ' ' + theme('spacing.4') + ' ' + theme('spacing.5') + ' ' + theme('spacing.4'),
          transition: 'box-shadow ' + theme('transitionDuration.200'),
          '&:hover': {
            boxShadow: theme('boxShadow.md'),
          },
        },
        
        '.content-fade': {
          position: 'relative',
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '40px',
            background: 'linear-gradient(to bottom, transparent, ' + theme('colors.white') + ')',
            pointerEvents: 'none',
          },
        },
        
        // === Button Variants ===
        '.btn-primary': {
          backgroundColor: theme('colors.brand.primary'),
          color: theme('colors.white'),
          border: 'none',
          padding: theme('spacing.2') + ' ' + theme('spacing.4'),
          borderRadius: theme('borderRadius.DEFAULT'),
          fontSize: theme('fontSize.base'),
          fontWeight: theme('fontWeight.semibold'),
          cursor: 'pointer',
          transition: 'background-color ' + theme('transitionDuration.150'),
          '&:hover': {
            backgroundColor: theme('colors.brand.primary-hover'),
          },
        },
        
        '.btn-secondary': {
          backgroundColor: theme('colors.brand.primary-light'),
          color: theme('colors.brand.primary'),
          border: '1px solid transparent',
          padding: theme('spacing.1.5') + ' ' + theme('spacing.3'),
          borderRadius: theme('borderRadius.DEFAULT'),
          fontSize: theme('fontSize.xs'),
          fontWeight: theme('fontWeight.medium'),
          cursor: 'pointer',
          transition: 'background-color ' + theme('transitionDuration.150'),
          '&:hover': {
            backgroundColor: theme('colors.brand.primary-lighter'),
          },
        },
        
        '.btn-export': {
          display: 'flex',
          alignItems: 'center',
          gap: theme('spacing.1.5'),
          height: theme('height.button-md'),
          padding: '0 ' + theme('spacing.3'),
          backgroundColor: theme('colors.gray.50'),
          border: '1px solid ' + theme('colors.gray.300'),
          borderRadius: theme('borderRadius.DEFAULT'),
          fontSize: theme('fontSize.base'),
          fontWeight: theme('fontWeight.medium'),
          color: theme('colors.gray.600'),
          cursor: 'pointer',
          transition: 'all ' + theme('transitionDuration.150'),
          '&:hover': {
            backgroundColor: theme('colors.gray.100'),
            borderColor: theme('colors.gray.400'),
          },
        },
        
        // === Sync Controls ===
        '.sync-btn': {
          display: 'flex',
          alignItems: 'center',
          gap: theme('spacing.1.5'),
          height: theme('height.button-md'),
          padding: '0 ' + theme('spacing.3'),
          backgroundColor: theme('colors.white'),
          border: '1px solid ' + theme('colors.gray.300'),
          borderRadius: theme('borderRadius.DEFAULT'),
          fontSize: theme('fontSize.sm'),
          fontWeight: theme('fontWeight.medium'),
          color: theme('colors.gray.700'),
          cursor: 'pointer',
          transition: 'all ' + theme('transitionDuration.150'),
          flex: '1',
          minWidth: theme('minWidth.sync-btn'),
          justifyContent: 'center',
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.gray.50'),
            borderColor: theme('colors.gray.400'),
            transform: 'translateY(-1px)',
            boxShadow: theme('boxShadow.xs'),
          },
          '&:disabled': {
            opacity: '0.5',
            cursor: 'not-allowed',
            color: theme('colors.gray.400'),
          },
        },
        
        '.sync-btn-save': {
          borderColor: theme('colors.success.500'),
          color: theme('colors.success.700'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.success.50'),
            borderColor: theme('colors.success.600'),
          },
        },
        
        '.sync-btn-load': {
          borderColor: theme('colors.brand.secondary'),
          color: theme('colors.blue.700'),
          '&:hover:not(:disabled)': {
            backgroundColor: theme('colors.blue.50'),
            borderColor: theme('colors.brand.secondary-hover'),
          },
        },
        
        '.sync-btn-toggle.active': {
          backgroundColor: theme('colors.sync.purple'),
          borderColor: theme('colors.sync.purple'),
          color: theme('colors.white'),
          '&:hover': {
            backgroundColor: theme('colors.sync.purple-hover'),
            borderColor: theme('colors.sync.purple-hover'),
          },
        },
        
        // === Form Elements ===
        '.time-input-container': {
          display: 'flex',
          alignItems: 'center',
          height: theme('height.button-md'),
          padding: '0 ' + theme('spacing.2'),
          border: '1px solid ' + theme('colors.gray.300'),
          borderRadius: theme('borderRadius.DEFAULT'),
          backgroundColor: 'transparent',
        },
        
        '.time-input-segment': {
          width: theme('width.time-segment'),
          border: 'none',
          background: 'transparent',
          fontFamily: theme('fontFamily.mono').join(', '),
          fontSize: theme('fontSize.base'),
          fontWeight: theme('fontWeight.medium'),
          color: theme('colors.gray.800'),
          textAlign: 'center',
          '&:focus': {
            outline: 'none',
          },
        },
        
        '.range-slider': {
          appearance: 'none',
          width: '100%',
          height: '6px',
          background: theme('colors.gray.200'),
          borderRadius: '3px',
          outline: 'none',
          opacity: '0.7',
          transition: 'opacity ' + theme('transitionDuration.150'),
          '&::-webkit-slider-thumb': {
            appearance: 'none',
            width: '18px',
            height: '18px',
            background: theme('colors.brand.secondary'),
            borderRadius: '50%',
            cursor: 'pointer',
          },
          '&::-moz-range-thumb': {
            width: '18px',
            height: '18px',
            background: theme('colors.brand.secondary'),
            borderRadius: '50%',
            cursor: 'pointer',
          },
        },
      };
      
      addUtilities(newUtilities);
    },
  ],
}