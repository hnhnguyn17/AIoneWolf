/**
 * src/components/RolePackagePicker.jsx
 * ─────────────────────────────────────────────────────────────
 * Modal "Gói đề xuất" — bấm nút sẽ mở box này hiển thị mọi gói/combo
 * trong ROLE_PACKAGES. Chọn 1 gói → onPick(pkg) (cha set roleCounts) rồi đóng.
 *
 * Props:
 *   open      : boolean — hiện/ẩn.
 *   packages  : ROLE_PACKAGES (mảng { id, name, size, desc, counts }).
 *   activeId  : id gói đang chọn (để highlight).
 *   onPick(pkg)
 *   onClose()
 */
export default function RolePackagePicker({ open, packages = [], activeId, onPick, onClose }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />
      <div
        className="glass-panel relative z-10 w-full max-w-lg rounded-2xl p-5 flex flex-col gap-4 max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-surface-tint">inventory_2</span>
            <h3 className="font-headline-md text-[20px] text-on-surface">Gói đề xuất</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-outline-variant/40 text-on-surface-variant hover:text-surface-tint hover:border-surface-tint/60 transition-colors flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
          {packages.map((pkg) => {
            const total = Object.values(pkg.counts || {}).reduce((a, b) => a + b, 0);
            return (
              <button
                key={pkg.id}
                onClick={() => onPick(pkg)}
                title={pkg.desc}
                className={`text-left p-3 rounded-xl border transition-colors ${
                  activeId === pkg.id
                    ? 'border-surface-tint bg-surface-tint/10'
                    : 'border-outline-variant/30 bg-void/30 hover:border-surface-tint/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-body-md text-[14px] text-on-surface">{pkg.name}</div>
                  <span className="font-label-sm text-[10px] text-surface-tint tracking-widest tabular-nums">
                    {total} VAI
                  </span>
                </div>
                <div className="font-label-sm text-[11px] text-on-surface-variant leading-tight mt-1">
                  {pkg.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
