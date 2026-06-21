/**
 * src/App.jsx
 * ─────────────────────────────────────────────────────────────
 * Root component + router thủ công (state-based, không cần URL).
 *
 * Luồng màn (kiểu Liên Quân):
 *   LoginScreen → LobbyScreen → WaitingRoom (phòng chờ, vòng tròn avatar)
 *               → (GameBoardDay | NightScreen theo phase)
 *               ↘ ProfileVault
 *
 * Game state (players/phase/chronicle/...) sống ở GameShell qua hook
 * useGameSession, để khi đổi pha NGÀY↔ĐÊM không mất lịch sử/log.
 *
 * Chế độ MOCK (VITE_MOCK=1): mockServer tự diễn 1 ván demo nên có thể
 * Login bằng Guest rồi vào Lobby → Tạo phòng → Bắt đầu để xem game "chạy".
 */
import { lazy, Suspense, useState } from 'react';
import LoginScreen from './screens/LoginScreen.jsx';
import LobbyScreen from './screens/LobbyScreen.jsx';
import WaitingRoom from './screens/WaitingRoom.jsx';
import GameBoardDay from './screens/GameBoardDay.jsx';
import NightScreen from './screens/NightScreen.jsx';
import ProfileVault from './screens/ProfileVault.jsx';
import DevPanel from './components/DevPanel.jsx';
import { useAuth } from './lib/auth.jsx';
import { useGameSession } from './lib/useGameSession.js';
import { PHASE } from './lib/contracts.js';

/**
 * Agentation (công cụ debug FE) — CHỈ nạp ở chế độ DEV.
 * Dùng lazy + guard import.meta.env.DEV để bản build production KHÔNG
 * cố import package (tránh vỡ build nếu agentation chưa được cài).
 */
const Agentation = import.meta.env.DEV
  ? lazy(() =>
      import('agentation')
        .then((m) => ({ default: m.Agentation }))
        .catch(() => ({ default: () => null })), // nếu chưa install → no-op
    )
  : null;

/**
 * GameShell — bọc phần "đang trong ván". Giữ 1 session sống và chọn
 * màn theo phase: đêm → NightScreen, còn lại (ngày/vote/announce…) →
 * GameBoardDay. GAME_OVER vẫn ở GameBoardDay để xem kết quả + GM.
 */
function GameShell({ onExit }) {
  const session = useGameSession();
  const isNight = session.phase === PHASE.NIGHT;
  return (
    <>
      {isNight ? (
        <NightScreen session={session} onExit={onExit} />
      ) : (
        <GameBoardDay session={session} onExit={onExit} />
      )}
      {/* DEV: skip pha / auto-tua (chỉ dev) */}
      <DevPanel context="game" />
    </>
  );
}

export default function App() {
  const { isAuthed } = useAuth();
  const [guest, setGuest] = useState(false);
  // 'lobby' | 'waiting' | 'game' | 'profile'
  const [route, setRoute] = useState('lobby');

  const loggedIn = isAuthed || guest;

  function renderRoute() {
    if (!loggedIn) {
      return <LoginScreen onAuthed={(opts) => setGuest(!!opts?.guest)} />;
    }
    if (route === 'waiting') {
      return (
        <WaitingRoom
          onStart={() => setRoute('game')}
          onLeave={() => setRoute('lobby')}
        />
      );
    }
    if (route === 'game') {
      return <GameShell onExit={() => setRoute('lobby')} />;
    }
    if (route === 'profile') {
      return <ProfileVault onBack={() => setRoute('lobby')} />;
    }
    // default: lobby — Tạo/Tham gia phòng → vào phòng chờ
    return (
      <LobbyScreen
        onEnterWaiting={() => setRoute('waiting')}
        onOpenProfile={() => setRoute('profile')}
      />
    );
  }

  return (
    <>
      {renderRoute()}
      {/* Overlay debug Agentation — chỉ DEV, render sau cùng để không chắn UI */}
      {Agentation && (
        <Suspense fallback={null}>
          <Agentation />
        </Suspense>
      )}
    </>
  );
}
