/**
 * tailwind.config.js — VOIR_ABYSS design tokens.
 * ─────────────────────────────────────────────────────────────
 * Bảng màu / font / spacing này LẤY TRỰC TIẾP từ 7 mockup HTML
 * trong temp.txt (tailwind.config nhúng của từng màn). Đã gộp lại
 * thành 1 nguồn duy nhất cho toàn FE.
 *
 * Cốt lõi cyber-gothic:
 *   - background / void  : nền đen obsidian (#0A0A0B / #131314)
 *   - primary / surface-tint : neon cyan (#e1fdff / #00dbe7 / #00f2ff)
 *   - obsidian purple    : #1A1221 (nền glass-panel)
 *   - font display       : Playfair Display
 *   - font body          : Inter
 *   - font mono/label    : JetBrains Mono
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Nền tối
        background: '#131314',
        void: '#0A0A0B',
        obsidian: '#1A1221',
        surface: '#131314',
        'surface-dim': '#131314',
        'surface-bright': '#3a393a',
        'surface-variant': '#353436',
        'surface-tint': '#00dbe7',
        'surface-container': '#201f20',
        'surface-container-low': '#1c1b1c',
        'surface-container-lowest': '#0e0e0f',
        'surface-container-high': '#2a2a2b',
        'surface-container-highest': '#353436',

        // Neon cyan (primary)
        primary: '#e1fdff',
        'primary-fixed': '#74f5ff',
        'primary-fixed-dim': '#00dbe7',
        'primary-container': '#00f2ff',
        'on-primary': '#00363a',
        'on-primary-fixed': '#002022',
        'on-primary-fixed-variant': '#004f54',
        'on-primary-container': '#006a71',
        'inverse-primary': '#00696f',

        // Secondary (tím khói)
        secondary: '#d0c2d7',
        'secondary-fixed': '#ecddf3',
        'secondary-fixed-dim': '#d0c2d7',
        'secondary-container': '#4f4557',
        'on-secondary': '#362d3d',
        'on-secondary-fixed': '#201828',
        'on-secondary-fixed-variant': '#4d4354',
        'on-secondary-container': '#c1b4c9',

        // Tertiary (tím sáng)
        tertiary: '#fcf5ff',
        'tertiary-fixed': '#e9ddff',
        'tertiary-fixed-dim': '#d1bcff',
        'tertiary-container': '#e3d4ff',
        'on-tertiary': '#3c0090',
        'on-tertiary-fixed': '#23005b',
        'on-tertiary-fixed-variant': '#5700c9',
        'on-tertiary-container': '#7318ff',

        // Surface text
        'on-surface': '#e5e2e3',
        'on-surface-variant': '#b9cacb',
        'on-background': '#e5e2e3',
        'inverse-surface': '#e5e2e3',
        'inverse-on-surface': '#313031',

        // Outline
        outline: '#849495',
        'outline-variant': '#3a494b',

        // Error (đỏ — người chết / cảnh báo)
        error: '#ffb4ab',
        'error-container': '#93000a',
        'on-error': '#690005',
        'on-error-container': '#ffdad6',
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      spacing: {
        unit: '4px',
        'stack-sm': '8px',
        'stack-md': '16px',
        'stack-lg': '32px',
        gutter: '24px',
        'container-padding': '32px',
        'margin-mobile': '20px',
        'margin-desktop': '64px',
        'container-max': '1440px',
      },
      maxWidth: {
        'container-max': '1440px',
      },
      fontFamily: {
        'display-lg': ['Inter', 'sans-serif'],
        'display-lg-mobile': ['Inter', 'sans-serif'],
        'headline-md': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        button: ['Inter', 'sans-serif'],
        'label-sm': ['JetBrains Mono', 'monospace'],
        'data-mono': ['JetBrains Mono', 'monospace'],
        'label-caps': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-lg': ['56px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['36px', { lineHeight: '1.2', fontWeight: '700' }],
        'headline-md': ['32px', { lineHeight: '1.3', fontWeight: '600' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        button: ['14px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '600' }],
        'label-sm': ['12px', { lineHeight: '1.4', letterSpacing: '0.1em', fontWeight: '500' }],
        'data-mono': ['13px', { lineHeight: '1', letterSpacing: '0em', fontWeight: '400' }],
        'label-caps': ['12px', { lineHeight: '1', letterSpacing: '0.1em', fontWeight: '600' }],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(0, 242, 255, 0.3)',
        'glow-cyan-strong': '0 0 25px rgba(0, 242, 255, 0.6)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.5' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        sweep: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        sweep: 'sweep 4s linear infinite',
      },
    },
  },
  plugins: [],
};
