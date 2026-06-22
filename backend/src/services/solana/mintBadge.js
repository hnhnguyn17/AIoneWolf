/**
 * backend/services/solana/mintBadge.js
 * ─────────────────────────────────────────────────────────────
 * Service Solana:
 *  - verifySignature(): xác minh chữ ký ed25519 của ví (dùng chung cho auth).
 *  - router POST /solana/mint-badge: Đúc NFT badge (devnet) thật sử dụng Metaplex Core.
 *  - router GET /solana/nft-metadata/:mint: Trả về metadata JSON chuẩn cho NFT hiển thị trên ví/ví ảo.
 */

'use strict';

const express = require('express');
const nacl = require('tweetnacl');

// bs58 v6 export ESM-style { default: fn }; v4 export trực tiếp. Lấy đúng cho cả 2.
const _bs58 = require('bs58');
const bs58 = _bs58.encode ? _bs58 : _bs58.default;

const db = require('../../db/store');

const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, generateSigner, createSignerFromKeypair, publicKey } = require('@metaplex-foundation/umi');
const { create, mplCore } = require('@metaplex-foundation/mpl-core');

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

/**
 * Helper nạp keypair của backend từ biến môi trường
 */
function loadKeypair(umi) {
  const secretKeyString = process.env.SOLANA_KEYPAIR;
  if (!secretKeyString) {
    throw new Error('Chưa cấu hình SOLANA_KEYPAIR trong file .env');
  }

  let secretKey;
  try {
    if (secretKeyString.trim().startsWith('[')) {
      secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    } else {
      secretKey = bs58.decode(secretKeyString.trim());
    }
  } catch (e) {
    throw new Error('Keypair không hợp lệ. Phải là mảng JSON array [1,2,3...] hoặc chuỗi base58.');
  }

  return umi.eddsa.createKeypairFromSecretKey(secretKey);
}

/**
 * Hàm thực thi đúc NFT Metaplex Core trên Solana Devnet
 * @param {string} recipientWallet - ví người nhận
 * @param {string} badgeType - THO_SAN | MA_SOI | CHUA_TE
 */
async function mintCoreNftOnchain(recipientWallet, badgeType) {
  const rpcUrl = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';
  const umi = createUmi(rpcUrl).use(mplCore());

  const keypair = loadKeypair(umi);
  const signer = createSignerFromKeypair(umi, keypair);
  umi.use(keypairIdentity(signer));

  const assetSigner = generateSigner(umi);
  
  // Trỏ metadata URI về endpoint của backend để trả về metadata JSON chuẩn
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3636}`;
  const metadataUri = `${backendUrl}/solana/nft-metadata/${assetSigner.publicKey.toString()}?badge=${badgeType}`;

  const badgeNames = {
    'THO_SAN': 'Lycan Hunter Badge',
    'MA_SOI': 'Alpha Werewolf Badge',
    'CHUA_TE': 'Lord of the Abyss Badge'
  };
  const name = badgeNames[badgeType] || `${badgeType} Badge`;

  const result = await create(umi, {
    asset: assetSigner,
    name: name,
    uri: metadataUri,
    owner: publicKey(recipientWallet),
  }).sendAndConfirm(umi);

  const txSig = bs58.encode(result.signature);
  return {
    mint: assetSigner.publicKey.toString(),
    tx: txSig,
  };
}

const router = express.Router();

// GET /solana/nft-metadata/:mint - Trả về metadata JSON chuẩn cho NFT (Metaplex/OpenSea tiêu chuẩn)
router.get('/nft-metadata/:mint', (req, res) => {
  const { mint } = req.params;
  const badgeType = req.query.badge || 'THO_SAN';

  const badgeNames = {
    'THO_SAN': 'Lycan Hunter Badge',
    'MA_SOI': 'Alpha Werewolf Badge',
    'CHUA_TE': 'Lord of the Abyss Badge'
  };
  const badgeDescs = {
    'THO_SAN': 'Ghi nhận thành tích sinh tồn xuất sắc của thợ săn trong Echoes of the Lycan.',
    'MA_SOI': 'Danh hiệu vinh quang dành cho người thống trị bầy sói đêm.',
    'CHUA_TE': 'Huyền thoại của vực thẳm - Đạt tới mức rank Chúa tể.'
  };

  const name = badgeNames[badgeType] || `${badgeType} Badge`;
  const desc = badgeDescs[badgeType] || 'Badge chứng nhận thành tích Echoes of the Lycan.';
  
  // Sử dụng Dicebear sinh hình ảnh ngẫu nhiên đẹp dựa trên địa chỉ mint để làm avatar/badge
  const imageUrl = `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${mint}&backgroundColor=0a0a0b`;

  return res.json({
    name,
    symbol: 'LYCAN',
    description: desc,
    image: imageUrl,
    attributes: [
      { trait_type: 'Badge Type', value: badgeType },
      { trait_type: 'Project', value: 'Echoes of the Lycan' },
      { trait_type: 'Mint Address', value: mint }
    ],
    properties: {
      files: [
        {
          uri: imageUrl,
          type: 'image/svg+xml'
        }
      ],
      category: 'image'
    }
  });
});

// POST /solana/mint-badge { wallet, badge }
router.post('/mint-badge', async (req, res) => {
  const { wallet, badge } = req.body || {};
  if (!wallet) return res.status(400).json({ error: 'Thiếu wallet.' });

  const badgeType = badge || 'THO_SAN';

  try {
    console.log(`[Solana NFT] Bắt đầu mint ${badgeType} cho ví ${wallet}...`);
    const { mint, tx } = await mintCoreNftOnchain(wallet, badgeType);
    
    // Lưu vào database SQLite
    db.saveNft(wallet, mint, badgeType, tx);
    
    console.log(`[Solana NFT] Mint thành công! Mint: ${mint}, Tx: ${tx}`);
    return res.json({
      mint,
      tx,
      wallet,
      badge: badgeType,
      cluster: process.env.SOLANA_CLUSTER || 'devnet',
      stub: false,
    });
  } catch (err) {
    console.error('[Solana NFT] Mint lỗi:', err.message);
    return res.status(500).json({ error: `Mint NFT lỗi: ${err.message}` });
  }
});

module.exports = { router, verifySignature, mintCoreNftOnchain };
