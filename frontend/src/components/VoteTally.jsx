/**
 * src/components/VoteTally.jsx
 * ─────────────────────────────────────────────────────────────
 * Bảng kiểm phiếu hiển thị khi pha VOTE: mỗi người + số phiếu (thanh ngang),
 * cập nhật dần theo vote.tally từ rampVote mock. Đánh dấu người mình đã vote (youVoted).
 */
export default function VoteTally({ players = [], tally = {}, youVoted }) {
  const rows = players
    .map((p) => ({ p, n: tally[p.id] || 0 }))
    .filter((r) => r.n > 0)
    .sort((a, b) => b.n - a.n);
  const max = rows.reduce((m, r) => Math.max(m, r.n), 1);

  return (
    <div className="glass-panel rounded-xl p-3 w-full max-w-[300px] border border-outline-variant/30 shadow-[0_0_20px_rgba(0,242,255,0.08)]">
      <div className="flex items-center gap-2 mb-3 text-primary">
        <span className="material-symbols-outlined text-[18px]">how_to_vote</span>
        <span className="font-label-sm text-label-sm uppercase tracking-widest">Kiểm phiếu</span>
      </div>
      {rows.length === 0 ? (
        <p className="font-label-sm text-[10px] text-on-surface-variant uppercase tracking-widest text-center py-2">
          Chưa có phiếu
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ p, n }) => (
            <li key={p.id} className="flex items-center gap-2">
              {/* Avatar nhỏ */}
              <div className={`w-6 h-6 rounded-full overflow-hidden border shrink-0 ${youVoted === p.id ? 'border-primary' : 'border-outline-variant/40'}`}>
                {p.avatar
                  ? <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-surface-container-high" />}
              </div>
              {/* Tên */}
              <span className={`font-label-sm text-[11px] w-16 truncate shrink-0 ${youVoted === p.id ? 'text-primary' : 'text-on-surface-variant'}`}>
                {p.name}
                {youVoted === p.id && <span className="text-primary ml-0.5">✓</span>}
              </span>
              {/* Thanh phiếu */}
              <div className="flex-1 h-2 bg-surface-container/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${(n / max) * 100}%` }}
                />
              </div>
              {/* Số phiếu */}
              <span className="font-label-sm text-[11px] text-primary tabular-nums w-4 text-right">{n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
