import { lazy, Suspense, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";

import LoginScreen from "../src/screens/LoginScreen.jsx";
import LobbyScreen from "../src/screens/LobbyScreen.jsx";
import WaitingRoom from "../src/screens/WaitingRoom.jsx";
import RoleRevealScreen from "../src/screens/RoleRevealScreen.jsx";
import GameBoardDay from "../src/screens/GameBoardDay.jsx";
import NightScreen from "../src/screens/NightScreen.jsx";
import ProfileVault from "../src/screens/ProfileVault.jsx";
import DevPanel from "../src/components/DevPanel.jsx";
import { useAuth } from "../src/lib/auth.jsx";
import { getSocket } from "../src/lib/socket.js";
import { useGameSession } from "../src/lib/useGameSession.js";
import { PHASE } from "../src/lib/contracts.js";

const Agentation = import.meta.env.DEV
  ? lazy(() =>
      import("agentation")
        .then((module) => ({ default: module.Agentation }))
        .catch(() => ({ default: () => null })),
    )
  : null;

function GameShell() {
  const navigate = useNavigate();
  const session = useGameSession();
  const isNight = session.phase === PHASE.NIGHT;
  const onExit = () => navigate("/lobby");

  return (
    <>
      {isNight ? (
        <NightScreen session={session} onExit={onExit} />
      ) : (
        <GameBoardDay session={session} onExit={onExit} />
      )}
      <DevPanel context="game" />
    </>
  );
}

function LoginRoute({ onGuest }) {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  if (isAuthed) return <Navigate to="/lobby" replace />;

  return (
    <LoginScreen
      onAuthed={(opts) => {
        if (opts?.guest) onGuest();
        navigate("/lobby");
      }}
    />
  );
}

function LobbyRoute() {
  const navigate = useNavigate();

  return (
    <LobbyScreen
      onEnterWaiting={() => {
        const socket = getSocket();
        const code =
          socket._lastRoomState?.roomCode ||
          socket._lastRoomState?.code ||
          "ABYSS1";
        navigate(`/room/${code}/wait`);
      }}
      onOpenProfile={() => navigate("/profile")}
    />
  );
}

function WaitingRoomRoute() {
  const navigate = useNavigate();
  const { roomId = "ABYSS1" } = useParams();

  return (
    <WaitingRoom
      onStart={(payload) =>
        navigate(`/room/${roomId}/reveal`, {
          state: payload,
        })
      }
      onLeave={() => navigate("/lobby")}
    />
  );
}

function ProfileRoute() {
  const navigate = useNavigate();

  return <ProfileVault onBack={() => navigate("/lobby")} />;
}

function RouterRoutes() {
  const { isAuthed } = useAuth();
  const [guest, setGuest] = useState(false);
  const loggedIn = isAuthed || guest;

  return (
    <>
      <Routes>
        <Route path="/" element={<LoginRoute onGuest={() => setGuest(true)} />} />
        <Route
          path="/lobby"
          element={loggedIn ? <LobbyRoute /> : <Navigate to="/" replace />}
        />
        <Route
          path="/room/create"
          element={loggedIn ? <LobbyRoute /> : <Navigate to="/" replace />}
        />
        <Route
          path="/room/:roomId/wait"
          element={loggedIn ? <WaitingRoomRoute /> : <Navigate to="/" replace />}
        />
        <Route
          path="/room/:roomId/reveal"
          element={loggedIn ? <RoleRevealScreen /> : <Navigate to="/" replace />}
        />
        <Route
          path="/game/:roomId"
          element={loggedIn ? <GameShell /> : <Navigate to="/" replace />}
        />
        <Route
          path="/profile"
          element={loggedIn ? <ProfileRoute /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {Agentation && (
        <Suspense fallback={null}>
          <Agentation />
        </Suspense>
      )}
    </>
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <RouterRoutes />
    </BrowserRouter>
  );
}
