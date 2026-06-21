/**
 * src/main.jsx
 * ─────────────────────────────────────────────────────────────
 * Điểm vào của app. Dựng cây Provider:
 *   SolanaWalletProvider (Wallet Standard — Phantom extension web, devnet)
 *     └─ AuthProvider (challenge–response ký message → JWT backend)
 *          └─ App
 *
 * Buffer polyfill: @solana/web3.js & wallet-adapter dùng Buffer của Node.
 * Trình duyệt không có sẵn → nạp global trước khi mọi thứ chạy.
 */
import { Buffer } from 'buffer';
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { SolanaWalletProvider } from './lib/wallet.jsx';
import { AuthProvider } from './lib/auth.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SolanaWalletProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </SolanaWalletProvider>
  </React.StrictMode>,
);
