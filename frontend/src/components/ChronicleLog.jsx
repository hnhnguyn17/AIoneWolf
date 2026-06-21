/**
 * src/components/ChronicleLog.jsx
 * ─────────────────────────────────────────────────────────────
 * "Chronicle" — panel chat/log bên phải (mockup Night ~671, Day ~3139).
 * Render danh sách event: system / alert / gm / chat (self & other).
 * Có ô nhập (khoá khi `locked`, ví dụ Night Phase: comms encrypted).
 *
 * msg shape:
 *   { id, kind: 'system'|'alert'|'gm'|'chat', name?, self?, text, ts?, scope? }
 */
import { useEffect, useRef, useState } from 'react';

function fmtTime(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function Row({ msg }) {
  if (msg.kind === 'system' || msg.kind === 'gm') {
    const gm = msg.kind === 'gm';
    return (
      <div className="relative z-10 flex gap-4 items-start msg-glitch-hover p-2 rounded">
        <div
          className={`w-8 h-8 rounded flex items-center justify-center shrink-0 mt-1 border ${
            gm
              ? 'bg-surface-tint/10 border-surface-tint/60 shadow-[0_0_10px_rgba(0,242,255,0.25)]'
              : 'bg-surface-container-high border-outline'
          }`}
        >
          <span
            className={`material-symbols-outlined text-[16px] ${
              gm ? 'text-surface-tint' : 'text-outline'
            }`}
          >
            {gm ? 'smart_toy' : 'settings_system_daydream'}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span
              className={`font-label-sm text-label-sm uppercase tracking-widest ${
                gm ? 'text-surface-tint' : 'text-outline'
              }`}
            >
              {gm ? 'Game Master' : 'System Override'}
            </span>
            <span className="font-label-sm text-label-sm text-outline-variant">
              {fmtTime(msg.ts)}
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant italic">
            {msg.text}
          </p>
        </div>
      </div>
    );
  }

  if (msg.kind === 'alert') {
    return (
      <div className="relative z-10 flex gap-4 items-start msg-glitch-hover p-2 rounded bg-error/5 border border-error/20">
        <div className="w-8 h-8 rounded bg-error/10 border border-error/50 flex items-center justify-center shrink-0 mt-1 shadow-[0_0_10px_rgba(255,180,171,0.2)]">
          <span className="material-symbols-outlined text-error text-[16px]">warning</span>
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-label-sm text-label-sm text-error uppercase tracking-widest">
              Critical Alert
            </span>
            <span className="font-label-sm text-label-sm text-error/50">{fmtTime(msg.ts)}</span>
          </div>
          <p className="font-body-md text-body-md text-on-error-container">{msg.text}</p>
        </div>
      </div>
    );
  }

  // chat
  const self = !!msg.self;
  return (
    <div className="relative z-10 flex gap-4 items-start msg-glitch-hover p-2 rounded">
      <div
        className={`w-8 h-8 rounded-full overflow-hidden shrink-0 mt-1 border ${
          self
            ? 'border-surface-tint shadow-[0_0_5px_rgba(0,242,255,0.3)]'
            : 'border-outline-variant grayscale'
        }`}
      >
        {msg.avatar ? (
          <img src={msg.avatar} alt={msg.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-surface-container-high" />
        )}
      </div>
      <div className="w-full">
        <div className="flex items-center gap-3 mb-1">
          <span
            className={`font-label-sm text-label-sm uppercase tracking-widest ${
              self ? 'text-surface-tint' : 'text-on-surface-variant'
            }`}
          >
            {msg.name}
            {self ? ' (You)' : ''}
            {msg.scope === 'WOLF' ? ' · WOLF' : ''}
          </span>
          <span className="font-label-sm text-label-sm text-outline-variant">
            {fmtTime(msg.ts)}
          </span>
        </div>
        <div
          className={`p-3 rounded-r-lg rounded-bl-lg border w-max max-w-[85%] ${
            self
              ? 'bg-surface-container-high/50 border-outline-variant/30 text-on-surface'
              : 'bg-surface-variant/30 border-outline-variant/20 text-on-surface-variant'
          }`}
        >
          <p>{msg.text}</p>
        </div>
      </div>
    </div>
  );
}

export default function ChronicleLog({
  title = 'Chronicle',
  subtitle,
  cycle,
  messages = [],
  locked = false,
  lockedHint = 'Comms encrypted during Night Phase...',
  onSend,
}) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function submit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || locked) return;
    onSend?.(text);
    setDraft('');
  }

  return (
    <div className="glass-panel rounded-xl h-full flex flex-col overflow-hidden relative shadow-2xl">
      {/* Header */}
      <header className="p-5 border-b border-outline-variant/30 flex justify-between items-end bg-surface-container-lowest/50">
        <div>
          <h1 className="font-display-lg text-display-lg-mobile md:text-headline-md text-on-surface leading-none tracking-tighter">
            {title}
          </h1>
          {subtitle && (
            <p className="font-label-sm text-label-sm text-surface-tint mt-2 uppercase tracking-widest opacity-80">
              {subtitle}
            </p>
          )}
        </div>
        {cycle != null && (
          <div className="text-right">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase">Cycle</p>
            <p className="font-headline-md text-headline-md text-on-surface">
              {String(cycle).padStart(2, '0')}
            </p>
          </div>
        )}
      </header>

      {/* Log */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 relative">
        <div className="absolute left-9 top-0 bottom-0 w-px bg-outline-variant/10 z-0" />
        {messages.length === 0 && (
          <p className="font-label-sm text-label-sm text-outline-variant text-center mt-8">
            Awaiting transmissions…
          </p>
        )}
        {messages.map((m) => (
          <Row key={m.id} msg={m} />
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={submit}
        className="p-4 border-t border-outline-variant/30 bg-surface-container-lowest/80 backdrop-blur-md"
      >
        <div className="relative flex items-center">
          <span
            className={`material-symbols-outlined absolute left-4 ${
              locked ? 'text-outline-variant' : 'text-surface-tint'
            }`}
          >
            {locked ? 'lock' : 'sensors'}
          </span>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={locked}
            placeholder={locked ? lockedHint : 'Transmit signal...'}
            className={`w-full bg-surface-container/50 border border-outline-variant/50 rounded pl-12 pr-12 py-3 text-on-surface font-label-sm placeholder:text-outline-variant/60 focus:ring-0 focus:border-surface-tint/60 outline-none ${
              locked ? 'cursor-not-allowed text-on-surface-variant' : ''
            }`}
          />
          {!locked && (
            <button
              type="submit"
              className="absolute right-3 text-surface-tint hover:text-surface-tint/80 transition-colors"
            >
              <span className="material-symbols-outlined fill">send</span>
            </button>
          )}
        </div>
        {locked && (
          <div className="mt-2 text-right">
            <span className="font-label-sm text-label-sm text-outline-variant opacity-60">
              Awaiting daylight...
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
