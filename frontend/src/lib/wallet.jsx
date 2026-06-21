/**
 * src/lib/wallet.jsx
 * ─────────────────────────────────────────────────────────────
 * Tích hợp ví Solana cho WEB (trình duyệt desktop) qua chuẩn
 * **Wallet Standard** của @solana/wallet-adapter.
 *
 *   ConnectionProvider  → kết nối RPC tới cluster (devnet).
 *   WalletProvider      → quản lý danh sách ví + trạng thái kết nối.
 *   WalletModalProvider → modal chọn ví (react-ui).
 *
 * ✅ Hướng WEB: dùng Phantom **browser extension**. Phantom hiện đăng ký
 *    chính nó qua Wallet Standard, nên KHÔNG cần new PhantomWalletAdapter()
 *    — wallet-adapter tự phát hiện extension đã cài. Mảng `wallets` để rỗng,
 *    các ví Standard (Phantom, Solflare, Backpack…) sẽ tự xuất hiện trong modal.
 *
 * ❌ KHÔNG dùng mobile deeplink / WalletConnect. Đây là luồng extension web,
 *    cluster devnet, chạy trên Chrome/Brave/Edge desktop.
 *
 * Dùng <WalletButton /> (bọc WalletMultiButton) ở bất cứ đâu cần nút
 * Connect/Disconnect chuẩn; hoặc dùng hook useWallet() của adapter để
 * tự vẽ UI (xem LoginScreen.jsx — ký message để đăng nhập backend).
 */
import { useMemo } from 'react';
import { clusterApiUrl } from '@solana/web3.js';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  WalletModalProvider,
  WalletMultiButton,
} from '@solana/wallet-adapter-react-ui';

// CSS mặc định của modal/nút wallet-adapter (đã override theme trong index.css).
import '@solana/wallet-adapter-react-ui/styles.css';

// Cluster cho cả app: devnet (theo yêu cầu hackathon — chỉ kết nối ví).
export const NETWORK = WalletAdapterNetwork.Devnet;

/**
 * Cho phép trỏ RPC tuỳ biến qua biến môi trường Vite (VITE_SOLANA_RPC),
 * mặc định fallback về endpoint devnet công khai của Solana.
 */
export function getEndpoint() {
  return import.meta.env.VITE_SOLANA_RPC || clusterApiUrl(NETWORK);
}

/**
 * SolanaWalletProvider — bọc toàn bộ app (đặt ở main.jsx).
 *
 * @param {{ children: React.ReactNode }} props
 */
export function SolanaWalletProvider({ children }) {
  const endpoint = useMemo(() => getEndpoint(), []);

  // Để rỗng: Wallet Standard tự phát hiện Phantom extension (và các ví khác).
  // Không khai báo adapter thủ công, không cấu hình mobile/deeplink.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* autoConnect: tự nối lại ví đã từng cấp quyền ở phiên trước. */}
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

/**
 * WalletButton — nút Connect/Disconnect chuẩn của wallet-adapter-react-ui.
 * Bấm sẽ mở modal chọn ví (Phantom extension xuất hiện ở đây). Sau khi nối,
 * nút đổi thành địa chỉ ví rút gọn + menu disconnect.
 */
export function WalletButton(props) {
  return <WalletMultiButton {...props} />;
}

// Re-export các hook hay dùng để nơi khác import từ 1 chỗ.
export { useWallet } from '@solana/wallet-adapter-react';
export { useWalletModal } from '@solana/wallet-adapter-react-ui';
