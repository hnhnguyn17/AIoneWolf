/**
 * server.ts — entry point. Khởi tạo app + lắng nghe cổng.
 */
import { env, features } from './config/env.js';
import './data/db.js'; // chạy initSchema
import { createApp } from './app.js';

const { httpServer } = createApp();

httpServer.listen(env.PORT, () => {
  console.log(`\n🐺 Echoes of the Lycan — backend chạy tại http://localhost:${env.PORT}`);
  console.log(`   LLM:   ${env.LLM_ENABLED ? `BẬT (${env.LLM_PROVIDER})` : 'TẮT (câu cứng)'}`);
  console.log(`   Agora: ${features.agoraAgent ? 'agent BẬT' : 'agent TẮT (GM nói qua FE)'} | token ${features.agoraReady ? 'sẵn sàng' : 'stub'}`);
  console.log(`   Auth:  ${env.REQUIRE_AUTH ? 'bắt buộc ví' : 'mở (khách vào được)'}\n`);
});
