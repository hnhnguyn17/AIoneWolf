/**
 * src/components/WalletButton.jsx
 * ─────────────────────────────────────────────────────────────
 * Re-export tiện dụng của nút ví (wallet-adapter) đã style theo theme
 * trong index.css. Để các màn import từ components/ cho nhất quán.
 *
 * Nguồn gốc nút nằm ở src/lib/wallet.jsx (WalletMultiButton). File này
 * chỉ tái xuất + cho phép truyền className.
 */
export { WalletButton as default } from '../lib/wallet.jsx';
export { WalletButton } from '../lib/wallet.jsx';
