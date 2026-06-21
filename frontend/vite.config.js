import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ─────────────────────────────────────────────────────────────
// Cấu hình Vite cho AIoneWolf frontend.
//
// LƯU Ý quan trọng cho @solana/wallet-adapter + @solana/web3.js:
//   Các thư viện này (và phụ thuộc của chúng) được viết cho môi
//   trường Node, nên tham chiếu tới `global` và `Buffer` — vốn
//   KHÔNG tồn tại trong trình duyệt. Để wallet-adapter chạy được
//   trong browser ta cần polyfill:
//     1. `define: { global: 'globalThis' }`  -> ánh xạ `global` -> `globalThis`
//     2. nạp Buffer toàn cục trong src/main.jsx (xem file đó)
//
// Nếu sau này gặp lỗi "Buffer is not defined" hãy cài thêm
// `vite-plugin-node-polyfills` hoặc package `buffer` và import ở main.jsx.
// ─────────────────────────────────────────────────────────────
export default defineConfig({
  plugins: [react()],
  define: {
    // Wallet-adapter dùng `global` của Node — trỏ về globalThis của browser.
    global: 'globalThis',
  },
  server: {
    port: 3000,
    open: true,
  },
  // Giúp pre-bundle các dependency Solana mượt hơn.
  optimizeDeps: {
    esbuildOptions: {
      define: { global: 'globalThis' },
    },
  },
});
