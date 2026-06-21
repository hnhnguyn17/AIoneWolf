import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { C2S, getSocket } from '../lib/socket.js';
import { ROLE_META, TEAM_COLOR, TEAM_LABEL } from '../lib/roleCatalog.js';

function expandRoles(counts = {}) {
  return Object.entries(counts).flatMap(([role, count]) =>
    Array.from({ length: Math.max(0, Number(count) || 0) }, () => role),
  );
}

function shuffle(seedItems) {
  const items = [...seedItems];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function fallbackPlayers() {
  const socket = getSocket();
  return (socket._lastRoomState?.players || []).map((p, index) => ({
    ...p,
    self: p.self || p.id === 'p1' || index === 0,
  }));
}

export default function RoleRevealScreen() {
  const navigate = useNavigate();
  const { roomId = 'ABYSS1' } = useParams();
  const location = useLocation();
  const [flipped, setFlipped] = useState(false);

  const assignment = useMemo(() => {
    const counts = location.state?.roles || {};
    const players = location.state?.players?.length ? location.state.players : fallbackPlayers();
    const roles = expandRoles(counts);
    const shuffledRoles = shuffle(roles.length ? roles : ['VILLAGER']);
    const assignedPlayers = players.map((player, index) => ({
      ...player,
      role: shuffledRoles[index % shuffledRoles.length],
    }));
    const self = assignedPlayers.find((player) => player.self) || assignedPlayers[0];
    return { players: assignedPlayers, selfRole: self?.role || shuffledRoles[0] };
  }, [location.state]);

  const role = ROLE_META[assignment.selfRole] || {
    key: assignment.selfRole,
    name: assignment.selfRole,
    team: 'UNKNOWN',
    icon: 'help_center',
    desc: 'Vai trò bí ẩn. Hãy quan sát và sống sót.',
  };
  const isWolf = role.team === 'WEREWOLF';
  const teamClass = TEAM_COLOR[role.team]?.split(' ')[0] || 'text-outline';
  const teamLabel = TEAM_LABEL[role.team] || 'Chưa rõ phe';

  function enterGame() {
    const socket = getSocket();
    socket._roleAssignments = assignment.players;
    socket.emit(C2S.GAME_START, { code: roomId, roles: location.state?.roles || {} });
    navigate(`/game/${roomId}`, {
      state: {
        role: assignment.selfRole,
        assignments: assignment.players,
      },
    });
  }

  return (
    <div className="bg-background min-h-screen flex items-center justify-center overflow-hidden font-body-md text-on-surface relative">
      <div className="forest-bg" />
      <div className="forest-overlay-night" />
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-surface-tint rounded-full mix-blend-screen blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-outline rounded-full mix-blend-screen blur-[120px] animate-pulse" />
      </div>

      <main className="relative z-10 w-full max-w-container-max flex flex-col items-center justify-center p-margin-mobile md:p-margin-desktop h-screen">
        <div className={`absolute top-20 text-center transition-opacity duration-500 ${flipped ? 'opacity-0' : 'opacity-100'}`}>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2 tracking-wide">
            Nhận Vai Trò
          </h1>
          <p className="font-label-sm text-label-sm text-outline animate-pulse">
            Nhấp vào thẻ để lật
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="group w-full max-w-sm h-[500px] [perspective:1000px] cursor-pointer outline-none"
        >
          <div
            className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${
              flipped ? '[transform:rotateY(180deg)]' : 'animate-[pulse_4s_ease-in-out_infinite]'
            }`}
          >
            <div className="absolute inset-0 [backface-visibility:hidden] rounded-xl bg-[#1A1221]/80 backdrop-blur-xl border border-outline/30 flex flex-col items-center justify-center p-8 shadow-2xl">
              <div className="absolute inset-2 border border-outline/10 rounded-lg pointer-events-none" />
              <div className="w-24 h-24 rounded-full border border-outline/40 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(132,148,149,0.2)]">
                <span className="material-symbols-outlined text-5xl text-outline">help_center</span>
              </div>
              <p className="font-display-lg-mobile text-headline-md text-outline font-bold tracking-widest opacity-80">
                ???
              </p>
              <div className="absolute bottom-8 font-label-sm text-label-sm text-outline/50 uppercase tracking-widest">
                Gothic Fate
              </div>
            </div>

            <div
              className={`absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-xl bg-[#1A1221]/90 backdrop-blur-xl border ${
                isWolf ? 'border-error/60 shadow-[0_0_50px_rgba(138,3,3,0.4)]' : 'border-surface-tint/50 shadow-[0_0_50px_rgba(0,219,231,0.18)]'
              } flex flex-col items-center justify-center p-8 overflow-hidden`}
            >
              <div className="absolute inset-0 opacity-20 z-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),transparent_55%)]" />
              <div className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-32 h-32 rounded-full border-2 ${
                    isWolf ? 'border-error shadow-[0_0_30px_rgba(255,180,171,0.45)]' : 'border-surface-tint shadow-[0_0_30px_rgba(0,219,231,0.45)]'
                  } flex items-center justify-center mb-6 bg-surface-container-lowest/50 backdrop-blur-sm`}
                >
                  <span className={`material-symbols-outlined text-6xl ${isWolf ? 'text-error' : teamClass}`}>
                    {role.icon || 'help_center'}
                  </span>
                </div>
                <h2 className={`font-display-lg-mobile text-display-lg-mobile font-bold tracking-wider mb-2 ${isWolf ? 'text-error' : teamClass}`}>
                  {role.name}
                </h2>
                <span className={`font-label-sm text-label-sm uppercase tracking-widest px-3 py-1 border rounded bg-void/40 ${isWolf ? 'text-error border-error/30' : 'text-surface-tint border-surface-tint/30'}`}>
                  {teamLabel}
                </span>
                <p className="mt-6 font-body-md text-body-md text-on-surface-variant text-center opacity-80 leading-relaxed max-w-[250px]">
                  {role.desc}
                </p>
              </div>
            </div>
          </div>
        </button>

        <div className="absolute bottom-20">
          <button
            onClick={enterGame}
            disabled={!flipped}
            className={`px-8 py-3 bg-surface-container-high border border-outline-variant rounded text-on-surface font-button text-button uppercase tracking-wider transition-all duration-300 flex items-center gap-2 group ${
              flipped
                ? 'opacity-100 translate-y-0 hover:border-surface-tint hover:shadow-[0_0_20px_rgba(0,219,231,0.2)]'
                : 'opacity-0 translate-y-5 pointer-events-none'
            }`}
          >
            Vào Làng
            <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
        </div>
      </main>
    </div>
  );
}
