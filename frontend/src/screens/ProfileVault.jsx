/**
 * src/screens/ProfileVault.jsx
 * ─────────────────────────────────────────────────────────────
 * "Operative Profile" — hồ sơ người chơi huy hoàng:
 *   • Header: avatar + tên hạng (theo ELO, rank.js) + thanh tiến độ tới hạng kế.
 *   • The Vault — lưới NFT (mốc thành tựu / streak).
 *   • Solana Ledger — giá SOL realtime (CoinGecko free) + số dư ví thật
 *     (Solana RPC devnet) + lịch sử giao dịch.
 *
 * Dữ liệu ELO/ví lấy THẬT từ backend + onchain khi đăng nhập; nếu chưa đăng
 * nhập hoặc lỗi mạng thì fallback DATA CỨNG để demo vẫn đẹp.
 */
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { WalletButton } from '../components/WalletButton.jsx';
import { getMe, getSolPrice, getSolBalance } from '../lib/api.js';
import { rankProgress } from '../lib/rank.js';

import img1 from '../../assets/image.png';
import img2 from '../../assets/image copy.png';
import img3 from '../../assets/image copy 2.png';
import img4 from '../../assets/image copy 3.png';
import img5 from '../../assets/image copy 4.png';
import img6 from '../../assets/nft/artifact-1.png';

const NFTS = [
  { id: 1, name: 'Cranial Node Alpha', rarity: 'LEGENDARY', img: img1 },
  { id: 2, name: 'Obsidian Visage', rarity: 'EPIC', img: img2 },
  { id: 3, name: 'Neon Wraith', rarity: 'RARE', img: img3 },
  { id: 4, name: 'Static Phantom', rarity: 'RARE', img: img4 },
  { id: 5, name: 'Hollow Sentinel', rarity: 'EPIC', img: img5 },
  { id: 6, name: 'Glass Oracle', rarity: 'COMMON', img: img6 },
];

const NFT_IMG = (seed) =>
  `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${seed}&backgroundColor=0a0a0b`;

function rarityColor(r) {
  return r === 'LEGENDARY'
    ? 'text-primary border-primary/40'
    : r === 'EPIC'
      ? 'text-on-tertiary-container border-tertiary/40'
      : r === 'RARE'
        ? 'text-surface-tint border-surface-tint/30'
        : 'text-on-surface-variant border-outline-variant/40';
}

// Fallback data cứng khi chưa đăng nhập / lỗi mạng — demo vẫn đẹp.
const FALLBACK_USER = { elo: 1840, wins: 37, losses: 12, bestStreak: 9 };

export default function ProfileVault({ onBack }) {
  const { wallet, token } = useAuth();
  const shortAddr = wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : '0x71…4F2e';

  // Hồ sơ ELO: thật từ backend, fallback cứng.
  const [user, setUser] = useState(FALLBACK_USER);
  // Giá SOL realtime + số dư ví thật.
  const [sol, setSol] = useState(null);     // { usd, change24h }
  const [balance, setBalance] = useState(null); // số SOL trong ví

  useEffect(() => {
    let alive = true;
    (async () => {
      const me = await getMe(token);
      if (alive && me?.user) setUser({ ...FALLBACK_USER, ...me.user });
    })();
    return () => { alive = false; };
  }, [token]);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const p = await getSolPrice();
      if (alive && p) setSol(p);
    };
    tick();
    const t = setInterval(tick, 60_000); // cập nhật giá mỗi phút
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const b = await getSolBalance(wallet);
      if (alive && typeof b === 'number') setBalance(b);
    })();
    return () => { alive = false; };
  }, [wallet]);

  const elo = user.elo ?? FALLBACK_USER.elo;
  const prog = rankProgress(elo);
  const tier = prog.current;

  // Ledger: dòng đầu là số dư ví thật (nếu có), còn lại là demo onchain.
  const balUsd = balance != null && sol?.usd ? balance * sol.usd : null;
  const LEDGER = [
    balance != null
      ? {
          kind: 'Balance', icon: 'account_balance_wallet',
          amount: `${balance.toFixed(4)} SOL`,
          sub: balUsd != null ? `≈ $${balUsd.toFixed(2)}` : 'devnet',
          tone: 'text-primary', when: 'live', tx: shortAddr, status: 'LIVE',
        }
      : {
          kind: 'Balance', icon: 'account_balance_wallet',
          amount: '— SOL', sub: 'kết nối ví', tone: 'text-outline',
          when: 'devnet', tx: shortAddr, status: 'IDLE',
        },
    { kind: 'Mint', icon: 'token', amount: 'Cranial Node Alpha', tone: 'text-secondary', when: '4 hrs ago', tx: '2mY…4pW', status: 'SUCCESS' },
    { kind: 'Receive', icon: 'call_received', amount: '+5.00 SOL', tone: 'text-primary', when: '1 day ago', tx: '8xK…9qL', status: 'SUCCESS' },
    { kind: 'Stake', icon: 'token', amount: '10,000 ABYSS', tone: 'text-secondary', when: '2 days ago', tx: '9bX…3cC', status: 'SUCCESS' },
  ];

  const changeUp = (sol?.change24h ?? 0) >= 0;

  return (
    <div className="min-h-screen w-full flex flex-col p-margin-mobile md:p-margin-desktop relative">
      {/* Nền rừng cố định + phủ tối đậm cho dễ đọc */}
      <div className="forest-bg" />
      <div className="forest-overlay-night" />

      {/* Top bar */}
      <header className="relative z-10 w-full max-w-container-max mx-auto flex justify-between items-center mb-stack-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-on-surface-variant hover:text-surface-tint transition-colors font-button text-button uppercase tracking-widest"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="hidden md:inline">Lobby</span>
        </button>
        <h1 className="font-display-lg-mobile text-primary uppercase tracking-tighter">
          VOIR_ABYSS
        </h1>
        <WalletButton />
      </header>

      <main className="relative z-10 w-full max-w-container-max mx-auto flex flex-col xl:flex-row gap-gutter">
        {/* Center column */}
        <div className="flex-1 flex flex-col gap-12">
          {/* Profile header + hạng ELO */}
          <section className="glass-panel rounded-xl p-8 relative overflow-hidden">
            <div className="absolute top-4 right-4 hud-text">SYS.STAT: ONLINE</div>
            <div className="absolute bottom-4 right-4 hud-text opacity-50">ID: 994-VX-ABYSS</div>
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div
                className={`w-24 h-24 md:w-32 md:h-32 rounded-sm overflow-hidden border relative ${tier.ring}`}
                style={{ boxShadow: tier.glow }}
              >
                <img
                  src={NFT_IMG(wallet || 'operative')}
                  alt="Profile Avatar"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-void/80 to-transparent" />
                <div className="absolute bottom-2 left-2 hud-text" style={{ color: tier.accent }}>
                  {tier.metal.toUpperCase()}
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-1">
                  <span className="material-symbols-outlined" style={{ color: tier.accent }}>
                    {tier.icon}
                  </span>
                  <h2
                    className={`font-display-lg-mobile md:font-display-lg ${tier.text} text-glow`}
                    style={{ textShadow: tier.glow }}
                  >
                    {tier.name}
                  </h2>
                  {tier.canMintNft && (
                    <span className="px-2 py-0.5 text-[10px] font-label-sm uppercase tracking-widest border border-primary/50 text-primary rounded-sm">
                      NFT ✦
                    </span>
                  )}
                </div>
                <div className="font-label-sm text-secondary mb-6 tracking-widest uppercase">
                  {tier.title} · {shortAddr}
                </div>

                {/* Thanh tiến độ tới hạng kế tiếp */}
                <div className="w-full">
                  <div className="flex justify-between font-label-sm text-[10px] text-on-surface-variant mb-2">
                    <span>ELO · {elo.toLocaleString()}</span>
                    <span style={{ color: tier.accent }}>
                      {prog.isMax
                        ? 'HẠNG TỐI THƯỢNG'
                        : `Còn ${prog.remaining} → ${prog.next.name}`}
                    </span>
                  </div>
                  <div className="progress-track h-2 w-full rounded-sm">
                    <div
                      className="progress-fill h-full rounded-sm transition-all duration-700"
                      style={{ width: `${prog.pct}%`, background: tier.accent, boxShadow: tier.glow }}
                    />
                  </div>
                </div>

                {/* Chỉ số chiến đấu */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <Stat label="Thắng" value={user.wins ?? 0} tone="text-primary" />
                  <Stat label="Thua" value={user.losses ?? 0} tone="text-on-surface" />
                  <Stat label="Chuỗi tốt nhất" value={user.bestStreak ?? 0} tone="text-secondary" />
                </div>
              </div>
            </div>
          </section>

          {/* The Vault */}
          <section>
            <div className="flex items-center gap-4 mb-6 border-b border-outline-variant/30 pb-2">
              <span className="material-symbols-outlined text-primary">grid_view</span>
              <h3 className="font-headline-md text-[24px] text-on-surface">The Vault</h3>
              <div className="ml-auto hud-text">ITEMS: {NFTS.length}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {NFTS.map((nft) => (
                <div
                  key={nft.id}
                  className="glass-panel nft-card relative aspect-[3/4] overflow-hidden cursor-pointer group rounded-sm"
                >
                  <div
                    className={`absolute top-2 left-2 bg-void/80 px-2 py-1 border z-10 font-label-sm text-[10px] ${rarityColor(
                      nft.rarity,
                    )}`}
                  >
                    {nft.rarity}
                  </div>
                  <img
                    src={nft.img}
                    alt={nft.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="card-overlay absolute inset-0 flex flex-col justify-end p-4">
                    <span className="font-headline-md text-[16px] text-on-surface">{nft.name}</span>
                    <span className="font-label-sm text-[10px] text-surface-tint uppercase tracking-widest">
                      The Vault · #{nft.id}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right: Solana Ledger */}
        <aside className="w-full xl:w-80 flex flex-col gap-6">
          <div className="glass-panel rounded-xl p-6 h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">receipt_long</span>
                <h3 className="font-headline-md text-[20px] text-on-surface">Solana Ledger</h3>
              </div>
              {/* Giá SOL realtime (CoinGecko) */}
              <div className="text-right">
                <div className="font-body-md text-on-surface">
                  {sol?.usd != null ? `$${sol.usd.toFixed(2)}` : '— '}
                </div>
                <div className={`hud-text ${changeUp ? 'text-primary' : 'text-error'}`}>
                  {sol?.change24h != null
                    ? `${changeUp ? '▲' : '▼'} ${Math.abs(sol.change24h).toFixed(2)}%`
                    : 'SOL/USD'}
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
              {LEDGER.map((tx, i) => (
                <div
                  key={i}
                  className="list-item-hover p-3 border border-outline-variant/20 rounded-sm bg-void/50 cursor-pointer transition-colors hover:bg-surface-variant/30"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[16px] ${tx.tone}`}>
                        {tx.icon}
                      </span>
                      <span className="font-label-sm text-[12px] text-on-surface font-semibold">
                        {tx.kind}
                      </span>
                    </div>
                    <span
                      className={`hud-text ${
                        tx.status === 'SUCCESS' || tx.status === 'LIVE'
                          ? 'text-primary'
                          : 'text-outline'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <div className={`font-body-md ${tx.tone} mb-1`}>{tx.amount}</div>
                  {tx.sub && (
                    <div className="font-label-sm text-[10px] text-on-surface-variant mb-1">
                      {tx.sub}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-label-sm text-[10px] text-on-surface-variant">
                      {tx.when}
                    </span>
                    <span className="font-label-sm text-[10px] text-outline-variant hover:text-primary transition-colors cursor-pointer">
                      Tx: {tx.tx}
                    </span>
                  </div>
                </div>
              ))}
              <button className="mt-4 w-full py-2 border border-primary/30 text-primary font-label-sm text-[10px] uppercase tracking-widest hover:bg-primary/10 transition-colors">
                View All
              </button>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

/** Ô chỉ số nhỏ (thắng/thua/streak). */
function Stat({ label, value, tone }) {
  return (
    <div className="text-center p-2 border border-outline-variant/20 rounded-sm bg-void/40">
      <div className={`font-headline-md text-[22px] ${tone}`}>{value}</div>
      <div className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest">
        {label}
      </div>
    </div>
  );
}
