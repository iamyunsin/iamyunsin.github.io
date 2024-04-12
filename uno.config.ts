// uno.config.ts
import { defineConfig } from 'unocss';

export default defineConfig({
  // ...UnoCSS options
  rules: [
    ['w-mc', {width: 'max-content'}],
    ['flex-2', {flex: '2'}],
    ['sticky-top', {position: 'sticky', 'box-shadow': '0px 8px 16px rgba(0,0,0,0.1)', 'z-index': '10'}],
    ['main', {'min-height': 'calc(100vh - 120px)'}],
    ['sticky-bottom', {position: 'sticky', 'box-shadow': '0px -4px 8px rgba(0,0,0,0.1)', 'z-index': '10'}],
  ],
  theme: {
    breakpoints: {
      xxs: '0px',
      xs: '320px',
      sm: '560px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      xxl: '1600px',
    }
  },
})