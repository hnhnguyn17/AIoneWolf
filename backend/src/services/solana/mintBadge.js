/**
 * backend/services/solana/mintBadge.js
 * ─────────────────────────────────────────────────────────────
 * Service Solana:
 *  - verifySignature(): xác minh chữ ký ed25519 của ví (dùng chung cho auth).
 *  - router POST /solana/mint-badge: STUB mint NFT badge (devnet) cho người thắng.
 *
 * Phần mint hiện là STUB — nối Metaplex Umi devnet thật sau.
 */

const express = require('express');
const nacl = require('tweetnacl');
// bs58 v6 export ESM-style { default: fn }; v4 export trực tiếp. Lấy đúng cho cả 2.
const _bs58 = require('bs58');
const bs58 = _bs58.encode ? _bs58 : _bs58.default;

/**
 * Verify chữ ký ed25519: message được ký bởi private key của `walletBase58`?
 * @param {string} message       - chuỗi gốc đã ký (UTF-8)
 * @param {string} signatureB58  - chữ ký, base58
 * @param {string} walletBase58  - địa chỉ ví (= public key), base58
 * @returns {boolean}
 */
function verifySignature(message, signatureB58, walletBase58) {
  const msgBytes = new TextEncoder().encode(message);
  const sigBytes = bs58.decode(signatureB58);
  const pubBytes = bs58.decode(walletBase58);
  return nacl.sign.detached.verify(msgBytes, sigBytes, pubBytes);
}

const router = express.Router();

// POST /solana/mint-badge { wallet, badge }
// TODO(thật): dùng @metaplex-foundation/umi + mpl-token-metadata (hoặc mpl-core)
//   - tạo umi với RPC devnet, nạp keypair backend (env SOLANA_KEYPAIR)
//   - createNft({ name, uri, tokenOwner: wallet }).sendAndConfirm(umi)
router.post('/mint-badge', (req, res) => {
  const { wallet, badge } = req.body || {};
  if (!wallet) return res.status(400).json({ error: 'Thiếu wallet.' });

  // STUB: trả địa chỉ/tx giả để FE hiển thị luồng. Devnet thật sẽ thay ở đây.
  const fakeMint = 'STUBmint' + Math.random().toString(36).slice(2, 10);
  const fakeTx = 'STUBtx' + Math.random().toString(36).slice(2, 12);
  return res.json({
    mint: fakeMint,
    tx: fakeTx,
    wallet,
    badge: badge || 'ALPHA_WOLF',
    cluster: process.env.SOLANA_CLUSTER || 'devnet',
    stub: true,
  });
});

module.exports = { router, verifySignature };
