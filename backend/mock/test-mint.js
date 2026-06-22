/**
 * backend/mock/test-mint.js
 * ─────────────────────────────────────────────────────────────
 * Script kiểm thử độc lập luồng đúc NFT Metaplex Core trên Solana Devnet.
 * 
 * Cách chạy:
 *   node mock/test-mint.js
 */

'use strict';

require('dotenv').config();
const { Connection, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { createUmi } = require('@metaplex-foundation/umi-bundle-defaults');
const { keypairIdentity, generateSigner, createSignerFromKeypair, publicKey } = require('@metaplex-foundation/umi');
const { create, mplCore } = require('@metaplex-foundation/mpl-core');
const _bs58 = require('bs58');
const bs58 = _bs58.encode ? _bs58 : _bs58.default;

async function runTest() {
  console.log('🧪 Bắt đầu kiểm thử đúc Solana NFT (Metaplex Core)...');

  // 1. Kiểm tra / Khởi tạo Keypair ví Backend
  let secretKeyString = process.env.SOLANA_KEYPAIR;
  let backendKeypair;
  
  if (!secretKeyString) {
    console.log('⚠️  Chưa cấu hình SOLANA_KEYPAIR trong file .env.');
    console.log('👉 Tiến hành tạo một ví Backend ngẫu nhiên mới để chạy test...');
    const newKey = Keypair.generate();
    backendKeypair = newKey;
    const keypairArr = '[' + Array.from(newKey.secretKey).toString() + ']';
    console.log(`\n🔑 Địa chỉ ví Backend mới tạo: ${newKey.publicKey.toBase58()}`);
    console.log(`💡 Vui lòng copy chuỗi keypair dưới đây dán vào backend/.env để dùng sau:\n`);
    console.log(`SOLANA_KEYPAIR="${keypairArr}"\n`);
  } else {
    try {
      if (secretKeyString.trim().startsWith('[')) {
        backendKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secretKeyString)));
      } else {
        backendKeypair = Keypair.fromSecretKey(bs58.decode(secretKeyString.trim()));
      }
      console.log(`🔑 Đã nhận cấu hình SOLANA_KEYPAIR. Địa chỉ ví: ${backendKeypair.publicKey.toBase58()}`);
    } catch (e) {
      console.error('❌ Lỗi parse SOLANA_KEYPAIR:', e.message);
      process.exit(1);
    }
  }

  const connection = new Connection(process.env.SOLANA_RPC || 'https://api.devnet.solana.com', 'confirmed');

  // 2. Kiểm tra số dư & Airdrop Devnet SOL nếu ví cạn tiền (< 0.05 SOL)
  try {
    let balance = await connection.getBalance(backendKeypair.publicKey);
    console.log(`💰 Số dư ví hiện tại: ${balance / LAMPORTS_PER_SOL} SOL`);
    
    if (balance < 0.05 * LAMPORTS_PER_SOL) {
      console.log('🪂 Đang yêu cầu Airdrop 1 SOL từ Devnet Faucet...');
      const signature = await connection.requestAirdrop(backendKeypair.publicKey, 1 * LAMPORTS_PER_SOL);
      
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash
      });
      
      balance = await connection.getBalance(backendKeypair.publicKey);
      console.log(`✅ Airdrop thành công! Số dư mới: ${balance / LAMPORTS_PER_SOL} SOL`);
    }
  } catch (err) {
    console.error('❌ Yêu cầu Airdrop/Kiểm tra số dư thất bại:', err.message);
    console.log('⚠️  Lưu ý: Devnet Faucet đôi khi bị rate limit. Hãy thử tự gửi một ít Devnet SOL vào địa chỉ trên rồi chạy lại.');
    if (!secretKeyString) process.exit(1);
  }

  // 3. Khởi tạo Umi client
  const rpcUrl = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';
  const umi = createUmi(rpcUrl).use(mplCore());

  // Đăng ký keypair identity cho Umi
  const umiKeypair = umi.eddsa.createKeypairFromSecretKey(backendKeypair.secretKey);
  const umiSigner = createSignerFromKeypair(umi, umiKeypair);
  umi.use(keypairIdentity(umiSigner));

  // 4. Định nghĩa ví nhận NFT thử nghiệm & Loại Badge
  let recipient = process.env.USER_WALLET;
  let badgeType = 'THO_SAN';

  const args = process.argv.slice(2);
  const validBadges = ['THO_SAN', 'MA_SOI', 'CHUA_TE'];

  if (args.length === 1) {
    if (validBadges.includes(args[0].toUpperCase())) {
      badgeType = args[0].toUpperCase();
    } else {
      recipient = args[0];
    }
  } else if (args.length >= 2) {
    recipient = args[0];
    if (validBadges.includes(args[1].toUpperCase())) {
      badgeType = args[1].toUpperCase();
    }
  }

  if (!recipient) {
    recipient = backendKeypair.publicKey.toBase58();
    console.log(`🎯 Chưa cấu hình USER_WALLET trong .env. Tự động dùng ví Backend nhận: ${recipient}`);
  } else {
    console.log(`🎯 Địa chỉ ví nhận NFT: ${recipient}`);
  }
  console.log(`🎯 Loại NFT Badge: ${badgeType}`);

  console.log(`\n🚀 Đang tiến hành tạo NFT Badge [${badgeType}] gửi đến: ${recipient}...`);

  try {
    const assetSigner = generateSigner(umi);
    const mockMetadataUri = `http://localhost:3636/solana/nft-metadata/${assetSigner.publicKey.toString()}?badge=${badgeType}`;

    const txResult = await create(umi, {
      asset: assetSigner,
      name: 'Lycan Hunter Badge (Test)',
      uri: mockMetadataUri,
      owner: publicKey(recipient),
    }).sendAndConfirm(umi);

    const txSig = bs58.encode(txResult.signature);
    console.log('\n🎉 ĐÚC NFT THÀNH CÔNG!');
    console.log(`📌 Địa chỉ NFT (Mint): ${assetSigner.publicKey.toString()}`);
    console.log(`📌 Chữ ký giao dịch (Tx): ${txSig}`);
    console.log(`🔍 Xem chi tiết giao dịch tại Solana Explorer:`);
    console.log(`   https://explorer.solana.com/tx/${txSig}?cluster=devnet`);
    console.log(`🔍 Xem chi tiết NFT tại Solana Explorer:`);
    console.log(`   https://explorer.solana.com/address/${assetSigner.publicKey.toString()}?cluster=devnet`);

    // Lưu vào SQLite local database
    const db = require('../src/db/store');
    try {
      db.saveNft(recipient, assetSigner.publicKey.toString(), badgeType, txSig);
      console.log('💾 Đã lưu thông tin NFT vào cơ sở dữ liệu SQLite local.');
    } catch (dbErr) {
      console.error('⚠️  Không thể lưu NFT vào SQLite DB:', dbErr.message);
    }
  } catch (err) {
    console.error('❌ Đúc NFT thất bại:', err);
  }
}

runTest().catch((err) => {
  console.error('🔥 Lỗi hệ thống:', err);
});
